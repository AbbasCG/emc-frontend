import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import type { FinancialRequest, FinancialRequestStatus } from '@/api/financialRequestsApi'
import { formatSAR } from '@/utils/currency'
import { fetchFinancialRequests, STATUS_LABELS } from '@/api/financialRequestsApi'
import FinancialRequestsTable from '@/components/financial/FinancialRequestsTable'
import FinancialRequestDetailView from '@/components/financial/FinancialRequestDetailView'

const ALL_STATUSES: FinancialRequestStatus[] = [
  'draft', 'submitted', 'finance_review', 'finance_approved',
  'finance_rejected', 'executive_review', 'approved', 'rejected', 'returned', 'cancelled',
]

export default function SuperAdminFinancialRequestsPage() {
  const [requests, setRequests] = useState<FinancialRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FinancialRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchFinancialRequests({ status: statusFilter || undefined, per_page: 50 })
      setRequests(res.data ?? [])
    } catch { toast.error('فشل تحميل الطلبات') } finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { void load() }, [load])

  function handleUpdate(updated: FinancialRequest) {
    setRequests(r => r.map(x => x.id === updated.id ? updated : x))
    if (selected?.id === updated.id) setSelected(updated)
  }

  const totalAmount = requests.reduce((s, r) => s + r.amount, 0)

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customOrange">Super Admin</p>
          <h1 className="mt-1 text-2xl font-black text-deepBlue">جميع الطلبات المالية</h1>
          <p className="mt-1 text-sm text-deepBlue/50">عرض وإدارة كل الطلبات عبر المنصة</p>
        </div>
        <button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-deepBlue hover:bg-slate-50">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">إجمالي الطلبات</p>
          <p className="mt-3 text-3xl font-black text-deepBlue">{requests.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">إجمالي المبالغ</p>
          <p className="mt-3 text-2xl font-black text-deepBlue"><span dir="ltr">{formatSAR(totalAmount)}</span></p>
        </div>
        <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
          <p className="text-[11px] font-black uppercase tracking-wider text-green-600">المعتمدة</p>
          <p className="mt-3 text-3xl font-black text-green-700">{requests.filter(r => r.status === 'approved').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`rounded-full px-4 py-1.5 text-[12px] font-bold transition-colors ${!statusFilter ? 'bg-deepBlue text-white' : 'bg-slate-100 text-deepBlue/60 hover:bg-slate-200'}`}
        >
          الكل
        </button>
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-4 py-1.5 text-[12px] font-bold transition-colors ${
              statusFilter === s ? 'bg-deepBlue text-white' : 'bg-slate-100 text-deepBlue/60 hover:bg-slate-200'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>
      ) : (
        <FinancialRequestsTable requests={requests} onSelect={r => setSelected(r)} />
      )}

      <AnimatePresence>
        {selected && (
          <FinancialRequestDetailView
            key={selected.id}
            request={selected}
            onClose={() => setSelected(null)}
            onUpdate={handleUpdate}
            viewerRole="super_admin"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
