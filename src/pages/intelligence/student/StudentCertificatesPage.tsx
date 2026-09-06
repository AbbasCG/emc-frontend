import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CertificateCard, IntelligencePageSkeleton } from '@/components/intelligence'
import EmptyState from '@/components/dashboard/EmptyState'
import { GraduationCap } from 'lucide-react'
import { fetchStudentCertificates } from '@/api/certificatesApi'
import type { CertificateRecord } from '@/types/intelligence'

export default function StudentCertificatesPage() {
  const [items, setItems] = useState<CertificateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await fetchStudentCertificates()
        if (!cancelled) setItems(d)
      } catch {
        if (!cancelled) setLoadError('تعذّر تحميل الشهادات. تحقق من الاتصال وأعد المحاولة.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <IntelligencePageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
    </div>
  )

  return (
    <div className="space-y-8">
      <header className="text-right">
        <h1 className="text-2xl font-black text-deepBlue">شهاداتي</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">شهاداتك المعتمدة مع رمز التحقق والربط العام</p>
      </header>

      {items.length === 0 ? (
        <EmptyState icon={GraduationCap} title="لا شهادات صادرة بعد" />
      ) : (
        <motion.div layout className="grid gap-6 md:grid-cols-2">
          {items.map((c) => (
            <CertificateCard key={c.id} cert={c} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
