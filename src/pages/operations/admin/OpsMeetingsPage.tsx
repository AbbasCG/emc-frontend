import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import MeetingCard from '@/components/operations/MeetingCard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { Calendar } from 'lucide-react'
import { fetchMeetings } from '@/api/meetingsApi'
import { seedMeetings } from '@/data/operationsSeed'
import type { OpsMeeting } from '@/types/operations'

export default function OpsMeetingsPage() {
  const [items, setItems] = useState<OpsMeeting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await fetchMeetings()
        if (!cancelled) setItems(d)
      } catch {
        if (!cancelled) setItems(seedMeetings())
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <OpsPageSkeleton />

  return (
    <div className="space-y-8">
      <header className="rounded-[1.35rem] bg-white p-8 text-right shadow-lg ring-1 ring-deepBlue/[0.06]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-customBlue">الاجتماعات</p>
        <h1 className="mt-2 text-2xl font-black text-deepBlue">جدول القيادة والتنسيق</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          أنواع الاجتماعات المعتمدة في EMC مع حالة التنفيذ والمالك المؤسسي.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState icon={Calendar} title="لا اجتماعات مسجلة" />
      ) : (
        <motion.div layout className="grid gap-5 lg:grid-cols-2">
          {items.map((m) => (
            <MeetingCard key={m.id} m={m} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
