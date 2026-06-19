import { useState, useEffect } from 'react'
import {
  BookOpen, Search, Clock, Archive,
  ChevronRight, ChevronDown, Plus, Settings, Shield,
  PanelLeftClose, PanelLeftOpen, Star, FileText,
  Hash, BarChart3, ScrollText, Edit2, Check, X, ArrowLeft, Home
} from 'lucide-react'
import { useStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '@/components/shared/Modal'
import { appConfig } from '@/config/appConfig'
import logoImg from '@/assets/logo.png'

const ICONS: Record<string, string> = {
  '🎓': '🎓', '📚': '📚', '🎯': '🎯', '🔬': '🔬',
  '🗄️': '🗄️', '🤖': '🤖', '💬': '💬', '🌲': '🌲', '🏗️': '🏗️',
}

export default function Sidebar() {
  const {
    user, workspaces, subjects, activePage, activeWorkspaceId, activeSubjectId,
    sidebarCollapsed, setSidebarCollapsed, setActivePage,
    setActiveWorkspace, setActiveSubject, addWorkspace, addSubject, updateWorkspace,
    fetchSubjects,
  } = useStore()

  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set())
  const [showNewWsModal, setShowNewWsModal] = useState(false)
  const [renamingWsId, setRenamingWsId] = useState<string | null>(null)
  const [pageHistory, setPageHistory] = useState<string[]>([])

  useEffect(() => {
    setPageHistory(prev => {
      if (prev[prev.length - 1] === activePage) return prev
      return [...prev.slice(-9), activePage]
    })
  }, [activePage])

  const handleBack = () => {
    if (pageHistory.length >= 2) {
      const prev = pageHistory[pageHistory.length - 2]
      setPageHistory(h => h.slice(0, -1))
      setActivePage(prev)
    }
  }

  const canGoBack = pageHistory.length >= 2
  const [renameWsVal, setRenameWsVal] = useState('')

  const handleRenameWs = async (id: string) => {
    if (!renameWsVal.trim()) { setRenamingWsId(null); return }
    await updateWorkspace(id, { name: renameWsVal.trim() })
    setRenamingWsId(null)
  }
  const [showNewSubModal, setShowNewSubModal] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [newWsIcon, setNewWsIcon] = useState('📚')
  const [newSubName, setNewSubName] = useState('')
  const [newSubIcon, setNewSubIcon] = useState('📖')

  // Fetch ALL subjects on mount so counts are correct from the start
  useEffect(() => {
    if (workspaces.length > 0) {
      fetchSubjects()  // fetches all subjects, no workspaceId filter
    }
  }, [workspaces.length])

  useEffect(() => {
    const handler = () => setShowNewWsModal(true)
    window.addEventListener('akshar:open-new-workspace', handler)
    return () => window.removeEventListener('akshar:open-new-workspace', handler)
  }, [])

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  const toggleWs = (id: string) => {
    setExpandedWs(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const navItems = [
    { id: 'search',    icon: Search,          label: 'Search'    },
    { id: 'recent',    icon: Clock,           label: 'Recent'    },
    { id: 'archive',   icon: Archive,         label: 'Archive'   },
  ]

  const handleCreateWs = async () => {
    if (!newWsName.trim()) return
    await addWorkspace({ name: newWsName.trim(), icon: newWsIcon, color: '#7c3aed' })
    setNewWsName('')
    setShowNewWsModal(false)
  }

  const handleCreateSub = async () => {
    if (!newSubName.trim() || !activeWorkspaceId) return
    await addSubject({ workspaceId: activeWorkspaceId, name: newSubName.trim(), icon: newSubIcon })
    setNewSubName('')
    setShowNewSubModal(false)
  }

  if (sidebarCollapsed) {
    return (
      <div className="flex flex-col items-center py-4 gap-3 w-14 shrink-0"
        style={{ background: 'rgba(10,10,18,0.8)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => setSidebarCollapsed(false)} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors mb-2">
          <PanelLeftOpen size={18} />
        </button>
        <button onClick={() => setActivePage('dashboard')} title="Home"
          className={`p-2 rounded-lg transition-colors ${activePage === 'dashboard' ? 'text-blue-300 bg-blue-400/10' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
          <Home size={18} />
        </button>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setActivePage(item.id)} title={item.label}
            className={`p-2 rounded-lg transition-colors ${activePage === item.id ? 'text-gold-400 bg-gold-400/10' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
            <item.icon size={18} />
          </button>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col h-full w-64 shrink-0 thin-scroll overflow-y-auto"
        style={{ background: 'rgba(8,8,15,0.9)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden" style={{ boxShadow: '0 0 12px rgba(59,130,246,0.3)', border: '1px solid rgba(99,130,246,0.2)' }}>
              <img src={logoImg} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span className="font-cinzel font-semibold text-lg tracking-wide" style={{
              background: 'linear-gradient(135deg, #93c5fd 0%, #818cf8 60%, #c4b5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.5,
              paddingBottom: '0.1em',
            }}>{appConfig.name}</span>
          </div>
          <button onClick={() => setSidebarCollapsed(true)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors">
            <PanelLeftClose size={16} />
          </button>
        </div>

        {/* Home + Back */}
        <div className="px-3 flex items-center gap-1.5 mb-2">
          <button
            onClick={() => setActivePage('dashboard')}
            className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: activePage === 'dashboard' ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
              border: activePage === 'dashboard' ? '1px solid rgba(147,197,253,0.2)' : '1px solid rgba(255,255,255,0.06)',
              color: activePage === 'dashboard' ? '#93c5fd' : 'rgba(232,230,240,0.5)',
            }}
          >
            <Home size={13} /> Home
          </button>
        </div>

        {/* Nav items */}
        <div className="px-3 space-y-0.5 mb-4">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActivePage(item.id)}
              className={`sidebar-item w-full text-left ${activePage === item.id ? 'active' : ''}`}>
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 12px 12px' }} />

        {/* Workspaces */}
        <div className="px-3 flex-1">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'rgba(232,230,240,0.3)' }}>Workspaces</span>
            <button onClick={() => setShowNewWsModal(true)}
              className="flex items-center justify-center w-6 h-6 rounded transition-all hover:scale-110"
              style={{ background: 'rgba(147,197,253,0.15)', border: '1px solid rgba(147,197,253,0.3)', color: '#93c5fd' }}
              title="New Workspace">
              <Plus size={12} />
            </button>
          </div>

          <div className="space-y-0.5">
            {workspaces.filter(w => !w.archived).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map(ws => {
              const wsSubjects = subjects.filter(s => s.workspaceId === ws.id && !s.archived)
              const isExpanded = expandedWs.has(ws.id)
              const isActive = activeWorkspaceId === ws.id

              return (
                <div key={ws.id}>
                  <div
                    onClick={() => { toggleWs(ws.id); setActiveWorkspace(ws.id); setActivePage('workspace') }}
                    className={`sidebar-item w-full cursor-pointer group ${isActive ? 'active' : ''}`}
                  >
                    <span className="text-base leading-none shrink-0">{ws.icon || '📁'}</span>
                    {renamingWsId === ws.id ? (
                      <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                        <input
                          value={renameWsVal}
                          onChange={e => setRenameWsVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRenameWs(ws.id); if (e.key === 'Escape') setRenamingWsId(null) }}
                          className="text-sm bg-transparent border-b outline-none flex-1 min-w-0"
                          style={{ color: 'rgba(232,230,240,0.9)', borderColor: 'rgba(147,197,253,0.4)' }}
                          autoFocus
                        />
                        <button onClick={e => { e.stopPropagation(); handleRenameWs(ws.id) }} className="text-emerald-400 hover:text-emerald-300 shrink-0"><Check size={11} /></button>
                        <button onClick={e => { e.stopPropagation(); setRenamingWsId(null) }} className="text-red-400 hover:text-red-300 shrink-0"><X size={11} /></button>
                      </div>
                    ) : (
                      <span className="flex-1 text-sm">{ws.name}</span>
                    )}
                    {ws.pinned && <Star size={11} className="text-gold-500/60 shrink-0" />}
                    {renamingWsId !== ws.id && (
                      <button
                        onClick={e => { e.stopPropagation(); setRenamingWsId(ws.id); setRenameWsVal(ws.name) }}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 shrink-0 transition-opacity"
                        style={{ color: 'rgba(232,230,240,0.5)' }}
                        title="Rename workspace"
                      >
                        <Edit2 size={10} />
                      </button>
                    )}
                    <span className="text-xs shrink-0" style={{ color: 'rgba(232,230,240,0.3)' }}>{wsSubjects.length}</span>
                    {isExpanded ? <ChevronDown size={13} className="shrink-0" /> : <ChevronRight size={13} className="shrink-0" />}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 mt-0.5 space-y-0.5 pb-1">
                          {wsSubjects.map(sub => (
                            <div
                              key={sub.id}
                              onClick={() => { setActiveSubject(sub.id); setActivePage('subject') }}
                              className={`topic-item ${activeSubjectId === sub.id ? 'active' : ''}`}
                            >
                              <span className="text-xs">{sub.icon || '📖'}</span>
                              <span className="flex-1 truncate">{sub.name}</span>
                              {sub.pinned && <Star size={10} className="text-gold-500/50 shrink-0" />}
                              <span className="text-xs" style={{ color: 'rgba(232,230,240,0.25)' }}>{sub.topicCount}</span>
                            </div>
                          ))}
                          <div
                            onClick={() => { setActiveWorkspace(ws.id); setShowNewSubModal(true) }}
                            className="topic-item"
                            style={{ color: '#93c5fd', opacity: 0.8 }}
                          >
                            <Plus size={12} />
                            <span className="text-xs">Add Subject</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '12px' }} />
        <div className="px-3 pb-4 space-y-0.5">
          {isAdmin && (
            <>
              <button onClick={() => setActivePage('analytics')}
                className={`sidebar-item w-full text-left ${activePage === 'analytics' ? 'active' : ''}`}>
                <BarChart3 size={16} />
                <span>Analytics</span>
              </button>
              <button onClick={() => setActivePage('audit')}
                className={`sidebar-item w-full text-left ${activePage === 'audit' ? 'active' : ''}`}>
                <ScrollText size={16} />
                <span>Audit Logs</span>
              </button>
            </>
          )}
          {user?.role === 'SUPER_ADMIN' && (
            <button onClick={() => setActivePage('admin')}
              className={`sidebar-item w-full text-left ${activePage === 'admin' ? 'active' : ''}`}>
              <Shield size={16} />
              <span>Admin Panel</span>
            </button>
          )}
          <button onClick={() => setActivePage('settings')}
            className={`sidebar-item w-full text-left ${activePage === 'settings' ? 'active' : ''}`}>
            <Settings size={16} />
            <span>Settings</span>
          </button>

          {/* User */}
          <div className="flex items-center gap-3 px-3 py-2 mt-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
              : <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg,#fbbf24,#d97706)', color: '#050508' }}>
                  {user?.name?.[0] ?? '?'}
                </div>
            }
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'rgba(232,230,240,0.8)' }}>{user?.name ?? 'Guest'}</div>
              <div className="text-xs truncate" style={{ color: 'rgba(232,230,240,0.35)' }}>{user?.role ?? ''}</div>
            </div>
            <button
              onClick={() => (window as any).__aksharLogout?.()}
              title="Sign out"
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'rgba(232,230,240,0.35)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* New Workspace Modal */}
      <Modal open={showNewWsModal} onClose={() => setShowNewWsModal(false)} title="New Workspace">
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(232,230,240,0.6)' }}>Icon</label>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(ICONS).map(icon => (
                <button key={icon} onClick={() => setNewWsIcon(icon)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${newWsIcon === icon ? 'bg-gold-500/20 ring-1 ring-gold-400' : 'hover:bg-white/5'}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(232,230,240,0.6)' }}>Name</label>
            <input value={newWsName} onChange={e => setNewWsName(e.target.value)}
              className="cosmic-input" placeholder="e.g. College, Self Study..."
              onKeyDown={e => e.key === 'Enter' && handleCreateWs()} autoFocus />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setShowNewWsModal(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'rgba(232,230,240,0.5)' }}>Cancel</button>
            <button onClick={handleCreateWs} className="gold-btn text-sm px-5 py-2">Create</button>
          </div>
        </div>
      </Modal>

      {/* New Subject Modal */}
      <Modal open={showNewSubModal} onClose={() => setShowNewSubModal(false)} title="New Subject">
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(232,230,240,0.6)' }}>Icon</label>
            <div className="flex gap-2 flex-wrap">
              {['📖','🧠','🔬','💻','🌐','📊','🧪','⚡','🎨','🌿'].map(icon => (
                <button key={icon} onClick={() => setNewSubIcon(icon)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${newSubIcon === icon ? 'bg-gold-500/20 ring-1 ring-gold-400' : 'hover:bg-white/5'}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(232,230,240,0.6)' }}>Name</label>
            <input value={newSubName} onChange={e => setNewSubName(e.target.value)}
              className="cosmic-input" placeholder="e.g. DBMS, Machine Learning..."
              onKeyDown={e => e.key === 'Enter' && handleCreateSub()} autoFocus />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setShowNewSubModal(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'rgba(232,230,240,0.5)' }}>Cancel</button>
            <button onClick={handleCreateSub} className="gold-btn text-sm px-5 py-2">Create</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
