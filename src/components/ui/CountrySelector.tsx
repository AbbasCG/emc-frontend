import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export interface Country {
  code: string
  name: string
  dialCode: string
  flag: string
}

export const COUNTRIES: Country[] = [
  { code: 'NL', name: 'هولندا', dialCode: '+31', flag: '🇳🇱' },
  { code: 'SA', name: 'السعودية', dialCode: '+966', flag: '🇸🇦' },
  { code: 'MA', name: 'المغرب', dialCode: '+212', flag: '🇲🇦' },
  { code: 'TR', name: 'تركيا', dialCode: '+90', flag: '🇹🇷' },
  { code: 'EG', name: 'مصر', dialCode: '+20', flag: '🇪🇬' },
  { code: 'AE', name: 'الإمارات', dialCode: '+971', flag: '🇦🇪' },
  { code: 'JO', name: 'الأردن', dialCode: '+962', flag: '🇯🇴' },
  { code: 'SY', name: 'سوريا', dialCode: '+963', flag: '🇸🇾' },
  { code: 'IQ', name: 'العراق', dialCode: '+964', flag: '🇮🇶' },
  { code: 'PS', name: 'فلسطين', dialCode: '+970', flag: '🇵🇸' },
]

interface Props {
  value: Country | null
  onChange: (country: Country) => void
  error?: string
}

export default function CountrySelector({ value, onChange, error }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-14 w-full items-center justify-between rounded-xl border bg-slate-50 px-4 font-semibold text-deepBlue outline-none transition hover:bg-white focus:bg-white focus:ring-4 focus:ring-sky-100 ${error ? 'border-red-400' : 'border-slate-200 focus:border-customBlue'}`}
      >
        {value ? (
          <span className="flex items-center gap-2">
            <span className="text-xl leading-none">{value.flag}</span>
            <span>{value.name}</span>
            <span className="text-sm font-normal text-slate-400">{value.dialCode}</span>
          </span>
        ) : (
          <span className="font-semibold text-slate-400">اختر الدولة</span>
        )}
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 left-0 z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="max-h-52 overflow-y-auto">
            {COUNTRIES.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => {
                  onChange(country)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-sky-50 ${
                  value?.code === country.code
                    ? 'bg-sky-50 font-bold text-customBlue'
                    : 'font-semibold text-deepBlue'
                }`}
              >
                <span className="shrink-0 text-xl leading-none">{country.flag}</span>
                <span className="flex-1">{country.name}</span>
                <span className="text-sm font-normal text-slate-400">{country.dialCode}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
