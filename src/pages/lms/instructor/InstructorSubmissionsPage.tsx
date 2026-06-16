import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Filter,
  Search,
} from 'lucide-react'
import DashboardBreadcrumbs from '@/components/ui/DashboardBreadcrumbs'
import {
  fetchInstructorAssignmentsQueue,
  fetchSubmissionDetail,
  reviewInstructorSubmission,
  type SubmissionsQueueFilters,
} from '@/api/instructorApi'
import type { InstructorSubmission, SubmissionDetail } from '@/types/lms'
import { LmsStatusBadge, SubmissionReviewPanel } from '@/components/lms'
import { InstructorEmptyState, InstructorHero } from '@/components/instructor'
import toast from '@/lib/toast'
import { formatDateTime, formatRelativeDate } from '@/utils/dateTime'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'

function formatSubmittedAt(raw: string | null | undefined): string {
  if (!raw) return '—'
  const rel = formatRelativeDate(raw)
  if (rel.startsWith('اليوم') || rel.startsWith('أمس') || rel.startsWith('منذ')) return rel
  return formatDateTime(raw)
}

function displayField(value: string | null | undefined): string {
  const s = String(value ?? '').trim()
  return s || '—'
}

function formatGrade(row: InstructorSubmission): string {
  if (row.score == null) return '—'
  if (row.max_score != null) return `${row.score} / ${row.max_score}`
  return String(row.score)
}

function studentInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
  }
  return (name[0] ?? '?').toUpperCase()
}

type StatusFilter = 'all' | InstructorSubmission['status']

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: typeof ClipboardCheck
  accent: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 text-right">
        <p className="text-[22px] font-black leading-none text-[#22334A]">{value}</p>
        <p className="mt-1 text-[11px] font-bold text-slate-500">{label}</p>
      </div>
    </div>
  )
}

export default function InstructorSubmissionsPage() {
  const { submissionId: submissionIdParam } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [list, setList] = useState<InstructorSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detail, setDetail] = useState<SubmissionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState<number | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const load = useCallback(async (filters?: SubmissionsQueueFilters) => {
    setLoading(true)
    setLoadError(null)
    try {
      setList(await fetchInstructorAssignmentsQueue(filters))
    } catch (err) {
      if (!axios.isCancel(err)) {
        setLoadError('تعذّر تحميل التسليمات. تحقق من اتصال الخادم.')
        setList([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const filters: SubmissionsQueueFilters = { per_page: 100 }
    if (courseFilter !== 'all') filters.course_id = courseFilter
    if (statusFilter !== 'all' && statusFilter !== 'not_submitted') {
      filters.status = statusFilter
    }
    void load(filters)
  }, [courseFilter, statusFilter, load])

  const courseOptions = useMemo(() => {
    const map = new Map<number, string>()
    for (const row of list) {
      if (row.course_id && row.course_name) {
        map.set(row.course_id, row.course_name)
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ar'))
  }, [list])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (courseFilter !== 'all' && row.course_id !== courseFilter) return false
      if (!q) return true
      const haystack = [
        row.student_name,
        row.course_name,
        row.assignment_title,
        row.student_email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [list, search, courseFilter, statusFilter])

  const kpis = useMemo(() => ({
    total: list.length,
    pending: list.filter((r) => r.status === 'pending_review').length,
    reviewed: list.filter((r) => r.status === 'reviewed').length,
    needsRevision: list.filter((r) => r.status === 'needs_revision').length,
  }), [list])

  const openRow = useCallback(async (row: InstructorSubmission) => {
    if (row.status === 'not_submitted') return
    setDetail({
      ...row,
      body_text: row.body_preview ?? null,
    })
    setDetailLoading(true)
    try {
      setDetail(await fetchSubmissionDetail(row.id))
    } catch (err) {
      if (import.meta.env.DEV) console.error('[submissions] detail load failed:', err)
      toast.error('تعذّر تحميل تفاصيل التسليم.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    const targetRaw = submissionIdParam ?? searchParams.get('submission')
    if (!targetRaw || list.length === 0) return
    const targetId = Number(targetRaw)
    if (!Number.isFinite(targetId)) return
    const row = list.find((r) => r.id === targetId)
    if (!row || row.status === 'not_submitted') return
    void openRow(row)
    if (submissionIdParam) {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('submission')
        return next
      }, { replace: true })
    }
  }, [submissionIdParam, searchParams, list, openRow, setSearchParams])

  async function handleReview(payload: Parameters<typeof reviewInstructorSubmission>[1]) {
    if (!detail) return
    try {
      const updated = await reviewInstructorSubmission(detail.id, payload)
      setDetail(updated)
      setList((prev) =>
        prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
      )
      toast.success('تم حفظ التقييم بنجاح.')
    } catch {
      toast.error('تعذّر حفظ التقييم.')
      throw new Error('review failed')
    }
  }

  return (
    <div className="space-y-5 pb-16 font-[Cairo,sans-serif]" dir="rtl">
      <DashboardBreadcrumbs items={[
        { label: 'دوراتي', href: '/dashboard/instructor/courses' },
        { label: 'التسليمات' },
      ]} />

      <InstructorHero
        title="التسليمات"
        subtitle="راجع إجابات الطلاب، سجّل الدرجة والملاحظات، وتابع حالة كل تسليم"
        eyebrow="لوحة المدرب"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        onRefresh={() => {
          const filters: SubmissionsQueueFilters = { per_page: 100 }
          if (courseFilter !== 'all') filters.course_id = courseFilter
          if (statusFilter !== 'all' && statusFilter !== 'not_submitted') {
            filters.status = statusFilter
          }
          void load(filters)
        }}
        refreshing={loading}
      />

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="إجمالي التسليمات"
          value={kpis.total}
          icon={ClipboardCheck}
          accent="bg-[#2691C2]/10 text-[#2691C2]"
        />
        <KpiCard
          label="بانتظار المراجعة"
          value={kpis.pending}
          icon={AlertCircle}
          accent="bg-sky-50 text-sky-600"
        />
        <KpiCard
          label="تمت المراجعة"
          value={kpis.reviewed}
          icon={CheckCircle2}
          accent="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          label="ناقصة المراجعة"
          value={kpis.needsRevision}
          icon={FileSearch}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      {loadError && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
          {loadError}
        </div>
      )}

      {/* Filters */}
      {!loading && list.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالطالب، الدورة، أو الواجب..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-4 text-[12px] font-semibold text-[#22334A] outline-none focus:border-[#2691C2] focus:ring-2 focus:ring-[#2691C2]/15"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="hidden h-4 w-4 text-slate-400 sm:block" />
            <select
              value={courseFilter === 'all' ? 'all' : String(courseFilter)}
              onChange={(e) => {
                const v = e.target.value
                setCourseFilter(v === 'all' ? 'all' : Number(v))
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-black text-[#22334A] outline-none focus:border-[#2691C2]"
            >
              <option value="all">كل الدورات</option>
              {courseOptions.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-black text-[#22334A] outline-none focus:border-[#2691C2]"
            >
              <option value="all">كل الحالات</option>
              <option value="pending_review">بانتظار المراجعة</option>
              <option value="reviewed">تمت المراجعة</option>
              <option value="needs_revision">ناقصة المراجعة</option>
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <InstructorEmptyState
          icon={FileSearch}
          title="لا توجد تسليمات للمراجعة"
          description="عند تسليم الطلاب للواجبات ستظهر هنا في قائمة الانتظار"
        />
      ) : filtered.length === 0 ? (
        <InstructorEmptyState
          icon={Search}
          title="لا توجد نتائج"
          description="جرّب تغيير معايير البحث أو الفلاتر"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['الطالب', 'الدورة', 'الواجب', 'التسليم', 'الحالة', 'الدرجة', 'مرفق', ''].map((h) => (
                    <th
                      key={h || 'actions'}
                      className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((row) => {
                  const avatarUrl = resolvePublicAssetUrl(row.student_avatar ?? null)
                  const clickable = row.status !== 'not_submitted'
                  return (
                    <tr
                      key={`${row.id}-${row.student_id}-${row.assignment_id ?? 0}`}
                      onClick={() => clickable && void openRow(row)}
                      className={`transition-colors ${
                        clickable
                          ? 'cursor-pointer hover:bg-[#2691C2]/[0.03]'
                          : 'opacity-70'
                      } ${detail?.id === row.id ? 'bg-[#2691C2]/[0.06]' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-100"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2691C2]/10 text-[11px] font-black text-[#2691C2]">
                              {studentInitials(row.student_name)}
                            </div>
                          )}
                          <span className="text-[12px] font-black text-[#22334A]">
                            {row.student_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-slate-600">
                        {row.course_name ? row.course_name : '—'}
                      </td>
                      <td className="max-w-[180px] px-4 py-3 text-[12px] font-semibold text-[#22334A]">
                        <span className="line-clamp-2">{displayField(row.assignment_title)}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold text-slate-500">
                        {formatSubmittedAt(row.submitted_at)}
                      </td>
                      <td className="px-4 py-3">
                        <LmsStatusBadge status={row.status} kind="submission" />
                      </td>
                      <td className="px-4 py-3 text-[12px] font-black text-[#22334A]">
                        {formatGrade(row)}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-semibold text-slate-500">
                        {row.file_url ? 'ملف' : row.body_preview?.trim() ? 'نص' : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {clickable ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              void openRow(row)
                            }}
                            className="rounded-xl bg-[#2691C2] px-3 py-1.5 text-[11px] font-black text-white transition hover:brightness-105"
                          >
                            {row.status === 'pending_review' ? 'مراجعة' : 'عرض'}
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SubmissionReviewPanel
        submission={detail}
        loading={detailLoading}
        onClose={() => setDetail(null)}
        onSubmit={handleReview}
      />
    </div>
  )
}
