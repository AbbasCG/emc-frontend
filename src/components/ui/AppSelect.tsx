import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import AppFormError from './AppFormError'

type Option = {
  label: string
  value: string
}

type AppSelectProps = {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  error?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  hint?: string
}

export default function AppSelect({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required = false,
  placeholder,
  disabled = false,
  hint,
}: AppSelectProps) {
  const generatedId = useId()
  const selectId = `${name}-${generatedId}`
  const errorId = `${selectId}-error`
  const hintId = `${selectId}-hint`

  return (
    <div className="grid gap-2 text-right">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={selectId} className="text-sm font-bold text-deepBlue">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
        {hint && (
          <span id={hintId} className="text-xs font-medium text-slate-500">
            {hint}
          </span>
        )}
      </div>

      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={[hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined}
          className={[
            'w-full appearance-none rounded-xl border bg-white px-4 py-3 pl-10 text-right font-semibold text-deepBlue outline-none transition',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
              : 'border-amber-100 focus:border-[#b9872f] focus:ring-4 focus:ring-amber-100',
            disabled ? 'cursor-not-allowed bg-slate-100 text-slate-500' : '',
          ].join(' ')}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={20}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-500"
          aria-hidden="true"
        />
      </div>

      {error && <AppFormError id={errorId} message={error} />}
    </div>
  )
}
