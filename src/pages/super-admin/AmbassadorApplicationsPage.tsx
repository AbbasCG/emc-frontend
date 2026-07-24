import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Star,
  Users,
  Globe,
  GraduationCap,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  fetchAmbassadorApplications,
  fetchAmbassadorApplication,
  AMBASSADOR_STATUS_LABELS,
  AMBASSADOR_STATUS_COLORS,
  type AmbassadorApplication,
  type AmbassadorStatus,
  type AmbassadorListParams,
} from '@/api/ambassadorApplicationApi'
import AmbassadorApplicationDetailModal from '@/components/admin/AmbassadorApplicationDetailModal'
import { formatDate } from '@/utils/dateTime'

/* ── Types ─────────────────────────────────────────────────────────── */

type Stats = {
  total: number
  new: number
  under_review: number
  interview_scheduled: number
  approved: number
  rejected: number
  waitlisted: number
}

/* ── Status Badge ───────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: AmbassadorStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${AMBASSADOR_STATUS_COLORS[status]}`}>
      {AMBASSADOR_STATUS_LABELS[status]}
    </span>
  )
}

/* ── Stat Card ──────────────────────────────────────────────────────── */

function StatCard({
  label, value, icon: Icon, accent,
}: {
  label: string; value: number; icon: React.ElementType; accent: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-deepBlue">{value.toLocaleString('ar')}</p>
        <p className="text-xs font-bold text-slate-500">{label}</p>
      </div>
    </div>
  )
}

/* ── Pagination ─────────────────────────────────────────────────────── */

function PaginationBar({
  current, last, total, from, to, onPage, loading,
}: {
  current: number; last: number; total: number; from: number; to: number;
  onPage: (p: number) => void; loading: boolean
}) {
  if (last <= 1) return null

  const pages: (number | '…')[] = []
  const add = (p: number) => { if (!pages.includes(p)) pages.push(p) }
  add(1)
  if (current - 1 > 2) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(last - 1, current + 1); p++) add(p)
  if (current + 1 < last - 1) pages.push('…')
  if (last > 1) add(last)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-6">
      <p className="text-xs font-semibold text-slate-500">
        عرض {from}–{to} من {total.toLocaleString('ar')}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(current - 1)}
          disabled={current === 1 || loading}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`el${i}`} className="px-1 text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              disabled={loading}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${
                p === current ? 'bg-deepBlue text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPage(current + 1)}
          disabled={current === last || loading}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
    </div>
  )
}

/* ── Main ───────────────────────────────────────────────────────────── */

const ALL_STATUSES: AmbassadorStatus[] = [
  'new', 'under_review', 'interview_scheduled', 'approved', 'rejected', 'waitlisted', 'cancelled',
]

/** Pure I/O + shaping — no state — shared by the list effect and the imperative `load`,
 *  so neither has to call a state-mutating helper. */
async function loadApplications(params: AmbassadorListParams) {
  const res = await fetchAmbassadorApplications(params)
  const s = res.statistics
  const stats: Stats | null =
    s && Object.keys(s).length > 0
      ? {
          total: s.total ?? res.meta.total,
          new: s.new ?? 0,
          under_review: s.under_review ?? 0,
          interview_scheduled: s.interview_scheduled ?? 0,
          approved: s.approved ?? 0,
          rejected: s.rejected ?? 0,
          waitlisted: s.waitlisted ?? 0,
        }
      : null
  return { rows: res.data, meta: res.meta, stats }
}

