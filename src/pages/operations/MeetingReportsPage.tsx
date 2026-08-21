import { useCallback, useEffect, useState } from 'react'
import { CalendarCheck2, ChevronDown, ChevronUp, Plus, RefreshCw, Star } from 'lucide-react'
import CriteriaScoreGrid from '@/components/operations/CriteriaScoreGrid'
import { averageScore, type CriteriaScores } from '@/data/evaluationCriteria'
import toast from 'react-hot-toast'
import { fetchDepartmentOptions } from '@/api/jobTitlesApi'
import {
  createMeetingReport,
  fetchDepartmentMembers,
  fetchMeetingReport,
  fetchMeetingReports,
  type DepartmentMember,
  type MeetingReport,
} from '@/api/operationsReportsApi'

/**
 * تقارير ما بعد الاجتماع: اختر الإدارة فتنسدل أسماء أعضائها، علّم الحضور
 * وقيّم كل حاضر بنقرة، ثم دوّن المحضر المنظَّم: ماذا أنجزوا، ماذا سينجزون،
 * ماذا يحتاجون ولماذا، والقرارات. سريع على المدير وقابل للقياس لاحقاً.
 */

type DeptOption = { id: number; name: string }

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-deepBlue outline-none transition-colors focus:border-customBlue focus:ring-2 focus:ring-customBlue/15'

