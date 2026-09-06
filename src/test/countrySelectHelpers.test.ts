import { describe, it, expect } from 'vitest'
import {
  codeToFlag,
  formatCountryDisplay,
  getCountryByCode,
  resolveCountry,
} from '@/lib/countries'

describe('CountrySelect shared helpers', () => {
  it('getCountryByCode resolves ISO codes case-insensitively', () => {
    expect(getCountryByCode('nl')?.code).toBe('NL')
    expect(getCountryByCode('YE')?.name).toMatch(/يمن/)
    expect(getCountryByCode(null)).toBeNull()
  })

  it('codeToFlag returns regional-indicator emoji', () => {
    expect(codeToFlag('NL')).toBe('🇳🇱')
    expect(codeToFlag('YE')).toBe('🇾🇪')
  })

  it('resolveCountry prefers code over free text', () => {
    const c = resolveCountry('NL', 'اليمن')
    expect(c?.code).toBe('NL')
  })

  it('resolveCountry maps exact Arabic/English names and ISO text', () => {
    expect(resolveCountry(null, 'هولندا')?.code).toBe('NL')
    expect(resolveCountry(null, 'Netherlands')?.code).toBe('NL')
    expect(resolveCountry(null, 'nl')?.code).toBe('NL')
  })

  it('resolveCountry does not invent demonym mappings', () => {
    expect(resolveCountry(null, 'هولندي')).toBeNull()
    expect(resolveCountry(null, 'يمني')).toBeNull()
  })

  it('formatCountryDisplay builds flag + ISO + localized name', () => {
    const d = formatCountryDisplay('NL', 'هولندا')
    expect(d.flag).toBe('🇳🇱')
    expect(d.label).toBe('NL (هولندا)')
    expect(d.country?.englishName).toMatch(/Netherlands/i)
  })

  it('formatCountryDisplay falls back to plain text when unmapped', () => {
    const d = formatCountryDisplay(null, 'مدينة غير معروفة')
    expect(d.country).toBeNull()
    expect(d.flag).toBeNull()
    expect(d.label).toBe('مدينة غير معروفة')
  })
})
