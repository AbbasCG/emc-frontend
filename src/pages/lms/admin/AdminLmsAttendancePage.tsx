import axios from 'axios'
import { useEffect, useState } from 'react'
import { UserSquare } from 'lucide-react'
import { adminListAttendance } from '@/api/adminLmsApi'
import type { AdminLmsRow } from '@/types/lms'
import { DashboardSection } from '@/components/dashboard'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton } from '@/components/lms'

const columns: DataTableColumn<AdminLmsRow>[] = [
  { key: 'label', header: 'الجلسة / المجموعة' },
  { key: 'subtitle', header: 'تفاصيل' },
  { key: 'status', header: 'الحالة' },
  { key: 'updated_at', header: 'آخر تحديث' },
]

export default function AdminLmsAttendancePage() {
  const [rows, setRows] = useState<AdminLmsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [apiMissing, setApiMissing] = useState(false)

  useEffect(() => {
    let alive = true
    adminListAttendance()
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
          <code className="rounded bg-white/80 px-1">GET /api/admin/lms/attendance</code>
        </div>
      )}
      <DashboardSection title="الحضور (إداري)" subtitle="نظرة عامة على سجلات الحضور عبر الجلسات.">
        {rows.length === 0 ? (
          <LmsEmptyState
            icon={UserSquare}
            title="لا توجد سجلات"
            description="عند تفعيل الخادم ستُعرض ملخصات الحضور هنا."
          />
        ) : (
          <DataTable columns={columns} data={rows} keyExtractor={(r) => r.id} />
        )}
      </DashboardSection>
    </div>
  )
}
