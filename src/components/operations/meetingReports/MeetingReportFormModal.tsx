import { useEffect, useRef, useState } from 'react'
import { Loader2, Star, X } from 'lucide-react'
import toast from '@/lib/toast'
import CriteriaScoreGrid from '@/components/operations/CriteriaScoreGrid'
import DepartmentScopeField from '@/components/operations/DepartmentScopeField'
import { averageScore, type CriteriaScores } from '@/data/evaluationCriteria'
import { getApiErrorMessage, getLaravelFieldErrors, withArabicValidationMessages } from '@/api/apiErrors'
import {
  createMeetingReport,
  fetchDepartmentMembers,
  type DepartmentAccessManifest,
  type DepartmentMember,
} from '@/api/operationsReportsApi'
import { scoreTone } from './meetingReportsUi'

type Props = {
  manifest: DepartmentAccessManifest | null
  manifestLoading: boolean
  /** Set when the user leads exactly one department: the field is locked to it. */
  soleDepartmentId: number | null
  onClose: () => void
  /** Called after the report is saved; the page reloads its list. */
  onSaved: () => void
}

const field =
  'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-navy outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15'

const today = () => new Date().toISOString().slice(0, 10)

const TONE_CLASS = {
  high: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  mid: 'border-brand-200 bg-brand-50 text-brand-700',
  low: 'border-amber-200 bg-amber-50 text-amber-700',
} as const

type MembersState = { deptId: number; ok: boolean; rows: DepartmentMember[] }

/**
 * Create a meeting report: pick the department, mark attendance and rate each
 * attendee against the ten criteria, then write the structured minutes.
 * The server decides who may create (department leadership or a global admin)
 * and re-validates everything; this form only reflects that: the page shows
 * the button to eligible users, and 403 / 422 answers come back inline.
 */
