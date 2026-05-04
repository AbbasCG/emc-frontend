import { useId } from 'react'
import AppFormError from './AppFormError'

type RadioOption = {
  label: string
  value: string
}

type AppRadioGroupProps = {
  label: string
  name?: string
  options: RadioOption[]
  selected: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  columns?: 1 | 2 | 3
  hint?: string
}

export default function AppRadioGroup({
  label,
  name = 'radio-group',
  options,
  selected,
  onChange,
  error,
  required = false,
  columns = 1,
  hint,
}: AppRadioGroupProps) {
  const generatedId = useId()
  const errorId = `${name}-${generatedId}-error`
  const gridClass = {
    1: 'grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
  }

  return (
    <fieldset className="grid gap-3 text-right" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}>
      <div className="flex items-center justify-between gap-3">
        <legend className="text-sm font-bold text-deepBlue">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </legend>
        {hint && <span className="text-xs font-medium text-slate-500">{hint}</span>}
      </div>

      <div className={`grid gap-3 ${gridClass[columns]}`}>
        {options.map((option) => {
          const checked = selected === option.value
          const id = `${name}-${option.value}-${generatedId}`

          return (
            <label
              key={option.value}
              htmlFor={id}
              className={[
                'flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-right transition',
                checked
                  ? 'border-[#b9872f] bg-amber-50 shadow-sm shadow-amber-100'
                  : 'border-amber-100 bg-white hover:border-amber-300 hover:bg-amber-50/60',
              ].join(' ')}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                required={required}
                className="h-5 w-5 accent-[#b9872f]"
              />
              <span className="font-semibold text-deepBlue">{option.label}</span>
            </label>
          )
        })}
      </div>

      {error && <AppFormError id={errorId} message={error} />}
    </fieldset>
  )
}
