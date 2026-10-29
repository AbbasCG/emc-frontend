import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  AlertCircle, CheckCircle2, ClipboardCheck, FileText, Gavel, ListChecks, Loader2, Plus, Trash2, UsersRound, X,
} from 'lucide-react'
import toast from '@/lib/toast'
import EmcDatePicker from '@/components/ui/EmcDatePicker'
import {
  describeMeetingError, fetchMeetingParticipantPool, submitMeetingReport, type AttendanceCandidate,
} from '@/api/meetingsApi'
import type { OpsMeetingDetail } from '@/types/operations'
import { ParticipantPicker } from '@/components/operations/meetings/ParticipantPicker'

type Props = {
  meetingId: number
  meetingTitle?: string
  /** The agenda, shown as a reference while writing the summary. */
  agenda?: string[]
  onClose: () => void
  /** The updated meeting (has_report: true) once the server confirms the report. */
  onSuccess: (meeting: OpsMeetingDetail) => void
  /** The server said this meeting already has its report: refresh the list behind. */
  onDuplicate?: () => void
}

const input =
  'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-navy outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15'

type TabKey = 'attendance' | 'summary' | 'actions' | 'review'

const TABS: Array<{ key: TabKey; label: string; icon: typeof UsersRound }> = [
  { key: 'attendance', label: 'الحضور والانضباط', icon: UsersRound },
  { key: 'summary', label: 'الملخص وجدول الأعمال', icon: FileText },
  { key: 'actions', label: 'القرارات وبنود العمل', icon: Gavel },
  { key: 'review', label: 'المراجعة والإرسال', icon: ClipboardCheck },
]

const FIELD_TAB: Record<string, TabKey> = { attendance: 'attendance', report: 'summary', action_items: 'actions', decisions: 'actions', meeting: 'review' }

type ActionRow = { key: number; title: string; assigned_to: string; due_date: string }
type DecisionRow = { key: number; title: string }

let rowKey = 0
const nextKey = () => ++rowKey

type PoolState = { nonce: number; rows?: AttendanceCandidate[]; error?: string }

/**
 * The meeting's ONE official report, as four visible sections (tabs) instead of a
 * step-by-step wizard: every question is reachable at any time, each tab shows
 * whether it is complete, and nothing is hidden behind a "next" button.
 *
 *  1. attendance - the people the SERVER allows at this meeting, pre-checked
 *     with whoever already joined; commitment score and notes
 *  2. summary - what was done and discussed, challenges, general notes
 *  3. decisions and action items (responsible people come from the same pool)
 *  4. review and submit
 *
 * It cannot be filed twice: the server refuses a second report with a clear Arabic
 * message, which this form shows (and the list refreshes). The report cannot be
 * replaced once filed, so an empty one is blocked here and on the server.
 */
