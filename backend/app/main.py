from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from loguru import logger
import asyncio
import aiohttp

from app.config import settings
from app.db.pool import get_pool, close_pool, test_connection
from app.routers import auth, workspaces, subjects, topics, search
from app.routers.files import pdf_router, media_router
from app.routers.misc import tags_router, activity_router, drive_router, admin_router

PING_INTERVAL_SECONDS = 10 * 60  # 10 minutes


async def self_ping():
    """Keeps the Render free-tier instance alive by pinging /health
    from within the process itself — no external uptime service needed."""
    url = f"{settings.backend_url}/health"
    await asyncio.sleep(30)  # small delay so server is fully ready first
    while True:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    logger.info(f"🏓 Self-ping → {resp.status}")
        except Exception as e:
            logger.warning(f"⚠️ Self-ping failed: {e}")
        await asyncio.sleep(PING_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    await test_connection()
    logger.info(f"🚀 {settings.app_name} backend started on port {settings.port}")
    ping_task = asyncio.create_task(self_ping())
    yield
    ping_task.cancel()
    await close_pool()

app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(status_code=500, content={"success": False, "message": "Internal server error", "errors": str(exc)})


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}


# Mount all routers under /api
app.include_router(auth.router,       prefix="/api")
app.include_router(workspaces.router, prefix="/api")
app.include_router(subjects.router,   prefix="/api")
app.include_router(topics.router,     prefix="/api")
app.include_router(search.router,     prefix="/api")
app.include_router(pdf_router,        prefix="/api")
app.include_router(media_router,      prefix="/api")
app.include_router(tags_router,       prefix="/api")
app.include_router(activity_router,   prefix="/api")
app.include_router(drive_router,      prefix="/api")
app.include_router(admin_router,      prefix="/api")
