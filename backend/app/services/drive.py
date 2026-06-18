from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.http import MediaIoBaseUpload
import io
import asyncpg
from typing import Optional, Tuple
from loguru import logger
from app.config import settings


def _get_drive_service(user: dict):
    """Build a Drive API client for a user, auto-refreshing tokens."""
    creds = Credentials(
        token=user.get("drive_access_token"),
        refresh_token=user.get("drive_refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=[settings.google_drive_scope],
    )
    return build("drive", "v3", credentials=creds, cache_discovery=False)


async def ensure_root_folder(conn: asyncpg.Connection, user: dict) -> str:
    """Create Akshar/ folder in user's Drive if not exists. Returns folder ID."""
    if user.get("drive_root_folder_id"):
        return user["drive_root_folder_id"]

    service = _get_drive_service(user)
    app_name = settings.app_name

    # Check if folder already exists
    results = service.files().list(
        q=f"name = '{app_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields="files(id, name)",
        spaces="drive",
    ).execute()

    files = results.get("files", [])
    if files:
        folder_id = files[0]["id"]
    else:
        folder = service.files().create(
            body={"name": app_name, "mimeType": "application/vnd.google-apps.folder"},
            fields="id",
        ).execute()
        folder_id = folder["id"]
        logger.info(f"Created Drive root folder '{app_name}' for user {user['id']}")

    await conn.execute(
        "UPDATE users SET drive_root_folder_id = $1, drive_connected = TRUE WHERE id = $2",
        folder_id, user["id"]
    )
    return folder_id


async def create_subfolder(user: dict, folder_name: str, parent_id: str) -> str:
    """Create a subfolder inside a parent Drive folder."""
    service = _get_drive_service(user)

    # Check if it already exists
    results = service.files().list(
        q=f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' and '{parent_id}' in parents and trashed = false",
        fields="files(id)",
        spaces="drive",
    ).execute()

    files = results.get("files", [])
    if files:
        return files[0]["id"]

    folder = service.files().create(
        body={
            "name": folder_name,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [parent_id],
        },
        fields="id",
    ).execute()
    return folder["id"]


async def upload_file_to_drive(
    user:      dict,
    folder_id: str,
    filename:  str,
    mime_type: str,
    content:   bytes,
) -> Tuple[str, str, Optional[str]]:
    """Upload bytes to Drive. Returns (file_id, view_url, thumbnail_url)."""
    service = _get_drive_service(user)

    media = MediaIoBaseUpload(
        io.BytesIO(content),
        mimetype=mime_type,
        resumable=False,
    )

    file = service.files().create(
        body={"name": filename, "parents": [folder_id]},
        media_body=media,
        fields="id, webViewLink, thumbnailLink",
    ).execute()

    # Make readable via link
    service.permissions().create(
        fileId=file["id"],
        body={"role": "reader", "type": "anyone"},
    ).execute()

    return (
        file["id"],
        file.get("webViewLink", ""),
        file.get("thumbnailLink"),
    )


async def delete_file_from_drive(user: dict, drive_file_id: str):
    try:
        service = _get_drive_service(user)
        service.files().delete(fileId=drive_file_id).execute()
    except Exception as e:
        logger.warning(f"Could not delete Drive file {drive_file_id}: {e}")


async def check_drive_access(conn: asyncpg.Connection, user: dict) -> bool:
    try:
        service = _get_drive_service(user)
        service.files().list(pageSize=1, fields="files(id)").execute()
        return True
    except Exception:
        await conn.execute("UPDATE users SET drive_connected = FALSE WHERE id = $1", user["id"])
        return False
