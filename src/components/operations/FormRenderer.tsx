import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import type { OpsFormDefinition } from '@/types/operations'

export default function FormRenderer({
  form,
  onSubmitAnswers,
}: {
  form: OpsFormDefinition
  onSubmitAnswers: (answers: Record<string, unknown>) => Promise<void>
}) {
  const [values, setValues] = useState<Record<number, unknown>>({})
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    for (const q of form.questions) {
      if (q.required) {
        const v = values[q.id]
        if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) {
          setErr(`يرجى تعبئة الحقل: ${q.label}`)
          return
        }
      }
    }
    setBusy(true)
    try {
      const answers: Record<string, unknown> = {}
      form.questions.forEach((q) => {
        answers[`q_${q.id}`] = values[q.id]
      })
      await onSubmitAnswers(answers)
      setDone(true)
    } catch {
      setErr('تعذر الإرسال. تحقق من الاتصال وحاول لاحقاً.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-emerald-50 px-8 py-12 text-center font-black text-emerald-800 ring-1 ring-emerald-100"
      >
        تم استلام إجاباتك بنجاح شكراً لتعاونك مع EMC.
      </motion.div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-[1.35rem] bg-white p-6 shadow-xl ring-1 ring-deepBlue/[0.06] sm:p-8">
      <div className="text-right">
        <h1 className="text-2xl font-black text-deepBlue">{form.title}</h1>
        {form.description && (
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{form.description}</p>
        )}
      </div>
      {err && <p className="rounded-xl bg-red-50 px-4 py-2 text-right text-sm font-bold text-red-700">{err}</p>}
      <div className="space-y-5">
        {form.questions
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((q) => (
            <label key={q.id} className="grid gap-2 text-right">
              <span className="text-sm font-black text-deepBlue">
                {q.label}
                {q.required && <span className="text-customOrange"> *</span>}
              </span>
              {q.type === 'textarea' && (
                <textarea
                  required={q.required}
                  rows={4}
                  value={(values[q.id] as string) ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [q.id]: e.target.value }))}
                  className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-deepBlue outline-none focus:border-customBlue"
                />
              )}
              {q.type === 'text' && (
                <input
                  required={q.required}
                  type="text"
                  value={(values[q.id] as string) ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [q.id]: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-deepBlue outline-none focus:border-customBlue"
                />
              )}
              {q.type === 'number' && (
                <input
                  required={q.required}
                  type="number"
                  value={(values[q.id] as number | string) ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [q.id]: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-deepBlue outline-none focus:border-customBlue"
                />
              )}
              {q.type === 'date' && (
                <input
                  required={q.required}
                  type="date"
                  value={(values[q.id] as string) ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [q.id]: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-deepBlue outline-none focus:border-customBlue"
                />
              )}
              {(q.type === 'select' || q.type === 'radio') && (
                <select
                  required={q.required}
                  value={(values[q.id] as string) ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [q.id]: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-deepBlue outline-none focus:border-customBlue"
                >
                  <option value=""> اختر </option>
                  {(q.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              )}
              {q.type === 'checkbox' && (
                <div className="flex flex-wrap justify-end gap-3">
                  {(q.options ?? ['نعم', 'لا']).map((o) => (
                    <label key={o} className="inline-flex items-center gap-2 text-sm font-bold text-deepBlue">
                      <input
                        type="checkbox"
                        checked={Boolean((values[q.id] as string[] | undefined)?.includes(o))}
                        onChange={(e) => {
                          setValues((prev) => {
                            const cur = new Set<string>((prev[q.id] as string[] | undefined) ?? [])
                            if (e.target.checked) cur.add(o)
                            else cur.delete(o)
                            return { ...prev, [q.id]: Array.from(cur) }
                          })
                        }}
                        className="accent-customBlue"
                      />
                      {o}
                    </label>
                  ))}
                </div>
              )}
            </label>
          ))}
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-customBlue py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-60"
      >
        {busy ? 'جارٍ الإرسال...' : 'إرسال'}
      </button>
    </form>
  )
}
