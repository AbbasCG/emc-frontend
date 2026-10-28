import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ChevronLeft, ChevronRight, Eye, RefreshCw, Search } from 'lucide-react'
import toast from '@/lib/toast'
import { usePageAccess } from '@/contexts/PageAccessContext'
import { EXPERT_STATUS_LABELS, fetchExpertApplications, type ExpertApplicationListItem, type ExpertApplicationStatus } from '@/api/expertApplicationsAdminApi'
import { useDetailParam } from '@/hooks/useDetailParam'
import ExpertApplicationDetailModal, { ExpertStatusBadge } from '@/components/expert/ExpertApplicationDetailModal'

/**
 * طلبات انضمام المدربين والخبراء — مراجعة الطلبات القادمة من نموذج «انضم كخبير».
 * المسار: new → under_review → approved | rejected (القبول والرفض نهائيان).
 * الصلاحية تُفرض في الخادم؛ الواجهة تعرض فقط الانتقالات التي يسمح بها.
 */

const STATUS_TABS: Array<{ value: ExpertApplicationStatus | ''; label: string }> = [
  { value: '', label: 'الكل' },
  { value: 'new', label: EXPERT_STATUS_LABELS.new },
  { value: 'under_review', label: EXPERT_STATUS_LABELS.under_review },
  { value: 'approved', label: EXPERT_STATUS_LABELS.approved },
  { value: 'rejected', label: EXPERT_STATUS_LABELS.rejected },
]

export default function AdminExpertApplicationsPage() {
  const { canAccessPath } = usePageAccess()
  const [rows, setRows] = useState<ExpertApplicationListItem[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<ExpertApplicationStatus | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  // The open record lives in the URL (?view=<id>): Back closes the window, a refreshed or shared link reopens it.
  const detail = useDetailParam('view')
  const openId = detail.id

  // Debounce typing so every keystroke does not hit the API.
  useEffect(() => {
    const t = window.setTimeout(() => { setSearch(searchInput); setPage(1) }, 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetchExpertApplications({ page, search, status })
      setRows(res.data)
      setLastPage(res.last_page)
      setTotal(res.total)
    } catch {
      setFailed(true)
      toast.error('حدث خطأ أثناء جلب طلبات الخبراء')
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the loading flag must flip before the request starts, whenever its inputs change
    void load()
  }, [load])

  // The back link leads to the technical AI Command Center, which not every
  // reviewer may open (ai_manager cannot) — show it only when allowed.
  const showBack = canAccessPath('/dashboard/admin/ai') === true

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-4">
        {showBack && (
          <Link to="/dashboard/admin/ai" aria-label="العودة إلى مركز الذكاء الاصطناعي" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:bg-slate-50">
            <ArrowRight size={18} className="text-slate-500" />
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-black text-deepBlue">طلبات انضمام المدربين والخبراء</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">مراجعة طلبات الانضمام لمجتمع المدربين والخبراء واتخاذ القرار فيها.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ابحث بالاسم أو البريد أو التخصص..."
              aria-label="بحث في الطلبات"
              className="h-10 w-full rounded-xl bg-slate-50 pr-10 text-sm font-medium text-deepBlue outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-customBlue"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="تصفية حسب الحالة">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value || 'all'}
                role="tab"
                aria-selected={status === t.value}
                onClick={() => { setStatus(t.value); setPage(1) }}
                className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                  status === t.value ? 'bg-deepBlue text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-right text-sm">
            <thead className="bg-slate-50/50 text-xs font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4">مقدم الطلب</th>
                <th className="px-6 py-4">التخصص الأساسي</th>
                <th className="px-6 py-4">الدولة والمدينة</th>
                <th className="px-6 py-4">تاريخ التقديم</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center" aria-busy="true">
                    <div className="flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-customBlue border-t-transparent" /></div>
                  </td>
                </tr>
              ) : failed ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <p role="alert" className="text-sm font-bold text-red-600">تعذر تحميل الطلبات</p>
                    <button onClick={() => void load()} className="mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-deepBlue ring-1 ring-slate-200 hover:bg-slate-50">
                      <RefreshCw size={14} aria-hidden /> إعادة المحاولة
                    </button>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    {search || status ? 'لا توجد طلبات مطابقة للبحث أو التصفية.' : 'لا توجد طلبات انضمام حالياً.'}
                  </td>
                </tr>
              ) : (
                rows.map((app) => (
                  <tr key={app.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-deepBlue">{app.full_name}</div>
                      <div className="text-xs text-slate-500">{app.email}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{app.primary_specialty ?? '—'}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">{app.country ?? '—'}</div>
                      <div className="text-xs text-slate-500">{app.city ?? ''}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-500" dir="ltr">{app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB') : '—'}</td>
                    <td className="px-6 py-4"><ExpertStatusBadge status={app.status} /></td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => detail.open(app.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-customBlue shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                      >
                        <Eye size={14} aria-hidden /> عرض
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && !failed && total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs font-bold text-slate-500">
            <span>{total.toLocaleString('en-US')} طلب</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="الصفحة السابقة" className="rounded-lg p-1.5 ring-1 ring-slate-200 disabled:opacity-40"><ChevronRight size={14} /></button>
              <span>صفحة {page} من {lastPage}</span>
              <button disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} aria-label="الصفحة التالية" className="rounded-lg p-1.5 ring-1 ring-slate-200 disabled:opacity-40"><ChevronLeft size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {openId !== null && <ExpertApplicationDetailModal id={openId} onClose={detail.close} onChanged={() => void load()} />}
    </div>
  )
}
