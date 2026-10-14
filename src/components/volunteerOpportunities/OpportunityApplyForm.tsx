import { cloneElement, isValidElement, useId, useRef, useState, type ReactElement } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { getLaravelFieldErrors } from '@/api/apiErrors'
import {
  applyToOpportunity,
  classifyOpportunityError,
  opportunityErrorMessage,
  type ApplicationInput,
} from '@/api/volunteerOpportunitiesApi'
import { AVAILABILITY_OPTIONS, EXPERIENCE_LEVELS } from './opportunityUi'

const FIELD = 'w-full rounded-xl border border-line bg-paper2 px-4 py-3 text-right text-sm font-semibold text-deepBlue outline-none transition placeholder:text-muted-400 focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-brand-100'

const EMPTY: ApplicationInput = {
  fullName: '', email: '', phone: '', country: '', city: '', gender: '', experienceLevel: '', availability: '', skills: '', previousExperience: '', motivation: '', agreeTerms: false,
}

// API error keys -> the form fields they belong to.
const FIELD_KEYS: Record<string, keyof ApplicationInput> = {
  full_name: 'fullName', email: 'email', phone: 'phone', country: 'country', city: 'city', gender: 'gender', experience_level: 'experienceLevel',
  availability: 'availability', skills: 'skills', previous_experience: 'previousExperience', motivation: 'motivation', agree_terms: 'agreeTerms',
}

type ControlProps = { 'aria-invalid'?: boolean; 'aria-describedby'?: string; 'aria-required'?: boolean }

/** One labelled control. A failed field is marked invalid and tied to its message for assistive technology. */
function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: ReactElement<ControlProps> }) {
  const errorId = useId()
  const control = isValidElement(children)
    ? cloneElement(children, { 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? errorId : undefined, 'aria-required': required ? true : undefined })
    : children

  return (
    <label className="block text-right">
      <span className="mb-1.5 block text-sm font-black text-deepBlue">{label}{required ? <span className="me-1 text-red-500"> *</span> : null}</span>
      {control}
      {error ? <span id={errorId} role="alert" className="mt-1.5 block text-[12px] font-bold text-red-600">{error}</span> : null}
    </label>
  )
}

/**
 * Apply to one opportunity. It collects only what HR needs to review a volunteer (no file upload,
 * no account creation) and posts to the opportunity's own application endpoint, so the application
 * is tied to the opportunity, and through it to the request it came from, by the server.
 * `initial` pre-fills the name and email of a signed-in visitor.
 */
