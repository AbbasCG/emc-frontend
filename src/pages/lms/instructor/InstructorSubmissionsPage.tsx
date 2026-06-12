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
import toast from '@/lib/toast'
import { formatDateTime, formatRelativeDate } from '@/utils/dateTime'

function formatSubmittedAt(raw: string | null | undefined): string {
  if (!raw) return '—'
  const rel = formatRelativeDate(raw)
  if (rel.startsWith('اليوم') || rel.startsWith('أمس') || rel.startsWith('منذ')) return rel
  return formatDateTime(raw)
}

const columns: DataTableColumn<InstructorSubmission>[] = [
  { key: 'student_name', header: 'الطالب' },
  { key: 'course_name', header: 'الدورة', render: (row) => row.course_name ?? '—' },
  { key: 'assignment_title', header: 'الواجب' },
  {
    key: 'submitted_at',
    header: 'تاريخ التسليم',
    render: (row) => formatSubmittedAt(row.submitted_at),
  },
  {
    key: 'status',
    header: 'الحالة',
    render: (row) => <LmsStatusBadge status={row.status} kind="submission" />,
  },
  {
    key: 'score',
    header: 'الدرجة',
    render: (row) => (row.score != null ? String(row.score) : '—'),
  },
]

export default function InstructorSubmissionsPage() {
  const [list,          setList]          = useState<InstructorSubmission[]>([])
  const [loading,       setLoading]       = useState(true)
  const [loadError,     setLoadError]     = useState<string | null>(null)
  const [detail,        setDetail]        = useState<SubmissionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      setList(await fetchInstructorAssignmentsQueue())
    } catch (err) {
      if (!axios.isCancel(err)) {
        setLoadError('تعذّر تحميل التسليمات. تحقق من اتصال الخادم.')
        setList([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function openRow(row: InstructorSubmission) {
    if (row.status === 'not_submitted') return
    setDetailLoading(true)
    try {
      setDetail(await fetchSubmissionDetail(row.id))
    } catch (err) {
      if (import.meta.env.DEV) console.error('[submissions] detail load failed:', err)
      toast.error('تعذّر تحميل تفاصيل التسليم.')
      setDetail({
        ...row,
        body_text: row.body_preview ?? '',
      })
    } finally {
      setDetailLoading(false)
    }
  }

  const pending  = list.filter((r) => r.status === 'pending_review').length
  const reviewed = list.filter((r) => r.status === 'reviewed' || r.status === 'needs_revision').length
  const missing  = list.filter((r) => r.status === 'not_submitted').length

  return (
    <div className="space-y-6 pb-16" dir="rtl">

      <InstructorHero
        title="التسليمات"
        subtitle="راجع إجابات الطلاب وسجّل الدرجة والملاحظات"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        onRefresh={load}
        refreshing={loading}
        pills={loading ? [] : [
          { label: 'إجمالي',           value: list.length },
          { label: 'بانتظار المراجعة', value: pending    },
          { label: 'تمت المراجعة',      value: reviewed   },
          ...(missing > 0 ? [{ label: 'لم يُسلّم', value: missing }] : []),
        ]}
      />

      {loadError && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
          {loadError}
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
                key: 'preview',
                header: 'معاينة',
                render: (row) => (
                  <span className="line-clamp-2 max-w-[200px] text-[11px] font-semibold text-slate-500">
                    {row.body_preview ?? '—'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: '',
                width: '120px',
                render: (row) => (
                  row.status === 'not_submitted' ?
                    <span className="text-[11px] font-bold text-slate-400">—</span>
                  : <button
                      type="button"
                      onClick={() => openRow(row)}
                      className="rounded-xl bg-[#2691C2] px-3 py-1.5 text-[11px] font-black text-white transition hover:brightness-105"
                    >
                      {row.status === 'pending_review' ? 'مراجعة' : 'عرض'}
                    </button>
                ),
              },
            ]}
            data={list}
            keyExtractor={(row) => `${row.id}-${row.student_id}-${row.assignment_id ?? 0}`}
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
            toast.success('تم حفظ التقييم.')
            setDetail(null)
            void load()
          }}
        />
      )}
    </div>
  )
}
