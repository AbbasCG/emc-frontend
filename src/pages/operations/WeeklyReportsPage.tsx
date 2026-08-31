import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlarmClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Star,
} from 'lucide-react'
import toast from 'react-hot-toast'
import CriteriaScoreGrid from '@/components/operations/CriteriaScoreGrid'
import DepartmentScopeField from '@/components/operations/DepartmentScopeField'
import { useDepartmentAccess } from '@/hooks/useDepartmentAccess'
import { averageScore, type CriteriaScores } from '@/data/evaluationCriteria'
import {
  fetchDepartmentMembers,
  fetchWeeklyReports,
  fetchWeeklyReportsDue,
  fetchWeeklyReportsSummary,
  submitWeeklyReport,
  type DepartmentMember,
  type WeeklyReport,
  type WeeklyReportsSummary,
} from '@/api/operationsReportsApi'

/**
 * التقارير الأسبوعية: كل قائد إدارة يسلِّم تقرير أداء إدارته كل أسبوع —
 * ماذا أنجزوا، ماذا سينجزون، العوائق والاحتياجات. لوحة إدارة قابلة للبحث
 * والتصفية، تتكيّف مع صلاحيات المستخدم (قائد إدارة واحدة مقابل ناظر شامل).
 *
 * لا يوجد عمود "حالة" في قاعدة البيانات — كل صف في الجدول هو تقرير مُسلَّم
 * فعليًا؛ الإدارات التي لم تسلِّم بعد ("قيد الإعداد"/"متأخر") لا صف قاعدة
 * بيانات لها، فتظهر فقط في لوحة التذكيرات وبطاقات الملخص المشتقة من الفرق
 * بين الإدارات المتوقعة والتقارير الفعلية — وليست حالة وهمية داخل الجدول.
 */

type DeptOption = { id: number; name: string }
type WeekFilter = 'all' | 'this_week' | 'last_week' | 'this_month'

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-deepBlue outline-none transition-colors focus:border-customBlue focus:ring-2 focus:ring-customBlue/15'

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function monthRange(iso: string): { from: string; to: string } {
  const d = new Date(iso + 'T00:00:00')
  const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { from, to }
}

