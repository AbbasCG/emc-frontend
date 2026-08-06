import { motion } from 'framer-motion'
import type { AuditLogEntry } from '@/types/platform'

type Props = {
  entries: AuditLogEntry[]
}

export default function AuditTimeline({ entries }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="divide-y divide-slate-100">
        {entries.map((e, i) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.2) }}
            className="flex flex-wrap gap-4 p-5 hover:bg-[#F6F8FB]/80"
          >
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-deepBlue px-2 py-0.5 text-[11px] font-black text-white">{e.action}</span>
                <span className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-black text-slate-500 ring-1 ring-slate-100">
                  {e.entity_type} #{e.entity_id}
                </span>
              </div>
              <p className="text-sm font-black text-deepBlue">{e.user_name}</p>
              {e.summary && <p className="text-xs font-medium leading-6 text-slate-500">{e.summary}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end justify-center">
              <span className="rounded-full bg-customOrange/15 px-3 py-1 text-[11px] font-black text-deepBlue ring-1 ring-customOrange/25">
                الطابع الزمني
              </span>
              <span className="mt-2 text-xs font-bold text-slate-400" dir="ltr">
                {e.created_at}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
