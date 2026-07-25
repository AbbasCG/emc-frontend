import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import type { FinancialRequest } from '@/api/financialRequestsApi'
import { formatSAR } from '@/utils/currency'
import { fetchFinancialRequests } from '@/api/financialRequestsApi'
import FinancialRequestsTable from '@/components/financial/FinancialRequestsTable'
import FinancialRequestDetailView from '@/components/financial/FinancialRequestDetailView'

export default function ExecutiveFinancialRequestsPage() {
  const [requests, setRequests] = useState<FinancialRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FinancialRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  /** Imperative refresh from the toolbar button — outside any effect, so flipping to the
   *  loading state synchronously is fine here. */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchFinancialRequests({ status: statusFilter || undefined })
      setRequests(res.data ?? [])
    } catch { toast.error('فشل تحميل الطلبات') } finally { setLoading(false) }
  }, [statusFilter])

  // Re-arm the loading state during render when the filter changes (react.dev "adjusting
  // state when a prop changes"), so the effect below stays pure I/O.
  const [seenStatusFilter, setSeenStatusFilter] = useState(statusFilter)
  if (seenStatusFilter !== statusFilter) {
    setSeenStatusFilter(statusFilter)
    setLoading(true)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await fetchFinancialRequests({ status: statusFilter || undefined })
        if (alive) setRequests(res.data ?? [])
      } catch {
        if (alive) toast.error('فشل تحميل الطلبات')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [statusFilter])

  function handleUpdate(updated: FinancialRequest) {
    setRequests(r => r.map(x => x.id === updated.id ? updated : x))
    if (selected?.id === updated.id) setSelected(updated)
  }

  const approved  = requests.filter(r => r.status === 'approved')
  const rejected  = requests.filter(r => r.status === 'rejected')
  const awaiting  = requests.filter(r => r.status === 'executive_review')

  const totalApprovedAmount = approved.reduce((s, r) => s + r.amount, 0)

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customOrange">الإدارة التنفيذية</p>
          <h1 className="mt-1 text-2xl font-black text-deepBlue">اعتماد الطلبات المالية</h1>
          <p className="mt-1 text-sm text-deepBlue/50">الطلبات التي اجتازت المراجعة المالية وتحتاج اعتمادك</p>
        </div>
        <button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-deepBlue hover:bg-slate-50">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'بانتظار الاعتماد', value: awaiting.length, icon: Clock, color: 'text-purple-600' },
          { label: 'معتمدة', value: approved.length, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'مرفوضة', value: rejected.length, icon: XCircle, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{s.label}</span>
              <s.icon size={18} className={s.color} />
            </div>
            <p className={`mt-3 text-3xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {totalApprovedAmount > 0 && (
        <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-5">
          <p className="text-[11px] font-black uppercase tracking-wider text-green-600">إجمالي المبالغ المعتمدة</p>
          <p className="mt-2 text-3xl font-black text-green-700">
            <span dir="ltr">{formatSAR(totalApprovedAmount)}</span>
          </p>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {[['', 'الكل'], ['executive_review', 'بانتظار الاعتماد'], ['approved', 'معتمدة'], ['rejected', 'مرفوضة']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setStatusFilter(v)}
            className={`rounded-full px-4 py-1.5 text-[12px] font-bold transition-colors ${
              statusFilter === v ? 'bg-deepBlue text-white' : 'bg-slate-100 text-deepBlue/60 hover:bg-slate-200'
            }`}
          >
            {l}
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
            viewerRole="executive_admin"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
