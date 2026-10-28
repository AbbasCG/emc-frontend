import { useState } from 'react'
import type { FormEvent } from 'react'
import { CenteredModal } from '@/components/ui/CenteredModal'
import {
  TEMPLATE_CATEGORY_AR,
  TEMPLATE_VISIBILITY_AR,
  parseTemplateError,
} from '@/api/formsTemplatesApi'
import type { TemplateCategory, TemplateDepartment, TemplateInput, TemplateVisibility } from '@/api/formsTemplatesApi'

const FIELD = 'rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue'
const LABEL = 'text-xs font-black text-deepBlue'

const departmentName = (d: TemplateDepartment) => d.name_ar || d.name

function FieldError({ message }: { message?: string }) {
  return message ? <span role="alert" className="text-xs font-bold text-red-700">{message}</span> : null
}

function DepartmentSelect({
  value,
  onChange,
  departments,
  allowNone,
  error,
}: {
  value: number | null
  onChange: (next: number | null) => void
  departments: TemplateDepartment[]
  allowNone: boolean
  error?: string
}) {
  return (
    <label className="grid gap-2">
      <span className={LABEL}>القسم</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        aria-invalid={error ? true : undefined}
        className={FIELD}
      >
        {allowNone && <option value="">بدون قسم</option>}
        {!allowNone && value === null && <option value="">اختر القسم</option>}
        {departments.map((d) => (
          <option key={d.id} value={d.id}>{departmentName(d)}</option>
        ))}
      </select>
      <FieldError message={error} />
    </label>
  )
}

/**
 * A new form from a template, or a copy of a form: a title and a department, then the builder opens on the new private draft.
 * The same dialog serves both because the result is the same: a draft only its creator sees until it is shared.
 */
export function NewFormDialog({
  open,
  onClose,
  heading,
  intro,
  submitLabel,
  defaultTitle,
  defaultDepartmentId = null,
  departments,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  heading: string
  intro: string
  submitLabel: string
  defaultTitle: string
  defaultDepartmentId?: number | null
  departments: TemplateDepartment[]
  onSubmit: (body: { title: string; department_id: number | null }) => Promise<void>
}) {
  const [title, setTitle] = useState(defaultTitle)
  const [departmentId, setDepartmentId] = useState<number | null>(defaultDepartmentId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setFieldErrors({ title: 'اكتب عنواناً للنموذج.' })
      return
    }
    setBusy(true)
    setError(null)
    setFieldErrors({})
    try {
      await onSubmit({ title: title.trim(), department_id: departmentId })
    } catch (err) {
      const parsed = parseTemplateError(err)
      setError(parsed.message)
      setFieldErrors(parsed.fieldErrors)
      setBusy(false)
    }
  }

  return (
    <CenteredModal open={open} onClose={onClose} title={heading} size="md" busy={busy} testId="new-form-dialog">
      <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-4 p-5 text-right sm:p-6" dir="rtl">
        <p className="text-xs font-semibold leading-6 text-slate-500">{intro}</p>
        <label className="grid gap-2">
          <span className={LABEL}>عنوان النموذج</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} aria-invalid={fieldErrors.title ? true : undefined} className={FIELD} />
          <FieldError message={fieldErrors.title} />
        </label>
        {departments.length > 0 && (
          <DepartmentSelect value={departmentId} onChange={setDepartmentId} departments={departments} allowNone error={fieldErrors.department_id} />
        )}
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="rounded-xl bg-deepBlue py-3 text-sm font-black text-white shadow-md disabled:opacity-60">
          {busy ? 'جارٍ الإنشاء...' : submitLabel}
        </button>
      </form>
    </CenteredModal>
  )
}

/** Name, category and who sees a template: used to save a form as a template and to change a saved one. */
export function TemplateDetailsDialog({
  open,
  onClose,
  heading,
  submitLabel,
  initial,
  departments,
  canShareOrganization,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  heading: string
  submitLabel: string
  initial: TemplateInput
  departments: TemplateDepartment[]
  canShareOrganization: boolean
  onSubmit: (input: TemplateInput) => Promise<void>
}) {
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description ?? '')
  const [category, setCategory] = useState<TemplateCategory>(initial.category ?? 'general')
  const [visibility, setVisibility] = useState<TemplateVisibility>(initial.visibility ?? 'private')
  const [departmentId, setDepartmentId] = useState<number | null>(initial.department_id ?? departments[0]?.id ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const visibilities: TemplateVisibility[] = canShareOrganization ? ['private', 'department', 'organization'] : ['private', 'department']

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setFieldErrors({ name: 'اكتب اسماً للقالب.' })
      return
    }
    if (visibility === 'department' && departmentId === null) {
      setFieldErrors({ department_id: 'اختر القسم الذي سيظهر له القالب.' })
      return
    }
    setBusy(true)
    setError(null)
    setFieldErrors({})
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        category,
        visibility,
        department_id: visibility === 'department' ? departmentId : null,
      })
    } catch (err) {
      const parsed = parseTemplateError(err)
      setError(parsed.message)
      setFieldErrors(parsed.fieldErrors)
    } finally {
      setBusy(false)
    }
  }

  return (
    <CenteredModal open={open} onClose={onClose} title={heading} size="md" busy={busy} testId="template-details-dialog">
      <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-4 p-5 text-right sm:p-6" dir="rtl">
        <p className="text-xs font-semibold leading-6 text-slate-500">
          يحفظ القالب بنية النموذج فقط: الأسئلة والأقسام والشروط. لا يحمل أي إجابات ولا إعدادات مشاركة.
        </p>
        <label className="grid gap-2">
          <span className={LABEL}>اسم القالب</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={150} aria-invalid={fieldErrors.name ? true : undefined} className={FIELD} />
          <FieldError message={fieldErrors.name} />
        </label>
        <label className="grid gap-2">
          <span className={LABEL}>وصف مختصر (اختياري)</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} className={`${FIELD} resize-none`} />
        </label>
        <label className="grid gap-2">
          <span className={LABEL}>التصنيف</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as TemplateCategory)} className={FIELD}>
            {(Object.keys(TEMPLATE_CATEGORY_AR) as TemplateCategory[]).map((c) => (
              <option key={c} value={c}>{TEMPLATE_CATEGORY_AR[c]}</option>
            ))}
          </select>
        </label>
        <fieldset className="grid gap-2">
          <legend className={`${LABEL} mb-2`}>من يرى القالب</legend>
          <div className="flex flex-wrap gap-2">
            {visibilities.map((v) => (
              <label
                key={v}
                className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-black ring-1 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-customBlue ${visibility === v ? 'bg-deepBlue text-white ring-deepBlue' : 'bg-white text-deepBlue ring-deepBlue/15 hover:bg-slate-50'}`}
              >
                <input type="radio" name="template-visibility" value={v} checked={visibility === v} onChange={() => setVisibility(v)} className="sr-only" />
                {TEMPLATE_VISIBILITY_AR[v]}
              </label>
            ))}
          </div>
          <FieldError message={fieldErrors.visibility} />
        </fieldset>
        {visibility === 'department' && (
          departments.length > 0
            ? <DepartmentSelect value={departmentId} onChange={setDepartmentId} departments={departments} allowNone={false} error={fieldErrors.department_id} />
            : <p role="note" className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">لست عضواً في أي قسم، لذلك لا يمكنك مشاركة القالب مع قسم.</p>
        )}
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="rounded-xl bg-deepBlue py-3 text-sm font-black text-white shadow-md disabled:opacity-60">
          {busy ? 'جارٍ الحفظ...' : submitLabel}
        </button>
      </form>
    </CenteredModal>
  )
}
