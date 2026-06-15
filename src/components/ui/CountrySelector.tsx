import CountrySelect, { ALL_COUNTRIES, type Country } from '@/components/forms/CountrySelect'

export type { Country }

/** All ISO countries — use for phone prefix lookups and form prefill. */
export const COUNTRIES: Country[] = ALL_COUNTRIES

type Props = {
  value: Country | null
  onChange: (country: Country) => void
  error?: string
}

export default function CountrySelector({ value, onChange, error }: Props) {
  return (
    <CountrySelect
      value={value}
      onChange={onChange}
      error={error}
      instanceId="emc-volunteer-country-select"
    />
  )
}
