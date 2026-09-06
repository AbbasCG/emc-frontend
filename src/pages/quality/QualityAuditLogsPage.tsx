import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, ScrollText, ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchQualityAuditLogs } from '@/api/qualityApi'
import toast from '@/lib/toast'
import { QualityDrawer } from '@/components/quality/QualityDrawer'

interface QualityAuditLogUser {
  name?: string | null
}

interface QualityAuditLog {
  id?: number
  action?: string | null
  auditable_type?: string | null
  model_type?: string | null
  user?: QualityAuditLogUser | null
  user_name?: string | null
  ip_address?: string | null
  user_agent?: string | null
  old_values?: unknown
  old_value?: unknown
  new_values?: unknown
  new_value?: unknown
  created_at?: string | null
}

interface AuditLogsMeta {
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

function actionBadgeClass(action: string): string {
  const a = action?.toLowerCase() ?? ''
  if (a.includes('create') || a === 'created') return 'bg-blue-100 text-blue-700'
  if (a.includes('update') || a === 'updated') return 'bg-amber-100 text-amber-700'
  if (a.includes('delete') || a === 'deleted') return 'bg-rose-100 text-rose-700'
  if (a.includes('approve') || a === 'approved') return 'bg-emerald-100 text-emerald-700'
  if (a.includes('reject') || a === 'rejected') return 'bg-rose-100 text-rose-700'
  if (a.includes('login')) return 'bg-green-100 text-green-700'
  return 'bg-slate-100 text-slate-600'
}

function Skeleton() {
  return (
    <div className="bg-white rounded-xl border border-deepBlue/[0.07] p-4 flex items-center gap-4 animate-pulse">
      <div className="h-5 w-16 bg-slate-200 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-slate-200 rounded w-1/3" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
      </div>
      <div className="h-3 w-20 bg-slate-100 rounded" />
    </div>
  )
}

function JsonDiff({ label, data, colorClass }: { label: string; data: unknown; colorClass: string }) {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) return null
  return (
    <div className={`rounded-xl p-3 ${colorClass}`}>
      <p className="text-xs font-bold mb-2 opacity-70">{label}</p>
      <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

export default function QualityAuditLogsPage() {
  const [logs, setLogs] = useState<QualityAuditLog[]>([])
  const [meta, setMeta] = useState<AuditLogsMeta>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<QualityAuditLog | null>(null)

  // Re-arm the loading state during render when the query changes (react.dev
  // "adjusting state when a prop changes") instead of from the effect below.
  const [seenQuery, setSeenQuery] = useState({ page, search, action, from, to })
  if (
    seenQuery.page !== page ||
    seenQuery.search !== search ||
    seenQuery.action !== action ||
    seenQuery.from !== from ||
    seenQuery.to !== to
  ) {
    setSeenQuery({ page, search, action, from, to })
    setLoading(true)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const params: Record<string, string> = { page: String(page) }
        if (search) params.search = search
        if (action) params.action = action
        if (from) params.from = from
        if (to) params.to = to
        const res = await fetchQualityAuditLogs(params)
        if (!alive) return
        setLogs(res.data ?? [])
        setMeta(res.meta ?? {})
      } catch {
        if (alive) toast.error('تعذّر تحميل سجلات التدقيق')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [page, search, action, from, to])

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      <div className="mb-6">
        <h1 className="text-xl font-black text-deepBlue">سجلات التدقيق</h1>
        <p className="text-sm text-slate-500 mt-1">سجل شامل لجميع العمليات والتغييرات</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-deepBlue/[0.07] shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="بحث بالإجراء، المستخدم، النوع..."
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <select value={action} onChange={e => { setAction(e.target.value); setPage(1) }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
            <option value="">كل الإجراءات</option>
            <option value="created">إنشاء</option>
            <option value="updated">تحديث</option>
            <option value="deleted">حذف</option>
            <option value="approved">قبول</option>
            <option value="rejected">رفض</option>
          </select>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
        </div>
      </div>

      {/* Log List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <ScrollText className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-base">لا توجد سجلات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => (
            <motion.div key={log.id ?? i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelected(log)}
              className="bg-white rounded-xl border border-deepBlue/[0.07] shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${actionBadgeClass(log.action ?? '')}`}>
                {log.action ?? '—'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-deepBlue truncate">{log.auditable_type ?? log.model_type ?? '—'}</p>
                <p className="text-xs text-slate-400">{log.user?.name ?? log.user_name ?? '—'}{log.ip_address ? ` · ${log.ip_address}` : ''}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0">
                {log.created_at ? new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
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
      <QualityDrawer open={!!selected} onClose={() => setSelected(null)} title="تفاصيل السجل">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${actionBadgeClass(selected.action ?? '')}`}>{selected.action ?? '—'}</span>
              <span className="text-sm text-slate-500">{selected.auditable_type ?? selected.model_type ?? ''}</span>
            </div>
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">معلومات المستخدم</h3>
              <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
                <p><span className="text-slate-400">المستخدم: </span>{selected.user?.name ?? selected.user_name ?? '—'}</p>
                {selected.ip_address && <p><span className="text-slate-400">عنوان IP: </span>{selected.ip_address}</p>}
                {selected.user_agent && <p className="truncate"><span className="text-slate-400">المتصفح: </span><span className="text-xs">{selected.user_agent}</span></p>}
                {selected.created_at && <p><span className="text-slate-400">التوقيت: </span>{new Date(selected.created_at).toLocaleString('en-US')}</p>}
              </div>
            </section>
            <JsonDiff label="القيم القديمة" data={selected.old_values ?? selected.old_value} colorClass="bg-rose-50 text-rose-800" />
            <JsonDiff label="القيم الجديدة" data={selected.new_values ?? selected.new_value} colorClass="bg-emerald-50 text-emerald-800" />
          </div>
        )}
      </QualityDrawer>
    </div>
  )
}

