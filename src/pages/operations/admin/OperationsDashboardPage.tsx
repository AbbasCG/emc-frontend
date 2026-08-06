import { useEffect, useState } from 'react'
import OperationsDashboard from '@/components/operations/OperationsDashboard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import { fetchOperationsDashboard } from '@/api/operationsApi'
import type { OperationsDashboardData } from '@/types/operations'

export default function OperationsDashboardPage() {
  const [data, setData] = useState<OperationsDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  function doLoad() {
    setLoadError(null)
    setLoading(true)
    let cancelled = false
    void (async () => {
      try {
        const d = await fetchOperationsDashboard()
        if (!cancelled) setData(d)
      } catch {
        if (!cancelled) setLoadError('تعذّر تحميل لوحة العمليات. تحقق من الاتصال وأعد المحاولة.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }

  useEffect(() => doLoad(), [])

  if (loading) return <OpsPageSkeleton />
  if (loadError || !data) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError ?? 'لا توجد بيانات.'}</p>
      <button type="button" onClick={doLoad} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )
  return <OperationsDashboard data={data} />
}
