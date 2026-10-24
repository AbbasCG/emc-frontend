import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarPlus, Loader2, UserRoundCheck, UsersRound, X } from 'lucide-react'
import toast from '@/lib/toast'
import { createMeeting, describeMeetingError, fetchMeetingCandidates } from '@/api/meetingsApi'
import { fetchWorkspaceDepartments } from '@/api/operationsApi'
import type { MeetingCandidate, MeetingRef, MeetingType, OpsMeeting } from '@/types/operations'
import { MEETING_TYPE_AR } from '@/data/operationsLabels'
import EmcDatePicker from '@/components/ui/EmcDatePicker'
import EmcTimePicker from '@/components/ui/EmcTimePicker'
import { ParticipantPicker } from '@/components/operations/meetings/ParticipantPicker'

type Props = {
  onClose: () => void
  /** Called with the saved meeting once the server confirms it. */
  onSaved: (meeting: OpsMeeting) => void
  initialType?: MeetingType
  /** The lounge fixes the type by which tile the user clicked. */
  hideTypeSelector?: boolean
  /**
   * Departments this user may schedule for, from the server. `null` means every
   * department (global roles): the list is then fetched here and the field is optional.
   */
  departments: MeetingRef[] | null
}

const field =
  'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-navy outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15'

type Pool = { key: string; rows?: MeetingCandidate[]; error?: string }

/**
 * Schedule a meeting. Mounted only while open, so every opening starts clean.
 * The server decides who may schedule, for which department, and who can be
 * invited; this form only offers what it allowed and shows any refusal inline.
 *
 * Audience: by default the whole department is invited (they see it, can join,
 * and it appears in their calendar). Choosing "أشخاص بعينهم" invites exactly the
 * people picked, from the department's members (or, with no department, from the
 * members inside your scope).
 */