export function OpportunityApplyForm({ opportunityId, initial }: { opportunityId: number; initial?: Partial<Pick<ApplicationInput, 'fullName' | 'email'>> }) {
  const [form, setForm] = useState<ApplicationInput>({ ...EMPTY, ...initial })
  const [errors, setErrors] = useState<Partial<Record<keyof ApplicationInput, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const set =<K extends keyof ApplicationInput>(k: K, v: ApplicationInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  function clientErrors(): Partial<Record<keyof ApplicationInput, string>> {
    const e: Partial<Record<keyof ApplicationInput, string>> = {}
    if (form.fullName.trim().length < 3) e.fullName = 'الاسم الكامل مطلوب.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'أدخل بريدًا إلكترونيًا صالحًا.'
    if (!form.phone.trim()) e.phone = 'رقم الجوال مطلوب.'
    if (!form.country.trim()) e.country = 'الدولة مطلوبة.'
    if (!form.city.trim()) e.city = 'المدينة مطلوبة.'
    if (!form.gender) e.gender = 'اختر الجنس.'
    if (!form.experienceLevel) e.experienceLevel = 'اختر مستوى الخبرة.'
    if (!form.availability) e.availability = 'اختر مدى توفرك.'
    if (form.motivation.trim().length < 20) e.motivation = 'اكتب 20 حرفًا على الأقل في سبب التطوع.'
    if (!form.agreeTerms) e.agreeTerms = 'يجب الموافقة على الشروط للمتابعة.'
    return e
  }

  // After the errors render, move the keyboard/screen-reader focus to the first field that failed.
  const focusFirstInvalid = () => requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setFormError(null)
    const local = clientErrors()
    setErrors(local)
    if (Object.keys(local).length > 0) {
      focusFirstInvalid()
      return
    }

    setBusy(true)
    try {
      setDone(await applyToOpportunity(opportunityId, form))
    } catch (err) {
      const kind = classifyOpportunityError(err)
      if (kind === 'validation') {
        const mapped: Partial<Record<keyof ApplicationInput, string>> = {}
        for (const [k, msg] of Object.entries(getLaravelFieldErrors(err))) {
          const key = FIELD_KEYS[k]
          if (key) mapped[key] = msg
        }
        setErrors(mapped)
        setFormError('راجع الحقول المحدَّدة وأعد المحاولة.')
        focusFirstInvalid()
      } else if (kind === 'closed_or_duplicate') setFormError(opportunityErrorMessage(err, 'تعذّر قبول الطلب.'))
      else if (kind === 'rate_limited') setFormError('أرسلت طلبات كثيرة خلال وقت قصير. انتظر دقيقة ثم حاول مجددًا.')
      else if (kind === 'not_found') setFormError('هذه الفرصة لم تعد متاحة.')
      else setFormError('تعذّر إرسال الطلب. تحقق من اتصالك وحاول مجددًا.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div role="status" data-testid="apply-success" className="rounded-3xl bg-emerald-50 p-8 text-center ring-1 ring-emerald-200">
        <CheckCircle2 size={40} className="mx-auto text-emerald-600" aria-hidden="true" />
        <h3 className="mt-3 text-lg font-black text-emerald-900">تم استلام طلبك</h3>
        <p className="mt-2 text-sm font-semibold leading-7 text-emerald-900/80">{done}</p>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={(e) => void submit(e)} noValidate className="space-y-5 rounded-3xl bg-white p-6 shadow-emc-md ring-1 ring-line sm:p-8" aria-label="نموذج التقديم على الفرصة">
      <h2 className="text-xl font-black text-deepBlue">قدّم على هذه الفرصة</h2>
      {formError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{formError}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم الكامل" error={errors.fullName} required><input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} className={FIELD} aria-label="الاسم الكامل" autoComplete="name" /></Field>
        <Field label="البريد الإلكتروني" error={errors.email} required><input type="email" dir="ltr" value={form.email} onChange={(e) => set('email', e.target.value)} className={FIELD} aria-label="البريد الإلكتروني" autoComplete="email" /></Field>
        <Field label="رقم الجوال" error={errors.phone} required><input type="tel" dir="ltr" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={FIELD} aria-label="رقم الجوال" autoComplete="tel" /></Field>
        <Field label="الجنس" error={errors.gender} required>
          <select value={form.gender} onChange={(e) => set('gender', e.target.value as ApplicationInput['gender'])} className={FIELD} aria-label="الجنس">
            <option value="">اختر</option><option value="male">ذكر</option><option value="female">أنثى</option>
          </select>
        </Field>
        <Field label="الدولة" error={errors.country} required><input value={form.country} onChange={(e) => set('country', e.target.value)} className={FIELD} aria-label="الدولة" autoComplete="country-name" /></Field>
        <Field label="المدينة" error={errors.city} required><input value={form.city} onChange={(e) => set('city', e.target.value)} className={FIELD} aria-label="المدينة" autoComplete="address-level2" /></Field>
        <Field label="مستوى الخبرة" error={errors.experienceLevel} required>
          <select value={form.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)} className={FIELD} aria-label="مستوى الخبرة">
            <option value="">اختر</option>{EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="التوفر" error={errors.availability} required>
          <select value={form.availability} onChange={(e) => set('availability', e.target.value)} className={FIELD} aria-label="التوفر">
            <option value="">اختر</option>{AVAILABILITY_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
      </div>

      <Field label="مهاراتك" error={errors.skills}><textarea rows={2} value={form.skills} onChange={(e) => set('skills', e.target.value)} className={FIELD} aria-label="مهاراتك" placeholder="مثال: تصميم جرافيك، كتابة محتوى" /></Field>
      <Field label="خبراتك السابقة" error={errors.previousExperience}><textarea rows={3} value={form.previousExperience} onChange={(e) => set('previousExperience', e.target.value)} className={FIELD} aria-label="خبراتك السابقة" /></Field>
      <Field label="لماذا ترغب في التطوع؟" error={errors.motivation} required><textarea rows={4} value={form.motivation} onChange={(e) => set('motivation', e.target.value)} className={FIELD} aria-label="لماذا ترغب في التطوع" /></Field>

      <label className="flex items-start gap-3 text-right text-sm font-bold text-deepBlue">
        <input type="checkbox" checked={form.agreeTerms} onChange={(e) => set('agreeTerms', e.target.checked)} className="mt-1 h-4 w-4 rounded border-line accent-customBlue" aria-label="أوافق على الشروط" aria-required="true" aria-invalid={errors.agreeTerms ? true : undefined} aria-describedby={errors.agreeTerms ? 'agree-terms-error' : undefined} />
        <span>أوافق على استخدام بياناتي لمراجعة طلب التطوع والتواصل معي.{errors.agreeTerms ? <span id="agree-terms-error" role="alert"className="mt-1 block text-[12px] font-bold text-red-600">{errors.agreeTerms}</span> : null}</span>
      </label>

      <button type="submit" disabled={busy} aria-busy={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-customOrange px-6 py-3.5 text-sm font-extrabold text-white shadow-emc-md transition hover:brightness-105 disabled:opacity-60 sm:w-auto">
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
        إرسال الطلب
      </button>
    </form>
  )
}
