import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { fetchAuditLogs } from '@/api/auditLogsApi'
import AuditTimeline from '@/components/platform/AuditTimeline'
import type { AuditLogEntry } from '@/types/platform'

export default function AdminAuditLogsPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [action, setAction] = useState('')
  const [entity, setEntity] = useState('')

  useEffect(() => {
    let c = false
    ;(async () => {
      const e = await fetchAuditLogs({
        action: action || undefined,
        entity: entity || undefined,
      })
      if (!c) setEntries(e)
    })()
    return () => {
      c = true
    }
  }, [action, entity])

  const filtered = useMemo(() => entries, [entries])

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Audit</p>
        <h1 className="text-2xl font-black text-deepBlue">سجل التدقيق</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">خط زمني بواجهة تشغيلية الفلاتر تُرسل للـ API عند توفر المسارات.</p>
      </motion.div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-3">
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none"
          placeholder="فلتر الإجراء"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <input
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none"
          placeholder="فلتر الكيان"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
        />
        <div className="flex items-center text-xs font-black text-slate-400">
          {filtered.length} حدثاً معروضاً
        </div>
      </div>

      <AuditTimeline entries={filtered} />
    </div>
  )
}
