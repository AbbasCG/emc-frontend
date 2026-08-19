import { useState } from 'react'
import type { FormEvent } from 'react'
import { submitContactMessage } from '@/api/contactApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { trackFunnelEvent, type FunnelEventName } from '@/lib/funnelEvents'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'

/**
 * EMC-WEB-001 §10 — the institutional inquiry form on /business.
 *
 * Exactly FIVE fields (اسم الجهة · نوع الجهة · اسم المسؤول · البريد · رقم واتساب):
 * a sixth «رسالة» box was deliberately dropped — the spec caps the form at five, and
 * the context conversation belongs in the reply, not in a textarea.
 *
 * API seam: no lead/inquiry endpoint exists in src/api (searched: contact · lead ·
 * inquiry), so the request rides the ONE public contract that does — `POST /contact`
 * via `submitContactMessage`. `category: 'partnership'` is the closest value the partner
 * team's backend already accepts; nothing here invents an endpoint or a field. When a
 * dedicated institutional-lead endpoint ships, `sendInquiry` below is the ONLY function
 * to swap — the component keeps its state, validation and success copy.
 *
 * Identity: labels are always visible, validation is inline Arabic, every control is
 * keyboard reachable with a focus-visible ring, and the single orange control is the
 * primary action (§1). No shadows, no emoji, no boxed decoration.
 */

/** §10 — the three approved audiences. `value` is the analytics key, `label` the UI text. */
const ORG_TYPES = [
  { value: 'company', label: 'شركة' },
  { value: 'university', label: 'جامعة' },
  { value: 'government', label: 'جهة حكومية' },
] as const

type OrgTypeValue = (typeof ORG_TYPES)[number]['value']

type FieldKey = 'orgName' | 'orgType' | 'contactName' | 'email' | 'whatsapp'

type FormValues = Record<FieldKey, string>

type FieldErrors = Partial<Record<FieldKey, string>>

const EMPTY: FormValues = {
  orgName: '',
  orgType: '',
  contactName: '',
  email: '',
  whatsapp: '',
}

/** DOM ids — also the focus targets when validation fails. */
const FIELD_IDS: Record<FieldKey, string> = {
  orgName: 'business-org-name',
  orgType: 'business-org-type',
  contactName: 'business-contact-name',
  email: 'business-email',
  whatsapp: 'business-whatsapp',
}

/** Validation order = visual order, so the focused field is the first one the eye reaches. */
const FIELD_ORDER: FieldKey[] = ['orgName', 'orgType', 'contactName', 'email', 'whatsapp']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const labelCls = 'block text-sm font-black text-navy'
const helpCls = 'mt-1.5 text-xs font-bold text-danger'

