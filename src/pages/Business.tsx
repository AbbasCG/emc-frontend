import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import PublicSeo from '@/components/public/PublicSeo'
import { submitContactMessage } from '@/api/contactApi'
import { getApiErrorMessage } from '@/api/apiErrors'

/**
 * /business — §10 scaffolding for the organisations surface. No prices anywhere:
 * institutional pricing is quoted, never listed. The three audiences are named in
 * the approved catalogue, so they render as labelled slots here rather than as
 * invented segments.
 *
 * The form reuses the existing public contact contract (`POST /contact` via
 * `submitContactMessage`) — no endpoint is invented, and `partnership` is the
 * closest category the backend already accepts.
 */

const SLOT_NOTE = 'يُستكمل من الكتالوج المعتمد'

const AUDIENCE_SLOTS = [
  { id: 1, label: 'الجهة الأولى' },
  { id: 2, label: 'الجهة الثانية' },
  { id: 3, label: 'الجهة الثالثة' },
] as const

type FieldErrors = Partial<
  Record<'organization' | 'contactName' | 'email' | 'whatsapp' | 'need', string>
>

const labelCls = 'block text-sm font-black text-navy'
const inputCls = (invalid?: string) =>
  `mt-2 h-14 w-full rounded-xl border bg-paper2 px-4 text-right font-semibold text-navy outline-none transition duration-250 ease-emc focus:bg-white ${
    invalid ? 'border-danger' : 'border-line focus:border-customBlue'
  }`

