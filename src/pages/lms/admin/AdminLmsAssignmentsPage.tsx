import axios from 'axios'
import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { adminListAssignments } from '@/api/adminLmsApi'
import type { StudentAssignment } from '@/types/lms'
import { DashboardSection } from '@/components/dashboard'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton, LmsStatusBadge } from '@/components/lms'

const columns: DataTableColumn<StudentAssignment>[] = [
  { key: 'title', header: 'الواجب' },
  { key: 'course_name', header: 'الدورة' },
  {
    key: 'status',
    header: 'الحالة',
    render: (row) => <LmsStatusBadge status={row.status} kind="assignment" />,
  },
  { key: 'due_at', header: 'التسليم' },
]

export default function AdminLmsAssignmentsPage() {
  const [rows, setRows] = useState<StudentAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [apiMissing, setApiMissing] = useState(false)

  useEffect(() => {
    let alive = true
    adminListAssignments()
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
          <code className="rounded bg-white/80 px-1">/api/admin/lms/assignments</code>
        </div>
      )}
      <DashboardSection title="الواجبات (إداري)" subtitle="قائمة الواجبات وحالات التسليم على مستوى المنصة.">
        {rows.length === 0 ? (
          <LmsEmptyState icon={ClipboardList} title="لا توجد واجبات" description="" />
        ) : (
          <DataTable columns={columns} data={rows} keyExtractor={(r) => r.id} />
        )}
      </DashboardSection>
    </div>
  )
}
