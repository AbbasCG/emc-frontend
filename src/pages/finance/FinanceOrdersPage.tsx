import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BadgeDollarSign, FileText, Loader2, Receipt, Search,
  TrendingUp, X, XCircle, CheckCircle2
} from 'lucide-react'
import api from '@/api/axios'
import type { Order } from '@/api/checkoutApi'
import toast from '@/lib/toast'

const STATUS_AR: Record<string, { label: string; cls: string; accent: string }> = {
  pending:   { label: 'قيد الانتظار', cls: 'bg-amber-50 text-amber-700',    accent: 'border-t-amber-400'   },
  paid:      { label: 'مدفوع',        cls: 'bg-emerald-50 text-emerald-700', accent: 'border-t-emerald-400' },
  failed:    { label: 'فشل',          cls: 'bg-rose-50 text-rose-600',       accent: 'border-t-rose-400'    },
  cancelled: { label: 'ملغى',         cls: 'bg-slate-100 text-slate-500',    accent: 'border-t-slate-300'   },
  refunded:  { label: 'مسترد',        cls: 'bg-sky-50 text-sky-600',         accent: 'border-t-sky-400'     },
}

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

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

export default function FinanceOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)

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
      || o.order_number.toLowerCase().includes(q)
      || (o.course?.title ?? '').toLowerCase().includes(q)
    const matchStatus = !filterStatus || o.status === filterStatus
    return matchSearch && matchStatus
  }), [orders, search, filterStatus])

  const paid       = orders.filter((o) => o.status === 'paid')
  const totalRev   = paid.reduce((s, o) => s + Number(o.total), 0)
  const thisMonth  = paid.filter((o) => o.paid_at && new Date(o.paid_at).getMonth() === new Date().getMonth())
  const revMonth   = thisMonth.reduce((s, o) => s + Number(o.total), 0)
  const failedCount= orders.filter((o) => ['failed', 'cancelled'].includes(o.status)).length

  const defaultCurrency = orders[0]?.currency ?? 'EUR'

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-customBlue/10">
            <Receipt size={20} className="text-customBlue" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-deepBlue">الطلبات والمدفوعات</h1>
            <p className="text-sm text-deepBlue/50">إدارة مدفوعات الدورات المدفوعة</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard icon={TrendingUp}      label="إجمالي الإيرادات"   value={fmtCurrency(totalRev,  defaultCurrency)} accent="border-t-emerald-400" />
          <KpiCard icon={BadgeDollarSign} label="إيرادات هذا الشهر"  value={fmtCurrency(revMonth,  defaultCurrency)} accent="border-t-customBlue"  />
          <KpiCard icon={CheckCircle2}    label="طلبات مدفوعة"        value={String(paid.length)}                      accent="border-t-emerald-400" />
          <KpiCard icon={XCircle}         label="فاشلة / ملغاة"       value={String(failedCount)}                      accent="border-t-rose-400"    />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-deepBlue/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو رقم الطلب أو الدورة…"
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

        {/* Cards Grid */}
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
                      <p className="text-[11px] text-deepBlue/40">{order.user?.email}</p>
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
                    <span className="text-deepBlue/40">{fmtDate(order.paid_at ?? order.created_at)}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50" onClick={() => setSelected(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 35 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-white shadow-2xl"
              dir="rtl"
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-deepBlue/[0.06] bg-white/90 p-5 backdrop-blur-sm">
                <h2 className="font-black text-deepBlue">تفاصيل الطلب</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="flex size-8 items-center justify-center rounded-full hover:bg-slate-100"
                >
                  <X size={16} className="text-deepBlue/50" />
                </button>
              </div>

              <div className="space-y-5 p-5">
                {/* Status */}
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                  <span className="text-sm text-deepBlue/50">الحالة</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${(STATUS_AR[selected.status] ?? STATUS_AR.pending).cls}`}>
                    {(STATUS_AR[selected.status] ?? STATUS_AR.pending).label}
                  </span>
                </div>

                {/* Student */}
                <Section title="الطالب">
                  <Row label="الاسم"  value={selected.user?.name  ?? '—'} />
                  <Row label="البريد" value={selected.user?.email ?? '—'} />
                </Section>

                {/* Order */}
                <Section title="الطلب">
                  <Row label="رقم الطلب"  value={selected.order_number} mono />
                  <Row label="الدورة"     value={selected.course?.title ?? '—'} />
                  <Row label="المبلغ"     value={fmtCurrency(selected.total, selected.currency)} />
                  <Row label="العملة"     value={selected.currency} />
                  <Row label="مزود الدفع" value={selected.payment_provider} />
                  <Row label="تاريخ الدفع" value={fmtDate(selected.paid_at)} />
                </Section>

                {/* Invoice */}
                {selected.invoice && (
                  <Section title="الفاتورة">
                    <Row label="رقم الفاتورة" value={selected.invoice.invoice_number} mono />
                    <Row label="تاريخ الإصدار" value={fmtDate(selected.invoice.issued_at)} />
                    <button className="mt-2 inline-flex items-center gap-2 rounded-xl bg-customBlue/[0.07] px-4 py-2 text-xs font-black text-customBlue transition hover:bg-customBlue/[0.12]">
                      <FileText size={13} />
                      تحميل الفاتورة
                    </button>
                  </Section>
                )}

                {/* Payment Intent */}
                {selected.provider_payment_intent_id && (
                  <Section title="بيانات Stripe">
                    <Row label="Payment Intent" value={selected.provider_payment_intent_id} mono />
                  </Section>
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-deepBlue/30">{title}</p>
      <div className="divide-y divide-deepBlue/[0.05] rounded-2xl border border-deepBlue/[0.07] bg-white overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
      <span className="text-xs text-deepBlue/40">{label}</span>
      <span className={`text-xs font-semibold text-deepBlue ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
