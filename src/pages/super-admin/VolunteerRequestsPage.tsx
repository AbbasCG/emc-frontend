import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import {
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  HeartHandshake,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  fetchVolunteerRequests,
  type FetchVolunteerRequestsResult,
  type VolunteerRequest,
  type VolunteerRequestsPagination,
  type VolunteerRequestsStatistics,
  type VolunteerRequestStatus,
} from '@/api/volunteerApplicationApi'
import VolunteerRequestDetailModal from '@/components/volunteer/VolunteerRequestDetailModal'
import { STATUS_CFG } from '@/components/volunteer/volunteerRequestStatus'
import { formatDate } from '@/utils/dateTime'

/* ── Status config (table badges) ──────────────────────────────────── */

const ALL_STATUSES: VolunteerRequestStatus[] = [
  'pending',
  'reviewing',
  'reviewed',
  'accepted',
  'rejected',
  'contacted',
  'converted_to_member',
]

const DEPARTMENTS = [
  'البرامج والمسارات',
  'التسويق والإعلام',
  'التقنية والدعم الفني',
  'الموارد البشرية',
  'الشراكات والعلاقات العامة',
  'المجتمع والصحة النفسية والوعي',
  'الجودة والحوكمة',
  'المالية',
  'التشغيل والعمليات',
  'غير محدد',
]

