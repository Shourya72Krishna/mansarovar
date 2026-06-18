import { create } from 'zustand'
import { api } from '@/services/api'
import type { User, Workspace, Subject, Topic, PDFFile, ActivityEntry, AuditLog } from '@/types'

interface AppState {
  user: User | null
  workspaces: Workspace[]
  subjects: Subject[]
  topics: Topic[]
  pdfs: PDFFile[]
  recentActivity: ActivityEntry[]
  auditLogs: AuditLog[]

  activeWorkspaceId: string | null
  activeSubjectId: string | null
  activeTopicId: string | null
  activePage: string
  sidebarCollapsed: boolean

  loading: {
    workspaces: boolean
    subjects: boolean
    topics: boolean
    pdfs: boolean
  }

  setUser: (user: User | null) => void
  setActivePage: (page: string) => void
  setActiveWorkspace: (id: string | null) => void
  setActiveSubject: (id: string | null) => void
  setActiveTopic: (id: string | null) => void | Promise<void>
  setSidebarCollapsed: (v: boolean) => void

  fetchWorkspaces: () => Promise<void>
  fetchSubjects: (workspaceId?: string) => Promise<void>
  fetchTopics: (subjectId: string) => Promise<void>
  fetchPdfs: (subjectId?: string) => Promise<void>
  fetchRecentActivity: () => Promise<void>

  addWorkspace: (data: { name: string; icon: string; color: string }) => Promise<void>
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>
  deleteWorkspace: (id: string, hard?: boolean) => Promise<void>

  addSubject: (data: { workspaceId: string; name: string; icon: string; description?: string; tags?: string[] }) => Promise<void>
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>
  deleteSubject: (id: string, hard?: boolean) => Promise<void>

  addTopic: (data: { subjectId: string; parentId?: string; name: string; tags?: string[] }) => Promise<Topic | null>
  updateTopic: (id: string, updates: Partial<Topic>) => Promise<void>
  deleteTopic: (id: string, hard?: boolean) => Promise<void>

  getSubjectsForWorkspace: (wsId: string) => Subject[]
  getTopicsForSubject: (subId: string) => Topic[]
  getRootTopics: (subId: string) => Topic[]
}

// Module-level (non-reactive) guard against duplicate topic creation from
// rapid double-clicks — see addTopic below. Lives outside the store since
// it's pure bookkeeping and shouldn't trigger re-renders.
const topicCreatesInFlight = new Set<string>()

const mapWorkspace = (d: any): Workspace => ({
  id:           d.id,
  userId:       d.user_id,
  name:         d.name,
  icon:         d.icon,
  color:        d.color,
  pinned:       d.pinned,
  archived:     d.archived,
  sortOrder:    d.sort_order,
  subjectCount: parseInt(d.subject_count ?? '0'),
  createdAt:    d.created_at,
  updatedAt:    d.updated_at,
})

const mapSubject = (d: any): Subject => ({
  id:           d.id,
  workspaceId:  d.workspace_id,
  name:         d.name,
  description:  d.description,
  icon:         d.icon,
  color:        d.color,
  pinned:       d.pinned,
  archived:     d.archived,
  sortOrder:    d.sort_order,
  tags:         d.tags ?? [],
  topicCount:   parseInt(d.topic_count ?? '0'),
  pdfCount:     parseInt(d.pdf_count ?? '0'),
  mediaCount:   parseInt(d.media_count ?? '0'),
  createdAt:    d.created_at,
  updatedAt:    d.updated_at,
})

const mapTopic = (d: any): Topic => ({
  id:             d.id,
  subjectId:      d.subject_id,
  parentId:       d.parent_id ?? undefined,
  name:           d.name,
  content:        d.content ?? '',
  contentPreview: d.content_preview ?? '',
  pinned:         d.pinned,
  archived:       d.archived,
  sortOrder:      d.sort_order,
  tags:           d.tags ?? [],
  lastEditedAt:   d.last_edited_at ?? undefined,
  createdAt:      d.created_at,
  updatedAt:      d.updated_at,
  versionCount:   parseInt(d.version_count ?? '0'),
  children:       [],  // always empty — we use flat list
})

