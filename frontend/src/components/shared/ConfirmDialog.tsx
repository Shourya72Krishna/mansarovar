import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

const CONFIRM_PHRASE = 'I confirm'

/**
 * Destructive-action confirmation dialog.
 * The confirm button stays disabled until the user types the exact phrase
 * "I confirm" — this guards against double-clicks / accidental deletes of
 * topics, subjects, workspaces, or anything else that can't be undone.
 */
export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Delete', onConfirm, onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')

  // Reset the typed value whenever the dialog opens/closes so a stray
  // "I confirm" doesn't carry over to the next delete prompt.
  useEffect(() => {
    if (!open) setTyped('')
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  const canConfirm = typed.trim() === CONFIRM_PHRASE

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 glass-card p-6"
            style={{ width: '440px', maxWidth: '100%', border: '1px solid rgba(248,113,113,0.25)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(248,113,113,0.12)' }}>
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <h2 className="font-cinzel text-lg font-semibold text-red-300">{title}</h2>
            </div>

            <p className="text-sm mb-4" style={{ color: 'rgba(232,230,240,0.6)' }}>
              {message}
            </p>

            <p className="text-xs mb-2" style={{ color: 'rgba(232,230,240,0.45)' }}>
              Are you sure? Type <span className="text-red-300 font-medium">{CONFIRM_PHRASE}</span> below to proceed.
            </p>

            <input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canConfirm) onConfirm() }}
              placeholder={CONFIRM_PHRASE}
              className="cosmic-input"
              style={{ borderColor: canConfirm ? 'rgba(74,222,128,0.4)' : undefined }}
              autoFocus
            />

            <div className="flex gap-3 justify-end pt-5">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: 'rgba(232,230,240,0.5)' }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={!canConfirm}
                className="px-5 py-2 text-sm rounded-lg font-medium transition-all"
                style={{
                  background: canConfirm ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.04)',
                  color: canConfirm ? '#f87171' : 'rgba(232,230,240,0.3)',
                  border: `1px solid ${canConfirm ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  cursor: canConfirm ? 'pointer' : 'not-allowed',
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
