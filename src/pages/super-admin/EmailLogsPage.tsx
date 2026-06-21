import { useState, useEffect, useCallback } from 'react'
import { Mail, CheckCircle, XCircle, Clock, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  fetchEmailLogs,
  fetchEmailLogStats,
  retryEmailLog,
  type EmailLog,
  type EmailLogStats,
  type EmailLogMeta,
} from '@/api/emailAdminApi'

const TYPE_LABELS: Record<string, string> = {
  welcome: 'ترحيب',
  course_enrollment: 'تسجيل دورة',
  learning_path_enrollment: 'تسجيل مسار',
  course_completion: 'إتمام دورة',
  learning_path_completion: 'إتمام مسار',
  assignment_submitted: 'تسليم واجب',
  assignment_graded: 'تقييم واجب',
  session_reminder: 'تذكير جلسة',
  certificate_issued: 'إصدار شهادة',
  admin_new_registration: 'تسجيل جديد (إدارة)',
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  sent:    { label: 'مُرسَل',   bg: 'bg-green-100',  text: 'text-green-700' },
  failed:  { label: 'فاشل',    bg: 'bg-red-100',    text: 'text-red-700' },
  pending: { label: 'انتظار',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-[#0C2A4B]">{value}</p>
        <p className="text-xs text-slate-400 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return d
  }
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [stats, setStats] = useState<EmailLogStats | null>(null)
  const [meta, setMeta] = useState<EmailLogMeta>({ total: 0, current_page: 1, last_page: 1, per_page: 25 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [retryingId, setRetryingId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetchEmailLogs({ status: statusFilter || undefined, type: typeFilter || undefined, page }),
        fetchEmailLogStats(),
      ])
      setLogs(logsRes.data)
      setMeta(logsRes.meta)
      setStats(statsRes)
    } catch {
      showToast('error', 'فشل تحميل السجلات')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => { void load(1) }, [load])

  const handleRetry = async (id: number) => {
    setRetryingId(id)
    try {
      await retryEmailLog(id)
      showToast('success', 'تمت إعادة جدولة الرسالة')
      void load(meta.current_page)
    } catch {
      showToast('error', 'فشلت إعادة الإرسال')
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-6" dir="rtl">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-bold text-white ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#0C2A4B] flex items-center justify-center">
          <Mail className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#0C2A4B]">سجل الرسائل الإلكترونية</h1>
          <p className="text-xs text-slate-500 mt-0.5">مراقبة الرسائل المُرسلة والفاشلة</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<Mail className="h-5 w-5 text-white" />}
          label="إجمالي الرسائل"
          value={stats?.total ?? '—'}
          color="bg-[#0C2A4B]"
        />
        <KpiCard
          icon={<CheckCircle className="h-5 w-5 text-white" />}
          label="مُرسلة اليوم"
          value={stats?.sent_today ?? '—'}
          color="bg-green-500"
        />
        <KpiCard
          icon={<XCircle className="h-5 w-5 text-white" />}
          label="فاشلة اليوم"
          value={stats?.failed_today ?? '—'}
          color="bg-red-500"
        />
        <KpiCard
          icon={<Clock className="h-5 w-5 text-white" />}
          label="في الانتظار"
          value={stats?.pending ?? '—'}
          color="bg-yellow-500"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4 flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#0C2A4B] focus:outline-none focus:ring-2 focus:ring-[#0077B6]/40"
        >
          <option value="">كل الحالات</option>
          <option value="sent">مُرسَل</option>
          <option value="failed">فاشل</option>
          <option value="pending">انتظار</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#0C2A4B] focus:outline-none focus:ring-2 focus:ring-[#0077B6]/40"
        >
          <option value="">كل الأنواع</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={() => void load(1)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </button>
        <span className="text-xs text-slate-400 mr-auto">
          إجمالي: <strong className="text-[#0C2A4B]">{meta.total}</strong> رسالة
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">جاري التحميل...</div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">لا توجد رسائل</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-right px-4 py-3 text-[11px] font-black text-slate-500 uppercase">المستلم</th>
                  <th className="text-right px-4 py-3 text-[11px] font-black text-slate-500 uppercase">النوع</th>
                  <th className="text-right px-4 py-3 text-[11px] font-black text-slate-500 uppercase">الموضوع</th>
                  <th className="text-right px-4 py-3 text-[11px] font-black text-slate-500 uppercase">الحالة</th>
                  <th className="text-right px-4 py-3 text-[11px] font-black text-slate-500 uppercase">التوقيت</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map(log => {
                  const sc = STATUS_CONFIG[log.status] ?? { label: log.status, bg: 'bg-slate-100', text: 'text-slate-600' }
                  const timestamp = log.sent_at ?? log.failed_at ?? log.queued_at ?? log.created_at
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 max-w-[160px] truncate">{log.recipient}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{TYPE_LABELS[log.type] ?? log.type}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate">{log.subject ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(timestamp)}</td>
                      <td className="px-4 py-3 text-right">
                        {log.status === 'failed' && (
                          <button
                            onClick={() => void handleRetry(log.id)}
                            disabled={retryingId === log.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold hover:bg-red-100 disabled:opacity-50 transition"
                          >
                            <RefreshCw className={`h-3 w-3 ${retryingId === log.id ? 'animate-spin' : ''}`} />
                            إعادة
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
            <span>صفحة {meta.current_page} من {meta.last_page}</span>
            <div className="flex gap-1">
              <button
                disabled={meta.current_page <= 1}
                onClick={() => void load(meta.current_page - 1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                disabled={meta.current_page >= meta.last_page}
                onClick={() => void load(meta.current_page + 1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
