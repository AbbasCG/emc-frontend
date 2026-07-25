import { Loader2 } from 'lucide-react'
import type { ExportFormat } from './constants'
import { FORMATS } from './useAuditLogsExport'

export function AuditLogsExportMenu({
  open,
  onClose,
  onExport,
  exporting,
}: {
  open: boolean
  onClose: () => void
  onExport: (format: ExportFormat) => void
  exporting: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        dir="rtl"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-black text-ink-500">تصدير السجلات</h3>
        <p className="mt-1 text-[12px] text-muted-500">يُطبَّق على المرشّحات الحالية (حتى 5,000 سجل)</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={exporting}
              onClick={() => onExport(f.id)}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <f.icon size={14} />}
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
