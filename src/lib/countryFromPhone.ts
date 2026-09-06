import { parsePhoneNumber } from 'libphonenumber-js'

/**
 * Derive the ISO 3166-1 alpha-2 country code (e.g. 'NL', 'YE') from a phone
 * number string. Matches the uppercase `code` shape used by CountrySelect.
 *
 * Returns null when the value is empty or cannot be parsed into a country.
 */
export function countryFromPhone(value: string | undefined | null): string | null {
  if (!value) return null
  try {
    const parsed = parsePhoneNumber(value)
    return parsed?.country ?? null
  } catch {
    return null
  }
}
