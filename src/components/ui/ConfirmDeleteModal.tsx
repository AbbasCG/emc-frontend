import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Trash2, X } from 'lucide-react'

type Props = {
  open: boolean
  title: string
  description: string
  itemLabel?: string
  busy?: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export default function ConfirmDeleteModal({
  open,
  title,
  description,
  itemLabel,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" dir="rtl">
          <motion.button
            type="button"
            aria-label="إغلاق"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0F172A]/55 backdrop-blur-sm"
            onClick={busy ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_28px_80px_-16px_rgba(15,23,42,0.35)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-100">
                  <Trash2 className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-[16px] font-black text-deepBlue">{title}</h2>
                  {itemLabel ? (
                    <p className="mt-0.5 text-[12px] font-bold text-slate-500">{itemLabel}</p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="إغلاق النافذة"
                className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="px-6 py-5 text-right">
              <p className="text-[13px] font-semibold leading-relaxed text-slate-600">{description}</p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onConfirm()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 text-[13px] font-black text-white transition hover:bg-rose-700 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {busy ? 'جاري الحذف...' : 'تأكيد الحذف'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onClose}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-[13px] font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