export default function AmbassadorApplicationsPage() {
  const { id: routeId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [applications, setApplications] = useState<AmbassadorApplication[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, from: 1, to: 0 })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AmbassadorApplication | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const listBase = window.location.pathname.includes('/hr/')
    ? '/dashboard/hr/ambassador-applications'
    : '/dashboard/super-admin/ambassador-applications'

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [statusFilter, setStatusFilter] = useState<AmbassadorStatus | 'all'>((searchParams.get('status') as AmbassadorStatus) ?? 'all')
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1))

  /** Imperative (re)load from an event handler — outside any effect, so flipping to
   *  the loading state synchronously is both allowed and required here. */
  const load = useCallback(async (params: AmbassadorListParams) => {
    setLoading(true)
    try {
      const { rows, meta, stats: next } = await loadApplications(params)
      setApplications(rows)
      setPagination(meta)
      if (next) setStats(next)
    } catch {
      toast.error('فشل تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }, [])

  // Re-arm the loading state during render when the query changes (react.dev
  // "adjusting state when a prop changes"); `loading` already starts as `true`.
  const [seenQuery, setSeenQuery] = useState({ page, statusFilter })
  if (seenQuery.page !== page || seenQuery.statusFilter !== statusFilter) {
    setSeenQuery({ page, statusFilter })
    setLoading(true)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const { rows, meta, stats: next } = await loadApplications({
          page,
          per_page: 20,
          search: search || undefined,
          status: statusFilter,
        })
        if (!alive) return
        setApplications(rows)
        setPagination(meta)
        if (next) setStats(next)
      } catch {
        if (alive) toast.error('فشل تحميل الطلبات')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [page, statusFilter])

  // ── Detail modal driven by the route id
  const numericRouteId = routeId !== undefined ? Number(routeId) : Number.NaN
  const routeMatch =
    Number.isFinite(numericRouteId)
      ? (applications.find((a) => a.id === numericRouteId) ?? null)
      : null

  // Adopting a row that is already in the list, and arming the detail spinner when it
  // is not, both happen during render — so the effect below only sets state after an
  // await. `seenRoute` starts as `null` so the very first pass still runs.
  const [seenRoute, setSeenRoute] = useState<
    { routeId: string | undefined; match: AmbassadorApplication | null } | null
  >(null)
  if (seenRoute === null || seenRoute.routeId !== routeId || seenRoute.match !== routeMatch) {
    setSeenRoute({ routeId, match: routeMatch })
    if (routeMatch) setSelected(routeMatch)
    else if (Number.isFinite(numericRouteId)) setDetailLoading(true)
  }

  useEffect(() => {
    if (!Number.isFinite(numericRouteId) || routeMatch) return

    let cancelled = false
    void (async () => {
      try {
        const app = await fetchAmbassadorApplication(numericRouteId)
        if (!cancelled) setSelected(app)
      } catch {
        if (!cancelled) toast.error('تعذّر تحميل تفاصيل الطلب')
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [numericRouteId, routeMatch])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load({ page: 1, per_page: 20, search: search || undefined, status: statusFilter })
  }

  const handleStatusFilter = (s: AmbassadorStatus | 'all') => {
    setStatusFilter(s)
    setPage(1)
  }

  const handlePage = (p: number) => setPage(p)

  const openDetail = (id: number) => {
    navigate(`${listBase}/${id}`)
  }

  function handleCloseModal() {
    setSelected(null)
    if (routeId) navigate(listBase, { replace: true })
  }

  function handleUpdated(updated: AmbassadorApplication) {
    setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    setSelected(updated)
    void load({ page, per_page: 20, search: search || undefined, status: statusFilter })
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-deepBlue/[0.07]">
            <Star className="text-deepBlue" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-deepBlue">طلبات سفراء التحول الرقمي</h1>
            <p className="text-xs font-semibold text-slate-500">إدارة ومراجعة طلبات الانضمام لبرنامج السفراء</p>
          </div>
        </div>
        <button
          onClick={() => load({ page, per_page: 20, search: search || undefined, status: statusFilter })}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          <StatCard label="إجمالي الطلبات" value={stats.total} icon={Users} accent="bg-deepBlue" />
          <StatCard label="جديد" value={stats.new} icon={Star} accent="bg-customBlue" />
          <StatCard label="مقبول" value={stats.approved} icon={GraduationCap} accent="bg-emerald-500" />
          <StatCard label="مقابلة مجدولة" value={stats.interview_scheduled} icon={Globe} accent="bg-indigo-500" />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <form onSubmit={handleSearch} className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو البريد أو الجامعة..."
              dir="rtl"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-deepBlue px-5 text-sm font-extrabold text-white transition hover:bg-deepBlue/90"
          >
            بحث
          </button>
        </form>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              statusFilter === 'all' ? 'bg-deepBlue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل
          </button>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === s ? 'bg-deepBlue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {AMBASSADOR_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">#</th>
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">المتقدم</th>
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">الجامعة</th>
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">التخصص</th>
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">الدولة</th>
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">الحالة</th>
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">تاريخ التقديم</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Star className="mx-auto mb-3 text-slate-200" size={36} />
                    <p className="text-sm font-bold text-slate-400">لا توجد طلبات</p>
                  </td>
                </tr>
              ) : (
                applications.map((app, idx) => (
                  <tr
                    key={app.id}
                    onClick={() => openDetail(app.id)}
                    className="cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3.5 text-xs font-bold text-slate-400">
                      {(pagination.current_page - 1) * 20 + idx + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-black text-deepBlue">{app.full_name}</div>
                      <div className="text-xs text-slate-500">{app.email}</div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">{app.university_name ?? '—'}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">{app.major ?? '—'}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">{app.country ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-slate-500">
                      {app.created_at ? formatDate(app.created_at) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          current={pagination.current_page}
          last={pagination.last_page}
          total={pagination.total}
          from={pagination.from}
          to={pagination.to}
          onPage={handlePage}
          loading={loading}
        />
      </div>

      {(detailLoading && routeId && !selected) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0F172A]/30 backdrop-blur-[2px]">
          <div className="rounded-2xl bg-white px-6 py-4 shadow-xl">
            <p className="text-sm font-bold text-[#0C2A4B]">جاري تحميل تفاصيل الطلب...</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <AmbassadorApplicationDetailModal
            app={selected}
            onClose={handleCloseModal}
            onUpdated={handleUpdated}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
