from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum
from uuid import UUID


# ── Enums ─────────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN       = "ADMIN"
    USER        = "USER"

class UserStatus(str, Enum):
    active    = "active"
    suspended = "suspended"

class MediaType(str, Enum):
    image      = "image"
    video      = "video"
    attachment = "attachment"


# ── Generic response ──────────────────────────────────────────────────────────

class ApiResponse(BaseModel):
    success: bool
    message: str
    data:    Any = None

class PaginatedResponse(BaseModel):
    success: bool
    data:    List[Any]
    pagination: dict


# ── User ──────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id:                 str
    name:               str
    email:              str
    google_id:          str
    avatar:             Optional[str]
    role:               UserRole
    status:             UserStatus
    drive_connected:    bool
    drive_root_folder_id: Optional[str]
    last_login:         Optional[datetime]
    created_at:         datetime
    updated_at:         datetime


# ── Workspace ─────────────────────────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    name:       str = Field(..., min_length=1, max_length=255)
    icon:       str = Field("📁", max_length=10)
    color:      str = Field("#7c3aed", max_length=20)
    sort_order: int = 0

class WorkspaceUpdate(BaseModel):
    name:       Optional[str] = Field(None, min_length=1, max_length=255)
    icon:       Optional[str] = Field(None, max_length=10)
    color:      Optional[str] = Field(None, max_length=20)
    pinned:     Optional[bool] = None
    archived:   Optional[bool] = None
    sort_order: Optional[int]  = None

class WorkspaceOut(BaseModel):
    id:            str
    user_id:       str
    name:          str
    icon:          str
    color:         str
    pinned:        bool
    archived:      bool
    sort_order:    int
    subject_count: Optional[int] = 0
    created_at:    datetime
    updated_at:    datetime

class ReorderItem(BaseModel):
    id:         str
    sort_order: int

class ReorderRequest(BaseModel):
    items: List[ReorderItem]


# ── Subject ───────────────────────────────────────────────────────────────────

class SubjectCreate(BaseModel):
    workspace_id: str
    name:         str = Field(..., min_length=1, max_length=255)
    description:  Optional[str] = Field(None, max_length=2000)
    icon:         str = Field("📖", max_length=10)
    color:        str = Field("#2563eb", max_length=20)
    tags:         List[str] = []
    sort_order:   int = 0

class SubjectUpdate(BaseModel):
    name:        Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    icon:        Optional[str] = Field(None, max_length=10)
    color:       Optional[str] = Field(None, max_length=20)
    pinned:      Optional[bool] = None
    archived:    Optional[bool] = None
    tags:        Optional[List[str]] = None
    sort_order:  Optional[int] = None

class SubjectOut(BaseModel):
    id:           str
    workspace_id: str
    user_id:      str
    name:         str
    description:  Optional[str]
    icon:         str
    color:        str
    pinned:       bool
    archived:     bool
    sort_order:   int
    tags:         List[str]
    topic_count:  Optional[int] = 0
    pdf_count:    Optional[int] = 0
    media_count:  Optional[int] = 0
    created_at:   datetime
    updated_at:   datetime


# ── Topic ─────────────────────────────────────────────────────────────────────

class TopicCreate(BaseModel):
    subject_id:  str
    parent_id:   Optional[str] = None
    name:        str = Field(..., min_length=1, max_length=500)
    content:     str = ""
    tags:        List[str] = []
    sort_order:  int = 0

class TopicUpdate(BaseModel):
    name:       Optional[str] = Field(None, min_length=1, max_length=500)
    content:    Optional[str] = None
    pinned:     Optional[bool] = None
    archived:   Optional[bool] = None
    tags:       Optional[List[str]] = None
    sort_order: Optional[int] = None

class TopicOut(BaseModel):
    id:              str
    subject_id:      str
    user_id:         str
    parent_id:       Optional[str]
    name:            str
    content:         str
    content_preview: Optional[str]
    pinned:          bool
    archived:        bool
    sort_order:      int
    tags:            List[str]
    version_count:   Optional[int] = 0
    last_edited_at:  Optional[datetime]
    created_at:      datetime
    updated_at:      datetime


# ── PDF ───────────────────────────────────────────────────────────────────────

class PdfOut(BaseModel):
    id:               str
    subject_id:       str
    topic_id:         Optional[str]
    user_id:          str
    name:             str
    drive_file_id:    str
    drive_view_url:   Optional[str]
    size_bytes:       int
    page_count:       Optional[int]
    reading_progress: int
    tags:             List[str]
    bookmarks:        Optional[List[Any]] = []
    created_at:       datetime
    updated_at:       datetime

class BookmarkCreate(BaseModel):
    page:  int
    label: str

class ProgressUpdate(BaseModel):
    progress: int = Field(..., ge=0, le=100)


# ── Media ─────────────────────────────────────────────────────────────────────

class MediaOut(BaseModel):
    id:                   str
    subject_id:           str
    topic_id:             Optional[str]
    user_id:              str
    name:                 str
    type:                 str
    mime_type:            Optional[str]
    drive_file_id:        str
    drive_thumbnail_url:  Optional[str]
    drive_view_url:       Optional[str]
    size_bytes:           int
    tags:                 List[str]
    created_at:           datetime


# ── Tag ───────────────────────────────────────────────────────────────────────

class TagCreate(BaseModel):
    name:  str = Field(..., max_length=100)
    color: str = "#fbbf24"

class TagOut(BaseModel):
    id:         str
    user_id:    str
    name:       str
    color:      str
    created_at: datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"

class AppConfig(BaseModel):
    app_name:    str
    app_tagline: str
    logo_letter: str
    app_env:     str
