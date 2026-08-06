import CreatableSelect from 'react-select/creatable'
import type { MultiValue, StylesConfig } from 'react-select'

export const COMMON_LANGUAGES = [
  'العربية', 'الإنجليزية', 'الهولندية', 'الفرنسية', 'الألمانية', 'الإسبانية', 'التركية',
]

type LanguageOption = { label: string; value: string }

const OPTIONS: LanguageOption[] = COMMON_LANGUAGES.map((l) => ({ label: l, value: l }))

const rtlStyles: StylesConfig<LanguageOption, true> = {
  control: (base, state) => ({
    ...base,
    minHeight: '3.5rem',
    borderRadius: '0.75rem',
    borderColor: state.isFocused ? '#2691C2' : '#e2e8f0',
    backgroundColor: state.isFocused ? '#fff' : '#f8fafc',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(38, 145, 194, 0.12)' : 'none',
    textAlign: 'right' as const,
    direction: 'rtl' as const,
    cursor: 'text',
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
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'rgba(38, 145, 194, 0.1)',
    borderRadius: '9999px',
    paddingInline: '2px',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#0f4c66',
    fontWeight: 700,
    fontSize: '0.75rem',
  }),
  multiValueRemove: (base) => ({
    ...base,
    borderRadius: '9999px',
    color: '#0f4c66',
    ':hover': { backgroundColor: '#2691C2', color: '#fff' },
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

type Props = {
  value: string[]
  onChange: (languages: string[]) => void
  error?: string
  instanceId?: string
}

/**
 * Searchable multi-select for languages — options + free "أخرى" custom entry
 * via Creatable, same RTL/z-index/portal pattern as CountrySelect so the
 * dropdown never gets clipped or layered behind a sibling card.
 */
export default function LanguagesSelect({ value, onChange, error, instanceId = 'emc-languages-select' }: Props) {
  const selected: LanguageOption[] = value.map((v) => OPTIONS.find((o) => o.value === v) ?? { label: v, value: v })

  return (
    <div dir="rtl" className={error ? 'rounded-xl ring-2 ring-red-300' : undefined}>
      <CreatableSelect<LanguageOption, true>
        instanceId={instanceId}
        isMulti
        options={OPTIONS}
        value={selected}
        onChange={(opts: MultiValue<LanguageOption>) => {
          const names = opts.map((o) => o.value)
          onChange(Array.from(new Set(names)))
        }}
        isSearchable
        placeholder="اختر اللغات"
        noOptionsMessage={() => 'لا توجد نتائج'}
        formatCreateLabel={(input) => `إضافة "${input}" (أخرى)`}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        aria-label="اللغات"
        styles={{
          ...rtlStyles,
          control: (base, state) => ({
            ...(rtlStyles.control?.(base, state) ?? base),
            borderColor: error ? '#f87171' : state.isFocused ? '#2691C2' : '#e2e8f0',
          }),
        }}
      />
      {error ? <p className="mt-1.5 text-xs font-bold text-red-600">{error}</p> : null}
    </div>
  )
}