export const useStore = create<AppState>((set, get) => ({
  user:           null,
  workspaces:     [],
  subjects:       [],
  topics:         [],
  pdfs:           [],
  recentActivity: [],
  auditLogs:      [],

  activeWorkspaceId: null,
  activeSubjectId:   null,
  activeTopicId:     null,
  activePage:        'dashboard',
  sidebarCollapsed:  false,

  loading: {
    workspaces: false,
    subjects:   false,
    topics:     false,
    pdfs:       false,
  },

  setUser: (user) => set({ user }),
  setActivePage: (page) => set({ activePage: page }),
  setActiveWorkspace: (id) => set({ activeWorkspaceId: id, activeSubjectId: null, activeTopicId: null }),
  setActiveSubject: (id) => set({ activeSubjectId: id, activeTopicId: null }),
  setActiveTopic: async (id) => {
    set({ activeTopicId: id })
    if (!id) return
    // ensure the topic's subject is active so TopicPage has context
    const existing = get().topics.find(t => t.id === id)
    if (existing) {
      set({ activeSubjectId: existing.subjectId })
    }
  },
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  // ── Fetch ──────────────────────────────────────────────────────────────────

  fetchWorkspaces: async () => {
    set(s => ({ loading: { ...s.loading, workspaces: true } }))
    try {
      const res = await api.workspaces.list()
      set({ workspaces: res.data.map(mapWorkspace) })
    } catch (e) {
      console.error('fetchWorkspaces failed:', e)
    } finally {
      set(s => ({ loading: { ...s.loading, workspaces: false } }))
    }
  },

  fetchSubjects: async (workspaceId?) => {
    set(s => ({ loading: { ...s.loading, subjects: true } }))
    try {
      const res = await api.subjects.list(workspaceId)
      set(s => ({
        subjects: workspaceId
          ? [...s.subjects.filter(x => x.workspaceId !== workspaceId), ...res.data.map(mapSubject)]
          : res.data.map(mapSubject),
        loading: { ...s.loading, subjects: false },
      }))
    } catch (e) {
      console.error('fetchSubjects failed:', e)
      set(s => ({ loading: { ...s.loading, subjects: false } }))
    }
  },

  fetchTopics: async (subjectId) => {
    set(s => ({ loading: { ...s.loading, topics: true } }))
    try {
      const res = await api.topics.list(subjectId, true)  // flat=true
      set(s => ({
        topics: [
          ...s.topics.filter(t => t.subjectId !== subjectId),
          ...res.data.map(mapTopic),
        ],
        loading: { ...s.loading, topics: false },
      }))
    } catch (e) {
      console.error('fetchTopics failed:', e)
      set(s => ({ loading: { ...s.loading, topics: false } }))
    }
  },

  fetchPdfs: async (subjectId?) => {
    set(s => ({ loading: { ...s.loading, pdfs: true } }))
    try {
      const res = await api.pdfs.list(subjectId)
      const mapPdf = (d: any): PDFFile => ({
        id:              d.id,
        subjectId:       d.subject_id,
        topicId:         d.topic_id ?? undefined,
        name:            d.name,
        driveFileId:     d.drive_file_id,
        driveViewUrl:    d.drive_view_url ?? '',
        size:            d.size_bytes ?? 0,
        pageCount:       d.page_count ?? 0,
        readingProgress: d.reading_progress ?? 0,
        bookmarks:       d.bookmarks ?? [],
        tags:            d.tags ?? [],
        createdAt:       d.created_at,
        updatedAt:       d.updated_at ?? d.created_at,
      })
      set(s => ({
        pdfs: subjectId
          ? [...s.pdfs.filter(p => p.subjectId !== subjectId), ...res.data.map(mapPdf)]
          : res.data.map(mapPdf),
        loading: { ...s.loading, pdfs: false },
      }))
    } catch (e) {
      console.error('fetchPdfs failed:', e)
      set(s => ({ loading: { ...s.loading, pdfs: false } }))
    }
  },

  fetchRecentActivity: async () => {
    try {
      const res = await api.activity.list(20)
      set({
        recentActivity: (res.data ?? [])
          .filter((a: any) => a.created_at)  // skip entries with no timestamp
          .map((a: any) => ({
            id:            a.id,
            type:          a.action === 'edit' ? 'topic_edit' : 'topic_view',
            resourceId:    a.resource_id,
            resourceName:  a.resource_name ?? 'Untitled',
            resourceType:  a.resource_type ?? 'topic',
            subjectName:   a.subject_name ?? '',
            workspaceName: a.workspace_name ?? '',
            timestamp:     a.created_at,
          }))
      })
    } catch (e) {
      console.error('fetchRecentActivity failed:', e)
    }
  },

  // ── Workspaces ─────────────────────────────────────────────────────────────

  addWorkspace: async (data) => {
    const res = await api.workspaces.create({
      name:       data.name,
      icon:       data.icon,
      color:      data.color,
      sort_order: get().workspaces.length,
    })
    set(s => ({ workspaces: [...s.workspaces, mapWorkspace(res.data)] }))
  },

  updateWorkspace: async (id, updates) => {
    const body: any = {}
    if (updates.name      !== undefined) body.name       = updates.name
    if (updates.icon      !== undefined) body.icon       = updates.icon
    if (updates.pinned    !== undefined) body.pinned     = updates.pinned
    if (updates.archived  !== undefined) body.archived   = updates.archived
    if (updates.color     !== undefined) body.color      = updates.color
    if ((updates as any).sortOrder !== undefined) body.sort_order = (updates as any).sortOrder
    const res = await api.workspaces.update(id, body)
    set(s => ({ workspaces: s.workspaces.map(w => w.id === id ? mapWorkspace(res.data) : w) }))
  },

  deleteWorkspace: async (id, hard = false) => {
    await api.workspaces.delete(id, hard)
    if (hard) {
      set(s => ({ workspaces: s.workspaces.filter(w => w.id !== id) }))
    } else {
      set(s => ({ workspaces: s.workspaces.map(w => w.id === id ? { ...w, archived: true } : w) }))
    }
  },

  // ── Subjects ───────────────────────────────────────────────────────────────

  addSubject: async (data) => {
    const res = await api.subjects.create({
      workspace_id: data.workspaceId,
      name:         data.name,
      icon:         data.icon,
      description:  data.description,
      tags:         data.tags ?? [],
      sort_order:   get().subjects.filter(s => s.workspaceId === data.workspaceId).length,
    })
    set(s => ({ subjects: [...s.subjects, mapSubject(res.data)] }))
  },

  updateSubject: async (id, updates) => {
    const body: any = {}
    if (updates.name        !== undefined) body.name        = updates.name
    if (updates.icon        !== undefined) body.icon        = updates.icon
    if (updates.description !== undefined) body.description = updates.description
    if (updates.pinned      !== undefined) body.pinned      = updates.pinned
    if (updates.archived    !== undefined) body.archived    = updates.archived
    if (updates.tags        !== undefined) body.tags        = updates.tags
    if (updates.color       !== undefined) body.color       = updates.color
    if ((updates as any).sortOrder !== undefined) body.sort_order = (updates as any).sortOrder
    if (!Object.keys(body).length) {
      // Optimistic local update only (e.g. sort_order from DnD before backend call)
      set(s => ({ subjects: s.subjects.map(sub => sub.id === id ? { ...sub, ...updates } : sub) }))
      return
    }
    try {
      const res = await api.subjects.update(id, body)
      set(s => ({ subjects: s.subjects.map(sub => sub.id === id ? mapSubject(res.data) : sub) }))
    } catch (e) {
      console.error('updateSubject failed:', e)
    }
  },

  deleteSubject: async (id, hard = false) => {
    await api.subjects.delete(id, hard)
    if (hard) {
      set(s => ({ subjects: s.subjects.filter(s => s.id !== id) }))
    } else {
      set(s => ({ subjects: s.subjects.map(s => s.id === id ? { ...s, archived: true } : s) }))
    }
  },

  // ── Topics ─────────────────────────────────────────────────────────────────

  // Tracks "subjectId::parentId::lowercased name" combos currently being
  // created, so a flurry of clicks (e.g. user mashing "Create" because the
  // first click looked unresponsive) can't slip multiple in-flight requests
  // past the duplicate check before any of them have resolved yet.
  addTopic: async (data) => {
    const parentKey = data.parentId ?? 'root'
    const normalizedName = data.name.trim().toLowerCase()
    const dedupeKey = `${data.subjectId}::${parentKey}::${normalizedName}`

    // Same-named topic already exists (sibling, not archived) → block.
    const existsAlready = get().topics.some(t =>
      t.subjectId === data.subjectId &&
      (t.parentId ?? 'root') === parentKey &&
      !t.archived &&
      t.name.trim().toLowerCase() === normalizedName
    )
    if (existsAlready || topicCreatesInFlight.has(dedupeKey)) {
      return null
    }

    topicCreatesInFlight.add(dedupeKey)
    try {
      const res = await api.topics.create({
        subject_id: data.subjectId,
        parent_id:  data.parentId ?? null,
        name:       data.name.trim(),
        tags:       data.tags ?? [],
        sort_order: get().topics.filter(t => t.subjectId === data.subjectId).length,
      })
      const created = mapTopic(res.data)
      set(s => ({ topics: [...s.topics, created] }))
      return created
    } finally {
      topicCreatesInFlight.delete(dedupeKey)
    }
  },

  updateTopic: async (id, updates) => {
    const body: any = {}
    if (updates.name     !== undefined) body.name     = updates.name
    if (updates.content  !== undefined) body.content  = updates.content
    if (updates.pinned   !== undefined) body.pinned   = updates.pinned
    if (updates.archived !== undefined) body.archived = updates.archived
    if (updates.tags     !== undefined) body.tags     = updates.tags
    if (!Object.keys(body).length) return
    try {
      const res = await api.topics.update(id, body)
      set(s => ({
        topics: s.topics.map(t => t.id === id ? { ...mapTopic(res.data), children: t.children } : t)
      }))
    } catch (e) {
      console.error('updateTopic failed:', e)
      // Optimistic update on failure so UI stays responsive
      set(s => ({
        topics: s.topics.map(t => t.id === id ? { ...t, ...updates } : t)
      }))
    }
  },

  deleteTopic: async (id, hard = false) => {
    await api.topics.delete(id, hard)
    if (hard) {
      set(s => ({ topics: s.topics.filter(t => t.id !== id) }))
    } else {
      set(s => ({ topics: s.topics.map(t => t.id === id ? { ...t, archived: true } : t) }))
    }
  },

  // ── Helpers ────────────────────────────────────────────────────────────────

  getSubjectsForWorkspace: (wsId) =>
    get().subjects.filter(s => s.workspaceId === wsId && !s.archived),

  getTopicsForSubject: (subId) =>
    get().topics.filter(t => t.subjectId === subId),

  getRootTopics: (subId) =>
    get().topics.filter(t => t.subjectId === subId && !t.parentId),
}))