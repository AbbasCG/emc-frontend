import { useState } from 'react'
import { FileJson, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { exportAdminAuditLogs } from '@/api/adminAuditLogsApi'
import type { AdminAuditLogQuery } from '@/api/adminAuditLogsApi'
import type { ExportFormat } from './constants'

const FORMATS: { id: ExportFormat; label: string; icon: typeof FileText }[] = [
  { id: 'csv', label: 'CSV', icon: FileText },
  { id: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  { id: 'pdf', label: 'PDF', icon: FileText },
  { id: 'json', label: 'JSON', icon: FileJson },
]

export function useAuditLogsExport(apiQuery: AdminAuditLogQuery) {
  const [exporting, setExporting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const exportAs = async (format: ExportFormat) => {
    setExporting(true)
    setMenuOpen(false)
    try {
      await exportAdminAuditLogs(apiQuery, format)
    } finally {
      setExporting(false)
    }
  }

  return { exporting, menuOpen, setMenuOpen, exportAs, formats: FORMATS }
}

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
