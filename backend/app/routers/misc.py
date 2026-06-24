from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional
import asyncpg
from app.config import settings
from app.db.pool import get_conn
from app.middleware.auth import get_current_user, require_admin, require_super_admin
from app.services.audit import audit
from app.services.drive import check_drive_access
from app.schemas import TagCreate
from app.utils import success, row_to_dict, rows_to_list, parse_pagination, paginated

# ════════════════════ TAGS ════════════════════
tags_router = APIRouter(prefix="/tags", tags=["tags"])

@tags_router.get("")
async def list_tags(user: dict = Depends(get_current_user), conn: asyncpg.Connection = Depends(get_conn)):
    rows = await conn.fetch("SELECT * FROM tags WHERE user_id = $1 ORDER BY name", str(user["id"]))
    return success(rows_to_list(rows))

@tags_router.post("", status_code=201)
async def create_tag(body: TagCreate, user: dict = Depends(get_current_user), conn: asyncpg.Connection = Depends(get_conn)):
    row = await conn.fetchrow(
        """INSERT INTO tags (user_id, name, color) VALUES ($1,$2,$3)
           ON CONFLICT (user_id, name) DO UPDATE SET color = $3 RETURNING *""",
        str(user["id"]), body.name, body.color
    )
    return success(row_to_dict(row), "Tag created", 201)

@tags_router.delete("/{tag_id}")
async def delete_tag(tag_id: str, user: dict = Depends(get_current_user), conn: asyncpg.Connection = Depends(get_conn)):
    await conn.execute("DELETE FROM tags WHERE id = $1 AND user_id = $2", tag_id, str(user["id"]))
    return success(None, "Tag deleted")


# ════════════════════ ACTIVITY ════════════════════
activity_router = APIRouter(prefix="/activity", tags=["activity"])

@activity_router.get("")
async def get_activity(limit: int = Query(20, le=100), user: dict = Depends(get_current_user), conn: asyncpg.Connection = Depends(get_conn)):
    rows = await conn.fetch(
        """SELECT a.*,
                  COALESCE(t.name, p.name, m.name) AS resource_name,
                  s.name AS subject_name, w.name AS workspace_name
           FROM activity_log a
           LEFT JOIN topics t ON a.resource_type='topic' AND t.id = a.resource_id
           LEFT JOIN pdf_files p ON a.resource_type='pdf' AND p.id = a.resource_id
           LEFT JOIN media_files m ON a.resource_type='media' AND m.id = a.resource_id
           LEFT JOIN subjects s ON s.id = COALESCE(t.subject_id, p.subject_id, m.subject_id)
           LEFT JOIN workspaces w ON w.id = s.workspace_id
           WHERE a.user_id = $1
             AND COALESCE(t.name, p.name, m.name) IS NOT NULL
           ORDER BY a.created_at DESC LIMIT $2""",
        str(user["id"]), limit
    )
    return success(rows_to_list(rows))

@activity_router.get("/heatmap")
async def get_heatmap(user: dict = Depends(get_current_user), conn: asyncpg.Connection = Depends(get_conn)):
    rows = await conn.fetch(
        """SELECT DATE(created_at) AS date, COUNT(*) AS count
           FROM activity_log WHERE user_id = $1
             AND created_at > NOW() - INTERVAL '365 days'
           GROUP BY DATE(created_at) ORDER BY date""",
        str(user["id"])
    )
    return success(rows_to_list(rows))


# ════════════════════ DRIVE ════════════════════
drive_router = APIRouter(prefix="/drive", tags=["drive"])

@drive_router.get("/status")
async def drive_status(user: dict = Depends(get_current_user), conn: asyncpg.Connection = Depends(get_conn)):
    connected = await check_drive_access(conn, user)
    return success({"connected": connected, "rootFolderId": user.get("drive_root_folder_id")})

@drive_router.post("/disconnect")
async def drive_disconnect(user: dict = Depends(get_current_user), conn: asyncpg.Connection = Depends(get_conn)):
    await conn.execute(
        """UPDATE users SET drive_connected=FALSE, drive_access_token=NULL,
           drive_refresh_token=NULL, drive_root_folder_id=NULL WHERE id=$1""",
        str(user["id"])
    )
    return success(None, "Drive disconnected")

@drive_router.get("/connect")
async def drive_connect(
    token: str,
    conn: asyncpg.Connection = Depends(get_conn),
):
    """Initiate Google OAuth flow for Drive connection."""
    from app.middleware.auth import decode_token
    import urllib.parse
    
    try:
        user_id = decode_token(token)
    except:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Build Google OAuth URL
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": f"{settings.backend_url}/api/drive/connect/callback",
        "response_type": "code",
        "scope": settings.google_drive_scope,
        "state": token,  # Pass JWT token as state for verification
        "access_type": "offline",
        "prompt": "consent",
    }
    
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return {"auth_url": google_auth_url}


