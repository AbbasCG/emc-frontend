import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import {
  fetchAcceptedVolunteers,
  type AcceptedVolunteersFilterOptions,
  type VolunteerRequest,
} from '@/api/volunteerApplicationApi'
import AcceptedVolunteerDialog, { ConversionBadge } from '@/components/volunteer/AcceptedVolunteerDialog'
import { isConvertedRequest, requestCvUrl } from '@/components/volunteer/volunteerRequestStatus'
import { useRetryableLoad } from '@/hooks/useRetryableLoad'
import { codeLabel } from '@/lib/volunteerRequestLabels'
import { formatDate } from '@/utils/dateTime'

/**
 * «المتطوعون المقبولون»: the volunteers whose application was accepted (converted or not yet), in the layout HR
 * already knows from the old volunteer-profiles page (gradient header, stat cards, search and filters, table, pages).
 *
 * The page only LISTS and shows. A volunteer's name opens a read-only window with all their data; conversion into a
 * member is done from the volunteer-requests page, never from here.
 *
 * What the server decides: the search text, every filter and the sort (one request per distinct query; a late answer
 * to an older query is dropped), the counters, and the values the dropdowns offer. What stays here: the page of 20 rows
 * and the «conversion» cards, which only narrow the rows that were loaded.
 */

const SORT_OPTIONS = [
  { value: 'accepted_asc', label: 'الأقدم قبولاً أولاً' },
  { value: 'accepted_desc', label: 'الأحدث قبولاً أولاً' },
  { value: 'name_asc', label: 'الاسم أ-ي' },
  { value: 'department', label: 'حسب القسم' },
  { value: 'city', label: 'حسب المدينة' },
]

const NEUTRAL_TONE = 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60'
const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
const PER_PAGE = 200

type StatusFilter = 'all' | 'converted' | 'pending'

const FIELD =
  'h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:ring-2 focus:ring-customBlue/20'
const SMALL_FIELD =
  'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-customBlue'

/** Everything the server is asked for. */
type VolunteersQuery = {
  search: string
  sort: string
  dept: string
  city: string
  availability: string
  hasCv: string
  dateFrom: string
  dateTo: string
}

function requestAcceptedVolunteers(query: VolunteersQuery) {
  const params: Record<string, string> = { sort: query.sort, per_page: String(PER_PAGE) }
  if (query.search) params.search = query.search
  if (query.dept) params.desired_department = query.dept
  if (query.city) params.city = query.city
  if (query.availability) params.availability = query.availability
  if (query.hasCv) params.has_cv = query.hasCv
  if (query.dateFrom) params.date_from = query.dateFrom
  if (query.dateTo) params.date_to = query.dateTo
  return fetchAcceptedVolunteers(params)
}

const LOAD_ERROR = 'تعذّر تحميل قائمة المتطوعين المقبولين.'

/* ── Dropdown values ──────────────────────────────────────────────────── */

const EMPTY_OPTIONS: AcceptedVolunteersFilterOptions = { departments: [], cities: [], availabilities: [] }

const sortedUnique = (values: Iterable<string>) => Array.from(new Set(Array.from(values).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'))

/** An older server sends no `meta.filters`: the values seen in every list loaded so far stand in (and only grow). */
function mergeOptions(prev: AcceptedVolunteersFilterOptions, rows: VolunteerRequest[]): AcceptedVolunteersFilterOptions {
  return {
    departments: sortedUnique([...prev.departments, ...rows.map((r) => r.desired_department ?? '')]),
    cities: sortedUnique([...prev.cities, ...rows.map((r) => r.city ?? '')]),
    availabilities: sortedUnique([...prev.availabilities, ...rows.map((r) => r.volunteer_days_availability ?? r.availability ?? '')]),
  }
}

/** The chosen value is always offered, so a dropdown never loses the option it is showing. */
const withSelected = (options: string[], selected: string) => (selected && !options.includes(selected) ? sortedUnique([...options, selected]) : options)

/* ── Small pieces ─────────────────────────────────────────────────────── */

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  onClick,
  active,
}: {
  label: string
  /** null = not known right now (the list failed): shown as a dash, never as the previous query's number. */
  value: number | null
  icon: typeof Users
  tone: string
  onClick?: () => void
  active?: boolean
}) {
  const body = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${tone}`}>
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0 text-right">
        <span className="block text-lg font-black leading-tight text-deepBlue">{value ?? '—'}</span>
        <span className="block text-[10px] font-bold text-slate-500">{label}</span>
      </span>
    </>
  )
  const base = 'flex items-center gap-3 rounded-xl border p-3'

  if (!onClick) return <div className={`${base} border-slate-200 bg-white`}>{body}</div>

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${base} text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40 ${
        active ? 'border-customBlue bg-customBlue/5' : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      {body}
    </button>
  )
}

/** The availability as the volunteer wrote it (older rows hold a code, which is translated). */
function AvailabilityChip({ value }: { value: string | null | undefined }) {
  const text = codeLabel(value)
  if (!text) return <span className="text-slate-300">—</span>

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${NEUTRAL_TONE}`}><bdi>{text}</bdi></span>
}

