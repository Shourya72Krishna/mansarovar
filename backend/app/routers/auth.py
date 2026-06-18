from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
import httpx
import asyncpg
from app.config import settings
from app.db.pool import get_conn
from app.middleware.auth import create_access_token, get_current_user
from app.services.audit import audit
from app.schemas import AppConfig
from loguru import logger

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL   = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL  = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO   = "https://www.googleapis.com/oauth2/v3/userinfo"


# ── GET /api/auth/config ──────────────────────────────────────────────────────

@router.get("/config", response_model=AppConfig)
async def get_app_config():
    return AppConfig(
        app_name    = settings.app_name,
        app_tagline = settings.app_tagline,
        logo_letter = settings.app_logo_letter,
        app_env     = settings.app_env,
    )


# ── GET /api/auth/google ──────────────────────────────────────────────────────

@router.get("/google")
async def google_login():
    params = (
        f"?client_id={settings.google_client_id}"
        f"&redirect_uri={settings.google_redirect_uri}"
        f"&response_type=code"
        f"&scope=openid email profile {settings.google_drive_scope}"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    return RedirectResponse(GOOGLE_AUTH_URL + params)


# ── GET /api/auth/google/callback ─────────────────────────────────────────────

@router.get("/google/callback")
async def google_callback(
    code:  str,
    conn:  asyncpg.Connection = Depends(get_conn),
):
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code":          code,
            "client_id":     settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri":  settings.google_redirect_uri,
            "grant_type":    "authorization_code",
        })
        if token_resp.status_code != 200:
            logger.error(f"Token exchange failed: {token_resp.text}")
            return RedirectResponse(f"{settings.frontend_url}/?error=auth_failed")

        tokens = token_resp.json()
        access_token  = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")

        # Fetch user info
        user_resp = await client.get(
            GOOGLE_USERINFO,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if user_resp.status_code != 200:
            return RedirectResponse(f"{settings.frontend_url}/?error=auth_failed")

        info = user_resp.json()

    email     = info.get("email", "")
    name      = info.get("name", "Unknown")
    avatar    = info.get("picture", "")
    google_id = info.get("sub", "")

    if not email:
        return RedirectResponse(f"{settings.frontend_url}/?error=no_email")

    # Upsert user
    existing = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)

    if existing:
        user = await conn.fetchrow(
            """UPDATE users
               SET name = $1, avatar = $2, google_id = $3, last_login = NOW(),
                   drive_access_token  = $4,
                   drive_refresh_token = COALESCE($5, drive_refresh_token)
               WHERE email = $6
               RETURNING *""",
            name, avatar, google_id, access_token, refresh_token, email
        )
    else:
        is_super = settings.super_admin_email and email == settings.super_admin_email
        role = "SUPER_ADMIN" if is_super else "USER"
        user = await conn.fetchrow(
            """INSERT INTO users
                 (name, email, google_id, avatar, role, last_login, drive_access_token, drive_refresh_token)
               VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
               RETURNING *""",
            name, email, google_id, avatar, role, access_token, refresh_token
        )

    user = dict(user)

    if user["status"] == "suspended":
        return RedirectResponse(f"{settings.frontend_url}/?error=suspended")

    await audit(conn, user["id"], user["name"], "LOGIN", "Signed in via Google OAuth")

    jwt_token = create_access_token(str(user["id"]))
    return RedirectResponse(f"{settings.frontend_url}/?token={jwt_token}")


# ── GET /api/auth/me ──────────────────────────────────────────────────────────

@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    safe = {k: v for k, v in user.items() if k not in ("drive_access_token", "drive_refresh_token")}
    # Serialize non-JSON-native types
    for key, val in safe.items():
        if hasattr(val, "isoformat"):
            safe[key] = val.isoformat()
        elif hasattr(val, '__str__') and not isinstance(val, (str, int, float, bool, type(None))):
            safe[key] = str(val)
    return {"success": True, "message": "OK", "data": safe}


# ── POST /api/auth/logout ─────────────────────────────────────────────────────

@router.post("/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("__akshar_token")
    return {"success": True, "message": "Logged out", "data": None}
