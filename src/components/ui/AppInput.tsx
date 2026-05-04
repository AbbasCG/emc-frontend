import { Calendar, Clock, FileText, Mail, MapPin, Phone, User } from 'lucide-react'
import { useId } from 'react'
import AppFormError from './AppFormError'

type AppInputProps = {
  label: string
  name: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  required?: boolean
  icon?: 'mail' | 'phone' | 'user' | 'text' | 'location' | 'calendar' | 'time'
  hint?: string
  disabled?: boolean
}

const iconMap = {
  mail: Mail,
  phone: Phone,
  user: User,
  text: FileText,
  location: MapPin,
  calendar: Calendar,
  time: Clock,
}

export default function AppInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  icon,
  hint,
  disabled = false,
}: AppInputProps) {
  const generatedId = useId()
  const inputId = `${name}-${generatedId}`
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const Icon = icon ? iconMap[icon] : null

  return (
    <div className="grid gap-2 text-right">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-bold text-deepBlue">
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
        {Icon && (
          <Icon
            size={20}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-amber-500"
            aria-hidden="true"
          />
        )}
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={[hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined}
          className={[
            'w-full rounded-xl border bg-white px-4 py-3 text-right font-semibold text-deepBlue outline-none transition placeholder:text-slate-400',
            Icon ? 'pr-12' : '',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
              : 'border-amber-100 focus:border-[#b9872f] focus:ring-4 focus:ring-amber-100',
            disabled ? 'cursor-not-allowed bg-slate-100 text-slate-500' : '',
          ].join(' ')}
        />
      </div>

      {error && <AppFormError id={errorId} message={error} />}
    </div>
  )
}
