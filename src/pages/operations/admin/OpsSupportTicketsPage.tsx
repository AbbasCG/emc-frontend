import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SupportTicketCard from '@/components/operations/SupportTicketCard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { LifeBuoy } from 'lucide-react'
import { fetchSupportTickets } from '@/api/supportApi'
import type { SupportTicket } from '@/types/operations'

export default function OpsSupportTicketsPage() {
  const [items, setItems] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function load() {
    setLoadError(null)
    setLoading(true)
    try {
      setItems(await fetchSupportTickets())
    } catch {
      setLoadError('تعذّر تحميل تذاكر الدعم. تحقق من الاتصال وأعد المحاولة.')
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
        <h1 className="text-2xl font-black text-deepBlue">مكتب مساعدة التشغيل</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          تذاكر الداخل والخارج في مساحة واحدة هادئة ومركزة.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="لا تذاكر" />
      ) : (
        <motion.div layout className="grid gap-5 lg:grid-cols-2">
          {items.map((t) => (
            <SupportTicketCard key={t.id} t={t} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
