import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'
import { getLaravelFieldErrors } from '@/api/apiErrors'
import {
  classifyIncomingError,
  incomingErrorMessage,
  type OpportunityDraft,
  type OpportunityDraftInput,
} from '@/api/hrIncomingRequestsApi'
import { linesToList, listToLines } from './hrIncomingUi'

const FIELD = 'w-full rounded-xl border border-deepBlue/10 bg-white px-3 py-2.5 text-sm font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:ring-2 focus:ring-customBlue/15'

type Form = {
  title: string
  summary: string
  responsibilities: string
  requiredSkills: string
  preferredSkills: string
  volunteersNeeded: string
  availability: string
  duration: string
  locationMode: string
  startDate: string
  closesAt: string
  applicationInstructions: string
  departmentId: string
}

function toForm(d: OpportunityDraft): Form {
  return {
    title: d.title,
    summary: d.summary,
    responsibilities: listToLines(d.responsibilities),
    requiredSkills: listToLines(d.requiredSkills),
    preferredSkills: listToLines(d.preferredSkills),
    volunteersNeeded: d.volunteersNeeded == null ? '' : String(d.volunteersNeeded),
    availability: d.availability,
    duration: d.duration,
    locationMode: d.locationMode,
    startDate: d.startDate,
    closesAt: d.closesAt,
    applicationInstructions: d.applicationInstructions,
    departmentId: d.departmentId == null ? '' : String(d.departmentId),
  }
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-black text-deepBlue/70">{label}</span>
      {children}
      {hint && !error ? <span className="block text-[11px] font-semibold text-deepBlue/45">{hint}</span> : null}
      {error ? <span role="alert" className="block text-[11px] font-bold text-red-700">{error}</span> : null}
    </label>
  )
}

/**
 * «مراجعة مسودة الفرصة» — the form HR uses to review and edit an opportunity before it is published.
 *
 * It saves through `onSubmit` and never publishes: publishing is a separate, explicit action on the
 * opportunity. It serves both the opportunity generated from an incoming request (pre-filled, the
 * department fixed to the request's) and an opportunity created on its own (`departments` given,
 * so the department can be chosen).
 */
