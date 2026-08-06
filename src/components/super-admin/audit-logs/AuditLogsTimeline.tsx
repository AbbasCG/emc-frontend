import { motion } from 'framer-motion'
import type { AdminAuditLogEntry } from '@/types/adminAudit'
import AuditLogCard from './AuditLogCard'
import { groupEntriesByDay } from './formatters'

export default function AuditLogsTimeline({
  entries,
  onOpenDetail,
}: {
  entries: AdminAuditLogEntry[]
  onOpenDetail: (entry: AdminAuditLogEntry) => void
}) {
  const groups = groupEntriesByDay(entries)

  return (
    <div className="space-y-6">
      {groups.map((group, gi) => (
        <section key={group.label}>
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: gi * 0.04 }}
            className="mb-3 flex items-center gap-3"
          >
            <h2 className="text-sm font-black text-deepBlue">{group.label}</h2>
            <div className="h-px flex-1 bg-slate-200" />
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">{group.items.length}</span>
          </motion.div>
          <div className="space-y-3">
            {group.items.map((entry, idx) => (
              <AuditLogCard key={String(entry.id)} entry={entry} index={idx} onOpenDetail={onOpenDetail} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
