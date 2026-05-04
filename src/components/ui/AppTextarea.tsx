import { useId } from 'react'
import AppFormError from './AppFormError'

type AppTextareaProps = {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  required?: boolean
  rows?: number
  maxLength?: number
  disabled?: boolean
  hint?: string
}

export default function AppTextarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  rows = 4,
  maxLength,
  disabled = false,
  hint,
}: AppTextareaProps) {
  const generatedId = useId()
  const textareaId = `${name}-${generatedId}`
  const errorId = `${textareaId}-error`
  const hintId = `${textareaId}-hint`

  return (
    <div className="grid gap-2 text-right">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={textareaId} className="text-sm font-bold text-deepBlue">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
        <div className="flex items-center gap-2">
          {hint && (
            <span id={hintId} className="text-xs font-medium text-slate-500">
              {hint}
            </span>
          )}
          {maxLength && <span className="text-xs font-medium text-slate-400">{`${value.length}/${maxLength}`}</span>}
        </div>
      </div>

      <textarea
        id={textareaId}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={[hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined}
        className={[
          'resize-none rounded-xl border bg-white px-4 py-3 text-right font-semibold leading-7 text-deepBlue outline-none transition placeholder:text-slate-400',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
            : 'border-amber-100 focus:border-[#b9872f] focus:ring-4 focus:ring-amber-100',
          disabled ? 'cursor-not-allowed bg-slate-100 text-slate-500' : '',
        ].join(' ')}
      />

      {error && <AppFormError id={errorId} message={error} />}
    </div>
  )
}
