import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { fetchPartnerReports } from '@/api/partnerPortalApi'
import PartnerReportCard from '@/components/platform/PartnerReportCard'

export default function PartnerReportsPage() {
  const [rows, setRows] = useState<{ id: number; title: string; at: string }[]>([])
  useEffect(() => {
    let c = false
    ;(async () => {
      const r = await fetchPartnerReports()
      if (!c) setRows(r)
    })()
    return () => {
      c = true
    }
  }, [])

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h2 className="text-2xl font-black text-white">التقارير</h2>
        <p className="mt-2 text-sm font-medium text-white/60">تقارير الأثر والمشاركة المشتركة.</p>
      </motion.div>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <PartnerReportCard title={r.title} at={r.at} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
