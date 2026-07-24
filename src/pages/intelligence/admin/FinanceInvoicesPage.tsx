import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  Mail,
  Receipt,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from 'lucide-react'
import { fetchFinanceInvoices } from '@/api/financeApi'
import type { FinanceInvoice } from '@/types/intelligence'
import { FinanceSubnav } from '@/components/intelligence'
import toast from '@/lib/toast'
import FinanceDate from '@/components/finance/FinanceDate'
import { formatFinanceForeignCurrency, formatFinanceDateTime } from '@/utils/financeFormatters'

/* ─── Status config ────────────────────────────────────────────────────────── */

const STATUS_AR: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  pending:         { label: 'قيد الانتظار', dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
  pending_payment: { label: 'انتظار الدفع',  dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
  paid:            { label: 'مدفوع',          dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  confirmed:       { label: 'مؤكد',           dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  completed:       { label: 'مكتمل',          dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  failed:          { label: 'فشل',            dot: 'bg-rose-400',    bg: 'bg-rose-50',    text: 'text-rose-600'    },
  cancelled:       { label: 'ملغى',           dot: 'bg-slate-400',   bg: 'bg-slate-100',  text: 'text-slate-500'   },
  refunded:        { label: 'مسترد',          dot: 'bg-sky-400',     bg: 'bg-sky-50',     text: 'text-sky-600'     },
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function fmtCurrency(amount: number | null | undefined, currency = 'EUR') {
  if (amount == null) return '—'
  return formatFinanceForeignCurrency(amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDateExport(d?: string | null) {
  return formatFinanceDateTime(d)
}

/* ─── StatusBadge ──────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-[11px] text-slate-400">—</span>
  const s = STATUS_AR[status] ?? { label: status, dot: 'bg-slate-300', bg: 'bg-slate-50', text: 'text-slate-500' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ring-black/[0.06] ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

/* ─── CopyBtn ──────────────────────────────────────────────────────────────── */

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async (e) => { e.stopPropagation(); await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000) }}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition hover:border-[#0077B6]/40 hover:text-[#0077B6]"
    >
      {done ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
    </button>
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

function exportCsv(invoices: FinanceInvoice[]) {
  const headers = ['رقم الفاتورة', 'رقم الطلب', 'الطالب', 'البريد الإلكتروني', 'الدورة', 'المبلغ', 'العملة', 'الحالة', 'تاريخ الإصدار']
  const rows = invoices.map((inv) => [
    inv.invoice_number,
    inv.order_number ?? '',
    inv.student_name ?? '',
    inv.student_email ?? '',
    inv.course_title ?? '',
    String(inv.total ?? ''),
    inv.currency,
    STATUS_AR[inv.status ?? '']?.label ?? inv.status ?? '',
    fmtDateExport(inv.issued_at),
  ])
  const csv = '﻿' + [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `finance-invoices-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
}

/* ─── Main page ────────────────────────────────────────────────────────────── */

export default function FinanceInvoicesPage() {
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchFinanceInvoices()
      setInvoices(res.data)
    } catch {
      toast.error('تعذّر تحميل الفواتير.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter((inv) =>
      inv.invoice_number.toLowerCase().includes(q)
      || (inv.order_number ?? '').toLowerCase().includes(q)
      || (inv.student_name ?? '').toLowerCase().includes(q)
      || (inv.student_email ?? '').toLowerCase().includes(q)
      || (inv.course_title ?? '').toLowerCase().includes(q)
    )
  }, [invoices, search])

  const paidInvoices = invoices.filter((inv) => ['paid', 'confirmed', 'completed'].includes(inv.status ?? ''))
  const totalAmount = paidInvoices.reduce((s, inv) => s + Number(inv.total ?? 0), 0)
  const currency = invoices[0]?.currency ?? 'EUR'

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
            <FileText size={20} className="text-[#0077B6]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-deepBlue">الفواتير</h1>
            <p className="text-[13px] text-deepBlue/50">قائمة الفواتير الصادرة وبيانات الدفع</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportCsv(filtered)}
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
        <KpiCard icon={FileText}    label="إجمالي الفواتير"   value={String(invoices.length)}           accent="border-t-[#0077B6]"   />
        <KpiCard icon={TrendingUp}  label="إجمالي المحصّل"    value={fmtCurrency(totalAmount, currency)} accent="border-t-emerald-400" />
        <KpiCard icon={Receipt}     label="مدفوعة"             value={String(paidInvoices.length)}       accent="border-t-teal-400"    />
        <KpiCard icon={Calendar}    label="قيد الانتظار"       value={String(invoices.filter((i) => ['pending','pending_payment'].includes(i.status ?? '')).length)} accent="border-t-amber-400" />
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={13} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الفاتورة أو الطالب أو الدورة…"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pe-9 ps-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-[#0077B6]/40 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/15"
          />
        </div>
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-500 hover:bg-slate-50"
          >
            <X size={12} /> مسح
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
              <FileText size={26} className="text-slate-300" />
            </div>
            <p className="text-[14px] font-bold text-slate-400">لا توجد فواتير حالياً</p>
            <p className="text-[12px] text-slate-300">ستظهر الفواتير هنا بعد اكتمال الطلبات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {['رقم الفاتورة', 'الطالب', 'الدورة / البرنامج', 'المبلغ', 'الحالة', 'تاريخ الإصدار', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-start text-[11px] font-black uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inv) => (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="transition hover:bg-slate-50/60"
                  >
                    {/* Invoice number */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[12px] font-bold text-slate-700">{inv.invoice_number}</span>
                        <CopyBtn text={inv.invoice_number} />
                      </div>
                      {inv.order_number && (
                        <p className="mt-0.5 font-mono text-[10px] text-slate-400">{inv.order_number}</p>
                      )}
                    </td>
                    {/* Student */}
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-black text-slate-800">{inv.student_name ?? '—'}</p>
                      {inv.student_email && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Mail size={10} />
                          <span>{inv.student_email}</span>
                        </div>
                      )}
                    </td>
                    {/* Course */}
                    <td className="px-4 py-3">
                      <p className="max-w-[200px] truncate text-[12px] font-semibold text-slate-700">
                        {inv.course_title ?? '—'}
                      </p>
                    </td>
                    {/* Amount */}
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-black text-slate-800" dir="ltr">
                        {fmtCurrency(inv.total, inv.currency)}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    {/* Issue date */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-[12px] text-slate-500">
                        <Calendar size={11} className="shrink-0 text-slate-400" />
                        <FinanceDate value={inv.issued_at} />
                      </div>
                    </td>
                    {/* Download */}
                    <td className="px-4 py-3">
                      {inv.has_pdf ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 rounded-xl border border-deepBlue/[0.08] bg-white px-3 py-1.5 text-[11px] font-black text-[#0077B6] shadow-sm transition hover:border-[#0077B6]/30 hover:bg-[#0077B6]/[0.05]"
                        >
                          <Download size={11} />
                          تحميل
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-300">—</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
