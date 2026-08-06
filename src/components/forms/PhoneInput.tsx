import { Phone } from 'lucide-react'
import type { Country } from '@/lib/countries'

type Props = {
  country: Country | null
  value: string
  onChange: (localPhone: string) => void
  error?: string
  placeholder?: string
}

/**
 * Local-number input paired with the selected country's calling code —
 * extracted from the signup page so every form needing a phone field (e.g.
 * the volunteer HR profile) uses the exact same component instead of
 * re-implementing the concatenation logic. Canonical E.164 value is built by
 * the caller as `${country.dialCode}${value}` (see buildE164Phone below),
 * matching signup's existing convention exactly.
 */
export default function PhoneInput({ country, value, onChange, error, placeholder = '000 000 0000' }: Props) {
  return (
    <div
      dir="ltr"
      className={`flex h-14 w-full overflow-hidden rounded-xl border bg-slate-50 transition focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100 ${error ? 'border-red-400' : 'border-slate-200 focus-within:border-customBlue'}`}
    >
      <div className="flex shrink-0 items-center gap-1.5 border-r border-slate-200 bg-slate-100 px-3 text-sm font-bold text-deepBlue">
        {country ? (
          <>
            <span className="text-base leading-none">{country.flag}</span>
            <span>{country.dialCode}</span>
          </>
        ) : (
          <Phone size={18} className="text-slate-400" />
        )}
      </div>
      <input
        type="tel"
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent px-4 text-left font-semibold text-deepBlue outline-none placeholder:font-normal placeholder:text-slate-400"
      />
    </div>
  )
}

/** Canonical E.164-ish value the backend expects — never duplicate the dial code inside the local part. */
export function buildE164Phone(country: Country | null, localPhone: string): string {
  if (!country) return localPhone.trim()
  return `${country.dialCode}${localPhone.trim()}`
}
