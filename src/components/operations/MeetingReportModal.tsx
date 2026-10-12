import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import toast from '@/lib/toast'
import { describeMeetingError, submitMeetingReport } from '@/api/meetingsApi'
import type { OpsMeetingDetail } from '@/types/operations'

type Props = {
  meetingId: number
  meetingTitle?: string
  onClose: () => void
  /** The updated meeting (has_report: true) once the server confirms the report. */
  onSuccess: (meeting: OpsMeetingDetail) => void
  /** The server said this meeting already has its report: refresh the list behind. */
  onDuplicate?: () => void
}

const input =
  'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-navy outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15'

const STEPS = ['الانضباط والحضور', 'الإنجازات والتحديات', 'الطلبات والأهداف'] as const

/**
 * The meeting's ONE official report, in three short steps. It cannot be filed
 * twice: the server refuses a second report with a clear Arabic message, and
 * this form shows that message (and refreshes the list) instead of retrying.
 * An empty report is blocked here and on the server, because the report cannot
 * be replaced once filed.
 */
export default function MeetingReportModal({ meetingId, meetingTitle, onClose, onSuccess, onDuplicate }: Props) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState(false)
  const [form, setForm] = useState({
    absentees: '',
    team_commitment_score: 5,
    team_commitment_notes: '',
    completed_tasks_summary: '',
    kpi_percentage: 100,
    top_interactive_member: '',
    challenges: '',
    executive_requests: '',
    next_month_goals: '',
    improvement_suggestions: '',
  })

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, submitting])

  const hasContent = [form.completed_tasks_summary, form.challenges, form.executive_requests, form.next_month_goals, form.improvement_suggestions, form.team_commitment_notes]
    .some((v) => v.trim() !== '')

  // Enter inside a text field must move on, never file a half-written report.
  function blockEnter(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting || step !== 3) return

    if (!hasContent) {
      setError('أضف محتوى للتقرير قبل رفعه (إنجازات، تحديات، طلبات أو أهداف).')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const meeting = await submitMeetingReport(meetingId, {
        ...form,
        absentees: form.absentees.split(/[,،]/).map((s) => s.trim()).filter(Boolean),
      })
      toast.success('تم رفع تقرير الاجتماع')
      onSuccess(meeting)
    } catch (err) {
      const d = describeMeetingError(err, 'الاجتماع')
      if (d.kind === 'duplicate_report') {
        setDuplicate(true)
        onDuplicate?.()
      }
      const firstField = Object.values(d.fields)[0]
      setError(d.kind === 'validation' && firstField ? firstField : d.message)
    } finally {
      setSubmitting(false)
    }
  }

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
            <p className="mt-2 text-[11px] font-black text-accent-700">
              الخطوة {step} من 3 · {STEPS[step - 1]}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="إغلاق" className="rounded-xl p-2 text-muted-500 transition hover:bg-slate-100 disabled:opacity-40">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={(e) => void handleSubmit(e)} onKeyDown={blockEnter} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            <p className="rounded-2xl bg-brand-50 px-4 py-3 text-xs font-bold leading-6 text-brand-700">
              لكل اجتماع تقرير رسمي واحد فقط ولا يمكن استبداله بعد رفعه، ويصبح متاحًا لإدارة الجودة فور رفعه.
            </p>

            {error && (
              <p role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <label className="grid gap-2 text-xs font-black text-ink-500">
                  الأعضاء الغائبون (افصل بين الأسماء بفاصلة)
                  <input type="text" className={input} value={form.absentees} onChange={(e) => setForm({ ...form, absentees: e.target.value })} placeholder="أحمد، سارة…" />
                </label>
                <label className="grid gap-2 text-xs font-black text-ink-500">
                  مقياس التزام الفريق (من 1 إلى 5)
                  <input
                    type="range"
                    min={1}
                    max={5}
                    className="w-full accent-brand-500"
                    value={form.team_commitment_score}
                    onChange={(e) => setForm({ ...form, team_commitment_score: Number(e.target.value) })}
                  />
                  <span className="text-center text-sm font-black text-brand-600">{form.team_commitment_score} / 5</span>
                </label>
                <label className="grid gap-2 text-xs font-black text-ink-500">
                  ملاحظات حول الانضباط
                  <textarea rows={3} className={input} value={form.team_commitment_notes} onChange={(e) => setForm({ ...form, team_commitment_notes: e.target.value })} />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <label className="grid gap-2 text-xs font-black text-ink-500">
                  المهام التي أُنجزت خلال الفترة السابقة
                  <textarea rows={3} className={input} value={form.completed_tasks_summary} onChange={(e) => setForm({ ...form, completed_tasks_summary: e.target.value })} />
                </label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-black text-ink-500">
                    نسبة تحقيق الأهداف التشغيلية (%)
                    <input type="number" min={0} max={100} className={input} value={form.kpi_percentage} onChange={(e) => setForm({ ...form, kpi_percentage: Number(e.target.value) })} />
                  </label>
                  <label className="grid gap-2 text-xs font-black text-ink-500">
                    العضو الأكثر تفاعلًا وتميزًا
                    <input type="text" className={input} value={form.top_interactive_member} onChange={(e) => setForm({ ...form, top_interactive_member: e.target.value })} />
                  </label>
                </div>
                <label className="grid gap-2 text-xs font-black text-ink-500">
                  المشاكل والتحديات التي واجهت الإدارة
                  <textarea rows={3} className={input} value={form.challenges} onChange={(e) => setForm({ ...form, challenges: e.target.value })} />
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <label className="grid gap-2 text-xs font-black text-ink-500">
                  الأعمال المطلوبة من الإدارة العليا
                  <textarea rows={3} className={input} value={form.executive_requests} onChange={(e) => setForm({ ...form, executive_requests: e.target.value })} />
                </label>
                <label className="grid gap-2 text-xs font-black text-ink-500">
                  الأهداف التشغيلية للشهر القادم
                  <textarea rows={3} className={input} value={form.next_month_goals} onChange={(e) => setForm({ ...form, next_month_goals: e.target.value })} />
                </label>
                <label className="grid gap-2 text-xs font-black text-ink-500">
                  مقترحات تطوير آلية العمل
                  <textarea rows={3} className={input} value={form.improvement_suggestions} onChange={(e) => setForm({ ...form, improvement_suggestions: e.target.value })} />
                </label>
              </div>
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
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  disabled={step === 1 || submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-muted-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                  السابق
                </button>
                {step < 3 ? (
                  <button type="button" onClick={() => setStep((s) => Math.min(3, s + 1))} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-black text-white transition hover:bg-brand-600">
                    التالي
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                ) : (
                  <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-black text-white transition hover:bg-brand-600 disabled:opacity-60">
                    {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
                    {submitting ? 'جارٍ الرفع…' : 'رفع التقرير النهائي'}
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
