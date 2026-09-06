type Props = {
  title: string
  question: string
  explanation: string
  value: boolean | null
  onChange: (value: boolean) => void
  error?: string
}

/**
 * A single explicit yes/no consent — no pre-checked default, `value` starts
 * `null` (unanswered) and stays that way until the volunteer picks one.
 * Two of these render independently on the form (photo, professional
 * profile) — they must never be bundled into one combined control.
 */
export default function ConsentCard({ title, question, explanation, value, onChange, error }: Props) {
  return (
    <div className={`rounded-2xl border p-4 ${error ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-slate-50/60'}`}>
      <p className="text-sm font-black text-deepBlue">{title}</p>
      <p className="mt-1 text-xs font-bold text-deepBlue/80">{question}</p>
      <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">{explanation}</p>

      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={title}>
        <label
          className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-black transition ${
            value === true
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-200 bg-white text-deepBlue hover:border-emerald-300'
          }`}
        >
          <input
            type="radio"
            className="sr-only"
            checked={value === true}
            onChange={() => onChange(true)}
          />
          نعم، أوافق
        </label>
        <label
          className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-black transition ${
            value === false
              ? 'border-slate-500 bg-slate-500 text-white'
              : 'border-slate-200 bg-white text-deepBlue hover:border-slate-300'
          }`}
        >
          <input
            type="radio"
            className="sr-only"
            checked={value === false}
            onChange={() => onChange(false)}
          />
          لا، لا أوافق
        </label>
      </div>
      {error && <p className="mt-2 text-[11px] font-bold text-red-600">{error}</p>}
    </div>
  )
}
