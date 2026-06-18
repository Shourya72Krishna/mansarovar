from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional
import asyncpg
from app.db.pool import get_conn
from app.middleware.auth import get_current_user, check_ownership
from app.services.audit import audit
from app.schemas import SubjectCreate, SubjectUpdate
from app.utils import success, row_to_dict, rows_to_list

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("")
async def list_subjects(
    workspace_id: Optional[str] = Query(None),
    archived:     bool = False,
    user:         dict = Depends(get_current_user),
    conn:         asyncpg.Connection = Depends(get_conn),
):
    base_query = """
        SELECT s.*,
               COUNT(DISTINCT t.id) FILTER (WHERE NOT t.archived)  AS topic_count,
               COUNT(DISTINCT p.id)                                  AS pdf_count,
               COUNT(DISTINCT m.id)                                  AS media_count
        FROM subjects s
        LEFT JOIN topics      t ON t.subject_id = s.id
        LEFT JOIN pdf_files   p ON p.subject_id = s.id
        LEFT JOIN media_files m ON m.subject_id = s.id
        WHERE s.user_id = $1 AND s.archived = $2
    """
    params = [str(user["id"]), archived]

    if workspace_id:
        params.append(workspace_id)
        base_query += f" AND s.workspace_id = ${len(params)}"

    base_query += " GROUP BY s.id ORDER BY s.pinned DESC, s.sort_order ASC, s.created_at ASC"

    rows = await conn.fetch(base_query, *params)
    return success(rows_to_list(rows))


@router.post("", status_code=201)
async def create_subject(
    body:    SubjectCreate,
    request: Request,
    user:    dict = Depends(get_current_user),
    conn:    asyncpg.Connection = Depends(get_conn),
):
    ws = await conn.fetchrow(
        "SELECT id FROM workspaces WHERE id = $1 AND user_id = $2",
        body.workspace_id, str(user["id"])
    )
    if not ws:
        raise HTTPException(404, "Workspace not found")

    row = await conn.fetchrow(
        """INSERT INTO subjects (workspace_id, user_id, name, description, icon, color, tags, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *""",
        body.workspace_id, str(user["id"]), body.name, body.description,
        body.icon, body.color, body.tags, body.sort_order
    )
    await audit(conn, str(user["id"]), user["name"], "SUBJECT_CREATE",
                f'Created subject "{body.name}"', request)

    result = row_to_dict(row)
    result.update({"topic_count": 0, "pdf_count": 0, "media_count": 0})
    return success(result, "Subject created", 201)


@router.get("/{subject_id}")
async def get_subject(
    subject_id: str,
    user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("subjects", subject_id, user, conn)
    row = await conn.fetchrow(
        """SELECT s.*,
                  COUNT(DISTINCT t.id) FILTER (WHERE NOT t.archived) AS topic_count,
                  COUNT(DISTINCT p.id) AS pdf_count,
                  COUNT(DISTINCT m.id) AS media_count
           FROM subjects s
           LEFT JOIN topics      t ON t.subject_id = s.id
           LEFT JOIN pdf_files   p ON p.subject_id = s.id
           LEFT JOIN media_files m ON m.subject_id = s.id
           WHERE s.id = $1
           GROUP BY s.id""",
        subject_id
    )
    if not row:
        raise HTTPException(404, "Subject not found")
    return success(row_to_dict(row))


@router.patch("/{subject_id}")
async def update_subject(
    subject_id: str,
    body:       SubjectUpdate,
    request:    Request,
    user:       dict = Depends(get_current_user),
    conn:       asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("subjects", subject_id, user, conn)

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")

    set_clauses = ", ".join(f"{k} = ${i+1}" for i, k in enumerate(updates))
    values = list(updates.values()) + [subject_id]

    row = await conn.fetchrow(
        f"UPDATE subjects SET {set_clauses} WHERE id = ${len(values)} RETURNING *",
        *values
    )
    await audit(conn, str(user["id"]), user["name"], "SUBJECT_UPDATE",
                f'Updated subject "{row["name"]}"', request)

    # Re-fetch with counts
    full = await conn.fetchrow(
        """SELECT s.*,
                  COUNT(DISTINCT t.id) FILTER (WHERE NOT t.archived) AS topic_count,
                  COUNT(DISTINCT p.id) AS pdf_count,
                  COUNT(DISTINCT m.id) AS media_count
           FROM subjects s
           LEFT JOIN topics      t ON t.subject_id = s.id
           LEFT JOIN pdf_files   p ON p.subject_id = s.id
           LEFT JOIN media_files m ON m.subject_id = s.id
           WHERE s.id = $1
           GROUP BY s.id""",
        subject_id
    )
    return success(row_to_dict(full))


@router.delete("/{subject_id}")
async def delete_subject(
    subject_id: str,
    hard:       bool = False,
    request:    Request = None,
    user:       dict = Depends(get_current_user),
    conn:       asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("subjects", subject_id, user, conn)

    if hard:
        await conn.execute("DELETE FROM subjects WHERE id = $1", subject_id)
        await audit(conn, str(user["id"]), user["name"], "SUBJECT_DELETE",
                    f"Hard deleted subject {subject_id}", request)
        return success(None, "Subject permanently deleted")
    else:
        row = await conn.fetchrow(
            "UPDATE subjects SET archived = TRUE WHERE id = $1 RETURNING *", subject_id
        )
        await audit(conn, str(user["id"]), user["name"], "SUBJECT_ARCHIVE",
                    f'Archived subject "{row["name"]}"', request)
        return success(row_to_dict(row), "Subject archived")
