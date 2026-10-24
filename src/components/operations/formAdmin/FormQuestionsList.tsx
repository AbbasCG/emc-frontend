import { QUESTION_TYPE_AR } from '@/data/operationsLabels'
import type { FormQuestion } from '@/types/operations'

/** A read-only list of questions: what a viewer sees instead of the editor, and what a version shows. */
export default function FormQuestionsList({ questions, ariaLabel = 'الأسئلة' }: { questions: FormQuestion[]; ariaLabel?: string }) {
  if (questions.length === 0) {
    return <p className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-slate-500 ring-1 ring-deepBlue/[0.06]">لا توجد أسئلة.</p>
  }

  return (
    <ol aria-label={ariaLabel} className="space-y-3 text-right">
      {questions.map((q, i) => (
        <li key={q.id} className="rounded-2xl bg-white p-4 ring-1 ring-deepBlue/[0.06]" data-testid="question-row">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-deepBlue">
              {i + 1}. {q.label || q.description || QUESTION_TYPE_AR[q.type]}
              {q.required && <span className="text-customOrange"> *</span>}
            </p>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-black text-slate-600">{QUESTION_TYPE_AR[q.type] ?? q.type}</span>
          </div>
          {q.options && q.options.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="الخيارات">
              {q.options.map((o) => (
                <li key={o} className="rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-800">{o}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  )
}
