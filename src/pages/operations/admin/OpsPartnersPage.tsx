import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import PartnerCard from '@/components/operations/PartnerCard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { Briefcase } from 'lucide-react'
import { fetchPartners } from '@/api/partnersApi'
import { seedPartners } from '@/data/operationsSeed'
import type { PartnerRecord } from '@/types/operations'

export default function OpsPartnersPage() {
  const [items, setItems] = useState<PartnerRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await fetchPartners()
        if (!cancelled) setItems(d)
      } catch {
        if (!cancelled) setItems(seedPartners())
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
        <h1 className="text-2xl font-black text-deepBlue">سجل الشركاء</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          نظرة على الشراكات المعتمدة وحالة التفعيل المؤسسي.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState icon={Briefcase} title="لا شركاء مسجلين بعد" />
      ) : (
        <motion.div layout className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <PartnerCard key={p.id} p={p} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
