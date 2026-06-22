import Select, { type SingleValue, type StylesConfig } from 'react-select'
import countries from 'i18n-iso-countries'
import arLocale from 'i18n-iso-countries/langs/ar.json'
import enLocale from 'i18n-iso-countries/langs/en.json'
import { getCountryCallingCode, isSupportedCountry } from 'libphonenumber-js'

countries.registerLocale(arLocale)
countries.registerLocale(enLocale)

export type Country = {
  code: string
  name: string
  englishName: string
  dialCode: string
  flag: string
}

function codeToFlag(code: string): string {
  return [...code.toUpperCase()].map((c) => String.fromCodePoint(c.charCodeAt(0) + 0x1f1a5)).join('')
}

const PINNED = ['YE', 'NL']

function buildCountries(): Country[] {
  const arNames = countries.getNames('ar', { select: 'official' })
  const enNames = countries.getNames('en', { select: 'official' })

  const result: Country[] = []

  for (const code of Object.keys(arNames)) {
    if (!isSupportedCountry(code)) continue
    let callingCode: string
    try {
      callingCode = getCountryCallingCode(code)
    } catch {
      continue
    }
    result.push({
      code,
      name: arNames[code],
      englishName: enNames[code] ?? code,
      dialCode: '+' + callingCode,
      flag: codeToFlag(code),
    })
  }

  result.sort((a, b) => a.name.localeCompare(b.name, 'ar'))

  const pinned = PINNED.flatMap((c) => {
    const found = result.find((co) => co.code === c)
    return found ? [found] : []
  })
  const rest = result.filter((co) => !PINNED.includes(co.code))

  return [...pinned, ...rest]
}

export const ALL_COUNTRIES: Country[] = buildCountries()

type CountryOption = Country & { label: string; value: string }

const OPTIONS: CountryOption[] = ALL_COUNTRIES.map((c) => ({
  ...c,
  value: c.code,
  label: `${c.flag} ${c.name}`,
}))

const rtlStyles: StylesConfig<CountryOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: '3.5rem',
    borderRadius: '0.75rem',
    borderColor: state.isFocused ? '#0077B6' : '#E7E3DA',
    backgroundColor: state.isFocused ? '#fff' : '#F3F1EA',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(0,119,182,0.14)' : 'none',
    textAlign: 'right' as const,
    direction: 'rtl' as const,
    cursor: 'pointer',
    transition: 'border-color 250ms cubic-bezier(0.2,0.8,0.2,1), background-color 250ms cubic-bezier(0.2,0.8,0.2,1), box-shadow 250ms cubic-bezier(0.2,0.8,0.2,1)',
    '&:hover': { borderColor: state.isFocused ? '#0077B6' : '#B6BCC1' },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '1rem',
    overflow: 'hidden',
    border: '1px solid #E7E3DA',
    boxShadow: '0 22px 50px -24px rgba(6, 24, 44, 0.22), 0 2px 6px -1px rgba(6, 24, 44, 0.05)',
    textAlign: 'right' as const,
    direction: 'rtl' as const,
    zIndex: 60,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    textAlign: 'right' as const,
    backgroundColor: state.isSelected ? '#0077B6' : state.isFocused ? '#EAF6FD' : '#fff',
    color: state.isSelected ? '#fff' : '#0C2A4B',
    fontWeight: state.isSelected ? 800 : 600,
    fontSize: '0.875rem',
    padding: '10px 14px',
    cursor: 'pointer',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#0C2A4B',
    fontWeight: 700,
    textAlign: 'right' as const,
  }),
  placeholder: (base) => ({
    ...base,
    color: '#94a3b8',
    fontWeight: 600,
    textAlign: 'right' as const,
  }),
  input: (base) => ({
    ...base,
    color: '#0C2A4B',
    textAlign: 'right' as const,
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({
    ...base,
    color: '#94a3b8',
    paddingInlineEnd: 8,
  }),
}

function matchesQuery(c: Country, input: string): boolean {
  const q = input.trim().toLowerCase()
  if (!q) return true
  return (
    c.name.includes(input.trim()) ||
    c.englishName.toLowerCase().includes(q) ||
    c.code.toLowerCase().includes(q) ||
    c.dialCode.includes(q) ||
    c.dialCode.replace('+', '').includes(q.replace('+', ''))
  )
}

type Props = {
  value: Country | null
  onChange: (country: Country) => void
  error?: string
  instanceId?: string
}

export default function CountrySelect({ value, onChange, error, instanceId = 'emc-country-select' }: Props) {
  const selected = value ? (OPTIONS.find((o) => o.code === value.code) ?? null) : null

  return (
    <div dir="rtl" className={error ? 'rounded-xl ring-2 ring-red-300' : undefined}>
      <Select<CountryOption, false>
        instanceId={instanceId}
        options={OPTIONS}
        value={selected}
        onChange={(opt: SingleValue<CountryOption>) => {
          if (opt) onChange(opt)
        }}
        isSearchable
        placeholder="ابحث بالعربية أو English أو رمز الدولة…"
        noOptionsMessage={() => 'لا توجد نتائج'}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        aria-label="اختر الدولة"
        styles={{
          ...rtlStyles,
          control: (base, state) => ({
            ...(rtlStyles.control?.(base, state) ?? base),
            borderColor: error ? '#f87171' : state.isFocused ? '#0077B6' : '#e2e8f0',
          }),
        }}
        filterOption={(option, input) => matchesQuery(option.data, input)}
        formatOptionLabel={(opt) => (
          <span className="flex items-center gap-2">
            <span aria-hidden>{opt.flag}</span>
            <span className="font-bold text-deepBlue">{opt.name}</span>
            <span className="text-xs text-slate-400">{opt.dialCode}</span>
          </span>
        )}
      />
      {error ? <p className="mt-1.5 text-xs font-bold text-red-600">{error}</p> : null}
    </div>
  )
}
