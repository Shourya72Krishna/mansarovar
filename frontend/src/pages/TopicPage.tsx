import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Pin, Tag, Trash2, Archive, MoreHorizontal, Check, X, Edit2, ChevronRight, Save } from 'lucide-react'
import { useStore } from '@/store'
import RichEditor from '@/components/editor/RichEditor'
import Modal from '@/components/shared/Modal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

export default function TopicPage() {
  const {
    topics, subjects, workspaces, activeTopicId, activeSubjectId,
    updateTopic, deleteTopic,
    setActivePage, setActiveTopic,
  } = useStore()

  const topic   = topics.find(t => t.id === activeTopicId)
  const subject = subjects.find(s => s.id === (topic?.subjectId ?? activeSubjectId))
  const workspace = workspaces.find(w => w.id === subject?.workspaceId)

  const [content, setContent]           = useState(topic?.content ?? '')
  const [saveStatus, setSaveStatus]     = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [savedAt, setSavedAt]           = useState<Date | null>(null)
  const [menuOpen, setMenuOpen]         = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [tagInput, setTagInput]         = useState('')
  const [renamingTopic, setRenamingTopic] = useState(false)
  const [renameValue, setRenameValue]   = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toolbar, setToolbar] = useState<React.ReactNode>(null)

  // Navigation history — tracks topic ids visited this session
  const [history, setHistory] = useState<string[]>([])

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset content + push to history when topic changes
  useEffect(() => {
    if (topic) {
      setContent(topic.content ?? '')
      setSaveStatus('saved')
      setSavedAt(null)
      setHistory(prev => {
        if (prev[prev.length - 1] === topic.id) return prev
        return [...prev, topic.id]
      })
    }
  }, [activeTopicId])

  // Auto-save with 1.5 s debounce
  const handleChange = useCallback((html: string) => {
    setContent(html)
    setSaveStatus('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!topic) return
      setSaveStatus('saving')
      try {
        await updateTopic(topic.id, { content: html })
        setSavedAt(new Date())
        setSaveStatus('saved')
      } catch (e) {
        console.error('Auto-save failed:', e)
        setSaveStatus('unsaved')
      }
    }, 1500)
  }, [topic, updateTopic])

  // Go back to previous topic in history, or to subject page
  const handleBack = () => {
    if (history.length >= 2) {
      const prev = history[history.length - 2]
      setHistory(h => h.slice(0, -1))
      setActiveTopic(prev)
      setActivePage('topic')
    } else {
      setActivePage('subject')
    }
  }

  const handleRename = async () => {
    if (!renameValue.trim() || !topic) { setRenamingTopic(false); return }
    await updateTopic(topic.id, { name: renameValue.trim() })
    setRenamingTopic(false)
  }

  const handleSaveTags = async () => {
    if (!topic) return
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
    await updateTopic(topic.id, { tags })
    setShowTagModal(false)
  }

  const handleDelete = async (hard = false) => {
    if (!topic) return
    await deleteTopic(topic.id, hard)
    setActiveTopic(null)
    setActivePage('subject')
  }

  if (!topic) return (
    <div className="flex items-center justify-center h-full">
      <p style={{ color: 'rgba(232,230,240,0.4)' }}>Select a topic from the sidebar</p>
    </div>
  )

  const saveLabel =
    saveStatus === 'saving'  ? 'Saving…' :
    saveStatus === 'unsaved' ? 'Unsaved' :
    savedAt                  ? `Saved ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` :
    topic.lastEditedAt       ? `Edited ${new Date(topic.lastEditedAt).toLocaleDateString()}` : 'Saved'

  const canGoBack = history.length >= 2

  return (
    <div className="flex flex-col">
      {/* ── Sticky header + title block ──
          Stays pinned to the top of the scroll container (<main>) while the
          editor content below scrolls underneath it. */}
      <div className="sticky top-0 z-20" style={{ background: '#0a0a12' }}>
        <div className="flex items-center gap-3 px-6 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,18,0.92)', backdropFilter: 'blur(8px)' }}>

          {/* Back button — always shows, goes to prev topic or subject */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-xs"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(232,230,240,0.55)'
            }}
            title={canGoBack ? 'Previous topic' : 'Back to subject'}
          >
            <ArrowLeft size={13} />
            {canGoBack ? 'Back' : 'Subject'}
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs flex-1 min-w-0" style={{ color: 'rgba(232,230,240,0.35)' }}>
            <button onClick={() => setActivePage('dashboard')} className="hover:text-blue-400 transition-colors truncate">
              {workspace?.name}
            </button>
            <ChevronRight size={11} />
            <button onClick={() => setActivePage('subject')} className="hover:text-blue-400 transition-colors truncate">
              {subject?.name}
            </button>
            <ChevronRight size={11} />
            <span style={{ color: 'rgba(232,230,240,0.7)' }} className="truncate">{topic.name}</span>
          </div>

          {/* Save indicator */}
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg shrink-0 transition-all ${
            saveStatus === 'saving'  ? 'text-blue-400 bg-blue-400/10' :
            saveStatus === 'unsaved' ? 'text-amber-400 bg-amber-400/10' :
            'text-emerald-400 bg-emerald-400/10'
          }`}>
            <Save size={11} />
            {saveLabel}
          </div>

          {/* Tags display */}
          {topic.tags.length > 0 && (
            <div className="hidden sm:flex gap-1 shrink-0">
              {topic.tags.slice(0, 2).map(t => (
                <span key={t} className="tag-pill" style={{ fontSize: '10px', padding: '1px 6px' }}>{t}</span>
              ))}
            </div>
          )}

          {/* Pin */}
          <button
            onClick={async () => { await updateTopic(topic.id, { pinned: !topic.pinned }) }}
            className={`p-1.5 rounded-lg transition-all shrink-0 ${topic.pinned ? 'text-gold-400 bg-gold-400/10' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
            title={topic.pinned ? 'Unpin' : 'Pin topic'}
          >
            <Pin size={15} />
          </button>

          {/* Tag edit */}
          <button
            onClick={() => { setTagInput(topic.tags.join(', ')); setShowTagModal(true) }}
            className="p-1.5 rounded-lg hover:bg-white/8 transition-colors shrink-0"
            style={{ color: 'rgba(232,230,240,0.4)' }}
            title="Edit tags"
          >
            <Tag size={15} />
          </button>

          {/* More menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-1.5 rounded-lg hover:bg-white/8 transition-colors"
              style={{ color: 'rgba(232,230,240,0.4)' }}
            >
              <MoreHorizontal size={15} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 w-44 glass-card py-1 z-30 shadow-2xl"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  onClick={() => { setRenameValue(topic.name); setRenamingTopic(true); setMenuOpen(false) }}
                  className="w-full px-4 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2"
                  style={{ color: 'rgba(232,230,240,0.7)' }}
                >
                  <Edit2 size={12} />Rename
                </button>
                <button
                  onClick={async () => { await updateTopic(topic.id, { archived: !topic.archived }); setMenuOpen(false) }}
                  className="w-full px-4 py-2 text-xs text-left hover:bg-white/5 flex items-center gap-2"
                  style={{ color: 'rgba(232,230,240,0.7)' }}
                >
                  <Archive size={12} />{topic.archived ? 'Unarchive' : 'Archive'}
                </button>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                <button
                  onClick={() => { setMenuOpen(false); setShowDeleteConfirm(true) }}
                  className="w-full px-4 py-2 text-xs text-left hover:bg-red-500/10 flex items-center gap-2 text-red-400"
                >
                  <Trash2 size={12} />Delete Permanently
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Topic title (editable inline) — part of the sticky block ── */}
        <div className="px-12 pt-6 pb-4" style={{ background: '#0a0a12', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {renamingTopic ? (
            <div className="flex items-center gap-2">
              <input
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenamingTopic(false) }}
                className="font-cinzel text-2xl font-semibold bg-transparent border-b-2 outline-none flex-1"
                style={{ color: '#fde68a', borderColor: 'rgba(147,197,253,0.4)', caretColor: '#93c5fd' }}
                autoFocus
              />
              <button onClick={handleRename} className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors">
                <Check size={16} />
              </button>
              <button onClick={() => setRenamingTopic(false)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/title cursor-pointer" onClick={() => { setRenameValue(topic.name); setRenamingTopic(true) }}>
              <h1 className="font-cinzel text-2xl font-semibold" style={{ color: '#fde68a' }}>{topic.name}</h1>
              <Edit2 size={14} className="opacity-0 group-hover/title:opacity-60 transition-opacity" style={{ color: 'rgba(232,230,240,0.5)' }} />
            </div>
          )}
          {topic.tags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {topic.tags.map(t => <span key={t} className="tag-pill">{t}</span>)}
            </div>
          )}
        </div>

        {/* Toolbar lifted here — same sticky block as title, zero gap possible */}
        {toolbar}
      </div>

      {/* ── Rich editor content — toolbar above is rendered via renderToolbar ── */}
      <RichEditor
        key={topic.id}
        content={content}
        onChange={handleChange}
        placeholder="Begin writing your knowledge here…"
        renderToolbar={setToolbar}
      />

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this topic?"
        message={`This will permanently delete "${topic.name}". This action cannot be undone.`}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => { setShowDeleteConfirm(false); handleDelete(true) }}
      />

      {/* ── Rename Modal ── */}
      <Modal open={renamingTopic} onClose={() => setRenamingTopic(false)} title="Rename Topic">
        <div className="space-y-4">
          <input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenamingTopic(false) }}
            className="cosmic-input"
            placeholder="Topic name…"
            autoFocus
          />
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setRenamingTopic(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'rgba(232,230,240,0.5)' }}>Cancel</button>
            <button onClick={handleRename} className="gold-btn text-sm px-5 py-2">Rename</button>
          </div>
        </div>
      </Modal>

      {/* ── Tag Modal ── */}
      <Modal open={showTagModal} onClose={() => setShowTagModal(false)} title="Edit Tags">
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(232,230,240,0.6)' }}>Tags (comma separated)</label>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              className="cosmic-input"
              placeholder="#Exam, #Important, #Revision"
              onKeyDown={e => e.key === 'Enter' && handleSaveTags()}
              autoFocus
            />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setShowTagModal(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'rgba(232,230,240,0.5)' }}>Cancel</button>
            <button onClick={handleSaveTags} className="gold-btn text-sm px-5 py-2">Save Tags</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
