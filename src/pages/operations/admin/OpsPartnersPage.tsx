import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import PartnerCard from '@/components/operations/PartnerCard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { Briefcase } from 'lucide-react'
import { fetchPartners } from '@/api/partnersApi'
import type { PartnerRecord } from '@/types/operations'

export default function OpsPartnersPage() {
  const [items, setItems] = useState<PartnerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function load() {
    setLoadError(null)
    setLoading(true)
    try {
      setItems(await fetchPartners())
    } catch {
      setLoadError('تعذّر تحميل الشركاء. تحقق من الاتصال وأعد المحاولة.')
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
