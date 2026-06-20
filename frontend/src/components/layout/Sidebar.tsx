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

  const [showNewWsModal, setShowNewWsModal] = useState(false)
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
  const [newWsName, setNewWsName] = useState('')
  const [newWsIcon, setNewWsIcon] = useState('📚')

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

        <div className="flex-1" />

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

          {/* Devanagari footer line */}
          <div className="text-center pt-2 pb-1">
            <span className="font-cinzel text-xs tracking-wide" style={{
              color: 'rgba(232,230,240,0.25)',
              letterSpacing: '0.05em',
            }}>
              श्रीकृष्णार्पणमस्तु
            </span>
          </div>

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

      </>
  )
}