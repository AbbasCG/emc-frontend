import { useEffect, useState } from 'react'
import OperationsDashboard from '@/components/operations/OperationsDashboard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import { fetchOperationsDashboard } from '@/api/operationsApi'
import { seedOperationsDashboard } from '@/data/operationsSeed'
import type { OperationsDashboardData } from '@/types/operations'

export default function OperationsDashboardPage() {
  const [data, setData] = useState<OperationsDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await fetchOperationsDashboard()
        if (!cancelled) setData(d)
      } catch {
        if (!cancelled) setData(seedOperationsDashboard())
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || !data) return <OpsPageSkeleton />
  return <OperationsDashboard data={data} />
}
