from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional
import asyncpg
from app.db.pool import get_conn
from app.middleware.auth import get_current_user, check_ownership
from app.services.audit import audit, log_activity
from app.schemas import TopicCreate, TopicUpdate
from app.utils import success, row_to_dict, rows_to_list

router = APIRouter(prefix="/topics", tags=["topics"])


def build_tree(rows: list[dict]) -> list[dict]:
    """Convert flat list of topics into nested tree based on parent_id."""
    by_id = {r["id"]: {**r, "children": []} for r in rows}
    roots = []
    for r in rows:
        node = by_id[r["id"]]
        parent_id = r.get("parent_id")
        if parent_id and parent_id in by_id:
            by_id[parent_id]["children"].append(node)
        else:
            roots.append(node)
    return roots


@router.get("")
async def list_topics(
    subject_id: str = Query(...),
    flat:       bool = False,
    archived:   bool = False,
    user:       dict = Depends(get_current_user),
    conn:       asyncpg.Connection = Depends(get_conn),
):
    rows = await conn.fetch(
        """SELECT t.*, COUNT(v.id) AS version_count
           FROM topics t
           LEFT JOIN topic_versions v ON v.topic_id = t.id
           WHERE t.subject_id = $1
             AND t.user_id    = $2
             AND t.archived   = $3
           GROUP BY t.id
           ORDER BY t.pinned DESC, t.sort_order ASC, t.created_at ASC""",
        subject_id, str(user["id"]), archived
    )
    data = rows_to_list(rows)
    if not flat:
        data = build_tree(data)
    return success(data)


@router.post("", status_code=201)
async def create_topic(
    body:    TopicCreate,
    request: Request,
    user:    dict = Depends(get_current_user),
    conn:    asyncpg.Connection = Depends(get_conn),
):
    sub = await conn.fetchrow(
        "SELECT id FROM subjects WHERE id = $1 AND user_id = $2",
        body.subject_id, str(user["id"])
    )
    if not sub:
        raise HTTPException(404, "Subject not found")

    row = await conn.fetchrow(
        """INSERT INTO topics (subject_id, user_id, parent_id, name, content, tags, sort_order, last_edited_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *""",
        body.subject_id, str(user["id"]), body.parent_id, body.name,
        body.content, body.tags, body.sort_order
    )
    await audit(conn, str(user["id"]), user["name"], "TOPIC_CREATE",
                f'Created topic "{body.name}"', request)
    await log_activity(conn, str(user["id"]), "topic", str(row["id"]), "create")

    result = row_to_dict(row)
    result["version_count"] = 0
    return success(result, "Topic created", 201)


@router.get("/{topic_id}")
async def get_topic(
    topic_id: str,
    user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("topics", topic_id, user, conn)
    row = await conn.fetchrow(
        """SELECT t.*, COUNT(v.id) AS version_count
           FROM topics t
           LEFT JOIN topic_versions v ON v.topic_id = t.id
           WHERE t.id = $1
           GROUP BY t.id""",
        topic_id
    )
    if not row:
        raise HTTPException(404, "Topic not found")

    await log_activity(conn, str(user["id"]), "topic", topic_id, "view")
    return success(row_to_dict(row))


@router.patch("/{topic_id}")
async def update_topic(
    topic_id: str,
    body:     TopicUpdate,
    user:     dict = Depends(get_current_user),
    conn:     asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("topics", topic_id, user, conn)

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")

    # Save version snapshot if content changing
    if "content" in updates:
        old = await conn.fetchrow("SELECT content FROM topics WHERE id = $1", topic_id)
        if old and old["content"] != updates["content"]:
            word_count = len(old["content"].replace("<", " <").split())
            await conn.execute(
                """INSERT INTO topic_versions (topic_id, user_id, content, word_count)
                   VALUES ($1, $2, $3, $4)""",
                topic_id, str(user["id"]), old["content"], word_count
            )
        updates["last_edited_at"] = "NOW()"

    set_parts = []
    values = []
    idx = 1
    for k, v in updates.items():
        if v == "NOW()":
            set_parts.append(f"{k} = NOW()")
        else:
            set_parts.append(f"{k} = ${idx}")
            values.append(v)
            idx += 1

    values.append(topic_id)
    row = await conn.fetchrow(
        f"UPDATE topics SET {', '.join(set_parts)} WHERE id = ${idx} RETURNING *",
        *values
    )

    await log_activity(conn, str(user["id"]), "topic", topic_id, "edit")

    result = row_to_dict(row)
    vc = await conn.fetchval("SELECT COUNT(*) FROM topic_versions WHERE topic_id = $1", topic_id)
    result["version_count"] = vc
    return success(result)


@router.delete("/{topic_id}")
async def delete_topic(
    topic_id: str,
    hard:     bool = False,
    request:  Request = None,
    user:     dict = Depends(get_current_user),
    conn:     asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("topics", topic_id, user, conn)

    if hard:
        await conn.execute("DELETE FROM topics WHERE id = $1", topic_id)
        await audit(conn, str(user["id"]), user["name"], "TOPIC_DELETE",
                    f"Hard deleted topic {topic_id}", request)
        return success(None, "Topic permanently deleted")
    else:
        row = await conn.fetchrow(
            "UPDATE topics SET archived = TRUE WHERE id = $1 RETURNING *", topic_id
        )
        await audit(conn, str(user["id"]), user["name"], "TOPIC_ARCHIVE",
                    f'Archived topic "{row["name"]}"', request)
        return success(row_to_dict(row), "Topic archived")


@router.get("/{topic_id}/versions")
async def list_versions(
    topic_id: str,
    user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("topics", topic_id, user, conn)
    rows = await conn.fetch(
        """SELECT id, topic_id, word_count, created_at
           FROM topic_versions
           WHERE topic_id = $1
           ORDER BY created_at DESC
           LIMIT 50""",
        topic_id
    )
    return success(rows_to_list(rows))


@router.post("/{topic_id}/versions/{version_id}/restore")
async def restore_version(
    topic_id:   str,
    version_id: str,
    request:    Request,
    user:       dict = Depends(get_current_user),
    conn:       asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("topics", topic_id, user, conn)

    version = await conn.fetchrow(
        "SELECT * FROM topic_versions WHERE id = $1 AND topic_id = $2",
        version_id, topic_id
    )
    if not version:
        raise HTTPException(404, "Version not found")

    row = await conn.fetchrow(
        """UPDATE topics SET content = $1, last_edited_at = NOW()
           WHERE id = $2 RETURNING *""",
        version["content"], topic_id
    )
    await audit(conn, str(user["id"]), user["name"], "TOPIC_RESTORE",
                f"Restored version of topic {topic_id}", request)
    return success(row_to_dict(row), "Version restored")
