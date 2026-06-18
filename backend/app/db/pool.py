import asyncpg
from typing import Optional
from loguru import logger
from app.config import settings

_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=2,
            max_size=10,
            command_timeout=30,
        )
        logger.info("✅ Database pool created")
    return _pool


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database pool closed")


async def test_connection():
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.fetchval("SELECT NOW()")
        logger.info(f"DB connected — server time: {result}")


# Dependency for FastAPI routes
async def get_conn():
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn
