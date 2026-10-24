import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarCheck2, ChevronLeft, ChevronRight, Lock, Plus, RefreshCw, SearchX } from 'lucide-react'
import { useDepartmentAccess } from '@/hooks/useDepartmentAccess'
import { fetchMeetingReports, type MeetingReportsPage as ReportsPage, type MeetingReportsQuery } from '@/api/operationsReportsApi'
import { MeetingReportsKpis } from '@/components/operations/meetingReports/MeetingReportsKpis'
import { MeetingReportsFilters } from '@/components/operations/meetingReports/MeetingReportsFilters'
import { MeetingReportCard } from '@/components/operations/meetingReports/MeetingReportCard'
import { MeetingReportDetails } from '@/components/operations/meetingReports/MeetingReportDetails'
import { MeetingReportFormModal } from '@/components/operations/meetingReports/MeetingReportFormModal'
import {
  EMPTY_FILTERS,
  activeFilterCount,
  describeReportsError,
  type MeetingReportFilters,
  type ReportsError,
} from '@/components/operations/meetingReports/meetingReportsUi'

/**
 * تقارير الاجتماعات — the operations archive of structured meeting minutes.
 *
 * Authorization lives on the server: the list is already scoped to the
 * viewer's departments and the create endpoint accepts only department
 * leadership or a global admin. This page only reflects that: the upload
 * button shows for users the department manifest says may create, and every
 * server refusal (401/403/404/422/5xx) lands in a visible state with a clear
 * message instead of an error boundary.
 */

const PAGE_SIZE = 12

