import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { FormQuestion, FormTypeSlug, OpsFormDefinition, QuestionType } from '@/types/operations'
import { FORM_TYPE_AR } from '@/data/operationsLabels'

const QUESTION_TYPES: QuestionType[] = ['text', 'textarea', 'select', 'radio', 'checkbox', 'date', 'number']

export function QuestionEditor({
  q,
  onChange,
  onRemove,
}: {
  q: FormQuestion
  onChange: (next: FormQuestion) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-2xl border border-deepBlue/[0.08] bg-white p-4 text-right shadow-sm ring-1 ring-deepBlue/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onRemove}
          className="text-[11px] font-black text-red-600 hover:underline"
        >
          حذف
        </button>
        <span className="text-[10px] font-black text-slate-400">سؤال #{q.sort_order}</span>
      </div>
      <label className="mt-3 grid gap-1">
        <span className="text-xs font-black text-deepBlue">نص السؤال</span>
        <input
          value={q.label}
          onChange={(e) => onChange({ ...q, label: e.target.value })}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-deepBlue"
        />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs font-black text-deepBlue">النوع</span>
          <select
            value={q.type}
            onChange={(e) => onChange({ ...q, type: e.target.value as QuestionType })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-end gap-2 pt-6 text-xs font-black text-deepBlue">
          <input
            type="checkbox"
            checked={q.required}
            onChange={(e) => onChange({ ...q, required: e.target.checked })}
            className="accent-customBlue"
          />
          إلزامي
        </label>
      </div>
      {(q.type === 'select' || q.type === 'radio' || q.type === 'checkbox') && (
        <label className="mt-3 grid gap-1">
          <span className="text-xs font-black text-deepBlue">خيارات (فاصلة بين السطور)</span>
          <textarea
            value={(q.options ?? []).join('\n')}
            onChange={(e) =>
              onChange({
                ...q,
                options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
              })
            }
            rows={3}
            className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-deepBlue"
          />
        </label>
      )}
    </div>
  )
}

type Props = {
  initial?: OpsFormDefinition | null
  onSave: (draft: Partial<OpsFormDefinition> & { questions: FormQuestion[] }) => Promise<void>
}

export default function FormBuilder({ initial, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [formType, setFormType] = useState<FormTypeSlug>(initial?.form_type ?? 'suggestion')
  const [questions, setQuestions] = useState<FormQuestion[]>(
    initial?.questions ?? [
      { id: 1, label: 'الاسم الكامل', type: 'text', required: true, sort_order: 1 },
      { id: 2, label: 'البريد الإلكتروني', type: 'text', required: true, sort_order: 2 },
    ],
  )
  const [busy, setBusy] = useState(false)

  const slugPreview = useMemo(
    () =>
      title
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u0600-\u06FF-]/g, '') || 'slug',
    [title],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await onSave({
        title,
        description,
        form_type: formType,
        slug: initial?.slug ?? slugPreview,
        questions: questions.map((q, i) => ({ ...q, sort_order: i + 1 })),
      })
    } finally {
      setBusy(false)
    }
  }

  function addQuestion() {
    const nextId = questions.reduce((m, q) => Math.max(m, q.id), 0) + 1
    setQuestions((qs) => [
      ...qs,
      { id: nextId, label: 'سؤال جديد', type: 'textarea', required: false, sort_order: qs.length + 1 },
    ])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-right">
      <div className="grid gap-5 rounded-[1.35rem] bg-white p-6 shadow-lg ring-1 ring-deepBlue/[0.06] sm:p-8">
        <h2 className="text-xl font-black text-deepBlue">بيانات النموذج</h2>
        <label className="grid gap-2">
          <span className="text-xs font-black text-deepBlue">العنوان</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-deepBlue"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-black text-deepBlue">الوصف</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-deepBlue"
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
              <option key={k} value={k}>
                {FORM_TYPE_AR[k]}
              </option>
            ))}
          </select>
        </label>
        {!initial?.slug && (
          <p className="text-[11px] font-bold text-slate-500">
            مسودة الرابط: <span className="font-mono text-customBlue">{slugPreview}</span>
          </p>
        )}
      </div>

      <div className="space-y-4 rounded-[1.35rem] bg-deepBlue/[0.02] p-6 ring-1 ring-deepBlue/[0.06]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={addQuestion}
            className="rounded-xl bg-customOrange px-4 py-2 text-xs font-black text-white"
          >
            + إضافة سؤال
          </button>
          <h3 className="text-lg font-black text-deepBlue">أسئلة النموذج</h3>
        </div>
        <div className="grid gap-4">
          {questions.map((q, idx) => (
            <QuestionEditor
              key={q.id}
              q={{ ...q, sort_order: idx + 1 }}
              onChange={(next) =>
                setQuestions((qs) => qs.map((x) => (x.id === q.id ? next : x)))
              }
              onRemove={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-deepBlue py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-60"
      >
        {busy ? 'جارٍ الحفظ...' : 'حفظ النموذج'}
      </button>
    </form>
  )
}
