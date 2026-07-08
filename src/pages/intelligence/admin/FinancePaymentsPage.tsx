import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BadgeDollarSign, Check, CheckCircle2, Clock3, Copy,
  CreditCard, FileSpreadsheet, Loader2, Mail, Phone,
  Search, X, XCircle,
} from 'lucide-react'
import { FinanceSubnav } from '@/components/intelligence'
import { fetchFinancePayments } from '@/api/financeApi'
import type { FinancePaymentRow } from '@/types/intelligence'

// ── Arabic status map ────────────────────────────────────────────────────────

const STATUS_AR: Record<string, { label: string; cls: string; dot: string }> = {
  confirmed:           { label: 'مدفوع',           cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-400' },
  paid:                { label: 'مدفوع',           cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-400' },
  completed:           { label: 'مكتمل',           cls: 'bg-teal-50 text-teal-700 ring-teal-200',         dot: 'bg-teal-400'   },
  pending:             { label: 'قيد الانتظار',    cls: 'bg-amber-50 text-amber-700 ring-amber-200',      dot: 'bg-amber-400'  },
  pending_payment:     { label: 'قيد الانتظار',    cls: 'bg-amber-50 text-amber-700 ring-amber-200',      dot: 'bg-amber-400'  },
  processing:          { label: 'قيد المعالجة',    cls: 'bg-sky-50 text-sky-700 ring-sky-200',            dot: 'bg-sky-400'    },
  failed:              { label: 'فشل الدفع',       cls: 'bg-rose-50 text-rose-700 ring-rose-200',         dot: 'bg-rose-400'   },
  payment_failed:      { label: 'فشل الدفع',       cls: 'bg-rose-50 text-rose-700 ring-rose-200',         dot: 'bg-rose-400'   },
  cancelled:           { label: 'ملغي',            cls: 'bg-slate-100 text-slate-500 ring-slate-200',     dot: 'bg-slate-400'  },
  refunded:            { label: 'مسترد',           cls: 'bg-violet-50 text-violet-700 ring-violet-200',   dot: 'bg-violet-400' },
  partially_refunded:  { label: 'مسترد جزئياً',   cls: 'bg-purple-50 text-purple-700 ring-purple-200',   dot: 'bg-purple-400' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_AR[status] ?? STATUS_AR['pending']
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── Item type label ──────────────────────────────────────────────────────────

const ITEM_TYPE_AR: Record<string, string> = {
  course: 'دورة',
  workshop: 'ورشة',
  learning_path: 'مسار تعليمي',
}

// ── Provider label ───────────────────────────────────────────────────────────

const PROVIDER_AR: Record<string, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  fake: 'تجريبي',
  bank_transfer: 'تحويل بنكي',
  cash: 'نقدي',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number | undefined | null, currency = 'EUR') {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount))
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

function initials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])
  return { copied, copy }
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent = 'blue' }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent?: 'blue' | 'green' | 'amber' | 'rose'
}) {
  const accents = {
    blue:  'border-t-sky-400',
    green: 'border-t-emerald-400',
    amber: 'border-t-amber-400',
    rose:  'border-t-rose-400',
  }
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border border-deepBlue/[0.07] bg-white p-5 shadow-sm border-t-[3px] ${accents[accent]}`}>
      <div className="flex items-center gap-2 text-deepBlue/40">
        <Icon size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-2xl font-black text-deepBlue tabular-nums" dir="ltr">{value}</p>
      {sub && <p className="text-[10px] font-semibold text-slate-400">{sub}</p>}
    </div>
  )
}

// ── Copy row ─────────────────────────────────────────────────────────────────

function CopyRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  const { copied, copy } = useCopy(value)
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={13} />
        <span className="text-[11px] font-black">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-deepBlue" dir="ltr">{value}</span>
        <button type="button" onClick={copy} className="rounded-lg p-1 transition hover:bg-slate-200">
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-400" />}
        </button>
      </div>
    </div>
  )
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function PaymentDrawer({ payment, onClose }: { payment: FinancePaymentRow; onClose: () => void }) {
  const name = payment.student_name ?? '—'
  const email = payment.student_email ?? payment.payer_email ?? ''
  const phone = payment.student_phone ?? ''
  const itemLabel = ITEM_TYPE_AR[payment.item_type ?? ''] ?? 'دورة'
  const itemTitle = payment.item_title ?? payment.course_name ?? '—'
  const avatarBg = ['bg-sky-500', 'bg-violet-500', 'bg-teal-500', 'bg-rose-500', 'bg-amber-500']
  const bg = avatarBg[payment.id % avatarBg.length]

  const drawer = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0"
        style={{ zIndex: 300 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-deepBlue/30 backdrop-blur-sm" onClick={onClose} />

        {/* Drawer */}
        <motion.div
          dir="rtl"
          className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">تفاصيل الدفعة</p>
            <button type="button" onClick={onClose} className="rounded-xl p-1.5 transition hover:bg-slate-100">
              <X size={18} className="text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
            {/* Student */}
            <div className="flex items-center gap-4">
              {payment.student_avatar ? (
                <img src={payment.student_avatar} alt={name} className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-100" />
              ) : (
                <div className={`flex h-14 w-14 items-center justify-center rounded-full ${bg} text-sm font-black text-white`}>
                  {initials(name)}
                </div>
              )}
              <div>
                <p className="text-base font-black text-deepBlue">{name}</p>
                <p className="text-xs font-semibold text-slate-500">{itemLabel} — {itemTitle}</p>
              </div>
            </div>

            {/* Contact */}
            {(email || phone) && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">معلومات التواصل</p>
                {email && <CopyRow icon={Mail} label="البريد" value={email} />}
                {phone && <CopyRow icon={Phone} label="الهاتف" value={phone} />}
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">بيانات الدفعة</p>
              <div className="rounded-2xl border border-deepBlue/[0.07] bg-gradient-to-br from-slate-50 to-white p-4 text-center">
                <p className="text-3xl font-black text-deepBlue tabular-nums" dir="ltr">
                  {fmtCurrency(payment.amount, payment.currency ?? 'EUR')}
                </p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <StatusBadge status={payment.status} />
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="space-y-2 text-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">تفاصيل أخرى</p>
              <Row label="رقم الطلب" value={payment.order_number ?? '—'} />
              <Row label="رقم الفاتورة" value={payment.invoice_number ?? '—'} />
              <Row label="مزود الدفع" value={PROVIDER_AR[payment.provider] ?? payment.provider ?? '—'} />
              <Row label="طريقة الدفع" value={payment.payment_method ?? '—'} />
              <Row label="تاريخ الإنشاء" value={fmtDate(payment.created_at)} />
              <Row label="تاريخ الدفع" value={fmtDate(payment.confirmed_at)} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(drawer, document.body)
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-[11px] font-black text-slate-400">{label}</span>
      <span className="text-[11px] font-bold text-deepBlue" dir="ltr">{value}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FinancePaymentsPage() {
  const [rows, setRows] = useState<FinancePaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(false)
  const [total, setTotal] = useState(0)

  const [range, setRange] = useState(() => {
    const y = new Date().getFullYear()
    return { from: `${y}-01-01`, to: `${y}-12-31` }
  })
  const [applied, setApplied] = useState(range)
  const [status, setStatus] = useState('all')
  const [provider, setProvider] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<FinancePaymentRow | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadErr(false)
    void (async () => {
      try {
        const d = await fetchFinancePayments({ from: applied.from, to: applied.to })
        if (!cancelled) { setRows(d.data); setTotal(d.total) }
      } catch {
        if (!cancelled) { setRows([]); setLoadErr(true) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [applied])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (status !== 'all' && r.status !== status) return false
      if (provider !== 'all' && String(r.provider).toLowerCase() !== provider) return false
      if (!q) return true
      const blob = [r.student_name, r.student_email, r.payer_email, r.item_title, r.course_name, r.order_number, String(r.id)].join(' ').toLowerCase()
      return blob.includes(q)
    })
  }, [rows, status, provider, search])

  const kpis = useMemo(() => {
    const paid = rows.filter(r => ['confirmed', 'paid', 'completed'].includes(r.status))
    return {
      total: rows.length,
      paid: paid.length,
      pending: rows.filter(r => ['pending', 'pending_payment', 'processing'].includes(r.status)).length,
      failed: rows.filter(r => ['failed', 'payment_failed', 'cancelled'].includes(r.status)).length,
      revenue: paid.reduce((a, r) => a + Number(r.amount || 0), 0),
    }
  }, [rows])

  function exportCsv() {
    const headers = ['رقم العملية', 'اسم الطالب', 'البريد الإلكتروني', 'الهاتف', 'اسم البرنامج', 'النوع', 'المبلغ', 'العملة', 'الحالة', 'مزود الدفع', 'تاريخ الإنشاء', 'تاريخ الدفع']
    const bom = '﻿'
    const csvRows = [headers, ...filtered.map(r => [
      r.id,
      r.student_name ?? r.payer_email ?? '',
      r.student_email ?? r.payer_email ?? '',
      r.student_phone ?? '',
      r.item_title ?? r.course_name ?? '',
      ITEM_TYPE_AR[r.item_type ?? ''] ?? 'دورة',
      Number(r.amount).toFixed(2),
      r.currency ?? 'EUR',
      STATUS_AR[r.status]?.label ?? r.status,
      PROVIDER_AR[r.provider] ?? r.provider,
      fmtDate(r.created_at),
      fmtDate(r.confirmed_at),
    ])]
    const csv = bom + csvRows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `emc-payments-${applied.from}_${applied.to}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div dir="rtl" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <FinanceSubnav />

      {/* Header */}
      <div className="mt-8 text-right">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-customBlue">العمليات المالية</p>
        <h1 className="mt-1.5 text-2xl font-black text-deepBlue sm:text-3xl">المدفوعات</h1>
        <p className="mt-1.5 text-sm font-semibold text-slate-500">
          {total > 0 ? `${total.toLocaleString('en-US')} عملية في قاعدة البيانات` : 'متابعة عمليات الدفع وحالاتها'}
        </p>
      </div>

      {/* KPIs */}
      <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard icon={CreditCard} label="إجمالي" value={kpis.total.toLocaleString('en-US')} accent="blue" />
        <KpiCard icon={CheckCircle2} label="مدفوعة" value={kpis.paid.toLocaleString('en-US')} accent="green" />
        <KpiCard icon={Clock3} label="معلقة" value={kpis.pending.toLocaleString('en-US')} accent="amber" />
        <KpiCard icon={XCircle} label="فاشلة / ملغية" value={kpis.failed.toLocaleString('en-US')} accent="rose" />
        <KpiCard icon={BadgeDollarSign} label="الإيرادات المؤكدة" value={fmtCurrency(kpis.revenue)} accent="green" />
      </div>

      {/* Filters */}
      <div className="mt-7 rounded-2xl border border-deepBlue/[0.06] bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {/* Search */}
          <div className="xl:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">بحث</label>
            <div className="relative">
              <Search className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="اسم الطالب، البريد، رقم الطلب..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pe-10 ps-3 text-sm font-semibold text-deepBlue placeholder:text-slate-400 focus:border-customBlue focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">الحالة</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-deepBlue focus:border-customBlue focus:outline-none">
              <option value="all">كل الحالات</option>
              <option value="confirmed">مدفوع</option>
              <option value="pending">قيد الانتظار</option>
              <option value="failed">فشل الدفع</option>
              <option value="cancelled">ملغي</option>
              <option value="refunded">مسترد</option>
            </select>
          </div>

          {/* Provider */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">المزود</label>
            <select value={provider} onChange={e => setProvider(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-deepBlue focus:border-customBlue focus:outline-none">
              <option value="all">الكل</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="fake">تجريبي</option>
            </select>
          </div>

          {/* Date + Export */}
          <div className="flex flex-col gap-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">الفترة</label>
            <div className="flex items-center gap-2">
              <input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))}
                className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-deepBlue focus:border-customBlue focus:outline-none" />
              <input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))}
                className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-deepBlue focus:border-customBlue focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button type="button" onClick={() => setApplied(range)}
            className="h-9 rounded-xl bg-customBlue px-5 text-xs font-black text-white transition hover:opacity-90">
            تطبيق
          </button>
          <button type="button" onClick={exportCsv} disabled={filtered.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-customOrange px-4 text-xs font-black text-white transition hover:opacity-90 disabled:opacity-50">
            <FileSpreadsheet size={14} />
            تصدير CSV
          </button>
        </div>
      </div>

      {/* Error */}
      {loadErr && (
        <div className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 ring-1 ring-rose-200">
          تعذّر تحميل المدفوعات من الخادم.
        </div>
      )}

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-deepBlue/[0.06] bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-sm font-bold text-slate-500">
            <Loader2 className="animate-spin text-customBlue" size={20} />
            جاري التحميل...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <CreditCard size={26} />
            </div>
            <p className="mt-4 text-sm font-black text-deepBlue">لا توجد مدفوعات مطابقة</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">جرّب توسيع الفترة أو تعديل المرشّحات.</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[860px] border-collapse text-right text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 text-[10px] font-black uppercase tracking-widest text-slate-400 backdrop-blur">
                <tr>
                  <th className="px-4 py-3 w-16">#</th>
                  <th className="px-4 py-3">الطالب</th>
                  <th className="px-4 py-3">البرنامج</th>
                  <th className="px-4 py-3">المبلغ</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">المزود</th>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const name = p.student_name ?? p.payer_email ?? '—'
                  const email = p.student_email ?? p.payer_email ?? ''
                  const avatarBg = ['bg-sky-500', 'bg-violet-500', 'bg-teal-500', 'bg-rose-500', 'bg-amber-500']
                  const bg = avatarBg[p.id % avatarBg.length]
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.015, 0.3) }}
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3 tabular-nums text-[11px] font-bold text-slate-400" dir="ltr">{p.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {p.student_avatar ? (
                            <img src={p.student_avatar} alt={name} className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200" />
                          ) : (
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg} text-[10px] font-black text-white`}>
                              {initials(name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-deepBlue">{name}</p>
                            {email && <p className="truncate text-[10px] font-semibold text-slate-400" dir="ltr">{email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <p className="truncate text-xs font-bold text-deepBlue">{p.item_title ?? p.course_name ?? '—'}</p>
                        {p.item_type && (
                          <span className="text-[10px] font-semibold text-slate-400">{ITEM_TYPE_AR[p.item_type] ?? p.item_type}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums" dir="ltr">
                        <span className="text-sm font-black text-deepBlue">{fmtCurrency(p.amount, p.currency)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-[11px] font-bold text-slate-500">
                        {PROVIDER_AR[p.provider] ?? p.provider ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-bold text-slate-500 tabular-nums" dir="ltr">
                        {fmtDate(p.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelected(p)}
                          className="rounded-xl border border-deepBlue/[0.08] px-3 py-1.5 text-[11px] font-black text-customBlue transition hover:border-customBlue/30 hover:bg-sky-50"
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

        {!loading && filtered.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-right text-[11px] font-bold text-slate-500" dir="ltr">
            Showing {filtered.length.toLocaleString('en-US')} of {rows.length.toLocaleString('en-US')} payments
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && <PaymentDrawer payment={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
