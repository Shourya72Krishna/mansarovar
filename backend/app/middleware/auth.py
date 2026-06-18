from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import asyncpg
from app.config import settings
from app.db.pool import get_conn
from loguru import logger

bearer_scheme = HTTPBearer(auto_error=False)


# ── Token helpers ─────────────────────────────────────────────────────────────

def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.jwt_expire_days)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> str:
    """Returns user_id from token or raises HTTPException."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ── Extract token from header OR cookie ───────────────────────────────────────

def _extract_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[str]:
    if credentials and credentials.credentials:
        return credentials.credentials
    cookie = request.cookies.get("__akshar_token")
    if cookie:
        return cookie
    return None


# ── Main auth dependency ──────────────────────────────────────────────────────

async def get_current_user(
    request:     Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    conn:        asyncpg.Connection = Depends(get_conn),
):
    token = _extract_token(request, credentials)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    user_id = decode_token(token)

    row = await conn.fetchrow(
        "SELECT * FROM users WHERE id = $1 AND status = 'active'",
        user_id
    )
    if not row:
        raise HTTPException(status_code=401, detail="User not found or suspended")

    return dict(row)


# ── Role guards ───────────────────────────────────────────────────────────────

def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_super_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user


# ── Ownership check ───────────────────────────────────────────────────────────

async def check_ownership(
    table:       str,
    resource_id: str,
    user:        dict,
    conn:        asyncpg.Connection,
):
    """Raises 404 or 403 if resource doesn't exist / doesn't belong to user."""
    # Admins bypass ownership
    if user["role"] in ("ADMIN", "SUPER_ADMIN"):
        row = await conn.fetchrow(f"SELECT id FROM {table} WHERE id = $1", resource_id)
        if not row:
            raise HTTPException(status_code=404, detail="Resource not found")
        return

    row = await conn.fetchrow(f"SELECT user_id FROM {table} WHERE id = $1", resource_id)
    if not row:
        raise HTTPException(status_code=404, detail="Resource not found")
    if str(row["user_id"]) != str(user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
