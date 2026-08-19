import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ElementType } from 'react'
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  convertVolunteerToMember,
  fetchAcceptedVolunteers,
  type AcceptedVolunteersMeta,
  type VolunteerRequest,
} from '@/api/volunteerApplicationApi'
import { formatDate } from '@/utils/dateTime'
import VolunteerRequestDetailModal from '@/components/volunteer/VolunteerRequestDetailModal'
import { AnimatePresence, motion } from 'framer-motion'

/* ─────────────────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────────────────── */

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
]

const SORT_OPTIONS = [
  { value: 'accepted_asc',  label: 'الأقدم قبولاً أولاً' },
  { value: 'accepted_desc', label: 'الأحدث قبولاً أولاً' },
  { value: 'name_asc',      label: 'الاسم أ-ي' },
  { value: 'department',    label: 'حسب القسم' },
  { value: 'city',          label: 'حسب المدينة' },
]

const AVAILABILITY_MAP: Record<string, { label: string; cls: string }> = {
  full_time: { label: 'دوام كامل',       cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' },
  part_time: { label: 'دوام جزئي',       cls: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/60' },
  weekends:  { label: 'نهاية الأسبوع',  cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/60' },
  flexible:  { label: 'مرن',             cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60' },
}

/* Predetermined widths — avoid Math.random() in render */
const SKELETON_ROWS: string[][] = [
  ['w-6','w-36','w-24','w-16','w-20','w-24','w-20','w-10','w-32'],
  ['w-6','w-28','w-20','w-20','w-16','w-20','w-16','w-10','w-32'],
  ['w-6','w-32','w-28','w-14','w-20','w-28','w-24','w-10','w-32'],
  ['w-6','w-24','w-24','w-18','w-20','w-24','w-16','w-10','w-32'],
  ['w-6','w-36','w-20','w-12','w-24','w-20','w-20','w-10','w-32'],
]

const DEPT_COLORS = [
  'bg-sky-50 text-sky-700 ring-1 ring-sky-200/60',
  'bg-violet-50 text-violet-700 ring-1 ring-violet-200/60',
  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  'bg-pink-50 text-pink-700 ring-1 ring-pink-200/60',
  'bg-teal-50 text-teal-700 ring-1 ring-teal-200/60',
  'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60',
  'bg-orange-50 text-orange-700 ring-1 ring-orange-200/60',
  'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',
]

/* ─────────────────────────────────────────────────────────────────────────
   Pure utilities
───────────────────────────────────────────────────────────────────────── */

function hashStr(s: string): number {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return h
}

const getDeptColor = (d: string) => DEPT_COLORS[hashStr(d) % DEPT_COLORS.length]

/** Server-side query for the accepted-volunteers list. */
type VolunteersQuery = {
  sort: string
  dept: string
  city: string
  availability: string
  hasCv: string
  dateFrom: string
  dateTo: string
}

/**
 * Pure I/O — no state plumbing, so both the fetch effect and the "refresh"/"retry"
 * handlers can call it and do their own `setState` around it.
 */
function requestAcceptedVolunteers(query: VolunteersQuery) {
  const params: Record<string, string> = { sort: query.sort, per_page: '200' }
  if (query.dept)         params.desired_department = query.dept
  if (query.city)         params.city               = query.city
  if (query.availability) params.availability       = query.availability
  if (query.hasCv)        params.has_cv             = query.hasCv
  if (query.dateFrom)     params.date_from          = query.dateFrom
  if (query.dateTo)       params.date_to            = query.dateTo
  return fetchAcceptedVolunteers(params)
}

/* ─────────────────────────────────────────────────────────────────────────
   CountUp hook
───────────────────────────────────────────────────────────────────────── */

function useCountUp(target: number, duration = 1200): number {
  const [val, setVal] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    cancelAnimationFrame(raf.current)
    if (target === 0) return
    const t0 = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - t0) / duration, 1)
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  // A zero target has nothing to animate — derive it during render instead of
  // resetting the animated value from the effect.
  return target === 0 ? 0 : val
}

/* ─────────────────────────────────────────────────────────────────────────
   Skeleton / shimmer
───────────────────────────────────────────────────────────────────────── */

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-100 ${className ?? ''}`}>
      <div className="absolute inset-0 animate-shimmer bg-emc-shimmer bg-[length:200%_100%]" />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-emc-xs ring-1 ring-slate-100">
      <Shimmer className="mb-4 h-11 w-11 rounded-xl" />
      <Shimmer className="mb-3 h-3 w-20" />
      <Shimmer className="h-8 w-14" />
    </div>
  )
}

function SkeletonRow({ widths }: { widths: string[] }) {
  return (
    <tr className="border-b border-slate-50">
      {widths.map((w, i) => (
        <td key={i} className="px-5 py-5">
          <Shimmer className={`h-4 ${w}`} />
          {i === 1 && <Shimmer className="mt-2 h-3 w-20 opacity-60" />}
        </td>
      ))}
    </tr>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Tooltip
───────────────────────────────────────────────────────────────────────── */

function Tooltip({ children, label }: { children: React.ReactNode; label: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 3, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 3, scale: 0.92 }}
            transition={{ duration: 0.1 }}
            className="pointer-events-none absolute bottom-full left-1/2 z-[100] mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-500 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-emc"
          >
            {label}
            <span
              className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2"
              style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #0C2A4B' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   DepartmentBadge fixes Arabic text wrapping
───────────────────────────────────────────────────────────────────────── */

function DepartmentBadge({ dept }: { dept: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-[12px] font-bold ${getDeptColor(dept)}`}
      style={{
        maxWidth: '220px',
        textAlign: 'center',
        whiteSpace: 'normal',
        lineHeight: '1.35',
        wordBreak: 'keep-all',
        overflowWrap: 'break-word',
        hyphens: 'none',
      }}
    >
      {dept}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   VolunteerAvatar
───────────────────────────────────────────────────────────────────────── */

function VolunteerAvatar({ name: _name }: { name: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-[#F1F5F9]"
    >
      <UserCheck size={18} className="text-[#64748B]" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   KPI Card
───────────────────────────────────────────────────────────────────────── */

interface KpiProps {
  label: string
  value: number | string
  icon: ElementType
  iconBg: string
  iconColor: string
  accentGradient: string
  delay?: number
  isString?: boolean
}

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, accentGradient, delay = 0, isString = false }: KpiProps) {
  const count = useCountUp(typeof value === 'number' ? value : 0)
  const isLong = isString && typeof value === 'string' && value.length > 12

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 0.61, 0.36, 1] }}
      whileHover="hover"
      variants={{ hover: { y: -4, transition: { duration: 0.2, ease: [0.22, 0.61, 0.36, 1] } } }}
      className="group relative cursor-default overflow-hidden rounded-2xl bg-white p-6 shadow-kpi ring-1 ring-slate-100/80 transition-shadow duration-300 hover:shadow-emc-md hover:ring-slate-200"
    >
      {/* Colored top accent bar */}
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-l ${accentGradient} opacity-80`} />

      <div className="flex flex-col gap-3">
        {/* Icon rotates via Framer variant propagation on parent hover */}
        <motion.div
          variants={{ hover: { rotate: 8, transition: { duration: 0.25, ease: [0.34, 1.56, 0.64, 1] } } }}
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon size={20} className={iconColor} />
        </motion.div>

        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-500">{label}</p>

        <p className={`font-black leading-none text-ink-500 ${isLong ? 'text-base leading-snug' : 'text-3xl'}`}>
          {isString ? value : count}
        </p>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   ConvertModal logic unchanged, UI polished
───────────────────────────────────────────────────────────────────────── */

function ConvertModal({
  req,
  onClose,
  onConverted,
}: {
  req: VolunteerRequest
  onClose: () => void
  onConverted: (updated: VolunteerRequest) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      const updated = await convertVolunteerToMember(req.id)
      toast.success('تم تحويل المتطوع إلى عضو بنجاح')
      onConverted(updated)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        toast.warning('هذا المتطوع محوّل بالفعل إلى عضو')
        onClose()
      } else {
        toast.error('تعذّر التحويل. تحقق من الاتصال وأعد المحاولة.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="convert-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-emc-xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="h-1.5 bg-gradient-to-l from-emerald-500 to-teal-400" />
        <div className="p-7 text-right">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
              <UserCheck size={22} className="text-emerald-600" />
            </div>
            <div>
              <h2 id="convert-modal-title" className="text-lg font-black text-ink-500">
                تحويل المتطوع إلى عضو
              </h2>
              <p className="mt-0.5 text-[12px] font-medium text-muted-500">إجراء لا يمكن التراجع عنه</p>
            </div>
          </div>

          <p className="text-sm font-medium leading-relaxed text-slate-600">
            سيتم إنشاء سجل عضو جديد لـ{' '}
            <span className="font-black text-ink-500">{req.full_name}</span>{' '}
            وتغيير حالته إلى <span className="font-black text-emerald-700">تم التحويل</span>.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-l from-emerald-600 to-teal-500 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-100/60 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-emerald-200 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
              تأكيد التحويل إلى عضو
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-500 transition-all duration-150 hover:bg-slate-50 disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────────────── */

export default function AcceptedVolunteersPage() {
  const [items, setItems] = useState<VolunteerRequest[]>([])
  const [meta, setMeta] = useState<AcceptedVolunteersMeta>({
    total_accepted: 0,
    total_converted: 0,
    accepted_this_month: 0,
    top_department: null,
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  /* filters — unchanged */
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterAvailability, setFilterAvailability] = useState('')
  const [filterHasCv, setFilterHasCv] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [sort, setSort] = useState('accepted_asc')
  const [showFilters, setShowFilters] = useState(false)

  /* modals */
  const [selected, setSelected] = useState<VolunteerRequest | null>(null)
  const [convertTarget, setConvertTarget] = useState<VolunteerRequest | null>(null)

  /* ── Data loading ─────────────────────────────────────────────────── */
  const query = useMemo<VolunteersQuery>(
    () => ({
      sort,
      dept: filterDept,
      city: filterCity,
      availability: filterAvailability,
      hasCv: filterHasCv,
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
    }),
    [sort, filterDept, filterCity, filterAvailability, filterHasCv, filterDateFrom, filterDateTo],
  )

  // Return to the loading state during render when the server-side query changes, so
  // the effect below never has to set it synchronously (react.dev "adjusting state").
  const [seenQuery, setSeenQuery] = useState(query)
  if (seenQuery !== query) {
    setSeenQuery(query)
    setLoading(true)
    setLoadError(null)
  }

  // Imperative re-run from the refresh / retry buttons — outside an effect, so it may
  // flip to the loading state synchronously.
  const load = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const result = await requestAcceptedVolunteers(query)
      setItems(result.data)
      setMeta(result.meta)
    } catch {
      setLoadError('تعذّر تحميل قائمة المتطوعين المقبولين.')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const result = await requestAcceptedVolunteers(query)
        if (!alive) return
        setItems(result.data)
        setMeta(result.meta)
      } catch {
        if (!alive) return
        setLoadError('تعذّر تحميل قائمة المتطوعين المقبولين.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [query])

  /* ── Client-side search — unchanged ──────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((r) => {
      if (!q) return true
      const hay = `${r.full_name} ${r.email} ${r.phone ?? ''} ${r.city ?? ''} ${r.desired_department ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [items, search])

  /* ── Callbacks — unchanged ────────────────────────────────────────── */
  function handleConverted(updated: VolunteerRequest) {
    setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setConvertTarget(null)
    setTimeout(() => setItems((prev) => prev.filter((r) => r.id !== updated.id)), 800)
  }

  function handleUpdated(updated: VolunteerRequest) {
    setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setSelected((prev) => (prev?.id === updated.id ? updated : prev))
  }

  function resetFilters() {
    setSearch('')
    setFilterDept('')
    setFilterCity('')
    setFilterAvailability('')
    setFilterHasCv('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSort('accepted_asc')
  }

  const hasActiveFilters = !!(
    search || filterDept || filterCity || filterAvailability ||
    filterHasCv || filterDateFrom || filterDateTo || sort !== 'accepted_asc'
  )
  const hasExtraFilters = !!(filterCity || filterAvailability || filterHasCv || filterDateFrom || filterDateTo)

  const cities = useMemo(() => {
    const s = new Set<string>()
    items.forEach((r) => { if (r.city) s.add(r.city) })
    return Array.from(s).sort()
  }, [items])

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#F8FAFC]" dir="rtl">

      {/* ══ Hero Header ═══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden border-b border-slate-200/80 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-emc-hero opacity-60" />
        <div className="relative mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between gap-6">

            {/* RTL start (visual right): brand icon */}
            <motion.div
              initial={{ scale: 0.7, rotate: -15, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient shadow-emc-glow"
            >
              <UserCheck size={28} className="text-white" />
            </motion.div>

            {/* Center: title + subtitle */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
              className="flex-1 text-center"
            >
              <h1 className="text-[26px] font-black leading-tight text-ink-500 sm:text-3xl">
                المتطوعون المقبولون
              </h1>
              <p className="mt-1.5 text-sm font-medium text-muted-500">
                إدارة المتطوعين المقبولين قبل تحويلهم إلى أعضاء رسميين
              </p>
            </motion.div>

            {/* RTL end (visual left): refresh */}
            <motion.button
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
              type="button"
              onClick={() => void load()}
              disabled={loading}
              aria-label="تحديث البيانات"
              className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-emc-xs transition-all duration-150 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 hover:shadow-emc-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              تحديث
            </motion.button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-8xl space-y-5 px-6 py-7">

        {/* ══ KPI Cards ════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {loading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : (
            <>
              <KpiCard
                label="بانتظار التحويل" value={meta.total_accepted}
                icon={UserCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600"
                accentGradient="from-emerald-400 to-teal-400" delay={0}
              />
              <KpiCard
                label="تم التحويل" value={meta.total_converted}
                icon={CheckCircle2} iconBg="bg-sky-50" iconColor="text-sky-600"
                accentGradient="from-sky-400 to-blue-500" delay={0.1}
              />
              <KpiCard
                label="مقبولون هذا الشهر" value={meta.accepted_this_month}
                icon={TrendingUp} iconBg="bg-violet-50" iconColor="text-violet-600"
                accentGradient="from-violet-400 to-purple-500" delay={0.2}
              />
              <KpiCard
                label="أكثر قسم طلباً" value={meta.top_department ?? '—'}
                icon={Award} iconBg="bg-amber-50" iconColor="text-amber-600"
                accentGradient="from-amber-400 to-orange-400" delay={0.3} isString
              />
            </>
          )}
        </div>

        {/* ══ Filter Toolbar ═══════════════════════════════════════════ */}
        <div className="rounded-2xl bg-white p-4 shadow-emc-xs ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">

            {/* Search grows */}
            <div className="relative min-w-[180px] flex-1">
              <Search size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو البريد أو الهاتف..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pr-10 pl-4 text-sm font-medium text-ink-500 placeholder:text-muted-400 transition-all duration-150 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15"
              />
            </div>

            {/* Department */}
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="h-10 min-w-[148px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-all duration-150 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
            >
              <option value="">جميع الأقسام</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-10 min-w-[158px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-all duration-150 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* More Filters */}
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all duration-150 ${
                showFilters || hasExtraFilters
                  ? 'border-brand-300 bg-brand-50 text-brand-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50/60 hover:text-brand-600'
              }`}
            >
              <Filter size={14} />
              فلاتر
              {hasExtraFilters && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[9px] font-black text-white">!</span>
              )}
              <ChevronDown size={12} className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Reset */}
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  type="button"
                  onClick={resetFilters}
                  className="flex h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/60 px-3.5 text-sm font-bold text-red-600 transition-all duration-150 hover:bg-red-100"
                >
                  <X size={13} />
                  إعادة تعيين
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Expanded filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-muted-400">المدينة</label>
                      <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm font-medium text-slate-700 focus:border-brand-400 focus:outline-none">
                        <option value="">الكل</option>
                        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-muted-400">التفرغ</label>
                      <select value={filterAvailability} onChange={(e) => setFilterAvailability(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm font-medium text-slate-700 focus:border-brand-400 focus:outline-none">
                        <option value="">الكل</option>
                        <option value="full_time">دوام كامل</option>
                        <option value="part_time">دوام جزئي</option>
                        <option value="weekends">عطلة نهاية الأسبوع</option>
                        <option value="flexible">مرن</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-muted-400">السيرة الذاتية</label>
                      <select value={filterHasCv} onChange={(e) => setFilterHasCv(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm font-medium text-slate-700 focus:border-brand-400 focus:outline-none">
                        <option value="">الكل</option>
                        <option value="yes">لديه سيرة ذاتية</option>
                        <option value="no">بدون سيرة ذاتية</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-muted-400">القبول من</label>
                      <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm font-medium text-slate-700 focus:border-brand-400 focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-muted-400">القبول إلى</label>
                      <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm font-medium text-slate-700 focus:border-brand-400 focus:outline-none" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ══ Error banner ═════════════════════════════════════════════ */}
        {loadError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4"
          >
            <p className="flex-1 text-sm font-bold text-red-600">{loadError}</p>
            <button type="button" onClick={() => void load()}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-50">
              إعادة المحاولة
            </button>
          </motion.div>
        )}

        {/* ══ Table Card ═══════════════════════════════════════════════ */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-emc-xs ring-1 ring-slate-100">

          {/* Bar: result count */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <p className="text-sm font-bold text-muted-500">
              {loading
                ? <span className="flex items-center gap-2 text-muted-400"><Loader2 size={13} className="animate-spin" />جارٍ التحميل...</span>
                : <><span className="font-black text-ink-500">{filtered.length}</span>{' '}من{' '}<span className="font-black text-ink-500">{items.length}</span>{' '}متطوع مقبول</>
              }
            </p>
          </div>

          {/* ── Loading skeleton ─────────────────────────────────────── */}
          {loading && (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['#','المتطوع','القسم','المدينة','التفرغ','تاريخ القبول','قُبل بواسطة','CV','الإجراءات'].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-right text-[10px] font-black uppercase tracking-wider text-muted-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SKELETON_ROWS.map((ws, i) => <SkeletonRow key={i} widths={ws} />)}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Empty state ──────────────────────────────────────────── */}
          {!loading && !loadError && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <motion.div
                initial={{ scale: 0.75, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100"
              >
                <Users size={36} className="text-slate-300" />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <p className="text-base font-black text-slate-400">
                  {hasActiveFilters ? 'لا توجد نتائج تطابق الفلاتر المحددة' : 'لا يوجد متطوعون مقبولون في انتظار التحويل'}
                </p>
                <p className="mt-1.5 text-sm font-medium text-slate-400">
                  {hasActiveFilters ? 'جرّب تعديل الفلاتر أو إعادة تعيينها' : 'ستظهر هنا طلبات التطوع المقبولة'}
                </p>
                {hasActiveFilters && (
                  <button type="button" onClick={resetFilters}
                    className="mt-4 rounded-xl bg-brand-50 px-5 py-2 text-sm font-bold text-brand-600 transition hover:bg-brand-100">
                    إعادة تعيين الفلاتر
                  </button>
                )}
              </motion.div>
            </div>
          )}

          {/* ── Data table ───────────────────────────────────────────── */}
          {!loading && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['#','المتطوع','القسم','المدينة','التفرغ','تاريخ القبول','قُبل بواسطة','CV','الإجراءات'].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-right text-[10px] font-black uppercase tracking-wider text-muted-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filtered.map((r, index) => {
                      const avail = r.availability
                        ? (AVAILABILITY_MAP[r.availability] ?? { label: r.availability, cls: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60' })
                        : null

                      return (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -30, scale: 0.98 }}
                          transition={{
                            duration: 0.28,
                            delay: Math.min(index * 0.04, 0.5),
                            ease: [0.22, 0.61, 0.36, 1],
                          }}
                          className={`group border-b border-slate-50 transition-colors duration-150 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                          } hover:bg-brand-50/50`}
                        >
                          {/* # */}
                          <td className="px-5 py-5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-50 text-[11px] font-black text-ink-400">
                              {index + 1}
                            </span>
                          </td>

                          {/* Volunteer */}
                          <td className="px-5 py-5">
                            <button
                              type="button"
                              onClick={() => setSelected(r)}
                              className="flex items-center gap-3 text-right"
                            >
                              <VolunteerAvatar name={r.full_name} />
                              <div>
                                <p className="text-[15px] font-black leading-tight text-ink-500 transition-colors duration-100 group-hover:text-brand-600">
                                  {r.full_name}
                                </p>
                                <p className="mt-0.5 text-[12px] font-medium text-muted-400">{r.email}</p>
                                {r.phone && <p className="text-[11px] font-medium text-muted-400">{r.phone}</p>}
                              </div>
                            </button>
                          </td>

                          {/* Department */}
                          <td className="px-5 py-5">
                            {r.desired_department
                              ? <DepartmentBadge dept={r.desired_department} />
                              : <span className="text-slate-300">—</span>
                            }
                          </td>

                          {/* City */}
                          <td className="px-5 py-5">
                            <span className="text-[13px] font-semibold text-slate-600">{r.city ?? '—'}</span>
                          </td>

                          {/* Availability */}
                          <td className="px-5 py-5">
                            {avail
                              ? <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${avail.cls}`}>{avail.label}</span>
                              : <span className="text-slate-300">—</span>
                            }
                          </td>

                          {/* Accepted at */}
                          <td className="px-5 py-5">
                            {r.accepted_at
                              ? (
                                <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-500">
                                  <Calendar size={12} className="shrink-0 text-muted-400" />
                                  {formatDate(r.accepted_at)}
                                </div>
                              )
                              : <span className="text-slate-300">—</span>
                            }
                          </td>

                          {/* Accepted by */}
                          <td className="px-5 py-5">
                            <span className="text-[12px] font-medium text-muted-500">
                              {r.accepted_by_name ?? r.accepted_by?.name ?? '—'}
                            </span>
                          </td>

                          {/* CV */}
                          <td className="px-5 py-5">
                            {(r.cv_view_url ?? r.cv_download_url) ? (
                              <div className="flex items-center gap-1.5">
                                <Tooltip label="عرض السيرة">
                                  <a
                                    href={r.cv_view_url ?? r.cv_download_url ?? undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="عرض السيرة الذاتية"
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-muted-400 transition-all duration-150 hover:scale-110 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
                                  >
                                    <Eye size={14} />
                                  </a>
                                </Tooltip>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-300">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-5">
                            <div className="flex items-center gap-2">
                              {/* Convert primary action, first in RTL order */}
                              {!r.is_converted ? (
                                <button
                                  type="button"
                                  onClick={() => setConvertTarget(r)}
                                  className="flex h-[44px] items-center justify-center gap-2 rounded-[14px] bg-gradient-to-l from-emerald-600 to-teal-500 px-5 text-[13px] font-bold text-white shadow-sm shadow-emerald-100 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-200 active:translate-y-0"
                                  style={{ minWidth: '148px', whiteSpace: 'nowrap', lineHeight: 1 }}
                                >
                                  <UserPlus size={14} className="shrink-0" />
                                  تحويل إلى عضو
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-600 ring-1 ring-emerald-200/60">
                                  <CheckCircle2 size={12} />
                                  تم التحويل
                                </span>
                              )}

                              {/* View ghost icon button */}
                              <button
                                type="button"
                                onClick={() => setSelected(r)}
                                aria-label="عرض تفاصيل المتطوع"
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-muted-400 transition-all duration-150 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
                              >
                                <Eye size={15} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <VolunteerRequestDetailModal
            req={selected}
            onClose={() => setSelected(null)}
            onUpdated={handleUpdated}
            onOpenConvert={(req) => setConvertTarget(req)}
          />
        )}
      </AnimatePresence>

      {/* ── Convert modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {convertTarget && (
          <ConvertModal
            req={convertTarget}
            onClose={() => setConvertTarget(null)}
            onConverted={handleConverted}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
