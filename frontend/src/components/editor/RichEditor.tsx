import { useEffect, useCallback, useState } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Minus, Link as LinkIcon, Image as ImageIcon, Table as TableIcon,
  Highlighter, Palette, Undo, Redo,
  Rows3, Columns3, Trash2, CornerDownLeft,
} from 'lucide-react'

interface RichEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  /** When provided, the toolbar is rendered through this instead of inline
   *  below the page's own sticky title block — this lets the toolbar live
   *  physically inside the SAME sticky container as the title (no separate
   *  `position: sticky` element of its own), so there's never a gap where
   *  the page background can flash through while scrolling. */
  renderToolbar?: (toolbar: React.ReactNode) => void
}

const ToolbarButton = ({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode
}) => (
  <button
    onMouseDown={e => { e.preventDefault(); onClick() }}
    title={title}
    className={`p-1.5 rounded transition-all shrink-0 ${active
      ? 'bg-blue-500/20 text-blue-300'
      : 'text-white/50 hover:text-white/80 hover:bg-white/8'
    }`}
  >
    {children}
  </button>
)

const Divider = () => (
  <div className="shrink-0" style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.08)', margin: '0 3px' }} />
)

const TEXT_COLORS = ['#ffffff', '#fbbf24', '#60a5fa', '#34d399', '#f87171', '#c084fc', '#fb923c', '#a78bfa']
const HIGHLIGHT_COLORS = ['rgba(251,191,36,0.3)', 'rgba(96,165,250,0.3)', 'rgba(52,211,153,0.3)', 'rgba(248,113,113,0.3)']

function Toolbar({ editor }: { editor: Editor }) {
  const [showColorPicker, setShowColorPicker]     = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)

  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }
  
  const addImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = (event: any) => {
        const imageUrl = event.target.result
        editor.chain().focus().setImage({ src: imageUrl }).run()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }
  
  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  return (
    <div
      className="flex items-center gap-0.5 px-3 py-2 flex-wrap"
      style={{
        background: 'rgba(8,8,15,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo size={14} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo size={14} /></ToolbarButton>
      <Divider />
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })} title="H1"><Heading1 size={14} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })} title="H2"><Heading2 size={14} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })} title="H3"><Heading3 size={14} /></ToolbarButton>
      <Divider />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')} title="Bold"><Bold size={14} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')} title="Italic"><Italic size={14} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')} title="Underline"><UnderlineIcon size={14} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')} title="Strikethrough"><Strikethrough size={14} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')} title="Inline Code"><Code size={14} /></ToolbarButton>
      <Divider />

      {/* Text color */}
      <div className="relative">
        <ToolbarButton onClick={() => { setShowColorPicker(v => !v); setShowHighlightPicker(false) }} title="Text Color">
          <Palette size={14} />
        </ToolbarButton>
        {showColorPicker && (
          <div className="absolute top-9 left-0 z-50 p-2 rounded-lg flex gap-1.5 flex-wrap w-36 shadow-2xl"
            style={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)' }}>
            {TEXT_COLORS.map(col => (
              <button key={col}
                onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(col).run(); setShowColorPicker(false) }}
                className="w-6 h-6 rounded-full border-2 border-transparent hover:border-white/30 transition-all"
                style={{ background: col }} />
            ))}
          </div>
        )}
      </div>

      {/* Highlight */}
      <div className="relative">
        <ToolbarButton onClick={() => { setShowHighlightPicker(v => !v); setShowColorPicker(false) }}
          active={editor.isActive('highlight')} title="Highlight">
          <Highlighter size={14} />
        </ToolbarButton>
        {showHighlightPicker && (
          <div className="absolute top-9 left-0 z-50 p-2 rounded-lg flex gap-1.5 flex-wrap w-28 shadow-2xl"
            style={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)' }}>
            {HIGHLIGHT_COLORS.map(col => (
              <button key={col}
                onMouseDown={e => { e.preventDefault(); editor.chain().focus().setHighlight({ color: col }).run(); setShowHighlightPicker(false) }}
                className="w-6 h-6 rounded border-2 border-white/10 hover:border-white/30 transition-all"
                style={{ background: col }} />
            ))}
            <button
              onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false) }}
              className="w-full text-xs px-1 py-0.5 rounded hover:bg-white/5 transition-colors text-center mt-1"
              style={{ color: 'rgba(232,230,240,0.5)' }}>Clear</button>
          </div>
        )}
      </div>
      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')} title="Bullet List"><List size={14} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')} title="Numbered List"><ListOrdered size={14} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive('taskList')} title="Checklist"><CheckSquare size={14} /></ToolbarButton>
      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')} title="Blockquote"><Quote size={14} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')} title="Code Block"><Code size={14} /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus size={14} /></ToolbarButton>
      <Divider />

      <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Insert Link"><LinkIcon size={14} /></ToolbarButton>
      <ToolbarButton onClick={addImage} title="Insert Image"><ImageIcon size={14} /></ToolbarButton>
      <ToolbarButton onClick={insertTable} title="Insert Table"><TableIcon size={14} /></ToolbarButton>

      {/* Table editing — only shows while the cursor is inside a table, since
          these commands (add/delete row or column) only make sense there. */}
      {editor.isActive('table') && (
        <>
          <Divider />
          <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row Below"><Rows3 size={14} /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Column Right"><Columns3 size={14} /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} title="Delete Current Row">
            <span className="relative inline-flex"><Rows3 size={14} /><Trash2 size={9} className="absolute -bottom-1 -right-1" /></span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete Current Column">
            <span className="relative inline-flex"><Columns3 size={14} /><Trash2 size={9} className="absolute -bottom-1 -right-1" /></span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table"><Trash2 size={14} /></ToolbarButton>
          <ToolbarButton onClick={() => exitTableBelow(editor)} title="Exit Table (write below)"><CornerDownLeft size={14} /></ToolbarButton>
        </>
      )}
    </div>
  )
}

