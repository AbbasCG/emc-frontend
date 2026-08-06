import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ExternalLink, X } from 'lucide-react'

export type LmsPreviewState =
  | { kind: 'idle' }
  | { kind: 'loading'; label: string }
  | { kind: 'open'; objectUrl: string; fileName: string; mime: string }
  | { kind: 'error'; message: string }

type Props = {
  state: LmsPreviewState
  onClose: () => void
}

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/')
}

function isPdfMime(mime: string): boolean {
  return mime === 'application/pdf' || mime === 'application/x-pdf'
}

export function LmsPreviewModal({ state, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state.kind === 'idle') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [state.kind, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {state.kind !== 'idle' ?
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-modal-overlay flex items-center justify-center bg-[#0F172A]/60 p-4 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === overlayRef.current) onClose()
          }}
          role="dialog"
          aria-modal
          aria-label="معاينة الملف"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl"
            style={{ height: 'min(88vh, 920px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#22334A]/8 bg-gradient-to-l from-[#22334A]/5 to-white px-5 py-3">
              <p className="truncate text-sm font-black text-[#22334A]">
                {state.kind === 'open' ? state.fileName : state.kind === 'loading' ? 'جاري التحميل…' : 'معاينة'}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {state.kind === 'open' ?
                  <a
                    href={state.objectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-xl border border-[#22334A]/10 px-2.5 py-2 text-[11px] font-black text-[#22334A]/55 transition hover:border-[#2691C2]/30 hover:text-[#2691C2]"
                    title="فتح في تبويب جديد"
                  >
                    <ExternalLink size={13} />
                  </a>
                : null}
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[#22334A]/10 text-[#22334A]/60 transition hover:bg-[#22334A]/5"
                  aria-label="إغلاق"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-[#f8fafc]">
              {state.kind === 'loading' ?
                <div className="flex h-full flex-col items-center justify-center gap-3 text-[#22334A]/50">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2691C2]/20 border-t-[#2691C2]" />
                  <p className="text-sm font-semibold">{state.label}</p>
                </div>
              : state.kind === 'error' ?
                <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-rose-600">
                  <AlertTriangle size={36} className="opacity-60" />
                  <p className="text-center text-sm font-semibold">{state.message}</p>
                </div>
              : isImageMime(state.mime) ?
                <div className="flex h-full items-center justify-center p-4">
                  <img src={state.objectUrl} alt={state.fileName} className="max-h-full max-w-full rounded-lg object-contain shadow-lg" />
                </div>
              : isPdfMime(state.mime) ?
                <embed
                  src={state.objectUrl}
                  type="application/pdf"
                  className="h-full w-full border-0"
                  title={state.fileName}
                />
              : state.mime === 'text/plain' ?
                <iframe src={state.objectUrl} className="h-full w-full border-0 bg-white" title={state.fileName} />
              : (
                <iframe
                  src={state.objectUrl}
                  className="h-full w-full border-0 bg-white"
                  title={state.fileName}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      : null}
    </AnimatePresence>,
    document.body,
  )
}
