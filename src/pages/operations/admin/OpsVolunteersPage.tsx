import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import VolunteerCard from '@/components/operations/VolunteerCard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { HeartHandshake } from 'lucide-react'
import { fetchVolunteers } from '@/api/volunteersApi'
import type { OpsVolunteer } from '@/types/operations'

const LOAD_ERROR = 'تعذّر تحميل قائمة المتطوعين. تحقق من الاتصال وأعد المحاولة.'

export default function OpsVolunteersPage() {
  const [items, setItems] = useState<OpsVolunteer[]>([])
  // Starts in the loading state, so the mount effect never has to flip it synchronously.
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const rows = await fetchVolunteers()
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
      setItems(await fetchVolunteers())
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
      <header className="rounded-[1.35rem] bg-white p-8 text-right shadow-lg ring-1 ring-deepBlue/[0.06]">
        <h1 className="text-2xl font-black text-deepBlue">المتطوعون والموارد البشرية</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          مسارات الانضمام، الجاهزية، وسجل الساعات — بواجهة تشبه أفضل أنظمة التشغيل الداخلية.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState icon={HeartHandshake} title="لا متطوعين مسجلين" />
      ) : (
        <motion.div layout className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((v) => (
            <VolunteerCard key={v.id} v={v} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
