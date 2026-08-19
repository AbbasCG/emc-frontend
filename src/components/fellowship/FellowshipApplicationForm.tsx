import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { trackFunnelEvent, type FunnelEventProps } from '@/lib/funnelEvents'
import { submitPublicForm } from '@/api/formsApi'
import { toLatinDigits } from '@/utils/publicDetailFormat'

/**
 * EMC-WEB-001 §7.1(h) — the fellowship application.
 *
 * The fellowship is applied to, never sold, so this form asks only what a first
 * reading actually needs: who you are, how we reach you, where you stand, why you
 * are applying, and one link that proves it. Seven fields, each with a VISIBLE
 * label, native controls, inline Arabic validation, and a focus-visible ring.
 *
 * No boxes beyond the fields themselves (Design Language 2.0 keeps elevation for
 * form controls and modals only), no shadows, no emoji, no progress theatre.
 */

/**
 * SEAM — one constant away from live.
 *
 * `src/api` has no fellowship application endpoint. The application-shaped
 * endpoints that do exist (`/contact`, `/partnerships`, `/volunteers`,
 * `/ambassador-applications`) are each bound to a different programme and to a
 * different admin queue owned by the backend team, so posting a fellowship
 * applicant into one of them would corrupt their data.
 *
 * What DOES exist is the generic public-form endpoint `POST /forms/{slug}/submit`
 * (`submitPublicForm`, src/api/formsApi.ts). The only missing piece is an approved
 * slug for the fellowship form. Put it in the constant below and submissions go
 * live — nothing else in this file changes. Until then the applicant's confirmation
 * is local, and no fabricated destination is called.
 */
/* The assertion keeps the declared union at the call site below: a bare `= null`
   would let the compiler narrow the constant to `null` and make the POST below dead. */
const FELLOWSHIP_FORM_SLUG = null as string | null

async function submitFellowshipApplication(answers: Record<string, string>): Promise<void> {
  if (!FELLOWSHIP_FORM_SLUG) return
  await submitPublicForm(FELLOWSHIP_FORM_SLUG, answers)
}

/**
 * §7.1 analytics. `fellowship_apply` is not yet in the shared `FunnelEventName`
 * union (that file belongs to the analytics surface), so the name is widened to
 * `string` exactly once here instead of being cast at the call site. When the
 * union gains it, delete this alias and call `trackFunnelEvent` directly.
 */
const trackFellowship = trackFunnelEvent as (name: string, props?: FunnelEventProps) => void

/**
 * `track_origin` answers «من أين جاء المتقدّم؟» — the EMC track or campaign that
 * referred him, carried on the link as `?track=` (or `?utm_source=`). Read from the
 * URL at submit time: no effect, no state, no router dependency.
 */
function readTrackOrigin(): string {
  if (typeof window === 'undefined') return 'direct'
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('track') ?? params.get('utm_source') ?? ''
  return raw.trim() || 'direct'
}

type FieldName =
  | 'full_name'
  | 'email'
  | 'whatsapp'
  | 'country'
  | 'background'
  | 'motivation'
  | 'portfolio_url'

type FormState = Record<FieldName, string>

const INITIAL_FORM: FormState = {
  full_name: '',
  email: '',
  whatsapp: '',
  country: '',
  background: '',
  motivation: '',
  portfolio_url: '',
}

/** The options mirror §7.1(c) «من نقبل», plus an honest exit for everyone else. */
const BACKGROUNDS: Array<{ value: string; label: string }> = [
  { value: 'emc_track_graduate', label: 'خريج مسار من مسارات EMC' },
  { value: 'engineer_developer', label: 'مهندس أو مطوّر لديه ملف أعمال' },
  { value: 'graduate_researcher', label: 'طالب دراسات عليا أو باحث' },
  { value: 'other', label: 'خلفية أخرى' },
]

/** Enough to judge a motivation, short enough to write in one sitting. */
const MIN_MOTIVATION = 40

const FIELD_ORDER: FieldName[] = [
  'full_name',
  'email',
  'whatsapp',
  'country',
  'background',
  'motivation',
  'portfolio_url',
]

const LABEL_CLS = 'block text-sm font-black text-navy'
const HINT_CLS = 'mt-1 text-xs font-bold text-ink-400'
const CONTROL_CLS =
  'emc-focus-ring mt-3 w-full rounded-xl border bg-white px-4 text-sm font-bold text-navy outline-none transition duration-250 ease-emc placeholder:font-semibold placeholder:text-ink-300'
const CONTROL_OK = 'border-line focus:border-customBlue'
const CONTROL_ERROR = 'border-danger focus:border-danger'

function controlClass(hasError: boolean, extra = ''): string {
  return [CONTROL_CLS, hasError ? CONTROL_ERROR : CONTROL_OK, extra].filter(Boolean).join(' ')
}

