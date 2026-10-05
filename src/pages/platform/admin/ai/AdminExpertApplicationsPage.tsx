import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircle, ArrowRight, CheckCircle, ChevronLeft, ChevronRight, Clock, Eye, RefreshCw, Search, X, XCircle } from 'lucide-react'
import toast from '@/lib/toast'
import { usePageAccess } from '@/contexts/PageAccessContext'
import {
  EXPERT_STATUS_LABELS,
  EXPERT_STATUS_TRANSITIONS,
  fetchExpertApplication,
  fetchExpertApplications,
  updateExpertApplicationStatus,
  type ExpertApplicationDetail,
  type ExpertApplicationListItem,
  type ExpertApplicationStatus,
} from '@/api/expertApplicationsAdminApi'

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

const ACTION_LABELS: Record<ExpertApplicationStatus, string> = {
  new: '',
  under_review: 'بدء المراجعة',
  approved: 'قبول الطلب',
  rejected: 'رفض الطلب',
}

/** Arabic labels for the submitted fields, in form order. Internal columns are omitted. */
const FIELD_LABELS: Array<[string, string]> = [
  ['full_name', 'الاسم الكامل'], ['email', 'البريد الإلكتروني'], ['whatsapp_number', 'رقم واتساب'],
  ['country', 'الدولة'], ['city', 'المدينة'], ['linkedin_url', 'لينكدإن'],
  ['primary_specialty', 'التخصص الأساسي'], ['academic_qualification', 'المؤهل العلمي'],
  ['current_employer', 'جهة العمل الحالية'], ['job_title', 'المسمى الوظيفي'],
  ['years_of_experience', 'سنوات الخبرة'], ['expertise_fields', 'مجالات الخبرة'],
  ['expertise_level', 'مستوى الخبرة'], ['tools_technologies', 'الأدوات والتقنيات'],
  ['contribution_roles', 'أدوار المساهمة'],
  ['trainer_fields', 'مجالات التدريب'], ['trainer_program_types', 'أنواع البرامج'],
  ['trainer_target_audiences', 'الفئات المستهدفة'], ['trainer_delivery_mode', 'نمط التقديم'],
  ['trainer_has_experience', 'خبرة تدريبية سابقة'], ['trainer_years_experience', 'سنوات التدريب'],
  ['trainer_previous_courses', 'دورات سابقة'], ['trainer_content_readiness', 'جاهزية المحتوى'],
  ['expert_specialty_areas', 'مجالات التخصص'], ['expert_contribution_types', 'أنواع مساهمة الخبير'],
  ['expert_achievements', 'الإنجازات'], ['expert_has_certifications', 'لديه شهادات'],
  ['expert_certifications_details', 'تفاصيل الشهادات'],
  ['consultant_fields', 'مجالات الاستشارة'], ['consultant_types', 'أنواع الاستشارات'],
  ['consultant_previous_clients', 'عملاء سابقون'], ['consultant_target_clients', 'العملاء المستهدفون'],
  ['events_types', 'أنواع الفعاليات'], ['events_contribution_areas', 'مجالات المساهمة في الفعاليات'],
  ['events_previous_events', 'فعاليات سابقة'],
  ['mentor_fields', 'مجالات الإرشاد'], ['mentor_target_audiences', 'فئات الإرشاد'],
  ['mentor_session_types', 'أنواع جلسات الإرشاد'],
  ['evaluator_fields', 'مجالات التقييم'], ['evaluator_types', 'أنواع التقييم'],
  ['participant_project_types', 'أنواع المشاريع'], ['participant_contribution_method', 'طريقة المشاركة'],
  ['availability_times', 'أوقات التوفر'], ['availability_level', 'مستوى التوفر'],
  ['collaboration_preferences', 'تفضيلات التعاون'], ['bio', 'نبذة'], ['unique_value', 'القيمة المضافة'],
  ['agree_to_contact', 'يوافق على التواصل'], ['agree_to_store_data', 'يوافق على حفظ البيانات'],
]

