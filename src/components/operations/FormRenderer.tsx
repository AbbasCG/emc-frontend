import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { parseFormSubmitError } from '@/api/formsApi'
import QuestionField from './formBuilder/QuestionField'
import { visibility } from './formBuilder/formLogic'
import { answerSummary, shownSteps, splitSteps, visibleBlocks } from './formBuilder/formSteps'
import type { Step } from './formBuilder/formSteps'
import { initialValues, isEmptyAnswer, validateAll } from './formBuilder/formValidation'
import type { AnswerValue } from './formBuilder/formValidation'
import { isStructural } from './formBuilder/questionTypes'
import type { OpsFormDefinition } from '@/types/operations'

const REVIEW = 'review'

/** The index, among the steps being shown, of the first one that comes at or after a step that is no longer shown (the last one if none does). */
function nearestShown(all: Step[], shown: Step[], missing: string): number {
  const position = all.findIndex((s) => s.key === missing)
  if (position < 0) return 0
  const after = shown.findIndex((s) => all.findIndex((x) => x.key === s.key) >= position)

  return after >= 0 ? after : Math.max(0, shown.length - 1)
}

/**
 * The form as a respondent fills it in: its blocks in order, cut into steps at every step break, with the checks the server will
 * repeat. In `preview` it behaves the same (it validates, it moves between steps) but never sends anything.
 *
 *  - Visibility rules (formLogic) are evaluated as the person answers: a hidden question is not drawn, not checked, not sent, and a
 *    hidden step is skipped. The server decides again on submit; nothing here can unlock what a rule hides.
 *  - "Next" checks only the questions the person can see on that step. Nothing is sent until the very end: there is no such thing as
 *    a partly submitted response.
 *  - With the review step switched on (form.flow.review_step) the last stage lists every visible answer, each with a way back to
 *    its step, before the final send.
 */
