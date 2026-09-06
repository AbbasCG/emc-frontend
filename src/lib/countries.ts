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

/** ISO alpha-2 → regional-indicator flag emoji. */
export function codeToFlag(code: string): string {
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

/** Shared signup / volunteer country list — single source of truth. */
export const ALL_COUNTRIES: Country[] = buildCountries()

/** Lookup by ISO alpha-2 code (case-insensitive). */
export function getCountryByCode(code: string | null | undefined): Country | null {
  if (!code?.trim()) return null
  const normalized = code.trim().toUpperCase()
  return ALL_COUNTRIES.find((c) => c.code === normalized) ?? null
}

/**
 * Resolve a country from ISO code and/or free-text name.
 * Prefers code; falls back to exact Arabic/English official names only.
 * Does not invent mappings from demonyms or phone codes.
 */
export function resolveCountry(
  code?: string | null,
  nameOrText?: string | null,
): Country | null {
  const byCode = getCountryByCode(code)
  if (byCode) return byCode

  const text = nameOrText?.trim()
  if (!text) return null

  if (/^[A-Za-z]{2}$/.test(text)) {
    return getCountryByCode(text)
  }

  const lower = text.toLowerCase()
  return (
    ALL_COUNTRIES.find((c) => c.name === text) ??
    ALL_COUNTRIES.find((c) => c.englishName.toLowerCase() === lower) ??
    null
  )
}

/** Display: 🇳🇱 NL (هولندا) — or plain text when unmapped. */
export function formatCountryDisplay(
  code?: string | null,
  nameOrText?: string | null,
): { country: Country | null; label: string; flag: string | null } {
  const country = resolveCountry(code, nameOrText)
  if (country) {
    return {
      country,
      flag: country.flag,
      label: `${country.code} (${country.name})`,
    }
  }
  const fallback = (nameOrText ?? code ?? '').trim()
  return { country: null, flag: null, label: fallback }
}
