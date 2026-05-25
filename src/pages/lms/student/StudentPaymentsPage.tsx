import { useEffect, useState } from 'react'
import { CreditCard, Download, CircleCheck } from 'lucide-react'
import { DashboardPageShell, Eyebrow, Surface } from '@/components/ui'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import { fetchStudentPayments, type StudentPayment } from '@/api/studentApi'

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    completed:       { label: 'مكتمل',   cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    'Pending Payment': { label: 'معلق', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
    failed:          { label: 'فشل',     cls: 'bg-red-50 text-red-700 ring-red-200' },
    refunded:        { label: 'مسترجع', cls: 'bg-purple-50 text-purple-700 ring-purple-200' },
  }
  const entry = map[status] ?? { label: status, cls: 'bg-slate-50 text-slate-700 ring-slate-200' }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${entry.cls}`}>{entry.label}</span>
}

const providerIcon = (provider: string) => {
  if (provider === 'stripe') return <CreditCard size={14} className="text-indigo-500" />
  if (provider === 'paypal') {
    return <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">PayPal</span>
  }
  return <span className="text-[10px] font-bold text-slate-500 uppercase">{provider}</span>
}

export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<StudentPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudentPayments()
      .then(setPayments)
      .finally(() => setLoading(false))
  }, [])

  const totalPaid = payments
    .filter((p) => p.status === 'completed')
    .reduce((s, p) => s + Number(p.amount), 0)

  const columns: DataTableColumn<StudentPayment>[] = [
    { key: 'course_title', header: 'الدورة', render: (r) => r.course_title ?? '—' },
    {
      key: 'amount', header: 'المبلغ',
      render: (r) => <span className="font-mono font-bold text-deepBlue">{Number(r.amount).toFixed(2)} ر.س</span>,
    },
    { key: 'provider', header: 'وسيلة الدفع', render: (r) => providerIcon(r.provider) },
    { key: 'status', header: 'الحالة', render: (r) => statusBadge(r.status) },
    {
      key: 'confirmed_at', header: 'تاريخ الدفع',
      render: (r) => r.confirmed_at ? new Date(r.confirmed_at).toLocaleDateString('ar-EG') : new Date(r.created_at).toLocaleDateString('ar-EG'),
    },
    {
      key: 'receipt_url', header: '',
      render: (r) => r.receipt_url ? (
        <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-customBlue hover:underline">
          <Download size={12} /> الفاتورة
        </a>
      ) : null,
    },
  ]

  return (
    <DashboardPageShell
      title="سجل المدفوعات والفواتير"
      eyebrow={<Eyebrow tone="accent">STUDENT · PAYMENTS</Eyebrow>}
      description="جميع معاملاتك المالية وفواتير التسجيل في مكان واحد."
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
          <CircleCheck size={12} /> إجمالي المدفوع: {totalPaid.toFixed(2)} ر.س
        </span>
      }
    >
      <Surface variant="default" elevation={3} padding="none" className="overflow-hidden">
        {!loading && payments.length === 0 && (
          <div className="px-6 py-12 text-center">
            <CreditCard size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-black text-slate-500">لا توجد مدفوعات بعد</p>
            <p className="mt-2 text-xs text-slate-400">تظهر المدفوعات هنا بعد تسجيلك في أي دورة مدفوعة.</p>
          </div>
        )}
        {payments.length > 0 && (
          <DataTable<StudentPayment> columns={columns} data={payments} keyExtractor={(r) => r.id} emptyMessage="لا توجد مدفوعات" />
        )}
      </Surface>
    </DashboardPageShell>
  )
}