// Moves the cursor out of a table into a normal paragraph right after it —
// inserting that paragraph first if the table is the last node in the doc
// (Tiptap doesn't guarantee a trailing paragraph after a table otherwise,
// which is why there was previously no way to "get out" of a table at the
// end of a topic).
function exitTableBelow(editor: Editor) {
  const { state } = editor
  const { $anchor } = state.selection
  for (let depth = $anchor.depth; depth > 0; depth--) {
    const node = $anchor.node(depth)
    if (node.type.name === 'table') {
      const afterTablePos = $anchor.after(depth)
      const nodeAfter = state.doc.resolve(afterTablePos).nodeAfter
      if (nodeAfter && nodeAfter.type.name === 'paragraph') {
        editor.chain().focus().setTextSelection(afterTablePos + 1).run()
      } else {
        editor.chain().focus()
          .insertContentAt(afterTablePos, { type: 'paragraph' })
          .setTextSelection(afterTablePos + 1)
          .run()
      }
      return
    }
  }
}

export default function RichEditor({ content, onChange, placeholder = 'Begin writing…', renderToolbar }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline, TextStyle, Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'ProseMirror focus:outline-none' },
      handleKeyDown: (view, event) => {
        if (event.key !== 'ArrowDown') return false
        const { state } = view
        const { $anchor } = state.selection
        for (let depth = $anchor.depth; depth > 0; depth--) {
          if ($anchor.node(depth).type.name === 'table') {
            // Only intercept if we're already in the table's last row —
            // otherwise let normal cell-to-cell navigation happen.
            const tableNode = $anchor.node(depth)
            const rowNode = $anchor.node(depth + 1)
            const lastRow = tableNode.lastChild
            if (rowNode === lastRow) {
              exitTableBelow(editor!)
              return true
            }
          }
        }
        return false
      },
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false)
    }
  }, [content])

  // Hand the toolbar up to the parent (TopicPage) so it can be placed
  // inside the same sticky wrapper as the title — re-runs whenever the
  // editor's selection/state changes so toolbar button active-states stay
  // in sync without the parent needing to know anything about tiptap.
  useEffect(() => {
    if (!editor || !renderToolbar) return
    const update = () => renderToolbar(<Toolbar editor={editor} />)
    update()
    editor.on('transaction', update)
    return () => { editor.off('transaction', update) }
  }, [editor, renderToolbar])

  if (!editor) return null

  return (
    <div onClick={() => editor.commands.focus()}>
      {/* If the parent isn't hoisting the toolbar (renderToolbar not given),
          fall back to rendering it inline right above the content — keeps
          this component usable standalone elsewhere in the app. */}
      {!renderToolbar && <Toolbar editor={editor} />}
      <div className="px-12 py-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
