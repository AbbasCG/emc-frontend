import Select, { type SingleValue, type StylesConfig } from 'react-select'
import { VOLUNTEER_COUNTRIES, type VolunteerCountry } from '@/data/volunteerCountries'

export type Country = VolunteerCountry

/** @deprecated Use VOLUNTEER_COUNTRIES — kept for backward compatibility */
export const COUNTRIES: Country[] = VOLUNTEER_COUNTRIES

type CountryOption = Country & { label: string; value: string }

const OPTIONS: CountryOption[] = VOLUNTEER_COUNTRIES.map((c) => ({
  ...c,
  value: c.code,
  label: `${c.flag} ${c.name}`,
}))

const styles: StylesConfig<CountryOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: '3.5rem',
    borderRadius: '0.75rem',
    borderColor: state.isFocused ? '#2691C2' : '#e2e8f0',
    backgroundColor: state.isFocused ? '#fff' : '#f8fafc',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(38, 145, 194, 0.12)' : 'none',
    textAlign: 'right' as const,
    direction: 'rtl' as const,
    cursor: 'pointer',
    '&:hover': { borderColor: state.isFocused ? '#2691C2' : '#cbd5e1' },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 16px 50px rgba(15, 23, 42, 0.12)',
    textAlign: 'right' as const,
    direction: 'rtl' as const,
    zIndex: 60,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    textAlign: 'right' as const,
    backgroundColor: state.isSelected ? '#2691C2' : state.isFocused ? '#e0f2fe' : '#fff',
    color: state.isSelected ? '#fff' : '#22334A',
    fontWeight: state.isSelected ? 800 : 600,
    fontSize: '0.875rem',
    padding: '10px 14px',
    cursor: 'pointer',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#22334A',
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
    color: '#22334A',
    textAlign: 'right' as const,
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({
    ...base,
    color: '#94a3b8',
    paddingInlineEnd: 8,
  }),
}

interface Props {
  value: Country | null
  onChange: (country: Country) => void
  error?: string
}

function matchesCountryQuery(c: VolunteerCountry, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    c.name.includes(query.trim()) ||
    (c.englishName.toLowerCase().includes(q)) ||
    c.code.toLowerCase().includes(q) ||
    c.dialCode.includes(q) ||
    c.dialCode.replace('+', '').includes(q.replace('+', ''))
  )
}

export default function CountrySelector({ value, onChange, error }: Props) {
  const selected = value ? OPTIONS.find((o) => o.code === value.code) ?? null : null

  return (
    <div dir="rtl" className={error ? 'rounded-xl ring-2 ring-red-300' : undefined}>
      <Select<CountryOption, false>
        instanceId="emc-volunteer-country-select"
        options={OPTIONS}
        value={selected}
        onChange={(opt: SingleValue<CountryOption>) => {
          if (opt) onChange(opt)
        }}
        isSearchable
        placeholder="ابحث بالعربية أو English…"
        noOptionsMessage={() => 'لا توجد نتائج'}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        aria-label="اختر الدولة"
        styles={{
          ...styles,
          control: (base, state) => ({
            ...(styles.control?.(base, state) ?? base),
            borderColor: error ? '#f87171' : state.isFocused ? '#2691C2' : '#e2e8f0',
          }),
        }}
        filterOption={(option, input) => matchesCountryQuery(option.data, input)}
        formatOptionLabel={(opt) => (
          <span className="flex items-center gap-2">
            <span aria-hidden>{opt.flag}</span>
            <span className="font-bold text-deepBlue">{opt.name}</span>
          </span>
        )}
      />
      {error ? <p className="mt-1.5 text-xs font-bold text-red-600">{error}</p> : null}
    </div>
  )
}
