export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER'

export interface User {
  id: string
  name: string
  email: string
  googleId: string
  avatar: string
  role: UserRole
  status: 'active' | 'suspended'
  createdAt: string
  lastLogin: string
  driveConnected: boolean
  driveRootFolderId?: string
}

export interface Workspace {
  id: string
  name: string
  userId: string
  icon?: string
  color?: string
  pinned: boolean
  archived: boolean
  sortOrder: number
  subjectCount: number
  createdAt: string
  updatedAt: string
}

export interface Subject {
  id: string
  workspaceId: string
  name: string
  description?: string
  icon?: string
  color?: string
  pinned: boolean
  archived: boolean
  sortOrder: number
  tags: string[]
  topicCount: number
  pdfCount: number
  mediaCount: number
  createdAt: string
  updatedAt: string
}

export interface Topic {
  id: string
  subjectId: string
  parentId?: string
  name: string
  content?: string
  contentPreview?: string
  pinned: boolean
  archived: boolean
  sortOrder: number
  tags: string[]
  children?: Topic[]
  lastEditedAt?: string
  createdAt: string
  updatedAt: string
  versionCount: number
}

export interface PDFFile {
  id: string
  subjectId: string
  topicId?: string
  name: string
  driveFileId: string
  driveViewUrl: string
  size: number
  pageCount?: number
  readingProgress: number
  bookmarks: PDFBookmark[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface PDFBookmark {
  id: string
  page: number
  label: string
}

export interface MediaFile {
  id: string
  subjectId: string
  topicId?: string
  name: string
  type: 'image' | 'video' | 'attachment'
  mimeType: string
  driveFileId: string
  driveThumbnailUrl?: string
  driveViewUrl: string
  size: number
  tags: string[]
  createdAt: string
}

export interface TopicVersion {
  id: string
  topicId: string
  content: string
  createdAt: string
  wordCount: number
}

export interface ActivityEntry {
  id: string
  type: 'topic_view' | 'pdf_view' | 'media_view' | 'topic_edit'
  resourceId: string
  resourceName: string
  resourceType: 'topic' | 'pdf' | 'media'
  subjectName?: string
  workspaceName?: string
  timestamp: string
}

export interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  details: string
  ipAddress?: string
  createdAt: string
}

export interface SearchResult {
  id: string
  type: 'workspace' | 'subject' | 'topic' | 'pdf' | 'media'
  name: string
  excerpt?: string
  path: string[]
  tags: string[]
  updatedAt: string
}

export type SortMode = 'alphabetical' | 'recently-created' | 'recently-updated' | 'custom'