/** Debounces typing so each keystroke is not a request. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

type Result = { key: string; data?: ReportsPage; error?: ReportsError }

export default function MeetingReportsPage() {
  const { manifest, loading: manifestLoading, soleDepartmentId, readableDepartments, canViewMultipleDepartments } = useDepartmentAccess()
  // Creating needs leadership of at least one department (or a global admin) — not mere membership.
  const canCreate =
    !manifestLoading && !!manifest && (manifest.can_select_any_department || manifest.allowed_departments.length > 0)

  const [filters, setFilters] = useState<MeetingReportFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  const debouncedQ = useDebounced(filters.q.trim(), 300)

  const query = useMemo<MeetingReportsQuery>(
    () => ({
      page,
      per_page: PAGE_SIZE,
      ...(debouncedQ ? { q: debouncedQ } : {}),
      ...(filters.department_id !== '' ? { department_id: filters.department_id } : {}),
      ...(filters.date_from ? { date_from: filters.date_from } : {}),
      ...(filters.date_to ? { date_to: filters.date_to } : {}),
    }),
    [page, debouncedQ, filters.department_id, filters.date_from, filters.date_to],
  )
  const key = useMemo(() => JSON.stringify([query, nonce]), [query, nonce])

  // State is only set from the request's callbacks, never synchronously here.
  useEffect(() => {
    let alive = true
    void fetchMeetingReports(query)
      .then((data) => {
        if (alive) setResult({ key, data })
      })
      .catch((e: unknown) => {
        if (alive) setResult({ key, error: describeReportsError(e) })
      })
    return () => {
      alive = false
    }
  }, [query, key])

  const settled = result?.key === key
  const error = settled ? result?.error : undefined
  const data = result?.data
  const rows = data?.rows ?? []
  const refreshing = !settled && !!result
  const initialLoading = !result || (!settled && !data)
  const filtersActive = activeFilterCount(filters) > 0

  function changeFilters(next: MeetingReportFilters) {
    setFilters(next)
    setPage(1)
  }

  function reload() {
    setNonce((n) => n + 1)
  }

  const showDepartmentFilter = canViewMultipleDepartments && readableDepartments.length > 1

  return (
    <div dir="rtl" className="mx-auto max-w-6xl space-y-6">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black tracking-[0.25em] text-accent-700">التوثيق</p>
          <h1 className="mt-1 text-2xl font-black text-navy sm:text-3xl">تقارير الاجتماعات</h1>
          <p className="mt-1.5 max-w-xl text-sm font-medium leading-7 text-muted-500">
            محاضر منظَّمة بعد كل اجتماع: ما أُنجز وما سيُنجز والاحتياجات والقرارات، مع حضور وتقييم كل عضو.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reload}
            aria-label="تحديث القائمة"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-navy shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
            تحديث
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-600"
            >
              <Plus size={16} aria-hidden="true" />
              رفع تقرير اجتماع
            </button>
          )}
        </div>
      </header>

      {/* The numbers describe what the viewer may read, so they are hidden when there is nothing readable to count. */}
      {!error && <MeetingReportsKpis stats={data?.stats ?? null} loading={initialLoading} />}

      <MeetingReportsFilters
        value={filters}
        onChange={changeFilters}
        departments={readableDepartments}
        showDepartment={showDepartmentFilter}
      />

      {/* ── Results ── */}
      {error ? (
        <section role="alert" className="rounded-3xl border border-rose-100 bg-white p-10 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500" aria-hidden="true">
            {error.kind === 'forbidden' ? <Lock size={26} /> : <AlertTriangle size={26} />}
          </span>
          <h2 className="mt-4 text-base font-black text-navy">{error.title}</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm font-medium leading-7 text-muted-500">{error.message}</p>
          {error.retryable && (
            <button
              type="button"
              onClick={reload}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
            >
              <RefreshCw size={15} aria-hidden="true" />
              إعادة المحاولة
            </button>
          )}
        </section>
      ) : initialLoading ? (
        <ul aria-busy="true" aria-label="جارٍ تحميل التقارير" className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="h-24 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-line bg-white p-12 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500" aria-hidden="true">
            {filtersActive ? <SearchX size={26} /> : <CalendarCheck2 size={26} />}
          </span>
          <h2 className="mt-4 text-base font-black text-navy">
            {filtersActive ? 'لا توجد تقارير مطابقة' : 'لا توجد تقارير اجتماعات بعد'}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm font-medium leading-7 text-muted-500">
            {filtersActive
              ? 'جرّب تعديل البحث أو توسيع نطاق التاريخ.'
              : canCreate
                ? 'ابدأ بتوثيق أول اجتماع لإدارتك.'
                : 'ستظهر هنا تقارير الاجتماعات عندما يرفعها قادة الإدارات.'}
          </p>
          {filtersActive ? (
            <button type="button" onClick={() => changeFilters(EMPTY_FILTERS)} className="mt-5 rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-navy transition hover:bg-slate-50">
              مسح التصفية
            </button>
          ) : canCreate ? (
            <button type="button" onClick={() => setShowForm(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-brand-600">
              <Plus size={16} aria-hidden="true" />
              رفع تقرير اجتماع
            </button>
          ) : null}
        </section>
      ) : (
        <>
          <ul className={`space-y-3 transition-opacity ${refreshing ? 'opacity-60' : ''}`} aria-busy={refreshing} data-testid="meeting-reports-list">
            {rows.map((r) => (
              <MeetingReportCard key={r.id} report={r} onOpen={setOpenId} />
            ))}
          </ul>

          {data && data.lastPage > 1 && (
            <nav aria-label="التنقل بين الصفحات" className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold text-navy transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={15} aria-hidden="true" />
                السابق
              </button>
              <span className="text-xs font-bold tabular-nums text-muted-500">
                صفحة {data.page} من {data.lastPage} · {data.total} تقرير
              </span>
              <button
                type="button"
                disabled={page >= data.lastPage}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold text-navy transition hover:bg-slate-50 disabled:opacity-40"
              >
                التالي
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}

      {openId !== null && (
        <MeetingReportDetails
          key={openId}
          reportId={openId}
          titleHint={rows.find((r) => r.id === openId)?.title}
          onClose={() => setOpenId(null)}
        />
      )}

      {showForm && (
        <MeetingReportFormModal
          manifest={manifest}
          manifestLoading={manifestLoading}
          soleDepartmentId={soleDepartmentId}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            setPage(1)
            reload()
          }}
        />
      )}
    </div>
  )
}
