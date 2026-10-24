import { Star } from 'lucide-react'
import type { FormQuestion } from '@/types/operations'
import { ACCEPT_FILE, ACCEPT_IMAGE, optionsOf, scaleBounds, starCount } from './formValidation'
import type { AnswerValue } from './formValidation'

/**
 * One block as a respondent sees it. The public form, the builder's preview and the builder's canvas all draw through this
 * component, so what the editor shows is what the form is.
 */

export const INPUT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-deepBlue outline-none focus:border-customBlue disabled:cursor-default disabled:opacity-100'

type Props = {
  q: FormQuestion
  value: AnswerValue
  onChange: (value: AnswerValue) => void
  /** Unique within the page; the canvas passes the block key because unsaved blocks have no stored id. */
  fieldId: string
  error?: string
  /** Draws the control without letting it be used (the builder canvas). */
  disabled?: boolean
}

function Title({ q }: { q: FormQuestion }) {
  return (
    <span className="text-sm font-black text-deepBlue">
      {q.label}
      {q.required && <span className="text-customOrange" aria-hidden> *</span>}
      {q.required && <span className="sr-only"> (مطلوب)</span>}
    </span>
  )
}

function Extras({ q, id, error }: { q: FormQuestion; id: string; error?: string }) {
  return (
    <>
      {q.description && <span id={`${id}-desc`} className="text-xs font-semibold leading-6 text-slate-600">{q.description}</span>}
      {q.help_text && <span id={`${id}-help`} className="text-[11px] font-bold text-slate-500">{q.help_text}</span>}
      {error && <span id={`${id}-err`} role="alert" className="text-xs font-bold text-red-700">{error}</span>}
    </>
  )
}

