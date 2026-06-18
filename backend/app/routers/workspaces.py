from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional
import asyncpg
from app.db.pool import get_conn
from app.middleware.auth import get_current_user, check_ownership
from app.services.audit import audit
from app.schemas import WorkspaceCreate, WorkspaceUpdate, ReorderRequest
from app.utils import success, row_to_dict, rows_to_list

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("")
async def list_workspaces(
    archived: bool = False,
    user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_conn),
):
    rows = await conn.fetch(
        """SELECT w.*,
                  COUNT(s.id) FILTER (WHERE NOT s.archived) AS subject_count
           FROM   workspaces w
           LEFT JOIN subjects s ON s.workspace_id = w.id
           WHERE  w.user_id  = $1
             AND  w.archived = $2
           GROUP BY w.id
           ORDER BY w.pinned DESC, w.sort_order ASC, w.created_at ASC""",
        str(user["id"]), archived
    )
    return success(rows_to_list(rows))


@router.post("", status_code=201)
async def create_workspace(
    body:    WorkspaceCreate,
    request: Request,
    user:    dict = Depends(get_current_user),
    conn:    asyncpg.Connection = Depends(get_conn),
):
    row = await conn.fetchrow(
        """INSERT INTO workspaces (user_id, name, icon, color, sort_order)
           VALUES ($1, $2, $3, $4, $5) RETURNING *""",
        str(user["id"]), body.name, body.icon, body.color, body.sort_order
    )
    await audit(conn, str(user["id"]), user["name"], "WORKSPACE_CREATE",
                f'Created workspace "{body.name}"', request)
    return success(row_to_dict(row), "Workspace created", 201)


@router.patch("/batch/reorder")
async def reorder_workspaces(
    body: ReorderRequest,
    user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_conn),
):
    async with conn.transaction():
        for item in body.items:
            await conn.execute(
                "UPDATE workspaces SET sort_order = $1 WHERE id = $2 AND user_id = $3",
                item.sort_order, item.id, str(user["id"])
            )
    return success(None, "Reordered")


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    user: dict = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("workspaces", workspace_id, user, conn)
    row = await conn.fetchrow("SELECT * FROM workspaces WHERE id = $1", workspace_id)
    if not row:
        raise HTTPException(404, "Workspace not found")
    return success(row_to_dict(row))


@router.patch("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    body:         WorkspaceUpdate,
    request:      Request,
    user:         dict = Depends(get_current_user),
    conn:         asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("workspaces", workspace_id, user, conn)

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")

    set_clauses = ", ".join(f"{k} = ${i+1}" for i, k in enumerate(updates))
    values = list(updates.values()) + [workspace_id]

    row = await conn.fetchrow(
        f"UPDATE workspaces SET {set_clauses} WHERE id = ${len(values)} RETURNING *",
        *values
    )
    await audit(conn, str(user["id"]), user["name"], "WORKSPACE_UPDATE",
                f'Updated workspace "{row["name"]}"', request)
    return success(row_to_dict(row))


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    hard:         bool = False,
    request:      Request = None,
    user:         dict = Depends(get_current_user),
    conn:         asyncpg.Connection = Depends(get_conn),
):
    await check_ownership("workspaces", workspace_id, user, conn)

    if hard:
        await conn.execute("DELETE FROM workspaces WHERE id = $1", workspace_id)
        await audit(conn, str(user["id"]), user["name"], "WORKSPACE_DELETE",
                    f"Hard deleted workspace {workspace_id}", request)
        return success(None, "Workspace permanently deleted")
    else:
        row = await conn.fetchrow(
            "UPDATE workspaces SET archived = TRUE WHERE id = $1 RETURNING *", workspace_id
        )
        await audit(conn, str(user["id"]), user["name"], "WORKSPACE_ARCHIVE",
                    f'Archived workspace "{row["name"]}"', request)
        return success(row_to_dict(row), "Workspace archived")
