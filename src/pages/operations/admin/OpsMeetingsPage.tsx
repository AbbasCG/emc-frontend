import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import MeetingCard from '@/components/operations/MeetingCard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { Calendar } from 'lucide-react'
import { fetchMeetings } from '@/api/meetingsApi'
import type { OpsMeeting } from '@/types/operations'

export default function OpsMeetingsPage() {
  const [items, setItems] = useState<OpsMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function load() {
    setLoadError(null)
    setLoading(true)
    try {
      setItems(await fetchMeetings())
    } catch {
      setLoadError('تعذّر تحميل الاجتماعات. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  if (loading) return <OpsPageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )

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