export function OpportunityDraftModal({
  open,
  initial,
  title = 'مراجعة مسودة الفرصة',
  subtitle = 'راجع البيانات المقترحة وعدّلها. تُحفظ كمسودة ولا تُنشر للعامة إلا بإجراء نشر صريح.',
  departments,
  onSubmit,
  onClose,
  onSaved,
}: {
  open: boolean
  initial: OpportunityDraft
  title?: string
  subtitle?: string
  departments?: { id: number; name: string }[]
  onSubmit: (input: OpportunityDraftInput) => Promise<OpportunityDraft>
  onClose: () => void
  onSaved: (draft: OpportunityDraft) => void
}) {
  const [form, setForm] = useState<Form>(() => toForm(initial))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true)
    setErrors({})
    setFormError(null)

    const input: OpportunityDraftInput = {
      title: form.title,
      summary: form.summary,
      responsibilities: linesToList(form.responsibilities),
      requiredSkills: linesToList(form.requiredSkills, true),
      preferredSkills: linesToList(form.preferredSkills, true),
      volunteersNeeded: form.volunteersNeeded.trim() === '' ? null : Number(form.volunteersNeeded),
      availability: form.availability,
      duration: form.duration,
      locationMode: form.locationMode,
      startDate: form.startDate,
      closesAt: form.closesAt,
      applicationInstructions: form.applicationInstructions,
      departmentId: departments ? (form.departmentId ? Number(form.departmentId) : null) : initial.departmentId,
    }

    try {
      onSaved(await onSubmit(input))
    } catch (e) {
      const kind = classifyIncomingError(e)
      if (kind === 'validation') {
        setErrors(getLaravelFieldErrors(e))
        setFormError(incomingErrorMessage(e, 'راجع الحقول المحدَّدة.'))
      } else if (kind === 'forbidden') setFormError('لا تملك صلاحية حفظ الفرصة.')
      else if (kind === 'conflict') setFormError(incomingErrorMessage(e, 'توجد مسودة لهذا الطلب بالفعل.'))
      else setFormError(incomingErrorMessage(e, 'تعذّر الحفظ. حاول مرة أخرى.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <CrudModal
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      widthClassName="max-w-2xl"
      footerSlot={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:brightness-105 disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
            حفظ كمسودة
          </button>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-deepBlue/10 bg-white px-5 py-2.5 text-sm font-black text-deepBlue">إلغاء</button>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); void save() }} className="space-y-4" noValidate>
        {formError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">{formError}</p> : null}

        <Field label="العنوان" error={errors.title}>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} className={FIELD} aria-label="العنوان" />
        </Field>

        <Field label="الوصف المختصر" error={errors.summary}>
          <textarea value={form.summary} onChange={(e) => set('summary', e.target.value)} rows={3} className={FIELD} aria-label="الوصف المختصر" />
        </Field>

        <Field label="المهام والمسؤوليات" error={errors.responsibilities} hint="اكتب كل مهمة في سطر.">
          <textarea value={form.responsibilities} onChange={(e) => set('responsibilities', e.target.value)} rows={4} className={FIELD} aria-label="المهام والمسؤوليات" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="المهارات المطلوبة" error={errors.required_skills} hint="مهارة في كل سطر.">
            <textarea value={form.requiredSkills} onChange={(e) => set('requiredSkills', e.target.value)} rows={4} className={FIELD} aria-label="المهارات المطلوبة" />
          </Field>
          <Field label="مهارات مفضّلة" error={errors.preferred_skills} hint="اختياري.">
            <textarea value={form.preferredSkills} onChange={(e) => set('preferredSkills', e.target.value)} rows={4} className={FIELD} aria-label="مهارات مفضلة" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="العدد المطلوب" error={errors.volunteers_needed}>
            <input type="number" min={1} value={form.volunteersNeeded} onChange={(e) => set('volunteersNeeded', e.target.value)} className={FIELD} aria-label="العدد المطلوب" />
          </Field>
          <Field label="نمط العمل" error={errors.location_mode}>
            <select value={form.locationMode} onChange={(e) => set('locationMode', e.target.value)} className={FIELD} aria-label="نمط العمل">
              <option value="">غير محدد</option>
              <option value="remote">عن بُعد</option>
              <option value="onsite">حضوري</option>
              <option value="hybrid">مختلط</option>
            </select>
          </Field>
          <Field label="تاريخ البدء" error={errors.start_date}>
            <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={FIELD} aria-label="تاريخ البدء" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="التوفر / الساعات" error={errors.availability}>
            <input value={form.availability} onChange={(e) => set('availability', e.target.value)} placeholder="مثال: 8 ساعات أسبوعيًا" className={FIELD} aria-label="التوفر والساعات" />
          </Field>
          <Field label="المدة" error={errors.duration}>
            <input value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="مثال: 3 أشهر" className={FIELD} aria-label="المدة" />
          </Field>
          <Field label="آخر موعد للتقديم" error={errors.closes_at} hint="اختياري. بعده يتوقف التقديم تلقائيًا.">
            <input type="date" value={form.closesAt} onChange={(e) => set('closesAt', e.target.value)} className={FIELD} aria-label="آخر موعد للتقديم" />
          </Field>
        </div>

        <Field label="القسم" error={errors.department_id}>
          {departments ?
            <select value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)} className={FIELD} aria-label="القسم">
              <option value="">غير محدد</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          : <input value={initial.departmentName ?? 'غير محدد'} readOnly className={`${FIELD} bg-slate-50 text-deepBlue/60`} aria-label="القسم" />}
        </Field>

        <Field label="تعليمات التقديم" error={errors.application_instructions}>
          <textarea value={form.applicationInstructions} onChange={(e) => set('applicationInstructions', e.target.value)} rows={3} className={FIELD} aria-label="تعليمات التقديم" />
        </Field>
      </form>
    </CrudModal>
  )
}
