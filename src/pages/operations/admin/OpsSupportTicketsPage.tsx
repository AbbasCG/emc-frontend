import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SupportTicketCard from '@/components/operations/SupportTicketCard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { LifeBuoy } from 'lucide-react'
import { fetchSupportTickets } from '@/api/supportApi'
import { seedSupportTickets } from '@/data/operationsSeed'
import type { SupportTicket } from '@/types/operations'

export default function OpsSupportTicketsPage() {
  const [items, setItems] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await fetchSupportTickets()
        if (!cancelled) setItems(d)
      } catch {
        if (!cancelled) setItems(seedSupportTickets())
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
