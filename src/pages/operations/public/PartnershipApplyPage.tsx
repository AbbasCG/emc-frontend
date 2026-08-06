import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { Handshake } from 'lucide-react'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { submitPartnershipApplication } from '@/api/partnersApi'
import { getLaravelFieldErrors } from '@/api/apiErrors'
import CountrySelect, { type Country } from '@/components/forms/CountrySelect'

const ORG_TYPES: Array<{ value: string; label: string }> = [
  { value: 'academic', label: 'مؤسسة تعليمية' },
  { value: 'university_college', label: 'جامعة أو كلية' },
  { value: 'school', label: 'مدرسة' },
  { value: 'company', label: 'شركة' },
  { value: 'nonprofit', label: 'مؤسسة غير ربحية' },
  { value: 'government', label: 'جهة حكومية' },
  { value: 'community', label: 'مبادرة أو مجتمع' },
  { value: 'other', label: 'أخرى' },
]

const PARTNERSHIP_TYPES: Array<{ value: string; label: string }> = [
  { value: 'education_partnership', label: 'شراكة تعليمية' },
  { value: 'courses_workshops', label: 'تقديم دورات أو ورش' },
  { value: 'sponsorship', label: 'رعاية' },
  { value: 'media_marketing', label: 'تعاون إعلامي وتسويقي' },
  { value: 'trainers_experts', label: 'توفير مدربين أو خبراء' },
  { value: 'tech_partnership', label: 'شراكة تقنية' },
  { value: 'funding_support', label: 'دعم أو تمويل' },
  { value: 'other', label: 'أخرى' },
]

type FieldName =
  | 'partner_name' | 'type' | 'type_other' | 'contact_name' | 'email' | 'phone'
  | 'country' | 'city' | 'website' | 'partnership_type' | 'partnership_type_other'
  | 'message' | 'privacy_accepted'

type FormState = Record<Exclude<FieldName, 'privacy_accepted'>, string> & { privacy_accepted: boolean }

const INITIAL_STATE: FormState = {
  partner_name: '', type: '', type_other: '', contact_name: '', email: '', phone: '',
  country: '', city: '', website: '', partnership_type: '', partnership_type_other: '',
  message: '', privacy_accepted: false,
}

const inputCls =
  'rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold shadow-sm outline-none transition focus:border-customBlue focus:ring-2 focus:ring-customBlue/15'
const errorInputCls = 'border-red-300 focus:border-red-400 focus:ring-red-100'

function FieldError({ name, message }: { name: FieldName; message?: string }) {
  if (!message) return null
  return (
    <p id={`${name}-error`} role="alert" className="text-xs font-bold text-red-600">
      {message}
    </p>
  )
}

