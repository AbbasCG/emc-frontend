import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  Inbox,
  LifeBuoy,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Tag,
  TrendingUp,
  User,
  UserCheck,
  X,
} from 'lucide-react'
import {
  fetchSupportTickets,
  updateSupportTicket,
  resolveSupportTicket,
} from '@/api/supportApi'
import type { SupportTicket, SupportTicketStatus } from '@/types/operations'
import toast from '@/lib/toast'

/* ─────────────────────────────────────────────────────────────────────────
   Label maps
───────────────────────────────────────────────────────────────────────── */

const STATUS_AR: Record<string, string> = {
  new: 'جديدة',
  in_progress: 'قيد المعالجة',
  waiting_response: 'بانتظار رد',
  resolved: 'محلولة',
  closed: 'مغلقة',
}

const STATUS_STYLE: Record<string, { pill: string; dot: string }> = {
  new:              { pill: 'bg-sky-100 text-sky-700 ring-1 ring-sky-200',        dot: 'bg-sky-400' },
  in_progress:      { pill: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',   dot: 'bg-amber-400' },
  waiting_response: { pill: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200', dot: 'bg-purple-400' },
  resolved:         { pill: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-400' },
  closed:           { pill: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',   dot: 'bg-slate-400' },
}

const PRIORITY_AR: Record<string, string> = {
  low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة',
}

const PRIORITY_STYLE: Record<string, string> = {
  low:    'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  medium: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  high:   'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
  urgent: 'bg-red-100 text-red-700 ring-1 ring-red-200',
}

const PRIORITY_LEFT_BAR: Record<string, string> = {
  low:    'bg-slate-300',
  medium: 'bg-blue-400',
  high:   'bg-orange-400',
  urgent: 'bg-red-500',
}

const REQUEST_TYPE_AR: Record<string, string> = {
  general: 'استفسار عام',
  partnership: 'شراكة',
  volunteer: 'تطوع',
  technical: 'دعم فني',
}

/* ─────────────────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────────────────── */

const EMPTY_STATS = { total: 0, open: 0, unassigned: 0, resolved: 0, high: 0 }

type TicketQuery = {
  page: number
  search: string
  status: string
  priority: string
  requestType: string
}

/** Pure query-string builder — kept outside the component so the fetch effect and the
 *  silent refresh handler share it without either calling a state-mutating callback. */
function buildTicketParams(q: TicketQuery): Record<string, string> {
  const params: Record<string, string> = { page: String(q.page) }
  if (q.search) params.search = q.search
  if (q.status) params.status = q.status
  if (q.priority) params.priority = q.priority
  if (q.requestType) params.request_type = q.requestType
  return params
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

function timeAgo(d?: string | null): string {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days < 30) return `منذ ${days} يوم`
  return fmtDate(d)
}

/* ─────────────────────────────────────────────────────────────────────────
   CountUp hook
───────────────────────────────────────────────────────────────────────── */

function useCountUp(target: number, duration = 1000): number {
  const [val, setVal] = useState(0)
  const raf = useRef<number>(0)

  // Snap back to zero during render when the target does (react.dev "adjusting state
  // when a prop changes") — doing it from the effect would paint the previous number
  // for one frame first.
  const [seenTarget, setSeenTarget] = useState(target)
  if (seenTarget !== target) {
    setSeenTarget(target)
    if (target === 0) setVal(0)
  }

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
  return val
}

/* ─────────────────────────────────────────────────────────────────────────
   Tooltip
───────────────────────────────────────────────────────────────────────── */

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#0C2A4B] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Inline dropdown (status / priority)
───────────────────────────────────────────────────────────────────────── */

function InlineDropdown<T extends string>({
  value,
  options,
  onChange,
  renderTrigger,
  renderItem,
}: {
  value: T
  options: T[]
  onChange: (v: T) => void
  renderTrigger: (v: T, open: boolean) => React.ReactNode
  renderItem: (v: T) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="focus:outline-none"
      >
        {renderTrigger(value, open)}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.13 }}
            className="absolute start-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(o); setOpen(false) }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-[13px] font-semibold transition hover:bg-slate-50 ${o === value ? 'bg-slate-50' : ''}`}
              >
                {renderItem(o)}
                {o === value && <CheckCircle2 size={11} className="ms-auto text-emerald-500" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   KPI Card
───────────────────────────────────────────────────────────────────────── */

interface KpiProps {
  icon: React.ElementType
  label: string
  value: number
  accent: string
  iconBg: string
  iconColor: string
  delay?: number
}

function KpiCard({ icon: Icon, label, value, accent, iconBg, iconColor, delay = 0 }: KpiProps) {
  const count = useCountUp(value)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 0.61, 0.36, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(12,42,75,0.07)] ring-1 ring-slate-100 transition-shadow hover:shadow-[0_4px_28px_rgba(12,42,75,0.12)]"
    >
      <div className={`absolute inset-x-0 top-0 h-[3px] ${accent}`} />
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <p className="text-[28px] font-black leading-none text-[#0C2A4B]">{count.toLocaleString('en-US')}</p>
      <p className="mt-1.5 text-[12px] font-semibold text-slate-500">{label}</p>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Shimmer skeleton
───────────────────────────────────────────────────────────────────────── */

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-100 ${className ?? ''}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100" />
    </div>
  )
}

function SkeletonKpi() {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-100">
      <Shimmer className="mb-4 h-11 w-11 rounded-xl" />
      <Shimmer className="mb-2 h-7 w-14" />
      <Shimmer className="h-3 w-24" />
    </div>
  )
}

function SkeletonTicket() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <Shimmer className="h-5 w-20 rounded-full" />
          <Shimmer className="h-5 w-16 rounded-full" />
          <Shimmer className="h-5 w-16 rounded-full" />
        </div>
        <Shimmer className="h-5 w-3/4" />
        <Shimmer className="h-4 w-1/2" />
        <div className="flex gap-4 pt-1">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-3 w-16" />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Ticket Card
───────────────────────────────────────────────────────────────────────── */

function TicketCard({
  t,
  onOpen,
  onStatusChange,
  onPriorityChange,
  onResolve,
}: {
  t: SupportTicket
  onOpen: () => void
  onStatusChange: (id: number, status: SupportTicketStatus) => void
  onPriorityChange: (id: number, priority: string) => void
  onResolve: (id: number) => void
}) {
  const [copying, setCopying] = useState(false)
  const ticketNum = t.ticket_number ?? `#${String(t.id).padStart(5, '0')}`
  const status = (t.status ?? 'new') as SupportTicketStatus
  const priority = t.priority ?? 'medium'
  const priorityBar = PRIORITY_LEFT_BAR[priority] ?? 'bg-slate-300'
  const isResolved = status === 'resolved' || status === 'closed'

  async function copyNum(e: React.MouseEvent) {
    e.stopPropagation()
    await navigator.clipboard.writeText(ticketNum)
    setCopying(true)
    setTimeout(() => setCopying(false), 2000)
    toast.success('تم نسخ الرقم')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      layout
      transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.16 } }}
      className="group relative overflow-hidden rounded-2xl bg-white shadow-[0_1px_12px_rgba(12,42,75,0.06)] ring-1 ring-slate-100 transition-shadow hover:shadow-[0_4px_24px_rgba(12,42,75,0.12)] hover:ring-slate-200 cursor-pointer"
      onClick={onOpen}
    >
      {/* Priority accent — left vertical bar (start in RTL) */}
      <div className={`absolute start-0 top-0 bottom-0 w-[3px] ${priorityBar}`} />

      <div className="p-5 ps-6">
        {/* Row 1: ticket number + badges + actions */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {/* Left in RTL: number + badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] font-bold tracking-widest text-slate-400">
              {ticketNum}
            </span>

            {/* Status — inline dropdown */}
            <InlineDropdown<SupportTicketStatus>
              value={status}
              options={Object.keys(STATUS_AR) as SupportTicketStatus[]}
              onChange={(v) => onStatusChange(t.id, v)}
              renderTrigger={(v) => (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all hover:brightness-95 ${STATUS_STYLE[v]?.pill ?? 'bg-slate-100 text-slate-500'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[v]?.dot ?? 'bg-slate-400'}`} />
                  {STATUS_AR[v] ?? v}
                  <ChevronDown size={9} />
                </span>
              )}
              renderItem={(v) => (
                <>
                  <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[v]?.dot ?? 'bg-slate-300'}`} />
                  <span className="text-slate-700">{STATUS_AR[v] ?? v}</span>
                </>
              )}
            />

            {/* Priority — inline dropdown */}
            <InlineDropdown<string>
              value={priority}
              options={Object.keys(PRIORITY_AR)}
              onChange={(v) => onPriorityChange(t.id, v)}
              renderTrigger={(v) => (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all hover:brightness-95 ${PRIORITY_STYLE[v] ?? 'bg-slate-100 text-slate-500'}`}>
                  {PRIORITY_AR[v] ?? v}
                  <ChevronDown size={9} />
                </span>
              )}
              renderItem={(v) => (
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${PRIORITY_STYLE[v] ?? 'bg-slate-100 text-slate-500'}`}>
                  {PRIORITY_AR[v] ?? v}
                </span>
              )}
            />

            {t.request_type && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                <Tag size={9} />
                {REQUEST_TYPE_AR[t.request_type] ?? t.request_type}
              </span>
            )}
          </div>

          {/* Right in RTL: quick actions */}
          <div
            className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip label="نسخ الرقم">
              <button
                type="button"
                onClick={(e) => void copyNum(e)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
              >
                {copying ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            </Tooltip>
            {!isResolved && (
              <Tooltip label="حل التذكرة">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onResolve(t.id) }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                >
                  <CheckCircle2 size={12} />
                </button>
              </Tooltip>
            )}
            <Tooltip label="فتح التذكرة">
              <button
                type="button"
                aria-label="فتح التذكرة"
                onClick={(e) => { e.stopPropagation(); onOpen() }}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600 transition hover:bg-brand-100"
              >
                <ExternalLink size={12} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Row 2: title */}
        <h3 className="mb-3 text-[15px] font-black leading-snug text-[#0C2A4B] group-hover:text-[#0077B6] transition-colors line-clamp-2">
          {t.subject}
        </h3>

        {/* Row 3: requester info */}
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100">
              <User size={10} className="text-slate-500" />
            </div>
            <span className="font-semibold text-[#0C2A4B]">{t.full_name ?? t.name ?? '—'}</span>
          </div>
          {t.email && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Mail size={10} />
              <span className="truncate max-w-[160px]">{t.email}</span>
            </div>
          )}
          {t.phone && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Phone size={10} />
              {t.phone}
            </div>
          )}
        </div>

        {/* Row 4: meta row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3">
          {/* Assigned */}
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F1F5F9]">
              <UserCheck size={10} className="text-slate-500" />
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              {t.assigned_to?.name ?? <span className="text-slate-300 italic">غير معين</span>}
            </span>
          </div>

          {/* Replies */}
          {(t.replies_count ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <MessageSquare size={10} />
              {t.replies_count} رد
            </div>
          )}

          {/* Created */}
          {t.created_at && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock size={10} />
              {timeAgo(t.created_at)}
            </div>
          )}

          {/* Last reply */}
          {t.last_reply_at && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Calendar size={10} />
              آخر رد: {timeAgo(t.last_reply_at)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────────────────── */

export default function OpsSupportTicketsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  // This page is mounted under two namespaces (/dashboard/support for
  // support_agent, /dashboard/admin/support-tickets for admin/tech_admin) —
  // see DASHBOARD_NAMESPACE_RULES in utils/dashboardAccess.ts. Navigating to
  // the wrong namespace's detail route gets silently bounced back here by
  // DashboardAccessGuard, which looked like the "Open" button just
  // refreshing the page. Mirrors the same namespace check already used by
  // OpsSupportTicketDetailPage's own back-link.
  const detailBasePath = location.pathname.startsWith('/dashboard/support')
    ? '/dashboard/support'
    : '/dashboard/admin/support-tickets'
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [stats, setStats] = useState({ total: 0, open: 0, unassigned: 0, resolved: 0, high: 0 })
  const [meta, setMeta] = useState<{ last_page?: number; current_page?: number }>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Search/filters/page live in the URL (not local state) so returning from
  // the ticket detail page via Back restores exactly where the user left
  // off — a fresh mount reads these straight back out of the URL instead of
  // resetting to defaults.
  const [searchParams, setSearchParams] = useSearchParams()
  const search      = searchParams.get('search') ?? ''
  const status      = searchParams.get('status') ?? ''
  const priority    = searchParams.get('priority') ?? ''
  const requestType = searchParams.get('request_type') ?? ''
  const page        = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

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

  function setSearch(v: string) { updateParams({ search: v, page: null }) }
  function setStatus(v: string) { updateParams({ status: v, page: null }) }
  function setPriority(v: string) { updateParams({ priority: v, page: null }) }
  function setRequestType(v: string) { updateParams({ request_type: v, page: null }) }
  function setPage(v: number | ((p: number) => number)) {
    const next = typeof v === 'function' ? v(page) : v
    updateParams({ page: next > 1 ? String(next) : null })
  }

  const [showFilters, setShowFilters] = useState(() => Boolean(status || priority || requestType))

  // Re-arm the loading state during render when the query changes (react.dev
  // "adjusting state when a prop changes"), so the fetch effect below never has to
  // touch state synchronously — and the new query never paints the previous result
  // set as if it were settled.
  const [seenQuery, setSeenQuery] = useState({ page, search, status, priority, requestType })
  if (
    seenQuery.page !== page ||
    seenQuery.search !== search ||
    seenQuery.status !== status ||
    seenQuery.priority !== priority ||
    seenQuery.requestType !== requestType
  ) {
    setSeenQuery({ page, search, status, priority, requestType })
    setLoading(true)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetchSupportTickets(
          buildTicketParams({ page, search, status, priority, requestType }),
        )
        if (cancelled) return
        setTickets(res.data)
        setStats(res.stats ?? EMPTY_STATS)
        setMeta(res.meta ?? {})
      } catch {
        /* silent */
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [page, search, status, priority, requestType])

  // Silent background refresh from an event handler — outside the effect, so flipping
  // the refreshing flag synchronously is legitimate here.
  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetchSupportTickets(
        buildTicketParams({ page, search, status, priority, requestType }),
      )
      setTickets(res.data)
      setStats(res.stats ?? EMPTY_STATS)
      setMeta(res.meta ?? {})
    } catch {
      /* silent */
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page, search, status, priority, requestType])

  // Scroll position is saved (keyed by the exact list URL — path + query)
  // right before opening a ticket, and restored once this list has
  // reloaded on return. Runs after data is in, so it overrides the
  // app-wide <ScrollToTop /> that already reset scroll to 0 on this mount —
  // same "restore after content is ready" pattern used for the ticket
  // detail page's own scroll fix.
  const scrollKey = useMemo(
    () => `support-tickets-scroll:${location.pathname}${location.search}`,
    [location.pathname, location.search],
  )
  useEffect(() => {
    if (loading) return
    const saved = sessionStorage.getItem(scrollKey)
    if (saved != null) {
      window.scrollTo({ top: Number(saved), behavior: 'instant' })
      sessionStorage.removeItem(scrollKey)
    }
  }, [loading, scrollKey])

  const activeFilters = [search, status, priority, requestType].filter(Boolean).length

  function clearFilters() {
    updateParams({ search: null, status: null, priority: null, request_type: null, page: null })
  }

  async function handleStatusChange(id: number, newStatus: SupportTicketStatus) {
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t))
    try {
      await updateSupportTicket(id, { status: newStatus })
      toast.success('تم تحديث الحالة')
    } catch {
      toast.error('فشل التحديث')
      void refresh()
    }
  }

  async function handlePriorityChange(id: number, newPriority: string) {
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, priority: newPriority } : t))
    try {
      await updateSupportTicket(id, { priority: newPriority })
      toast.success('تم تحديث الأولوية')
    } catch {
      toast.error('فشل التحديث')
      void refresh()
    }
  }

  async function handleResolve(id: number) {
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: 'resolved' as SupportTicketStatus } : t))
    try {
      await resolveSupportTicket(id)
      toast.success('تم حل التذكرة')
    } catch {
      toast.error('فشل التحديث')
      void refresh()
    }
  }

  const lastPage = meta.last_page ?? 1

  return (
    <div dir="rtl" className="min-h-screen bg-[#F0F4F8]">

      {/* ══ HERO ════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.44, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0C2A4B 0%, #172235 100%)' }}
      >
        {/* Decorative glow orbs */}
        <div className="pointer-events-none absolute -top-20 end-40 h-72 w-72 rounded-full bg-[#0077B6]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 start-20 h-48 w-48 rounded-full bg-[#F28C00]/8 blur-3xl" />

        <div className="relative mx-auto max-w-[1560px] px-6 py-8 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            {/* Right in RTL: icon + title */}
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0077B6]/20 ring-1 ring-white/10"
              >
                <LifeBuoy size={26} className="text-[#0077B6]" />
              </motion.div>
              <div>
                <h1 className="text-[22px] font-black leading-tight text-white sm:text-[26px]">
                  مكتب الدعم والمساعدة
                </h1>
                <p className="mt-1 text-[13px] font-medium text-white/50">
                  إدارة تذاكر الدعم الداخلية والخارجية في مكان واحد
                </p>
              </div>
            </div>

            {/* Left in RTL: action buttons */}
            <div className="flex items-center gap-2.5">
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => void refresh()}
                disabled={refreshing}
                className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-[13px] font-bold text-white/80 ring-1 ring-white/10 transition hover:bg-white/15 disabled:opacity-50"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                تحديث
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══ CONTENT ══════════════════════════════════════════════════════ */}
      <div className="mx-auto max-w-[1560px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonKpi key={i} />)
          ) : (
            <>
              <KpiCard icon={Inbox}        label="إجمالي التذاكر"  value={stats.total}      accent="bg-gradient-to-l from-[#0077B6] to-sky-400"    iconBg="bg-sky-50"     iconColor="text-sky-600"     delay={0} />
              <KpiCard icon={Clock}        label="قيد المعالجة"     value={stats.open}       accent="bg-gradient-to-l from-amber-400 to-orange-400"  iconBg="bg-amber-50"   iconColor="text-amber-600"   delay={0.06} />
              <KpiCard icon={AlertCircle}  label="غير معينة"        value={stats.unassigned} accent="bg-gradient-to-l from-rose-400 to-red-400"      iconBg="bg-rose-50"    iconColor="text-rose-600"    delay={0.12} />
              <KpiCard icon={CheckCircle2} label="تم حلها"          value={stats.resolved}   accent="bg-gradient-to-l from-emerald-400 to-teal-400"  iconBg="bg-emerald-50" iconColor="text-emerald-600" delay={0.18} />
              <KpiCard icon={TrendingUp}   label="أولوية عالية"     value={stats.high}       accent="bg-gradient-to-l from-[#F28C00] to-orange-400"  iconBg="bg-orange-50"  iconColor="text-orange-600"  delay={0.24} />
            </>
          )}
        </div>

        {/* Search + Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.14, ease: [0.22, 0.61, 0.36, 1] }}
          className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(12,42,75,0.06)] ring-1 ring-slate-100"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالموضوع، الرقم، الاسم أو البريد..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pe-10 ps-4 text-[14px] font-medium text-[#0C2A4B] placeholder:text-slate-400 transition focus:border-[#0077B6]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0077B6]/15"
              />
            </div>

            {/* Filter toggle */}
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`flex h-10 items-center gap-2 rounded-xl border px-4 text-[13px] font-bold transition-all ${
                showFilters || activeFilters > 0
                  ? 'border-[#0077B6]/40 bg-[#0077B6]/8 text-[#0077B6]'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter size={14} />
              فلاتر
              {activeFilters > 0 && (
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#0077B6] text-[10px] font-black text-white px-1">
                  {activeFilters}
                </span>
              )}
              <ChevronDown
                size={12}
                className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Clear filters */}
            <AnimatePresence>
              {activeFilters > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  type="button"
                  onClick={clearFilters}
                  className="flex h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 text-[13px] font-bold text-red-600 transition hover:bg-red-100"
                >
                  <X size={13} />
                  مسح الفلاتر
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Expanded filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-400">الحالة</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-medium text-slate-700 focus:border-[#0077B6]/40 focus:outline-none"
                    >
                      <option value="">كل الحالات</option>
                      {Object.entries(STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-400">الأولوية</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-medium text-slate-700 focus:border-[#0077B6]/40 focus:outline-none"
                    >
                      <option value="">كل الأولويات</option>
                      {Object.entries(PRIORITY_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-400">نوع الطلب</label>
                    <select
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value)}
                      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-medium text-slate-700 focus:border-[#0077B6]/40 focus:outline-none"
                    >
                      <option value="">كل الأنواع</option>
                      {Object.entries(REQUEST_TYPE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results count */}
        {!loading && (
          <p className="text-[13px] font-medium text-slate-400">
            <span className="font-black text-[#0C2A4B]">{tickets.length}</span> تذكرة
            {activeFilters > 0 && ' (مفلترة)'}
          </p>
        )}

        {/* Ticket grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonTicket key={i} />)}
          </div>
        ) : tickets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-[0_2px_20px_rgba(12,42,75,0.08)] ring-1 ring-slate-100">
              <Inbox size={36} className="text-slate-300" />
            </div>
            <p className="text-[17px] font-black text-slate-400">
              {activeFilters > 0 ? 'لا توجد نتائج تطابق الفلاتر' : 'لا توجد تذاكر حالياً'}
            </p>
            <p className="mt-1.5 text-[13px] text-slate-300">
              {activeFilters > 0 ? 'جرّب تعديل الفلاتر أو مسحها' : 'ستظهر هنا تذاكر الدعم عند ورودها'}
            </p>
            <div className="mt-5 flex gap-3">
              {activeFilters > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl bg-[#0077B6]/10 px-5 py-2.5 text-[13px] font-bold text-[#0077B6] transition hover:bg-[#0077B6]/20"
                >
                  مسح الفلاتر
                </button>
              )}
              <button
                type="button"
                onClick={() => void refresh()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCw size={13} />
                تحديث
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {tickets.map((t, i) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.26, delay: Math.min(i * 0.04, 0.4), ease: [0.22, 0.61, 0.36, 1] }}
                >
                  <TicketCard
                    t={t}
                    onOpen={() => {
                      sessionStorage.setItem(scrollKey, String(window.scrollY))
                      navigate(`${detailBasePath}/${t.id}`, { state: { from: `${location.pathname}${location.search}` } })
                    }}
                    onStatusChange={handleStatusChange}
                    onPriorityChange={handlePriorityChange}
                    onResolve={handleResolve}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 pt-2"
          >
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#0077B6]/40 hover:text-[#0077B6] disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>

            {/* Page numbers */}
            {Array.from({ length: lastPage }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === lastPage || Math.abs(p - page) <= 1)
              .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                  acc.push('…')
                }
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-slate-400">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p as number)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-[14px] font-bold shadow-sm transition ${
                      page === p
                        ? 'border-[#0077B6] bg-[#0077B6] text-white shadow-[#0077B6]/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-[#0077B6]/40 hover:text-[#0077B6]'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page === lastPage}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#0077B6]/40 hover:text-[#0077B6] disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
