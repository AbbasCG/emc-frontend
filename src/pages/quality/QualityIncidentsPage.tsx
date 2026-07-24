import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Plus, ShieldAlert, ChevronLeft, ChevronRight, Calendar,
} from 'lucide-react'
import { fetchQualityIncidents, createQualityIncident, updateQualityIncident } from '@/api/qualityApi'
import toast from '@/lib/toast'
import { QualityDrawer } from '@/components/quality/QualityDrawer'
import { QualityModal } from '@/components/quality/QualityModal'

interface IncidentPerson {
  name?: string | null
}

interface QualityIncident {
  id: number
  title?: string | null
  description?: string | null
  severity?: string
  priority?: string
  status?: string
  category?: string | null
  evidence?: string | null
  resolution?: string | null
  due_date?: string | null
  created_at?: string | null
  reporter?: IncidentPerson | null
  assignee?: IncidentPerson | null
}

interface IncidentsMeta {
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

interface IncidentStats {
  open?: number
  in_progress?: number
  resolved?: number
  critical?: number
}

const severityColors: Record<string, string> = {
  critical: 'bg-rose-100 text-rose-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}
const severityLabels: Record<string, string> = { critical: 'حرج', high: 'عالٍ', medium: 'متوسط', low: 'منخفض' }

const priorityColors: Record<string, string> = {
  urgent: 'bg-rose-100 text-rose-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-slate-100 text-slate-600',
}
const priorityLabels: Record<string, string> = { urgent: 'عاجل', high: 'عالٍ', medium: 'متوسط', low: 'منخفض' }

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-600',
}
const statusLabels: Record<string, string> = { open: 'مفتوح', in_progress: 'جارٍ', resolved: 'محلول', closed: 'مغلق' }

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>{label}</span>
}

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl border border-deepBlue/[0.07] p-5 space-y-3 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-3/4" />
      <div className="h-3 bg-slate-100 rounded w-1/2" />
      <div className="flex gap-2 mt-2">
        <div className="h-5 w-14 bg-slate-200 rounded-full" />
        <div className="h-5 w-14 bg-slate-200 rounded-full" />
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  title: '',
  description: '',
  severity: 'medium',
  priority: 'medium',
  category: '',
  due_date: '',
  assignee_id: '',
}