export default function Business() {
  const [organization, setOrganization] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [need, setNeed] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState('')

  function clearError(key: keyof FieldErrors) {
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const next: FieldErrors = {}
    if (organization.trim().length < 2) next.organization = 'اسم الجهة مطلوب'
    if (contactName.trim().length < 3) next.contactName = 'اسم المسؤول مطلوب'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = 'أدخل بريداً مهنياً صحيحاً'
    if (whatsapp.replace(/[^\d]/g, '').length < 7) next.whatsapp = 'أدخل رقم واتساب صحيحاً'
    if (need.trim().length < 10) next.need = 'اكتب وصفاً موجزاً لحاجة فريقك'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setServerError('')
    if (!validate()) return
    setSubmitting(true)
    try {
      await submitContactMessage({
        name: contactName.trim(),
        email: email.trim().toLowerCase(),
        phone: whatsapp.trim(),
        category: 'partnership',
        subject: `طلب تدريب مؤسسي — ${organization.trim()}`,
        message: need.trim(),
      })
      setSent(true)
    } catch (err) {
      setServerError(getApiErrorMessage(err) || 'تعذر إرسال الطلب. أعد المحاولة.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main dir="rtl" className="bg-white pb-24">
      <PublicSeo
        title="EMC للمؤسسات"
        description="برامج EMC للمؤسسات: تدريب مصمم على حاجة فريقك، بعرض مخصص بعد فهم السياق."
        path="/business"
      />

      {/* Dark selective header — sea family only */}
      <header className="emc-depth pt-28">
        <div className="mx-auto w-full max-w-4xl px-4 pb-14 text-right sm:px-6">
          <p className="text-xs font-black text-ice">للمؤسسات</p>
          <h1 className="mt-3 font-display text-3xl font-black leading-tight text-white sm:text-4xl">
            تدريب مصمم على حاجة فريقك
          </h1>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-ice">
            اكتب لنا سياق فريقك، ونعود إليك بعرض مبني على حاجته.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        {/* ── الجهات التي نعمل معها ─────────────────────────────────────── */}
        <section className="pt-14">
          <h2 className="text-right font-display text-2xl font-black text-navy">
            الجهات التي نعمل معها
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {AUDIENCE_SLOTS.map((audience) => (
              <li key={audience.id} className="rounded-2xl border border-line bg-white p-5 text-right">
                <span className="text-sm font-black tabular-nums text-customBlue">
                  {String(audience.id)}
                </span>
                <h3 className="mt-2 text-base font-black text-navy">{audience.label}</h3>
                {/* Official audience name + description — labelled slot, never invented */}
                <p className="mt-2 text-xs font-bold text-muted-400">{SLOT_NOTE}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── نموذج التواصل ─────────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-right font-display text-2xl font-black text-navy">تحدث إلينا</h2>
          <p className="mt-3 text-right text-sm font-semibold leading-7 text-ink-500">
            نعود إليك خلال يومي عمل.
          </p>

          {sent ? (
            <div
              aria-live="polite"
              className="mt-6 rounded-2xl border border-ocean/30 bg-brand-50 p-5 text-right sm:p-6"
            >
              <p className="text-sm font-black text-navy">وصلنا طلبك</p>
              <p className="mt-2 text-sm font-semibold leading-7 text-ink-500">
                نعود إليك خلال يومي عمل على البريد والرقم اللذين كتبتهما.
              </p>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 grid gap-5">
              <div>
                <label className={labelCls} htmlFor="business-organization">
                  اسم الجهة
                </label>
                <input
                  id="business-organization"
                  value={organization}
                  onChange={(e) => {
                    setOrganization(e.target.value)
                    clearError('organization')
                  }}
                  className={inputCls(errors.organization)}
                />
                {errors.organization ? (
                  <p className="mt-1.5 text-xs font-bold text-danger">{errors.organization}</p>
                ) : null}
              </div>

              <div>
                <label className={labelCls} htmlFor="business-contact-name">
                  اسم المسؤول
                </label>
                <input
                  id="business-contact-name"
                  value={contactName}
                  autoComplete="name"
                  onChange={(e) => {
                    setContactName(e.target.value)
                    clearError('contactName')
                  }}
                  className={inputCls(errors.contactName)}
                />
                {errors.contactName ? (
                  <p className="mt-1.5 text-xs font-bold text-danger">{errors.contactName}</p>
                ) : null}
              </div>

              <div>
                <label className={labelCls} htmlFor="business-email">
                  البريد المهني
                </label>
                <input
                  id="business-email"
                  type="email"
                  dir="ltr"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearError('email')
                  }}
                  className={`${inputCls(errors.email)} text-left`}
                />
                {errors.email ? (
                  <p className="mt-1.5 text-xs font-bold text-danger">{errors.email}</p>
                ) : null}
              </div>

              <div>
                <label className={labelCls} htmlFor="business-whatsapp">
                  رقم واتساب
                </label>
                <input
                  id="business-whatsapp"
                  type="tel"
                  dir="ltr"
                  value={whatsapp}
                  autoComplete="tel"
                  onChange={(e) => {
                    setWhatsapp(e.target.value)
                    clearError('whatsapp')
                  }}
                  className={`${inputCls(errors.whatsapp)} text-left`}
                />
                {errors.whatsapp ? (
                  <p className="mt-1.5 text-xs font-bold text-danger">{errors.whatsapp}</p>
                ) : null}
              </div>

              <div>
                <label className={labelCls} htmlFor="business-need">
                  وصف الحاجة
                </label>
                <textarea
                  id="business-need"
                  rows={5}
                  value={need}
                  onChange={(e) => {
                    setNeed(e.target.value)
                    clearError('need')
                  }}
                  className={`mt-2 w-full resize-none rounded-xl border bg-paper2 px-4 py-3 text-right font-semibold text-navy outline-none transition duration-250 ease-emc focus:bg-white ${
                    errors.need ? 'border-danger' : 'border-line focus:border-customBlue'
                  }`}
                />
                {errors.need ? (
                  <p className="mt-1.5 text-xs font-bold text-danger">{errors.need}</p>
                ) : null}
              </div>

              {serverError ? (
                <p className="text-sm font-bold text-danger">{serverError}</p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="emc-focus-ring inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-base font-black text-white transition duration-250 ease-emc hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-10"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" aria-hidden /> : null}
                أرسل الطلب
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
