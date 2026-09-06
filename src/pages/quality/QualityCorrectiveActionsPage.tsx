import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, Plus, TrendingUp, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { fetchCorrectiveActions, createCorrectiveAction, updateCorrectiveAction } from '@/api/qualityApi'
import toast from '@/lib/toast'
import { QualityDrawer } from '@/components/quality/QualityDrawer'
import { QualityModal } from '@/components/quality/QualityModal'

interface CorrectiveActionAssignee {
  name?: string | null
}

interface CorrectiveAction {
  id: number
  title?: string | null
  description?: string | null
  priority?: string
  status?: string
  progress?: number | null
  due_date?: string | null
  created_at?: string | null
  assignee?: CorrectiveActionAssignee | null
}

interface CorrectiveActionsMeta {
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

interface CorrectiveActionStats {
  open?: number
  in_progress?: number
  completed?: number
  overdue?: number
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-600',
}
const statusLabels: Record<string, string> = { open: 'مفتوح', in_progress: 'جارٍ', completed: 'مكتمل', cancelled: 'ملغى' }

const priorityColors: Record<string, string> = {
  urgent: 'bg-rose-100 text-rose-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-slate-100 text-slate-600',
}
const priorityLabels: Record<string, string> = { urgent: 'عاجل', high: 'عالٍ', medium: 'متوسط', low: 'منخفض' }

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>{label}</span>
}

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl border border-deepBlue/[0.07] p-5 space-y-3 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-3/4" />
      <div className="flex gap-2"><div className="h-5 w-14 bg-slate-200 rounded-full" /><div className="h-5 w-14 bg-slate-200 rounded-full" /></div>
      <div className="h-2 bg-slate-200 rounded-full" />
    </div>
  )
}

const EMPTY_FORM = { title: '', description: '', priority: 'medium', due_date: '', assignee_id: '', notes: '' }

interface CorrectiveActionsQuery {
  page: number
  search: string
  status: string
  priority: string
}

/** Pure I/O — kept outside the component so the mount effect and the imperative
 *  refresh share it without either having to call a state-mutating callback. */
function fetchActionsPage(query: CorrectiveActionsQuery) {
  const params: Record<string, string> = { page: String(query.page) }
  if (query.search) params.search = query.search
  if (query.status) params.status = query.status
  if (query.priority) params.priority = query.priority
  return fetchCorrectiveActions(params)
}