export default function QualityIncidentsPage() {
  const [incidents, setIncidents] = useState<QualityIncident[]>([])
  const [meta, setMeta] = useState<IncidentsMeta>({})
  const [stats, setStats] = useState<IncidentStats>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const [priority, setPriority] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<QualityIncident | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page) }
      if (search) params.search = search
      if (status) params.status = status
      if (severity) params.severity = severity
      if (priority) params.priority = priority
      const res = await fetchQualityIncidents(params)
      setIncidents(res.data ?? [])
      setMeta(res.meta ?? {})
      setStats(res.stats ?? {})
    } catch {
      toast.error('تعذّر تحميل الحوادث')
    } finally {
      setLoading(false)
    }
  }, [page, search, status, severity, priority])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { ...form }
      if (form.assignee_id) body.assignee_id = Number(form.assignee_id)
      else delete body.assignee_id
      await createQualityIncident(body)
      toast.success('تمّ إنشاء الحادثة')
      setShowCreate(false)
      setForm({ ...EMPTY_FORM })
      load()
    } catch {
      toast.error('فشل إنشاء الحادثة')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    setUpdatingStatus(true)
    try {
      await updateQualityIncident(id, { status: newStatus })
      toast.success('تمّ تحديث الحالة')
      setSelected(prev => prev ? { ...prev, status: newStatus } : prev)
      load()
    } catch {
      toast.error('فشل تحديث الحالة')
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'مفتوحة', value: stats.open ?? 0, color: 'border-blue-500' },
          { label: 'جارية', value: stats.in_progress ?? 0, color: 'border-amber-500' },
          { label: 'محلولة', value: stats.resolved ?? 0, color: 'border-emerald-500' },
          { label: 'حرجة', value: stats.critical ?? 0, color: 'border-rose-600' },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white rounded-2xl border border-deepBlue/[0.07] shadow-sm border-t-[3px] ${kpi.color} p-4`}>
            <p className="text-2xl font-black text-deepBlue">{Number(kpi.value).toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث..." className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="">كل الحالات</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={severity} onChange={e => { setSeverity(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="">كل الخطورة</option>
          {Object.entries(severityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={priority} onChange={e => { setPriority(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="">كل الأولوية</option>
          {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-customBlue hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> إنشاء حادثة
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <ShieldAlert className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-base">لا توجد حوادث</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {incidents.map(inc => (
            <motion.div key={inc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelected(inc)}
              className="bg-white rounded-2xl border border-deepBlue/[0.07] shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow">
              <h3 className="font-bold text-deepBlue text-sm mb-2 leading-snug">{inc.title ?? '—'}</h3>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Badge label={severityLabels[inc.severity ?? ''] ?? inc.severity ?? '—'} colorClass={severityColors[inc.severity ?? ''] ?? 'bg-slate-100 text-slate-600'} />
                <Badge label={priorityLabels[inc.priority ?? ''] ?? inc.priority ?? '—'} colorClass={priorityColors[inc.priority ?? ''] ?? 'bg-slate-100 text-slate-600'} />
                <Badge label={statusLabels[inc.status ?? ''] ?? inc.status ?? '—'} colorClass={statusColors[inc.status ?? ''] ?? 'bg-slate-100 text-slate-600'} />
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                {inc.reporter?.name && <p>المبلِّغ: {inc.reporter.name}</p>}
                {inc.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(inc.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(meta.last_page ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-xl border border-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          <span className="text-sm text-slate-600">{page} / {meta.last_page}</span>
          <button onClick={() => setPage(p => Math.min(meta.last_page ?? 1, p + 1))} disabled={page === meta.last_page} className="p-2 rounded-xl border border-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
        </div>
      )}

      {/* Detail Drawer */}
      <QualityDrawer open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? 'تفاصيل الحادثة'}>
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge label={severityLabels[selected.severity ?? ''] ?? selected.severity ?? ''} colorClass={severityColors[selected.severity ?? ''] ?? 'bg-slate-100 text-slate-600'} />
              <Badge label={priorityLabels[selected.priority ?? ''] ?? selected.priority ?? ''} colorClass={priorityColors[selected.priority ?? ''] ?? 'bg-slate-100 text-slate-600'} />
              <Badge label={statusLabels[selected.status ?? ''] ?? selected.status ?? ''} colorClass={statusColors[selected.status ?? ''] ?? 'bg-slate-100 text-slate-600'} />
            </div>
            {selected.description && (
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">الوصف</h3>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{selected.description}</p>
              </section>
            )}
            {selected.evidence && (
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">الأدلة</h3>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{selected.evidence}</p>
              </section>
            )}
            {selected.resolution && (
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">الحل</h3>
                <p className="text-sm text-slate-600 bg-emerald-50 rounded-xl p-3">{selected.resolution}</p>
              </section>
            )}
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">التفاصيل</h3>
              <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
                {selected.reporter?.name && <p><span className="text-slate-400">المبلِّغ: </span>{selected.reporter.name}</p>}
                {selected.assignee?.name && <p><span className="text-slate-400">المسند إليه: </span>{selected.assignee.name}</p>}
                {selected.category && <p><span className="text-slate-400">الفئة: </span>{selected.category}</p>}
                {selected.due_date && <p><span className="text-slate-400">تاريخ الاستحقاق: </span>{new Date(selected.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>}
                {selected.created_at && <p><span className="text-slate-400">تاريخ الإنشاء: </span>{new Date(selected.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>}
              </div>
            </section>
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">تحديث الحالة</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusLabels).map(([k, v]) => (
                  <button key={k}
                    onClick={() => handleStatusUpdate(selected.id, k)}
                    disabled={updatingStatus || selected.status === k}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${selected.status === k ? (statusColors[k] ?? 'bg-slate-100 text-slate-600') + ' ring-2 ring-offset-1 ring-current' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </QualityDrawer>

      {/* Create Modal */}
      <QualityModal open={showCreate} onClose={() => setShowCreate(false)} title="إنشاء حادثة جديدة">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">العنوان *</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">الوصف</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">الخطورة</label>
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                {Object.entries(severityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">الأولوية</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">الفئة</label>
              <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">تاريخ الاستحقاق</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">رقم المسند إليه</label>
            <input type="number" value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={submitting}
              className="flex-1 bg-customBlue hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
              {submitting ? 'جاري الإنشاء...' : 'إنشاء الحادثة'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-4 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              إلغاء
            </button>
          </div>
        </form>
      </QualityModal>
    </div>
  )
}