export default function MeetingReportModal({ meetingId, meetingTitle, agenda = [], onClose, onSuccess, onDuplicate }: Props) {
  const [tab, setTab] = useState<TabKey>('attendance')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState(false)
  const [poolNonce, setPoolNonce] = useState(0)
  const [poolState, setPoolState] = useState<PoolState | null>(null)
  const [presentOverride, setPresentOverride] = useState<number[] | null>(null)
  const [decisions, setDecisions] = useState<DecisionRow[]>([])
  const [actions, setActions] = useState<ActionRow[]>([])
  const [form, setForm] = useState({
    team_commitment_score: 5,
    team_commitment_notes: '',
    top_interactive_member: '',
    completed_tasks_summary: '',
    kpi_percentage: 100,
    challenges: '',
    notes: '',
    executive_requests: '',
    next_month_goals: '',
    improvement_suggestions: '',
  })

  // The attendance roster comes from the server; state is only set from the request's callbacks.
  useEffect(() => {
    let alive = true
    void fetchMeetingParticipantPool(meetingId)
      .then((res) => {
        if (alive) setPoolState({ nonce: poolNonce, rows: res.rows })
      })
      .catch(() => {
        if (alive) setPoolState({ nonce: poolNonce, error: 'تعذّر تحميل المشاركين في الاجتماع.' })
      })
    return () => {
      alive = false
    }
  }, [meetingId, poolNonce])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, submitting])

  const poolReady = poolState?.nonce === poolNonce
  const candidates = useMemo(() => (poolReady ? (poolState?.rows ?? []) : []), [poolReady, poolState])
  const poolError = poolReady ? (poolState?.error ?? null) : null

  // Whoever already joined starts checked; the person filing can change it freely.
  const present = useMemo(
    () => presentOverride ?? candidates.filter((c) => c.status === 'joined' || c.status === 'attended').map((c) => c.id),
    [presentOverride, candidates],
  )
  const presentPeople = candidates.filter((c) => present.includes(c.id))

  const hasContent = [form.completed_tasks_summary, form.challenges, form.executive_requests, form.next_month_goals, form.improvement_suggestions, form.team_commitment_notes, form.notes]
    .some((v) => v.trim() !== '')

  const attendanceDone = poolReady && !poolError && (candidates.length === 0 || present.length > 0)
  const summaryDone = form.completed_tasks_summary.trim() !== ''
  const actionsDone = decisions.some((d) => d.title.trim()) || actions.some((a) => a.title.trim()) || form.next_month_goals.trim() !== '' || form.executive_requests.trim() !== ''

  const done: Record<TabKey, boolean> = { attendance: attendanceDone, summary: summaryDone, actions: actionsDone, review: false }
  const required: Record<TabKey, boolean> = { attendance: true, summary: true, actions: false, review: false }

  function updateAction(key: number, patch: Partial<ActionRow>) {
    setActions((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return

    if (!attendanceDone) {
      setTab('attendance')
      setError(poolError ?? 'سجّل حضور المشاركين (حدّد من حضر) قبل رفع التقرير.')
      return
    }
    if (!summaryDone || !hasContent) {
      setTab('summary')
      setError('اكتب ملخصًا لما تم إنجازه ومناقشته في الاجتماع قبل رفع التقرير.')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      const meeting = await submitMeetingReport(meetingId, {
        absentees: [],
        attendance: candidates.map((c) => ({ user_id: c.id, attended: present.includes(c.id) })),
        team_commitment_score: form.team_commitment_score,
        team_commitment_notes: form.team_commitment_notes,
        completed_tasks_summary: form.completed_tasks_summary,
        kpi_percentage: form.kpi_percentage,
        top_interactive_member: form.top_interactive_member,
        challenges: form.challenges,
        executive_requests: form.executive_requests,
        next_month_goals: form.next_month_goals,
        improvement_suggestions: form.improvement_suggestions,
        notes: form.notes,
        decisions: decisions.filter((d) => d.title.trim()).map((d) => ({ title: d.title.trim() })),
        action_items: actions.filter((a) => a.title.trim()).map((a) => ({
          title: a.title.trim(),
          ...(a.assigned_to ? { assigned_to: Number(a.assigned_to) } : {}),
          ...(a.due_date ? { due_date: a.due_date } : {}),
        })),
      })
      toast.success('تم رفع تقرير الاجتماع')
      onSuccess(meeting)
    } catch (err) {
      const d = describeMeetingError(err, 'الاجتماع')
      if (d.kind === 'duplicate_report') {
        setDuplicate(true)
        onDuplicate?.()
      }
      const firstKey = Object.keys(d.fields)[0]
      if (firstKey && FIELD_TAB[firstKey.split('.')[0]]) setTab(FIELD_TAB[firstKey.split('.')[0]])
      setError(d.kind === 'validation' && firstKey ? d.fields[firstKey] : d.message)
    } finally {
      setSubmitting(false)
    }
  }

  const label = (text: string, control: ReactNode) => (
    <label className="grid gap-2 text-xs font-black text-ink-500">
      {text}
      {control}
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => !submitting && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="رفع تقرير الاجتماع"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-paper shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line bg-white px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-navy">رفع تقرير الاجتماع</h2>
            {meetingTitle && <p className="mt-0.5 truncate text-xs font-bold text-muted-500">{meetingTitle}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="إغلاق" className="rounded-xl p-2 text-muted-500 transition hover:bg-slate-100 disabled:opacity-40">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div role="tablist" aria-label="أقسام التقرير" className="flex gap-1 overflow-x-auto border-b border-line bg-white px-4 pt-2">
          {TABS.map(({ key, label: text, icon: Icon }) => {
            const active = tab === key
            return (
              <button
                key={key}
                id={`report-tab-${key}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`report-panel-${key}`}
                onClick={() => setTab(key)}
                className={`relative inline-flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-2.5 text-xs font-black transition ${active ? 'bg-paper text-brand-700' : 'text-muted-500 hover:text-navy'}`}
              >
                <Icon size={14} aria-hidden="true" />
                {text}
                {key !== 'review' && (
                  done[key] ? (
                    <CheckCircle2 size={13} className="text-emerald-600" aria-label="مكتمل" />
                  ) : required[key] ? (
                    <AlertCircle size={13} className="text-accent-600" aria-label="مطلوب" />
                  ) : (
                    <span className="text-[10px] font-bold text-muted-400">اختياري</span>
                  )
                )}
                {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-500" aria-hidden="true" />}
              </button>
            )
          })}
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault() }} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            <p className="rounded-2xl bg-brand-50 px-4 py-3 text-xs font-bold leading-6 text-brand-700">
              لكل اجتماع تقرير رسمي واحد فقط ولا يمكن استبداله بعد رفعه، ويصبح متاحًا لإدارة الجودة فور رفعه.
            </p>

            {error && <p role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

            {tab === 'attendance' && (
              <section id="report-panel-attendance" role="tabpanel" aria-labelledby="report-tab-attendance" className="space-y-5">
                <div>
                  <h3 className="mb-1 text-sm font-black text-navy">من حضر الاجتماع؟</h3>
                  <p className="mb-3 text-[11px] font-semibold text-muted-500">
                    القائمة من الخادم وتضم المشاركين في هذا الاجتماع فقط. من انضم بنفسه محدَّد مسبقًا، وغير المحدَّد يُسجَّل غائبًا.
                  </p>
                  <ParticipantPicker
                    candidates={candidates}
                    loading={!poolReady}
                    error={poolError}
                    onRetry={() => {
                      setPoolState(null)
                      setPoolNonce((n) => n + 1)
                    }}
                    selected={present}
                    onChange={setPresentOverride}
                    emptyText="لا يوجد مشاركون مرتبطون بهذا الاجتماع."
                    searchLabel="ابحث عن مشارك"
                  />
                  {poolReady && candidates.length > 0 && (
                    <p className="mt-2 text-[11px] font-bold text-muted-500" data-testid="attendance-count">
                      الحاضرون {present.length} من {candidates.length} · الغائبون {candidates.length - present.length}
                    </p>
                  )}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {label('مقياس التزام الفريق (من 1 إلى 5)', (
                    <>
                      <input type="range" min={1} max={5} className="w-full accent-brand-500" value={form.team_commitment_score} onChange={(e) => setForm({ ...form, team_commitment_score: Number(e.target.value) })} />
                      <span className="text-center text-sm font-black text-brand-600">{form.team_commitment_score} / 5</span>
                    </>
                  ))}
                  {label('العضو الأكثر تفاعلًا وتميزًا', (
                    <select className={input} value={form.top_interactive_member} onChange={(e) => setForm({ ...form, top_interactive_member: e.target.value })}>
                      <option value="">— بدون —</option>
                      {presentPeople.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  ))}
                </div>
                {label('ملاحظات حول الانضباط والحضور', <textarea rows={3} className={input} value={form.team_commitment_notes} onChange={(e) => setForm({ ...form, team_commitment_notes: e.target.value })} />)}
              </section>
            )}

            {tab === 'summary' && (
              <section id="report-panel-summary" role="tabpanel" aria-labelledby="report-tab-summary" className="space-y-5">
                {agenda.length > 0 && (
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <h3 className="mb-2 text-xs font-black text-muted-500">جدول الأعمال (للمرجع)</h3>
                    <ol className="list-decimal space-y-1 ps-5 text-sm font-semibold text-ink-500">
                      {agenda.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {label('ملخص ما تم إنجازه ومناقشته *', <textarea rows={5} className={input} value={form.completed_tasks_summary} onChange={(e) => setForm({ ...form, completed_tasks_summary: e.target.value })} placeholder="اكتب أهم ما تمت مناقشته وإنجازه في الاجتماع…" />)}
                <div className="grid gap-5 sm:grid-cols-2">
                  {label('نسبة تحقيق الأهداف التشغيلية (%)', <input type="number" min={0} max={100} className={input} value={form.kpi_percentage} onChange={(e) => setForm({ ...form, kpi_percentage: Number(e.target.value) })} />)}
                </div>
                {label('المشاكل والتحديات التي واجهت الإدارة', <textarea rows={3} className={input} value={form.challenges} onChange={(e) => setForm({ ...form, challenges: e.target.value })} />)}
                {label('ملاحظات عامة', <textarea rows={3} className={input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />)}
              </section>
            )}

            {tab === 'actions' && (
              <section id="report-panel-actions" role="tabpanel" aria-labelledby="report-tab-actions" className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-black text-navy"><Gavel size={15} aria-hidden="true" />القرارات</h3>
                    <button type="button" onClick={() => setDecisions((d) => [...d, { key: nextKey(), title: '' }])} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-black text-navy transition hover:bg-slate-50">
                      <Plus size={13} aria-hidden="true" />
                      إضافة قرار
                    </button>
                  </div>
                  {decisions.length === 0 && <p className="rounded-2xl bg-paper px-4 py-3 text-xs font-bold text-muted-500">لم تُضف قرارات بعد (اختياري).</p>}
                  {decisions.map((d, i) => (
                    <div key={d.key} className="flex items-center gap-2">
                      <input
                        aria-label={`القرار ${i + 1}`}
                        className={input}
                        value={d.title}
                        maxLength={255}
                        onChange={(e) => setDecisions((rows) => rows.map((r) => (r.key === d.key ? { ...r, title: e.target.value } : r)))}
                        placeholder="نص القرار"
                      />
                      <button type="button" aria-label={`حذف القرار ${i + 1}`} onClick={() => setDecisions((rows) => rows.filter((r) => r.key !== d.key))} className="rounded-xl p-2.5 text-rose-500 transition hover:bg-rose-50">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-black text-navy"><ListChecks size={15} aria-hidden="true" />بنود العمل</h3>
                    <button type="button" onClick={() => setActions((a) => [...a, { key: nextKey(), title: '', assigned_to: '', due_date: '' }])} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-black text-navy transition hover:bg-slate-50">
                      <Plus size={13} aria-hidden="true" />
                      إضافة بند
                    </button>
                  </div>
                  {actions.length === 0 && <p className="rounded-2xl bg-paper px-4 py-3 text-xs font-bold text-muted-500">لم تُضف بنود عمل بعد (اختياري).</p>}
                  {actions.map((a, i) => (
                    <div key={a.key} className="space-y-3 rounded-2xl border border-line bg-white p-3">
                      <div className="flex items-center gap-2">
                        <input aria-label={`بند العمل ${i + 1}`} className={input} value={a.title} maxLength={255} onChange={(e) => updateAction(a.key, { title: e.target.value })} placeholder="وصف بند العمل" />
                        <button type="button" aria-label={`حذف بند العمل ${i + 1}`} onClick={() => setActions((rows) => rows.filter((r) => r.key !== a.key))} className="rounded-xl p-2.5 text-rose-500 transition hover:bg-rose-50">
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-[11px] font-black text-muted-500">
                          المسؤول
                          <select aria-label={`مسؤول بند العمل ${i + 1}`} className={input} value={a.assigned_to} onChange={(e) => updateAction(a.key, { assigned_to: e.target.value })}>
                            <option value="">— غير محدد —</option>
                            {candidates.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </label>
                        <EmcDatePicker label="موعد التنفيذ" layout="stacked" showPresets={false} value={a.due_date} onChange={(v) => updateAction(a.key, { due_date: v })} />
                      </div>
                    </div>
                  ))}
                </div>

                {label('الأعمال المطلوبة من الإدارة العليا', <textarea rows={3} className={input} value={form.executive_requests} onChange={(e) => setForm({ ...form, executive_requests: e.target.value })} />)}
                {label('مقترحات تطوير آلية العمل', <textarea rows={3} className={input} value={form.improvement_suggestions} onChange={(e) => setForm({ ...form, improvement_suggestions: e.target.value })} />)}
              </section>
            )}

            {tab === 'review' && (
              <section id="report-panel-review" role="tabpanel" aria-labelledby="report-tab-review" className="space-y-4" data-testid="report-review">
                <ul className="space-y-2">
                  {TABS.filter((t) => t.key !== 'review').map(({ key, label: text }) => (
                    <li key={key} className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
                      <span className="text-sm font-bold text-navy">{text}</span>
                      {done[key] ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700"><CheckCircle2 size={14} aria-hidden="true" />مكتمل</span>
                      ) : required[key] ? (
                        <button type="button" onClick={() => setTab(key)} className="inline-flex items-center gap-1.5 text-xs font-black text-accent-700 underline"><AlertCircle size={14} aria-hidden="true" />مطلوب — افتح القسم</button>
                      ) : (
                        <span className="text-xs font-bold text-muted-400">اختياري</span>
                      )}
                    </li>
                  ))}
                </ul>

                <dl className="grid gap-3 rounded-2xl border border-line bg-white p-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-[11px] font-bold text-muted-400">الحاضرون</dt><dd className="font-black text-navy">{candidates.length === 0 ? '—' : `${present.length} من ${candidates.length}`}</dd></div>
                  <div><dt className="text-[11px] font-bold text-muted-400">القرارات</dt><dd className="font-black text-navy">{decisions.filter((d) => d.title.trim()).length}</dd></div>
                  <div><dt className="text-[11px] font-bold text-muted-400">بنود العمل</dt><dd className="font-black text-navy">{actions.filter((a) => a.title.trim()).length}</dd></div>
                  <div><dt className="text-[11px] font-bold text-muted-400">التزام الفريق</dt><dd className="font-black text-navy">{form.team_commitment_score} / 5</dd></div>
                </dl>
                {form.completed_tasks_summary.trim() && (
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <h4 className="mb-1 text-[11px] font-black text-muted-500">الملخص</h4>
                    <p className="whitespace-pre-line text-sm leading-7 text-ink-500">{form.completed_tasks_summary}</p>
                  </div>
                )}
                <p className="rounded-2xl bg-accent-50 px-4 py-3 text-xs font-bold leading-6 text-accent-800">
                  راجع الأقسام ثم اضغط «رفع التقرير الرسمي». لا يمكن تعديل التقرير أو رفع تقرير آخر لهذا الاجتماع بعد ذلك.
                </p>
              </section>
            )}
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-line bg-white px-6 py-4">
            {duplicate ? (
              <>
                <span />
                <button type="button" onClick={onClose} className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-black text-white transition hover:bg-brand-600">
                  إغلاق
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-muted-600 transition hover:bg-slate-50 disabled:opacity-40">
                  إلغاء
                </button>
                {tab !== 'review' ? (
                  <button type="button" onClick={() => setTab(TABS[Math.min(TABS.length - 1, TABS.findIndex((t) => t.key === tab) + 1)].key)} className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-2.5 text-sm font-black text-brand-700 transition hover:bg-brand-100">
                    القسم التالي
                  </button>
                ) : (
                  <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-black text-white transition hover:bg-brand-600 disabled:opacity-60">
                    {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
                    {submitting ? 'جارٍ الرفع…' : 'رفع التقرير الرسمي'}
                  </button>
                )}
              </>
            )}
          </footer>
        </form>
      </div>
    </div>
  )
}
