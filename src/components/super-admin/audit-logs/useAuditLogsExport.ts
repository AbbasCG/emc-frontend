import { useState } from 'react'
import { FileJson, FileSpreadsheet, FileText } from 'lucide-react'
import { exportAdminAuditLogs } from '@/api/adminAuditLogsApi'
import type { AdminAuditLogQuery } from '@/api/adminAuditLogsApi'
import type { ExportFormat } from './constants'

export const FORMATS: { id: ExportFormat; label: string; icon: typeof FileText }[] = [
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
