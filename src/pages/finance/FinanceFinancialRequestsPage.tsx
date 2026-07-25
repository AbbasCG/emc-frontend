import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw, Inbox, CheckCircle2, XCircle, RotateCcw,
  Paperclip, Calendar, Building2, User, ChevronLeft,
  AlertTriangle, TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { FinancialRequest, FinancialRequestStatus } from '@/api/financialRequestsApi'
import {
  fetchFinancialRequests,
  STATUS_LABELS, STATUS_COLORS,
  TYPE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS,
} from '@/api/financialRequestsApi'
import FinanceDate from '@/components/finance/FinanceDate'
import FinancialRequestDetailView from '@/components/financial/FinancialRequestDetailView'

// Right-border accent color per status (RTL: right = start = visual stripe)
const STATUS_STRIPE: Record<string, string> = {
  finance_review:   'border-r-amber-400',
  finance_approved: 'border-r-teal-400',
  finance_rejected: 'border-r-red-400',
  executive_review: 'border-r-violet-400',
  approved:         'border-r-green-400',
  rejected:         'border-r-rose-400',
  returned:         'border-r-orange-400',
  submitted:        'border-r-blue-400',
  draft:            'border-r-slate-300',
  cancelled:        'border-r-slate-200',
}

// Subtle card glow per status
const STATUS_GLOW: Record<string, string> = {
  finance_review:   'hover:shadow-amber-100',
  finance_approved: 'hover:shadow-teal-100',
  finance_rejected: 'hover:shadow-red-100',
  executive_review: 'hover:shadow-violet-100',
  approved:         'hover:shadow-green-100',
  rejected:         'hover:shadow-rose-100',
  returned:         'hover:shadow-orange-100',
}

const FILTERS: [string, string][] = [
  ['', 'الكل'],
  ['finance_review', 'بانتظار المراجعة'],
  ['finance_approved', 'موافق عليها'],
  ['finance_rejected', 'مرفوضة'],
  ['returned', 'مُعادة'],
]

function numFmt(n: number) {
  return n.toLocaleString('en-US')
}

// ── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  req: FinancialRequest
  index: number
  onSelect: (r: FinancialRequest) => void
}

