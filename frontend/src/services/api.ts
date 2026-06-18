import { appConfig } from '@/config/appConfig'

const BASE = appConfig.apiUrl

// Token is stored in localStorage after Google OAuth redirect
const getToken = (): string | null => localStorage.getItem('__akshar_token')

interface ApiResponse<T> {
  success: boolean
  message: string
  data:    T
  pagination?: {
    total:      number
    page:       number
    limit:      number
    totalPages: number
    hasNext:    boolean
    hasPrev:    boolean
  }
}

async function request<T>(
  method: string,
  path:   string,
  body?:  unknown,
  isFormData = false
): Promise<ApiResponse<T>> {
  const token = getToken()

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: isFormData
      ? body as FormData
      : body !== undefined ? JSON.stringify(body) : undefined,
  })

  const json = await res.json()

  if (!res.ok) {
    throw new Error(json.message ?? `HTTP ${res.status}`)
  }

  return json
}

export const api = {
  get:    <T>(path: string)                         => request<T>('GET',    path),
  post:   <T>(path: string, body?: unknown)         => request<T>('POST',   path, body),
  patch:  <T>(path: string, body?: unknown)         => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                         => request<T>('DELETE', path),
  upload: <T>(path: string, formData: FormData)     => request<T>('POST',   path, formData, true),

  // ── Auth ────────────────────────────────────────────────────
  auth: {
    // Called on app boot — fetches APP_NAME etc from backend .env
    getConfig: () => api.get<{ appName: string; appTagline: string; logoLetter: string }>('/auth/config'),
    me:        () => api.get<any>('/auth/me'),
    logout:    () => api.post('/auth/logout'),
  },

  // ── Workspaces ──────────────────────────────────────────────
  workspaces: {
    list:   (archived = false) => api.get<any[]>(`/workspaces?archived=${archived}`),
    create: (body: any)        => api.post<any>('/workspaces', body),
    update: (id: string, body: any) => api.patch<any>(`/workspaces/${id}`, body),
    delete: (id: string, hard = false) => api.delete<any>(`/workspaces/${id}?hard=${hard}`),
    reorder: (items: { id: string; sort_order: number }[]) =>
      api.patch<any>('/workspaces/batch/reorder', { items }),
  },

  // ── Subjects ────────────────────────────────────────────────
  subjects: {
    list:   (workspaceId?: string, archived = false) =>
      api.get<any[]>(`/subjects?${workspaceId ? `workspace_id=${workspaceId}&` : ''}archived=${archived}`),
    create: (body: any)        => api.post<any>('/subjects', body),
    update: (id: string, body: any) => api.patch<any>(`/subjects/${id}`, body),
    delete: (id: string, hard = false) => api.delete<any>(`/subjects/${id}?hard=${hard}`),
  },

  // ── Topics ──────────────────────────────────────────────────
  topics: {
    list:    (subjectId: string, flat = false) =>
      api.get<any[]>(`/topics?subject_id=${subjectId}&flat=${flat}`),
    get:     (id: string) => api.get<any>(`/topics/${id}`),
    create:  (body: any)  => api.post<any>('/topics', body),
    update:  (id: string, body: any) => api.patch<any>(`/topics/${id}`, body),
    delete:  (id: string, hard = false) => api.delete<any>(`/topics/${id}?hard=${hard}`),
    versions: (id: string) => api.get<any[]>(`/topics/${id}/versions`),
    restore:  (id: string, versionId: string) =>
      api.post<any>(`/topics/${id}/versions/${versionId}/restore`),
  },

  // ── PDFs ────────────────────────────────────────────────────
  pdfs: {
    list:           (subjectId?: string) =>
      api.get<any[]>(`/pdfs${subjectId ? `?subject_id=${subjectId}` : ''}`),
    upload:         (formData: FormData) => api.upload<any>('/pdfs/upload', formData),
    updateProgress: (id: string, progress: number) =>
      api.patch<any>(`/pdfs/${id}/progress`, { progress }),
    addBookmark:    (id: string, page: number, label: string) =>
      api.post<any>(`/pdfs/${id}/bookmarks`, { page, label }),
    delete:         (id: string) => api.delete<any>(`/pdfs/${id}`),
  },

  // ── Media ───────────────────────────────────────────────────
  media: {
    list:   (subjectId?: string, type?: string) =>
      api.get<any[]>(`/media?${subjectId ? `subject_id=${subjectId}` : ''}${type ? `&type=${type}` : ''}`),
    upload: (formData: FormData) => api.upload<any>('/media/upload', formData),
    delete: (id: string) => api.delete<any>(`/media/${id}`),
  },

  // ── Search ──────────────────────────────────────────────────
  search: {
    query: (q: string, type = 'all') =>
      api.get<any[]>(`/search?q=${encodeURIComponent(q)}&type=${type}`),
  },

  // ── Tags ────────────────────────────────────────────────────
  tags: {
    list:   () => api.get<any[]>('/tags'),
    save:   (name: string, color?: string) => api.post<any>('/tags', { name, color }),
    delete: (id: string) => api.delete<any>(`/tags/${id}`),
  },

  // ── Activity ────────────────────────────────────────────────
  activity: {
    list:    (limit = 20)  => api.get<any[]>(`/activity?limit=${limit}`),
    heatmap: () => api.get<any[]>('/activity/heatmap'),
  },

  // ── Drive ───────────────────────────────────────────────────
  drive: {
    status:     () => api.get<any>('/drive/status'),
    disconnect: () => api.post('/drive/disconnect'),
  },

  // ── Admin ───────────────────────────────────────────────────
  admin: {
    users:      (page = 1, limit = 20) => api.get<any>(`/admin/users?page=${page}&limit=${limit}`),
    suspend:    (id: string) => api.patch<any>(`/admin/users/${id}/suspend`),
    restore:    (id: string) => api.patch<any>(`/admin/users/${id}/restore`),
    changeRole: (id: string, role: 'USER' | 'ADMIN' | 'SUPER_ADMIN') =>
      api.patch<any>(`/admin/users/${id}/role?role=${role}`),
    analytics:  () => api.get<any>('/admin/analytics'),
    auditLogs:  (page = 1)  => api.get<any>(`/admin/audit-logs?page=${page}`),
  },
}
