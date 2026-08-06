import { useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReportTypeSlug } from '@/types/intelligence'

const TYPES: { id: ReportTypeSlug; label: string }[] = [
  { id: 'program', label: 'تقرير برنامج' },
  { id: 'course', label: 'تقرير دورة' },
  { id: 'workshop', label: 'تقرير ورشة' },
  { id: 'finance', label: 'تقرير مالي' },
  { id: 'quality', label: 'تقرير جودة' },
  { id: 'management', label: 'تقرير إدارة' },
  { id: 'partnership', label: 'تقرير شراكة' },
  { id: 'hr', label: 'تقرير موارد بشرية' },
]

export default function ReportGeneratorModal({
  open,
  onClose,
  onGenerate,
}: {
  open: boolean
  onClose: () => void
  onGenerate: (payload: { report_type: ReportTypeSlug; related_label?: string; title?: string }) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    try {
      await onGenerate({
        report_type: String(fd.get('report_type')) as ReportTypeSlug,
        related_label: String(fd.get('related_label') ?? '') || undefined,
        title: String(fd.get('title') ?? '') || undefined,
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="إغلاق"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            dir="rtl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed left-1/2 top-1/2 z-[60] w-[min(100%-2rem,440px)] -translate-x-1/2 -translate-y-1/2 rounded-[1.35rem] bg-white p-6 shadow-2xl ring-1 ring-deepBlue/[0.08]"
          >
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
              <h2 className="text-lg font-black text-deepBlue">إنشاء تقرير</h2>
            </div>
            <form onSubmit={submit} className="space-y-4 text-right">
              <label className="grid gap-2 text-xs font-black text-deepBlue">
                نوع التقرير
                <select name="report_type" required className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold">
                  {TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-black text-deepBlue">
                عنوان اختياري
                <input name="title" className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold" />
              </label>
              <label className="grid gap-2 text-xs font-black text-deepBlue">
                عنصر مرتبط (برنامج، دورة، ورشة...)
                <input name="related_label" className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold" />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-customBlue py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {busy ? 'جارٍ الإنشاء...' : 'توليد المعاينة'}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
