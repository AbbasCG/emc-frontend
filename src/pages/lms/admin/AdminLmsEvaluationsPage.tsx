import axios from 'axios'
import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { adminListEvaluations } from '@/api/adminLmsApi'
import type { AdminLmsRow } from '@/types/lms'
import { DashboardSection } from '@/components/dashboard'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton } from '@/components/lms'

const columns: DataTableColumn<AdminLmsRow>[] = [
  { key: 'label', header: 'التقييم / الدورة' },
  { key: 'subtitle', header: 'المقيّم' },
  { key: 'status', header: 'التقييم العام' },
  { key: 'updated_at', header: 'التاريخ' },
]

export default function AdminLmsEvaluationsPage() {
  const [rows, setRows] = useState<AdminLmsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [apiMissing, setApiMissing] = useState(false)

  useEffect(() => {
    let alive = true
    adminListEvaluations()
      .then((list) => {
        if (alive) setRows(list)
      })
      .catch((err) => {
        if (!alive || axios.isCancel(err)) return
        setApiMissing(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (loading) return <LmsPageSkeleton />

  return (
    <div className="space-y-8">
      {apiMissing && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
          <code className="rounded bg-white/80 px-1">/api/admin/lms/evaluations</code>
        </div>
      )}
      <DashboardSection title="تقييمات التعلم" subtitle="استطلاعات ما بعد الدورة والجودة الملموسة.">
        {rows.length === 0 ? (
          <LmsEmptyState icon={Star} title="لا توجد تقييمات بعد" description="" />
        ) : (
          <DataTable columns={columns} data={rows} keyExtractor={(r) => r.id} />
        )}
      </DashboardSection>
    </div>
  )
}