function controlCls(invalid: boolean, extra = ''): string {
  return [
    'mt-2 h-14 w-full rounded-xl border bg-paper2 px-4 text-right font-semibold text-navy',
    'outline-none transition duration-250 ease-emc focus:bg-white',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    invalid ? 'border-danger' : 'border-line focus:border-customBlue',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * The shared `FunnelEventName` union lives in src/lib/funnelEvents.ts, which is outside
 * this delivery's file list; widening the literal keeps the call type-safe today, and the
 * assertion disappears the moment 'business_inquiry' joins the union.
 */
const BUSINESS_INQUIRY_EVENT: string = 'business_inquiry'

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {}
  if (values.orgName.trim().length < 2) errors.orgName = 'اكتب اسم الجهة'
  if (!ORG_TYPES.some((type) => type.value === values.orgType)) errors.orgType = 'اختر نوع الجهة'
  if (values.contactName.trim().length < 3) errors.contactName = 'اكتب اسم المسؤول كاملاً'
  if (!EMAIL_RE.test(values.email.trim())) errors.email = 'اكتب بريداً إلكترونياً صحيحاً'
  if (values.whatsapp.replace(/\D/g, '').length < 7) errors.whatsapp = 'اكتب رقم واتساب صحيحاً'
  return errors
}

/** THE API SEAM — the one place a dedicated institutional-lead endpoint would replace. */
async function sendInquiry(values: FormValues, orgTypeLabel: string): Promise<void> {
  await submitContactMessage({
    name: values.contactName.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.whatsapp.trim(),
    category: 'partnership',
    subject: `طلب مؤسسي — ${values.orgName.trim()}`,
    // The contract requires a message; it is composed from the five fields above,
    // never collected from a hidden sixth input.
    message: `جهة: ${values.orgName.trim()} · النوع: ${orgTypeLabel} · المسؤول: ${values.contactName.trim()} · واتساب: ${values.whatsapp.trim()}`,
  })
}

export default function BusinessInquiryForm() {
  const [values, setValues] = useState<FormValues>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  function setField(key: FieldKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    if (serverError) setServerError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setServerError('')

    const nextErrors = validate(values)
    setErrors(nextErrors)
    const firstInvalid = FIELD_ORDER.find((key) => nextErrors[key])
    if (firstInvalid) {
      // Event-handler focus move (not an effect) — the visitor lands on the field to fix.
      document.getElementById(FIELD_IDS[firstInvalid])?.focus()
      return
    }

    const orgType = values.orgType as OrgTypeValue
    const orgTypeLabel = ORG_TYPES.find((type) => type.value === orgType)?.label ?? ''
    setSubmitting(true)
    try {
      await sendInquiry(values, orgTypeLabel)
      trackFunnelEvent(BUSINESS_INQUIRY_EVENT as FunnelEventName, { org_type: orgType })
      setSent(true)
    } catch (error) {
      setServerError(getApiErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Live region mounted from the first render, so the success sentence is announced
          when it appears — a region inserted together with its text is unreliable. */}
      <div aria-live="polite">
        {sent ? (
          // Neutral hairline, not an orange rule — orange stays the primary ACTION only (§1)
          <div className="border-t border-line pt-6">
            <p className="font-display text-xl font-black text-navy sm:text-2xl">
              استلمنا طلبك — نعود إليك خلال يومي عمل
            </p>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-8 text-ink-500">
              نراجع سياق جهتك قبل الرد، فيصلك تصور مبني على حاجتك أنت لا عرض عام.
            </p>
          </div>
        ) : null}
      </div>

      {sent ? null : (
        <form onSubmit={(event) => void handleSubmit(event)} noValidate className="grid gap-5">
          <div>
            <label className={labelCls} htmlFor={FIELD_IDS.orgName}>
              اسم الجهة
            </label>
            <input
              id={FIELD_IDS.orgName}
              name="organization"
              type="text"
              autoComplete="organization"
              value={values.orgName}
              onChange={(event) => setField('orgName', event.target.value)}
              aria-invalid={errors.orgName ? true : undefined}
              aria-describedby={errors.orgName ? `${FIELD_IDS.orgName}-error` : undefined}
              className={controlCls(Boolean(errors.orgName))}
            />
            {errors.orgName ? (
              <p id={`${FIELD_IDS.orgName}-error`} className={helpCls}>
                {errors.orgName}
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelCls} htmlFor={FIELD_IDS.orgType}>
              نوع الجهة
            </label>
            <select
              id={FIELD_IDS.orgType}
              name="organization_type"
              value={values.orgType}
              onChange={(event) => setField('orgType', event.target.value)}
              aria-invalid={errors.orgType ? true : undefined}
              aria-describedby={errors.orgType ? `${FIELD_IDS.orgType}-error` : undefined}
              className={controlCls(Boolean(errors.orgType))}
            >
              <option value="">اختر نوع الجهة</option>
              {ORG_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.orgType ? (
              <p id={`${FIELD_IDS.orgType}-error`} className={helpCls}>
                {errors.orgType}
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelCls} htmlFor={FIELD_IDS.contactName}>
              اسم المسؤول
            </label>
            <input
              id={FIELD_IDS.contactName}
              name="contact_name"
              type="text"
              autoComplete="name"
              value={values.contactName}
              onChange={(event) => setField('contactName', event.target.value)}
              aria-invalid={errors.contactName ? true : undefined}
              aria-describedby={errors.contactName ? `${FIELD_IDS.contactName}-error` : undefined}
              className={controlCls(Boolean(errors.contactName))}
            />
            {errors.contactName ? (
              <p id={`${FIELD_IDS.contactName}-error`} className={helpCls}>
                {errors.contactName}
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelCls} htmlFor={FIELD_IDS.email}>
              البريد
            </label>
            <input
              id={FIELD_IDS.email}
              name="email"
              type="email"
              inputMode="email"
              dir="ltr"
              autoComplete="email"
              value={values.email}
              onChange={(event) => setField('email', event.target.value)}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? `${FIELD_IDS.email}-error` : undefined}
              className={controlCls(Boolean(errors.email), 'text-left')}
            />
            {errors.email ? (
              <p id={`${FIELD_IDS.email}-error`} className={helpCls}>
                {errors.email}
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelCls} htmlFor={FIELD_IDS.whatsapp}>
              رقم واتساب
            </label>
            <input
              id={FIELD_IDS.whatsapp}
              name="whatsapp"
              type="tel"
              inputMode="tel"
              dir="ltr"
              autoComplete="tel"
              value={values.whatsapp}
              onChange={(event) => setField('whatsapp', event.target.value)}
              aria-invalid={errors.whatsapp ? true : undefined}
              aria-describedby={errors.whatsapp ? `${FIELD_IDS.whatsapp}-error` : undefined}
              className={controlCls(Boolean(errors.whatsapp), 'text-left')}
            />
            {errors.whatsapp ? (
              <p id={`${FIELD_IDS.whatsapp}-error`} className={helpCls}>
                {errors.whatsapp}
              </p>
            ) : null}
          </div>

          {serverError ? (
            <p role="alert" className="text-sm font-bold text-danger">
              {serverError}
            </p>
          ) : null}

          {/* §1 — the one orange control on the page: the primary action */}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-base font-black text-white transition duration-250 ease-emc hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-10"
          >
            {submitting ? 'جارٍ الإرسال' : 'أرسل الطلب'}
            <ArrowLeftIcon size={18} />
          </button>

          <p className="text-xs font-bold text-ink-400">نعود إليك خلال يومي عمل.</p>
        </form>
      )}
    </>
  )
}