function FieldError({ name, message }: { name: FieldName; message?: string }) {
  if (!message) return null
  return (
    <p id={`fellowship-${name}-error`} role="alert" className="mt-2 text-xs font-bold text-danger">
      {message}
    </p>
  )
}

export default function FellowshipApplicationForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [summaryError, setSummaryError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const fieldRefs = useRef<Partial<Record<FieldName, HTMLElement | null>>>({})
  const successRef = useRef<HTMLDivElement | null>(null)

  // The form is replaced by its confirmation, so focus has to move with it or the
  // keyboard user is dropped on <body>. DOM-only effect — it sets no state.
  useEffect(() => {
    if (done) successRef.current?.focus()
  }, [done])

  function setField(name: FieldName, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }))
    // The message disappears the moment you start correcting the field.
    setErrors((prev) => {
      if (!(name in prev)) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  function validate(state: FormState): Partial<Record<FieldName, string>> {
    const next: Partial<Record<FieldName, string>> = {}

    if (state.full_name.trim().length < 3) next.full_name = 'اكتب اسمك الكامل.'
    if (!/^\S+@\S+\.\S+$/.test(state.email.trim())) next.email = 'أدخل بريداً إلكترونياً صحيحاً.'

    const digits = state.whatsapp.replace(/\D/g, '')
    if (digits.length < 8) next.whatsapp = 'أدخل رقم واتساب صحيحاً بصيغة دولية.'

    if (state.country.trim().length < 2) next.country = 'اكتب اسم بلدك.'
    if (!state.background) next.background = 'اختر خلفيتك المهنية.'

    if (state.motivation.trim().length < MIN_MOTIVATION) {
      next.motivation = `اكتب سبب تقدّمك في ${toLatinDigits(MIN_MOTIVATION)} حرفاً على الأقل.`
    }

    const link = state.portfolio_url.trim()
    if (link && !/^https?:\/\/\S+\.\S+/.test(link)) {
      next.portfolio_url = 'أدخل رابطاً كاملاً يبدأ بـ https.'
    }

    return next
  }

  function focusFirstError(found: Partial<Record<FieldName, string>>) {
    const first = FIELD_ORDER.find((name) => found[name])
    if (!first) return
    const el = fieldRefs.current[first]
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.focus({ preventScroll: true })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setSummaryError('')
    const found = validate(form)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      setSummaryError('راجع الحقول المحدّدة أدناه، ثم أعد الإرسال.')
      focusFirstError(found)
      return
    }

    setBusy(true)
    const trackOrigin = readTrackOrigin()
    try {
      await submitFellowshipApplication({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp.trim(),
        country: form.country.trim(),
        background: form.background,
        motivation: form.motivation.trim(),
        portfolio_url: form.portfolio_url.trim(),
        track_origin: trackOrigin,
      })
      trackFellowship('fellowship_apply', { track_origin: trackOrigin })
      setForm(INITIAL_FORM)
      setErrors({})
      setDone(true)
    } catch {
      setSummaryError('تعذّر إرسال طلبك الآن. حاول مرة أخرى بعد قليل.')
    } finally {
      setBusy(false)
    }
  }

  function ariaProps(name: FieldName) {
    return {
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': errors[name] ? `fellowship-${name}-error` : undefined,
    } as const
  }

  if (done) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="emc-focus-ring mt-9 max-w-2xl outline-none"
      >
        <div aria-hidden className="emc-hairline" />
        <p className="mt-8 font-display text-xl font-black leading-relaxed text-navy sm:text-2xl">
          {`سنراجع طلبك ونعود إليك خلال ${toLatinDigits(7)} أيام بخطوة الاختبار التقني`}
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      aria-label="نموذج التقدّم لزمالة EMC"
      className="mt-9 max-w-2xl text-right"
    >
      <p className="text-xs font-bold text-ink-400">كل الحقول مطلوبة عدا ما وُسم بـ (اختياري).</p>

      {summaryError ?
        <p role="alert" className="mt-4 text-sm font-black text-danger">
          {summaryError}
        </p>
      : null}

      <div className="mt-7 grid gap-7">
        {/* الاسم الكامل */}
        <div>
          <label htmlFor="fellowship-full_name" className={LABEL_CLS}>
            الاسم الكامل
          </label>
          <input
            id="fellowship-full_name"
            ref={(el) => {
              fieldRefs.current.full_name = el
            }}
            value={form.full_name}
            onChange={(event) => setField('full_name', event.target.value)}
            autoComplete="name"
            className={controlClass(Boolean(errors.full_name), 'h-12')}
            {...ariaProps('full_name')}
          />
          <FieldError name="full_name" message={errors.full_name} />
        </div>

        {/* البريد الإلكتروني */}
        <div>
          <label htmlFor="fellowship-email" className={LABEL_CLS}>
            البريد الإلكتروني
          </label>
          <input
            id="fellowship-email"
            ref={(el) => {
              fieldRefs.current.email = el
            }}
            type="email"
            dir="ltr"
            value={form.email}
            onChange={(event) => setField('email', event.target.value)}
            autoComplete="email"
            placeholder="name@example.com"
            className={controlClass(Boolean(errors.email), 'h-12 text-right')}
            {...ariaProps('email')}
          />
          <FieldError name="email" message={errors.email} />
        </div>

        {/* رقم واتساب */}
        <div>
          <label htmlFor="fellowship-whatsapp" className={LABEL_CLS}>
            رقم واتساب
          </label>
          <p className={HINT_CLS}>بصيغة دولية، لأن خطوة الاختبار التقني تُنسَّق عبره.</p>
          <input
            id="fellowship-whatsapp"
            ref={(el) => {
              fieldRefs.current.whatsapp = el
            }}
            type="tel"
            dir="ltr"
            value={form.whatsapp}
            onChange={(event) => setField('whatsapp', event.target.value)}
            autoComplete="tel"
            placeholder="+31 6 12345678"
            className={controlClass(Boolean(errors.whatsapp), 'h-12 text-right')}
            {...ariaProps('whatsapp')}
          />
          <FieldError name="whatsapp" message={errors.whatsapp} />
        </div>

        {/* البلد */}
        <div>
          <label htmlFor="fellowship-country" className={LABEL_CLS}>
            البلد
          </label>
          <input
            id="fellowship-country"
            ref={(el) => {
              fieldRefs.current.country = el
            }}
            value={form.country}
            onChange={(event) => setField('country', event.target.value)}
            autoComplete="country-name"
            className={controlClass(Boolean(errors.country), 'h-12')}
            {...ariaProps('country')}
          />
          <FieldError name="country" message={errors.country} />
        </div>

        {/* الخلفية المهنية */}
        <div>
          <label htmlFor="fellowship-background" className={LABEL_CLS}>
            الخلفية المهنية
          </label>
          <select
            id="fellowship-background"
            ref={(el) => {
              fieldRefs.current.background = el
            }}
            value={form.background}
            onChange={(event) => setField('background', event.target.value)}
            className={controlClass(Boolean(errors.background), 'h-12')}
            {...ariaProps('background')}
          >
            <option value="">اختر خلفيتك</option>
            {BACKGROUNDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError name="background" message={errors.background} />
        </div>

        {/* لماذا تتقدم؟ */}
        <div>
          <label htmlFor="fellowship-motivation" className={LABEL_CLS}>
            لماذا تتقدم؟
          </label>
          <p className={HINT_CLS}>ما الذي تريد أن تنجزه في ستة عشر أسبوعاً، ولماذا الآن.</p>
          <textarea
            id="fellowship-motivation"
            ref={(el) => {
              fieldRefs.current.motivation = el
            }}
            rows={5}
            value={form.motivation}
            onChange={(event) => setField('motivation', event.target.value)}
            className={controlClass(Boolean(errors.motivation), 'resize-y py-3 leading-7')}
            {...ariaProps('motivation')}
          />
          <FieldError name="motivation" message={errors.motivation} />
        </div>

        {/* رابط GitHub أو السيرة a URL only: no upload endpoint exists for this form. */}
        <div>
          <label htmlFor="fellowship-portfolio_url" className={LABEL_CLS}>
            رابط GitHub أو السيرة <span className="text-xs font-bold text-ink-400">(اختياري)</span>
          </label>
          <p className={HINT_CLS}>رابط واحد يكفي: مستودع، أو ملف أعمال، أو سيرة منشورة.</p>
          <input
            id="fellowship-portfolio_url"
            ref={(el) => {
              fieldRefs.current.portfolio_url = el
            }}
            type="url"
            dir="ltr"
            value={form.portfolio_url}
            onChange={(event) => setField('portfolio_url', event.target.value)}
            autoComplete="url"
            placeholder="https://github.com/username"
            className={controlClass(Boolean(errors.portfolio_url), 'h-12 text-right')}
            {...ariaProps('portfolio_url')}
          />
          <FieldError name="portfolio_url" message={errors.portfolio_url} />
        </div>
      </div>

      {/* §1 the ONE primary action on this page, in the one place it is decided. */}
      <button
        type="submit"
        disabled={busy}
        className="emc-focus-ring mt-9 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-base font-black text-white transition duration-250 ease-emc hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {busy ? 'جارٍ الإرسال' : 'قدّم طلبك'}
        <ArrowLeftIcon size={18} />
      </button>
    </form>
  )
}