export default function PartnershipApplyPage() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [country, setCountry] = useState<Country | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [summaryError, setSummaryError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const fieldRefs = useRef<Partial<Record<FieldName, HTMLElement | null>>>({})

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear that field's error as soon as the user changes it.
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key as FieldName]
      return next
    })
  }

  function clientValidate(): Partial<Record<FieldName, string>> {
    const errs: Partial<Record<FieldName, string>> = {}
    if (form.partner_name.trim().length < 2) errs.partner_name = 'اسم المؤسسة مطلوب.'
    if (!form.type) errs.type = 'نوع المؤسسة مطلوب.'
    if (form.type === 'other' && !form.type_other.trim()) errs.type_other = 'يرجى توضيح نوع المؤسسة.'
    if (form.contact_name.trim().length < 2) errs.contact_name = 'اسم الشخص المسؤول مطلوب.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'صيغة البريد الإلكتروني غير صحيحة.'
    if (!form.phone.trim()) {
      errs.phone = 'رقم الجوال مطلوب.'
    } else {
      const parsed = parsePhoneNumberFromString(form.phone, country?.code as never)
      if (!parsed?.isValid()) errs.phone = 'رقم الجوال غير صالح — أدخل رقماً دولياً صحيحاً.'
    }
    if (!country) errs.country = 'الدولة مطلوبة.'
    if (form.website.trim() && !/^https?:\/\/.+\..+/.test(
      form.website.trim().startsWith('http') ? form.website.trim() : `https://${form.website.trim()}`,
    )) errs.website = 'رابط الموقع الإلكتروني غير صحيح.'
    if (!form.partnership_type) errs.partnership_type = 'نوع الشراكة المطلوبة مطلوب.'
    if (form.partnership_type === 'other' && !form.partnership_type_other.trim()) {
      errs.partnership_type_other = 'يرجى توضيح نوع الشراكة.'
    }
    if (form.message.trim().length < 10) errs.message = 'يرجى كتابة 10 أحرف على الأقل لوصف طلبكم.'
    if (!form.privacy_accepted) errs.privacy_accepted = 'يجب الموافقة على سياسة الخصوصية لإرسال الطلب.'
    return errs
  }

  function focusFirstError(errs: Partial<Record<FieldName, string>>) {
    const order: FieldName[] = [
      'partner_name', 'type', 'type_other', 'contact_name', 'email', 'phone', 'country',
      'website', 'partnership_type', 'partnership_type_other', 'message', 'privacy_accepted',
    ]
    const firstKey = order.find((k) => errs[k])
    if (firstKey) {
      const el = fieldRefs.current[firstKey]
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus()
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    setSummaryError('')

    const clientErrs = clientValidate()
    if (Object.keys(clientErrs).length > 0) {
      setFieldErrors(clientErrs)
      setSummaryError('يرجى مراجعة الحقول المحددة وتصحيح البيانات المطلوبة.')
      focusFirstError(clientErrs)
      return
    }

    const normalizedPhone = parsePhoneNumberFromString(form.phone, country?.code as never)?.number ?? form.phone

    setBusy(true)
    try {
      await submitPartnershipApplication({
        partner_name: form.partner_name.trim(),
        type: form.type,
        type_other: form.type === 'other' ? form.type_other.trim() : null,
        contact_name: form.contact_name.trim(),
        email: form.email.trim(),
        phone: normalizedPhone,
        country: country?.name ?? form.country,
        city: form.city.trim() || null,
        website: form.website.trim() || null,
        partnership_type: form.partnership_type,
        partnership_type_other: form.partnership_type === 'other' ? form.partnership_type_other.trim() : null,
        message: form.message.trim(),
        privacy_accepted: form.privacy_accepted,
      })
      setDone(true)
      setForm(INITIAL_STATE)
      setCountry(null)
      setFieldErrors({})
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        if (status === 422) {
          const backendErrs = getLaravelFieldErrors(err) as Partial<Record<FieldName, string>>
          setFieldErrors(backendErrs)
          setSummaryError('يرجى مراجعة الحقول المحددة وتصحيح البيانات المطلوبة.')
          focusFirstError(backendErrs)
        } else if (status === 429) {
          setSummaryError('تم إرسال عدد كبير من الطلبات. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى.')
        } else if (status && status >= 500) {
          setSummaryError('حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى لاحقًا.')
        } else if (!err.response) {
          setSummaryError('تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.')
        } else {
          setSummaryError('حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى لاحقًا.')
        }
      } else {
        setSummaryError('تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.')
      }
    } finally {
      setBusy(false)
    }
  }

  function fieldProps(name: FieldName) {
    return {
      'aria-invalid': Boolean(fieldErrors[name]) || undefined,
      'aria-describedby': fieldErrors[name] ? `${name}-error` : undefined,
    } as const
  }

  return (
    <div dir="rtl" className="mx-auto max-w-2xl px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[1.35rem] bg-gradient-to-bl from-white via-sky-50/30 to-white p-[1px] shadow-xl ring-1 ring-deepBlue/[0.08]"
      >
        <div className="rounded-[1.3rem] bg-white px-8 py-10 text-right">
          <Handshake className="text-customOrange" size={32} />
          <h1 className="mt-4 text-3xl font-black text-deepBlue">طلب شراكة مؤسسية</h1>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
            أخبرونا عن مؤسستكم ونوع الشراكة المقترحة، وسيتواصل معكم فريق EMC للمتابعة.
          </p>
        </div>
      </motion.div>

      <div className="mt-10">
        {done ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl bg-emerald-50 px-6 py-12 text-center text-lg font-black text-emerald-800 ring-1 ring-emerald-100"
          >
            تم إرسال طلب الشراكة بنجاح. سيتواصل معك فريق EMC بعد مراجعة الطلب.
          </motion.p>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-5 rounded-[1.35rem] bg-deepBlue/[0.02] p-8 ring-1 ring-deepBlue/[0.06]">
            {summaryError && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
                {summaryError}
              </p>
            )}

            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              اسم المؤسسة <span className="text-red-500">*</span>
              <input
                ref={(el) => { fieldRefs.current.partner_name = el }}
                value={form.partner_name}
                onChange={(e) => setField('partner_name', e.target.value)}
                required
                className={`${inputCls} ${fieldErrors.partner_name ? errorInputCls : ''}`}
                {...fieldProps('partner_name')}
              />
              <FieldError name="partner_name" message={fieldErrors.partner_name} />
            </label>

            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              نوع المؤسسة <span className="text-red-500">*</span>
              <select
                ref={(el) => { fieldRefs.current.type = el }}
                value={form.type}
                onChange={(e) => setField('type', e.target.value)}
                required
                className={`${inputCls} ${fieldErrors.type ? errorInputCls : ''}`}
                {...fieldProps('type')}
              >
                <option value="">— اختر —</option>
                {ORG_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <FieldError name="type" message={fieldErrors.type} />
            </label>

            {form.type === 'other' && (
              <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
                يرجى توضيح نوع المؤسسة <span className="text-red-500">*</span>
                <input
                  ref={(el) => { fieldRefs.current.type_other = el }}
                  value={form.type_other}
                  onChange={(e) => setField('type_other', e.target.value)}
                  className={`${inputCls} ${fieldErrors.type_other ? errorInputCls : ''}`}
                  {...fieldProps('type_other')}
                />
                <FieldError name="type_other" message={fieldErrors.type_other} />
              </label>
            )}

            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              اسم الشخص المسؤول <span className="text-red-500">*</span>
              <input
                ref={(el) => { fieldRefs.current.contact_name = el }}
                value={form.contact_name}
                onChange={(e) => setField('contact_name', e.target.value)}
                required
                className={`${inputCls} ${fieldErrors.contact_name ? errorInputCls : ''}`}
                {...fieldProps('contact_name')}
              />
              <FieldError name="contact_name" message={fieldErrors.contact_name} />
            </label>

            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              البريد الإلكتروني <span className="text-red-500">*</span>
              <input
                ref={(el) => { fieldRefs.current.email = el }}
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                required
                dir="ltr"
                className={`${inputCls} text-right ${fieldErrors.email ? errorInputCls : ''}`}
                {...fieldProps('email')}
              />
              <FieldError name="email" message={fieldErrors.email} />
            </label>

            <div className="grid gap-2 text-right text-sm font-black text-deepBlue">
              الدولة <span className="text-red-500">*</span>
              <CountrySelect
                value={country}
                onChange={(c) => { setCountry(c); setField('country', c.name) }}
                error={fieldErrors.country}
                instanceId="partnership-country"
              />
            </div>

            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              رقم الجوال <span className="text-red-500">*</span>
              <input
                ref={(el) => { fieldRefs.current.phone = el }}
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder={country ? `${country.dialCode} ...` : '+31 6 12345678'}
                dir="ltr"
                required
                className={`${inputCls} text-right ${fieldErrors.phone ? errorInputCls : ''}`}
                {...fieldProps('phone')}
              />
              <FieldError name="phone" message={fieldErrors.phone} />
            </label>

            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              المدينة <span className="text-xs font-semibold text-slate-400">(اختياري)</span>
              <input
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                className={inputCls}
              />
            </label>

            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              الموقع الإلكتروني <span className="text-xs font-semibold text-slate-400">(اختياري)</span>
              <input
                ref={(el) => { fieldRefs.current.website = el }}
                value={form.website}
                onChange={(e) => setField('website', e.target.value)}
                placeholder="example.com"
                dir="ltr"
                className={`${inputCls} text-right ${fieldErrors.website ? errorInputCls : ''}`}
                {...fieldProps('website')}
              />
              <FieldError name="website" message={fieldErrors.website} />
            </label>

            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              نوع الشراكة المطلوبة <span className="text-red-500">*</span>
              <select
                ref={(el) => { fieldRefs.current.partnership_type = el }}
                value={form.partnership_type}
                onChange={(e) => setField('partnership_type', e.target.value)}
                required
                className={`${inputCls} ${fieldErrors.partnership_type ? errorInputCls : ''}`}
                {...fieldProps('partnership_type')}
              >
                <option value="">— اختر —</option>
                {PARTNERSHIP_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <FieldError name="partnership_type" message={fieldErrors.partnership_type} />
            </label>

            {form.partnership_type === 'other' && (
              <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
                يرجى توضيح نوع الشراكة <span className="text-red-500">*</span>
                <input
                  ref={(el) => { fieldRefs.current.partnership_type_other = el }}
                  value={form.partnership_type_other}
                  onChange={(e) => setField('partnership_type_other', e.target.value)}
                  className={`${inputCls} ${fieldErrors.partnership_type_other ? errorInputCls : ''}`}
                  {...fieldProps('partnership_type_other')}
                />
                <FieldError name="partnership_type_other" message={fieldErrors.partnership_type_other} />
              </label>
            )}

            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              الرسالة أو المقترح <span className="text-red-500">*</span>
              <textarea
                ref={(el) => { fieldRefs.current.message = el }}
                value={form.message}
                onChange={(e) => setField('message', e.target.value)}
                required
                rows={5}
                className={`resize-none ${inputCls} ${fieldErrors.message ? errorInputCls : ''}`}
                {...fieldProps('message')}
              />
              <FieldError name="message" message={fieldErrors.message} />
            </label>

            <label className="flex items-start gap-3 text-right text-sm font-bold text-deepBlue">
              <input
                ref={(el) => { fieldRefs.current.privacy_accepted = el }}
                type="checkbox"
                checked={form.privacy_accepted}
                onChange={(e) => setField('privacy_accepted', e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-customBlue focus:ring-customBlue/30"
                {...fieldProps('privacy_accepted')}
              />
              <span>
                أوافق على <a href="/privacy" target="_blank" rel="noreferrer" className="text-customBlue underline">سياسة الخصوصية</a> الخاصة بمنصة EMC
                <span className="text-red-500"> *</span>
              </span>
            </label>
            <FieldError name="privacy_accepted" message={fieldErrors.privacy_accepted} />

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-customOrange py-3.5 text-sm font-black text-white shadow-lg transition disabled:opacity-60"
            >
              {busy && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
              )}
              {busy ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
