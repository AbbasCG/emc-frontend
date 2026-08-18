import Select, { type SingleValue, type StylesConfig } from 'react-select'

type StringOption = { label: string; value: string }

// Same RTL/color/animation pattern as CountrySelect and LanguagesSelect, kept
// in sync deliberately so every searchable dropdown in the app looks and
// behaves identically.
const rtlStyles: StylesConfig<StringOption, false> = {
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

type Props = {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  error?: string
  instanceId?: string
  ariaLabel?: string
}

/** Generic searchable single-select for plain string options (nationality, education level, etc.) — same component/animation family as CountrySelect. */
export default function SearchableSelect({ value, onChange, options, placeholder, error, instanceId, ariaLabel }: Props) {
  const opts: StringOption[] = options.map((o) => ({ label: o, value: o }))
  const selected = value ? (opts.find((o) => o.value === value) ?? { label: value, value }) : null

  return (
    <div dir="rtl" className={error ? 'rounded-xl ring-2 ring-red-300' : undefined}>
      <Select<StringOption, false>
        instanceId={instanceId}
        options={opts}
        value={selected}
        onChange={(opt: SingleValue<StringOption>) => {
          if (opt) onChange(opt.value)
        }}
        isSearchable
        placeholder={placeholder ?? 'ابحث…'}
        noOptionsMessage={() => 'لا توجد نتائج'}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        aria-label={ariaLabel}
        styles={{
          ...rtlStyles,
          control: (base, state) => ({
            ...(rtlStyles.control?.(base, state) ?? base),
            borderColor: error ? '#f87171' : state.isFocused ? '#0077B6' : '#e2e8f0',
          }),
        }}
      />
      {error ? <p className="mt-1.5 text-xs font-bold text-red-600">{error}</p> : null}
    </div>
  )
}