function isKnownStatus(s: string): s is ExpertApplicationStatus {
  return s in EXPERT_STATUS_LABELS
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<ExpertApplicationStatus, { cls: string; Icon: typeof Clock }> = {
    new: { cls: 'bg-blue-50 text-blue-600', Icon: Clock },
    under_review: { cls: 'bg-orange-50 text-orange-600', Icon: AlertCircle },
    approved: { cls: 'bg-emerald-50 text-emerald-600', Icon: CheckCircle },
    rejected: { cls: 'bg-red-50 text-red-600', Icon: XCircle },
  }
  if (!isKnownStatus(status)) {
    return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{status}</span>
  }
  const { cls, Icon } = styles[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>
      <Icon size={12} aria-hidden /> {EXPERT_STATUS_LABELS[status]}
    </span>
  )
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا'
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    return (
      <span className="flex flex-wrap gap-1.5">
        {value.map((v, i) => (
          <span key={i} className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{String(v)}</span>
        ))}
      </span>
    )
  }
  return String(value)
}

function DetailDialog({
  id,
  onClose,
  onChanged,
}: {
  id: number
  onClose: () => void
  onChanged: () => void
}) {
  const [app, setApp] = useState<ExpertApplicationDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState<ExpertApplicationStatus | null>(null)

  useEffect(() => {
    let alive = true
    fetchExpertApplication(id)
      .then((a) => { if (alive) setApp(a) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [id])

  async function move(to: ExpertApplicationStatus) {
    if ((to === 'approved' || to === 'rejected') && !window.confirm(`${ACTION_LABELS[to]}؟ هذا القرار نهائي.`)) return
    setBusy(to)
    try {
      const updated = await updateExpertApplicationStatus(id, to)
      setApp((prev) => (prev ? { ...prev, ...updated } : updated))
      toast.success('تم تحديث حالة الطلب')
      onChanged()
    } catch {
      toast.error('تعذر تحديث حالة الطلب')
    } finally {
      setBusy(null)
    }
  }

  const status = app?.status ?? ''
  const nextStates = isKnownStatus(status) ? EXPERT_STATUS_TRANSITIONS[status] : []

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-deepBlue/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="تفاصيل الطلب">
      <div dir="rtl" className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-black text-deepBlue">{app?.full_name ?? 'تفاصيل الطلب'}</h2>
            {app && <div className="mt-1"><StatusBadge status={app.status} /></div>}
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {failed ? (
            <p role="alert" className="text-sm font-bold text-red-600">تعذر تحميل تفاصيل الطلب.</p>
          ) : !app ? (
            <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-customBlue border-t-transparent" /></div>
          ) : (
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {FIELD_LABELS.map(([key, label]) => {
                const rendered = renderValue(app[key])
                if (rendered === null) return null
                return (
                  <div key={key} className="min-w-0">
                    <dt className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-ink-600">{rendered}</dd>
                  </div>
                )
              })}
            </dl>
          )}
        </div>

        {app && nextStates.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-4">
            {nextStates.map((to) => (
              <button
                key={to}
                disabled={busy !== null}
                onClick={() => void move(to)}
                className={`rounded-xl px-4 py-2 text-sm font-extrabold transition disabled:opacity-60 ${
                  to === 'approved' ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : to === 'rejected' ? 'bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50'
                  : 'bg-white text-deepBlue ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {busy === to ? 'جارٍ الحفظ…' : ACTION_LABELS[to]}
              </button>
            ))}
          </div>
        )}
        {app && nextStates.length === 0 && (
          <p className="border-t border-slate-100 p-4 text-xs font-bold text-slate-400">تم البت في هذا الطلب — القرار نهائي.</p>
        )}
      </div>
    </div>
  )
}

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
  const [openId, setOpenId] = useState<number | null>(null)

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
            <thead className="bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
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
                    <td className="px-6 py-4"><StatusBadge status={app.status} /></td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => setOpenId(app.id)}
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

      {openId !== null && <DetailDialog id={openId} onClose={() => setOpenId(null)} onChanged={() => void load()} />}
    </div>
  )
}
