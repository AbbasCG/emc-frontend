import axios from 'axios'
import { useEffect, useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { adminListSessions } from '@/api/adminLmsApi'
import type { LmsSession } from '@/types/lms'
import { DashboardSection } from '@/components/dashboard'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton, LmsStatusBadge } from '@/components/lms'

const columns: DataTableColumn<LmsSession>[] = [
  { key: 'course_name', header: 'الدورة / الجلسة' },
  {
    key: 'status',
    header: 'الحالة',
    render: (row) => <LmsStatusBadge status={row.status} kind="session" />,
  },
  { key: 'starts_at', header: 'البداية', render: (row) => row.starts_at ?? row.date ?? '—' },
  { key: 'instructor_name', header: 'المدرب', render: (row) => row.instructor_name ?? '—' },
]

export default function AdminLmsSessionsPage() {
  const [rows, setRows] = useState<LmsSession[]>([])
  const [loading, setLoading] = useState(true)
  const [apiMissing, setApiMissing] = useState(false)

  useEffect(() => {
    let alive = true
    adminListSessions()
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
          تحقق من CRUD الجلسات تحت <code className="rounded bg-white/80 px-1">/api/admin/lms/sessions</code>.
        </div>
      )}
      <DashboardSection
        title="إدارة الجلسات"
        subtitle="عرض الجدولة، الحالة، والمدرب — أوصل الواجهة بمسارات الإنشاء والتعديل على الخادم."
      >
        {rows.length === 0 ? (
          <LmsEmptyState
            icon={CalendarRange}
            title="لا توجد جلسات مسجلة"
            description="أضف جلسات من لوحة Laravel أو عبر واجهة الإدارة عند تفعيلها."
          />
        ) : (
          <DataTable columns={columns} data={rows} keyExtractor={(r) => r.id} emptyMessage="فارغ" />
        )}
      </DashboardSection>
    </div>
  )
}
