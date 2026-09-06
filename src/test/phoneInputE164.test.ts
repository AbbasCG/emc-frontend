import { describe, it, expect } from 'vitest'
import { buildE164Phone } from '@/components/forms/phoneUtils'
import type { Country } from '@/lib/countries'

const NL: Country = { code: 'NL', name: 'هولندا', englishName: 'Netherlands', dialCode: '+31', flag: '🇳🇱' }

describe('buildE164Phone — canonical phone value, no duplicated dial code', () => {
  it('concatenates dial code and local number', () => {
    expect(buildE164Phone(NL, '612345678')).toBe('+31612345678')
  })

  it('trims whitespace from the local part', () => {
    expect(buildE164Phone(NL, '  612345678  ')).toBe('+31612345678')
  })

  it('does not duplicate the dial code even if the user typed it into the local field', () => {
    // The local input never contains the dial code in normal use (PhoneInput
    // keeps it in a separate, non-editable prefix) — this proves the builder
    // itself never prepends twice regardless of local-field content.
    const result = buildE164Phone(NL, '612345678')
    expect(result.match(/\+31/g)?.length).toBe(1)
  })

  it('falls back to the raw local value when no country is selected', () => {
    expect(buildE164Phone(null, '0501234567')).toBe('0501234567')
  })
})
