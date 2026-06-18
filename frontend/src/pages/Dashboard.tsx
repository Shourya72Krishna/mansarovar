import { useMemo, useEffect, useState } from 'react'
import {
  BookOpen, FileText, Hash, FolderOpen, Clock, Star, Plus,
  MoreHorizontal, Edit2, Archive, Trash2, Check, X, Image as ImageIcon
} from 'lucide-react'
import { useStore } from '@/store'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '@/components/shared/Modal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

const WORKSPACE_ICONS = ['📚','🎓','🎯','🔬','💻','🧠','🌐','📊','🎨','🌿','🏗️','🎵','🔐','🌍','⚡','🧪','🎭','📐','🌲','🤖']

export default function Dashboard() {
  const {
    user, workspaces, subjects, topics, pdfs, recentActivity,
    setActivePage, setActiveSubject, setActiveTopic, setActiveWorkspace,
    fetchTopics, fetchSubjects,
    addWorkspace, updateWorkspace, deleteWorkspace,
  } = useStore()

  // Workspace modal state
  const [showNewWs, setShowNewWs]     = useState(false)
  const [newWsName, setNewWsName]     = useState('')
  const [newWsIcon, setNewWsIcon]     = useState('📚')
  const [wsMenuOpen, setWsMenuOpen]   = useState<string | null>(null)
  const [renamingWsId, setRenamingWsId] = useState<string | null>(null)
  const [renameWsVal, setRenameWsVal] = useState('')
  const [editIconWsId, setEditIconWsId] = useState<string | null>(null)
  const [deleteWsId, setDeleteWsId] = useState<string | null>(null)

  useEffect(() => {
    const handler = () => setShowNewWs(true)
    window.addEventListener('akshar:open-new-workspace', handler)
    return () => window.removeEventListener('akshar:open-new-workspace', handler)
  }, [])

  // Close menus on outside click
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

  const statCards = [
    { icon: FolderOpen, label: 'Workspaces', value: stats.workspaces, color: '#7c3aed' },
    { icon: BookOpen,   label: 'Subjects',   value: stats.subjects,   color: '#2563eb' },
    { icon: Hash,       label: 'Topics',     value: stats.topics,     color: '#0d9488' },
    { icon: FileText,   label: 'PDFs',       value: stats.pdfs,       color: '#d97706' },
  ]

  const activeWorkspaces = workspaces.filter(w => !w.archived)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

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
    if (topic) {
      setActiveSubject(topic.subjectId)
      await fetchTopics(topic.subjectId)
    }
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
          <button
            onClick={() => setShowNewWs(true)}
            className="gold-btn flex items-center gap-2 text-sm shrink-0"
          >
            <Plus size={14} /> New Workspace
          </button>
        </div>

        {/* Stat pills */}
        <div className="flex gap-3">
          {statCards.map(card => (
            <div key={card.label} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: `${card.color}12`, border: `1px solid ${card.color}20` }}>
              <card.icon size={13} style={{ color: card.color }} />
              <span className="text-sm font-mono font-semibold" style={{ color: card.color }}>{card.value}</span>
              <span className="text-xs" style={{ color: 'rgba(232,230,240,0.45)' }}>{card.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main scrollable body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scroll px-8 pb-8">

        {/* Workspaces section */}
        <div className="mb-8">
          <h2 className="font-cinzel text-sm font-medium mb-3" style={{ color: '#fde68a' }}>
            Workspaces
          </h2>

          {activeWorkspaces.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card flex flex-col items-center py-16 text-center"
            >
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
            <div className="grid grid-cols-4 gap-3">
              {activeWorkspaces.map((ws, i) => {
                const wsSubs = subjects.filter(s => s.workspaceId === ws.id && !s.archived)
                return (
                  <motion.div
                    key={ws.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card-hover relative group cursor-pointer p-4"
                    style={{ borderColor: ws.pinned ? 'rgba(147,197,253,0.25)' : undefined }}
                    onClick={() => { setActiveWorkspace(ws.id); setActivePage('workspace') }}
                  >
                    {/* Three dots menu */}
                    <div
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={e => { e.stopPropagation(); setWsMenuOpen(wsMenuOpen === ws.id ? null : ws.id) }}
                    >
                      <button className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                        style={{ color: 'rgba(232,230,240,0.5)' }}>
                        <MoreHorizontal size={14} />
                      </button>
                      <AnimatePresence>
                        {wsMenuOpen === ws.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 top-7 w-44 glass-card py-1 z-30 shadow-2xl"
                            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { setRenamingWsId(ws.id); setRenameWsVal(ws.name); setWsMenuOpen(null) }}
                              className="w-full px-4 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2"
                              style={{ color: 'rgba(232,230,240,0.7)' }}>
                              <Edit2 size={11} /> Rename
                            </button>
                            <button
                              onClick={() => { setEditIconWsId(ws.id); setWsMenuOpen(null) }}
                              className="w-full px-4 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2"
                              style={{ color: 'rgba(232,230,240,0.7)' }}>
                              <ImageIcon size={11} /> Change Icon
                            </button>
                            <button
                              onClick={async () => { await updateWorkspace(ws.id, { pinned: !ws.pinned }); setWsMenuOpen(null) }}
                              className="w-full px-4 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2"
                              style={{ color: 'rgba(232,230,240,0.7)' }}>
                              <Star size={11} /> {ws.pinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              onClick={async () => { await updateWorkspace(ws.id, { archived: true }); setWsMenuOpen(null) }}
                              className="w-full px-4 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2"
                              style={{ color: 'rgba(232,230,240,0.7)' }}>
                              <Archive size={11} /> Archive
                            </button>
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                            <button
                              onClick={() => { setDeleteWsId(ws.id); setWsMenuOpen(null) }}
                              className="w-full px-4 py-2 text-xs text-left hover:bg-red-500/10 flex items-center gap-2 text-red-400">
                              <Trash2 size={11} /> Delete
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Pinned star */}
                    {ws.pinned && <Star size={11} className="absolute top-2.5 left-2.5 text-gold-400/60" />}

                    {/* Icon + name */}
                    <div className="text-3xl mb-3">{ws.icon || '📁'}</div>

                    {/* Rename inline */}
                    {renamingWsId === ws.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input
                          value={renameWsVal}
                          onChange={e => setRenameWsVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRenameWs(ws.id); if (e.key === 'Escape') setRenamingWsId(null) }}
                          className="cosmic-input text-sm py-1 flex-1 min-w-0"
                          style={{ color: '#fde68a' }}
                          autoFocus
                        />
                        <button onClick={() => handleRenameWs(ws.id)} className="p-1 text-emerald-400 shrink-0"><Check size={12} /></button>
                        <button onClick={() => setRenamingWsId(null)} className="p-1 text-red-400 shrink-0"><X size={12} /></button>
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: activeWorkspaces.length * 0.05 }}
                onClick={() => setShowNewWs(true)}
                className="glass-card flex flex-col items-center justify-center p-4 cursor-pointer border-dashed transition-all hover:border-blue-400/30 hover:bg-blue-400/5"
                style={{ border: '1px dashed rgba(255,255,255,0.1)', minHeight: 120 }}
              >
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
                <Star size={13} className="text-gold-400" /> Pinned
              </h2>
              {[...workspaces.filter(w => w.pinned && !w.archived), ...subjects.filter(s => s.pinned && !s.archived)].length === 0 ? (
                <div className="glass-card p-6 flex flex-col items-center text-center">
                  <Star size={20} className="mb-2" style={{ color: 'rgba(232,230,240,0.15)' }} />
                  <p className="text-xs" style={{ color: 'rgba(232,230,240,0.3)' }}>Pin workspaces or subjects for quick access</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {[...workspaces.filter(w => w.pinned && !w.archived), ...subjects.filter(s => s.pinned && !s.archived)]
                    .slice(0, 7)
                    .map((item: any) => (
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
                      <Star size={11} className="text-gold-500/50 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
      </div>

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
