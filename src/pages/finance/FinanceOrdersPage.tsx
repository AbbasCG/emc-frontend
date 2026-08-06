import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BadgeDollarSign, Check, CheckCircle2, Copy, FileText, Loader2,
  Mail, Phone, Receipt, RefreshCw, Search, TrendingUp, User, X, XCircle,
} from 'lucide-react'
import api from '@/api/axios'
import type { Order } from '@/api/checkoutApi'
import toast from '@/lib/toast'
import FinanceDate from '@/components/finance/FinanceDate'
import { formatFinanceForeignCurrency } from '@/utils/financeFormatters'

// ── Extended order type with phone ───────────────────────────────────────────

type FinanceOrder = Order & {
  user?: {
    id?: number
    name?: string
    email?: string
    phone?: string
    phone_country_code?: string
    city?: string
    country?: string
    avatar_url?: string
  } | null
  type?: string
  subtotal?: number
  tax_amount?: number
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_AR: Record<string, { label: string; cls: string; dot: string; accent: string }> = {
  pending:   { label: 'قيد الانتظار', cls: 'bg-amber-50 text-amber-700',    dot: 'bg-amber-400',   accent: 'border-t-amber-400'   },
  paid:      { label: 'مدفوع',        cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-400', accent: 'border-t-emerald-400' },
  failed:    { label: 'فشل',          cls: 'bg-rose-50 text-rose-600',       dot: 'bg-rose-400',    accent: 'border-t-rose-400'    },
  cancelled: { label: 'ملغى',         cls: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400',   accent: 'border-t-slate-300'   },
  refunded:  { label: 'مسترد',        cls: 'bg-sky-50 text-sky-600',         dot: 'bg-sky-400',     accent: 'border-t-sky-400'     },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number | undefined | null, currency = 'EUR') {
  if (amount == null) return '—'
  return formatFinanceForeignCurrency(amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}


function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return { copied, copy }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string; accent?: string
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border border-deepBlue/[0.07] bg-white p-5 shadow-sm border-t-[3px] ${accent ?? 'border-t-customBlue'}`}>
      <div className="flex items-center gap-2 text-deepBlue/40">
        <Icon size={15} />
        <span className="text-[11px] font-black uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-black text-deepBlue" dir="ltr">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-deepBlue/30">{title}</p>
      <div className="divide-y divide-deepBlue/[0.05] overflow-hidden rounded-2xl border border-deepBlue/[0.07] bg-white">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
      <span className="shrink-0 text-xs text-deepBlue/40">{label}</span>
      <span className={`min-w-0 truncate text-right text-xs font-semibold text-deepBlue ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}

function CopyRow({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon: React.ElementType }) {
  const { copied, copy } = useCopy(value ?? '')
  if (!value) return <Row label={label} value={undefined} />
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
      <span className="shrink-0 text-xs text-deepBlue/40">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <Icon size={11} className="shrink-0 text-deepBlue/30" />
        <span className="min-w-0 truncate text-xs font-semibold text-deepBlue" dir="ltr">{value}</span>
        <button
          type="button"
          onClick={copy}
          title="نسخ"
          className="shrink-0 rounded p-0.5 text-deepBlue/30 transition hover:bg-slate-100 hover:text-deepBlue"
        >
          {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
        </button>
      </div>
    </div>
  )
}

// ── Order Detail Drawer (portal — escapes transform stacking context) ─────────

function OrderDrawer({ order, onClose }: { order: FinanceOrder; onClose: () => void }) {
  const st = STATUS_AR[order.status] ?? STATUS_AR.pending
  const phone = order.user?.phone
  const phoneDisplay = phone
    ? [order.user?.phone_country_code, phone].filter(Boolean).join(' ')
    : null

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0"
        style={{ zIndex: 300 }}
        onClick={onClose}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        />

        {/* Drawer panel */}
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
          dir="rtl"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-deepBlue/[0.06] bg-white/95 px-5 py-4 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${st.cls}`}>
                <Receipt size={14} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-deepBlue/40">تفاصيل الطلب</p>
                <p className="font-black text-deepBlue" dir="ltr">{order.order_number}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full text-deepBlue/40 hover:bg-slate-100 hover:text-deepBlue"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-5">

            {/* Status badge */}
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <span className="text-sm font-semibold text-deepBlue/50">حالة الطلب</span>
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${st.cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                {st.label}
              </span>
            </div>

            {/* Student info */}
            <Section title="معلومات الطالب">
              {order.user?.avatar_url && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <img
                    src={order.user.avatar_url}
                    alt={order.user.name ?? ''}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-deepBlue/10"
                  />
                  <div>
                    <p className="font-bold text-deepBlue">{order.user.name}</p>
                    <p className="text-[11px] text-deepBlue/40">طالب مسجّل</p>
                  </div>
                </div>
              )}
              {!order.user?.avatar_url && order.user?.name && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-customBlue/10">
                    <User size={16} className="text-customBlue" />
                  </div>
                  <p className="font-bold text-deepBlue">{order.user.name}</p>
                </div>
              )}
              <CopyRow label="البريد الإلكتروني" value={order.user?.email} icon={Mail} />
              <CopyRow label="رقم الهاتف" value={phoneDisplay} icon={Phone} />
              {(order.user?.city || order.user?.country) && (
                <Row label="المدينة / الدولة" value={[order.user.city, order.user.country].filter(Boolean).join('، ')} />
              )}
              {order.user?.id && <Row label="معرّف المستخدم" value={String(order.user.id)} mono />}
            </Section>

            {/* Order info */}
            <Section title="تفاصيل الطلب">
              <Row label="رقم الطلب"    value={order.order_number} mono />
              <Row label="نوع الطلب"    value={order.type ?? '—'} />
              <Row label="المبلغ الجزئي" value={fmtCurrency(order.subtotal, order.currency)} />
              {order.tax_amount != null && Number(order.tax_amount) > 0 && (
                <Row label="الضريبة" value={fmtCurrency(order.tax_amount, order.currency)} />
              )}
              <Row label="الإجمالي"     value={fmtCurrency(order.total, order.currency)} />
              <Row label="العملة"       value={order.currency} />
              <Row label="تاريخ الإنشاء" value={<FinanceDate value={order.created_at} showTime />} />
              <Row label="تاريخ الدفع"  value={<FinanceDate value={order.paid_at} showTime />} />
            </Section>

            {/* Course / program */}
            {order.course && (
              <Section title="البرنامج / الدورة">
                <Row label="الدورة" value={order.course.title ?? '—'} />
              </Section>
            )}

            {/* Payment details */}
            <Section title="تفاصيل الدفع">
              <Row label="مزود الدفع" value={order.payment_provider} />
              {order.provider_payment_intent_id && (
                <CopyRow label="Payment Intent" value={order.provider_payment_intent_id} icon={Copy} />
              )}
            </Section>

            {/* Invoice */}
            {order.invoice && (
              <Section title="الفاتورة">
                <Row label="رقم الفاتورة" value={order.invoice.invoice_number} mono />
                <Row label="تاريخ الإصدار" value={<FinanceDate value={order.invoice.issued_at} />} />
                <div className="px-4 py-3">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-customBlue/[0.07] px-4 py-2 text-xs font-black text-customBlue transition hover:bg-customBlue/[0.12]">
                    <FileText size={13} />
                    تحميل الفاتورة
                  </button>
                </div>
              </Section>
            )}
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>,
    document.body,
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FinanceOrdersPage() {
  const [orders, setOrders]           = useState<FinanceOrder[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected]       = useState<FinanceOrder | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/finance/orders')
      .then((r) => setOrders(r.data.data ?? []))
      .catch(() => toast.error('تعذّر تحميل الطلبات.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => orders.filter((o) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (o.user?.name ?? '').toLowerCase().includes(q)
      || (o.user?.email ?? '').toLowerCase().includes(q)
      || (o.user?.phone ?? '').toLowerCase().includes(q)
      || o.order_number.toLowerCase().includes(q)
      || (o.course?.title ?? '').toLowerCase().includes(q)
    const matchStatus = !filterStatus || o.status === filterStatus
    return matchSearch && matchStatus
  }), [orders, search, filterStatus])

  const paid        = orders.filter((o) => o.status === 'paid')
  const totalRev    = paid.reduce((s, o) => s + Number(o.total), 0)
  const thisMonth   = paid.filter((o) => o.paid_at && new Date(o.paid_at).getMonth() === new Date().getMonth())
  const revMonth    = thisMonth.reduce((s, o) => s + Number(o.total), 0)
  const failedCount = orders.filter((o) => ['failed', 'cancelled'].includes(o.status)).length
  const pendingCount= orders.filter((o) => o.status === 'pending').length

  const defaultCurrency = orders[0]?.currency ?? 'EUR'

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-customBlue/10">
              <Receipt size={20} className="text-customBlue" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-deepBlue">الطلبات والمدفوعات</h1>
              <p className="text-sm text-deepBlue/50">إدارة طلبات الدفع وتفاصيل العملاء</p>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-deepBlue/10 bg-white px-3 py-2 text-xs font-black text-deepBlue/60 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard icon={TrendingUp}      label="إجمالي الإيرادات"   value={fmtCurrency(totalRev, defaultCurrency)} accent="border-t-emerald-400" />
          <KpiCard icon={BadgeDollarSign} label="إيرادات هذا الشهر"  value={fmtCurrency(revMonth, defaultCurrency)} accent="border-t-customBlue"  />
          <KpiCard icon={CheckCircle2}    label="طلبات مدفوعة"        value={String(paid.length)}                     accent="border-t-emerald-400" />
          <KpiCard icon={XCircle}         label="فاشلة / معلّقة"      value={`${failedCount} / ${pendingCount}`}      accent="border-t-rose-400"    />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-deepBlue/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الهاتف أو رقم الطلب أو الدورة…"
              className="w-full rounded-xl border border-deepBlue/10 bg-white py-2.5 pr-9 pl-3 text-sm text-deepBlue placeholder:text-deepBlue/30 focus:outline-none focus:ring-2 focus:ring-customBlue/30"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-deepBlue/10 bg-white py-2.5 px-3 text-sm text-deepBlue focus:outline-none"
          >
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_AR).map(([v, s]) => (
              <option key={v} value={v}>{s.label}</option>
            ))}
          </select>
          {(search || filterStatus) && (
            <button
              onClick={() => { setSearch(''); setFilterStatus('') }}
              className="flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-black text-rose-600"
            >
              <X size={12} /> مسح
            </button>
          )}
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="size-8 animate-spin text-customBlue" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-deepBlue/10 bg-white py-20 text-center">
            <Receipt size={40} className="text-deepBlue/20" />
            <p className="font-black text-deepBlue/40">لا توجد طلبات</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((order, i) => {
              const st = STATUS_AR[order.status] ?? STATUS_AR.pending
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  onClick={() => setSelected(order)}
                  className={`flex cursor-pointer flex-col gap-3 rounded-2xl border border-deepBlue/[0.07] bg-white p-4 shadow-sm transition hover:shadow-md border-t-[3px] ${st.accent}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black text-deepBlue">{order.user?.name ?? '—'}</p>
                      <p className="truncate text-[11px] text-deepBlue/40">{order.user?.email}</p>
                      {order.user?.phone && (
                        <p className="mt-0.5 text-[10px] font-semibold text-deepBlue/35" dir="ltr">
                          {[order.user.phone_country_code, order.user.phone].filter(Boolean).join(' ')}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>

                  <p className="line-clamp-1 text-xs font-semibold text-deepBlue/60">
                    {order.course?.title ?? 'دورة'}
                  </p>

                  <div className="flex items-center justify-between border-t border-deepBlue/[0.05] pt-2.5 text-xs">
                    <span className="font-black text-deepBlue" dir="ltr">
                      {fmtCurrency(order.total, order.currency)}
                    </span>
                    <FinanceDate value={order.paid_at ?? order.created_at} />
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Count */}
        {!loading && filtered.length > 0 && (
          <p className="text-[11px] font-semibold text-deepBlue/30">
            عرض {filtered.length} من {orders.length} طلب
          </p>
        )}
      </div>

      {/* Detail drawer — rendered via portal to escape transform stacking context */}
      {selected && (
        <OrderDrawer order={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
