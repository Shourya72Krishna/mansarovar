from fastapi import APIRouter, Depends, Query
import asyncpg
from app.db.pool import get_conn
from app.middleware.auth import get_current_user
from app.utils import success, rows_to_list

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search(
    q:    str = Query(..., min_length=1),
    user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_conn),
):
    user_id = str(user["id"])
    pattern = f"%{q}%"

    # Workspaces
    workspaces = await conn.fetch(
        """SELECT id, name, icon, 'workspace' AS result_type
           FROM workspaces
           WHERE user_id = $1 AND NOT archived AND name ILIKE $2
           LIMIT 10""",
        user_id, pattern
    )

    # Subjects
    subjects = await conn.fetch(
        """SELECT s.id, s.name, s.icon, s.workspace_id, w.name AS workspace_name,
                  'subject' AS result_type
           FROM subjects s
           JOIN workspaces w ON w.id = s.workspace_id
           WHERE s.user_id = $1 AND NOT s.archived
             AND (s.name ILIKE $2 OR s.description ILIKE $2)
           LIMIT 10""",
        user_id, pattern
    )

    # Topics — full-text search with ILIKE fallback
    topics = await conn.fetch(
        """SELECT t.id, t.name, t.content_preview, t.subject_id,
                  s.name AS subject_name, s.workspace_id, w.name AS workspace_name,
                  'topic' AS result_type,
                  ts_rank(t.search_vector, plainto_tsquery('english', $2)) AS rank
           FROM topics t
           JOIN subjects   s ON s.id = t.subject_id
           JOIN workspaces w ON w.id = s.workspace_id
           WHERE t.user_id = $1 AND NOT t.archived
             AND (
               t.search_vector @@ plainto_tsquery('english', $2)
               OR t.name ILIKE $3
               OR t.content_preview ILIKE $3
             )
           ORDER BY rank DESC NULLS LAST
           LIMIT 20""",
        user_id, q, pattern
    )

    # PDFs
    pdfs = await conn.fetch(
        """SELECT p.id, p.name, p.subject_id, s.name AS subject_name,
                  'pdf' AS result_type
           FROM pdf_files p
           JOIN subjects s ON s.id = p.subject_id
           WHERE p.user_id = $1 AND p.name ILIKE $2
           LIMIT 10""",
        user_id, pattern
    )

    # Media
    media = await conn.fetch(
        """SELECT m.id, m.name, m.type, m.subject_id, s.name AS subject_name,
                  'media' AS result_type
           FROM media_files m
           JOIN subjects s ON s.id = m.subject_id
           WHERE m.user_id = $1 AND m.name ILIKE $2
           LIMIT 10""",
        user_id, pattern
    )

    return success({
        "workspaces": rows_to_list(workspaces),
        "subjects":   rows_to_list(subjects),
        "topics":     rows_to_list(topics),
        "pdfs":       rows_to_list(pdfs),
        "media":      rows_to_list(media),
    })
