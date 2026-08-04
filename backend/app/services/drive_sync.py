"""
Mirrors topic content (Postgres, source of truth) into a Google Doc
living in the same nested Drive folder structure used for PDFs:

    मानसरोवर/ → {Workspace}/ → {Subject}/ → Notes/ → {Topic}.gdoc

Postgres remains authoritative — this is a one-way, best-effort mirror.
A Drive failure never blocks or breaks saving a note.

Sync is debounced per-topic in-process (asyncio), separate from the
1.5s DB autosave debounce, so we don't hammer the Drive API on every
keystroke-driven save.
"""

import asyncio
from typing import Optional
from loguru import logger
from app.db.pool import get_pool
from app.services.drive import (
    ensure_root_folder, create_subfolder,
    create_google_doc, update_google_doc,
)

SYNC_DEBOUNCE_SECONDS = 45

_pending: dict[str, asyncio.Task] = {}


def schedule_topic_sync(topic_id: str, user_id: str) -> None:
    """Call after a topic is created or its content changes.
    Cancels any pending sync for this topic and reschedules."""
    existing = _pending.get(topic_id)
    if existing and not existing.done():
        existing.cancel()

    task = asyncio.create_task(_debounced_sync(topic_id, user_id))
    _pending[topic_id] = task


async def _debounced_sync(topic_id: str, user_id: str) -> None:
    try:
        await asyncio.sleep(SYNC_DEBOUNCE_SECONDS)
        await _sync_topic_to_drive(topic_id, user_id)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.warning(f"Drive note sync failed for topic {topic_id}: {e}")
    finally:
        _pending.pop(topic_id, None)


async def ensure_topic_synced(topic_id: str, user_id: str) -> Optional[str]:
    """Synchronous, on-demand version of the sync — used when something
    (like a PDF export) needs a Drive file to exist *right now*, instead
    of waiting out the debounce window. Returns the drive_file_id, or
    None if the user isn't Drive-connected / the topic doesn't exist."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        if not user or not user["drive_connected"]:
            return None

        topic = await conn.fetchrow(
            """SELECT t.*, s.name AS subject_name, w.name AS workspace_name
               FROM topics t
               JOIN subjects s   ON s.id = t.subject_id
               JOIN workspaces w ON w.id = s.workspace_id
               WHERE t.id = $1""",
            topic_id
        )
        if not topic:
            return None

        if topic["drive_file_id"]:
            return topic["drive_file_id"]

        return await _create_doc_mirror(conn, dict(user), topic, topic_id)


async def _sync_topic_to_drive(topic_id: str, user_id: str) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        if not user:
            logger.warning(f"Drive sync skipped for topic {topic_id}: user {user_id} not found")
            return
        if not user["drive_connected"]:
            logger.info(f"Drive sync skipped for topic {topic_id}: user {user_id} not Drive-connected")
            return

        topic = await conn.fetchrow(
            """SELECT t.*, s.name AS subject_name, w.name AS workspace_name
               FROM topics t
               JOIN subjects s   ON s.id = t.subject_id
               JOIN workspaces w ON w.id = s.workspace_id
               WHERE t.id = $1""",
            topic_id
        )
        if not topic:
            logger.warning(f"Drive sync skipped: topic {topic_id} not found")
            return

        user = dict(user)

        if topic["drive_file_id"]:
            await update_google_doc(user, topic["drive_file_id"], topic["content"] or "")
            await conn.execute(
                "UPDATE topics SET drive_synced_at = NOW() WHERE id = $1", topic_id
            )
            logger.info(f"📝 Synced topic {topic_id} → existing Google Doc")
            return

        await _create_doc_mirror(conn, user, topic, topic_id)


async def _create_doc_mirror(conn, user: dict, topic, topic_id: str) -> str:
    """Creates the Drive folder chain (if needed) + the Doc itself, and
    records the result on the topic row. Returns the new drive_file_id."""
    root_id      = await ensure_root_folder(conn, user)
    ws_folder    = await create_subfolder(user, topic["workspace_name"], root_id)
    sub_folder   = await create_subfolder(user, topic["subject_name"], ws_folder)
    notes_folder = await create_subfolder(user, "Notes", sub_folder)

    file_id, view_url = await create_google_doc(
        user, notes_folder, topic["name"], topic["content"] or ""
    )

    await conn.execute(
        """UPDATE topics
           SET drive_file_id = $1, drive_view_url = $2,
               drive_folder_id = $3, drive_synced_at = NOW()
           WHERE id = $4""",
        file_id, view_url, notes_folder, topic_id
    )
    logger.info(f"📝 Created Google Doc mirror for topic {topic_id}")
    return file_id