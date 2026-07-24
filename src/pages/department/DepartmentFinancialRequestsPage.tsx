import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, RefreshCw, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import type { FinancialRequest } from '@/api/financialRequestsApi'
import { fetchFinancialRequests } from '@/api/financialRequestsApi'
import FinancialRequestsTable from '@/components/financial/FinancialRequestsTable'
import FinancialRequestDetailView from '@/components/financial/FinancialRequestDetailView'
import FinancialRequestForm from '@/components/financial/FinancialRequestForm'

export default function DepartmentFinancialRequestsPage() {
  const [requests, setRequests] = useState<FinancialRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FinancialRequest | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<FinancialRequest | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchFinancialRequests()
      setRequests(res.data ?? [])
    } catch { toast.error('فشل تحميل الطلبات') } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  function handleUpdate(updated: FinancialRequest) {
    setRequests(r => r.map(x => x.id === updated.id ? updated : x))
    if (selected?.id === updated.id) setSelected(updated)
  }

  const stats = {
    total:    requests.length,
    pending:  requests.filter(r => ['draft', 'returned'].includes(r.status)).length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => ['rejected', 'finance_rejected'].includes(r.status)).length,
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customOrange">المالية</p>
          <h1 className="mt-1 text-2xl font-black text-deepBlue">طلباتي المالية</h1>
          <p className="mt-1 text-sm text-deepBlue/50">إدارة الطلبات المالية لقسمك</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-deepBlue hover:bg-slate-50">
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => { setEditTarget(undefined); setShowForm(true) }}
            className="flex items-center gap-2 rounded-xl bg-deepBlue px-5 py-2.5 text-sm font-bold text-white hover:bg-deepBlue/90"
          >
            <Plus size={16} /> طلب جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'الإجمالي', value: stats.total, icon: FileText, color: 'text-deepBlue' },
          { label: 'قيد المراجعة', value: stats.pending, icon: Clock, color: 'text-amber-600' },
          { label: 'معتمدة', value: stats.approved, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'مرفوضة', value: stats.rejected, icon: XCircle, color: 'text-red-500' },
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

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : (
        <FinancialRequestsTable
          requests={requests}
          onSelect={r => setSelected(r)}
        />
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <FinancialRequestDetailView
            key={selected.id}
            request={selected}
            onClose={() => setSelected(null)}
            onUpdate={handleUpdate}
            viewerRole="department_leader"
          />
        )}
      </AnimatePresence>

      {/* Create/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <FinancialRequestForm
            initial={editTarget}
            onClose={() => setShowForm(false)}
            onSaved={req => {
              if (editTarget) {
                handleUpdate(req)
              } else {
                setRequests(r => [req, ...r])
              }
              setShowForm(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
