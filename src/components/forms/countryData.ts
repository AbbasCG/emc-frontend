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
