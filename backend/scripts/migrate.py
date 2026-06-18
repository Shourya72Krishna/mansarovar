import asyncio, asyncpg, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.config import settings

async def main():
    conn = await asyncpg.connect(dsn=settings.database_url.replace("postgresql+asyncpg://", "postgresql://"))
    sql = open(os.path.join(os.path.dirname(__file__), "schema.sql")).read()
    await conn.execute(sql)
    print("✅ Migration complete")
    await conn.close()

asyncio.run(main())
