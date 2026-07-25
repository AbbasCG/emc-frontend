import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { fetchAutomationRuns } from '@/api/automationsApi'
import AutomationRunTimeline from '@/components/platform/AutomationRunTimeline'
import type { AutomationRun } from '@/types/platform'

export default function AdminAutomationRunsPage() {
  const [runs, setRuns] = useState<AutomationRun[]>([])
  useEffect(() => {
    let c = false
    ;(async () => {
      const r = await fetchAutomationRuns()
      if (!c) setRuns(r)
    })()
    return () => {
      c = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Runs</p>
          <h1 className="text-2xl font-black text-deepBlue">سجل تشغيل الأتمتة</h1>
        </div>
        <Link to="/dashboard/admin/automations" className="text-xs font-black text-customBlue hover:underline">
          العودة للقواعد
        </Link>
      </motion.div>
      <AutomationRunTimeline runs={runs} />
    </div>
  )
}