export function MeetingReportFormModal({ manifest, manifestLoading, soleDepartmentId, onClose, onSaved }: Props) {
  const [deptId, setDeptId] = useState<number | ''>(soleDepartmentId ?? '')
  const [membersState, setMembersState] = useState<MembersState | null>(null)
  const [membersNonce, setMembersNonce] = useState(0)
  const [attendance, setAttendance] = useState<Record<number, { attended: boolean; scores: CriteriaScores }>>({})
  const [openMemberId, setOpenMemberId] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: '', meeting_date: today(), achieved: '', planned: '', needs: '', needs_reason: '', decisions: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // Members of the chosen department. State is set only from the request's callbacks.
  useEffect(() => {
    if (deptId === '') return
    let alive = true
    void fetchDepartmentMembers(deptId)
      .then((rows) => {
        if (alive) setMembersState({ deptId, ok: true, rows: Array.isArray(rows) ? rows : [] })
      })
      .catch(() => {
        if (alive) setMembersState({ deptId, ok: false, rows: [] })
      })
    return () => {
      alive = false
    }
  }, [deptId, membersNonce])

  useEffect(() => {
    titleRef.current?.focus()
    const opener = document.activeElement as HTMLElement | null
    return () => opener?.focus?.()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const current = membersState?.deptId === deptId ? membersState : null
  const membersLoading = deptId !== '' && current === null
  const membersFailed = current !== null && !current.ok
  const members = current?.ok ? current.rows : []
  const row = (id: number) => attendance[id] ?? { attended: true, scores: {} as CriteriaScores }

  function pickDepartment(id: number | '') {
    setDeptId(id)
    setAttendance({})
    setOpenMemberId(null)
    setErrors((e) => ({ ...e, department_id: '' }))
  }

  async function submit() {
    const next: Record<string, string> = {}
    if (!deptId) next.department_id = 'اختر الإدارة.'
    if (!form.title.trim()) next.title = 'اكتب عنوان الاجتماع.'
    if (!form.meeting_date) next.meeting_date = 'حدّد تاريخ الاجتماع.'
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length > 0 || !deptId) return

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
        ratings: members.map((m) => {
          const r = row(m.id)
          return { user_id: m.id, attended: r.attended, scores: r.attended ? r.scores : undefined }
        }),
      })
      toast.success('حُفظ تقرير الاجتماع')
      onSaved()
    } catch (e) {
      const fieldErrors = withArabicValidationMessages(getLaravelFieldErrors(e))
      setErrors(fieldErrors)
      setFormError(Object.keys(fieldErrors).length > 0 ? 'راجع الحقول المظلَّلة ثم أعد المحاولة.' : getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const err = (key: string) =>
    errors[key] ? <span className="text-[11px] font-bold text-rose-600" role="alert">{errors[key]}</span> : null
  const invalid = (key: string) => (errors[key] ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200' : '')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="رفع تقرير اجتماع"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-paper shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-navy">رفع تقرير اجتماع</h2>
            <p className="text-xs font-semibold text-muted-500">محضر منظَّم مع حضور وتقييم كل عضو.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="إغلاق" className="rounded-xl p-2 text-muted-500 transition hover:bg-slate-100 disabled:opacity-40">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          {formError && (
            <p role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{formError}</p>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1">
              <DepartmentScopeField manifest={manifest} loading={manifestLoading} value={deptId} onChange={pickDepartment} />
              {err('department_id')}
            </div>
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              عنوان الاجتماع *
              <input
                ref={titleRef}
                value={form.title}
                maxLength={255}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="مثال: الاجتماع الأسبوعي"
                aria-invalid={Boolean(errors.title)}
                className={`${field} ${invalid('title')}`}
              />
              {err('title')}
            </label>
            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              تاريخ الاجتماع *
              <input
                type="date"
                dir="ltr"
                value={form.meeting_date}
                onChange={(e) => setForm((f) => ({ ...f, meeting_date: e.target.value }))}
                aria-invalid={Boolean(errors.meeting_date)}
                className={`${field} ${invalid('meeting_date')}`}
              />
              {err('meeting_date')}
            </label>
          </div>

          {deptId !== '' && (
            <section className="rounded-3xl border border-line bg-white p-4 shadow-sm">
              <h3 className="text-xs font-black text-navy">الحضور والتقييم</h3>
              {membersLoading ? (
                <p className="mt-3 text-xs font-bold text-muted-500">جارٍ تحميل أعضاء الإدارة…</p>
              ) : membersFailed ? (
                <div role="alert" className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-rose-600">
                  <span>تعذّر تحميل أعضاء الإدارة.</span>
                  <button
                    type="button"
                    onClick={() => { setMembersState(null); setMembersNonce((n) => n + 1) }}
                    className="rounded-lg bg-rose-50 px-3 py-1.5 text-rose-700 ring-1 ring-rose-200"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : members.length === 0 ? (
                <p className="mt-3 text-xs font-bold text-muted-500">لا يوجد أعضاء مرتبطون بهذه الإدارة.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {members.map((m) => {
                    const r = row(m.id)
                    const avg = averageScore(r.scores)
                    const isOpen = openMemberId === m.id
                    return (
                      <li key={m.id} className="rounded-xl bg-paper">
                        <div className="flex items-center justify-between gap-3 px-3 py-2">
                          <label className="flex min-w-0 items-center gap-2 text-sm font-bold text-navy">
                            <input
                              type="checkbox"
                              checked={r.attended}
                              onChange={(e) => setAttendance((a) => ({ ...a, [m.id]: { ...r, attended: e.target.checked } }))}
                              className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                            />
                            <span className="truncate">
                              {m.name}
                              {m.kind === 'leader' && <span className="ms-1.5 text-[10px] font-black text-accent-700">قائد</span>}
                            </span>
                          </label>
                          {r.attended && (
                            <button
                              type="button"
                              onClick={() => setOpenMemberId(isOpen ? null : m.id)}
                              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-black transition ${
                                avg != null ? TONE_CLASS[scoreTone(avg)] : 'border-line text-muted-500 hover:border-brand-500'
                              }`}
                            >
                              <Star size={11} aria-hidden="true" />
                              {avg != null ? `${avg}/10` : 'قيّم بالمعايير العشرة'}
                            </button>
                          )}
                        </div>
                        {r.attended && isOpen && (
                          <div className="border-t border-line p-2.5">
                            <CriteriaScoreGrid
                              scores={r.scores}
                              onChange={(next) => setAttendance((a) => ({ ...a, [m.id]: { ...r, scores: next } }))}
                            />
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ['achieved', 'ماذا أنجزوا؟', 3],
              ['planned', 'ماذا سينجزون؟', 3],
              ['needs', 'ماذا يحتاجون أو يريدون؟', 3],
              ['needs_reason', 'ولماذا؟', 3],
              ['decisions', 'القرارات', 2],
              ['notes', 'ملاحظات', 2],
            ] as const).map(([key, label, rows]) => (
              <label key={key} className="grid gap-1.5 text-xs font-black text-ink-500">
                {label}
                <textarea rows={rows} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className={field} />
              </label>
            ))}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line bg-white px-6 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-muted-600 transition hover:bg-slate-50 disabled:opacity-40">
            إلغاء
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-extrabold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {saving ? 'جارٍ الحفظ…' : 'حفظ التقرير'}
          </button>
        </footer>
      </div>
    </div>
  )
}
