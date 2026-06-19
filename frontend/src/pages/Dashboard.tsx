import { useMemo, useEffect, useState, useRef } from 'react'
import {
  BookOpen, FileText, Hash, FolderOpen, Clock, Star, Plus,
  MoreHorizontal, Edit2, Archive, Trash2, Check, X, Image as ImageIcon,
  ArrowUpDown, SortAsc, SortDesc, GripVertical, ChevronRight, SlidersHorizontal,
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '@/store'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '@/components/shared/Modal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

const WORKSPACE_ICONS = ['📚','🎓','🎯','🔬','💻','🧠','🌐','📊','🎨','🌿','🏗️','🎵','🔐','🌍','⚡','🧪','🎭','📐','🌲','🤖']

type SortMode = 'az' | 'za' | 'recent' | 'created' | 'custom'
type PanelType = 'workspaces' | 'subjects' | 'topics' | 'pdfs' | null

// ─── Drag-sortable row used inside panels ─────────────────────────────────────
function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 shrink-0"
        style={{ color: 'rgba(232,230,240,0.2)', touchAction: 'none' }}>
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

// ─── Sort toggle bar ──────────────────────────────────────────────────────────
function SortBar({ sort, setSort, allowCustom = true }: { sort: SortMode; setSort: (s: SortMode) => void; allowCustom?: boolean }) {
  const options: { key: SortMode; label: string; icon: React.ReactNode }[] = [
    { key: 'az',      label: 'A–Z',     icon: <SortAsc size={12} /> },
    { key: 'za',      label: 'Z–A',     icon: <SortDesc size={12} /> },
    { key: 'recent',  label: 'Recent',  icon: <Clock size={12} /> },
    { key: 'created', label: 'Created', icon: <ArrowUpDown size={12} /> },
    ...(allowCustom ? [{ key: 'custom' as SortMode, label: 'Custom', icon: <GripVertical size={12} /> }] : []),
  ]
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(o => (
        <button key={o.key} onClick={() => setSort(o.key)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all"
          style={{
            background: sort === o.key ? 'rgba(147,197,253,0.15)' : 'rgba(255,255,255,0.04)',
            color: sort === o.key ? '#93c5fd' : 'rgba(232,230,240,0.4)',
            border: `1px solid ${sort === o.key ? 'rgba(147,197,253,0.25)' : 'rgba(255,255,255,0.06)'}`,
          }}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  )
}

// ─── Slide-in side panel ──────────────────────────────────────────────────────
function Panel({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
            style={{ width: 460, background: '#0c0c18', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="font-cinzel text-base font-semibold" style={{ color: '#fde68a' }}>{title}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 transition-colors"
                style={{ color: 'rgba(232,230,240,0.4)' }}><X size={16} /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto thin-scroll px-6 py-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    user, workspaces, subjects, topics, pdfs, recentActivity,
    setActivePage, setActiveSubject, setActiveTopic, setActiveWorkspace,
    fetchTopics, fetchSubjects, fetchPdfs,
    addWorkspace, updateWorkspace, deleteWorkspace, updateSubject,
  } = useStore()

  // Workspace modal state
  const [showNewWs, setShowNewWs]       = useState(false)
  const [newWsName, setNewWsName]       = useState('')
  const [newWsIcon, setNewWsIcon]       = useState('📚')
  const [wsMenuOpen, setWsMenuOpen]     = useState<string | null>(null)
  const [renamingWsId, setRenamingWsId] = useState<string | null>(null)
  const [renameWsVal, setRenameWsVal]   = useState('')
  const [editIconWsId, setEditIconWsId] = useState<string | null>(null)
  const [deleteWsId, setDeleteWsId]     = useState<string | null>(null)

  // Panel state
  const [activePanel, setActivePanel]   = useState<PanelType>(null)
  const [wsSort, setWsSort]             = useState<SortMode>('custom')
  const [subSort, setSubSort]           = useState<SortMode>('az')
  const [topicSort, setTopicSort]       = useState<SortMode>('az')
  const [pdfSort, setPdfSort]           = useState<SortMode>('az')
  const [wsOrder, setWsOrder]           = useState<string[]>([])
  const [subOrder, setSubOrder]         = useState<string[]>([])

  // Seed drag-order from store on first open
  useEffect(() => {
    setWsOrder(workspaces.filter(w => !w.archived).map(w => w.id))
  }, [workspaces.length])
  useEffect(() => {
    setSubOrder(subjects.filter(s => !s.archived).map(s => s.id))
  }, [subjects.length])

  const sensors = useSensors(useSensor(PointerSensor))

  // Fetch all subjects (and their topicCount/pdfCount aggregates) on mount
  // so Dashboard stats are accurate without visiting every workspace first.
  useEffect(() => { fetchSubjects() }, [])

  useEffect(() => {
    const handler = () => setShowNewWs(true)
    window.addEventListener('akshar:open-new-workspace', handler)
    return () => window.removeEventListener('akshar:open-new-workspace', handler)
  }, [])

  useEffect(() => {
    const handler = () => { setWsMenuOpen(null) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const stats = useMemo(() => ({
    workspaces: workspaces.filter(w => !w.archived).length,
    subjects:   subjects.filter(s => !s.archived).length,
    topics:     subjects.filter(s => !s.archived).reduce((sum, s) => sum + (s.topicCount || 0), 0),
    pdfs:       subjects.filter(s => !s.archived).reduce((sum, s) => sum + (s.pdfCount || 0), 0),
  }), [workspaces, subjects])

  const statCards: { icon: React.ElementType; label: string; value: number; color: string; panel: PanelType }[] = [
    { icon: FolderOpen, label: 'Workspaces', value: stats.workspaces, color: '#7c3aed', panel: 'workspaces' },
    { icon: BookOpen,   label: 'Subjects',   value: stats.subjects,   color: '#2563eb', panel: 'subjects'   },
    { icon: Hash,       label: 'Topics',     value: stats.topics,     color: '#0d9488', panel: 'topics'     },
    { icon: FileText,   label: 'PDFs',       value: stats.pdfs,       color: '#d97706', panel: 'pdfs'       },
  ]

  const activeWorkspaces = workspaces.filter(w => !w.archived)
    .sort((a, b) => {
      // Pinned always floats to top, then sort by most recently used
      if (b.pinned !== a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
      return new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
    })

  // ── Sorted lists for panels ──────────────────────────────────────────────
  function sortItems<T extends { name: string; updatedAt?: string; createdAt?: string; sortOrder?: number }>(
    items: T[], sort: SortMode, order: string[]
  ): T[] {
    if (sort === 'az')      return [...items].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'za')      return [...items].sort((a, b) => b.name.localeCompare(a.name))
    if (sort === 'recent')  return [...items].sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime())
    if (sort === 'created') return [...items].sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime())
    if (sort === 'custom')  return order.map(id => items.find((i: any) => i.id === id)!).filter(Boolean)
    return items
  }

  const sortedWs     = sortItems(workspaces.filter(w => !w.archived), wsSort, wsOrder)
  const sortedSubs   = sortItems(subjects.filter(s => !s.archived), subSort, subOrder)
  const sortedTopics = useMemo(() => {
    const t = topics.filter(t => !t.archived)
    if (topicSort === 'az')      return [...t].sort((a, b) => a.name.localeCompare(b.name))
    if (topicSort === 'za')      return [...t].sort((a, b) => b.name.localeCompare(a.name))
    if (topicSort === 'recent')  return [...t].sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
    if (topicSort === 'created') return [...t].sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime())
    return t
  }, [topics, topicSort])
  const sortedPdfs = useMemo(() => {
    const p = pdfs
    if (pdfSort === 'az')      return [...p].sort((a, b) => a.name.localeCompare(b.name))
    if (pdfSort === 'za')      return [...p].sort((a, b) => b.name.localeCompare(a.name))
    if (pdfSort === 'recent')  return [...p].sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
    if (pdfSort === 'created') return [...p].sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime())
    return p
  }, [pdfs, pdfSort])

  // ── Panel open handler: fetch data as needed ─────────────────────────────
  const openPanel = (panel: PanelType) => {
    setActivePanel(panel)
    if (panel === 'topics') {
      // Fetch topics for all subjects we know about
      subjects.filter(s => !s.archived).forEach(s => fetchTopics(s.id))
    }
    if (panel === 'pdfs') {
      fetchPdfs()
    }
  }

  // ── Drag end handlers ────────────────────────────────────────────────────
  const handleWsDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setWsOrder(prev => {
      const oldIdx = prev.indexOf(active.id as string)
      const newIdx = prev.indexOf(over.id as string)
      return arrayMove(prev, oldIdx, newIdx)
    })
  }
  const handleSubDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setSubOrder(prev => {
      const oldIdx = prev.indexOf(active.id as string)
      const newIdx = prev.indexOf(over.id as string)
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  const handleCreateWs = async () => {
    if (!newWsName.trim()) return
    await addWorkspace({ name: newWsName.trim(), icon: newWsIcon, color: '#7c3aed' })
    setNewWsName(''); setShowNewWs(false)
  }

  const handleRenameWs = async (id: string) => {
    if (!renameWsVal.trim()) { setRenamingWsId(null); return }
    await updateWorkspace(id, { name: renameWsVal.trim() })
    setRenamingWsId(null)
  }

  const handleTopicClick = async (a: any) => {
    if (a.resourceType !== 'topic') return
    let topic = useStore.getState().topics.find(t => t.id === a.resourceId)
    if (!topic) {
      const sub = subjects.find(s => s.name === a.subjectName)
      if (sub) { await fetchTopics(sub.id); setActiveSubject(sub.id) }
      topic = useStore.getState().topics.find(t => t.id === a.resourceId)
    }
    if (topic) { setActiveSubject(topic.subjectId); await fetchTopics(topic.subjectId) }
    setActiveTopic(a.resourceId)
    setActivePage('topic')
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Top header strip ── */}
      <div className="px-8 pt-7 pb-4 shrink-0">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="font-cinzel text-2xl font-semibold" style={{ color: '#fde68a' }}>
              {user ? `Namaste, ${user.name.split(' ')[0]} 🙏` : 'मानसरोवर'}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(232,230,240,0.4)' }}>
              The sacred lake of the mind — your eternal knowledge
            </p>
          </div>
          <button onClick={() => setShowNewWs(true)} className="gold-btn flex items-center gap-2 text-sm shrink-0">
            <Plus size={14} /> New Workspace
          </button>
        </div>

        {/* Stat pills — clickable, open a side panel */}
        <div className="flex gap-3">
          {statCards.map(card => (
            <button
              key={card.label}
              onClick={() => openPanel(card.panel)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{
                background: `${card.color}12`,
                border: `1px solid ${activePanel === card.panel ? card.color + '50' : card.color + '20'}`,
                boxShadow: activePanel === card.panel ? `0 0 0 1px ${card.color}30` : 'none',
              }}
            >
              <card.icon size={13} style={{ color: card.color }} />
              <span className="text-sm font-mono font-semibold" style={{ color: card.color }}>{card.value}</span>
              <span className="text-xs" style={{ color: 'rgba(232,230,240,0.45)' }}>{card.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main scrollable body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scroll px-8 pb-8">

        {/* Workspaces — horizontal scroll row */}
        <div className="mb-8">
          <h2 className="font-cinzel text-sm font-medium mb-3" style={{ color: '#fde68a' }}>Workspaces</h2>

          {activeWorkspaces.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card flex flex-col items-center py-16 text-center">
              <span className="text-5xl mb-4 animate-float">✨</span>
              <p className="font-cinzel text-base mb-1" style={{ color: 'rgba(232,230,240,0.5)' }}>No workspaces yet</p>
              <p className="text-sm mb-5" style={{ color: 'rgba(232,230,240,0.3)' }}>
                Create your first workspace to organise your knowledge
              </p>
              <button onClick={() => setShowNewWs(true)} className="gold-btn flex items-center gap-2 text-sm">
                <Plus size={14} /> Create Workspace
              </button>
            </motion.div>
          ) : (
            /* Horizontal scroll: cards always stay one row, scroll sideways when >4 */
            <div className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
              {activeWorkspaces.map((ws, i) => {
                const wsSubs = subjects.filter(s => s.workspaceId === ws.id && !s.archived)
                return (
                  <motion.div
                    key={ws.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card-hover relative group cursor-pointer p-4 shrink-0"
                    style={{
                      width: 200,
                      borderColor: ws.pinned ? 'rgba(147,197,253,0.25)' : undefined,
                    }}
                    onClick={() => { setActiveWorkspace(ws.id); setActivePage('workspace') }}
                  >
                    {/* Three-dot menu */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={e => { e.stopPropagation(); setWsMenuOpen(wsMenuOpen === ws.id ? null : ws.id) }}
                        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                        style={{ color: 'rgba(232,230,240,0.4)' }}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {wsMenuOpen === ws.id && (
                        <div className="absolute right-0 top-7 w-40 glass-card py-1 z-30 shadow-2xl"
                          style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                          <button onClick={e => { e.stopPropagation(); setRenameWsVal(ws.name); setRenamingWsId(ws.id); setWsMenuOpen(null) }}
                            className="w-full px-3 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2"
                            style={{ color: 'rgba(232,230,240,0.7)' }}><Edit2 size={11} />Rename</button>
                          <button onClick={e => { e.stopPropagation(); setEditIconWsId(ws.id); setWsMenuOpen(null) }}
                            className="w-full px-3 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2"
                            style={{ color: 'rgba(232,230,240,0.7)' }}><ImageIcon size={11} />Change Icon</button>
                          <button onClick={e => { e.stopPropagation(); updateWorkspace(ws.id, { pinned: !ws.pinned }); setWsMenuOpen(null) }}
                            className="w-full px-3 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2"
                            style={{ color: 'rgba(232,230,240,0.7)' }}><Star size={11} />{ws.pinned ? 'Unpin' : 'Pin'}</button>
                          <button onClick={e => { e.stopPropagation(); updateWorkspace(ws.id, { archived: true }); setWsMenuOpen(null) }}
                            className="w-full px-3 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2"
                            style={{ color: 'rgba(232,230,240,0.7)' }}><Archive size={11} />Archive</button>
                          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                          <button onClick={e => { e.stopPropagation(); setDeleteWsId(ws.id); setWsMenuOpen(null) }}
                            className="w-full px-3 py-2 text-xs text-left hover:bg-red-500/10 flex items-center gap-2 text-red-400">
                            <Trash2 size={11} />Delete</button>
                        </div>
                      )}
                    </div>

                    <div className="text-3xl mb-3">{ws.icon}</div>

                    {renamingWsId === ws.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input value={renameWsVal} onChange={e => setRenameWsVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRenameWs(ws.id); if (e.key === 'Escape') setRenamingWsId(null) }}
                          className="cosmic-input text-xs flex-1 py-1" autoFocus />
                        <button onClick={() => handleRenameWs(ws.id)} className="p-1 text-emerald-400"><Check size={12} /></button>
                        <button onClick={() => setRenamingWsId(null)} className="p-1 text-red-400"><X size={12} /></button>
                      </div>
                    ) : (
                      <p className="font-cinzel text-sm font-medium mb-1 truncate" style={{ color: '#fde68a' }}>{ws.name}</p>
                    )}
                    <p className="text-xs" style={{ color: 'rgba(232,230,240,0.4)' }}>
                      {wsSubs.length} subject{wsSubs.length !== 1 ? 's' : ''}
                    </p>
                  </motion.div>
                )
              })}

              {/* Add workspace card */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: activeWorkspaces.length * 0.05 }}
                onClick={() => setShowNewWs(true)}
                className="glass-card flex flex-col items-center justify-center cursor-pointer border-dashed transition-all hover:border-blue-400/30 hover:bg-blue-400/5 shrink-0"
                style={{ border: '1px dashed rgba(255,255,255,0.1)', minHeight: 120, width: 200 }}>
                <Plus size={20} style={{ color: 'rgba(232,230,240,0.25)' }} />
                <span className="text-xs mt-2" style={{ color: 'rgba(232,230,240,0.3)' }}>New Workspace</span>
              </motion.div>
            </div>
          )}
        </div>

        {/* Bottom two columns */}
        <div className="grid grid-cols-2 gap-5">
          {/* Recently Viewed */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-cinzel text-sm font-medium flex items-center gap-1.5" style={{ color: '#fde68a' }}>
                <Clock size={13} /> Recently Viewed
              </h2>
              <button onClick={() => setActivePage('recent')} className="text-xs hover:text-blue-400 transition-colors"
                style={{ color: 'rgba(232,230,240,0.35)' }}>View all</button>
            </div>
            {recentActivity.length === 0 ? (
              <div className="glass-card p-6 flex flex-col items-center text-center">
                <Clock size={20} className="mb-2" style={{ color: 'rgba(232,230,240,0.15)' }} />
                <p className="text-xs" style={{ color: 'rgba(232,230,240,0.3)' }}>No recent activity yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentActivity.slice(0, 7).map(a => (
                  <div key={a.id} className="glass-card-hover px-3 py-2.5 flex items-center gap-3 cursor-pointer"
                    onClick={() => handleTopicClick(a)}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: a.resourceType === 'pdf' ? 'rgba(217,119,6,0.15)' : 'rgba(37,99,235,0.15)' }}>
                      {a.resourceType === 'pdf'
                        ? <FileText size={12} style={{ color: '#d97706' }} />
                        : <Hash size={12} style={{ color: '#2563eb' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: 'rgba(232,230,240,0.85)' }}>{a.resourceName}</p>
                      <p className="text-xs truncate" style={{ color: 'rgba(232,230,240,0.35)' }}>{a.subjectName}</p>
                    </div>
                    <p className="text-xs shrink-0" style={{ color: 'rgba(232,230,240,0.25)' }}>
                      {a.timestamp ? formatDistanceToNow(new Date(a.timestamp), { addSuffix: true }) : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pinned */}
          <div>
            <h2 className="font-cinzel text-sm font-medium mb-3 flex items-center gap-1.5" style={{ color: '#fde68a' }}>
              <Star size={13} /> Pinned
            </h2>
            {[...workspaces.filter(w => w.pinned && !w.archived), ...subjects.filter(s => s.pinned && !s.archived)].length === 0 ? (
              <div className="glass-card p-6 flex flex-col items-center text-center">
                <Star size={20} className="mb-2" style={{ color: 'rgba(232,230,240,0.15)' }} />
                <p className="text-xs" style={{ color: 'rgba(232,230,240,0.3)' }}>Pin workspaces or subjects for quick access</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {[...workspaces.filter(w => w.pinned && !w.archived), ...subjects.filter(s => s.pinned && !s.archived)]
                  .slice(0, 7).map((item: any) => (
                  <div key={item.id} className="glass-card-hover px-3 py-2.5 flex items-center gap-3 cursor-pointer"
                    onClick={() => {
                      if ('workspaceId' in item) { setActiveSubject(item.id); setActivePage('subject') }
                      else { setActiveWorkspace(item.id); setActivePage('workspace') }
                    }}>
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: 'rgba(232,230,240,0.85)' }}>{item.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(232,230,240,0.35)' }}>
                        {'workspaceId' in item ? `${item.topicCount} topics` : `${item.subjectCount} subjects`}
                      </p>
                    </div>
                    <Star size={11} style={{ color: 'rgba(234,179,8,0.4)' }} className="shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ Side Panels ══════════════════════════════════════════════════════════ */}

      {/* Workspaces Panel */}
      <Panel open={activePanel === 'workspaces'} onClose={() => setActivePanel(null)} title={`Workspaces (${stats.workspaces})`}>
        <div className="mb-4">
          <SortBar sort={wsSort} setSort={setWsSort} />
        </div>
        {wsSort === 'custom' ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWsDragEnd}>
            <SortableContext items={wsOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sortedWs.map(ws => (
                  <SortableRow key={ws.id} id={ws.id}>
                    <div className="glass-card-hover flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl"
                      onClick={() => { setActiveWorkspace(ws.id); setActivePage('workspace'); setActivePanel(null) }}>
                      <span className="text-xl">{ws.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: '#fde68a' }}>{ws.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(232,230,240,0.35)' }}>
                          {subjects.filter(s => s.workspaceId === ws.id && !s.archived).length} subjects
                        </p>
                      </div>
                      {ws.pinned && <Star size={11} style={{ color: 'rgba(234,179,8,0.5)' }} className="shrink-0" />}
                      <ChevronRight size={13} style={{ color: 'rgba(232,230,240,0.2)' }} className="shrink-0" />
                    </div>
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-2">
            {sortedWs.map(ws => (
              <div key={ws.id} className="glass-card-hover flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl"
                onClick={() => { setActiveWorkspace(ws.id); setActivePage('workspace'); setActivePanel(null) }}>
                <span className="text-xl">{ws.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: '#fde68a' }}>{ws.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(232,230,240,0.35)' }}>
                    {subjects.filter(s => s.workspaceId === ws.id && !s.archived).length} subjects
                  </p>
                </div>
                {ws.pinned && <Star size={11} style={{ color: 'rgba(234,179,8,0.5)' }} className="shrink-0" />}
                <ChevronRight size={13} style={{ color: 'rgba(232,230,240,0.2)' }} className="shrink-0" />
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Subjects Panel */}
      <Panel open={activePanel === 'subjects'} onClose={() => setActivePanel(null)} title={`Subjects (${stats.subjects})`}>
        <div className="mb-4">
          <SortBar sort={subSort} setSort={setSubSort} />
        </div>
        {subSort === 'custom' ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubDragEnd}>
            <SortableContext items={subOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sortedSubs.map(s => (
                  <SortableRow key={s.id} id={s.id}>
                    <div className="glass-card-hover flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl"
                      onClick={() => { setActiveSubject(s.id); setActivePage('subject'); setActivePanel(null) }}>
                      <span className="text-xl">{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: 'rgba(232,230,240,0.85)' }}>{s.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(232,230,240,0.35)' }}>{s.topicCount} topics</p>
                      </div>
                      <ChevronRight size={13} style={{ color: 'rgba(232,230,240,0.2)' }} className="shrink-0" />
                    </div>
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-2">
            {sortedSubs.map(s => (
              <div key={s.id} className="glass-card-hover flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl"
                onClick={() => { setActiveSubject(s.id); setActivePage('subject'); setActivePanel(null) }}>
                <span className="text-xl">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'rgba(232,230,240,0.85)' }}>{s.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(232,230,240,0.35)' }}>{s.topicCount} topics</p>
                </div>
                <ChevronRight size={13} style={{ color: 'rgba(232,230,240,0.2)' }} className="shrink-0" />
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Topics Panel */}
      <Panel open={activePanel === 'topics'} onClose={() => setActivePanel(null)} title={`Topics (${stats.topics})`}>
        <div className="mb-4">
          <SortBar sort={topicSort} setSort={setTopicSort} allowCustom={false} />
        </div>
        {sortedTopics.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'rgba(232,230,240,0.3)' }}>
            Open some subjects first to index topics
          </p>
        ) : (
          <div className="space-y-2">
            {sortedTopics.map(t => {
              const sub = subjects.find(s => s.id === t.subjectId)
              return (
                <div key={t.id} className="glass-card-hover flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl"
                  onClick={() => { setActiveSubject(t.subjectId); setActiveTopic(t.id); setActivePage('topic'); setActivePanel(null) }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(13,148,136,0.15)' }}>
                    <Hash size={12} style={{ color: '#0d9488' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'rgba(232,230,240,0.85)' }}>{t.name}</p>
                    <p className="text-xs truncate" style={{ color: 'rgba(232,230,240,0.35)' }}>{sub?.name}</p>
                  </div>
                  {t.pinned && <Star size={11} style={{ color: 'rgba(234,179,8,0.5)' }} className="shrink-0" />}
                  <ChevronRight size={13} style={{ color: 'rgba(232,230,240,0.2)' }} className="shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      {/* PDFs Panel */}
      <Panel open={activePanel === 'pdfs'} onClose={() => setActivePanel(null)} title={`PDFs (${stats.pdfs})`}>
        <div className="mb-4">
          <SortBar sort={pdfSort} setSort={setPdfSort} allowCustom={false} />
        </div>
        {sortedPdfs.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'rgba(232,230,240,0.3)' }}>No PDFs uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {sortedPdfs.map((p: any) => {
              const sub = subjects.find(s => s.id === p.subjectId)
              return (
                <div key={p.id} className="glass-card-hover flex items-center gap-3 px-3 py-2.5 rounded-xl">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(217,119,6,0.15)' }}>
                    <FileText size={12} style={{ color: '#d97706' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'rgba(232,230,240,0.85)' }}>{p.name}</p>
                    <p className="text-xs truncate" style={{ color: 'rgba(232,230,240,0.35)' }}>{sub?.name}</p>
                  </div>
                  {p.driveViewUrl && (
                    <a href={p.driveViewUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/5 shrink-0"
                      style={{ color: 'rgba(147,197,253,0.6)' }}>Open</a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      {/* ── New Workspace Modal ── */}
      <Modal open={showNewWs} onClose={() => setShowNewWs(false)} title="New Workspace">
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: 'rgba(232,230,240,0.6)' }}>Icon</label>
            <div className="flex gap-1.5 flex-wrap">
              {WORKSPACE_ICONS.map(icon => (
                <button key={icon} onClick={() => setNewWsIcon(icon)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${newWsIcon === icon ? 'bg-blue-500/20 ring-1 ring-blue-400' : 'hover:bg-white/5'}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(232,230,240,0.6)' }}>Name</label>
            <input value={newWsName} onChange={e => setNewWsName(e.target.value)}
              className="cosmic-input" placeholder="e.g. College, Self Study, Research…"
              onKeyDown={e => e.key === 'Enter' && handleCreateWs()} autoFocus />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setShowNewWs(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: 'rgba(232,230,240,0.5)' }}>Cancel</button>
            <button onClick={handleCreateWs} className="gold-btn text-sm px-5 py-2">Create</button>
          </div>
        </div>
      </Modal>

      {/* ── Change Icon Modal ── */}
      <Modal open={!!editIconWsId} onClose={() => setEditIconWsId(null)} title="Change Workspace Icon">
        <div className="flex gap-1.5 flex-wrap">
          {WORKSPACE_ICONS.map(icon => {
            const ws = workspaces.find(w => w.id === editIconWsId)
            return (
              <button key={icon} onClick={async () => { await updateWorkspace(editIconWsId!, { icon } as any); setEditIconWsId(null) }}
                className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${ws?.icon === icon ? 'bg-blue-500/20 ring-1 ring-blue-400' : 'hover:bg-white/5'}`}>
                {icon}
              </button>
            )
          })}
        </div>
      </Modal>

      {/* ── Delete Workspace Confirmation ── */}
      <ConfirmDialog
        open={!!deleteWsId}
        title="Delete this workspace?"
        message={`This will permanently delete "${workspaces.find(w => w.id === deleteWsId)?.name ?? 'this workspace'}" along with all of its subjects and topics. This action cannot be undone.`}
        onCancel={() => setDeleteWsId(null)}
        onConfirm={async () => { const id = deleteWsId!; setDeleteWsId(null); await deleteWorkspace(id, true) }}
      />
    </div>
  )
}