export default function QualityCorrectiveActionsPage() {
  const [actions, setActions] = useState<CorrectiveAction[]>([])
  const [meta, setMeta] = useState<CorrectiveActionsMeta>({})
  const [stats, setStats] = useState<CorrectiveActionStats>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<CorrectiveAction | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)
  const [progressVal, setProgressVal] = useState(0)
  const [drawerNotes, setDrawerNotes] = useState('')
  const [updating, setUpdating] = useState(false)

  // Re-arm the loading state during render when the query changes (react.dev
  // "adjusting state when a prop changes") instead of from the effect below.
  const [seenQuery, setSeenQuery] = useState({ page, search, status, priority })
  if (
    seenQuery.page !== page ||
    seenQuery.search !== search ||
    seenQuery.status !== status ||
    seenQuery.priority !== priority
  ) {
    setSeenQuery({ page, search, status, priority })
    setLoading(true)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await fetchActionsPage({ page, search, status, priority })
        if (!alive) return
        setActions(res.data ?? [])
        setMeta(res.meta ?? {})
        setStats(res.stats ?? {})
      } catch {
        if (alive) toast.error('تعذّر تحميل الإجراءات التصحيحية')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [page, search, status, priority])

  /** Imperative refresh from an event handler — outside any effect, so the
   *  synchronous loading flip is allowed. */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchActionsPage({ page, search, status, priority })
      setActions(res.data ?? [])
      setMeta(res.meta ?? {})
      setStats(res.stats ?? {})
    } catch {
      toast.error('تعذّر تحميل الإجراءات التصحيحية')
    } finally {
      setLoading(false)
    }
  }, [page, search, status, priority])

  // Hydrate the drawer's editable fields during render whenever the selected row
  // changes, instead of from an effect.
  const [seenSelected, setSeenSelected] = useState<CorrectiveAction | null>(null)
  if (seenSelected !== selected) {
    setSeenSelected(selected)
    if (selected) {
      setProgressVal(selected.progress ?? 0)
      setDrawerNotes('')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { ...form }
      if (form.assignee_id) body.assignee_id = Number(form.assignee_id)
      else delete body.assignee_id
      await createCorrectiveAction(body)
      toast.success('تمّ إنشاء الإجراء')
      setShowCreate(false)
      setForm({ ...EMPTY_FORM })
      load()
    } catch {
      toast.error('فشل إنشاء الإجراء')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!selected) return
    setUpdating(true)
    try {
      const body: Record<string, unknown> = { progress: progressVal }
      if (drawerNotes) body.notes = drawerNotes
      await updateCorrectiveAction(selected.id, body)
      toast.success('تمّ التحديث')
      setSelected(prev => prev ? { ...prev, progress: progressVal } : prev)
      load()
    } catch {
      toast.error('فشل التحديث')
    } finally {
      setUpdating(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selected) return
    setUpdating(true)
    try {
      await updateCorrectiveAction(selected.id, { status: newStatus })
      toast.success('تمّ تحديث الحالة')
      setSelected(prev => prev ? { ...prev, status: newStatus } : prev)
      load()
    } catch {
      toast.error('فشل تحديث الحالة')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'مفتوحة', value: stats.open ?? 0, color: 'border-blue-500' },
          { label: 'جارية', value: stats.in_progress ?? 0, color: 'border-amber-500' },
          { label: 'مكتملة', value: stats.completed ?? 0, color: 'border-emerald-500' },
          { label: 'متأخرة', value: stats.overdue ?? 0, color: 'border-rose-500' },
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
        <select value={priority} onChange={e => { setPriority(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="">كل الأولوية</option>
          {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-customBlue hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> إجراء تصحيحي
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)}</div>
      ) : actions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-base">لا توجد إجراءات تصحيحية</p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map(a => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelected(a)}
              className="bg-white rounded-2xl border border-deepBlue/[0.07] shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-deepBlue text-sm flex-1 ml-2">{a.title ?? '—'}</h3>
                <div className="flex gap-1.5">
                  <Badge label={priorityLabels[a.priority ?? ''] ?? a.priority ?? '—'} colorClass={priorityColors[a.priority ?? ''] ?? 'bg-slate-100 text-slate-600'} />
                  <Badge label={statusLabels[a.status ?? ''] ?? a.status ?? '—'} colorClass={statusColors[a.status ?? ''] ?? 'bg-slate-100 text-slate-600'} />
                </div>
              </div>
              <div className="text-xs text-slate-500 mb-3 space-y-0.5">
                {a.assignee?.name && <p>المسند إليه: {a.assignee.name}</p>}
                {a.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>التقدم</span>
                  <span>{a.progress ?? 0}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${a.progress ?? 0}%` }} />
                </div>
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
      <QualityDrawer open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? 'تفاصيل الإجراء'}>
        {selected && (
          <div className="space-y-5">
            <div className="flex gap-2 flex-wrap">
              <Badge label={priorityLabels[selected.priority ?? ''] ?? selected.priority ?? ''} colorClass={priorityColors[selected.priority ?? ''] ?? 'bg-slate-100 text-slate-600'} />
              <Badge label={statusLabels[selected.status ?? ''] ?? selected.status ?? ''} colorClass={statusColors[selected.status ?? ''] ?? 'bg-slate-100 text-slate-600'} />
            </div>

            {selected.description && (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{selected.description}</p>
            )}

            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">التفاصيل</h3>
              <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
                {selected.assignee?.name && <p><span className="text-slate-400">المسند إليه: </span>{selected.assignee.name}</p>}
                {selected.due_date && <p><span className="text-slate-400">الاستحقاق: </span>{new Date(selected.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>}
                {selected.created_at && <p><span className="text-slate-400">الإنشاء: </span>{new Date(selected.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">تحديث التقدم</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">التقدم الحالي</span>
                  <span className="font-bold text-emerald-600">{progressVal}%</span>
                </div>
                <input type="range" min="0" max="100" value={progressVal} onChange={e => setProgressVal(Number(e.target.value))}
                  className="w-full accent-emerald-500" />
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">تغيير الحالة</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusLabels).map(([k, v]) => (
                  <button key={k} onClick={() => handleStatusUpdate(k)} disabled={updating || selected.status === k}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${selected.status === k ? (statusColors[k] ?? 'bg-slate-100 text-slate-600') + ' ring-2 ring-offset-1 ring-current' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </section>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">ملاحظات</label>
              <textarea rows={3} value={drawerNotes} onChange={e => setDrawerNotes(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
            </div>

            <button onClick={handleUpdate} disabled={updating}
              className="w-full bg-customBlue hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
              {updating ? 'جاري التحديث...' : 'حفظ التغييرات'}
            </button>
          </div>
        )}
      </QualityDrawer>

      {/* Create Modal */}
      <QualityModal open={showCreate} onClose={() => setShowCreate(false)} title="إجراء تصحيحي جديد" width="max-w-md">
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
              <label className="block text-xs font-semibold text-slate-500 mb-1">الأولوية</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
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
              {submitting ? 'جاري الإنشاء...' : 'إنشاء الإجراء'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-4 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">إلغاء</button>
          </div>
        </form>
      </QualityModal>
    </div>
  )
}
