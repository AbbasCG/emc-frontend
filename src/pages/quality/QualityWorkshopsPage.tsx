import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Search, ChevronLeft, ChevronRight, Presentation,
  User, MapPin, Calendar, CheckCircle2, XCircle, Edit3,
} from 'lucide-react'
import { fetchQualityWorkshops } from '@/api/qualityApi'
import apiClient from '@/api/axios'
import toast from '@/lib/toast'
import { QualityDrawer } from '@/components/quality/QualityDrawer'

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  under_review: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-slate-100 text-slate-600',
}
const statusLabels: Record<string, string> = {
  pending: 'معلق',
  approved: 'مقبول',
  rejected: 'مرفوض',
  under_review: 'قيد المراجعة',
  cancelled: 'ملغى',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {statusLabels[status] ?? status}
    </span>
  )
}

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl border border-deepBlue/[0.07] p-5 space-y-3 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-3/4" />
      <div className="h-3 bg-slate-100 rounded w-1/2" />
      <div className="h-3 bg-slate-100 rounded w-2/3" />
      <div className="h-6 bg-slate-200 rounded w-20 mt-2" />
    </div>
  )
}

export default function QualityWorkshopsPage() {
  const [workshops, setWorkshops] = useState<any[]>([])
  const [meta, setMeta] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<any | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page) }
      if (search) params.search = search
      if (status) params.status = status
      if (from) params.from = from
      if (to) params.to = to
      const res = await fetchQualityWorkshops(params)
      setWorkshops(res.data ?? [])
      setMeta(res.meta ?? {})
    } catch {
      toast.error('تعذّر تحميل طلبات البرامج')
    } finally {
      setLoading(false)
    }
  }, [page, search, status, from, to])

  useEffect(() => { load() }, [load])

  const handleApprove = async (id: number) => {
    setActionLoading(true)
    try {
      await apiClient.post(`/workshop-requests/${id}/approve`)
      toast.success('تمّ قبول الطلب')
      load()
      setSelected((prev: any) => prev ? { ...prev, status: 'approved' } : prev)
    } catch {
      toast.error('فشلت عملية القبول')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (id: number) => {
    setActionLoading(true)
    try {
      await apiClient.post(`/workshop-requests/${id}/reject`)
      toast.success('تمّ رفض الطلب')
      load()
      setSelected((prev: any) => prev ? { ...prev, status: 'rejected' } : prev)
    } catch {
      toast.error('فشلت عملية الرفض')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-black text-deepBlue">طلبات البرامج التدريبية</h1>
        <p className="text-sm text-slate-500 mt-1">مراجعة وإدارة طلبات البرامج من منظور الجودة</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-deepBlue/[0.07] shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="بحث باسم البرنامج أو مقدم الطلب..."
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="">كل الحالات</option>
            <option value="pending">معلق</option>
            <option value="approved">مقبول</option>
            <option value="rejected">مرفوض</option>
            <option value="under_review">قيد المراجعة</option>
            <option value="cancelled">ملغى</option>
          </select>
          <input
            type="date"
            value={from}
            onChange={e => { setFrom(e.target.value); setPage(1) }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
            placeholder="من تاريخ"
          />
          <input
            type="date"
            value={to}
            onChange={e => { setTo(e.target.value); setPage(1) }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
            placeholder="إلى تاريخ"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : workshops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Presentation className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-base">لا توجد طلبات برامج</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workshops.map(w => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelected(w)}
              className="bg-white rounded-2xl border border-deepBlue/[0.07] shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-deepBlue text-sm leading-snug flex-1 ml-2">{w.program_name ?? w.name ?? '—'}</h3>
                <StatusBadge status={w.status ?? 'pending'} />
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>{w.requester?.name ?? w.requester_name ?? '—'}</span>
                </div>
                {w.department && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{w.department}</span>
                  </div>
                )}
                {w.created_at && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(w.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                )}
              </div>
              {w.categories && Array.isArray(w.categories) && w.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {w.categories.slice(0, 3).map((c: string, i: number) => (
                    <span key={i} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-600">{page} / {meta.last_page}</span>
          <button
            onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
            disabled={page === meta.last_page}
            className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Detail Drawer */}
      <QualityDrawer open={!!selected} onClose={() => setSelected(null)} title={selected?.program_name ?? selected?.name ?? 'تفاصيل الطلب'}>
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.status ?? 'pending'} />
            </div>

            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">مقدم الطلب</h3>
              <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
                <p><span className="text-slate-400">الاسم:</span> <span className="text-deepBlue font-medium">{selected.requester?.name ?? selected.requester_name ?? '—'}</span></p>
                <p><span className="text-slate-400">البريد:</span> <span>{selected.requester?.email ?? '—'}</span></p>
                <p><span className="text-slate-400">الهاتف:</span> <span>{selected.requester?.phone ?? '—'}</span></p>
                <p><span className="text-slate-400">القسم:</span> <span>{selected.department ?? '—'}</span></p>
              </div>
            </section>

            {(selected.speaker_name ?? selected.speaker) && (
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">المتحدث</h3>
                <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
                  <p><span className="text-slate-400">الاسم:</span> <span className="font-medium">{selected.speaker_name ?? selected.speaker?.name ?? '—'}</span></p>
                  <p><span className="text-slate-400">المسمى الوظيفي:</span> <span>{selected.speaker_title ?? selected.speaker?.job_title ?? '—'}</span></p>
                </div>
              </section>
            )}

            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">تفاصيل البرنامج</h3>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                {selected.categories && (
                  <div>
                    <span className="text-slate-400">التصنيفات: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(Array.isArray(selected.categories) ? selected.categories : [selected.categories]).map((c: string, i: number) => (
                        <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                <p><span className="text-slate-400">نوع السعر:</span> <span>{selected.price_type ?? '—'}</span></p>
                {selected.price && <p><span className="text-slate-400">السعر:</span> <span>{Number(selected.price).toLocaleString('en-US')} ريال</span></p>}
                {selected.location_type && <p><span className="text-slate-400">نوع الموقع:</span> <span>{selected.location_type}</span></p>}
                {selected.topics && <p><span className="text-slate-400">المحاور:</span> <span>{selected.topics}</span></p>}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">الجدول الزمني</h3>
              <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
                {selected.created_at && <p><span className="text-slate-400">تاريخ الإنشاء:</span> <span>{new Date(selected.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span></p>}
                {selected.workflow_status && <p><span className="text-slate-400">حالة سير العمل:</span> <span>{selected.workflow_status}</span></p>}
                {selected.current_step && <p><span className="text-slate-400">الخطوة الحالية:</span> <span>{selected.current_step}</span></p>}
              </div>
            </section>

            {(selected.status === 'pending' || selected.status === 'under_review') && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleApprove(selected.id)}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> قبول
                </button>
                <button
                  onClick={() => handleReject(selected.id)}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 border border-rose-400 text-rose-600 hover:bg-rose-50 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> رفض
                </button>
                <button
                  onClick={() => toast.message('ميزة طلب التعديل قيد التطوير')}
                  className="flex-1 flex items-center justify-center gap-2 border border-amber-400 text-amber-600 hover:bg-amber-50 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Edit3 className="w-4 h-4" /> طلب تعديل
                </button>
              </div>
            )}
          </div>
        )}
      </QualityDrawer>
    </div>
  )
}