const TABLE_HEADS = ['المتطوع', 'القسم', 'المدينة', 'التفرغ', 'تاريخ القبول', 'الحالة', 'السيرة']

type Selected = { id: number; snapshot: VolunteerRequest; opener: HTMLElement | null }

/* ─────────────────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────────────────── */

export default function AcceptedVolunteersPage() {
  /* filters: all of them but the conversion cards and the page are sent to the server */
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [filterDept, setFilterDept] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterAvailability, setFilterAvailability] = useState('')
  const [filterHasCv, setFilterHasCv] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [sort, setSort] = useState('accepted_asc')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)

  const [selected, setSelected] = useState<Selected | null>(null)

  // One request per pause in typing, not one per keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [search])

  /* ── Data: one request per distinct query; a superseded answer is never applied ─────────── */
  const query = useMemo<VolunteersQuery>(
    () => ({ search: debouncedSearch, sort, dept: filterDept, city: filterCity, availability: filterAvailability, hasCv: filterHasCv, dateFrom: filterDateFrom, dateTo: filterDateTo }),
    [debouncedSearch, sort, filterDept, filterCity, filterAvailability, filterHasCv, filterDateFrom, filterDateTo],
  )
  const list = useRetryableLoad(() => requestAcceptedVolunteers(query), JSON.stringify(query))

  const data = list.data
  const loading = list.loading
  const loadError = list.error ? LOAD_ERROR : null
  const items = useMemo(() => data?.data ?? [], [data])
  const listTotal = data?.pagination.total ?? null

  // Dropdown values: the server's unfiltered lists; without them, the values seen so far (render-phase adjustment).
  const [seenData, setSeenData] = useState<typeof data>(null)
  const [pool, setPool] = useState<AcceptedVolunteersFilterOptions>(EMPTY_OPTIONS)
  if (data && data !== seenData) {
    setSeenData(data)
    if (!data.meta.filters) setPool((prev) => mergeOptions(prev, data.data))
  }
  const options = data?.meta.filters ?? pool

  /* ── The conversion cards narrow the loaded rows ──────────────────── */
  const filtered = useMemo(
    () => items.filter((r) => (statusFilter === 'converted' ? isConvertedRequest(r) : statusFilter === 'pending' ? !isConvertedRequest(r) : true)),
    [items, statusFilter],
  )

  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, lastPage)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  /** Any filter change goes back to the first page. */
  function changeFilter<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function resetFilters() {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('all')
    setFilterDept('')
    setFilterCity('')
    setFilterAvailability('')
    setFilterHasCv('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSort('accepted_asc')
    setPage(1)
  }

  const hasActiveFilters = !!(
    search || statusFilter !== 'all' || filterDept || filterCity || filterAvailability ||
    filterHasCv || filterDateFrom || filterDateTo || sort !== 'accepted_asc'
  )
  const hasExtraFilters = !!(filterCity || filterAvailability || filterHasCv || filterDateFrom || filterDateTo)

  // The counters are the server's, whatever the filters: converted + not yet converted = everyone accepted.
  const convertedCount = data ? data.meta.total_converted : null
  const pendingCount = data ? data.meta.total_accepted : null
  const totalCount = convertedCount != null && pendingCount != null ? convertedCount + pendingCount : null

  /* ── The open window: the row as the latest load has it; the snapshot while a reload is running ── */
  const shown = selected ? (items.find((r) => r.id === selected.id) ?? selected.snapshot) : null

  function openWindow(request: VolunteerRequest, opener: HTMLElement | null) {
    setSelected({ id: request.id, snapshot: request, opener })
  }

  function closeWindow() {
    const opener = selected?.opener
    setSelected(null)
    // After the window is gone, so the focus trap's own restore cannot win; for a click on the row it is the row's name button.
    window.setTimeout(() => opener?.focus(), 0)
  }

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div dir="rtl" className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-l from-customBlue to-deepBlue p-6 text-white shadow-lg">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-black">
            <UserCheck size={20} aria-hidden="true" /> المتطوعون المقبولون
          </h1>
          <p className="mt-1 text-sm font-semibold text-white/80">عرض بيانات المتطوعين الذين قُبلت طلباتهم ومتابعة حالتهم</p>
        </div>
        <button
          type="button"
          onClick={list.retry}
          disabled={loading}
          aria-label="تحديث البيانات"
          className="flex shrink-0 items-center gap-2 rounded-xl bg-white/15 px-3 py-2.5 text-xs font-black text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          <span className="hidden sm:inline">تحديث</span>
        </button>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="accepted-stats">
        {loading ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[68px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="إجمالي المقبولين" value={totalCount} icon={Users} tone="bg-customBlue/10 text-customBlue" onClick={() => changeFilter(setStatusFilter)('all')} active={statusFilter === 'all'} />
            <StatCard label="تم التحويل" value={convertedCount} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" onClick={() => changeFilter(setStatusFilter)('converted')} active={statusFilter === 'converted'} />
            <StatCard label="بانتظار التحويل" value={pendingCount} icon={UserCheck} tone="bg-amber-50 text-amber-600" onClick={() => changeFilter(setStatusFilter)('pending')} active={statusFilter === 'pending'} />
            <StatCard label="مقبولون هذا الشهر" value={data ? data.meta.accepted_this_month : null} icon={TrendingUp} tone="bg-violet-50 text-violet-600" />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => changeFilter(setSearch)(e.target.value)}
              placeholder="بحث بالاسم أو البريد أو الهاتف..."
              aria-label="بحث في المتطوعين المقبولين"
              className={`${FIELD} w-full pr-9 pl-3`}
            />
          </div>

          <select value={filterDept} onChange={(e) => changeFilter(setFilterDept)(e.target.value)} aria-label="تصفية حسب القسم" className={`${FIELD} min-w-40`}>
            <option value="">كل الأقسام</option>
            {withSelected(options.departments, filterDept).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select value={sort} onChange={(e) => changeFilter(setSort)(e.target.value)} aria-label="ترتيب القائمة" className={`${FIELD} min-w-40`}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-controls="accepted-extra-filters"
            className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40 ${
              showFilters || hasExtraFilters
                ? 'border-customBlue bg-customBlue/5 text-customBlue'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={14} aria-hidden="true" />
            فلاتر
            {hasExtraFilters && <span className="h-2 w-2 rounded-full bg-customBlue" aria-label="فلاتر مفعّلة" />}
            <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/60 px-3 text-xs font-black text-red-600 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            >
              <X size={13} aria-hidden="true" />
              إعادة تعيين
            </button>
          )}
        </div>

        {showFilters && (
          <div id="accepted-extra-filters" className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <label htmlFor="accepted-filter-city" className="mb-1 block text-[11px] font-black text-slate-400">المدينة</label>
              <select id="accepted-filter-city" value={filterCity} onChange={(e) => changeFilter(setFilterCity)(e.target.value)} className={SMALL_FIELD}>
                <option value="">الكل</option>
                {withSelected(options.cities, filterCity).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="accepted-filter-availability" className="mb-1 block text-[11px] font-black text-slate-400">التفرغ</label>
              <select id="accepted-filter-availability" value={filterAvailability} onChange={(e) => changeFilter(setFilterAvailability)(e.target.value)} className={SMALL_FIELD}>
                <option value="">الكل</option>
                {withSelected(options.availabilities, filterAvailability).map((a) => (
                  <option key={a} value={a}>{codeLabel(a)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="accepted-filter-cv" className="mb-1 block text-[11px] font-black text-slate-400">السيرة الذاتية</label>
              <select id="accepted-filter-cv" value={filterHasCv} onChange={(e) => changeFilter(setFilterHasCv)(e.target.value)} className={SMALL_FIELD}>
                <option value="">الكل</option>
                <option value="yes">لديه سيرة ذاتية</option>
                <option value="no">بدون سيرة ذاتية</option>
              </select>
            </div>
            <div>
              <label htmlFor="accepted-filter-from" className="mb-1 block text-[11px] font-black text-slate-400">القبول من</label>
              <input id="accepted-filter-from" type="date" value={filterDateFrom} onChange={(e) => changeFilter(setFilterDateFrom)(e.target.value)} className={SMALL_FIELD} />
            </div>
            <div>
              <label htmlFor="accepted-filter-to" className="mb-1 block text-[11px] font-black text-slate-400">القبول إلى</label>
              <input id="accepted-filter-to" type="date" value={filterDateTo} onChange={(e) => changeFilter(setFilterDateTo)(e.target.value)} className={SMALL_FIELD} />
            </div>
          </div>
        )}
      </div>

      {/* Load error: said out loud, with the way to repeat it */}
      {loadError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="flex-1 text-sm font-bold text-red-600">{loadError}</p>
          <button
            type="button"
            onClick={list.retry}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* The list is longer than what was loaded: say so, never pretend it is complete */}
      {!loading && !loadError && listTotal != null && listTotal > items.length && (
        <div role="status" data-testid="truncation-warning" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
          <p>يُعرض أول {items.length} من أصل {listTotal} متطوع فقط. استخدم البحث أو الفلاتر للوصول إلى الباقي.</p>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-busy="true" data-testid="accepted-skeleton">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-xs font-bold text-slate-400" role="status">
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            جارٍ التحميل...
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-slate-50 px-4 py-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24 opacity-60" />
              </div>
              <Skeleton className="hidden h-4 w-24 sm:block" />
              <Skeleton className="hidden h-4 w-16 sm:block" />
            </div>
          ))}
        </div>
      ) : loadError ? null : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Users size={32} className="mx-auto mb-3 text-slate-300" aria-hidden="true" />
          <p className="text-sm font-black text-slate-500">
            {hasActiveFilters ? 'لا توجد نتائج تطابق الفلاتر المحددة' : 'لا يوجد متطوعون مقبولون حالياً'}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {hasActiveFilters ? 'جرّب تعديل الفلاتر أو إعادة تعيينها' : 'ستظهر هنا طلبات التطوع المقبولة'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-xl bg-customBlue/10 px-5 py-2 text-xs font-black text-customBlue transition hover:bg-customBlue/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40"
            >
              إعادة تعيين الفلاتر
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <p className="border-b border-slate-100 px-4 py-3 text-xs font-bold text-slate-500" data-testid="accepted-count">
            <span className="font-black text-deepBlue">{filtered.length}</span> من <span className="font-black text-deepBlue">{listTotal ?? items.length}</span> متطوع مقبول
          </p>
          <table className="w-full min-w-[760px] text-right text-xs">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400">
              <tr>
                {TABLE_HEADS.map((h) => (
                  <th key={h} scope="col" className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((r) => {
                const cvUrl = requestCvUrl(r)

                return (
                  <tr
                    key={r.id}
                    onClick={(e) => {
                      // A click on the name button or the CV link does its own thing; anywhere else on the row opens the window,
                      // and the name button of that row is where focus comes back to.
                      if ((e.target as HTMLElement).closest('a, button')) return
                      openWindow(r, e.currentTarget.querySelector<HTMLElement>('button[data-volunteer-name]'))
                    }}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        data-volunteer-name={r.id}
                        onClick={(e) => openWindow(r, e.currentTarget)}
                        aria-haspopup="dialog"
                        className="block max-w-[260px] rounded-lg text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40"
                      >
                        <span className="block truncate text-[13px] font-black text-deepBlue underline-offset-4 hover:text-customBlue hover:underline"><bdi>{r.full_name}</bdi></span>
                      </button>
                      <span className="block truncate text-[10px] font-semibold text-slate-400" dir="ltr" style={{ textAlign: 'right' }}>{r.email}</span>
                      {r.phone && <span className="block truncate text-[10px] font-semibold text-slate-400" dir="ltr" style={{ textAlign: 'right' }}>{r.phone}</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{r.desired_department ? <bdi>{r.desired_department}</bdi> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{r.city ? <bdi>{r.city}</bdi> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3"><AvailabilityChip value={r.volunteer_days_availability ?? r.availability} /></td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{r.accepted_at ? formatDate(r.accepted_at) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3"><ConversionBadge converted={isConvertedRequest(r)} /></td>
                    <td className="px-4 py-3">
                      {cvUrl ? (
                        <a
                          href={cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`عرض السيرة الذاتية للمتطوع ${r.full_name}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-black text-slate-600 transition hover:border-customBlue hover:bg-customBlue/5 hover:text-customBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40"
                        >
                          <Eye size={13} aria-hidden="true" />
                          عرض
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !loadError && lastPage > 1 && (
        <nav aria-label="صفحات القائمة" className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
          >
            <ChevronRight size={13} aria-hidden="true" />
            السابق
          </button>
          <span className="text-xs font-bold text-slate-500">{currentPage} / {lastPage}</span>
          <button
            type="button"
            disabled={currentPage >= lastPage}
            onClick={() => setPage(currentPage + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
          >
            التالي
            <ChevronLeft size={13} aria-hidden="true" />
          </button>
        </nav>
      )}

      {shown && <AcceptedVolunteerDialog request={shown} onClose={closeWindow} />}
    </div>
  )
}
