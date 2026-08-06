import { Calendar, Clock, FileText, Mail, MapPin, Phone, User } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/lib/utils'
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
  /** Workshop wizard / premium inputs — EMC focus ring + spacing */
  variant?: 'default' | 'emc'
  /** Extra classes merged with cn(); error-state borders take precedence via cn merge order */
  inputClassName?: string
  iconClassName?: string
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
  variant = 'default',
  inputClassName,
  iconClassName,
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
            className={cn(
              'pointer-events-none absolute right-4 top-1/2 -translate-y-1/2',
              iconClassName ?? (variant === 'emc' ? 'text-[#2691C2]' : 'text-amber-500'),
            )}
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
          className={cn(
            'w-full border bg-white px-4 text-right font-semibold text-deepBlue outline-none transition placeholder:text-slate-400',
            Icon && 'pr-12',
            variant === 'emc' ? 'rounded-2xl py-3.5 text-[15px] placeholder:text-slate-500' : 'rounded-xl py-3',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
              : variant === 'emc'
                ? 'border-slate-200/90 shadow-sm focus:border-[#2691C2] focus:ring-4 focus:ring-[#2691C2]/22'
                : 'border-amber-100 focus:border-[#b9872f] focus:ring-4 focus:ring-amber-100',
            disabled && 'cursor-not-allowed bg-slate-100 text-slate-500',
            inputClassName,
          )}
        />
      </div>

      {error && <AppFormError id={errorId} message={error} />}
    </div>
  )
}
