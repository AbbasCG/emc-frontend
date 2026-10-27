import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { createFormDefinition, parseFormSaveError } from '@/api/formsApi'
import { FORM_TYPE_AR } from '@/data/operationsLabels'
import type { FormTypeSlug } from '@/types/operations'

/**
 * A new form starts as a private draft with a title, a purpose and a description. The questions are built in the editor,
 * which opens as soon as the draft exists — nothing is published and nobody else can see it until it is shared.
 */
export default function OpsFormCreatePage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formType, setFormType] = useState<FormTypeSlug>('suggestion')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    if (!title.trim()) {
      setFieldErrors({ title: 'عنوان النموذج مطلوب.' })
      return
    }
    setBusy(true)
    try {
      // A failed save stays on this page and says why. Only a real, stored form is navigated to.
      const created = await createFormDefinition({ title: title.trim(), description: description.trim() || null, form_type: formType })
      navigate(`/dashboard/admin/forms/${created.id}`)
    } catch (err) {
      const parsed = parseFormSaveError(err)
      setError(parsed.message)
      setFieldErrors(parsed.fieldErrors)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/dashboard/admin/forms" className="inline-flex items-center gap-1 text-xs font-black text-customBlue hover:text-customOrange">
        <ChevronLeft size={14} />
        كل النماذج
      </Link>
      <header className="text-right">
        <h1 className="text-xl font-black text-deepBlue">إنشاء نموذج</h1>
        <p className="mt-2 text-xs font-semibold leading-6 text-slate-500">
          يُنشأ النموذج مسودة خاصة بك. بعد الإنشاء تفتح لك لوحة البناء لإضافة الأسئلة والأقسام بالسحب والإفلات، ولا يراه أحد حتى تشاركه وتنشره.
        </p>
        <Link to="/dashboard/admin/forms/templates" className="mt-3 inline-flex items-center gap-1 text-xs font-black text-customBlue hover:text-customOrange">
          أو ابدأ من قالب جاهز
          <ChevronLeft size={14} />
        </Link>
      </header>
      <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-5 rounded-[1.35rem] bg-white p-6 text-right shadow-lg ring-1 ring-deepBlue/[0.06] sm:p-8">
        <label className="grid gap-2">
          <span className="text-xs font-black text-deepBlue">عنوان النموذج</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={fieldErrors.title ? true : undefined}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-deepBlue outline-none focus:border-customBlue"
          />
          {fieldErrors.title && <span role="alert" className="text-xs font-bold text-red-700">{fieldErrors.title}</span>}
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-black text-deepBlue">الوصف (اختياري)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-deepBlue outline-none focus:border-customBlue"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-black text-deepBlue">نوع النموذج</span>
          <select
            value={formType}
            onChange={(e) => setFormType(e.target.value as FormTypeSlug)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-deepBlue"
          >
            {(Object.keys(FORM_TYPE_AR) as FormTypeSlug[]).map((k) => (
              <option key={k} value={k}>{FORM_TYPE_AR[k]}</option>
            ))}
          </select>
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-deepBlue py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-60">
          {busy ? 'جارٍ الإنشاء...' : 'إنشاء المسودة وفتح المحرر'}
        </button>
      </form>
    </div>
  )
}
