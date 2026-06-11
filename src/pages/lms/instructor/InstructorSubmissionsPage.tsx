import axios from 'axios'
import { useEffect, useState } from 'react'
import { FileSearch } from 'lucide-react'
import {
  fetchInstructorAssignmentsQueue,
  fetchSubmissionDetail,
  reviewInstructorSubmission,
} from '@/api/instructorApi'
import type { InstructorSubmission, SubmissionDetail } from '@/types/lms'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import { LmsStatusBadge, SubmissionReviewPanel } from '@/components/lms'
import { InstructorEmptyState, InstructorHero } from '@/components/instructor'

const columns: DataTableColumn<InstructorSubmission>[] = [
  { key: 'assignment_title', header: 'الواجب' },
  { key: 'student_name',     header: 'الطالب' },
  {
    key: 'status',
    header: 'الحالة',
    render: (row) => <LmsStatusBadge status={row.status} kind="submission" />,
  },
  { key: 'submitted_at', header: 'تاريخ التسليم' },
]

export default function InstructorSubmissionsPage() {
  const [list,          setList]          = useState<InstructorSubmission[]>([])
  const [loading,       setLoading]       = useState(true)
  const [apiMissing,    setApiMissing]    = useState(false)
  const [detail,        setDetail]        = useState<SubmissionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  async function load() {
    setLoading(true)
    setApiMissing(false)
    try {
      setList(await fetchInstructorAssignmentsQueue())
    } catch (err) {
      if (!axios.isCancel(err)) {
        setApiMissing(true)
        if (import.meta.env.DEV) console.error('[submissions] load failed:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function openRow(row: InstructorSubmission) {
    setDetailLoading(true)
    try {
      setDetail(await fetchSubmissionDetail(row.id))
    } catch (err) {
      if (import.meta.env.DEV) console.error('[submissions] detail load failed:', err)
      setDetail({ ...row, body_text: (row as Record<string, unknown>).body_preview as string ?? '' })
    } finally {
      setDetailLoading(false)
    }
  }

  const pending  = list.filter((r) => r.status === 'pending_review').length
  const reviewed = list.filter((r) => r.status === 'reviewed' || r.status === 'needs_revision').length

  return (
    <div className="space-y-6 pb-16" dir="rtl">

      <InstructorHero
        title="التسليمات"
        subtitle="افتح التسليم، ثم سجّل الدرجة والملاحظات"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        onRefresh={load}
        refreshing={loading}
        pills={loading ? [] : [
          { label: 'إجمالي',         value: list.length },
          { label: 'بانتظار المراجعة', value: pending    },
          { label: 'تمت المراجعة',    value: reviewed   },
        ]}
      />

      {apiMissing && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
          تحقق من <code className="rounded bg-white/80 px-1">GET /api/instructor/assignments</code>.
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : list.length === 0 ? (
        <InstructorEmptyState
          icon={FileSearch}
          title="لا توجد تسليمات للمراجعة"
          description="عند تسليم الطلاب للواجبات ستظهر هنا في قائمة الانتظار"
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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
                    className="rounded-xl bg-[#2691C2] px-3 py-1.5 text-[11px] font-black text-white transition hover:brightness-105"
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
        </div>
      )}

      {detailLoading && (
        <p className="text-center text-[12px] font-bold text-deepBlue/40">جارٍ التحميل...</p>
      )}

      {detail && !detailLoading && (
        <SubmissionReviewPanel
          submission={detail}
          onClose={() => setDetail(null)}
          onSubmit={async (payload) => {
            await reviewInstructorSubmission(detail.id, payload)
            void load()
          }}
        />
      )}
    </div>
  )
}
