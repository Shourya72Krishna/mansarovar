import { useState, useEffect } from 'react'
import { appConfig } from '@/config/appConfig'
import logoImg from '@/assets/logo.png'
import { api } from '@/services/api'
import { Clock, Hash, FileText, Edit3, User, Bell, HardDrive, CheckCircle, AlertCircle, Shield, ScrollText, BarChart3 } from 'lucide-react'
import { useStore } from '@/store'
import { formatDistanceToNow, format } from 'date-fns'
import { motion } from 'framer-motion'

// ─── Recent Page ──────────────────────────────────────────────────────────────

export function RecentPage() {
  const { recentActivity, topics, setActiveTopic, setActiveSubject, setActivePage } = useStore()

  const grouped = recentActivity.reduce((acc, a) => {
    const date = format(new Date(a.timestamp), 'yyyy-MM-dd')
    if (!acc[date]) acc[date] = []
    acc[date].push(a)
    return acc
  }, {} as Record<string, typeof recentActivity>)

  const handleClick = (a: any) => {
    if (a.resourceType !== 'topic') return
    const topic = useStore.getState().topics.find(t => t.id === a.resourceId)
    if (topic) setActiveSubject(topic.subjectId)
    setActiveTopic(a.resourceId)
    setActivePage('topic')
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-cinzel text-2xl font-semibold mb-1" style={{ color: '#fde68a' }}>Recent</h1>
        <p className="text-sm" style={{ color: 'rgba(232,230,240,0.4)' }}>Your recently accessed knowledge</p>
      </motion.div>

      {recentActivity.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-24 text-center">
          <Clock size={32} className="mb-4" style={{ color: 'rgba(232,230,240,0.15)' }} />
          <p className="font-cinzel text-lg mb-1" style={{ color: 'rgba(232,230,240,0.4)' }}>No recent activity</p>
          <p className="text-sm" style={{ color: 'rgba(232,230,240,0.25)' }}>Topics and files you open will appear here</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="mb-6">
            <h3 className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'rgba(232,230,240,0.3)' }}>
              {format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d')}
            </h3>
            <div className="space-y-2">
              {items.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card-hover p-4 cursor-pointer flex items-center gap-4"
                  onClick={() => handleClick(a)}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: a.type === 'topic_edit' ? 'rgba(124,58,237,0.15)' : a.resourceType === 'pdf' ? 'rgba(217,119,6,0.15)' : 'rgba(37,99,235,0.15)' }}
                  >
                    {a.type === 'topic_edit'
                      ? <Edit3 size={14} style={{ color: '#7c3aed' }} />
                      : a.resourceType === 'pdf'
                        ? <FileText size={14} style={{ color: '#d97706' }} />
                        : <Hash size={14} style={{ color: '#2563eb' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'rgba(232,230,240,0.85)' }}>{a.resourceName}</p>
                    <p className="text-xs" style={{ color: 'rgba(232,230,240,0.4)' }}>
                      {a.workspaceName} › {a.subjectName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs shrink-0" style={{ color: 'rgba(232,230,240,0.3)' }}>
                    <Clock size={11} />
                    {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Archive Page ─────────────────────────────────────────────────────────────

export function ArchivePage() {
  const { workspaces, subjects, updateWorkspace, updateSubject } = useStore()
  const archivedWs  = workspaces.filter(w => w.archived)
  const archivedSub = subjects.filter(s => s.archived)

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-cinzel text-2xl font-semibold mb-1" style={{ color: '#fde68a' }}>Archive</h1>
        <p className="text-sm" style={{ color: 'rgba(232,230,240,0.4)' }}>Archived workspaces and subjects</p>
      </motion.div>

      {archivedWs.length === 0 && archivedSub.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-24 text-center">
          <span className="text-5xl mb-4">📦</span>
          <p className="font-cinzel text-lg" style={{ color: 'rgba(232,230,240,0.4)' }}>Archive is empty</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(232,230,240,0.25)' }}>Archived items will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {archivedWs.map(w => (
            <div key={w.id} className="glass-card p-4 flex items-center gap-3">
              <span className="text-xl">{w.icon}</span>
              <div className="flex-1">
                <p className="text-sm" style={{ color: 'rgba(232,230,240,0.7)' }}>{w.name}</p>
                <p className="text-xs" style={{ color: 'rgba(232,230,240,0.35)' }}>Workspace</p>
              </div>
              <button
                onClick={() => updateWorkspace(w.id, { archived: false })}
                className="text-xs px-3 py-1.5 rounded-lg hover:bg-gold-400/10 transition-colors"
                style={{ color: 'rgba(251,191,36,0.7)', border: '1px solid rgba(251,191,36,0.2)' }}
              >Restore</button>
            </div>
          ))}
          {archivedSub.map(s => (
            <div key={s.id} className="glass-card p-4 flex items-center gap-3">
              <span className="text-xl">{s.icon}</span>
              <div className="flex-1">
                <p className="text-sm" style={{ color: 'rgba(232,230,240,0.7)' }}>{s.name}</p>
                <p className="text-xs" style={{ color: 'rgba(232,230,240,0.35)' }}>Subject</p>
              </div>
              <button
                onClick={() => updateSubject(s.id, { archived: false })}
                className="text-xs px-3 py-1.5 rounded-lg hover:bg-gold-400/10 transition-colors"
                style={{ color: 'rgba(251,191,36,0.7)', border: '1px solid rgba(251,191,36,0.2)' }}
              >Restore</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user, setUser } = useStore()

  const handleConnectDrive = () => {
    window.location.href = `${appConfig.apiUrl}/drive/connect`
  }

  const handleDisconnectDrive = async () => {
    try {
      await api.drive.disconnect()
      setUser({ ...user!, driveConnected: false, driveRootFolderId: undefined })
    } catch (e) {
      console.error('Failed to disconnect Drive:', e)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-cinzel text-2xl font-semibold mb-1" style={{ color: '#fde68a' }}>Settings</h1>
        <p className="text-sm" style={{ color: 'rgba(232,230,240,0.4)' }}>
          Manage your {appConfig.name} configuration
        </p>
      </motion.div>

      {/* Profile */}
      <div className="glass-card p-6 mb-4">
        <h2 className="font-cinzel text-sm font-medium mb-4 flex items-center gap-2" style={{ color: '#fde68a' }}>
          <User size={14} /> Profile
        </h2>
        {user ? (
          <div className="flex items-center gap-4">
            <img src={user.avatar} alt={user.name} className="w-14 h-14 rounded-full ring-2 ring-gold-400/30" />
            <div>
              <p className="font-medium" style={{ color: 'rgba(232,230,240,0.9)' }}>{user.name}</p>
              <p className="text-sm" style={{ color: 'rgba(232,230,240,0.5)' }}>{user.email}</p>
              <span className="tag-pill mt-1">{user.role}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'rgba(232,230,240,0.4)' }}>Not signed in</p>
        )}
      </div>

      {/* Google Drive */}
      <div className="glass-card p-6 mb-4">
        <h2 className="font-cinzel text-sm font-medium mb-4 flex items-center gap-2" style={{ color: '#fde68a' }}>
          <HardDrive size={14} /> Google Drive
        </h2>
        {user?.driveConnected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.15)' }}>
                <CheckCircle size={16} style={{ color: '#34d399' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: 'rgba(232,230,240,0.8)' }}>Connected</p>
                <p className="text-xs" style={{ color: 'rgba(232,230,240,0.4)' }}>
                  {appConfig.name}/ folder active in your Drive
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnectDrive}
              className="text-xs px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: 'rgba(232,230,240,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
            >Disconnect</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <AlertCircle size={16} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: 'rgba(232,230,240,0.8)' }}>Not Connected</p>
                <p className="text-xs" style={{ color: 'rgba(232,230,240,0.4)' }}>
                  Connect to store files in your Google Drive
                </p>
              </div>
            </div>
            <button onClick={handleConnectDrive} className="gold-btn text-sm px-4 py-2">
              Connect Drive
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="glass-card p-6 mb-4">
        <h2 className="font-cinzel text-sm font-medium mb-4 flex items-center gap-2" style={{ color: '#fde68a' }}>
          <Bell size={14} /> Notifications
        </h2>
        <div className="space-y-3">
          {['Autosave reminders', 'Study streak alerts', 'System updates'].map(item => (
            <div key={item} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'rgba(232,230,240,0.7)' }}>{item}</span>
              <div className="w-10 h-5 rounded-full relative cursor-pointer" style={{ background: 'rgba(251,191,36,0.8)' }}>
                <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Analytics Page ───────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const { workspaces, subjects, topics, pdfs, fetchPdfs, fetchSubjects } = useStore()

  // Subjects (and the topicCount/pdfCount aggregates they carry) only fill in
  // as you visit individual workspaces, so counts here would be wrong until
  // every workspace had been opened at least once. Fetch everything up front
  // instead, and compute totals from those aggregates rather than the
  // separate topics/pdfs arrays, which only ever fill in per-subject.
  useEffect(() => { fetchSubjects(); fetchPdfs() }, [])

  const activeSubjects = subjects.filter(s => !s.archived)
  const topicTotal = activeSubjects.reduce((sum, s) => sum + (s.topicCount || 0), 0)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-cinzel text-2xl font-semibold mb-1 flex items-center gap-2" style={{ color: '#fde68a' }}>
          <BarChart3 size={20} /> Analytics
        </h1>
        <p className="text-sm" style={{ color: 'rgba(232,230,240,0.4)' }}>Your knowledge stats at a glance</p>
      </motion.div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Workspaces', value: workspaces.filter(w => !w.archived).length, color: '#7c3aed' },
          { label: 'Subjects',   value: activeSubjects.length,                      color: '#2563eb' },
          { label: 'Topics',     value: topicTotal,                                 color: '#0d9488' },
          { label: 'PDFs',       value: pdfs.length,                                color: '#d97706' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <div className="text-2xl font-mono font-semibold mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: 'rgba(232,230,240,0.45)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h2 className="font-cinzel text-sm font-medium mb-4" style={{ color: '#fde68a' }}>Workspace Breakdown</h2>
        {workspaces.filter(w => !w.archived).length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'rgba(232,230,240,0.3)' }}>No workspaces yet</p>
        ) : (
          <div className="space-y-3">
            {workspaces.filter(w => !w.archived).map(ws => {
              const wsSubs = subjects.filter(s => s.workspaceId === ws.id && !s.archived)
              const wsTopicCount = wsSubs.reduce((sum, s) => sum + (s.topicCount || 0), 0)
              return (
                <div key={ws.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-lg">{ws.icon}</span>
                  <span className="flex-1 text-sm" style={{ color: 'rgba(232,230,240,0.7)' }}>{ws.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(37,99,235,0.1)', color: '#60a5fa' }}>{wsSubs.length} subjects</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(13,148,136,0.1)', color: '#34d399' }}>{wsTopicCount} topics</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Audit Logs Page ──────────────────────────────────────────────────────────

export function AuditPage() {
  const { auditLogs } = useStore()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-cinzel text-2xl font-semibold mb-1 flex items-center gap-2" style={{ color: '#fde68a' }}>
          <ScrollText size={20} /> Audit Logs
        </h1>
        <p className="text-sm" style={{ color: 'rgba(232,230,240,0.4)' }}>All actions performed in your account</p>
      </motion.div>

      <div className="glass-card p-6">
        {auditLogs.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'rgba(232,230,240,0.3)' }}>No audit logs yet</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.map(log => (
              <div key={log.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="text-xs px-2 py-0.5 rounded font-mono shrink-0" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                  {log.action}
                </span>
                <span className="flex-1 text-sm" style={{ color: 'rgba(232,230,240,0.65)' }}>{log.details}</span>
                <span className="text-xs shrink-0" style={{ color: 'rgba(232,230,240,0.3)' }}>
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Admin Panel Page ─────────────────────────────────────────────────────────

interface AdminUser {
  id: string
  name: string
  email: string
  avatar: string
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  status: 'active' | 'suspended'
  last_login: string | null
  created_at: string
}

export function AdminPage() {
  const { user } = useStore()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actingOnId, setActingOnId] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    totalUsers: number; totalWorkspaces: number; totalSubjects: number
    totalTopics: number; totalPdfs: number; activeToday: number
  } | null>(null)

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const loadUsers = async (targetPage = page) => {
    setUsersLoading(true)
    setUsersError('')
    try {
      const res = await api.admin.users(targetPage, 20)
      setUsers(res.data)
      setTotalPages(res.pagination?.totalPages ?? 1)
      setPage(targetPage)
    } catch (e: any) {
      setUsersError(e?.message ?? 'Could not load users.')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    loadUsers(1)
    api.admin.analytics().then(res => setStats(res.data)).catch(() => {})
  }, [])

  const handleSuspendToggle = async (u: AdminUser) => {
    setActingOnId(u.id)
    try {
      if (u.status === 'suspended') await api.admin.restore(u.id)
      else await api.admin.suspend(u.id)
      await loadUsers(page)
    } catch (e) {
      console.error('Suspend/restore failed:', e)
    } finally {
      setActingOnId(null)
    }
  }

  const handleRoleChange = async (u: AdminUser, role: AdminUser['role']) => {
    if (role === u.role) return
    setActingOnId(u.id)
    try {
      await api.admin.changeRole(u.id, role)
      await loadUsers(page)
    } catch (e) {
      console.error('Role change failed:', e)
    } finally {
      setActingOnId(null)
    }
  }

  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-full">
        <p style={{ color: 'rgba(232,230,240,0.4)' }}>Access denied</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-cinzel text-2xl font-semibold mb-1 flex items-center gap-2" style={{ color: '#fde68a' }}>
          <Shield size={20} /> Admin Panel
        </h1>
        <p className="text-sm" style={{ color: 'rgba(232,230,240,0.4)' }}>Manage users and system settings</p>
      </motion.div>

      <div className="glass-card p-6 mb-4">
        <h2 className="font-cinzel text-sm font-medium mb-4" style={{ color: '#fde68a' }}>Your Role</h2>
        <div className="flex items-center gap-3">
          <img src={user?.avatar} alt={user?.name} className="w-10 h-10 rounded-full" />
          <div>
            <p className="text-sm font-medium" style={{ color: 'rgba(232,230,240,0.85)' }}>{user?.name}</p>
            <span className="tag-pill">{user?.role}</span>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Total Users',  value: stats.totalUsers },
            { label: 'Active Today', value: stats.activeToday },
            { label: 'Workspaces',   value: stats.totalWorkspaces },
          ].map(s => (
            <div key={s.label} className="glass-card p-4">
              <div className="text-xl font-mono font-semibold mb-1" style={{ color: '#fbbf24' }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'rgba(232,230,240,0.45)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-cinzel text-sm font-medium" style={{ color: '#fde68a' }}>User Management</h2>
          {!isSuperAdmin && (
            <span className="text-xs" style={{ color: 'rgba(232,230,240,0.3)' }}>Role changes require Super Admin</span>
          )}
        </div>

        {usersError && (
          <p className="text-sm text-red-400 mb-4">{usersError}</p>
        )}

        {usersLoading ? (
          <p className="text-sm text-center py-12" style={{ color: 'rgba(232,230,240,0.3)' }}>Loading users…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'rgba(232,230,240,0.3)' }}>No users found</p>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'rgba(232,230,240,0.85)' }}>{u.name}</p>
                  <p className="text-xs truncate" style={{ color: 'rgba(232,230,240,0.4)' }}>{u.email}</p>
                </div>

                <span
                  className="text-xs px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: u.status === 'suspended' ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)',
                    color: u.status === 'suspended' ? '#f87171' : '#34d399',
                  }}
                >
                  {u.status}
                </span>

                {isSuperAdmin ? (
                  <select
                    value={u.role}
                    onChange={e => handleRoleChange(u, e.target.value as AdminUser['role'])}
                    disabled={actingOnId === u.id || u.id === user?.id}
                    className="text-xs px-2 py-1 rounded-lg shrink-0 disabled:opacity-40"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(232,230,240,0.7)' }}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                ) : (
                  <span className="tag-pill shrink-0">{u.role}</span>
                )}

                <button
                  onClick={() => handleSuspendToggle(u)}
                  disabled={actingOnId === u.id || u.id === user?.id}
                  className="text-xs px-3 py-1.5 rounded-lg shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: u.status === 'suspended' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                    color: u.status === 'suspended' ? '#34d399' : '#f87171',
                    border: `1px solid ${u.status === 'suspended' ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
                  }}
                >
                  {actingOnId === u.id ? '…' : u.status === 'suspended' ? 'Restore' : 'Suspend'}
                </button>

                <span className="text-xs shrink-0 w-20 text-right" style={{ color: 'rgba(232,230,240,0.3)' }}>
                  {u.last_login ? formatDistanceToNow(new Date(u.last_login), { addSuffix: true }) : 'Never'}
                </span>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={() => loadUsers(page - 1)}
              disabled={page <= 1 || usersLoading}
              className="text-xs px-3 py-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ color: 'rgba(232,230,240,0.6)' }}
            >
              Previous
            </button>
            <span className="text-xs" style={{ color: 'rgba(232,230,240,0.4)' }}>Page {page} of {totalPages}</span>
            <button
              onClick={() => loadUsers(page + 1)}
              disabled={page >= totalPages || usersLoading}
              className="text-xs px-3 py-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ color: 'rgba(232,230,240,0.6)' }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Login Page ───────────────────────────────────────────────────────────────

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative z-10">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <svg viewBox="0 0 600 600" width="600" height="600">
          <circle cx="300" cy="300" r="200" fill="none" stroke="#3b82f6" strokeWidth="1" />
          <circle cx="300" cy="300" r="150" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
          <circle cx="300" cy="300" r="100" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
          {[0, 60, 120, 180, 240, 300].map(deg => (
            <circle
              key={deg}
              cx={300 + 150 * Math.cos((deg * Math.PI) / 180)}
              cy={300 + 150 * Math.sin((deg * Math.PI) / 180)}
              r="150" fill="none" stroke="#3b82f6" strokeWidth="0.5"
            />
          ))}
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card p-10 w-full max-w-md text-center"
        style={{ border: '1px solid rgba(99,130,246,0.2)', boxShadow: '0 0 60px rgba(59,130,246,0.08)' }}
      >
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-2xl overflow-hidden mb-4 animate-float"
            style={{ boxShadow: '0 0 40px rgba(59,130,246,0.35), 0 0 80px rgba(99,102,241,0.15)', border: '1px solid rgba(99,130,246,0.25)' }}
          >
            <img src={logoImg} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 className="font-cinzel text-4xl font-bold tracking-wider mb-2" style={{
            background: 'linear-gradient(135deg, #93c5fd 0%, #818cf8 40%, #c4b5fd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.5,
            paddingBottom: '0.15em',
            display: 'block',
          }}>
            {appConfig.name}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(232,230,240,0.45)', fontFamily: 'Cinzel, serif', letterSpacing: '0.15em' }}>
            {appConfig.tagline.toUpperCase()}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-8 px-4">
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,230,240,0.5)' }}>
            मानसरोवर — The sacred lake of the mind.<br />
            Your knowledge, preserved eternally.
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onLogin}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl font-medium text-sm transition-all duration-300"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(232,230,240,0.85)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,130,246,0.4)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4" />
            <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.02c-.72.48-1.63.77-2.7.77a4.78 4.78 0 0 1-4.48-3.29H1.83v2.09A8 8 0 0 0 8.98 17z" fill="#34A853" />
            <path d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.39H1.83a8 8 0 0 0 0 7.22l2.67-2.09z" fill="#FBBC05" />
            <path d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.39L4.5 7.48A4.77 4.77 0 0 1 8.98 4.18z" fill="#EA4335" />
          </svg>
          Continue with Google
        </motion.button>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="mt-6 text-xs" style={{ color: 'rgba(232,230,240,0.25)' }}>
          By continuing, you agree to connect your Google Drive<br />
          for personal file storage within {appConfig.name}.
        </motion.p>
      </motion.div>
    </div>
  )
}