export default function CreateMeetingForm({ onClose, onSaved, initialType = 'general', hideTypeSelector = false, departments }: Props) {
  const [allDepartments, setAllDepartments] = useState<MeetingRef[]>([])
  const [form, setForm] = useState({
    title: '',
    type: initialType,
    department_id: departments && departments.length === 1 ? String(departments[0].id) : '',
    meeting_date: '',
    start_time: '',
    end_time: '',
    meeting_url: '',
    agenda: '',
  })
  const [audience, setAudience] = useState<'all' | 'chosen'>('all')
  const [chosen, setChosen] = useState<number[]>([])
  const [pool, setPool] = useState<Pool | null>(null)
  const [poolNonce, setPoolNonce] = useState(0)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // Global roles may leave the department empty, so their list is fetched here.
  useEffect(() => {
    if (departments !== null) return
    let alive = true
    void fetchWorkspaceDepartments()
      .then((res) => {
        if (alive) setAllDepartments(res.items.map((d) => ({ id: Number(d.id), name: d.name_ar || d.title || d.name || `إدارة ${d.id}` })))
      })
      .catch(() => {
        /* the field is optional for global roles; scheduling still works without it */
      })
    return () => {
      alive = false
    }
  }, [departments])

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  // The invitable people for the chosen department (or the viewer's scope), asked of the server.
  const deptId = form.department_id ? Number(form.department_id) : undefined
  const poolKey = `${deptId ?? 'scope'}:${poolNonce}`
  useEffect(() => {
    if (audience !== 'chosen') return
    let alive = true
    void fetchMeetingCandidates(deptId)
      .then((rows) => {
        if (alive) setPool({ key: poolKey, rows })
      })
      .catch(() => {
        if (alive) setPool({ key: poolKey, error: 'تعذّر تحميل قائمة الأعضاء.' })
      })
    return () => {
      alive = false
    }
  }, [audience, deptId, poolKey])

  const poolReady = pool?.key === poolKey
  const candidates = useMemo(() => (poolReady ? (pool?.rows ?? []) : []), [poolReady, pool])
  // A selection made for another department must never leak into this one.
  const validChosen = useMemo(() => chosen.filter((id) => candidates.some((c) => c.id === id)), [chosen, candidates])

  const choices = departments ?? allDepartments
  const required = departments !== null
  const departmentRequired = required || audience === 'all'
  const locked = departments !== null && departments.length === 1

  function changeDepartment(value: string) {
    setForm((f) => ({ ...f, department_id: value }))
    setChosen([])
    setPool(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return

    const next: Record<string, string> = {}
    if (!form.title.trim()) next.title = 'اكتب عنوان الاجتماع.'
    if (!form.meeting_date) next.meeting_date = 'حدّد تاريخ الاجتماع.'
    if (!form.start_time) next.start_time = 'حدّد وقت بدء الاجتماع.'
    if (form.end_time && form.start_time && form.end_time <= form.start_time) next.end_time = 'يجب أن يكون وقت الانتهاء بعد وقت البدء.'
    // A meeting for "all department members" must say which department; only an invite-only meeting may have none.
    if (!form.department_id && (required || audience === 'all')) {
      next.department_id = audience === 'all' ? 'اختر الإدارة لجعل الاجتماع لكل أعضائها، أو اختر أشخاصًا بعينهم.' : 'اختر الإدارة التي يتبعها الاجتماع.'
    }
    if (audience === 'chosen' && validChosen.length === 0) next.participant_ids = 'اختر مشاركًا واحدًا على الأقل، أو اجعل الاجتماع لكل أعضاء الإدارة.'
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    try {
      const meeting = await createMeeting({
        title: form.title.trim(),
        type: form.type,
        meeting_date: form.meeting_date,
        start_time: form.start_time,
        ...(form.department_id ? { department_id: Number(form.department_id) } : {}),
        ...(form.end_time ? { end_time: form.end_time } : {}),
        ...(form.meeting_url.trim() ? { meeting_url: form.meeting_url.trim() } : {}),
        ...(form.agenda.trim() ? { agenda: form.agenda.trim() } : {}),
        ...(audience === 'chosen' ? { participant_ids: validChosen } : {}),
      })
      toast.success('تمت جدولة الاجتماع')
      onSaved(meeting)
    } catch (err) {
      const d = describeMeetingError(err, 'الاجتماع')
      setErrors(d.fields)
      setFormError(Object.keys(d.fields).length > 0 && d.kind === 'validation' ? 'راجع الحقول المظلَّلة ثم أعد المحاولة.' : d.message)
    } finally {
      setSaving(false)
    }
  }

  const err = (key: string) => (errors[key] ? <span className="text-[11px] font-bold text-rose-600" role="alert">{errors[key]}</span> : null)
  const bad = (key: string) => (errors[key] ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200' : '')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="جدولة اجتماع جديد"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-paper shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden="true">
              <CalendarPlus size={20} />
            </span>
            <div>
              <h2 className="text-lg font-black text-navy">جدولة اجتماع جديد</h2>
              <p className="text-xs font-semibold text-muted-500">يظهر الاجتماع في صالة الاجتماعات وفي تقويم المدعوّين فقط.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="إغلاق" className="rounded-xl p-2 text-muted-500 transition hover:bg-slate-100 disabled:opacity-40">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            {formError && (
              <p role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{formError}</p>
            )}

            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              عنوان الاجتماع *
              <input
                ref={titleRef}
                value={form.title}
                maxLength={255}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="مثال: مراجعة خطة الربع الثالث"
                aria-invalid={Boolean(errors.title)}
                className={`${field} ${bad('title')}`}
              />
              {err('title')}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              {!hideTypeSelector && (
                <label className="grid gap-1.5 text-xs font-black text-ink-500">
                  نوع الاجتماع *
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as MeetingType }))} className={`${field} ${bad('type')}`}>
                    {(Object.keys(MEETING_TYPE_AR) as MeetingType[]).map((t) => (
                      <option key={t} value={t}>{MEETING_TYPE_AR[t]}</option>
                    ))}
                  </select>
                  {err('type')}
                </label>
              )}
              {(choices.length > 0 || required) && (
                <label className="grid gap-1.5 text-xs font-black text-ink-500">
                  {departmentRequired ? 'الإدارة *' : 'الإدارة (اختياري)'}
                  <select
                    value={form.department_id}
                    disabled={locked}
                    onChange={(e) => changeDepartment(e.target.value)}
                    aria-invalid={Boolean(errors.department_id)}
                    className={`${field} ${bad('department_id')} disabled:bg-slate-50 disabled:text-muted-500`}
                  >
                    {!locked && <option value="">{departmentRequired ? 'اختر الإدارة…' : 'بدون إدارة محددة'}</option>}
                    {choices.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {err('department_id')}
                </label>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1">
                <EmcDatePicker
                  label="تاريخ الاجتماع"
                  required
                  layout="stacked"
                  value={form.meeting_date}
                  onChange={(v) => setForm((f) => ({ ...f, meeting_date: v }))}
                  error={errors.meeting_date}
                />
              </div>
              <div className="grid gap-1">
                <EmcTimePicker
                  label="وقت البدء"
                  required
                  value={form.start_time}
                  onChange={(v) => setForm((f) => ({ ...f, start_time: v }))}
                  error={errors.start_time}
                />
              </div>
              <div className="grid gap-1">
                <EmcTimePicker
                  label="وقت الانتهاء"
                  value={form.end_time}
                  onChange={(v) => setForm((f) => ({ ...f, end_time: v }))}
                  error={errors.end_time}
                  durationFrom={form.start_time}
                />
              </div>
            </div>

            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              رابط الاجتماع (اختياري)
              <input
                type="url"
                dir="ltr"
                value={form.meeting_url}
                onChange={(e) => setForm((f) => ({ ...f, meeting_url: e.target.value }))}
                placeholder="https://meet.google.com/…"
                aria-invalid={Boolean(errors.meeting_url)}
                className={`${field} text-left ${bad('meeting_url')}`}
              />
              {err('meeting_url')}
            </label>

            <label className="grid gap-1.5 text-xs font-black text-ink-500">
              جدول الأعمال (اختياري، بند في كل سطر)
              <textarea
                rows={3}
                value={form.agenda}
                onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))}
                placeholder={'افتتاح\nمراجعة الخطة\nالمستجدات'}
                className={field}
              />
            </label>

            <fieldset className="space-y-3 rounded-3xl border border-line bg-white p-4">
              <legend className="px-2 text-xs font-black text-ink-500">المدعوّون</legend>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="المدعوّون">
                {([
                  ['all', UsersRound, 'كل أعضاء الإدارة', 'يرى الاجتماع كل أعضاء الإدارة المختارة'],
                  ['chosen', UserRoundCheck, 'أشخاص بعينهم', 'يرى الاجتماع ويحضره المدعوّون فقط'],
                ] as const).map(([value, Icon, title, hint]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${audience === value ? 'border-brand-500 bg-brand-50/50' : 'border-line hover:bg-paper'}`}
                  >
                    <input type="radio" name="audience" value={value} checked={audience === value} onChange={() => setAudience(value)} className="mt-1 accent-brand-500" />
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-black text-navy">
                        <Icon size={15} aria-hidden="true" />
                        {title}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-semibold text-muted-500">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>

              {audience === 'chosen' && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-muted-500">
                    {deptId ? 'أعضاء الإدارة المختارة فقط.' : 'أعضاء EMC ضمن نطاقك. اختر إدارة لحصر القائمة بأعضائها.'}
                  </p>
                  <ParticipantPicker
                    candidates={candidates}
                    loading={!poolReady}
                    error={poolReady ? (pool?.error ?? null) : null}
                    onRetry={() => {
                      setPool(null)
                      setPoolNonce((n) => n + 1)
                    }}
                    selected={validChosen}
                    onChange={setChosen}
                    emptyText="لا يوجد أعضاء متاحون للدعوة في هذا النطاق."
                    searchLabel="ابحث عن عضو لدعوته"
                  />
                  {err('participant_ids')}
                </div>
              )}
            </fieldset>
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-line bg-white px-6 py-4">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-muted-600 transition hover:bg-slate-50 disabled:opacity-40">
              إلغاء
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-extrabold text-white transition hover:bg-brand-600 disabled:opacity-60">
              {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              {saving ? 'جارٍ الحفظ…' : 'حفظ الاجتماع'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
