import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { fetchPartnerPrograms } from '@/api/partnerPortalApi'
import EmptyState from '@/components/dashboard/EmptyState'
import type { PartnerProgramRow } from '@/types/platform'

export default function PartnerProgramsPage() {
  const [rows, setRows] = useState<PartnerProgramRow[]>([])
  useEffect(() => {
    let c = false
    ;(async () => {
      const r = await fetchPartnerPrograms()
      if (!c) setRows(r)
    })()
    return () => {
      c = true
    }
  }, [])

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h2 className="text-2xl font-black text-white">البرامج المشتركة</h2>
        <p className="mt-2 text-sm font-medium text-white/60">حالة التنفيذ وأحجام الدفعات.</p>
      </motion.div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <EmptyState title="لا برامج بعد" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-white/10 bg-white p-5 shadow-xl shadow-black/20"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-black text-deepBlue">{p.title}</h3>
                <span className="rounded-full bg-customOrange/15 px-3 py-1 text-[11px] font-black text-deepBlue ring-1 ring-customOrange/30">
                  {p.status}
                </span>
              </div>
              <p className="mt-3 text-xs font-bold text-slate-500">حجم الدفعة {p.cohort_size}</p>
              <p className="mt-1 text-xs font-bold text-slate-400">البداية {p.starts_at ?? 'غير محددة'}</p>
              {p.ends_at && <p className="mt-1 text-xs font-bold text-slate-400">النهاية {p.ends_at}</p>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
