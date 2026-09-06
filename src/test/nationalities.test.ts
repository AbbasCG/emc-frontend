import { describe, expect, it } from 'vitest'
import {
  buildNationalityOptions,
  buildResidenceCountryOptions,
  getNationalityLabel,
  resolveNationalityCode,
} from '@/data/nationalities'

describe('nationalities helpers', () => {
  it('maps ISO codes to Arabic country names (not gendered demonyms)', () => {
    expect(getNationalityLabel('NL')).toBe('هولندا')
    expect(getNationalityLabel('SA')).toBe('السعودية')
    expect(getNationalityLabel('YE')).toBe('اليمن')
    expect(getNationalityLabel('PS')).toBe('فلسطين')
    expect(getNationalityLabel('EG')).toBe('مصر')
    expect(getNationalityLabel('JO')).toBe('الأردن')
    expect(getNationalityLabel('SY')).toBe('سوريا')
    expect(getNationalityLabel('IQ')).toBe('العراق')
  })

  it('resolves ISO, country name, and legacy demonyms to ISO', () => {
    expect(resolveNationalityCode('NL')).toBe('NL')
    expect(resolveNationalityCode('هولندا')).toBe('NL')
    expect(resolveNationalityCode('Netherlands')).toBe('NL')
    expect(resolveNationalityCode('هولندية')).toBe('NL')
    expect(resolveNationalityCode('هولندي')).toBe('NL')
  })

  it('does not invent a mapping from unknown free text', () => {
    expect(resolveNationalityCode('جنسية فضائية')).toBeNull()
  })

  it('residence options never include dial codes in the label', () => {
    const nl = buildResidenceCountryOptions().find((o) => o.value === 'NL')
    expect(nl?.label).toBe('هولندا')
    expect(nl?.label).not.toMatch(/\+/)
    expect(nl?.keywords.join(' ')).not.toMatch(/\+31/)
  })

  it('nationality options use country names + ISO meta (not demonyms)', () => {
    const nl = buildNationalityOptions().find((o) => o.value === 'NL')
    expect(nl?.label).toBe('هولندا')
    expect(nl?.meta).toBe('NL')
    expect(nl?.label).not.toBe('هولندية')
    expect(nl?.keywords).toEqual(expect.arrayContaining(['هولندا', 'Netherlands', 'NL']))

    const ye = buildNationalityOptions().find((o) => o.value === 'YE')
    expect(ye?.label).toBe('اليمن')
    expect(ye?.meta).toBe('YE')
  })
})