function StatusBadge({ status }: { status: VolunteerRequestStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${cfg.badge}`}>
      {cfg.label}
    </span>
  )
}

/* ── Pagination bar ─────────────────────────────────────────────────── */

function PaginationBar({
  meta,
  onPage,
  loading,
}: {
  meta: VolunteerRequestsPagination
  onPage: (p: number) => void
  loading: boolean
}) {
  if (meta.last_page <= 1) return null

  const { current_page: cur, last_page: last, from, to, total } = meta
  const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n)

  // Build page range: always show first, last, current ±1, with ellipsis
  const pages: (number | '…')[] = []
  const add = (p: number) => { if (!pages.includes(p)) pages.push(p) }
  add(1)
  if (cur > 3) pages.push('…')
  for (let p = Math.max(2, cur - 1); p <= Math.min(last - 1, cur + 1); p++) add(p)
  if (cur < last - 2) pages.push('…')
  if (last > 1) add(last)

  return (
    <div className="flex flex-col items-center gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:justify-between">
      <p className="text-[11px] font-semibold text-slate-400">
        عرض {fmt(from)}–{fmt(to)} من أصل {fmt(total)} طلبًا
      </p>

      <div className="flex items-center gap-1" dir="ltr">
        {/* Previous */}
        <button
          type="button"
          disabled={cur === 1 || loading}
          onClick={() => onPage(cur - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-[#0077B6]/40 hover:bg-[#0077B6]/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="السابق"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ell-${String(i)}`} className="flex h-8 w-8 items-center justify-center text-[12px] text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              disabled={loading}
              onClick={() => p !== cur && onPage(p as number)}
              className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-[12px] font-black transition ${
                p === cur
                  ? 'border-[#0C2A4B] bg-[#0C2A4B] text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#0077B6]/40 hover:bg-[#0077B6]/[0.06]'
              } disabled:cursor-not-allowed`}
            >
              {p}
            </button>
          ),
        )}

        {/* Next */}
        <button
          type="button"
          disabled={cur === last || loading}
          onClick={() => onPage(cur + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-[#0077B6]/40 hover:bg-[#0077B6]/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="التالي"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/* ── Defaults ───────────────────────────────────────────────────────── */

const EMPTY_META: VolunteerRequestsPagination = {
  current_page: 1, last_page: 1, per_page: 20, total: 0, from: 1, to: 0,
}

const EMPTY_STATS: VolunteerRequestsStatistics = {
  total: 0, pending: 0, reviewing: 0, reviewed: 0,
  accepted: 0, rejected: 0, contacted: 0, converted_to_member: 0,
}

/* ── Main page ─────────────────────────────────────────────────────── */

export default function VolunteerRequestsPage() {
  const { id: routeId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tableRef = useRef<HTMLDivElement>(null)

  const [items, setItems] = useState<VolunteerRequest[]>([])
  const [meta, setMeta] = useState<VolunteerRequestsPagination>(EMPTY_META)
  const [stats, setStats] = useState<VolunteerRequestsStatistics>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filters — all sent to server
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<VolunteerRequestStatus | 'all'>('all')
  const [filterDept, setFilterDept] = useState<string>(() => searchParams.get('department') ?? 'all')
  const [page, setPage] = useState(1)

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const [selected, setSelected] = useState<VolunteerRequest | null>(null)

  // Reset to page 1 whenever filters change — done during render (react.dev
  // "adjusting state when a prop changes") rather than from an effect.
  const filters = { debouncedSearch, filterStatus, filterDept }
  const [seenFilters, setSeenFilters] = useState(filters)
  if (
    seenFilters.debouncedSearch !== debouncedSearch ||
    seenFilters.filterStatus !== filterStatus ||
    seenFilters.filterDept !== filterDept
  ) {
    setSeenFilters(filters)
    setPage(1)
  }

  /** Silent/imperative reload from a handler — outside any effect, so flipping to the
   *  loading state synchronously is allowed here. */
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoadError(null)
    setLoading(true)
    try {
      const result: FetchVolunteerRequestsResult = await fetchVolunteerRequests({
        page,
        per_page: 20,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: debouncedSearch || undefined,
        desired_department: filterDept !== 'all' ? filterDept : undefined,
      })
      setItems(result.data)
      setMeta(result.meta)
      setStats(result.statistics)

      if (routeId && result.data.length) {
        const match = result.data.find((r) => String(r.id) === routeId)
        if (match) setSelected(match)
      }
    } catch {
      setLoadError('تعذّر تحميل قائمة طلبات التطوع.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, filterStatus, filterDept, routeId])

  // Re-arm loading/error during render when the query changes; the initial
  // `loading = true` / `loadError = null` cover the first pass.
  const query = { page, debouncedSearch, filterStatus, filterDept, routeId }
  const [seenQuery, setSeenQuery] = useState(query)
  if (
    seenQuery.page !== page ||
    seenQuery.debouncedSearch !== debouncedSearch ||
    seenQuery.filterStatus !== filterStatus ||
    seenQuery.filterDept !== filterDept ||
    seenQuery.routeId !== routeId
  ) {
    setSeenQuery(query)
    setLoading(true)
    setLoadError(null)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const result: FetchVolunteerRequestsResult = await fetchVolunteerRequests({
          page,
          per_page: 20,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          search: debouncedSearch || undefined,
          desired_department: filterDept !== 'all' ? filterDept : undefined,
        })
        if (!alive) return
        setItems(result.data)
        setMeta(result.meta)
        setStats(result.statistics)

        if (routeId && result.data.length) {
          const match = result.data.find((r) => String(r.id) === routeId)
          if (match) setSelected(match)
        }
      } catch {
        if (alive) setLoadError('تعذّر تحميل قائمة طلبات التطوع.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [page, debouncedSearch, filterStatus, filterDept, routeId])

  function handlePageChange(p: number) {
    setPage(p)
    // Scroll to table top (not window top)
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  function handleUpdated(updated: VolunteerRequest) {
    setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setSelected((prev) => (prev?.id === updated.id ? updated : prev))
    if (updated.status === 'accepted') {
      toast.success('تم قبول طلب التطوع ونقله إلى قائمة المتطوعين المقبولين.')
    }
    // Reload to get fresh statistics
    void load(true)
  }

  function handleClose() {
    setSelected(null)
    if (routeId) navigate('/dashboard/super-admin/volunteer-requests', { replace: true })
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n)

  const kpiIcons: Partial<Record<VolunteerRequestStatus, React.ReactNode>> = {
    pending:             <Clock className="h-4 w-4 text-amber-500" />,
    reviewing:           <Clock className="h-4 w-4 text-orange-500" />,
    reviewed:            <Clock className="h-4 w-4 text-sky-500" />,
    accepted:            <Users className="h-4 w-4 text-emerald-500" />,
    rejected:            <Clock className="h-4 w-4 text-red-500" />,
    contacted:           <Clock className="h-4 w-4 text-violet-500" />,
    converted_to_member: <Users className="h-4 w-4 text-teal-500" />,
  }

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* ── Premium Hero ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#0C2A4B] via-[#1a2a3a] to-[#0077B6] p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-12 left-24 h-48 w-48 rounded-full bg-[#F28C00]/[0.12]" />
        <div className="pointer-events-none absolute -right-8 top-8 h-32 w-32 rounded-full bg-[#0077B6]/20" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <HeartHandshake className="h-4 w-4 text-[#F28C00]" />
              <span className="text-[11px] font-black uppercase tracking-widest text-white/80">إدارة الموارد البشرية</span>
            </div>
            <h1 className="text-[24px] font-black text-white">طلبات التطوع</h1>
            <p className="mt-1.5 text-[13px] font-semibold text-white/60">
              {loading ? 'جاري التحميل...' : `${fmt(stats.total)} طلب مستلم`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-[12px] font-black text-white/80 backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* ── KPI Cards from server statistics ─────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {/* All */}
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`flex flex-col gap-1.5 rounded-2xl border p-4 text-right transition hover:shadow-md ${
            filterStatus === 'all'
              ? 'border-[#0C2A4B] bg-[#0C2A4B] text-white shadow-md'
              : 'border-slate-200 bg-white text-[#0C2A4B] hover:border-[#0C2A4B]/30'
          }`}
        >
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${filterStatus === 'all' ? 'bg-white/15' : 'bg-slate-100'}`}>
            <Users className={`h-4 w-4 ${filterStatus === 'all' ? 'text-white' : 'text-[#0C2A4B]/60'}`} />
          </div>
          <p className={`text-[20px] font-black tabular-nums ${filterStatus === 'all' ? 'text-white' : 'text-[#0C2A4B]'}`} dir="ltr">
            {fmt(stats.total)}
          </p>
          <p className={`text-[10px] font-black ${filterStatus === 'all' ? 'text-white/70' : 'text-slate-400'}`}>الكل</p>
        </button>

        {/* Per-status cards */}
        {ALL_STATUSES.map((s) => {
          const cfg = STATUS_CFG[s]
          const active = filterStatus === s
          const count = stats[s as keyof VolunteerRequestsStatistics] as number
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`flex flex-col gap-1.5 rounded-2xl border p-4 text-right transition hover:shadow-md ${
                active ? `${cfg.badge} shadow-md` : 'border-slate-200 bg-white text-[#0C2A4B] hover:border-slate-300'
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? 'bg-white/50' : 'bg-slate-50'}`}>
                {kpiIcons[s]}
              </div>
              <p className="text-[20px] font-black tabular-nums" dir="ltr">
                {fmt(count)}
              </p>
              <p className={`text-[10px] font-black ${active ? '' : 'text-slate-400'}`}>{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* ── Search + Filters ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد أو الجوال..."
            dir="rtl"
            aria-label="بحث في طلبات التطوع"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-[13px] font-semibold text-[#0C2A4B] outline-none placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <div className="relative">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            dir="rtl"
            aria-label="تصفية حسب القسم"
            className="h-11 min-w-[160px] appearance-none rounded-xl border border-slate-200 bg-white pr-4 pl-9 text-[13px] font-semibold text-[#0C2A4B] outline-none focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
          >
            <option value="all">كل الأقسام</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="font-black text-rose-800">{loadError}</p>
          <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-[#0C2A4B] px-6 py-2.5 text-[13px] font-black text-white">
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div ref={tableRef}>
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={String(i)} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
              <HeartHandshake className="h-8 w-8 text-slate-300" />
            </div>
            <p className="font-black text-[#0C2A4B]">لا توجد طلبات</p>
            <p className="mt-1 text-[13px] text-slate-400">
              {search || filterStatus !== 'all' || filterDept !== 'all'
                ? 'لا نتائج تطابق الفلتر الحالي.'
                : 'لم يتم استلام أي طلبات تطوع بعد.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#0C2A4B]/[0.07] bg-white shadow-lg ring-1 ring-[#0C2A4B]/[0.04]">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-slate-100 bg-gradient-to-l from-slate-50 to-slate-50/50">
                    {['#', 'الاسم', 'البريد', 'الجوال', 'القسم', 'التوفر', 'الحالة', 'تاريخ التقديم'].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-right text-[10px] font-black uppercase tracking-widest text-[#0C2A4B]/40">
                        {h}
                      </th>
                    ))}
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((r, idx) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.3) }}
                      className="group cursor-pointer transition-colors hover:bg-[#0077B6]/[0.03]"
                      onClick={() => setSelected(r)}
                    >
                      <td className="px-5 py-4 text-[11px] font-black text-[#0C2A4B]/30 tabular-nums" dir="ltr">
                        {fmt(r.id)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-bl from-[#0C2A4B] to-[#0077B6] text-[12px] font-black text-white">
                            {r.full_name.charAt(0)}
                          </div>
                          <span className="text-[13px] font-black text-[#0C2A4B]">{r.full_name}</span>
                        </div>
                      </td>
                      <td className="hidden px-5 py-4 text-[12px] font-semibold text-slate-500 md:table-cell" dir="ltr">
                        {r.email}
                      </td>
                      <td className="hidden px-5 py-4 text-[12px] font-semibold text-slate-500 lg:table-cell" dir="ltr">
                        {r.phone ?? '—'}
                      </td>
                      <td className="hidden px-5 py-4 text-[12px] font-semibold text-slate-600 xl:table-cell">
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="h-3 w-3 text-slate-300" />
                          {r.desired_department ?? '—'}
                        </span>
                      </td>
                      <td className="hidden px-5 py-4 text-[12px] font-semibold text-slate-500 xl:table-cell">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-300" />
                          {r.availability ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="hidden px-5 py-4 text-[11px] font-semibold text-slate-400 tabular-nums sm:table-cell">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-300" />
                          {r.created_at ? formatDate(r.created_at) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelected(r) }}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#0077B6]/20 bg-[#0077B6]/[0.06] px-3 py-1.5 text-[10px] font-black text-[#0077B6] opacity-0 transition group-hover:opacity-100 hover:bg-[#0077B6]/[0.12]"
                        >
                          مراجعة
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ─────────────────────────────────────────── */}
            <PaginationBar meta={meta} onPage={handlePageChange} loading={loading} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <VolunteerRequestDetailModal
            req={selected}
            onClose={handleClose}
            onUpdated={handleUpdated}
            onOpenConvert={() => {}}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