export default function FormRenderer({
  form,
  onSubmitAnswers,
  preview = false,
}: {
  form: OpsFormDefinition
  /** Receives the answers keyed by question id. Rejects with the request's error when the server refuses them. */
  onSubmitAnswers: (answers: Record<string, unknown>) => Promise<void>
  /** Shows the form as respondents will see it, but sends nothing: for checking a draft before publishing. */
  preview?: boolean
}) {
  const questions = useMemo(() => form.questions.slice().sort((a, b) => a.sort_order - b.sort_order), [form.questions])
  const steps = useMemo(() => splitSteps(questions), [questions])
  const [values, setValues] = useState<Record<number, AnswerValue>>(() => initialValues(questions))
  const visible = useMemo(() => visibility(questions, values), [questions, values])
  const stages = useMemo(() => shownSteps(steps, visible), [steps, visible])

  const reviewOn = Boolean(form.flow?.review_step)
  const stageCount = Math.max(1, stages.length + (reviewOn ? 1 : 0))
  const [at, setAt] = useState<string>(() => shownSteps(splitSteps(questions), visibility(questions, initialValues(questions)))[0]?.key ?? 'first')
  const [done, setDone] = useState(false)
  const [checked, setChecked] = useState(false)
  const [err, setErr] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState(false)
  const top = useRef<HTMLDivElement>(null)
  const moved = useRef(false)

  // Where the person is. If the step they are on stops being shown (an earlier answer changed, or the preview was redrawn), they move
  // to the next step that is shown after it (or the last one) instead of being thrown back to the start.
  const found = at === REVIEW ? (reviewOn ? stages.length : -1) : stages.findIndex((s) => s.key === at)
  const current = Math.min(found >= 0 ? found : nearestShown(steps, stages, at), stageCount - 1)
  const onReview = reviewOn && current === stages.length
  const step: Step | null = onReview ? null : (stages[current] ?? null)
  const last = current === stageCount - 1
  const multi = stageCount > 1
  const titled = stages.some((s) => s.title !== '') || reviewOn

  useEffect(() => {
    if (!moved.current) return
    top.current?.focus()
    top.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
  }, [current])

  function setValue(id: number, value: AnswerValue) {
    setValues((v) => ({ ...v, [id]: value }))
    setChecked(false)
    if (fieldErrors[id]) setFieldErrors((e) => { const { [id]: _removed, ...rest } = e; return rest })
  }

  function goTo(index: number) {
    moved.current = true
    const i = Math.max(0, Math.min(index, stageCount - 1))
    setAt(reviewOn && i === stages.length ? REVIEW : (stages[i]?.key ?? 'first'))
  }

  /** The questions a person can see (and answer) on a step; structural blocks are drawn but never checked. */
  const answerable = (list: Step['blocks']) => list.filter((q) => visible[q.id] !== false && !isStructural(q.type))

  function next() {
    if (!step) return goTo(current + 1)
    const errors = validateAll(answerable(step.blocks), values)
    if (Object.keys(errors).length > 0) {
      setFieldErrors((e) => ({ ...e, ...errors }))
      setErr('راجع الحقول المحددة أدناه ثم تابع.')
      return
    }
    setErr('')
    goTo(current + 1)
  }

  /** The index of the first stage that holds one of these questions. */
  const stageOf = (errors: Record<number, string>): number => stages.findIndex((s) => s.blocks.some((q) => errors[q.id]))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!last) return next()
    setErr('')

    const local = validateAll(answerable(questions), values)
    if (Object.keys(local).length > 0) {
      setFieldErrors(local)
      setErr('راجع الحقول المحددة أدناه ثم أعد الإرسال.')
      const firstBad = stageOf(local)
      if (firstBad >= 0 && firstBad !== current) goTo(firstBad)
      return
    }
    setFieldErrors({})

    // A preview checks everything and stops here: no request is made.
    if (preview) {
      setChecked(true)
      return
    }

    setBusy(true)
    try {
      // Only what the person could see: a hidden question is not sent, whatever it held before it was hidden.
      const answers: Record<string, unknown> = {}
      questions.forEach((q) => {
        const v = values[q.id]
        if (!isStructural(q.type) && visible[q.id] !== false && !isEmptyAnswer(v)) answers[String(q.id)] = v
      })
      await onSubmitAnswers(answers)
      setDone(true)
    } catch (error) {
      const parsed = parseFormSubmitError(error)
      setErr(parsed.message)
      setFieldErrors(parsed.fieldErrors)
      const bad = stageOf(parsed.fieldErrors)
      if (bad >= 0 && bad !== current) goTo(bad)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        role="status"
        className="rounded-2xl bg-emerald-50 px-8 py-12 text-center font-black text-emerald-800 ring-1 ring-emerald-100"
      >
        تم استلام إجاباتك بنجاح شكراً لتعاونك مع EMC.
      </motion.div>
    )
  }

  const nameOf = (s: Step, i: number) => s.title || `الصفحة ${i + 1}`
  const submitLabel = busy ? 'جارٍ الإرسال...' : last ? (preview ? 'إرسال (معاينة)' : 'إرسال') : reviewOn && current === stages.length - 1 ? 'مراجعة الإجابات' : 'التالي'

  return (
    <form onSubmit={submit} noValidate className="space-y-6 rounded-[1.35rem] bg-white p-6 shadow-xl ring-1 ring-deepBlue/[0.06] sm:p-8" data-testid="form-renderer">
      {preview && (
        <p role="note" className="rounded-xl bg-amber-50 px-4 py-2 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-200">
          معاينة: هكذا سيراها المجيبون بعد النشر. الحقول تعمل والتحقق يعمل، لكن لا يُرسل شيء ولا تُسجَّل أي إجابة.
        </p>
      )}
      <div ref={top} tabIndex={-1} className="text-right outline-none">
        <h1 className="text-2xl font-black text-deepBlue">{form.title}</h1>
        {form.description && <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{form.description}</p>}
      </div>
      {multi && (
        <div className="space-y-2 text-right" aria-label="التقدم" data-testid="progress">
          <p className="text-xs font-black text-slate-500">الصفحة {current + 1} من {stageCount}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="presentation">
            <div className="h-full rounded-full bg-customBlue transition-all" style={{ width: `${((current + 1) / stageCount) * 100}%` }} />
          </div>
          {titled && (
            <ol aria-label="خطوات النموذج" className="flex flex-wrap gap-x-4 gap-y-1">
              {stages.map((s, i) => (
                <li key={s.key} aria-current={i === current ? 'step' : undefined} className={`text-[11px] font-black ${i === current ? 'text-customBlue' : i < current ? 'text-slate-700' : 'text-slate-400'} ${i === current ? '' : 'hidden sm:list-item'}`}>
                  {i + 1}. {nameOf(s, i)}
                </li>
              ))}
              {reviewOn && (
                <li aria-current={onReview ? 'step' : undefined} className={`text-[11px] font-black ${onReview ? 'text-customBlue' : 'hidden text-slate-400 sm:list-item'}`}>
                  {stages.length + 1}. المراجعة
                </li>
              )}
            </ol>
          )}
        </div>
      )}
      {err && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-right text-sm font-bold text-red-700">{err}</p>}

      {onReview ? (
        <section aria-label="مراجعة الإجابات" className="space-y-5 text-right" data-testid="review-step">
          <div>
            <h2 className="text-lg font-black text-deepBlue">راجع إجاباتك قبل الإرسال</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">تأكد من صحة إجاباتك. يمكنك الرجوع لتعديل أي خطوة، ولا يُرسل شيء قبل أن تضغط «إرسال».</p>
          </div>
          {stages.map((s, i) => {
            const rows = answerable(s.blocks)
            if (rows.length === 0) return null

            return (
              <div key={s.key} className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-deepBlue">{nameOf(s, i)}</h3>
                  <button type="button" onClick={() => goTo(i)} className="rounded-lg px-3 py-1 text-[11px] font-black text-customBlue ring-1 ring-customBlue/30 hover:bg-white" aria-label={`تعديل ${nameOf(s, i)}`}>
                    تعديل
                  </button>
                </div>
                <dl className="grid gap-2">
                  {rows.map((q) => {
                    const text = answerSummary(q, values[q.id])

                    return (
                      <div key={q.id} className="rounded-xl bg-white p-3 ring-1 ring-deepBlue/[0.05]">
                        <dt className="text-[11px] font-black text-slate-500">{q.label}</dt>
                        <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm font-semibold text-deepBlue">{text ?? <span className="text-slate-400">لم تُجب</span>}</dd>
                      </div>
                    )
                  })}
                </dl>
              </div>
            )
          })}
        </section>
      ) : (
        <div className="space-y-5">
          {step && step.title !== '' && (
            <div className="text-right" data-testid="step-heading">
              <h2 className="text-lg font-black text-deepBlue">{step.title}</h2>
              {step.description !== '' && <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">{step.description}</p>}
            </div>
          )}
          {step && step.title === '' && step.description !== '' && <p className="text-right text-sm font-semibold leading-relaxed text-slate-600">{step.description}</p>}
          {step && visibleBlocks(step, visible).map((q) => (
            <QuestionField key={q.id} q={q} fieldId={`q_${q.id}`} value={values[q.id]} onChange={(v) => setValue(q.id, v)} error={fieldErrors[q.id]} />
          ))}
        </div>
      )}

      {checked && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-2 text-right text-xs font-bold text-emerald-800">
          الإجابات المُدخلة صالحة. في النموذج المنشور كانت ستُرسل الآن؛ هنا لم يُرسل شيء.
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-xl bg-customBlue py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-60"
        >
          {submitLabel}
        </button>
        {current > 0 && (
          <button type="button" onClick={() => goTo(current - 1)} className="rounded-xl bg-white px-5 py-3.5 text-sm font-black text-deepBlue ring-1 ring-deepBlue/15 hover:bg-slate-50">
            السابق
          </button>
        )}
      </div>
    </form>
  )
}
