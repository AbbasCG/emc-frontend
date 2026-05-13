import axios from 'axios'
import { useEffect, useState } from 'react'
import { FileSearch } from 'lucide-react'
import {
  fetchInstructorAssignmentsQueue,
  fetchSubmissionDetail,
  reviewInstructorSubmission,
} from '@/api/instructorApi'
import type { InstructorSubmission, SubmissionDetail } from '@/types/lms'
import { DashboardSection } from '@/components/dashboard'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import { LmsEmptyState, LmsPageSkeleton, LmsStatusBadge, SubmissionReviewPanel } from '@/components/lms'

const columns: DataTableColumn<InstructorSubmission>[] = [
  { key: 'assignment_title', header: 'الواجب' },
  { key: 'student_name', header: 'الطالب' },
  {
    key: 'status',
    header: 'الحالة',
    render: (row) => <LmsStatusBadge status={row.status} kind="submission" />,
  },
  { key: 'submitted_at', header: 'تاريخ التسليم' },
]

export default function InstructorSubmissionsPage() {
  const [list, setList] = useState<InstructorSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [apiMissing, setApiMissing] = useState(false)
  const [detail, setDetail] = useState<SubmissionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  function reload() {
    fetchInstructorAssignmentsQueue()
      .then(setList)
      .catch(() => setApiMissing(true))
  }

  useEffect(() => {
    let alive = true
    fetchInstructorAssignmentsQueue()
      .then((rows) => {
        if (alive) setList(rows)
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

  async function openRow(row: InstructorSubmission) {
    setDetailLoading(true)
    try {
      const d = await fetchSubmissionDetail(row.id)
      setDetail(d)
    } catch {
      setDetail({ ...row, body_text: row.body_preview ?? '' })
    } finally {
      setDetailLoading(false)
    }
  }

  if (loading) return <LmsPageSkeleton />

  return (
    <div className="space-y-8">
      {apiMissing && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
          تحقق من <code className="rounded bg-white/80 px-1">GET /api/instructor/assignments</code> ومسارات مراجعة التسليمات.
        </div>
      )}

      <DashboardSection title="التسليمات" subtitle="افتح التسليم، ثم سجّل الدرجة والملاحظات.">
        {list.length === 0 ? (
          <LmsEmptyState
            icon={FileSearch}
            title="لا توجد تسليمات للمراجعة"
            description="عند تسليم الطلاب للواجبات ستظهر هنا في قائمة الانتظار."
          />
        ) : (
          <DataTable
            columns={[
              ...columns,
              {
                key: 'actions',
                header: '',
                width: '120px',
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => openRow(row)}
                    className="rounded-lg bg-customBlue px-3 py-1.5 text-xs font-black text-white"
                  >
                    مراجعة
                  </button>
                ),
              },
            ]}
            data={list}
            keyExtractor={(row) => row.id}
            emptyMessage="لا توجد بيانات"
          />
        )}
      </DashboardSection>

      {detailLoading && <p className="text-center text-sm font-bold text-slate-500">جارٍ التحميل...</p>}

      {detail && !detailLoading && (
        <SubmissionReviewPanel
          submission={detail}
          onClose={() => setDetail(null)}
          onSubmit={async (payload) => {
            await reviewInstructorSubmission(detail.id, payload)
            reload()
          }}
        />
      )}
    </div>
  )
}
