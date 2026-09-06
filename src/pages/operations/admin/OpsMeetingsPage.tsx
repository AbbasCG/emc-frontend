import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import MeetingCard from '@/components/operations/MeetingCard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { Calendar, Plus } from 'lucide-react'
import CreateMeetingForm from '@/components/operations/CreateMeetingForm'
import { fetchMeetings } from '@/api/meetingsApi'
import type { OpsMeeting } from '@/types/operations'

const LOAD_ERROR = 'تعذّر تحميل الاجتماعات. تحقق من الاتصال وأعد المحاولة.'

export default function OpsMeetingsPage() {
  const [items, setItems] = useState<OpsMeeting[]>([])
  // Starts in the loading state, so the mount effect never has to flip it synchronously.
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const rows = await fetchMeetings()
        if (!cancelled) setItems(rows)
      } catch {
        if (!cancelled) setLoadError(LOAD_ERROR)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Retry lives outside the effect, so the synchronous reset here is legitimate.
  const retry = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      setItems(await fetchMeetings())
    } catch {
      setLoadError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [])

  if (loading) return <OpsPageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void retry()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )

  return (
    <div className="space-y-8">
      <header className="rounded-[1.35rem] bg-white p-8 text-right shadow-lg ring-1 ring-deepBlue/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-customBlue">الاجتماعات</p>
          <h1 className="mt-2 text-2xl font-black text-deepBlue">جدول القيادة والتنسيق</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            أنواع الاجتماعات المعتمدة في EMC مع حالة التنفيذ والمالك المؤسسي.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-deepBlue px-5 py-3 text-sm font-black text-white transition hover:bg-deepBlue/90 shadow-sm shrink-0"
        >
          <Plus size={18} />
          اجتماع جديد
        </button>
      </header>

      <CreateMeetingForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => void retry()}
      />

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
