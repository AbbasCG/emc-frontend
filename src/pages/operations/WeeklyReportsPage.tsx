import { useCallback, useEffect, useState } from 'react'
import { AlarmClock, ChevronDown, ChevronUp, Plus, RefreshCw, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchDepartmentOptions } from '@/api/jobTitlesApi'
import CriteriaScoreGrid from '@/components/operations/CriteriaScoreGrid'
import { averageScore, type CriteriaScores } from '@/data/evaluationCriteria'
import {
  fetchDepartmentMembers,
  fetchWeeklyReports,
  fetchWeeklyReportsDue,
  submitWeeklyReport,
  type DepartmentMember,
  type WeeklyReport,
} from '@/api/operationsReportsApi'

/**
 * تقارير الإثنين الأسبوعية: كل إدارة تسلِّم كل يوم إثنين تقرير أداء الأسبوع —
 * ماذا أنجزوا، ماذا سينجزون، العوائق والاحتياجات. لافتة الاستحقاق تُظهر
 * الإدارات التي لم تسلِّم بعد.
 */

type DeptOption = { id: number; name: string }

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-deepBlue outline-none transition-colors focus:border-customBlue focus:ring-2 focus:ring-customBlue/15'

export default function WeeklyReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [due, setDue] = useState<{ week_start: string; missing: DeptOption[]; submitted: number } | null>(null)
  const [departments, setDepartments] = useState<DeptOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState<DepartmentMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, dueRes] = await Promise.all([fetchWeeklyReports(), fetchWeeklyReportsDue()])
      setReports(list.rows)
      setDue(dueRes)
    } catch {
      toast.error('فشل تحميل التقارير الأسبوعية')
    } finally {
      setLoading(false)
    }
  }, [])

  // Mount fetch — inline async IIFE per effect-patterns.md.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [list, dueRes] = await Promise.all([fetchWeeklyReports(), fetchWeeklyReportsDue()])
        if (alive) {
          setReports(list.rows)
          setDue(dueRes)
        }
      } catch {
        if (alive) toast.error('فشل تحميل التقارير الأسبوعية')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    void fetchDepartmentOptions()
      .then((rows) => {
        if (alive) setDepartments(rows.map((r) => ({ id: r.id, name: r.name_ar || r.name || String(r.id) })))
      })
      .catch(() => {
        if (alive) setDepartments([])
      })
    return () => {
      alive = false
    }
  }, [])

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
      await load()
    } catch {
      toast.error('تعذر تسليم التقرير')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customOrange">إيقاع الإثنين</p>
          <h1 className="mt-1 text-2xl font-black text-deepBlue">التقارير الأسبوعية</h1>
          <p className="mt-1 text-sm text-deepBlue/50">كل إدارة تسلِّم تقرير أداء أسبوعها كل يوم إثنين</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-deepBlue hover:bg-slate-50">
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-deepBlue px-5 py-2.5 text-sm font-bold text-white hover:bg-deepBlue/90"
          >
            <Plus size={16} /> تسليم تقرير الأسبوع
          </button>
        </div>
      </div>

      {/* لافتة الاستحقاق */}
      {due && due.missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlarmClock size={18} className="shrink-0 text-amber-600" aria-hidden />
          <p className="text-sm font-bold text-amber-800">
            أسبوع {due.week_start}: لم تسلِّم بعد {due.missing.length} إدارة —{' '}
            <span className="font-black">{due.missing.map((d) => d.name).join('، ')}</span>
          </p>
        </div>
      )}

      {showForm && (
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6">
          <label className="grid max-w-sm gap-1.5 text-xs font-black text-ink-500">
            الإدارة *
            <select
              value={form.department_id}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : ''
                setForm((f) => ({ ...f, department_id: id }))
                setMembers([])
                setEvaluations({})
                if (id) {
                  setMembersLoading(true)
                  void fetchDepartmentMembers(id)
                    .then((rows) => {
                      setMembers(rows)
                      setEvaluations(Object.fromEntries(rows.map((m) => [m.id, { included: true, scores: {} }])))
                    })
                    .catch(() => toast.error('تعذر تحميل أعضاء الإدارة'))
                    .finally(() => setMembersLoading(false))
                }
              }}
              className={fieldClass}
            >
              <option value="">اختر الإدارة…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
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
                <p className="mt-3 text-xs font-bold text-slate-400">جارٍ تحميل الأعضاء…</p>
              ) : members.length === 0 ? (
                <p className="mt-3 text-xs font-bold text-slate-400">لا أعضاء مسجلين في هذه الإدارة بعد</p>
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

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <AlarmClock size={32} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-bold text-slate-400">لا تقارير أسبوعية بعد — أول إثنين قادم يبدأ السجل</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-slate-100 bg-white">
              <button
                onClick={() => setExpandedId((v) => (v === r.id ? null : r.id))}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
              >
                <div>
                  <p className="font-black text-deepBlue">{r.department?.name}</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-400">
                    أسبوع {r.week_start.slice(0, 10)} · سلّمه {r.submitter?.name}
                  </p>
                </div>
                {expandedId === r.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>
              {expandedId === r.id && (
                <dl className="grid gap-4 border-t border-slate-100 px-5 py-4 text-sm sm:grid-cols-2">
                  {([
                    ['أنجزنا', r.achievements],
                    ['سننجز', r.planned],
                    ['العوائق', r.blockers],
                    ['الاحتياجات', r.needs],
                    ['ملاحظات', r.notes],
                  ] as const)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-[11px] font-black text-slate-400">{k}</dt>
                        <dd className="mt-1 whitespace-pre-line leading-7 text-ink-600">{v}</dd>
                      </div>
                    ))}
                  {(r.ratings ?? []).length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="text-[11px] font-black text-slate-400">تقييم الأعضاء</dt>
                      <dd className="mt-2 flex flex-wrap gap-2">
                        {(r.ratings ?? []).map((row) => (
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
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