function FinanceRequestCard({ req, index, onSelect }: CardProps) {
  const stripe = STATUS_STRIPE[req.status] ?? 'border-r-slate-300'
  const glow   = STATUS_GLOW[req.status] ?? ''
  const attachCount = req.attachments?.length ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={() => onSelect(req)}
      className={[
        'group relative cursor-pointer rounded-2xl border border-slate-100 bg-white',
        'border-r-4', stripe,
        'p-5 shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md', glow,
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-black text-deepBlue leading-snug">{req.title}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${STATUS_COLORS[req.status as FinancialRequestStatus] ?? 'bg-slate-100 text-slate-500'}`}>
            {STATUS_LABELS[req.status as FinancialRequestStatus] ?? req.status}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[req.priority as keyof typeof PRIORITY_COLORS] ?? ''}`}>
            {PRIORITY_LABELS[req.priority as keyof typeof PRIORITY_LABELS] ?? req.priority}
          </span>
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-deepBlue/55">
        {req.requester && (
          <span className="flex items-center gap-1">
            <User size={11} className="shrink-0" />
            {req.requester.name}
          </span>
        )}
        {req.department && (
          <span className="flex items-center gap-1">
            <Building2 size={11} className="shrink-0" />
            {req.department.name}
          </span>
        )}
        <span className="flex items-center gap-1">
          <TrendingUp size={11} className="shrink-0" />
          {TYPE_LABELS[req.request_type as keyof typeof TYPE_LABELS] ?? req.request_type}
        </span>
      </div>

      {/* Amount */}
      <div className="mt-3 flex items-baseline gap-1.5" dir="ltr">
        <span className="text-2xl font-black tabular-nums text-deepBlue">
          {numFmt(Number(req.amount))}
        </span>
        <span className="text-sm font-bold text-deepBlue/40">{req.currency}</span>
      </div>

      {/* Dates + attachments row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-deepBlue/45">
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          <FinanceDate value={req.created_at} showTime />
        </span>
        {req.needed_by_date && (
          <span className="flex items-center gap-1 font-bold text-amber-600">
            <AlertTriangle size={11} />
            مطلوب: <FinanceDate value={req.needed_by_date} />
          </span>
        )}
        {attachCount > 0 && (
          <span className="flex items-center gap-1">
            <Paperclip size={11} />
            {numFmt(attachCount)} مرفق
          </span>
        )}
      </div>

      {/* Action button */}
      <div className="mt-4 flex justify-start">
        <button
          type="button"
          className={[
            'flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-black',
            'bg-deepBlue/5 text-deepBlue transition-colors',
            'group-hover:bg-customBlue group-hover:text-white',
          ].join(' ')}
        >
          مراجعة الطلب
          <ChevronLeft size={14} />
        </button>
      </div>
    </motion.div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatProps {
  label: string
  value: number
  icon: React.ElementType
  color: string
  active: boolean
  onClick: () => void
}

function StatCard({ label, value, icon: Icon, color, active, onClick }: StatProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={[
        'rounded-2xl border p-5 text-right shadow-sm transition-all duration-200 w-full',
        active
          ? 'border-customBlue/30 bg-customBlue/5 ring-1 ring-customBlue/20'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${active ? 'text-customBlue' : 'text-slate-400'}`}>
          {label}
        </span>
        <Icon size={18} className={color} />
      </div>
      <p className={`mt-3 text-3xl font-black tabular-nums ${color}`} dir="ltr">
        {numFmt(value)}
      </p>
    </motion.button>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

/** Pure I/O — kept outside the component so the mount effect and the imperative
 *  refresh share it without either having to call a state-mutating callback. */
async function fetchRequestsList(statusFilter: string): Promise<FinancialRequest[]> {
  const res = await fetchFinancialRequests({ status: statusFilter || undefined })
  // Backend returns Laravel paginator wrapped in { data: paginatorObj }
  // fetchFinancialRequests returns paginatorObj — items are in .data
  const items: FinancialRequest[] = Array.isArray(res)
    ? res
    : Array.isArray(res?.data)
      ? res.data
      : []
  return items
}

export default function FinanceFinancialRequestsPage() {
  const [requests, setRequests] = useState<FinancialRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<FinancialRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  // Re-arm the loading state during render when the filter changes (react.dev
  // "adjusting state when a prop changes") instead of from the effect below.
  const [seenStatusFilter, setSeenStatusFilter] = useState(statusFilter)
  if (seenStatusFilter !== statusFilter) {
    setSeenStatusFilter(statusFilter)
    setLoading(true)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const items = await fetchRequestsList(statusFilter)
        if (alive) setRequests(items)
      } catch {
        if (alive) toast.error('فشل تحميل الطلبات')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [statusFilter])

  /** Imperative refresh from an event handler — outside any effect, so the
   *  synchronous loading flip is allowed. */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRequests(await fetchRequestsList(statusFilter))
    } catch {
      toast.error('فشل تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  function handleUpdate(updated: FinancialRequest) {
    setRequests(r => r.map(x => x.id === updated.id ? updated : x))
    if (selected?.id === updated.id) setSelected(updated)
  }

  const allForStats = requests

  const stats = {
    awaiting: allForStats.filter(r => r.status === 'finance_review').length,
    approved: allForStats.filter(r => r.status === 'finance_approved').length,
    rejected: allForStats.filter(r => r.status === 'finance_rejected').length,
    returned: allForStats.filter(r => r.status === 'returned').length,
  }

  const statDefs = [
    { label: 'بانتظار المراجعة', value: stats.awaiting, icon: Inbox,        color: 'text-amber-500', filter: 'finance_review' },
    { label: 'تمت الموافقة',     value: stats.approved, icon: CheckCircle2, color: 'text-teal-500',  filter: 'finance_approved' },
    { label: 'مرفوضة',           value: stats.rejected, icon: XCircle,      color: 'text-red-500',   filter: 'finance_rejected' },
    { label: 'مُعادة',           value: stats.returned, icon: RotateCcw,    color: 'text-orange-500', filter: 'returned' },
  ]

  return (
    <div dir="rtl" className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customOrange">إدارة مالية</p>
          <h1 className="mt-1 text-2xl font-black text-deepBlue">الطلبات المالية</h1>
          <p className="mt-1 text-sm text-deepBlue/50">مراجعة واعتماد الطلبات المالية الواردة</p>
        </div>
        <motion.button
          whileHover={{ rotate: 180 }}
          transition={{ duration: 0.4 }}
          onClick={() => void load()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-deepBlue/60 hover:bg-slate-50 hover:text-deepBlue"
          aria-label="تحديث"
        >
          <RefreshCw size={15} />
        </motion.button>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statDefs.map(s => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            color={s.color}
            active={statusFilter === s.filter}
            onClick={() => setStatusFilter(prev => prev === s.filter ? '' : s.filter)}
          />
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setStatusFilter(v)}
            className={[
              'rounded-full px-4 py-1.5 text-[12px] font-bold transition-colors',
              statusFilter === v
                ? 'bg-deepBlue text-white'
                : 'bg-slate-100 text-deepBlue/60 hover:bg-slate-200',
            ].join(' ')}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ── Cards ── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-24 text-center"
        >
          <Inbox size={40} className="text-slate-300" />
          <p className="text-lg font-bold text-deepBlue/40">لا توجد طلبات</p>
          <p className="text-sm text-deepBlue/30">لم يتم العثور على طلبات مالية بهذا الفلتر</p>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {requests.map((req, i) => (
              <FinanceRequestCard
                key={req.id}
                req={req}
                index={i}
                onSelect={setSelected}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Detail drawer ── */}
      <AnimatePresence>
        {selected && (
          <FinancialRequestDetailView
            key={selected.id}
            request={selected}
            onClose={() => setSelected(null)}
            onUpdate={handleUpdate}
            viewerRole="finance_manager"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