export default function QuestionField({ q, value, onChange, fieldId, error, disabled = false }: Props) {
  const text = typeof value === 'string' ? value : ''
  const invalid = error ? true : undefined
  const describedBy = [q.description ? `${fieldId}-desc` : null, q.help_text ? `${fieldId}-help` : null, error ? `${fieldId}-err` : null].filter(Boolean).join(' ') || undefined
  const common = { id: fieldId, disabled, 'aria-invalid': invalid, 'aria-describedby': describedBy }

  if (q.type === 'section') {
    return (
      <div className="border-b-2 border-customBlue/30 pb-2 text-right">
        <h2 className="text-lg font-black text-deepBlue">{q.label}</h2>
        {q.description && <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{q.description}</p>}
      </div>
    )
  }
  if (q.type === 'description') {
    return (
      <div className="text-right">
        {q.label && <p className="text-sm font-black text-deepBlue">{q.label}</p>}
        <p className="whitespace-pre-line text-sm font-semibold leading-7 text-slate-600">{q.description}</p>
      </div>
    )
  }
  if (q.type === 'page_break') return null

  // Groups of controls are a fieldset, not one label around many inputs.
  if (q.type === 'radio' || q.type === 'checkbox' || q.type === 'multiselect') {
    const options = optionsOf(q)
    const picked = Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : []

    return (
      <fieldset className="grid gap-2 text-right" aria-invalid={invalid} aria-describedby={describedBy} disabled={disabled}>
        <legend className="mb-1"><Title q={q} /></legend>
        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <label key={o} className="inline-flex items-center gap-2 text-sm font-bold text-deepBlue">
              <input
                type={q.type === 'radio' ? 'radio' : 'checkbox'}
                name={fieldId}
                checked={picked.includes(o)}
                onChange={(e) => {
                  if (q.type === 'radio') return onChange(o)
                  const next = new Set(picked)
                  if (e.target.checked) next.add(o)
                  else next.delete(o)
                  onChange(Array.from(next))
                }}
                className="accent-customBlue"
              />
              {o}
            </label>
          ))}
        </div>
        <Extras q={q} id={fieldId} error={error} />
      </fieldset>
    )
  }

  if (q.type === 'yes_no') {
    return (
      <fieldset className="grid gap-2 text-right" aria-invalid={invalid} aria-describedby={describedBy} disabled={disabled}>
        <legend className="mb-1"><Title q={q} /></legend>
        <div className="flex gap-2">
          {[['yes', 'نعم'], ['no', 'لا']].map(([v, label]) => (
            <label
              key={v}
              className={`inline-flex min-w-20 cursor-pointer items-center justify-center rounded-xl px-5 py-2.5 text-sm font-black ring-1 transition-colors ${
                text === v ? 'bg-customBlue text-white ring-customBlue' : 'bg-white text-deepBlue ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <input type="radio" name={fieldId} value={v} checked={text === v} onChange={() => onChange(v)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
        <Extras q={q} id={fieldId} error={error} />
      </fieldset>
    )
  }

  if (q.type === 'star_rating') {
    const count = starCount(q)
    const current = Number(text) || 0

    return (
      <fieldset className="grid gap-2 text-right" aria-invalid={invalid} aria-describedby={describedBy} disabled={disabled}>
        <legend className="mb-1"><Title q={q} /></legend>
        <div className="flex gap-1" dir="ltr">
          {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
            <label key={n} className="cursor-pointer rounded-md p-0.5 focus-within:ring-2 focus-within:ring-customBlue/50">
              <input type="radio" name={fieldId} value={n} checked={current === n} onChange={() => onChange(String(n))} className="sr-only" aria-label={`${n} من ${count}`} />
              <Star size={26} aria-hidden className={n <= current ? 'fill-customOrange text-customOrange' : 'text-slate-300'} />
            </label>
          ))}
        </div>
        <Extras q={q} id={fieldId} error={error} />
      </fieldset>
    )
  }

  if (q.type === 'linear_scale') {
    const [lo, hi] = scaleBounds(q)
    const steps = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)

    return (
      <fieldset className="grid gap-2 text-right" aria-invalid={invalid} aria-describedby={describedBy} disabled={disabled}>
        <legend className="mb-1"><Title q={q} /></legend>
        <div className="flex flex-wrap items-center gap-2">
          {q.config?.scale?.min_label && <span className="text-xs font-bold text-slate-500">{q.config.scale.min_label}</span>}
          {steps.map((n) => (
            <label
              key={n}
              className={`inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-sm font-black ring-1 transition-colors focus-within:ring-2 focus-within:ring-customBlue/50 ${
                text === String(n) ? 'bg-customBlue text-white ring-customBlue' : 'bg-white text-deepBlue ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <input type="radio" name={fieldId} value={n} checked={text === String(n)} onChange={() => onChange(String(n))} className="sr-only" />
              {n}
            </label>
          ))}
          {q.config?.scale?.max_label && <span className="text-xs font-bold text-slate-500">{q.config.scale.max_label}</span>}
        </div>
        <Extras q={q} id={fieldId} error={error} />
      </fieldset>
    )
  }

  if (q.type === 'consent') {
    return (
      <div className="grid gap-1 text-right">
        <label htmlFor={fieldId} className="inline-flex items-start gap-2 text-sm font-black text-deepBlue">
          <input
            {...common}
            type="checkbox"
            checked={text === 'yes'}
            onChange={(e) => onChange(e.target.checked ? 'yes' : '')}
            className="mt-1 accent-customBlue"
          />
          <Title q={q} />
        </label>
        <Extras q={q} id={fieldId} error={error} />
      </div>
    )
  }

  const control = (() => {
    switch (q.type) {
      case 'textarea':
        return <textarea {...common} rows={4} value={text} placeholder={q.placeholder ?? undefined} maxLength={q.config?.validation?.max_length} onChange={(e) => onChange(e.target.value)} className={`resize-none ${INPUT_CLASS}`} />
      case 'select':
        return (
          <select {...common} value={text} onChange={(e) => onChange(e.target.value)} className={`${INPUT_CLASS} bg-white font-bold`}>
            <option value="">{q.placeholder || 'اختر'}</option>
            {(q.options ?? []).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        )
      case 'file':
      case 'image':
        return (
          <input
            {...common}
            type="file"
            accept={q.type === 'image' ? ACCEPT_IMAGE : ACCEPT_FILE}
            onChange={(e) => onChange(e.target.files?.[0])}
            className={`${INPUT_CLASS} text-sm`}
          />
        )
      case 'number':
        return (
          <input
            {...common}
            type="number"
            inputMode="decimal"
            min={q.config?.validation?.min}
            max={q.config?.validation?.max}
            step={q.config?.validation?.integer_only ? 1 : 'any'}
            value={text}
            placeholder={q.placeholder ?? undefined}
            onChange={(e) => onChange(e.target.value)}
            className={INPUT_CLASS}
          />
        )
      case 'date':
        return <input {...common} type="date" min={q.config?.validation?.min_date} max={q.config?.validation?.max_date} value={text} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} />
      case 'time':
        return <input {...common} type="time" value={text} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} />
      default: {
        const type = { email: 'email', phone: 'tel', url: 'url' }[q.type as 'email' | 'phone' | 'url'] ?? 'text'

        return (
          <input
            {...common}
            type={type}
            dir={q.type === 'email' || q.type === 'phone' || q.type === 'url' ? 'ltr' : undefined}
            value={text}
            placeholder={q.placeholder ?? undefined}
            maxLength={q.config?.validation?.max_length}
            onChange={(e) => onChange(e.target.value)}
            className={INPUT_CLASS}
          />
        )
      }
    }
  })()

  return (
    <div className="grid gap-2 text-right">
      <label htmlFor={fieldId}><Title q={q} /></label>
      {control}
      <Extras q={q} id={fieldId} error={error} />
    </div>
  )
}
