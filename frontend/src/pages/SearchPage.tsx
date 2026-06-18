import { useState, useMemo, useEffect } from 'react'
import { Search, Hash, BookOpen, FolderOpen, FileText, Image, Clock } from 'lucide-react'
import { useStore } from '@/store'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

type FilterType = 'all' | 'workspace' | 'subject' | 'topic' | 'pdf'

export default function SearchPage() {
  const {
    workspaces, subjects, topics, pdfs,
    setActiveWorkspace, setActiveSubject, setActiveTopic, setActivePage,
    fetchSubjects, fetchTopics, fetchPdfs,
  } = useStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [loadingIndex, setLoadingIndex] = useState(false)

  // Topics/PDFs only ever load per-subject as you click around the app, so
  // search misses anything you haven't visited yet this session. Pull in
  // every subject's topics + PDFs once, up front, so search covers the
  // whole vault regardless of where you've been.
  useEffect(() => {
    let cancelled = false
    const loadEverything = async () => {
      setLoadingIndex(true)
      await fetchSubjects()
      if (cancelled) return
      const allSubjects = useStore.getState().subjects.filter(s => !s.archived)
      await Promise.all(
        allSubjects.flatMap(s => [fetchTopics(s.id), fetchPdfs(s.id)])
      )
      if (!cancelled) setLoadingIndex(false)
    }
    loadEverything()
    return () => { cancelled = true }
  }, [])

  const flatTopics = useMemo(() => {
    const flatten = (ts: typeof topics, result: typeof topics = []): typeof topics => {
      ts.forEach(t => { result.push(t); if (t.children) flatten(t.children, result) })
      return result
    }
    return flatten(topics)
  }, [topics])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()

    const all: { type: FilterType; id: string; name: string; excerpt?: string; path: string[]; updatedAt: string }[] = []

    if (filter === 'all' || filter === 'workspace') {
      workspaces.filter(w => !w.archived && w.name.toLowerCase().includes(q)).forEach(w => {
        all.push({ type: 'workspace', id: w.id, name: w.name, path: [], updatedAt: w.updatedAt })
      })
    }

    if (filter === 'all' || filter === 'subject') {
      subjects.filter(s => !s.archived && (
        s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q))
      )).forEach(s => {
        const ws = workspaces.find(w => w.id === s.workspaceId)
        all.push({ type: 'subject', id: s.id, name: s.name, excerpt: s.description, path: [ws?.name || ''], updatedAt: s.updatedAt })
      })
    }

    if (filter === 'all' || filter === 'topic') {
      flatTopics.filter(t => !t.archived && (
        t.name.toLowerCase().includes(q) ||
        t.contentPreview?.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      )).forEach(t => {
        const sub = subjects.find(s => s.id === t.subjectId)
        const ws = workspaces.find(w => w.id === sub?.workspaceId)
        all.push({
          type: 'topic', id: t.id, name: t.name,
          excerpt: t.contentPreview,
          path: [ws?.name || '', sub?.name || ''],
          updatedAt: t.updatedAt
        })
      })
    }

    if (filter === 'all' || filter === 'pdf') {
      pdfs.filter(p => p.name.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q))).forEach(p => {
        const sub = subjects.find(s => s.id === p.subjectId)
        const ws = workspaces.find(w => w.id === sub?.workspaceId)
        all.push({
          type: 'pdf', id: p.id, name: p.name,
          path: [ws?.name || '', sub?.name || ''],
          updatedAt: p.updatedAt
        })
      })
    }

    return all.slice(0, 50)
  }, [query, filter, workspaces, subjects, flatTopics, pdfs])

  const typeIcons: Record<FilterType, any> = {
    all: Search, workspace: FolderOpen, subject: BookOpen, topic: Hash, pdf: FileText,
  }
  const typeColors: Record<FilterType, string> = {
    all: '#fbbf24', workspace: '#7c3aed', subject: '#2563eb', topic: '#0d9488', pdf: '#d97706',
  }

  const handleResultClick = (r: typeof results[0]) => {
    if (r.type === 'workspace') { setActiveWorkspace(r.id); setActivePage('workspace') }
    else if (r.type === 'subject') { setActiveSubject(r.id); setActivePage('subject') }
    else if (r.type === 'topic') { setActiveTopic(r.id); setActivePage('topic') }
  }

  const filters: FilterType[] = ['all', 'workspace', 'subject', 'topic', 'pdf']

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-cinzel text-2xl font-semibold mb-1" style={{ color: '#fde68a' }}>Search</h1>
        <p className="text-sm" style={{ color: 'rgba(232,230,240,0.4)' }}>Search across workspaces, subjects, topics, and files</p>
      </motion.div>

      {/* Search box */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(232,230,240,0.4)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="cosmic-input pl-12 py-3.5 text-base"
          placeholder="Search your knowledge vault..."
          autoFocus
          style={{ fontSize: '16px' }}
        />
        {query && (
          <button onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors"
            style={{ color: 'rgba(232,230,240,0.4)' }}>Clear</button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {filters.map(f => {
          const Icon = typeIcons[f]
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all capitalize ${
                filter === f
                  ? 'bg-gold-500/15 text-gold-400 border border-gold-400/20'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
              style={{ color: filter === f ? '#fbbf24' : 'rgba(232,230,240,0.5)' }}>
              <Icon size={13} />
              {f}
            </button>
          )
        })}
      </div>

      {loadingIndex && (
        <p className="text-xs mb-4 -mt-2" style={{ color: 'rgba(232,230,240,0.3)' }}>
          Indexing your vault…
        </p>
      )}

      {/* Results */}
      <AnimatePresence mode="wait">
        {!query ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-20">
            <span className="text-5xl mb-4 animate-float">🔭</span>
            <p className="font-cinzel text-lg" style={{ color: 'rgba(232,230,240,0.4)' }}>Begin your search</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(232,230,240,0.25)' }}>Type to search across all your knowledge</p>
          </motion.div>
        ) : results.length === 0 ? (
          <motion.div key="no-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-20">
            <span className="text-5xl mb-4">🌌</span>
            <p className="font-cinzel text-lg" style={{ color: 'rgba(232,230,240,0.4)' }}>Nothing found</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(232,230,240,0.25)' }}>Try different keywords or broaden your search</p>
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-xs mb-4" style={{ color: 'rgba(232,230,240,0.35)' }}>
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </p>
            <div className="space-y-2">
              {results.map((r, i) => {
                const Icon = typeIcons[r.type]
                const color = typeColors[r.type]
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleResultClick(r)}
                    className="glass-card-hover p-4 cursor-pointer flex items-start gap-4"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium" style={{ color: 'rgba(232,230,240,0.9)' }}>
                          {r.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: `${color}15`, color }}>
                          {r.type}
                        </span>
                      </div>
                      {r.path.length > 0 && (
                        <div className="flex items-center gap-1 text-xs mb-1" style={{ color: 'rgba(232,230,240,0.35)' }}>
                          {r.path.filter(Boolean).map((p, pi) => (
                            <span key={pi} className="flex items-center gap-1">
                              {pi > 0 && <span>›</span>}
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                      {r.excerpt && (
                        <p className="text-xs line-clamp-1" style={{ color: 'rgba(232,230,240,0.45)' }}>{r.excerpt}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs shrink-0" style={{ color: 'rgba(232,230,240,0.3)' }}>
                      <Clock size={11} />
                      {formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
