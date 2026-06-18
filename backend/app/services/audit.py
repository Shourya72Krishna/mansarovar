from typing import Optional
import asyncpg
from loguru import logger
from fastapi import Request


async def audit(
    conn:       asyncpg.Connection,
    user_id:    Optional[str],
    actor_name: str,
    action:     str,
    details:    str,
    request:    Optional[Request] = None,
):
    try:
        ip = None
        if request:
            forwarded = request.headers.get("x-forwarded-for")
            ip = forwarded.split(",")[0].strip() if forwarded else request.client.host if request.client else None

        await conn.execute(
            """INSERT INTO audit_logs (user_id, actor_name, action, details, ip_address)
               VALUES ($1, $2, $3, $4, $5)""",
            user_id, actor_name, action, details, ip
        )
    except Exception as e:
        logger.error(f"Failed to write audit log: {e}")


async def log_activity(
    conn:          asyncpg.Connection,
    user_id:       str,
    resource_type: str,
    resource_id:   str,
    action:        str,
):
    try:
        # Remove existing entry for same resource then insert fresh
        await conn.execute(
            """DELETE FROM activity_log
               WHERE user_id = $1 AND resource_id = $2 AND resource_type = $3""",
            user_id, resource_id, resource_type
        )
        await conn.execute(
            """INSERT INTO activity_log (user_id, resource_type, resource_id, action)
               VALUES ($1, $2, $3, $4)""",
            user_id, resource_type, resource_id, action
        )
    except Exception as e:
        logger.error(f"Failed to write activity log: {e}")
