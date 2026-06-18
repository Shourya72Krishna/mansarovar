import asyncio, asyncpg, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.config import settings

async def main():
    if not settings.super_admin_email:
        print("No SUPER_ADMIN_EMAIL set, skipping seed")
        return
    conn = await asyncpg.connect(dsn=settings.database_url.replace("postgresql+asyncpg://", "postgresql://"))
    row = await conn.fetchrow("SELECT id FROM users WHERE email=$1", settings.super_admin_email)
    if row:
        await conn.execute("UPDATE users SET role='SUPER_ADMIN' WHERE email=$1", settings.super_admin_email)
        print(f"✅ {settings.super_admin_email} promoted to SUPER_ADMIN")
    else:
        print(f"User {settings.super_admin_email} not found yet — will become SUPER_ADMIN on first login")
    await conn.close()

asyncio.run(main())