export default function WeeklyReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const perPage = 10
  const [due, setDue] = useState<{
    week_start: string
    missing: DeptOption[]
    submitted: number
    deadline_passed: boolean
  } | null>(null)
  const [summary, setSummary] = useState<WeeklyReportsSummary | null>(null)
  const { manifest: departmentAccess, loading: departmentAccessLoading, soleDepartmentId } = useDepartmentAccess()
  // تسليم التقرير متاح فقط لمن يقود إدارة واحدة على الأقل (أو مدير عام) — وليس لكل عضو إدارة نشط.
  const canCreate =
    !departmentAccessLoading &&
    !!departmentAccess &&
    (departmentAccess.can_select_any_department || departmentAccess.allowed_departments.length > 0)
  const isSoleLeader = canCreate && !departmentAccess?.can_select_any_department && soleDepartmentId != null
  const myDeptName = isSoleLeader
    ? departmentAccess?.allowed_departments.find((d) => d.id === soleDepartmentId)?.name
    : undefined

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState<DepartmentMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState(false)
  const [evaluations, setEvaluations] = useState<Record<number, { included: boolean; scores: CriteriaScores }>>({})
  const [openMemberId, setOpenMemberId] = useState<number | null>(null)
  const [form, setForm] = useState({
    department_id: '' as number | '',
    achievements: '',
    planned: '',
    blockers: '',
    needs: '',
    notes: '',
  })

  const [search, setSearch] = useState('')
  const [weekFilter, setWeekFilter] = useState<WeekFilter>('this_week')
  const [departmentFilter, setDepartmentFilter] = useState<number | ''>('')

  const load = useCallback(
    async (opts?: { page?: number }) => {
      setLoading(true)
      try {
        const currentPage = opts?.page ?? page
        const params: Record<string, unknown> = { page: currentPage, per_page: perPage }
        if (search.trim()) params.q = search.trim()
        if (departmentFilter) params.department_id = departmentFilter

        if (weekFilter === 'this_week' && due?.week_start) {
          params.week_start = due.week_start
        } else if (weekFilter === 'last_week' && due?.week_start) {
          params.week_start = addDays(due.week_start, -7)
        } else if (weekFilter === 'this_month' && due?.week_start) {
          const { from, to } = monthRange(due.week_start)
          params.week_from = from
          params.week_to = to
        }

        const [list, dueRes, summaryRes] = await Promise.all([
          fetchWeeklyReports(params),
          fetchWeeklyReportsDue(),
          fetchWeeklyReportsSummary(),
        ])
        setReports(list.rows)
        setTotal(list.total)
        setDue(dueRes)
        setSummary(summaryRes)
      } catch {
        toast.error('فشل تحميل التقارير الأسبوعية')
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, search, weekFilter, departmentFilter],
  )

  // Mount fetch — inline async IIFE per effect-patterns.md.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [dueRes, summaryRes] = await Promise.all([fetchWeeklyReportsDue(), fetchWeeklyReportsSummary()])
        if (!alive) return
        setDue(dueRes)
        setSummary(summaryRes)
        const list = await fetchWeeklyReports({ page: 1, per_page: perPage, week_start: dueRes.week_start })
        if (alive) {
          setReports(list.rows)
          setTotal(list.total)
        }
      } catch {
        if (alive) toast.error('فشل تحميل التقارير الأسبوعية')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // إعادة التحميل عند تغيّر البحث/التصفية/الصفحة (بعد التحميل الأول).
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!due) return
    setReady(true)
  }, [due])
  useEffect(() => {
    if (!ready) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, weekFilter, departmentFilter, page])

  // مستخدم مرتبط بإدارة واحدة فقط — تُختار تلقائيًا فور توفر النطاق.
  useEffect(() => {
    if (soleDepartmentId != null && form.department_id === '') void pickDepartment(soleDepartmentId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soleDepartmentId])

  async function pickDepartment(id: number | '') {
    setForm((f) => ({ ...f, department_id: id }))
    setMembers([])
    setEvaluations({})
    setMembersError(false)
    if (!id) return
    setMembersLoading(true)
    try {
      const rows = await fetchDepartmentMembers(id)
      setMembers(rows)
      setEvaluations(Object.fromEntries(rows.map((m) => [m.id, { included: true, scores: {} }])))
    } catch {
      setMembersError(true)
      toast.error('تعذر تحميل أعضاء الإدارة')
    } finally {
      setMembersLoading(false)
    }
  }

  function openCreateForm() {
    setShowForm(true)
    setExpandedId(null)
  }

  /** فتح النموذج معبَّأً بتقرير قائم لمتابعته/تعديله — نفس نقطة التسليم (upsert). */
  function openFollowUpForm(report: WeeklyReport) {
    setForm({
      department_id: report.department?.id ?? '',
      achievements: report.achievements,
      planned: report.planned,
      blockers: report.blockers ?? '',
      needs: report.needs ?? '',
      notes: report.notes ?? '',
    })
    if (report.department?.id) void pickDepartment(report.department.id)
    setShowForm(true)
    setExpandedId(null)
  }

  async function submit() {
    if (!form.department_id || !form.achievements.trim() || !form.planned.trim()) {
      toast.error('الإدارة وإنجازات الأسبوع وخطة الأسبوع القادم حقول لازمة')
      return
    }
    setSaving(true)
    try {
      await submitWeeklyReport({
        department_id: form.department_id,
        achievements: form.achievements.trim(),
        planned: form.planned.trim(),
        blockers: form.blockers.trim() || undefined,
        needs: form.needs.trim() || undefined,
        notes: form.notes.trim() || undefined,
        ratings: members
          .filter((m) => evaluations[m.id]?.included)
          .map((m) => ({ user_id: m.id, scores: evaluations[m.id]?.scores })),
      })
      toast.success('سُلِّم تقرير الأسبوع')
      setShowForm(false)
      setForm({ department_id: '', achievements: '', planned: '', blockers: '', needs: '', notes: '' })
      setMembers([])
      setEvaluations({})
      await load({ page: 1 })
      setPage(1)
    } catch {
      toast.error('تعذر تسليم التقرير')
    } finally {
      setSaving(false)
    }
  }

  // تقرير إدارتي لهذا الأسبوع (لقائد إدارة واحدة) — من نفس قائمة "الأسبوع الحالي" إن كانت محمّلة، وإلا يُشتق من لافتة الاستحقاق.
  const myThisWeekReport = useMemo(() => {
    if (!isSoleLeader || !due) return undefined
    return reports.find((r) => r.department?.id === soleDepartmentId && r.week_start.slice(0, 10) === due.week_start)
  }, [isSoleLeader, due, reports, soleDepartmentId])
  const myReportMissing = isSoleLeader && due && due.missing.some((d) => d.id === soleDepartmentId)

  const heroCtaLabel = !isSoleLeader
    ? null
    : myThisWeekReport
      ? 'عرض تقرير هذا الأسبوع'
      : myReportMissing
        ? 'إنشاء التقرير'
        : 'متابعة تقرير هذا الأسبوع'

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div dir="rtl" className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customOrange">إيقاع الأداء الأسبوعي</p>
          <h1 className="mt-1 text-2xl font-black text-deepBlue">التقارير الأسبوعية</h1>
          <p className="mt-1 text-sm text-deepBlue/50">
            إنشاء ومتابعة التقارير الأسبوعية للإدارات ومشاركة مستوى الأداء والتقدم
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-deepBlue hover:bg-slate-50"
          >
            <RefreshCw size={15} />
          </button>
          {canCreate && !isSoleLeader && (
            <button
              onClick={openCreateForm}
              className="flex items-center gap-2 rounded-xl bg-deepBlue px-5 py-2.5 text-sm font-bold text-white hover:bg-deepBlue/90"
            >
              <Plus size={16} /> إنشاء تقرير أسبوعي جديد
            </button>
          )}
        </div>
      </div>

      {/* بطاقة قائد الإدارة — إبراز تقرير إدارته لهذا الأسبوع أولًا */}
      {isSoleLeader && due && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6">
          <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">تقرير إدارتك لهذا الأسبوع</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-deepBlue">{myDeptName}</h2>
              <p className="mt-1 text-sm font-semibold text-deepBlue/50">
                أسبوع {due.week_start}
                {myThisWeekReport ? (
                  <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-700">
                    <CheckCircle2 size={12} /> مكتمل
                  </span>
                ) : due.deadline_passed ? (
                  <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-black text-red-700">
                    <AlarmClock size={12} /> متأخر
                  </span>
                ) : (
                  <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-black text-amber-700">
                    <Clock size={12} /> قيد الإعداد
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => (myThisWeekReport ? setExpandedId(myThisWeekReport.id) : openCreateForm())}
              className="rounded-xl bg-customOrange px-6 py-2.5 text-sm font-extrabold text-white transition hover:bg-ember"
            >
              {heroCtaLabel}
            </button>
          </div>
        </div>
      )}

      {/* بطاقات الملخص */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryCard label="هذا الأسبوع" value={summary.expected} hint="إجمالي التقارير المتوقعة" icon={FileText} tone="neutral" />
          <SummaryCard label="متأخرة" value={summary.overdue} hint="تحتاج إلى الاهتمام" icon={AlarmClock} tone="red" />
          <SummaryCard label="قيد الإعداد" value={summary.in_progress} hint="تحتاج إلى إكمال" icon={Clock} tone="amber" />
          <SummaryCard label="التقارير المقدمة" value={summary.submitted} hint={`من إجمالي ${summary.expected} متوقع`} icon={CheckCircle2} tone="green" />
          <SummaryCard label="معدل الإنجاز" value={`${summary.completion_rate}%`} hint={`أسبوع ${summary.week_start}`} icon={Star} tone="blue" />
        </div>
      )}

      {/* تذكيرات مهمة — لغير قائد الإدارة الوحيد (ناظر شامل) */}
      {!isSoleLeader && due && due.missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlarmClock size={18} className="shrink-0 text-amber-600" aria-hidden />
          <p className="text-sm font-bold text-amber-800">
            {due.deadline_passed ? 'متأخرة' : 'قيد الإعداد'} — أسبوع {due.week_start}: لم تسلِّم بعد {due.missing.length} إدارة —{' '}
            <span className="font-black">{due.missing.map((d) => d.name).join('، ')}</span>
          </p>
        </div>
      )}

      {/* نموذج الإنشاء/المتابعة */}
      {showForm && (
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6">
          <div className="max-w-sm">
            {isSoleLeader ? (
              <div>
                <p className="text-[11px] font-black text-ink-500">الإدارة</p>
                <p className="mt-1 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-bold text-deepBlue">
                  {myDeptName}
                </p>
              </div>
            ) : (
              <DepartmentScopeField
                manifest={departmentAccess}
                loading={departmentAccessLoading}
                value={form.department_id}
                onChange={(id) => void pickDepartment(id)}
              />
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              ماذا أنجزنا هذا الأسبوع؟ *
              <textarea rows={4} value={form.achievements} onChange={(e) => setForm((f) => ({ ...f, achievements: e.target.value }))} className={fieldClass} />
            </label>
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              ماذا سننجز الأسبوع القادم؟ *
              <textarea rows={4} value={form.planned} onChange={(e) => setForm((f) => ({ ...f, planned: e.target.value }))} className={fieldClass} />
            </label>
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              العوائق
              <textarea rows={3} value={form.blockers} onChange={(e) => setForm((f) => ({ ...f, blockers: e.target.value }))} className={fieldClass} />
            </label>
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              الاحتياجات
              <textarea rows={3} value={form.needs} onChange={(e) => setForm((f) => ({ ...f, needs: e.target.value }))} className={fieldClass} />
            </label>
          </div>
          {/* تقييم أعضاء الإدارة — نفس معايير الاجتماعات العشرة، ويغذي نقاط الأثر */}
          {form.department_id !== '' && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <h3 className="text-xs font-black text-deepBlue">تقييم أداء الأعضاء هذا الأسبوع</h3>
              {membersLoading ? (
                <p className="mt-3 text-xs font-bold text-slate-400">جاري تحميل أعضاء الإدارة...</p>
              ) : membersError ? (
                <p className="mt-3 text-xs font-bold text-red-500">تعذر تحميل أعضاء الإدارة</p>
              ) : members.length === 0 ? (
                <p className="mt-3 text-xs font-bold text-slate-400">لا يوجد أعضاء مرتبطون بهذه الإدارة</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {members.map((m) => {
                    const row = evaluations[m.id] ?? { included: true, scores: {} }
                    const avg = averageScore(row.scores)
                    const isOpen = openMemberId === m.id
                    return (
                      <li key={m.id} className="rounded-lg bg-white">
                        <div className="flex items-center justify-between gap-3 px-3 py-2">
                          <label className="flex min-w-0 items-center gap-2 text-sm font-bold text-deepBlue">
                            <input
                              type="checkbox"
                              checked={row.included}
                              onChange={(e) =>
                                setEvaluations((a) => ({ ...a, [m.id]: { ...row, included: e.target.checked } }))
                              }
                              className="h-4 w-4 rounded border-slate-300 text-customBlue focus:ring-customBlue"
                            />
                            <span className="truncate">
                              {m.name}
                              {m.kind === 'leader' && <span className="ms-1.5 text-[10px] font-black text-customOrange">قائد</span>}
                            </span>
                          </label>
                          {row.included && (
                            <button
                              type="button"
                              onClick={() => setOpenMemberId(isOpen ? null : m.id)}
                              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-black transition ${
                                avg != null
                                  ? avg >= 9
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : avg >= 7
                                      ? 'border-sky bg-sky/40 text-deepBlue'
                                      : 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-slate-200 text-slate-500 hover:border-customBlue'
                              }`}
                            >
                              <Star size={11} aria-hidden />
                              {avg != null ? `${avg}/10` : 'قيّم بالمعايير العشرة'}
                            </button>
                          )}
                        </div>
                        {row.included && isOpen && (
                          <div className="border-t border-slate-100 p-2.5">
                            <CriteriaScoreGrid
                              scores={row.scores}
                              onChange={(next) => setEvaluations((a) => ({ ...a, [m.id]: { ...row, scores: next } }))}
                            />
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">
              إلغاء
            </button>
            <button
              disabled={saving}
              onClick={() => void submit()}
              className="rounded-xl bg-customOrange px-6 py-2.5 text-sm font-extrabold text-white transition hover:bg-ember disabled:opacity-60"
            >
              {saving ? 'جارٍ التسليم…' : 'تسليم التقرير'}
            </button>
          </div>
        </div>
      )}

      {/* البحث والتصفية */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="بحث في التقارير..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 ps-4 pe-9 text-sm font-semibold text-deepBlue outline-none transition-colors focus:border-customBlue focus:ring-2 focus:ring-customBlue/15"
          />
        </div>
        <select
          value={weekFilter}
          onChange={(e) => {
            setWeekFilter(e.target.value as WeekFilter)
            setPage(1)
          }}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-deepBlue outline-none focus:border-customBlue"
        >
          <option value="this_week">هذا الأسبوع</option>
          <option value="last_week">الأسبوع الماضي</option>
          <option value="this_month">هذا الشهر</option>
          <option value="all">الكل</option>
        </select>
        {!isSoleLeader && canCreate && (departmentAccess?.allowed_departments.length ?? 0) > 1 && (
          <select
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value ? Number(e.target.value) : '')
              setPage(1)
            }}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-deepBlue outline-none focus:border-customBlue"
          >
            <option value="">كل الأقسام</option>
            {departmentAccess?.allowed_departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* قائمة التقارير الأسبوعية */}
      <div className="rounded-2xl border border-slate-100 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-black text-deepBlue">قائمة التقارير الأسبوعية</h2>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <AlarmClock size={32} className="mx-auto text-slate-300" />
            <p className="mt-4 text-sm font-bold text-slate-400">
              {search || departmentFilter
                ? 'لا توجد تقارير مطابقة لخيارات البحث والتصفية'
                : weekFilter === 'this_week' && isSoleLeader
                  ? 'لم يتم إنشاء تقرير هذا الأسبوع بعد'
                  : 'لا توجد تقارير أسبوعية حتى الآن'}
            </p>
            {canCreate && weekFilter === 'this_week' && !search && !departmentFilter && (
              <button
                onClick={openCreateForm}
                className="mt-4 rounded-xl bg-deepBlue px-5 py-2.5 text-sm font-bold text-white hover:bg-deepBlue/90"
              >
                إنشاء الآن
              </button>
            )}
          </div>
        ) : (
          <>
            {/* جدول — شاشات واسعة */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400">
                    <th className="px-5 py-3 text-start">الإدارة</th>
                    <th className="px-3 py-3 text-start">الأسبوع</th>
                    <th className="px-3 py-3 text-start">حالة التقرير</th>
                    <th className="px-3 py-3 text-start">تاريخ الإنشاء</th>
                    <th className="px-3 py-3 text-start">تاريخ التسليم</th>
                    <th className="px-3 py-3 text-start">تم الإرسال بواسطة</th>
                    <th className="px-3 py-3 text-start">آخر تحديث</th>
                    <th className="px-5 py-3 text-start">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <ReportRow
                      key={r.id}
                      report={r}
                      expanded={expandedId === r.id}
                      onToggle={() => setExpandedId((v) => (v === r.id ? null : r.id))}
                      canEdit={isSoleLeader && r.department?.id === soleDepartmentId}
                      onFollowUp={() => openFollowUpForm(r)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* بطاقات — شاشات ضيقة */}
            <ul className="space-y-3 p-4 sm:hidden">
              {reports.map((r) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  expanded={expandedId === r.id}
                  onToggle={() => setExpandedId((v) => (v === r.id ? null : r.id))}
                  canEdit={isSoleLeader && r.department?.id === soleDepartmentId}
                  onFollowUp={() => openFollowUpForm(r)}
                />
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <p className="text-xs font-bold text-slate-400">
                  صفحة {page} من {totalPages} — {total} تقرير
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-deepBlue disabled:opacity-40"
                  >
                    السابق
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-deepBlue disabled:opacity-40"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: number | string
  hint: string
  icon: typeof FileText
  tone: 'neutral' | 'red' | 'amber' | 'green' | 'blue'
}) {
  const tones: Record<typeof tone, string> = {
    neutral: 'bg-slate-50 text-slate-500',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-sky/50 text-customBlue',
  }
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={16} aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-black tabular-nums text-deepBlue">{value}</p>
      <p className="mt-0.5 text-xs font-bold text-deepBlue/60">{label}</p>
      <p className="text-[11px] font-semibold text-slate-400">{hint}</p>
    </div>
  )
}

function ReportDetail({ report }: { report: WeeklyReport }) {
  return (
    <dl className="grid gap-4 border-t border-slate-100 px-5 py-4 text-sm sm:grid-cols-2">
      {(
        [
          ['أنجزنا', report.achievements],
          ['سننجز', report.planned],
          ['العوائق', report.blockers],
          ['الاحتياجات', report.needs],
          ['ملاحظات', report.notes],
        ] as const
      )
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] font-black text-slate-400">{k}</dt>
            <dd className="mt-1 whitespace-pre-line leading-7 text-ink-600">{v}</dd>
          </div>
        ))}
      {(report.ratings ?? []).length > 0 && (
        <div className="sm:col-span-2">
          <dt className="text-[11px] font-black text-slate-400">تقييم الأعضاء</dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            {(report.ratings ?? []).map((row) => (
              <span
                key={row.id}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black tabular-nums ${
                  (row.avg_score ?? 0) >= 9
                    ? 'bg-emerald-100 text-emerald-700'
                    : (row.avg_score ?? 0) >= 7
                      ? 'bg-sky/60 text-deepBlue'
                      : 'bg-amber-100 text-amber-700'
                }`}
              >
                {row.user?.name}
                {row.avg_score != null ? ` · ${row.avg_score}/10` : ''}
              </span>
            ))}
          </dd>
        </div>
      )}
    </dl>
  )
}

function ReportRow({
  report,
  expanded,
  onToggle,
  canEdit,
  onFollowUp,
}: {
  report: WeeklyReport
  expanded: boolean
  onToggle: () => void
  canEdit: boolean
  onFollowUp: () => void
}) {
  return (
    <>
      <tr className="border-b border-slate-50 hover:bg-slate-50/60">
        <td className="px-5 py-3 font-black text-deepBlue">{report.department?.name}</td>
        <td className="px-3 py-3 font-semibold text-deepBlue/70">{formatDate(report.week_start)}</td>
        <td className="px-3 py-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-700">
            <CheckCircle2 size={11} /> مكتمل
          </span>
        </td>
        <td className="px-3 py-3 text-xs font-semibold text-slate-400">{formatDate(report.created_at)}</td>
        <td className="px-3 py-3 text-xs font-semibold text-slate-400">{formatDate(report.submitted_at)}</td>
        <td className="px-3 py-3 font-semibold text-deepBlue/70">{report.submitter?.name ?? '—'}</td>
        <td className="px-3 py-3 text-xs font-semibold text-slate-400">{formatDate(report.updated_at)}</td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            <button onClick={onToggle} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-deepBlue hover:bg-slate-50">
              عرض
            </button>
            {canEdit && (
              <button onClick={onFollowUp} className="rounded-lg border border-customBlue/30 bg-sky/30 px-3 py-1.5 text-xs font-bold text-customBlue hover:bg-sky/50">
                متابعة
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="p-0">
            <ReportDetail report={report} />
          </td>
        </tr>
      )}
    </>
  )
}

function ReportCard({
  report,
  expanded,
  onToggle,
  canEdit,
  onFollowUp,
}: {
  report: WeeklyReport
  expanded: boolean
  onToggle: () => void
  canEdit: boolean
  onFollowUp: () => void
}) {
  return (
    <li className="rounded-2xl border border-slate-100 bg-white">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start">
        <div className="min-w-0">
          <p className="truncate font-black text-deepBlue">{report.department?.name}</p>
          <p className="mt-0.5 text-xs font-bold text-slate-400">
            أسبوع {formatDate(report.week_start)} · سلّمه {report.submitter?.name}
          </p>
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-700">
            <CheckCircle2 size={11} /> مكتمل
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="shrink-0 text-slate-400" /> : <ChevronDown size={16} className="shrink-0 text-slate-400" />}
      </button>
      {expanded && (
        <>
          <ReportDetail report={report} />
          {canEdit && (
            <div className="border-t border-slate-100 p-3">
              <button
                onClick={onFollowUp}
                className="w-full rounded-lg border border-customBlue/30 bg-sky/30 py-2 text-xs font-bold text-customBlue hover:bg-sky/50"
              >
                متابعة التقرير
              </button>
            </div>
          )}
        </>
      )}
    </li>
  )
}