export default function MeetingReportsPage() {
  const [reports, setReports] = useState<MeetingReport[]>([])
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState<DeptOption[]>([])
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<MeetingReport | null>(null)

  // نموذج الإنشاء
  const [deptId, setDeptId] = useState<number | ''>('')
  const [members, setMembers] = useState<DepartmentMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [attendance, setAttendance] = useState<Record<number, { attended: boolean; scores: CriteriaScores }>>({})
  const [openMemberId, setOpenMemberId] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: '',
    meeting_date: new Date().toISOString().slice(0, 10),
    achieved: '',
    planned: '',
    needs: '',
    needs_reason: '',
    decisions: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchMeetingReports()
      setReports(res.rows)
    } catch {
      toast.error('فشل تحميل تقارير الاجتماعات')
    } finally {
      setLoading(false)
    }
  }, [])

  // Mount fetch — inline async IIFE per effect-patterns.md.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await fetchMeetingReports()
        if (alive) setReports(res.rows)
      } catch {
        if (alive) toast.error('فشل تحميل تقارير الاجتماعات')
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

  async function pickDepartment(id: number | '') {
    setDeptId(id)
    setMembers([])
    setAttendance({})
    if (!id) return
    setMembersLoading(true)
    try {
      const rows = await fetchDepartmentMembers(id)
      setMembers(rows)
      setAttendance(Object.fromEntries(rows.map((m) => [m.id, { attended: true, scores: {} }])))
    } catch {
      toast.error('تعذر تحميل أعضاء الإدارة')
    } finally {
      setMembersLoading(false)
    }
  }

  async function submit() {
    if (!deptId || !form.title.trim()) {
      toast.error('اختر الإدارة واكتب عنوان الاجتماع')
      return
    }
    setSaving(true)
    try {
      await createMeetingReport({
        department_id: deptId,
        title: form.title.trim(),
        meeting_date: form.meeting_date,
        achieved: form.achieved.trim() || undefined,
        planned: form.planned.trim() || undefined,
        needs: form.needs.trim() || undefined,
        needs_reason: form.needs_reason.trim() || undefined,
        decisions: form.decisions.trim() || undefined,
        notes: form.notes.trim() || undefined,
        ratings: members.map((m) => ({
          user_id: m.id,
          attended: attendance[m.id]?.attended ?? false,
          scores: attendance[m.id]?.attended ? attendance[m.id]?.scores : undefined,
        })),
      })
      toast.success('حُفظ تقرير الاجتماع')
      setShowForm(false)
      setForm({ title: '', meeting_date: new Date().toISOString().slice(0, 10), achieved: '', planned: '', needs: '', needs_reason: '', decisions: '', notes: '' })
      setDeptId('')
      setMembers([])
      await load()
    } catch {
      toast.error('تعذر حفظ التقرير')
    } finally {
      setSaving(false)
    }
  }

  async function toggleExpand(id: number) {
    if (expandedId === id) {
      setExpandedId(null)
      setExpanded(null)
      return
    }
    setExpandedId(id)
    setExpanded(null)
    try {
      setExpanded(await fetchMeetingReport(id))
    } catch {
      toast.error('تعذر تحميل التفاصيل')
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customOrange">التوثيق</p>
          <h1 className="mt-1 text-2xl font-black text-deepBlue">تقارير الاجتماعات</h1>
          <p className="mt-1 text-sm text-deepBlue/50">محضر منظَّم بعد كل اجتماع، مع حضور وتقييم كل عضو</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-deepBlue hover:bg-slate-50">
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-deepBlue px-5 py-2.5 text-sm font-bold text-white hover:bg-deepBlue/90"
          >
            <Plus size={16} /> تقرير اجتماع جديد
          </button>
        </div>
      </div>

      {showForm && (
        <div className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              الإدارة *
              <select value={deptId} onChange={(e) => void pickDepartment(e.target.value ? Number(e.target.value) : '')} className={fieldClass}>
                <option value="">اختر الإدارة…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              عنوان الاجتماع *
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="مثال: الاجتماع الأسبوعي" className={fieldClass} />
            </label>
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              تاريخ الاجتماع
              <input type="date" dir="ltr" value={form.meeting_date} onChange={(e) => setForm((f) => ({ ...f, meeting_date: e.target.value }))} className={fieldClass} />
            </label>
          </div>

          {/* الحضور والتقييم */}
          {deptId !== '' && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <h3 className="text-xs font-black text-deepBlue">الحضور والتقييم</h3>
              {membersLoading ? (
                <p className="mt-3 text-xs font-bold text-slate-400">جارٍ تحميل الأعضاء…</p>
              ) : members.length === 0 ? (
                <p className="mt-3 text-xs font-bold text-slate-400">لا أعضاء مسجلين في هذه الإدارة بعد</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {members.map((m) => {
                    const row = attendance[m.id] ?? { attended: true, scores: {} }
                    const avg = averageScore(row.scores)
                    const isOpen = openMemberId === m.id
                    return (
                      <li key={m.id} className="rounded-lg bg-white">
                        <div className="flex items-center justify-between gap-3 px-3 py-2">
                          <label className="flex min-w-0 items-center gap-2 text-sm font-bold text-deepBlue">
                            <input
                              type="checkbox"
                              checked={row.attended}
                              onChange={(e) =>
                                setAttendance((a) => ({ ...a, [m.id]: { ...row, attended: e.target.checked } }))
                              }
                              className="h-4 w-4 rounded border-slate-300 text-customBlue focus:ring-customBlue"
                            />
                            <span className="truncate">
                              {m.name}
                              {m.kind === 'leader' && <span className="ms-1.5 text-[10px] font-black text-customOrange">قائد</span>}
                            </span>
                          </label>
                          {row.attended && (
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
                        {row.attended && isOpen && (
                          <div className="border-t border-slate-100 p-2.5">
                            <CriteriaScoreGrid
                              scores={row.scores}
                              onChange={(next) => setAttendance((a) => ({ ...a, [m.id]: { ...row, scores: next } }))}
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

          {/* المحضر المنظَّم */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              ماذا أنجزوا؟
              <textarea rows={3} value={form.achieved} onChange={(e) => setForm((f) => ({ ...f, achieved: e.target.value }))} className={fieldClass} />
            </label>
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              ماذا سينجزون؟
              <textarea rows={3} value={form.planned} onChange={(e) => setForm((f) => ({ ...f, planned: e.target.value }))} className={fieldClass} />
            </label>
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              ماذا يحتاجون/يريدون؟
              <textarea rows={3} value={form.needs} onChange={(e) => setForm((f) => ({ ...f, needs: e.target.value }))} className={fieldClass} />
            </label>
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              ولماذا؟
              <textarea rows={3} value={form.needs_reason} onChange={(e) => setForm((f) => ({ ...f, needs_reason: e.target.value }))} className={fieldClass} />
            </label>
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              القرارات
              <textarea rows={2} value={form.decisions} onChange={(e) => setForm((f) => ({ ...f, decisions: e.target.value }))} className={fieldClass} />
            </label>
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              ملاحظات
              <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={fieldClass} />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">
              إلغاء
            </button>
            <button
              disabled={saving}
              onClick={() => void submit()}
              className="rounded-xl bg-customOrange px-6 py-2.5 text-sm font-extrabold text-white transition hover:bg-ember disabled:opacity-60"
            >
              {saving ? 'جارٍ الحفظ…' : 'حفظ التقرير'}
            </button>
          </div>
        </div>
      )}

      {/* القائمة */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <CalendarCheck2 size={32} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-bold text-slate-400">لا تقارير اجتماعات بعد — أنشئ أول تقرير</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-slate-100 bg-white">
              <button
                onClick={() => void toggleExpand(r.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
              >
                <div>
                  <p className="font-black text-deepBlue">{r.title}</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-400">
                    {r.department?.name} · {r.meeting_date.slice(0, 10)} · {r.ratings_count ?? 0} حاضر
                  </p>
                </div>
                {expandedId === r.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>
              {expandedId === r.id && (
                <div className="border-t border-slate-100 px-5 py-4">
                  {!expanded ? (
                    <p className="text-xs font-bold text-slate-400">جارٍ التحميل…</p>
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <dl className="space-y-3 text-sm">
                        {([
                          ['ماذا أنجزوا', expanded.achieved],
                          ['ماذا سينجزون', expanded.planned],
                          ['الاحتياجات', expanded.needs],
                          ['السبب', expanded.needs_reason],
                          ['القرارات', expanded.decisions],
                          ['ملاحظات', expanded.notes],
                        ] as const)
                          .filter(([, v]) => v)
                          .map(([k, v]) => (
                            <div key={k}>
                              <dt className="text-[11px] font-black text-slate-400">{k}</dt>
                              <dd className="mt-1 whitespace-pre-line leading-7 text-ink-600">{v}</dd>
                            </div>
                          ))}
                      </dl>
                      <div>
                        <h4 className="text-[11px] font-black text-slate-400">الحضور والتقييم</h4>
                        <ul className="mt-2 space-y-1.5">
                          {(expanded.ratings ?? []).map((row) => (
                            <li key={row.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                              <span className={`font-bold ${row.attended ? 'text-deepBlue' : 'text-slate-400 line-through'}`}>
                                {row.user?.name}
                              </span>
                              {row.attended ? (
                                row.avg_score != null ? (
                                  <span
                                    className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-black tabular-nums ${
                                      row.avg_score >= 9
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : row.avg_score >= 7
                                          ? 'bg-sky/60 text-deepBlue'
                                          : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    <Star size={11} aria-hidden />
                                    {row.avg_score}/10
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-slate-400">حضر</span>
                                )
                              ) : (
                                <span className="text-[11px] font-bold text-slate-400">غائب</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
