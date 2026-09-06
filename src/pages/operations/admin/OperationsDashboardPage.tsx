import { useCallback, useEffect, useState } from 'react'
import OperationsDashboard from '@/components/operations/OperationsDashboard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import { fetchOperationsDashboard } from '@/api/operationsApi'
import type { OperationsDashboardData } from '@/types/operations'

const LOAD_ERROR = 'تعذّر تحميل لوحة العمليات. تحقق من الاتصال وأعد المحاولة.'

export default function OperationsDashboardPage() {
  const [data, setData] = useState<OperationsDashboardData | null>(null)
  // Starts in the loading state, so the mount effect never has to flip it synchronously.
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const d = await fetchOperationsDashboard()
        if (!cancelled) setData(d)
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
      setData(await fetchOperationsDashboard())
    } catch {
      setLoadError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [])

  if (loading) return <OpsPageSkeleton />
  if (loadError || !data) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError ?? 'لا توجد بيانات.'}</p>
      <button type="button" onClick={() => void retry()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )
  return <OperationsDashboard data={data} />
}
