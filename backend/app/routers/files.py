from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, Form
from typing import Optional
import asyncpg
import json
from app.db.pool import get_conn
from app.middleware.auth import get_current_user, check_ownership
from app.services.audit import audit, log_activity
from app.services.drive import (
    ensure_root_folder, create_subfolder,
    upload_file_to_drive, delete_file_from_drive,
)
from app.schemas import BookmarkCreate, ProgressUpdate
from app.utils import success, row_to_dict, rows_to_list

# ════════════════════════════════════════════════════════════════
#  PDF ROUTER
# ════════════════════════════════════════════════════════════════

pdf_router = APIRouter(prefix="/pdfs", tags=["pdfs"])

ALLOWED_PDF_MIME = "application/pdf"
MAX_FILE_SIZE = 200 * 1024 * 1024  # 200 MB


@pdf_router.get("")
async def list_pdfs(
    subject_id: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_conn),
):
    query = """
        SELECT p.*,
               COALESCE(json_agg(b.*) FILTER (WHERE b.id IS NOT NULL), '[]') AS bookmarks
        FROM pdf_files p
        LEFT JOIN pdf_bookmarks b ON b.pdf_id = p.id
        WHERE p.user_id = $1
    """
    params = [str(user["id"])]
    if subject_id:
        params.append(subject_id)
        query += f" AND p.subject_id = ${len(params)}"
    query += " GROUP BY p.id ORDER BY p.created_at DESC"

    rows = await conn.fetch(query, *params)
    result = []
    for r in rows:
        d = row_to_dict(r)
        if isinstance(d.get("bookmarks"), str):
            d["bookmarks"] = json.loads(d["bookmarks"])
        result.append(d)
    return success(result)


@pdf_router.post("/upload", status_code=201)
async def upload_pdf(
    request:    Request,
    file:       UploadFile = File(...),
    subject_id: str = Form(...),
    topic_id:   Optional[str] = Form(None),
    tags:       Optional[str] = Form(None),
    user:       dict = Depends(get_current_user),
    conn:       asyncpg.Connection = Depends(get_conn),
):
    if file.content_type != ALLOWED_PDF_MIME:
        raise HTTPException(400, "Only PDF files allowed")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 200MB)")

    sub = await conn.fetchrow(
        """SELECT s.*, w.name AS workspace_name
           FROM subjects s JOIN workspaces w ON w.id = s.workspace_id
           WHERE s.id = $1 AND s.user_id = $2""",
        subject_id, str(user["id"])
    )
    if not sub:
        raise HTTPException(404, "Subject not found")

    root_id = await ensure_root_folder(conn, user)
    ws_folder  = await create_subfolder(user, sub["workspace_name"], root_id)
    sub_folder = await create_subfolder(user, sub["name"], ws_folder)
    pdf_folder = await create_subfolder(user, "PDFs", sub_folder)

    file_id, view_url, _ = await upload_file_to_drive(
        user, pdf_folder, file.filename, ALLOWED_PDF_MIME, content
    )

    parsed_tags = json.loads(tags) if tags else []

    row = await conn.fetchrow(
        """INSERT INTO pdf_files
             (subject_id, topic_id, user_id, name, drive_file_id, drive_view_url,
              drive_folder_id, size_bytes, tags)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *""",
        subject_id, topic_id, str(user["id"]), file.filename,
        file_id, view_url, pdf_folder, len(content), parsed_tags
    )

    await audit(conn, str(user["id"]), user["name"], "PDF_UPLOAD",
                f'Uploaded "{file.filename}" to Drive', request)

    result = row_to_dict(row)
    result["bookmarks"] = []
    return success(result, "PDF uploaded", 201)


