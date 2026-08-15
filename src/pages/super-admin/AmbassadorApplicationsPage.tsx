import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import Select, { type SingleValue, type StylesConfig } from 'react-select'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Globe,
  GraduationCap,
  RefreshCw,
  Search,
  Star,
  Users,
  X,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  fetchAmbassadorApplications,
  fetchAmbassadorApplication,
  fetchAmbassadorFilterOptions,
  AMBASSADOR_STATUS_LABELS,
  AMBASSADOR_STATUS_COLORS,
  type AmbassadorApplication,
  type AmbassadorStatus,
  type AmbassadorListParams,
  type AmbassadorFilterOptions,
} from '@/api/ambassadorApplicationApi'
import AmbassadorApplicationDetailModal from '@/components/admin/AmbassadorApplicationDetailModal'
import AmbassadorExportModal from '@/components/admin/AmbassadorExportModal'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/utils/dateTime'

const EXPORT_ALLOWED_ROLES = ['super_admin', 'executive_admin', 'hr_manager']

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

type Option = { value: string; label: string }

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
          type="button"
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
              type="button"
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
          type="button"
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

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    height: 40,
    borderRadius: 12,
    borderColor: state.isFocused ? 'rgba(0,119,182,0.45)' : '#e2e8f0',
    backgroundColor: '#f8fafc',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(0,119,182,0.12)' : 'none',
    textAlign: 'right',
    direction: 'rtl',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    '&:hover': { borderColor: state.isFocused ? 'rgba(0,119,182,0.45)' : '#cbd5e1' },
  }),
  valueContainer: (base) => ({ ...base, padding: '0 10px', height: 38 }),
  indicatorsContainer: (base) => ({ ...base, height: 38 }),
  dropdownIndicator: (base) => ({ ...base, padding: 6 }),
  clearIndicator: (base) => ({ ...base, padding: 6 }),
  singleValue: (base) => ({ ...base, color: '#0C2A4B' }),
  placeholder: (base) => ({ ...base, color: '#94a3b8', fontWeight: 500 }),
  menu: (base) => ({
    ...base,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 40,
    textAlign: 'right',
    direction: 'rtl',
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    textAlign: 'right',
    backgroundColor: state.isSelected ? '#0C2A4B' : state.isFocused ? '#e0f2fe' : '#fff',
    color: state.isSelected ? '#fff' : '#0C2A4B',
    fontWeight: state.isSelected ? 800 : 600,
    fontSize: 13,
    cursor: 'pointer',
  }),
  input: (base) => ({ ...base, color: '#0C2A4B' }),
}

function toOptions(values: string[]): Option[] {
  return values.map((v) => ({ value: v, label: v }))
}

/* ── Main ───────────────────────────────────────────────────────────── */

const ALL_STATUSES: AmbassadorStatus[] = [
  'new', 'under_review', 'interview_scheduled', 'approved', 'rejected', 'waitlisted', 'cancelled',
]

const EMPTY_OPTIONS: AmbassadorFilterOptions = {
  countries: [],
  cities: [],
  universities: [],
  specializations: [],
}