@drive_router.get("/connect/callback")
async def drive_connect_callback(
    code: str,
    state: str = None,
    conn: asyncpg.Connection = Depends(get_conn),
):
    """Google OAuth callback for Drive connection."""
    from app.middleware.auth import decode_token
    import httpx
    from fastapi.responses import RedirectResponse
    
    if not state or not code:
        return RedirectResponse(f"{settings.frontend_url}/?error=drive_auth_failed")
    
    try:
        user_id = decode_token(state)
    except:
        return RedirectResponse(f"{settings.frontend_url}/?error=invalid_state")
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": f"{settings.backend_url}/api/drive/connect/callback",
                "grant_type": "authorization_code",
            }
        )
        
        if token_resp.status_code != 200:
            return RedirectResponse(f"{settings.frontend_url}/?error=token_exchange_failed")
        
        tokens = token_resp.json()
    
    # Save tokens to user
    await conn.execute(
        """UPDATE users 
           SET drive_access_token = $1,
               drive_refresh_token = COALESCE($2, drive_refresh_token),
               drive_connected = TRUE
           WHERE id = $3""",
        tokens.get("access_token"),
        tokens.get("refresh_token"),
        user_id,
    )
    
    return RedirectResponse(f"{settings.frontend_url}?drive=connected")


# ════════════════════ ADMIN ════════════════════
admin_router = APIRouter(prefix="/admin", tags=["admin"])

@admin_router.get("/users")
async def list_users(page: int = 1, limit: int = 20, user: dict = Depends(require_admin), conn: asyncpg.Connection = Depends(get_conn)):
    page, limit, offset = parse_pagination(page, limit)
    total = await conn.fetchval("SELECT COUNT(*) FROM users")
    rows = await conn.fetch("SELECT id,name,email,avatar,role,status,last_login,created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2", limit, offset)
    return paginated(rows_to_list(rows), total, page, limit)

@admin_router.patch("/users/{user_id}/suspend")
async def suspend_user(user_id: str, request: Request, admin: dict = Depends(require_admin), conn: asyncpg.Connection = Depends(get_conn)):
    row = await conn.fetchrow("UPDATE users SET status='suspended' WHERE id=$1 RETURNING *", user_id)
    if not row:
        raise HTTPException(404, "User not found")
    await audit(conn, str(admin["id"]), admin["name"], "USER_SUSPEND", f"Suspended user {row['email']}", request)
    return success(row_to_dict(row))

@admin_router.patch("/users/{user_id}/restore")
async def restore_user(user_id: str, request: Request, admin: dict = Depends(require_admin), conn: asyncpg.Connection = Depends(get_conn)):
    row = await conn.fetchrow("UPDATE users SET status='active' WHERE id=$1 RETURNING *", user_id)
    if not row:
        raise HTTPException(404, "User not found")
    await audit(conn, str(admin["id"]), admin["name"], "USER_RESTORE", f"Restored user {row['email']}", request)
    return success(row_to_dict(row))

@admin_router.patch("/users/{user_id}/role")
async def change_role(user_id: str, role: str, request: Request, admin: dict = Depends(require_super_admin), conn: asyncpg.Connection = Depends(get_conn)):
    if role not in ("USER", "ADMIN", "SUPER_ADMIN"):
        raise HTTPException(400, "Invalid role")
    row = await conn.fetchrow("UPDATE users SET role=$1 WHERE id=$2 RETURNING *", role, user_id)
    if not row:
        raise HTTPException(404, "User not found")
    await audit(conn, str(admin["id"]), admin["name"], "USER_ROLE_CHANGE", f"Set {row['email']} role to {role}", request)
    return success(row_to_dict(row))

@admin_router.get("/analytics")
async def analytics(admin: dict = Depends(require_admin), conn: asyncpg.Connection = Depends(get_conn)):
    total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
    total_workspaces = await conn.fetchval("SELECT COUNT(*) FROM workspaces")
    total_subjects = await conn.fetchval("SELECT COUNT(*) FROM subjects")
    total_topics = await conn.fetchval("SELECT COUNT(*) FROM topics")
    total_pdfs = await conn.fetchval("SELECT COUNT(*) FROM pdf_files")
    active_today = await conn.fetchval("SELECT COUNT(DISTINCT user_id) FROM activity_log WHERE created_at > NOW() - INTERVAL '1 day'")
    return success({
        "totalUsers": total_users, "totalWorkspaces": total_workspaces,
        "totalSubjects": total_subjects, "totalTopics": total_topics,
        "totalPdfs": total_pdfs, "activeToday": active_today,
    })

@admin_router.get("/audit-logs")
async def audit_logs(page: int = 1, limit: int = 50, admin: dict = Depends(require_admin), conn: asyncpg.Connection = Depends(get_conn)):
    page, limit, offset = parse_pagination(page, limit)
    total = await conn.fetchval("SELECT COUNT(*) FROM audit_logs")
    rows = await conn.fetch("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2", limit, offset)
    return paginated(rows_to_list(rows), total, page, limit)
