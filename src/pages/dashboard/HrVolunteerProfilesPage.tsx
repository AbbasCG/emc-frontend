import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  CheckCircle2, Clock, Copy, FileText, Loader2, RefreshCw, Search, Users, XCircle,
} from 'lucide-react'
import toast from '@/lib/toast'
import { getApiErrorMessage } from '@/api/apiErrors'
import { useAuth } from '@/contexts/AuthContext'
import HrVolunteerProfileDetailModal from '@/components/hr/HrVolunteerProfileDetailModal'
import {
  fetchHrVolunteerProfileFilterOptions,
  fetchHrVolunteerProfiles,
  type HrVolunteerProfileStatistics,
} from '@/api/hrVolunteerProfilesApi'
import type { VolunteerHrProfile, VolunteerHrProfileStatus } from '@/api/volunteerHrProfileApi'
import { formatDate } from '@/utils/dateTime'

const STATUS_CFG: Record<VolunteerHrProfileStatus, { label: string; badge: string; icon: typeof Clock }> = {
  draft:        { label: 'مسودة',       badge: 'bg-slate-100 text-slate-600 border-slate-200', icon: FileText },
  submitted:    { label: 'مُرسل',        badge: 'bg-amber-50 text-amber-700 border-amber-200',  icon: Clock },
  under_review: { label: 'قيد المراجعة', badge: 'bg-blue-50 text-blue-700 border-blue-200',     icon: Clock },
  approved:     { label: 'مقبول',        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected:     { label: 'مرفوض',        badge: 'bg-red-50 text-red-700 border-red-200',        icon: XCircle },
  archived:     { label: 'مؤرشف',        badge: 'bg-slate-100 text-slate-500 border-slate-200', icon: FileText },
}

function StatusBadge({ status }: { status: VolunteerHrProfileStatus }) {
  const cfg = STATUS_CFG[status]
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${cfg.badge}`}>{cfg.label}</span>
}

const HR_COPY_LINK_ROLES = ['hr_manager', 'admin', 'super_admin', 'tech_admin']

/** Copies the volunteer HR form's absolute URL — origin resolved at click time, never hardcoded. */
function CopyVolunteerFormLinkButton() {
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)

  async function handleCopy() {
    const url = `${window.location.origin}/dashboard/volunteer/hr-profile`
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(url)
      toast.success('تم نسخ رابط نموذج المتطوع')
    } catch {
      toast.error('تعذر نسخ الرابط، يمكنك نسخه يدوياً')
      setFallbackUrl(url)
    }
  }

  return (
    <>
      <button
        onClick={() => void handleCopy()}
        className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2.5 text-xs font-black text-white hover:bg-white/25"
      >
        <Copy size={14} /> نسخ رابط نموذج المتطوع
      </button>
      {fallbackUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFallbackUrl(null)}>
          <div dir="rtl" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <p className="mb-2 text-xs font-black text-deepBlue">رابط نموذج المتطوع</p>
            <input
              readOnly
              value={fallbackUrl}
              dir="ltr"
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-deepBlue"
            />
            <button onClick={() => setFallbackUrl(null)} className="mt-3 w-full rounded-xl bg-customBlue py-2 text-xs font-black text-white">
              إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default function HrVolunteerProfilesPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const canCopyFormLink = !!user?.role && HR_COPY_LINK_ROLES.includes(user.role)

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<VolunteerHrProfile[]>([])
  const [stats, setStats] = useState<HrVolunteerProfileStatistics | null>(null)
  const [departments, setDepartments] = useState<{ id: number; name_ar: string }[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<VolunteerHrProfileStatus | ''>('')
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null)

  // Every setState here happens after the await — safe to invoke from the
  // effect below (docs/04-references/effect-patterns.md, P1).
  const load = useCallback(async () => {
    try {
      const res = await fetchHrVolunteerProfiles({
        page, search: search || undefined, status: status || undefined,
        department_id: departmentId || undefined, per_page: 20,
      })
      setRows(res.data)
      setStats(res.statistics)
      setMeta(res.meta)
    } catch (err) {
      toast.error(getApiErrorMessage(err) || 'تعذر تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }, [page, search, status, departmentId])

  // Manual refresh (header button / modal onChanged) — event-handler context,
  // so the synchronous loading flip is allowed and required here.
  const refresh = useCallback(() => {
    setLoading(true)
    void load()
  }, [load])

  // Filters/page changed → show the loader again before the refetch runs.
  // Render-adjust pattern (effect-patterns.md, P2) — no setState in the effect.
  const [seenQuery, setSeenQuery] = useState({ page, search, status, departmentId })
  if (seenQuery.page !== page || seenQuery.search !== search || seenQuery.status !== status || seenQuery.departmentId !== departmentId) {
    setSeenQuery({ page, search, status, departmentId })
    setLoading(true)
  }

  useEffect(() => {
    void (async () => { await load() })()
  }, [load])
  useEffect(() => { fetchHrVolunteerProfileFilterOptions().then((o) => setDepartments(o.departments.map((d) => ({ id: d.id, name_ar: d.name_ar })))).catch(() => {}) }, [])

  const selectedId = id ? Number(id) : null

  return (
    <div dir="rtl" className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-gradient-to-l from-customBlue to-deepBlue p-6 text-white shadow-lg">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black"><Users size={20} /> الملفات التعريفية للمتطوعين</h1>
          <p className="mt-1 text-sm font-semibold text-white/80">مراجعة وقبول طلبات انضمام المتطوعين إلى الفريق</p>
        </div>
        <div className="flex items-center gap-2">
          {canCopyFormLink && <CopyVolunteerFormLinkButton />}
          <button onClick={refresh} className="rounded-xl bg-white/15 p-2.5 hover:bg-white/25"><RefreshCw size={16} /></button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([
            ['total', 'الإجمالي', stats.total],
            ['submitted', 'مُرسل', stats.submitted],
            ['under_review', 'قيد المراجعة', stats.under_review],
            ['approved', 'مقبول', stats.approved],
            ['rejected', 'مرفوض', stats.rejected],
          ] as const).map(([key, label, value]) => (
            <button
              key={key}
              onClick={() => setStatus(key === 'total' ? '' : (key as VolunteerHrProfileStatus))}
              className={`rounded-xl border p-3 text-right transition ${status === key ? 'border-customBlue bg-customBlue/5' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
            >
              <p className="text-lg font-black text-deepBlue">{value}</p>
              <p className="text-[10px] font-bold text-slate-500">{label}</p>
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-52">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث بالاسم أو البريد أو الهاتف..."
            className="w-full rounded-xl border border-slate-200 py-2 pr-9 pl-3 text-xs font-semibold outline-none focus:border-customBlue"
          />
        </div>
        <select
          value={departmentId}
          onChange={(e) => { setDepartmentId(e.target.value ? Number(e.target.value) : ''); setPage(1) }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
        >
          <option value="">كل الأقسام</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name_ar}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-customBlue" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm font-semibold text-slate-400">
          {search || status || departmentId ? 'لا توجد نتائج مطابقة للفلاتر' : 'لا توجد طلبات متطوعين حالياً'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">الاسم</th>
                <th className="px-4 py-3">القسم</th>
                <th className="px-4 py-3">المسمى الوظيفي</th>
                <th className="px-4 py-3">تاريخ الانضمام</th>
                <th className="px-4 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/dashboard/hr/volunteers/${r.id}`)} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-deepBlue">{r.full_name}<br /><span className="text-[10px] font-semibold text-slate-400">{r.email}</span></td>
                  <td className="px-4 py-3 font-semibold text-slate-600">{r.department?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-600">{r.job_title}</td>
                  <td className="px-4 py-3 font-semibold text-slate-600">{r.join_date ? formatDate(r.join_date) : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40">السابق</button>
          <span className="text-xs font-bold text-slate-500">{meta.current_page} / {meta.last_page}</span>
          <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40">التالي</button>
        </div>
      )}

      {selectedId && (
        <HrVolunteerProfileDetailModal
          id={selectedId}
          onClose={() => navigate('/dashboard/hr/volunteers')}
          onChanged={refresh}
        />
      )}
    </div>
  )
}
