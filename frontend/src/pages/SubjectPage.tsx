import { useState, useEffect, useRef } from 'react'
import { Plus, Star, FileText, Image, Video, Layers, Hash, Pin, Search, Upload, Trash2, X, Edit2, Check } from 'lucide-react'
import { useStore } from '@/store'
import { motion } from 'framer-motion'
import Modal from '@/components/shared/Modal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { api } from '@/services/api'
import { appConfig } from '@/config/appConfig'
import type { Topic } from '@/types'
import { ChevronRight } from 'lucide-react'

type TabId = 'topics' | 'pdfs' | 'images' | 'videos' | 'all-media'

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'topics',    label: 'Topics',    icon: Hash     },
  { id: 'pdfs',      label: 'PDFs',      icon: FileText },
  { id: 'images',    label: 'Images',    icon: Image    },
  { id: 'videos',    label: 'Videos',    icon: Video    },
  { id: 'all-media', label: 'All Media', icon: Layers   },
]

function TopicRow({ topic, depth = 0, onSelect, onRename }: { topic: Topic; depth?: number; onSelect: (id: string) => void; onRename?: (id: string, name: string) => void }) {
  const [expanded, setExpanded] = useState(depth < 1)
  const hasChildren = topic.children && topic.children.length > 0

  return (
    <div>
      <div
        className="group flex items-center gap-2 py-2.5 px-3 rounded-lg cursor-pointer transition-all hover:bg-white/4"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => onSelect(topic.id)}
      >
        {hasChildren ? (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
            className="p-0.5 rounded hover:bg-white/10 transition-colors shrink-0"
            style={{ color: 'rgba(232,230,240,0.4)' }}
          >
            <ChevronRight size={13} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <div className="w-5 shrink-0" />
        )}

        <div className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: topic.pinned ? '#fbbf24' : 'rgba(232,230,240,0.2)' }} />

        <span className="flex-1 text-sm" style={{ color: 'rgba(232,230,240,0.8)' }}>{topic.name}</span>

        {topic.tags.map(t => (
          <span key={t} className="tag-pill hidden group-hover:inline-flex" style={{ fontSize: '10px', padding: '1px 6px' }}>{t}</span>
        ))}

        {topic.pinned && <Pin size={11} className="text-gold-500/60 shrink-0" />}

        {onRename && (
          <button
            onClick={e => { e.stopPropagation(); onRename(topic.id, topic.name) }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 shrink-0"
            style={{ color: 'rgba(232,230,240,0.4)' }}
            title="Rename"
          >
            <Edit2 size={11} />
          </button>
        )}

        <span className="text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'rgba(232,230,240,0.3)' }}>
          {topic.versionCount} rev
        </span>
      </div>

      {expanded && hasChildren && (
        <div>
          {topic.children!.map(child => (
            <TopicRow key={child.id} topic={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SubjectPage() {
  const { subjects, topics, pdfs, activeSubjectId, activeWorkspaceId, user, setActiveSubject, setActiveTopic, setActivePage, addTopic, updateSubject, updateTopic, fetchTopics, fetchPdfs, fetchSubjects } = useStore()

  const subject = subjects.find(s => s.id === activeSubjectId)

  const [tab, setTab]                   = useState<TabId>('topics')
  const [search, setSearch]             = useState('')
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [renamingTopicId, setRenamingTopicId] = useState<string | null>(null)
  const [renameTopicValue, setRenameTopicValue] = useState('')
  const [selectedPdf, setSelectedPdf] = useState<any | null>(null)

  const handleRenameTopic = async (id: string) => {
    if (!renameTopicValue.trim()) { setRenamingTopicId(null); return }
    await updateTopic(id, { name: renameTopicValue.trim() })
    setRenamingTopicId(null)
  }
  const [newTopicName, setNewTopicName] = useState('')
  const [newTopicTags, setNewTopicTags] = useState('')
  const [creatingTopic, setCreatingTopic] = useState(false)
  const [createTopicError, setCreateTopicError] = useState('')

  // PDF upload state
  const [showPdfUpload, setShowPdfUpload]   = useState(false)
  const [pdfUploading, setPdfUploading]     = useState(false)
  const [pdfUploadError, setPdfUploadError] = useState('')
  const [pdfFile, setPdfFile]               = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (activeSubjectId) {
      fetchTopics(activeSubjectId)
      fetchPdfs(activeSubjectId)
    }
  }, [activeSubjectId])

  if (!subject) return (
    <div className="flex items-center justify-center h-full">
      <p style={{ color: 'rgba(232,230,240,0.4)' }}>Select a subject</p>
    </div>
  )

  const allSubTopics = topics.filter(t => t.subjectId === activeSubjectId && !t.archived)
  const topicMap = new Map(allSubTopics.map(t => ({ ...t, children: [] as Topic[] })).map(t => [t.id, t]))
  topicMap.forEach(t => {
    if (t.parentId && topicMap.has(t.parentId)) {
      topicMap.get(t.parentId)!.children.push(t)
    }
  })
  const subTopics = Array.from(topicMap.values()).filter(t => !t.parentId)
  const subPdfs = pdfs.filter(p => p.subjectId === activeSubjectId)
  const filteredTopics = search
    ? subTopics.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : subTopics

  const handleCreateTopic = async () => {
    const trimmedName = newTopicName.trim()
    if (!trimmedName || creatingTopic) return

    // Instant feedback before even hitting the store/API — same name among
    // this subject's root-level topics (case-insensitive) isn't allowed.
    const duplicate = allSubTopics.some(t =>
      !t.parentId && !t.archived && t.name.trim().toLowerCase() === trimmedName.toLowerCase()
    )
    if (duplicate) {
      setCreateTopicError('A topic with this name already exists in this subject.')
      return
    }

    setCreatingTopic(true)
    setCreateTopicError('')
    try {
      const created = await addTopic({
        subjectId: activeSubjectId!,
        name: trimmedName,
        tags: newTopicTags.split(',').map(t => t.trim()).filter(Boolean),
      })
      if (!created) {
        // Store-level guard caught a duplicate or an identical in-flight
        // request — most likely from a double-click.
        setCreateTopicError('A topic with this name already exists in this subject.')
        return
      }
      setNewTopicName('')
      setNewTopicTags('')
      setShowNewTopic(false)
      // Open the new topic immediately instead of leaving the user back on
      // the subject page wondering whether anything happened.
      handleTopicSelect(created.id)
    } catch (e) {
      console.error('Create topic failed:', e)
      setCreateTopicError('Could not create topic. Please try again.')
    } finally {
      setCreatingTopic(false)
    }
  }

  const handleTopicSelect = (id: string) => {
    setActiveSubject(activeSubjectId!)
    setActiveTopic(id)
    setActivePage('topic')
  }

  const handlePdfUpload = async () => {
    if (!pdfFile || !activeSubjectId) return
    if (!user?.driveConnected) {
      setPdfUploadError('Please connect Google Drive in Settings first.')
      return
    }
    setPdfUploading(true)
    setPdfUploadError('')
    try {
      const formData = new FormData()
      formData.append('file', pdfFile)
      formData.append('subject_id', activeSubjectId)
      await api.pdfs.upload(formData)
      await fetchPdfs(activeSubjectId)
      setPdfFile(null)
      setShowPdfUpload(false)
      setTab('pdfs')
    } catch (e: any) {
      setPdfUploadError(e?.message ?? 'Upload failed. Try again.')
    } finally {
      setPdfUploading(false)
    }
  }

  const [deletePdfId, setDeletePdfId] = useState<string | null>(null)

  const handleDeletePdf = async (pdfId: string) => {
    try {
      await api.pdfs.delete(pdfId)
      await fetchPdfs(activeSubjectId!)
      await fetchSubjects(activeWorkspaceId!)
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-0">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl glass-card"
              style={{ borderColor: `${subject.color || '#2563eb'}30` }}>
              {subject.icon}
            </div>
            <div>
              <h1 className="font-cinzel text-2xl font-semibold" style={{ color: '#fde68a' }}>{subject.name}</h1>
              {subject.description && (
                <p className="text-sm mt-0.5" style={{ color: 'rgba(232,230,240,0.45)' }}>{subject.description}</p>
              )}
              {subject.tags.length > 0 && (
                <div className="flex gap-1.5 mt-1.5">
                  {subject.tags.map(t => <span key={t} className="tag-pill">{t}</span>)}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => { await updateSubject(subject.id, { pinned: !subject.pinned }) }}
              className={`p-2 rounded-lg transition-all ${subject.pinned ? 'text-gold-400 bg-gold-400/10' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
            >
              <Star size={16} />
            </button>
            {tab === 'topics' && (
              <button onClick={() => setShowNewTopic(true)} className="gold-btn flex items-center gap-2 text-sm">
                <Plus size={15} /> New Topic
              </button>
            )}
            {tab === 'pdfs' && (
              <button onClick={() => { setPdfFile(null); setPdfUploadError(''); setShowPdfUpload(true) }}
                className="gold-btn flex items-center gap-2 text-sm">
                <Upload size={15} /> Upload PDF
              </button>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-all -mb-px ${
                tab === t.id ? 'text-gold-400 border-gold-400' : 'border-transparent hover:text-white/70'
              }`}
              style={{ color: tab === t.id ? '#fbbf24' : 'rgba(232,230,240,0.45)' }}
            >
              <t.icon size={14} />
              {t.label}
              {t.id === 'topics' && (
                <span className="ml-1 text-xs rounded-full px-1.5 py-0.5"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(232,230,240,0.5)' }}>
                  {subTopics.length}
                </span>
              )}
              {t.id === 'pdfs' && (
                <span className="ml-1 text-xs rounded-full px-1.5 py-0.5"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(232,230,240,0.5)' }}>
                  {subPdfs.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 thin-scroll">

        {/* Topics Tab */}
        {tab === 'topics' && (
          <div>
            <div className="relative mb-4 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(232,230,240,0.3)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="cosmic-input pl-9 text-sm"
                placeholder="Search topics..."
              />
            </div>

            {filteredTopics.length === 0 ? (
              <div className="flex flex-col items-center py-20 glass-card">
                <span className="text-4xl mb-3">📝</span>
                <p className="font-cinzel text-base mb-1" style={{ color: 'rgba(232,230,240,0.5)' }}>No topics yet</p>
                <p className="text-sm mb-5" style={{ color: 'rgba(232,230,240,0.3)' }}>Start writing your first note</p>
                <button onClick={() => setShowNewTopic(true)} className="gold-btn flex items-center gap-2 text-sm">
                  <Plus size={15} /> Create Topic
                </button>
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                {filteredTopics.map(topic => (
                  <TopicRow
                    key={topic.id}
                    topic={topic}
                    onSelect={handleTopicSelect}
                    onRename={(id, name) => { setRenamingTopicId(id); setRenameTopicValue(name) }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* PDFs Tab */}
        {tab === 'pdfs' && (
          <div>
            {!user?.driveConnected && (
              <div className="glass-card p-4 mb-4 flex items-center gap-3"
                style={{ borderColor: 'rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.05)' }}>
                <span className="text-lg">⚠️</span>
                <p className="text-sm" style={{ color: 'rgba(251,191,36,0.8)' }}>
                  Google Drive not connected. Go to <strong>Settings</strong> to connect Drive before uploading PDFs.
                </p>
              </div>
            )}
            {subPdfs.length === 0 ? (
              <div className="flex flex-col items-center py-20 glass-card">
                <span className="text-4xl mb-3">📄</span>
                <p className="font-cinzel text-base mb-1" style={{ color: 'rgba(232,230,240,0.5)' }}>No PDFs uploaded</p>
                <p className="text-sm mb-5" style={{ color: 'rgba(232,230,240,0.3)' }}>Upload your study materials</p>
                <button
                  onClick={() => { setPdfFile(null); setPdfUploadError(''); setShowPdfUpload(true) }}
                  className="gold-btn flex items-center gap-2 text-sm"
                >
                  <Upload size={15} /> Upload PDF
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {subPdfs.map(pdf => (
                  <div key={pdf.id} className="glass-card p-4 cursor-pointer" onClick={() => setSelectedPdf(pdf)}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-12 rounded flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.2)' }}>
                        <FileText size={18} style={{ color: '#d97706' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'rgba(232,230,240,0.85)' }}>{pdf.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(232,230,240,0.4)' }}>
                          {Math.round((pdf.size ?? 0) / 1024 / 1024 * 10) / 10} MB
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {pdf.driveViewUrl && (
                            <button
                              onClick={e => { e.stopPropagation(); setSelectedPdf(pdf) }}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/5"
                              style={{ color: 'rgba(147,197,253,0.7)', border: '1px solid rgba(147,197,253,0.15)' }}
                            >
                              📄 View PDF
                            </button>
                          )}
                          <button
                            onClick={() => setDeletePdfId(pdf.id)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors hover:bg-red-500/10"
                            style={{ color: 'rgba(239,68,68,0.6)', border: '1px solid rgba(239,68,68,0.1)' }}
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Images Tab */}
        {tab === 'images' && (
          <div className="flex flex-col items-center py-20 glass-card">
            <span className="text-4xl mb-3">🖼️</span>
            <p className="font-cinzel text-base mb-1" style={{ color: 'rgba(232,230,240,0.5)' }}>No images yet</p>
            <p className="text-sm" style={{ color: 'rgba(232,230,240,0.3)' }}>Images uploaded in topics appear here</p>
          </div>
        )}

        {/* Videos Tab */}
        {tab === 'videos' && (
          <div className="flex flex-col items-center py-20 glass-card">
            <span className="text-4xl mb-3">🎬</span>
            <p className="font-cinzel text-base mb-1" style={{ color: 'rgba(232,230,240,0.5)' }}>No videos yet</p>
            <p className="text-sm" style={{ color: 'rgba(232,230,240,0.3)' }}>Videos uploaded in topics appear here</p>
          </div>
        )}

        {/* All Media */}
        {tab === 'all-media' && (
          <div>
            {subPdfs.length === 0 ? (
              <div className="flex flex-col items-center py-20 glass-card">
                <span className="text-4xl mb-3">📦</span>
                <p className="font-cinzel text-base mb-1" style={{ color: 'rgba(232,230,240,0.5)' }}>No media yet</p>
                <p className="text-sm" style={{ color: 'rgba(232,230,240,0.3)' }}>All files attached to this subject appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {subPdfs.map(pdf => (
                  <div key={pdf.id} className="glass-card-hover p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(217,119,6,0.15)' }}>
                      <FileText size={14} style={{ color: '#d97706' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'rgba(232,230,240,0.8)' }}>{pdf.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(232,230,240,0.4)' }}>
                        PDF · {Math.round((pdf.size ?? 0) / 1024 / 1024 * 10) / 10} MB
                      </p>
                    </div>
                    {pdf.driveViewUrl && (
                      <button
                        onClick={() => setSelectedPdf(pdf)}
                        className="p-1.5 rounded hover:bg-white/5 transition-colors"
                        style={{ color: 'rgba(147,197,253,0.4)' }}
                        title="View PDF"
                      >
                        <FileText size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rename Topic Modal */}
      <Modal open={!!renamingTopicId} onClose={() => setRenamingTopicId(null)} title="Rename Topic">
        <div className="space-y-4">
          <input
            value={renameTopicValue}
            onChange={e => setRenameTopicValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && renamingTopicId) handleRenameTopic(renamingTopicId); if (e.key === 'Escape') setRenamingTopicId(null) }}
            className="cosmic-input"
            placeholder="Topic name..."
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setRenamingTopicId(null)} className="px-4 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'rgba(232,230,240,0.5)' }}>Cancel</button>
            <button onClick={() => renamingTopicId && handleRenameTopic(renamingTopicId)} className="gold-btn text-sm px-5 py-2">Rename</button>
          </div>
        </div>
      </Modal>

      {/* In-app PDF Viewer Modal */}
      <Modal open={!!selectedPdf} onClose={() => setSelectedPdf(null)} title={selectedPdf?.name ?? ''} width="900px">
        <div style={{ height: '75vh', borderRadius: 8, overflow: 'hidden', background: '#0a0a12' }}>
          {selectedPdf?.driveViewUrl ? (
            <iframe
              src={selectedPdf.driveViewUrl.replace('/view', '/preview')}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="autoplay"
              title={selectedPdf.name}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p style={{ color: 'rgba(232,230,240,0.4)' }}>No preview available</p>
            </div>
          )}
        </div>
      </Modal>

      {/* New Topic Modal */}
      <Modal open={showNewTopic} onClose={() => { if (!creatingTopic) { setShowNewTopic(false); setCreateTopicError('') } }} title="New Topic">
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(232,230,240,0.6)' }}>Topic Name *</label>
            <input
              value={newTopicName}
              onChange={e => { setNewTopicName(e.target.value); setCreateTopicError('') }}
              className="cosmic-input"
              placeholder="e.g. SQL Joins, Backpropagation..."
              onKeyDown={e => e.key === 'Enter' && handleCreateTopic()}
              autoFocus
            />
            {createTopicError && (
              <p className="text-xs mt-1.5 text-red-400">{createTopicError}</p>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'rgba(232,230,240,0.6)' }}>Tags (comma separated)</label>
            <input
              value={newTopicTags}
              onChange={e => setNewTopicTags(e.target.value)}
              className="cosmic-input"
              placeholder="#Exam, #Important, #Revision..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={() => { setShowNewTopic(false); setCreateTopicError('') }}
              disabled={creatingTopic}
              className="px-4 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors disabled:opacity-40"
              style={{ color: 'rgba(232,230,240,0.5)' }}>
              Cancel
            </button>
            <button
              onClick={handleCreateTopic}
              disabled={creatingTopic || !newTopicName.trim()}
              className="gold-btn text-sm px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {creatingTopic ? 'Creating…' : 'Create Topic'}
            </button>
          </div>
        </div>
      </Modal>

      {/* PDF Upload Modal */}
      <Modal open={showPdfUpload} onClose={() => setShowPdfUpload(false)} title="Upload PDF">
        <div className="space-y-4">
          {!user?.driveConnected && (
            <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.8)', border: '1px solid rgba(251,191,36,0.15)' }}>
              ⚠️ Connect Google Drive in Settings before uploading.
            </div>
          )}

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') setPdfFile(f) }}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
            style={{
              borderColor: pdfFile ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)',
              background: pdfFile ? 'rgba(251,191,36,0.04)' : 'transparent',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setPdfFile(f) }}
            />
            {pdfFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={24} style={{ color: '#d97706' }} />
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: 'rgba(232,230,240,0.85)' }}>{pdfFile.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(232,230,240,0.4)' }}>
                    {Math.round(pdfFile.size / 1024 / 1024 * 10) / 10} MB
                  </p>
                </div>
                <button onClick={e => { e.stopPropagation(); setPdfFile(null) }}
                  className="ml-2 p-1 rounded hover:bg-white/10 transition-colors"
                  style={{ color: 'rgba(232,230,240,0.4)' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div>
                <Upload size={28} className="mx-auto mb-2" style={{ color: 'rgba(232,230,240,0.25)' }} />
                <p className="text-sm" style={{ color: 'rgba(232,230,240,0.5)' }}>
                  Click to choose or drag & drop a PDF
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(232,230,240,0.3)' }}>Max 200 MB</p>
              </div>
            )}
          </div>

          {pdfUploadError && (
            <p className="text-xs" style={{ color: '#ef4444' }}>{pdfUploadError}</p>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setShowPdfUpload(false)}
              className="px-4 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: 'rgba(232,230,240,0.5)' }}>
              Cancel
            </button>
            <button
              onClick={handlePdfUpload}
              disabled={!pdfFile || pdfUploading || !user?.driveConnected}
              className="gold-btn text-sm px-5 py-2 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {pdfUploading ? (
                <>
                  <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <><Upload size={14} /> Upload to Drive</>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete PDF Confirmation ── */}
      <ConfirmDialog
        open={!!deletePdfId}
        title="Delete this PDF?"
        message={`This will permanently delete "${subPdfs.find(p => p.id === deletePdfId)?.name ?? 'this file'}" from Drive. This action cannot be undone.`}
        onCancel={() => setDeletePdfId(null)}
        onConfirm={async () => { const id = deletePdfId!; setDeletePdfId(null); await handleDeletePdf(id) }}
      />
    </div>
  )
}
