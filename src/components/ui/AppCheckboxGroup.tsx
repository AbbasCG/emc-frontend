import { Check } from 'lucide-react'
import { useId } from 'react'
import AppFormError from './AppFormError'

type CheckboxOption = {
  label: string
  value: string
}

type AppCheckboxGroupProps = {
  label: string
  name?: string
  options: CheckboxOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  error?: string
  required?: boolean
  columns?: 1 | 2 | 3
  hint?: string
}

export default function AppCheckboxGroup({
  label,
  name = 'checkbox-group',
  options,
  selected,
  onChange,
  error,
  required = false,
  columns = 1,
  hint,
}: AppCheckboxGroupProps) {
  const generatedId = useId()
  const errorId = `${name}-${generatedId}-error`
  const gridClass = {
    1: 'grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
  }

  const handleToggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
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
          const checked = selected.includes(option.value)
          const id = `${name}-${option.value}-${generatedId}`

          return (
            <label
              key={option.value}
              htmlFor={id}
              className={[
                'flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-right transition',
                checked
                  ? 'border-[#b9872f] bg-amber-50 text-deepBlue shadow-sm shadow-amber-100'
                  : 'border-amber-100 bg-white text-deepBlue hover:border-amber-300 hover:bg-amber-50/60',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
                  checked ? 'border-[#b9872f] bg-[#b9872f]' : 'border-slate-300 bg-white',
                ].join(' ')}
                aria-hidden="true"
              >
                {checked && <Check size={15} className="text-white" />}
              </span>
              <span className="font-semibold leading-6">{option.label}</span>
              <input
                id={id}
                type="checkbox"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => handleToggle(option.value)}
                className="sr-only"
              />
            </label>
          )
        })}
      </div>

      {error && <AppFormError id={errorId} message={error} />}
    </fieldset>
  )
}
