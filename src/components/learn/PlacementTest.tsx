import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { trackFunnelEvent, type FunnelEventProps } from '@/lib/funnelEvents'
import { questions, recommend, type PlacementAnswers, type PlacementResult } from '@/data/placement'
import { toLatinDigits } from '@/utils/publicDetailFormat'

/**
 * EMC-WEB-001 §4 — «حدّد نقطة انطلاقك».
 *
 * Five questions, one at a time, then a result. Three laws shape it:
 *   • The result is FREE: it appears without an email, an account, or a payment.
 *     The email field below the result is optional and additive, never a gate.
 *   • Native radios in a `<fieldset>` with a visible `<legend>` — arrow keys,
 *     roving focus and screen-reader grouping come from the platform, not from
 *     a re-implementation.
 *   • Every count is a Latin numeral (§1) and every arrow is the shared inline
 *     `ArrowLeftIcon` (§1). No shadows, no emoji, no boxes except form fields.
 */

/**
 * §4 analytics. `placement_test_start` / `placement_test_complete` are not yet in
 * the shared `FunnelEventName` union (that file belongs to the analytics surface),
 * so the names are widened to `string` exactly once here instead of being cast at
 * each call site. When the union gains them, delete this alias and call
 * `trackFunnelEvent` directly — the call sites do not change.
 */
const trackPlacement = trackFunnelEvent as (name: string, props?: FunnelEventProps) => void

/**
 * SEAM — «أرسل النتيجة إلى بريدي» is deliberately not wired. When the endpoint is
 * published this body becomes the single call that sends `email` + the result;
 * nothing else in this component has to change.
 */
function sendResultByEmail(_email: string, _result: PlacementResult): void {
  // Intentionally not wired: no approved endpoint exists yet, and a fake
  // confirmation would be a promise the platform cannot keep.
}

export default function PlacementTest() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<PlacementAnswers>({})
  const [result, setResult] = useState<PlacementResult | null>(null)
  const [email, setEmail] = useState('')

  const question = questions[step]
  const total = questions.length
  const isLastQuestion = step === total - 1
  const currentAnswer = answers[question.id]

  function handleSelect(value: string) {
    // §4 — the funnel opens on the FIRST answer, not on page view.
    if (Object.keys(answers).length === 0) trackPlacement('placement_test_start')
    setAnswers({ ...answers, [question.id]: value })
  }

  function handleNext() {
    if (!currentAnswer) return
    if (!isLastQuestion) {
      setStep(step + 1)
      return
    }
    const outcome = recommend(answers)
    setResult(outcome)
    trackPlacement('placement_test_complete', {
      recommended_level: outcome.level,
      recommended_product: outcome.cta.href,
    })
  }

  function handleBack() {
    if (step > 0) setStep(step - 1)
  }

  function handleRestart() {
    setAnswers({})
    setResult(null)
    setStep(0)
    setEmail('')
  }

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!result) return
    sendResultByEmail(email, result)
  }

  return (
    <section id="placement" className="mt-16 scroll-mt-28 text-right">
      <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">حدّد نقطة انطلاقك</h2>
      <p className="mt-3 max-w-2xl text-sm font-semibold leading-8 text-ink-500">
        خمسة أسئلة قصيرة تنتهي بمحطة واحدة تناسبك. النتيجة تظهر لك مباشرة، دون بريد ودون حساب.
      </p>

      <div aria-hidden className="emc-hairline mt-8" />

      {result === null ? (
        <div className="mt-8 max-w-2xl">
          {/* Progress Latin numerals (§1) */}
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-xs font-black text-ocean">
              السؤال {toLatinDigits(step + 1)} من {toLatinDigits(total)}
            </p>
            <p className="text-xs font-bold text-ink-400">{question.name}</p>
          </div>
          <div aria-hidden className="mt-3 h-0.5 w-full bg-line">
            <div
              className="h-0.5 bg-ocean transition-all duration-250 ease-emc"
              style={{ width: `${((step + 1) / total) * 100}%` }}
            />
          </div>

          <fieldset className="mt-7">
            <legend className="font-display text-lg font-black leading-snug text-navy">
              {question.title}
            </legend>

            <div className="mt-5 grid gap-3">
              {question.options.map((option) => {
                const id = `placement-${question.id}-${option.value}`
                const checked = currentAnswer === option.value

                return (
                  <label
                    key={option.value}
                    htmlFor={id}
                    className={[
                      'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-bold transition duration-250 ease-emc',
                      checked
                        ? 'border-customBlue bg-brand-50 text-navy'
                        : 'border-line bg-white text-ink-500 hover:border-ice hover:bg-paper',
                    ].join(' ')}
                  >
                    <input
                      id={id}
                      type="radio"
                      name={`placement-${question.id}`}
                      value={option.value}
                      checked={checked}
                      onChange={() => handleSelect(option.value)}
                      className="emc-focus-ring h-4 w-4 shrink-0 accent-customBlue"
                    />
                    <span>{option.label}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleNext}
              disabled={!currentAnswer}
              className="emc-focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-8 text-sm font-black text-white transition duration-250 ease-emc hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {isLastQuestion ? 'اعرض نتيجتك' : 'التالي'}
              <ArrowLeftIcon size={16} />
            </button>
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="emc-focus-ring inline-flex h-12 w-full items-center justify-center rounded-xl border border-line px-8 text-sm font-black text-ink-500 transition duration-250 ease-emc hover:border-ice hover:text-navy sm:w-auto"
              >
                السابق
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 max-w-2xl" role="status" aria-live="polite">
          <p className="font-latin text-[11px] font-black tracking-[0.18em] text-ocean">
            {toLatinDigits(result.level)}
          </p>
          <h3 className="mt-2 font-display text-2xl font-black leading-snug text-navy">
            {result.title}
          </h3>
          <p className="mt-3 text-sm font-semibold leading-8 text-ink-500">{result.reason}</p>

          {/* §1 the ONE primary decision on this screen. */}
          <Link
            to={result.cta.href}
            className="emc-focus-ring mt-7 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-base font-black text-white transition duration-250 ease-emc hover:brightness-[1.03] sm:w-auto sm:px-10"
          >
            {result.cta.label}
            <ArrowLeftIcon size={18} />
          </Link>

          <div className="mt-6">
            <button type="button" onClick={handleRestart} className="emc-cta-line emc-focus-ring text-sm">
              أعد تحديد نقطة انطلاقك
              <ArrowLeftIcon size={14} />
            </button>
          </div>

          <div aria-hidden className="emc-hairline mt-10" />

          {/* Optional, additive the result above was already given in full. */}
          <form onSubmit={handleEmailSubmit} className="mt-8">
            <label htmlFor="placement-email" className="block text-sm font-black text-navy">
              أرسل النتيجة إلى بريدي
            </label>
            <p className="mt-1 text-xs font-bold text-ink-400">
              اختياري. نتيجتك ظاهرة أمامك كاملة، والبريد يحفظها لك فقط.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                id="placement-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                className="emc-focus-ring h-12 w-full rounded-xl border border-line bg-white px-4 text-sm font-bold text-navy outline-none transition duration-250 ease-emc placeholder:font-semibold placeholder:text-ink-300 focus:border-customBlue sm:max-w-sm"
              />
              <button
                type="submit"
                disabled={email.trim() === ''}
                className="emc-focus-ring inline-flex h-12 shrink-0 items-center justify-center rounded-xl border border-navy px-6 text-sm font-black text-navy transition duration-250 ease-emc hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                أرسل
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