export default function AmbassadorApplicationsPage() {
  const { id: routeId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [applications, setApplications] = useState<AmbassadorApplication[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [pagination, setPagination] = useState({
    current_page: 1, last_page: 1, per_page: 20, total: 0, from: 1, to: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AmbassadorApplication | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filterOptions, setFilterOptions] = useState<AmbassadorFilterOptions>(EMPTY_OPTIONS)
  const [exportSelectedIds, setExportSelectedIds] = useState<number[]>([])
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const { user } = useAuth()
  const canExport = Boolean(user?.role && EXPORT_ALLOWED_ROLES.includes(String(user.role)))

  const listBase = window.location.pathname.includes('/hr/')
    ? '/dashboard/hr/ambassador-applications'
    : '/dashboard/super-admin/ambassador-applications'

  // URL is the source of truth for list state (refresh / back / share / detail return).
  const search = searchParams.get('search') ?? ''
  const statusFilter = (searchParams.get('status') as AmbassadorStatus | 'all' | null) ?? 'all'
  const country = searchParams.get('country') ?? ''
  const city = searchParams.get('city') ?? ''
  const university = searchParams.get('university') ?? ''
  const specialization = searchParams.get('specialization') ?? ''
  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const [searchInput, setSearchInput] = useState(search)
  const [showFilters, setShowFilters] = useState(() =>
    Boolean(country || city || university || specialization || dateFrom || dateTo),
  )

  // Keep the visible input aligned when browser back/forward changes the URL.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local draft input from URL
    setSearchInput((prev) => (prev === search ? prev : search))
  }, [search])

  const updateParams = useCallback((patch: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  // Debounce global search → URL (resets page).
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchInput.trim()
      const current = search.trim()
      if (next === current) return
      updateParams({ search: next || null, page: null })
    }, 400)
    return () => window.clearTimeout(handle)
  }, [searchInput, search, updateParams])

  const activeFilterCount = [
    search.trim(),
    statusFilter !== 'all' ? statusFilter : '',
    country,
    city,
    university,
    specialization,
    dateFrom,
    dateTo,
  ].filter(Boolean).length

  const hasDedicatedFilters = Boolean(country || city || university || specialization || dateFrom || dateTo || (statusFilter !== 'all') || search.trim())

  const clearFilters = useCallback(() => {
    setSearchInput('')
    updateParams({
      search: null,
      status: null,
      country: null,
      city: null,
      university: null,
      specialization: null,
      date_from: null,
      date_to: null,
      page: null,
    })
  }, [updateParams])

  const setStatusFilter = (s: AmbassadorStatus | 'all') => {
    updateParams({ status: s === 'all' ? null : s, page: null })
  }

  const setPage = (p: number) => {
    updateParams({ page: p > 1 ? String(p) : null })
  }

  const setCountry = (v: string) => {
    // Country changes invalidate city/university selections.
    updateParams({
      country: v || null,
      city: null,
      university: null,
      page: null,
    })
  }

  const setCity = (v: string) => {
    updateParams({ city: v || null, university: null, page: null })
  }

  const setUniversity = (v: string) => {
    updateParams({ university: v || null, page: null })
  }

  const setSpecialization = (v: string) => {
    updateParams({ specialization: v || null, page: null })
  }

  const listParams: AmbassadorListParams = useMemo(() => ({
    page,
    per_page: 20,
    search: search.trim() || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    country: country || undefined,
    city: city || undefined,
    university: university || undefined,
    specialization: specialization || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [page, search, statusFilter, country, city, university, specialization, dateFrom, dateTo])

  const load = useCallback(async (params: AmbassadorListParams, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchAmbassadorApplications(params, signal)
      if (signal?.aborted) return
      setApplications(res.data)
      setPagination(res.meta)
      if (res.statistics && Object.keys(res.statistics).length > 0) {
        setStats({
          total: res.statistics.total ?? res.meta.total,
          new: res.statistics.new ?? 0,
          under_review: res.statistics.under_review ?? 0,
          interview_scheduled: res.statistics.interview_scheduled ?? 0,
          approved: res.statistics.approved ?? 0,
          rejected: res.statistics.rejected ?? 0,
          waitlisted: res.statistics.waitlisted ?? 0,
        })
      }
    } catch (err) {
      if (signal?.aborted || (err as { code?: string; name?: string })?.code === 'ERR_CANCELED' || (err as { name?: string })?.name === 'CanceledError') {
        return
      }
      setError('فشل تحميل الطلبات')
      toast.error('فشل تحميل الطلبات')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  // Re-arm loading during render when the query changes (react.dev "adjusting
  // state when a prop changes"), so the fetch effect below never touches state
  // synchronously — `load` stays for event handlers, where sync setLoading is fine.
  const [seenParams, setSeenParams] = useState(listParams)
  if (seenParams !== listParams) {
    setSeenParams(listParams)
    setLoading(true)
    setError(null)
  }

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const res = await fetchAmbassadorApplications(listParams, controller.signal)
        if (controller.signal.aborted) return
        setApplications(res.data)
        setPagination(res.meta)
        if (res.statistics && Object.keys(res.statistics).length > 0) {
          setStats({
            total: res.statistics.total ?? res.meta.total,
            new: res.statistics.new ?? 0,
            under_review: res.statistics.under_review ?? 0,
            interview_scheduled: res.statistics.interview_scheduled ?? 0,
            approved: res.statistics.approved ?? 0,
            rejected: res.statistics.rejected ?? 0,
            waitlisted: res.statistics.waitlisted ?? 0,
          })
        }
      } catch (err) {
        if (controller.signal.aborted || (err as { code?: string })?.code === 'ERR_CANCELED' || (err as { name?: string })?.name === 'CanceledError') {
          return
        }
        setError('فشل تحميل الطلبات')
        toast.error('فشل تحميل الطلبات')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [listParams])

  useEffect(() => {
    const controller = new AbortController()
    fetchAmbassadorFilterOptions(
      { country: country || undefined, city: city || undefined },
      controller.signal,
    )
      .then((opts) => {
        if (!controller.signal.aborted) setFilterOptions(opts)
      })
      .catch(() => {
        /* keep previous options */
      })
    return () => controller.abort()
  }, [country, city])

  // If city/university become incompatible after options refresh, clear them.
  useEffect(() => {
    const patch: Record<string, string | null> = {}
    if (city && filterOptions.cities.length > 0 && !filterOptions.cities.includes(city)) {
      patch.city = null
    }
    if (university && filterOptions.universities.length > 0 && !filterOptions.universities.includes(university)) {
      patch.university = null
    }
    if (Object.keys(patch).length > 0) {
      patch.page = null
      updateParams(patch)
    }
  }, [filterOptions, city, university, updateParams])

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

  const openDetail = (id: number) => {
    // Keep current list URL (with filters) in history so detail Back restores it.
    navigate(`${listBase}/${id}`)
  }

  function handleCloseModal() {
    setSelected(null)
    if (routeId) {
      const qs = searchParams.toString()
      navigate(`${listBase}${qs ? `?${qs}` : ''}`, { replace: true })
    }
  }

  function handleUpdated(updated: AmbassadorApplication) {
    setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    setSelected(updated)
    void load(listParams)
  }

  const countryOptions = useMemo(() => toOptions(filterOptions.countries), [filterOptions.countries])
  const cityOptions = useMemo(() => toOptions(filterOptions.cities), [filterOptions.cities])
  const universityOptions = useMemo(() => toOptions(filterOptions.universities), [filterOptions.universities])
  const specializationOptions = useMemo(() => toOptions(filterOptions.specializations), [filterOptions.specializations])

  const chips = useMemo(() => {
    const items: { key: string; label: string; onClear: () => void }[] = []
    if (search.trim()) {
      items.push({
        key: 'search',
        label: `بحث: ${search.trim()}`,
        onClear: () => { setSearchInput(''); updateParams({ search: null, page: null }) },
      })
    }
    if (statusFilter !== 'all') {
      items.push({
        key: 'status',
        label: `الحالة: ${AMBASSADOR_STATUS_LABELS[statusFilter as AmbassadorStatus] ?? statusFilter}`,
        onClear: () => updateParams({ status: null, page: null }),
      })
    }
    if (country) {
      items.push({
        key: 'country',
        label: `الدولة: ${country}`,
        onClear: () => updateParams({ country: null, city: null, university: null, page: null }),
      })
    }
    if (city) {
      items.push({
        key: 'city',
        label: `المدينة: ${city}`,
        onClear: () => updateParams({ city: null, university: null, page: null }),
      })
    }
    if (university) {
      items.push({
        key: 'university',
        label: `الجامعة: ${university}`,
        onClear: () => updateParams({ university: null, page: null }),
      })
    }
    if (specialization) {
      items.push({
        key: 'specialization',
        label: `التخصص: ${specialization}`,
        onClear: () => updateParams({ specialization: null, page: null }),
      })
    }
    if (dateFrom || dateTo) {
      items.push({
        key: 'dates',
        label: `التاريخ: ${dateFrom || '…'} → ${dateTo || '…'}`,
        onClear: () => updateParams({ date_from: null, date_to: null, page: null }),
      })
    }
    return items
  }, [search, statusFilter, country, city, university, specialization, dateFrom, dateTo, updateParams])

  return (
    <div dir="rtl" className="min-h-screen bg-[#f4f7fb] p-4 sm:p-6 lg:p-8">
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
        <div className="flex items-center gap-2">
          {canExport && (
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-deepBlue px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
            >
              <Download size={15} />
              تصدير البيانات
            </button>
          )}
          <button
            type="button"
            onClick={() => void load(listParams)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>
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
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ابحث بالاسم أو البريد أو الجامعة أو الدولة أو المدينة..."
              dir="rtl"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition ${
              showFilters || activeFilterCount > 0
                ? 'border-customBlue/40 bg-customBlue/10 text-customBlue'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={15} />
            فلاتر
            {activeFilterCount > 0 && (
              <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-deepBlue px-1.5 text-[10px] font-black text-white">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={13} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {activeFilterCount > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
              >
                <X size={14} />
                مسح الفلاتر
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Status tabs */}
        <div className="mb-1 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              statusFilter === 'all' ? 'bg-deepBlue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل
          </button>
          {ALL_STATUSES.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === s ? 'bg-deepBlue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {AMBASSADOR_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-slate-400">الدولة</label>
                  <Select<Option, false>
                    isClearable
                    isSearchable
                    placeholder="كل الدول"
                    options={countryOptions}
                    value={countryOptions.find((o) => o.value === country) ?? null}
                    onChange={(opt: SingleValue<Option>) => setCountry(opt?.value ?? '')}
                    styles={selectStyles}
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    noOptionsMessage={() => 'لا توجد خيارات'}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-slate-400">المدينة</label>
                  <Select<Option, false>
                    isClearable
                    isSearchable
                    placeholder="كل المدن"
                    options={cityOptions}
                    value={cityOptions.find((o) => o.value === city) ?? null}
                    onChange={(opt: SingleValue<Option>) => setCity(opt?.value ?? '')}
                    styles={selectStyles}
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    noOptionsMessage={() => 'لا توجد خيارات'}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-slate-400">الجامعة</label>
                  <Select<Option, false>
                    isClearable
                    isSearchable
                    placeholder="كل الجامعات"
                    options={universityOptions}
                    value={universityOptions.find((o) => o.value === university) ?? null}
                    onChange={(opt: SingleValue<Option>) => setUniversity(opt?.value ?? '')}
                    styles={selectStyles}
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    noOptionsMessage={() => 'لا توجد خيارات'}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-slate-400">التخصص</label>
                  <Select<Option, false>
                    isClearable
                    isSearchable
                    placeholder="كل التخصصات"
                    options={specializationOptions}
                    value={specializationOptions.find((o) => o.value === specialization) ?? null}
                    onChange={(opt: SingleValue<Option>) => setSpecialization(opt?.value ?? '')}
                    styles={selectStyles}
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    noOptionsMessage={() => 'لا توجد خيارات'}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-slate-400">من تاريخ</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => updateParams({ date_from: e.target.value || null, page: null })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-2 focus:ring-sky-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-slate-400">إلى تاريخ</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => updateParams({ date_to: e.target.value || null, page: null })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onClear}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-slate-200"
              >
                {chip.label}
                <X size={12} className="text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {canExport && (
                  <th className="w-10 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={applications.length > 0 && applications.every((a) => exportSelectedIds.includes(a.id))}
                      onChange={(e) => {
                        e.stopPropagation()
                        setExportSelectedIds((prev) =>
                          e.target.checked
                            ? Array.from(new Set([...prev, ...applications.map((a) => a.id)]))
                            : prev.filter((id) => !applications.some((a) => a.id === id)),
                        )
                      }}
                      className="h-4 w-4 rounded border-slate-300 accent-deepBlue"
                    />
                  </th>
                )}
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">#</th>
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">المتقدم</th>
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">الجامعة</th>
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">المدينة</th>
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">الدولة</th>
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">التخصص</th>
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">الحالة</th>
                <th className="px-4 py-3.5 text-xs font-black text-slate-500">تاريخ التقديم</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <p className="text-sm font-bold text-red-500">{error}</p>
                    <button
                      type="button"
                      onClick={() => void load(listParams)}
                      className="mt-3 rounded-xl bg-deepBlue px-4 py-2 text-xs font-bold text-white"
                    >
                      إعادة المحاولة
                    </button>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Star className="mx-auto mb-3 text-slate-200" size={36} />
                    <p className="text-sm font-bold text-slate-400">
                      {hasDedicatedFilters
                        ? 'لا توجد طلبات مطابقة لمعايير البحث الحالية'
                        : 'لا توجد طلبات'}
                    </p>
                    {hasDedicatedFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                      >
                        <X size={13} />
                        مسح الفلاتر
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                applications.map((app, idx) => (
                  <tr
                    key={app.id}
                    onClick={() => openDetail(app.id)}
                    className="cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50/70"
                  >
                    {canExport && (
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={exportSelectedIds.includes(app.id)}
                          onChange={(e) =>
                            setExportSelectedIds((prev) =>
                              e.target.checked ? [...prev, app.id] : prev.filter((id) => id !== app.id),
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300 accent-deepBlue"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-xs font-bold text-slate-400">
                      {(pagination.current_page - 1) * (pagination.per_page || 20) + idx + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-black text-deepBlue">{app.full_name}</div>
                      <div className="text-xs text-slate-500">{app.email}</div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">{app.university_name ?? '—'}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">{app.city ?? '—'}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">{app.country ?? '—'}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">{app.major ?? '—'}</td>
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
          onPage={setPage}
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

      <AnimatePresence>
        {exportModalOpen && (
          <AmbassadorExportModal
            onClose={() => setExportModalOpen(false)}
            currentSearch={search}
            selectedIds={exportSelectedIds}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
