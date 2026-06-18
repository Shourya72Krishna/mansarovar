import { useState, useEffect } from 'react'
import { Plus, Star, Archive, Trash2, MoreHorizontal, Search, Edit2, Check, X, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '@/store'
import { motion } from 'framer-motion'
import Modal from '@/components/shared/Modal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { SortMode } from '@/types'

const SORT_LABELS: Record<SortMode, string> = {
  'alphabetical': 'A → Z',
  'recently-created': 'Recently Created',
  'recently-updated': 'Recently Updated',
  'custom': 'Custom',
}


// ── Sortable subject card for drag-and-drop ───────────────────────────────────
function SortableSubjectCard({ sub, isCustomSort, onSelect, onRename, onChangeIcon, onPin, onArchive, onDelete, menuOpen, setMenuOpen, renamingId, renameValue, setRenameValue, onRenameConfirm, onRenameCancel }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sub.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="glass-card-hover p-5 cursor-pointer relative group"
        onClick={() => onSelect(sub.id)}
        style={{ borderColor: sub.pinned ? 'rgba(147,197,253,0.2)' : undefined }}
      >
        {isCustomSort && (
          <div
            {...attributes} {...listeners}
            className="absolute top-3 left-3 opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-grab active:cursor-grabbing transition-opacity z-10"
            style={{ color: 'rgba(232,230,240,0.4)' }}
            onClick={e => e.stopPropagation()}
          >
            <GripVertical size={14} />
          </div>
        )}

        {/* Menu */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === sub.id ? null : sub.id) }}>
          <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'rgba(232,230,240,0.5)' }}>
            <MoreHorizontal size={14} />
          </button>
          {menuOpen === sub.id && (
            <div className="absolute right-0 top-8 w-40 glass-card py-1 z-20 shadow-2xl" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <button onClick={e => { e.stopPropagation(); onRename(sub.id, sub.name); setMenuOpen(null) }}
                className="w-full px-4 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2" style={{ color: 'rgba(232,230,240,0.7)' }}>
                <Edit2 size={12} />Rename
              </button>
              <button onClick={async e => { e.stopPropagation(); await onPin(sub.id, !sub.pinned); setMenuOpen(null) }}
                className="w-full px-4 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2" style={{ color: 'rgba(232,230,240,0.7)' }}>
                <Star size={12} />{sub.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button onClick={async e => { e.stopPropagation(); await onArchive(sub.id); setMenuOpen(null) }}
                className="w-full px-4 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2" style={{ color: 'rgba(232,230,240,0.7)' }}>
                <Archive size={12} />Archive
              </button>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
              <button onClick={async e => { e.stopPropagation(); await onDelete(sub.id); setMenuOpen(null) }}
                className="w-full px-4 py-2 text-xs text-left hover:bg-red-500/10 flex items-center gap-2 text-red-400">
                <Trash2 size={12} />Delete
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl text-xl flex items-center justify-center" style={{ background: `${sub.color || '#2563eb'}20` }}>
            {sub.icon}
          </div>
          {sub.pinned && <Star size={12} className="text-gold-500/70 absolute top-3 left-8" />}
        </div>

        {renamingId === sub.id ? (
          <div className="flex items-center gap-2 mb-1" onClick={e => e.stopPropagation()}>
            <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onRenameConfirm(sub.id); if (e.key === 'Escape') onRenameCancel() }}
              className="cosmic-input font-cinzel text-sm" style={{ color: '#fde68a' }} autoFocus />
            <button onClick={e => { e.stopPropagation(); onRenameConfirm(sub.id) }} className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400"><Check size={12} /></button>
            <button onClick={e => { e.stopPropagation(); onRenameCancel() }} className="p-1 rounded hover:bg-red-500/20 text-red-400"><X size={12} /></button>
          </div>
        ) : (
          <h3 className="font-cinzel font-medium text-base mb-1" style={{ color: '#fde68a' }}>{sub.name}</h3>
        )}

        {sub.description && (
          <p className="text-xs mb-3 line-clamp-2" style={{ color: 'rgba(232,230,240,0.45)' }}>{sub.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(232,230,240,0.4)' }}>
          <span>{sub.topicCount} topics</span>
          <span>·</span>
          <span>{sub.pdfCount} PDFs</span>
          {sub.tags?.length > 0 && (
            <div className="flex gap-1">
              {sub.tags.slice(0, 2).map((t: string) => (
                <span key={t} className="tag-pill" style={{ fontSize: '10px', padding: '1px 6px' }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WorkspacePage() {
  const {
    workspaces, subjects, activeWorkspaceId,
    setActiveSubject, setActivePage,
    addSubject, updateSubject, deleteSubject,
    updateWorkspace, fetchSubjects,
  } = useStore()

  const workspace = workspaces.find(w => w.id === activeWorkspaceId)

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('recently-updated')
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📖')
  const [newDesc, setNewDesc] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [orderedIds, setOrderedIds] = useState<string[]>([])

  // When user switches to custom sort, seed orderedIds from current sort order
  const handleSortChange = (newSort: SortMode) => {
    if (newSort === 'custom' && orderedIds.length === 0) {
      const current = subjects
        .filter(s => s.workspaceId === activeWorkspaceId && !s.archived)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map(s => s.id)
      setOrderedIds(current)
    }
    setSort(newSort)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // Get current ordered list (same logic as render)
    const currentIds = orderedIds.length > 0
      ? orderedIds.filter(id => subjects.some(s => s.id === id))
      : subjects.filter(s => s.workspaceId === activeWorkspaceId && !s.archived).map(s => s.id)

    const oldIndex = currentIds.indexOf(String(active.id))
    const newIndex = currentIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = [...currentIds]
    newOrder.splice(oldIndex, 1)
    newOrder.splice(newIndex, 0, String(active.id))
    setOrderedIds(newOrder)

    // Persist to backend silently
    newOrder.forEach((id, i) => {
      updateSubject(id, { sortOrder: i } as any).catch(() => {})
    })
  }
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [editIconSubId, setEditIconSubId] = useState<string | null>(null)
  const [editIconWsModal, setEditIconWsModal] = useState(false)
  const [renamingWs, setRenamingWs] = useState(false)
  const [renameWsValue, setRenameWsValue] = useState('')
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null)

  const handleRenameSubject = async (id: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return }
    await updateSubject(id, { name: renameValue.trim() })
    setRenamingId(null)
  }

  const handleRenameWs = async () => {
    if (!renameWsValue.trim() || !workspace) { setRenamingWs(false); return }
    await updateWorkspace(workspace.id, { name: renameWsValue.trim() })
    setRenamingWs(false)
  }

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchSubjects(activeWorkspaceId)
    }
  }, [activeWorkspaceId])

  if (!workspace) return (
    <div className="flex items-center justify-center h-full">
      <p style={{ color: 'rgba(232,230,240,0.4)' }}>Select a workspace from the sidebar</p>
    </div>
  )

  let wsSubjects = subjects.filter(s => s.workspaceId === activeWorkspaceId && !s.archived)

  if (search) wsSubjects = wsSubjects.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  // Default sort for all non-custom modes
  const sortedSubjects = [...wsSubjects].sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1
    if (sort === 'alphabetical') return a.name.localeCompare(b.name)
    if (sort === 'recently-created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  if (sort === 'custom') {
    // Build ordered list: use orderedIds order if available, else use default sort
    const ids = orderedIds.length > 0
      ? orderedIds
      : sortedSubjects.map(s => s.id)
    // Merge: ordered first, then any new ones not yet in orderedIds
    const knownIds = new Set(ids)
    const newIds = wsSubjects.filter(s => !knownIds.has(s.id)).map(s => s.id)
    const fullIds = [...ids.filter(id => wsSubjects.some(s => s.id === id)), ...newIds]
    wsSubjects = fullIds.map(id => wsSubjects.find(s => s.id === id)!).filter(Boolean)
  } else {
    wsSubjects = sortedSubjects
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    await addSubject({
      workspaceId: activeWorkspaceId!,
      name: newName.trim(),
      icon: newIcon,
      description: newDesc,
    })
    setNewName('')
    setNewDesc('')
    setShowNewModal(false)
  }

  const ICONS = [
    '📖','🧠','🔬','💻','🌐','📊','🧪','⚡','🎨','🌿',
    '🗄️','🤖','💬','🌲','🏗️','🎵','🎭','📐','🔐','🌍',
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl glass-card">
            {workspace.icon}
          </div>
          <div>
            {renamingWs ? (
              <div className="flex items-center gap-2">
                <input
                  value={renameWsValue}
                  onChange={e => setRenameWsValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameWs(); if (e.key === 'Escape') setRenamingWs(false) }}
                  className="cosmic-input font-cinzel text-xl"
                  style={{ color: '#fde68a', width: 220 }}
                  autoFocus
                />
                <button onClick={handleRenameWs} className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors"><Check size={14} /></button>
                <button onClick={() => setRenamingWs(false)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"><X size={14} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h1 className="font-cinzel text-2xl font-semibold" style={{ color: '#fde68a' }}>{workspace.name}</h1>
                <button
                  onClick={() => { setRenamingWs(true); setRenameWsValue(workspace.name) }}
                  className="opacity-0 group-hover/title:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                  style={{ color: 'rgba(232,230,240,0.4)' }}
                  title="Rename"
                >
                  <Edit2 size={13} />
                </button>
              </div>
            )}
            <p className="text-sm mt-0.5" style={{ color: 'rgba(232,230,240,0.45)' }}>
              {wsSubjects.length} subjects · {wsSubjects.reduce((acc, s) => acc + s.topicCount, 0)} topics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => { await updateWorkspace(workspace.id, { pinned: !workspace.pinned }) }}
            className={`p-2 rounded-lg transition-all ${workspace.pinned ? 'text-gold-400 bg-gold-400/10' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
          >
            <Star size={16} />
          </button>
          <button onClick={() => setShowNewModal(true)} className="gold-btn flex items-center gap-2 text-sm">
            <Plus size={15} /> New Subject
          </button>
        </div>
      </motion.div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(232,230,240,0.3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="cosmic-input pl-9 text-sm"
            placeholder="Search subjects..."
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(Object.keys(SORT_LABELS) as SortMode[]).slice(0, 3).map(s => (
            <button
              key={s}
              onClick={() => handleSortChange(s)}
              className={`px-3 py-1.5 rounded text-xs transition-all ${sort === s ? 'bg-gold-500/15 text-gold-400' : 'text-white/40 hover:text-white/70'}`}
            >
              {SORT_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Subjects Grid */}
      {wsSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 glass-card">
          <span className="text-5xl mb-4">✨</span>
          <p className="font-cinzel text-lg mb-2" style={{ color: 'rgba(232,230,240,0.5)' }}>No subjects yet</p>
          <p className="text-sm mb-6" style={{ color: 'rgba(232,230,240,0.3)' }}>Begin your knowledge journey</p>
          <button onClick={() => setShowNewModal(true)} className="gold-btn flex items-center gap-2 text-sm">
            <Plus size={15} /> Create Subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {wsSubjects.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card-hover p-5 cursor-pointer relative group"
              onClick={() => { setActiveSubject(sub.id); setActivePage('subject') }}
              style={{ borderColor: sub.pinned ? 'rgba(251,191,36,0.2)' : undefined }}
            >
              {/* Menu */}
              <div
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === sub.id ? null : sub.id) }}
              >
                <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'rgba(232,230,240,0.5)' }}>
                  <MoreHorizontal size={14} />
                </button>
                {menuOpen === sub.id && (
                  <div className="absolute right-0 top-8 w-40 glass-card py-1 z-20 shadow-2xl" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                      onClick={e => { e.stopPropagation(); setRenamingId(sub.id); setRenameValue(sub.name); setMenuOpen(null) }}
                      className="w-full px-4 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2"
                      style={{ color: 'rgba(232,230,240,0.7)' }}
                    >
                      <Edit2 size={12} />Rename
                    </button>
                    <button
                      onClick={async e => { e.stopPropagation(); await updateSubject(sub.id, { pinned: !sub.pinned }); setMenuOpen(null) }}
                      className="w-full px-4 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2"
                      style={{ color: 'rgba(232,230,240,0.7)' }}
                    >
                      <Star size={12} />{sub.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={async e => { e.stopPropagation(); await updateSubject(sub.id, { archived: true }); setMenuOpen(null) }}
                      className="w-full px-4 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2"
                      style={{ color: 'rgba(232,230,240,0.7)' }}
                    >
                      <Archive size={12} />Archive
                    </button>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                    <button
                      onClick={async e => { e.stopPropagation(); setDeleteSubId(sub.id); setMenuOpen(null) }}
                      className="w-full px-4 py-2 text-xs text-left hover:bg-red-500/10 flex items-center gap-2 text-red-400"
                    >
                      <Trash2 size={12} />Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl text-xl flex items-center justify-center" style={{ background: `${sub.color || '#2563eb'}20` }}>
                  {sub.icon}
                </div>
                {sub.pinned && <Star size={12} className="text-gold-500/70 absolute top-3 left-3" />}
              </div>

              {renamingId === sub.id ? (
                <div className="flex items-center gap-2 mb-1" onClick={e => e.stopPropagation()}>
                  <input
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameSubject(sub.id); if (e.key === 'Escape') setRenamingId(null) }}
                    className="cosmic-input font-cinzel text-sm"
                    style={{ color: '#fde68a' }}
                    autoFocus
                  />
                  <button onClick={e => { e.stopPropagation(); handleRenameSubject(sub.id) }} className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400"><Check size={12} /></button>
                  <button onClick={e => { e.stopPropagation(); setRenamingId(null) }} className="p-1 rounded hover:bg-red-500/20 text-red-400"><X size={12} /></button>
                </div>
              ) : (
                <h3 className="font-cinzel font-medium text-base mb-1" style={{ color: '#fde68a' }}>{sub.name}</h3>
              )}
              {sub.description && (
                <p className="text-xs mb-3 line-clamp-2" style={{ color: 'rgba(232,230,240,0.45)' }}>{sub.description}</p>
              )}

              <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(232,230,240,0.4)' }}>
                <span>{sub.topicCount} topics</span>
                <span>·</span>
                <span>{sub.pdfCount} PDFs</span>
                {sub.tags.length > 0 && (
                  <>
                    <span>·</span>
                    <div className="flex gap-1">
                      {sub.tags.slice(0, 2).map(t => (
                        <span key={t} className="tag-pill" style={{ fontSize: '10px', padding: '1px 6px' }}>{t}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* New Subject Modal */}
      <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="New Subject">
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: 'rgba(232,230,240,0.6)' }}>Icon</label>
            <div className="flex gap-1.5 flex-wrap">
              {ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewIcon(icon)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${newIcon === icon ? 'bg-gold-500/20 ring-1 ring-gold-400' : 'hover:bg-white/5'}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(232,230,240,0.6)' }}>Name *</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="cosmic-input"
              placeholder="e.g. DBMS, Machine Learning..."
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(232,230,240,0.6)' }}>Description</label>
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="cosmic-input"
              placeholder="Brief description..."
              rows={2}
              style={{ resize: 'none' }}
            />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={() => setShowNewModal(false)}
              className="px-4 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: 'rgba(232,230,240,0.5)' }}
            >
              Cancel
            </button>
            <button onClick={handleCreate} className="gold-btn text-sm px-5 py-2">
              Create Subject
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Subject Confirmation ── */}
      <ConfirmDialog
        open={!!deleteSubId}
        title="Delete this subject?"
        message={`This will delete "${subjects.find(s => s.id === deleteSubId)?.name ?? 'this subject'}" along with all of its topics. This action cannot be undone.`}
        onCancel={() => setDeleteSubId(null)}
        onConfirm={async () => { const id = deleteSubId!; setDeleteSubId(null); await deleteSubject(id) }}
      />
    </div>
  )
}