@pdf_router.patch("/{pdf_id}/progress")
async def update_progress(
    pdf_id: str,
    body:   ProgressUpdate,
    user:   dict = Depends(get_current_user),
    conn:   asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("pdf_files", pdf_id, user, conn)
    row = await conn.fetchrow(
        "UPDATE pdf_files SET reading_progress = $1 WHERE id = $2 RETURNING *",
        body.progress, pdf_id
    )
    await log_activity(conn, str(user["id"]), "pdf", pdf_id, "view")
    return success(row_to_dict(row))


@pdf_router.post("/{pdf_id}/bookmarks", status_code=201)
async def add_bookmark(
    pdf_id: str,
    body:   BookmarkCreate,
    user:   dict = Depends(get_current_user),
    conn:   asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("pdf_files", pdf_id, user, conn)
    row = await conn.fetchrow(
        "INSERT INTO pdf_bookmarks (pdf_id, page, label) VALUES ($1, $2, $3) RETURNING *",
        pdf_id, body.page, body.label
    )
    return success(row_to_dict(row), "Bookmark added", 201)


@pdf_router.delete("/{pdf_id}")
async def delete_pdf(
    pdf_id:  str,
    request: Request,
    user:    dict = Depends(get_current_user),
    conn:    asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("pdf_files", pdf_id, user, conn)
    row = await conn.fetchrow("DELETE FROM pdf_files WHERE id = $1 RETURNING *", pdf_id)
    if row and row["drive_file_id"]:
        await delete_file_from_drive(user, row["drive_file_id"])
    await audit(conn, str(user["id"]), user["name"], "PDF_DELETE",
                f'Deleted "{row["name"]}"', request)
    return success(None, "PDF deleted")


# ════════════════════════════════════════════════════════════════
#  MEDIA ROUTER
# ════════════════════════════════════════════════════════════════

media_router = APIRouter(prefix="/media", tags=["media"])

ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
ALLOWED_VIDEOS = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]


@media_router.get("")
async def list_media(
    subject_id: Optional[str] = Query(None),
    type:       Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_conn),
):
    query = "SELECT * FROM media_files WHERE user_id = $1"
    params = [str(user["id"])]
    if subject_id:
        params.append(subject_id)
        query += f" AND subject_id = ${len(params)}"
    if type:
        params.append(type)
        query += f" AND type = ${len(params)}"
    query += " ORDER BY created_at DESC"

    rows = await conn.fetch(query, *params)
    return success(rows_to_list(rows))


@media_router.post("/upload", status_code=201)
async def upload_media(
    request:    Request,
    file:       UploadFile = File(...),
    subject_id: str = Form(...),
    topic_id:   Optional[str] = Form(None),
    tags:       Optional[str] = Form(None),
    user:       dict = Depends(get_current_user),
    conn:       asyncpg.Connection = Depends(get_conn),
):
    is_image = file.content_type in ALLOWED_IMAGES
    is_video = file.content_type in ALLOWED_VIDEOS
    if not (is_image or is_video):
        raise HTTPException(400, "Unsupported file type")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 200MB)")

    sub = await conn.fetchrow(
        """SELECT s.*, w.name AS workspace_name
           FROM subjects s JOIN workspaces w ON w.id = s.workspace_id
           WHERE s.id = $1 AND s.user_id = $2""",
        subject_id, str(user["id"])
    )
    if not sub:
        raise HTTPException(404, "Subject not found")

    root_id = await ensure_root_folder(conn, user)
    ws_folder  = await create_subfolder(user, sub["workspace_name"], root_id)
    sub_folder = await create_subfolder(user, sub["name"], ws_folder)
    media_folder_name = "Images" if is_image else "Videos"
    type_folder = await create_subfolder(user, media_folder_name, sub_folder)

    file_id, view_url, thumb_url = await upload_file_to_drive(
        user, type_folder, file.filename, file.content_type, content
    )

    parsed_tags = json.loads(tags) if tags else []
    media_type = "image" if is_image else "video"

    row = await conn.fetchrow(
        """INSERT INTO media_files
             (subject_id, topic_id, user_id, name, type, mime_type,
              drive_file_id, drive_thumbnail_url, drive_view_url, size_bytes, tags)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           RETURNING *""",
        subject_id, topic_id, str(user["id"]), file.filename, media_type,
        file.content_type, file_id, thumb_url, view_url, len(content), parsed_tags
    )

    await audit(conn, str(user["id"]), user["name"], "MEDIA_UPLOAD",
                f'Uploaded "{file.filename}"', request)
    return success(row_to_dict(row), "Media uploaded", 201)


@media_router.delete("/{media_id}")
async def delete_media(
    media_id: str,
    request:  Request,
    user:     dict = Depends(get_current_user),
    conn:     asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("media_files", media_id, user, conn)
    row = await conn.fetchrow("DELETE FROM media_files WHERE id = $1 RETURNING *", media_id)
    if row and row["drive_file_id"]:
        await delete_file_from_drive(user, row["drive_file_id"])
    await audit(conn, str(user["id"]), user["name"], "MEDIA_DELETE",
                f'Deleted "{row["name"]}"', request)
    return success(None, "File deleted")
