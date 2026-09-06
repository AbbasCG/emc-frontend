import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BadgeDollarSign,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Loader2,
  Mail,
  Phone,
  Receipt,
  RefreshCw,
  Search,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react'
// FileText kept for invoice link in drawer
import { fetchFinanceOrders } from '@/api/financeApi'
import type { FinanceOrder } from '@/types/intelligence'
import { FinanceSubnav } from '@/components/intelligence'
import toast from '@/lib/toast'
import FinanceDate from '@/components/finance/FinanceDate'
import { formatFinanceForeignCurrency, formatFinanceDateTime } from '@/utils/financeFormatters'

/* ─── Status config ────────────────────────────────────────────────────────── */

const STATUS_AR: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  pending:           { label: 'قيد الانتظار',   dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
  pending_payment:   { label: 'انتظار الدفع',    dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
  paid:              { label: 'مدفوع',            dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  confirmed:         { label: 'مؤكد',             dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  completed:         { label: 'مكتمل',            dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  failed:            { label: 'فشل',              dot: 'bg-rose-400',    bg: 'bg-rose-50',    text: 'text-rose-600'    },
  payment_failed:    { label: 'فشل الدفع',        dot: 'bg-rose-400',    bg: 'bg-rose-50',    text: 'text-rose-600'    },
  cancelled:         { label: 'ملغى',             dot: 'bg-slate-400',   bg: 'bg-slate-100',  text: 'text-slate-500'   },
  refunded:          { label: 'مسترد',            dot: 'bg-sky-400',     bg: 'bg-sky-50',     text: 'text-sky-600'     },
  partially_refunded:{ label: 'مسترد جزئياً',    dot: 'bg-sky-300',     bg: 'bg-sky-50',     text: 'text-sky-600'     },
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function fmtCurrency(amount: number | null | undefined, currency = 'EUR') {
  if (amount == null) return '—'
  return formatFinanceForeignCurrency(amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDateExport(d?: string | null) {
  return formatFinanceDateTime(d)
}

function getInitials(name: string) {
  const p = (name || '').trim().split(/\s+/)
  return p.length >= 2 ? (p[0]?.[0] ?? '') + (p[p.length - 1]?.[0] ?? '') : (name.slice(0, 2) || '?')
}

const GRAD_COLORS = [
  'from-violet-500 to-purple-700', 'from-sky-500 to-blue-700',
  'from-emerald-500 to-teal-600',  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',     'from-indigo-500 to-blue-700',
]
function hashStr(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return h
}

/* ─── StatusBadge ──────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_AR[status] ?? { label: status, dot: 'bg-slate-300', bg: 'bg-slate-50', text: 'text-slate-500' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ring-black/[0.06] ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

/* ─── Avatar ───────────────────────────────────────────────────────────────── */

function Avatar({ name, src, px = 36 }: { name: string; src?: string | null; px?: number }) {
  if (src) return <img src={src} alt={name} className="shrink-0 rounded-full object-cover" style={{ width: px, height: px }} />
  const g = GRAD_COLORS[hashStr(name || '?') % GRAD_COLORS.length]
  return (
    <div
      className={`flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br ${g} font-black text-white`}
      style={{ width: px, height: px, fontSize: Math.round(px * 0.36) }}
    >
      {getInitials(name || '?')}
    </div>
  )
}

/* ─── CopyBtn ──────────────────────────────────────────────────────────────── */

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async (e) => { e.stopPropagation(); await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000) }}
      title="نسخ"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-[#0077B6]/40 hover:text-[#0077B6]"
    >
      {done ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
    </button>
  )
}

/* ─── CopyRow ──────────────────────────────────────────────────────────────── */

function CopyRow({ icon: Icon, label, value, mono }: { icon: React.ElementType; label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={12} />
        <span className="text-[11px] font-bold text-slate-500">{label}</span>
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className={`min-w-0 truncate text-[12px] font-semibold text-slate-700 ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : undefined}>{value}</span>
        <CopyBtn text={value} />
      </div>
    </div>
  )
}

/* ─── OrderDrawer ──────────────────────────────────────────────────────────── */

function OrderDrawer({ order, onClose }: { order: FinanceOrder; onClose: () => void }) {
  const name = order.user?.name ?? 'مجهول'
  const phone = [order.user?.phone_country_code, order.user?.phone].filter(Boolean).join(' ') || null

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0" style={{ zIndex: 300 }} onClick={onClose}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <motion.aside
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-y-0 start-0 flex w-full max-w-[420px] flex-col bg-white shadow-2xl"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0077B6]/10">
                <Receipt size={16} className="text-[#0077B6]" />
              </div>
              <div>
                <p className="text-[14px] font-black text-slate-800">{order.order_number}</p>
                <p className="text-[11px] text-slate-400">تفاصيل الطلب</p>
              </div>
            </div>
            <button type="button" onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50">
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {/* Student info */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3.5">
              <Avatar name={name} src={order.user?.avatar_url} px={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-black text-slate-800">{name}</p>
                {order.user?.email && (
                  <p className="truncate text-[11px] text-slate-400">{order.user.email}</p>
                )}
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <CopyRow icon={Mail} label="البريد الإلكتروني" value={order.user?.email} />
              <CopyRow icon={Phone} label="الهاتف" value={phone} mono />
              <CopyRow icon={ClipboardList} label="رقم الطلب" value={order.order_number} mono />
              {order.invoice && (
                <CopyRow icon={FileText} label="رقم الفاتورة" value={order.invoice.invoice_number} mono />
              )}
            </div>

            {/* Order details */}
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">تفاصيل الطلب</p>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { label: 'الحالة',        value: <StatusBadge status={order.status} /> },
                  { label: 'المبلغ',         value: <span dir="ltr" className="font-black text-slate-800">{fmtCurrency(order.total, order.currency)}</span> },
                  order.subtotal != null ? { label: 'المبلغ الأساسي', value: fmtCurrency(order.subtotal, order.currency) } : null,
                  order.tax_amount != null ? { label: 'الضريبة', value: fmtCurrency(order.tax_amount, order.currency) } : null,
                  { label: 'طريقة الدفع',   value: order.payment_provider ?? '—' },
                  { label: 'النوع',          value: order.type ?? '—' },
                  { label: 'تاريخ الدفع',   value: <FinanceDate value={order.paid_at} showTime /> },
                  { label: 'تاريخ الإنشاء', value: <FinanceDate value={order.created_at} showTime /> },
                ].filter(Boolean).map((row, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="shrink-0 text-[11px] font-bold text-slate-400">{(row as { label: string }).label}</span>
                    <span className="text-end text-[12px] font-semibold text-slate-600">{(row as { value: React.ReactNode }).value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Course / item */}
            {order.course && (
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">البرنامج / الدورة</p>
                </div>
                <div className="px-4 py-3.5">
                  <p className="text-[13px] font-bold text-slate-800">{order.course.title}</p>
                </div>
              </div>
            )}

            {/* Invoice download */}
            {order.invoice && (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0077B6]/[0.08] py-3 text-[13px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/[0.14]"
              >
                <Download size={14} />
                تحميل الفاتورة
              </button>
            )}
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>,
    document.body,
  )
}

/* ─── KPI Card ─────────────────────────────────────────────────────────────── */

function KpiCard({ icon: Icon, label, value, accent = 'border-t-[#0077B6]' }: {
  icon: React.ElementType; label: string; value: string; accent?: string
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border border-deepBlue/[0.07] bg-white p-5 shadow-sm border-t-[3px] ${accent}`}>
      <div className="flex items-center gap-2 text-deepBlue/40">
        <Icon size={14} />
        <span className="text-[11px] font-black uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-black text-deepBlue" dir="ltr">{value}</p>
    </div>
  )
}

/* ─── CSV export ───────────────────────────────────────────────────────────── */

function exportCsv(orders: FinanceOrder[], mode: 'orders' | 'invoices') {
  const headers = ['رقم الطلب', 'الطالب', 'البريد الإلكتروني', 'الهاتف', 'الدورة', 'المبلغ', 'العملة', 'الحالة', 'تاريخ الدفع', 'تاريخ الإنشاء']
  const rows = orders.map((o) => [
    o.order_number,
    o.user?.name ?? '',
    o.user?.email ?? '',
    o.user?.phone ?? '',
    o.course?.title ?? '',
    String(o.total),
    o.currency,
    STATUS_AR[o.status]?.label ?? o.status,
    fmtDateExport(o.paid_at),
    fmtDateExport(o.created_at),
  ])
  const csv = '﻿' + [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `finance-${mode}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
}

/* ─── Main page ────────────────────────────────────────────────────────────── */

export default function FinanceOrdersPage() {
  const [orders, setOrders] = useState<FinanceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<FinanceOrder | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  /** Imperative refresh from the toolbar button — outside the effect, so it may flip to
   *  the loading state synchronously. */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchFinanceOrders()
      setOrders(res.data)
    } catch {
      toast.error('تعذّر تحميل الطلبات.')
    } finally {
      setLoading(false)
    }
  }, [])

  // First load — `loading` already starts at `true`, so the effect only commits state
  // after the await instead of re-rendering synchronously from the effect body.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await fetchFinanceOrders()
        if (alive) setOrders(res.data)
      } catch {
        toast.error('تعذّر تحميل الطلبات.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      const matchSearch = !q
        || (o.user?.name ?? '').toLowerCase().includes(q)
        || (o.user?.email ?? '').toLowerCase().includes(q)
        || (o.user?.phone ?? '').includes(q)
        || o.order_number.toLowerCase().includes(q)
        || (o.course?.title ?? '').toLowerCase().includes(q)
        || (o.invoice?.invoice_number ?? '').toLowerCase().includes(q)
      const matchStatus = !filterStatus || o.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [orders, search, filterStatus])

  const paid = orders.filter((o) => ['paid', 'confirmed', 'completed'].includes(o.status))
  const totalRev = paid.reduce((s, o) => s + Number(o.total), 0)
  const currency = orders[0]?.currency ?? 'EUR'
  const pendingCount = orders.filter((o) => ['pending', 'pending_payment'].includes(o.status)).length
  const failedCount = orders.filter((o) => ['failed', 'payment_failed', 'cancelled'].includes(o.status)).length

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0077B6]/10">
            <Receipt size={20} className="text-[#0077B6]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-deepBlue">الطلبات</h1>
            <p className="text-[13px] text-deepBlue/50">قائمة طلبات الدفع وبيانات الطلاب</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportCsv(filtered, 'orders')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-black text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <Download size={13} />
            تصدير CSV
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>
      </motion.div>

      {/* Subnav */}
      <FinanceSubnav />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={TrendingUp}      label="إجمالي الإيرادات" value={fmtCurrency(totalRev, currency)} accent="border-t-emerald-400" />
        <KpiCard icon={BadgeDollarSign} label="مدفوعة"            value={String(paid.length)}              accent="border-t-[#0077B6]"   />
        <KpiCard icon={CheckCircle2}    label="قيد الانتظار"      value={String(pendingCount)}             accent="border-t-amber-400"   />
        <KpiCard icon={XCircle}         label="فاشلة / ملغاة"     value={String(failedCount)}              accent="border-t-rose-400"    />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={13} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الطلب أو الدورة…"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pe-9 ps-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-[#0077B6]/40 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/15"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:border-[#0077B6]/40 focus:outline-none"
        >
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_AR).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        {(search || filterStatus) && (
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterStatus('') }}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-500 hover:bg-slate-50"
          >
            <X size={12} /> إعادة تعيين
          </button>
        )}
        <span className="ms-auto text-[12px] font-bold text-slate-400">{filtered.length} نتيجة</span>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-[#0077B6]/50" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Receipt size={26} className="text-slate-300" />
            </div>
            <p className="text-[14px] font-bold text-slate-400">لا توجد طلبات حالياً</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {['الطالب', 'رقم الطلب', 'الدورة / البرنامج', 'المبلغ', 'الحالة', 'التاريخ', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-start text-[11px] font-black uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((order) => {
                  const name = order.user?.name ?? 'مجهول'
                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="transition hover:bg-slate-50/60"
                    >
                      {/* Student */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={name} src={order.user?.avatar_url} px={32} />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-black text-slate-800">{name}</p>
                            <p className="truncate text-[11px] text-slate-400">{order.user?.email ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      {/* Order number */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-[12px] font-bold text-slate-600">{order.order_number}</span>
                        {order.invoice && (
                          <p className="mt-0.5 font-mono text-[10px] text-slate-400">{order.invoice.invoice_number}</p>
                        )}
                      </td>
                      {/* Course */}
                      <td className="px-4 py-3">
                        <p className="max-w-[180px] truncate text-[12px] font-semibold text-slate-700">{order.course?.title ?? '—'}</p>
                        {order.type && <p className="text-[10px] text-slate-400">{order.type}</p>}
                      </td>
                      {/* Amount */}
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-black text-slate-800" dir="ltr">
                          {fmtCurrency(order.total, order.currency)}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[12px] text-slate-500">
                          <Calendar size={11} className="shrink-0 text-slate-400" />
                          <FinanceDate value={order.paid_at ?? order.created_at} />
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelected(order)}
                          className="rounded-xl border border-deepBlue/[0.08] bg-white px-3 py-1.5 text-[11px] font-black text-[#0077B6] shadow-sm transition hover:border-[#0077B6]/30 hover:bg-[#0077B6]/[0.05]"
                        >
                          تفاصيل
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Drawer */}
      {selected && (
        <OrderDrawer order={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
