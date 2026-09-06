import { describe, it, expect } from 'vitest'
import {
  formatEnglishNumber,
  formatEnglishCount,
  formatEnglishPercent,
  formatEnglishDate,
  formatEnglishTime,
  formatEnglishDetailText,
} from '@/utils/formatEnglishNumber'
import {
  decodeUnicodeText,
  decodeUnicodeString,
  decodeUnicodeUnknown,
  decodeUnicodeList,
  sanitizeCourseForDisplay,
} from '@/utils/decodeUnicodeText'
import { dispAr, AR_UNSPECIFIED } from '@/utils/dispAr'
import {
  formatEuro,
  formatEuroInteger,
  formatEuroCompact,
  formatSAR,
  formatSARInteger,
} from '@/utils/currency'

/**
 * Intl inserts a NO-BREAK SPACE (U+00A0) between the currency symbol and the
 * amount in nl-NL. Normalise it so the expectations stay readable while still
 * asserting the exact glyph sequence around it.
 */
const nb = (s: string) => s.replace(/\u00a0/g, ' ')

// ── formatEnglishNumber ──────────────────────────────────────────────────────

describe('formatEnglishNumber', () => {
  it('groups thousands and rounds to two decimals by default', () => {
    expect(formatEnglishNumber(1234.567)).toBe('1,234.57')
    expect(formatEnglishNumber(1000000)).toBe('1,000,000')
  })

  it('accepts numeric strings', () => {
    expect(formatEnglishNumber('1234')).toBe('1,234')
    expect(formatEnglishNumber('-42.5')).toBe('-42.5')
  })

  it('renders zero as "0", not as the empty placeholder', () => {
    expect(formatEnglishNumber(0)).toBe('0')
    expect(formatEnglishNumber('0')).toBe('0')
  })

  it('returns the em-dash placeholder for null, undefined and empty string', () => {
    expect(formatEnglishNumber(null)).toBe('—')
    expect(formatEnglishNumber(undefined)).toBe('—')
    expect(formatEnglishNumber('')).toBe('—')
  })

  it('normalises Arabic-Indic digits to Western ones when the value is not numeric', () => {
    expect(formatEnglishNumber('١٢٣')).toBe('123')
    expect(formatEnglishNumber('مدة ٥ أيام')).toBe('مدة 5 أيام')
  })

  it('passes non-numeric Arabic text through untouched', () => {
    expect(formatEnglishNumber('غير محدد')).toBe('غير محدد')
  })

  it('honours caller-supplied Intl options', () => {
    expect(formatEnglishNumber(1234.567, { maximumFractionDigits: 0 })).toBe('1,235')
    expect(formatEnglishNumber(5, { minimumFractionDigits: 2 })).toBe('5.00')
  })

  it('formats Infinity with the Intl infinity glyph', () => {
    expect(formatEnglishNumber(Infinity)).toBe('∞')
  })

  it('renders a numeric NaN as the placeholder, not the literal "NaN"', () => {
    // Regression: NaN fell through to toLatinDigits(String(value)) and printed
    // "NaN" into KPI tiles. Non-numeric *strings* still pass through unchanged
    // (asserted above), so the guard is numeric-only.
    expect(formatEnglishNumber(Number.NaN)).toBe('—')
  })
})

describe('formatEnglishCount', () => {
  it('rounds to whole numbers with grouping', () => {
    expect(formatEnglishCount(1234.9)).toBe('1,235')
    expect(formatEnglishCount('42')).toBe('42')
  })

  it('keeps zero and rejects empties', () => {
    expect(formatEnglishCount(0)).toBe('0')
    expect(formatEnglishCount(null)).toBe('—')
    expect(formatEnglishCount('')).toBe('—')
  })
})

describe('formatEnglishPercent', () => {
  it('appends a percent sign and trims trailing zeros by default', () => {
    expect(formatEnglishPercent(50)).toBe('50%')
    expect(formatEnglishPercent(12.34)).toBe('12.3%')
    expect(formatEnglishPercent(0)).toBe('0%')
  })

  it('honours a custom fraction-digit count', () => {
    expect(formatEnglishPercent(12.345, 2)).toBe('12.35%')
    expect(formatEnglishPercent(12.345, 0)).toBe('12%')
  })

  it('returns the placeholder — never "NaN%" — for empty or non-numeric input', () => {
    expect(formatEnglishPercent(null)).toBe('—')
    expect(formatEnglishPercent(undefined)).toBe('—')
    expect(formatEnglishPercent('')).toBe('—')
    expect(formatEnglishPercent('abc')).toBe('—')
  })

  it('handles a percentage above 100 and below 0', () => {
    expect(formatEnglishPercent(150)).toBe('150%')
    expect(formatEnglishPercent(-5.5)).toBe('-5.5%')
  })
})

describe('formatEnglishDate', () => {
  it('renders an Arabic month name with Western digits', () => {
    // A naive (offset-free) datetime is parsed in local time, so the rendered
    // day is the authored day in any runtime timezone.
    expect(formatEnglishDate('2026-07-16T12:00:00')).toBe('16 يوليو 2026')
  })

  it('accepts the short month variant', () => {
    expect(formatEnglishDate('2026-07-16T12:00:00', 'short')).toBe('16 يوليو 2026')
  })

  it('returns the placeholder for null, undefined and whitespace-only input', () => {
    expect(formatEnglishDate(null)).toBe('—')
    expect(formatEnglishDate(undefined)).toBe('—')
    expect(formatEnglishDate('')).toBe('—')
    expect(formatEnglishDate('    ')).toBe('—')
  })

  it('degrades to a Latin-digit slice when the string is not a date', () => {
    expect(formatEnglishDate('hello')).toBe('hello')
    expect(formatEnglishDate('٢٠٢٦-٠٧-١٦')).toBe('2026-07-16')
  })
})

describe('formatEnglishTime', () => {
  it('returns an already-formatted 24-hour time unchanged', () => {
    expect(formatEnglishTime('09:00')).toBe('09:00')
    expect(formatEnglishTime('23:45')).toBe('23:45')
  })

  it('converts Arabic-Indic digits in a bare time to Western digits', () => {
    expect(formatEnglishTime('٠٩:٣٠')).toBe('09:30')
  })

  it('keeps seconds when the caller supplies them', () => {
    expect(formatEnglishTime('9:05:00')).toBe('9:05:00')
  })

  it('returns the placeholder for empty and whitespace-only input', () => {
    expect(formatEnglishTime(null)).toBe('—')
    expect(formatEnglishTime(undefined)).toBe('—')
    expect(formatEnglishTime('   ')).toBe('—')
  })

  it('passes through text that is not a time at all', () => {
    expect(formatEnglishTime('noon')).toBe('noon')
  })
})

describe('formatEnglishDetailText', () => {
  it('formats pure numbers and numeric strings as grouped numbers', () => {
    expect(formatEnglishDetailText(1500)).toBe('1,500')
    expect(formatEnglishDetailText('  12.5 ')).toBe('12.5')
    expect(formatEnglishDetailText('-42')).toBe('-42')
  })

  it('keeps mixed Arabic text but normalises embedded digits', () => {
    expect(formatEnglishDetailText('مدة ٣ أشهر')).toBe('مدة 3 أشهر')
    expect(formatEnglishDetailText('السعة: ٢٥ مقعداً')).toBe('السعة: 25 مقعداً')
  })

  it('returns the placeholder for nullish, empty and whitespace-only values', () => {
    expect(formatEnglishDetailText(null)).toBe('—')
    expect(formatEnglishDetailText(undefined)).toBe('—')
    expect(formatEnglishDetailText('')).toBe('—')
    expect(formatEnglishDetailText('   ')).toBe('—')
  })
})

// ── decodeUnicodeText ────────────────────────────────────────────────────────

describe('decodeUnicodeText', () => {
  it('decodes a Laravel-style escaped Arabic string', () => {
    expect(decodeUnicodeText('\\u0625\\u062a\\u0642\\u0627\\u0646')).toBe('إتقان')
  })

  it('decodes escapes embedded in surrounding Latin text', () => {
    expect(decodeUnicodeText('EMC \\u0645\\u0631\\u062d\\u0628\\u0627')).toBe('EMC مرحبا')
  })

  it('leaves an already-decoded Arabic string untouched', () => {
    expect(decodeUnicodeText('إتقان اللغة')).toBe('إتقان اللغة')
  })

  it('escapes embedded double quotes before decoding', () => {
    expect(decodeUnicodeText('say "\\u0645"')).toBe('say "م"')
  })

  it('returns the original string when the escape sequence is malformed', () => {
    expect(decodeUnicodeText('\\uZZZZ')).toBe('\\uZZZZ')
    expect(decodeUnicodeText('half \\u06')).toBe('half \\u06')
  })

  it('returns non-string values by identity', () => {
    const obj = { a: 1 }
    expect(decodeUnicodeText(obj)).toBe(obj)
    expect(decodeUnicodeText(42)).toBe(42)
    expect(decodeUnicodeText(null)).toBeNull()
    expect(decodeUnicodeText(undefined)).toBeUndefined()
  })
})

describe('decodeUnicodeString', () => {
  it('always returns a string, decoding escapes on the way', () => {
    expect(decodeUnicodeString('\\u0645')).toBe('م')
    expect(decodeUnicodeString(42)).toBe('42')
    expect(decodeUnicodeString(false)).toBe('false')
  })

  it('collapses null and undefined to the empty string', () => {
    expect(decodeUnicodeString(null)).toBe('')
    expect(decodeUnicodeString(undefined)).toBe('')
  })
})

describe('decodeUnicodeUnknown', () => {
  it('passes null and undefined straight through', () => {
    expect(decodeUnicodeUnknown(null)).toBeNull()
    expect(decodeUnicodeUnknown(undefined)).toBeUndefined()
  })

  it('leaves blank strings exactly as they were', () => {
    expect(decodeUnicodeUnknown('')).toBe('')
    expect(decodeUnicodeUnknown('   ')).toBe('   ')
  })

  it('trims and decodes a plain string', () => {
    expect(decodeUnicodeUnknown('  \\u0645\\u0631\\u062d\\u0628\\u0627  ')).toBe('مرحبا')
  })

  it('parses and decodes a JSON-encoded array payload', () => {
    expect(decodeUnicodeUnknown('["\\u0645\\u0631\\u062d\\u0628\\u0627", "EMC"]')).toEqual([
      'مرحبا',
      'EMC',
    ])
  })

  it('parses and decodes a JSON-encoded object payload', () => {
    expect(decodeUnicodeUnknown('{"title": "\\u0625\\u062a\\u0642\\u0627\\u0646", "id": 7}')).toEqual({
      title: 'إتقان',
      id: 7,
    })
  })

  it('unwraps a doubly JSON-encoded string', () => {
    expect(decodeUnicodeUnknown('"\\u0645"')).toBe('م')
  })

  it('recurses through nested arrays and objects', () => {
    expect(
      decodeUnicodeUnknown({
        name: '\\u0645',
        tags: ['\\u0631', { deep: '\\u062d' }],
        count: 3,
        missing: null,
      }),
    ).toEqual({ name: 'م', tags: ['ر', { deep: 'ح' }], count: 3, missing: null })
  })

  it('keeps an empty array and an empty object intact', () => {
    expect(decodeUnicodeUnknown([])).toEqual([])
    expect(decodeUnicodeUnknown({})).toEqual({})
  })

  it('leaves non-string primitives alone', () => {
    expect(decodeUnicodeUnknown(7)).toBe(7)
    expect(decodeUnicodeUnknown(true)).toBe(true)
  })

  it('does not mutate the source object', () => {
    const src = { title: '\\u0645' }
    const out = decodeUnicodeUnknown(src)
    expect(src.title).toBe('\\u0645')
    expect(out).not.toBe(src)
  })

  it('falls back to plain decoding when a bracketed string is not valid JSON', () => {
    expect(decodeUnicodeUnknown('{not json}')).toBe('{not json}')
  })
})

describe('decodeUnicodeList / sanitizeCourseForDisplay', () => {
  it('decodes every entry of a string list', () => {
    expect(decodeUnicodeList(['\\u0645', 'plain', ''])).toEqual(['م', 'plain', ''])
  })

  it('returns an empty list unchanged', () => {
    expect(decodeUnicodeList([])).toEqual([])
  })

  it('decodes text fields of a course record while preserving non-text fields', () => {
    const course = {
      id: 12,
      title: '\\u0625\\u062a\\u0642\\u0627\\u0646',
      price: 279,
      is_online: true,
      instructor: { name: '\\u0645\\u0631\\u062d\\u0628\\u0627' },
      description: null,
    }
    expect(sanitizeCourseForDisplay(course)).toEqual({
      id: 12,
      title: 'إتقان',
      price: 279,
      is_online: true,
      instructor: { name: 'مرحبا' },
      description: null,
    })
  })
})

// ── dispAr ───────────────────────────────────────────────────────────────────

describe('dispAr', () => {
  it('exports the Arabic placeholder used across admin/profile screens', () => {
    expect(AR_UNSPECIFIED).toBe('غير محدد')
  })

  it('substitutes the placeholder for nullish values', () => {
    expect(dispAr(null)).toBe(AR_UNSPECIFIED)
    expect(dispAr(undefined)).toBe(AR_UNSPECIFIED)
  })

  it('substitutes the placeholder for blank, em-dash and the literal "null"', () => {
    expect(dispAr('')).toBe(AR_UNSPECIFIED)
    expect(dispAr('   ')).toBe(AR_UNSPECIFIED)
    expect(dispAr('—')).toBe(AR_UNSPECIFIED)
    expect(dispAr('null')).toBe(AR_UNSPECIFIED)
  })

  it('keeps falsy-but-meaningful values such as 0 and false', () => {
    expect(dispAr(0)).toBe('0')
    expect(dispAr(false)).toBe('false')
  })

  it('trims surrounding whitespace from RTL text', () => {
    expect(dispAr('  أحمد الشمري  ')).toBe('أحمد الشمري')
  })

  it('only special-cases "null" — the literal string "undefined" survives', () => {
    // Asymmetry noted in the report; asserted so a future fix is a visible change.
    expect(dispAr('undefined')).toBe('undefined')
  })
})

// ── currency ─────────────────────────────────────────────────────────────────

describe('formatEuro', () => {
  it('formats numbers as nl-NL euros with two decimals', () => {
    expect(nb(formatEuro(279))).toBe('€ 279,00')
    expect(nb(formatEuro(1234.5))).toBe('€ 1.234,50')
    expect(nb(formatEuro(0))).toBe('€ 0,00')
  })

  it('ignores the locale hint and always uses nl-NL (no Arabic-Indic digits)', () => {
    expect(nb(formatEuro(279, { locale: 'ar' }))).toBe('€ 279,00')
    expect(formatEuro(279, { locale: 'ar' })).not.toMatch(/[٠-٩]/)
  })

  it('coerces numeric strings, stripping spaces and thousands separators', () => {
    expect(nb(formatEuro('279'))).toBe('€ 279,00')
    expect(nb(formatEuro('  279  '))).toBe('€ 279,00')
    expect(nb(formatEuro('1,234.56'))).toBe('€ 1.234,56')
    expect(nb(formatEuro('1٬234'))).toBe('€ 1.234,00')
  })

  it('formats negative amounts (refunds) with a leading minus', () => {
    expect(nb(formatEuro(-50))).toBe('€ -50,00')
  })

  it('returns the em-dash fallback for nullish and empty values', () => {
    expect(formatEuro(null)).toBe('—')
    expect(formatEuro(undefined)).toBe('—')
    expect(formatEuro('')).toBe('—')
  })

  it('returns the fallback for non-finite and non-numeric values', () => {
    expect(formatEuro(Number.NaN)).toBe('—')
    expect(formatEuro(Infinity)).toBe('—')
    expect(formatEuro('abc')).toBe('—')
    expect(formatEuro({})).toBe('—')
  })

  it('returns the fallback for Arabic-Indic digit strings, which JS cannot parse', () => {
    expect(formatEuro('١٢٣')).toBe('—')
  })

  it('honours a caller-supplied fallback string', () => {
    expect(formatEuro(null, { fallback: 'مجاني' })).toBe('مجاني')
    expect(formatEuro('abc', { fallback: '' })).toBe('')
  })

  it('honours explicit fraction-digit bounds', () => {
    expect(nb(formatEuro(279, { minimumFractionDigits: 0, maximumFractionDigits: 0 }))).toBe('€ 279')
    expect(nb(formatEuro(279.456, { maximumFractionDigits: 3 }))).toBe('€ 279,456')
  })
})

describe('formatEuroInteger', () => {
  it('rounds to whole euros', () => {
    expect(nb(formatEuroInteger(1234.5))).toBe('€ 1.235')
    expect(nb(formatEuroInteger(0))).toBe('€ 0')
  })

  it('returns the placeholder for empty input', () => {
    expect(formatEuroInteger(null)).toBe('—')
    expect(formatEuroInteger('')).toBe('—')
  })
})

describe('formatEuroCompact', () => {
  it('produces compact notation for chart axes', () => {
    expect(nb(formatEuroCompact(12500))).toBe('€ 12,5K')
  })

  it('returns an EMPTY string (not an em-dash) when there is nothing to plot', () => {
    expect(formatEuroCompact(null)).toBe('')
    expect(formatEuroCompact(undefined)).toBe('')
    expect(formatEuroCompact('')).toBe('')
    expect(formatEuroCompact('abc')).toBe('')
  })

  it('still formats zero', () => {
    expect(nb(formatEuroCompact(0))).toBe('€ 0')
  })
})

describe('formatSAR', () => {
  it('prefixes the Saudi Riyal sign and uses nl-NL decimals', () => {
    expect(formatSAR(279)).toBe('⃁ 279,00')
    expect(formatSAR(1234.5)).toBe('⃁ 1.234,50')
  })

  it('accepts numeric strings and strips separators', () => {
    expect(formatSAR('1,234.5')).toBe('⃁ 1.234,50')
  })

  it('returns the fallback for nullish, empty and non-numeric values', () => {
    expect(formatSAR(null)).toBe('—')
    expect(formatSAR(undefined)).toBe('—')
    expect(formatSAR('')).toBe('—')
    expect(formatSAR('abc')).toBe('—')
    expect(formatSAR(null, { fallback: 'غير متاح' })).toBe('غير متاح')
  })

  it('honours explicit fraction-digit bounds', () => {
    expect(formatSAR(279, { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe('⃁ 279')
  })

  it('formats whole riyals via formatSARInteger', () => {
    expect(formatSARInteger(1234.5)).toBe('⃁ 1.235')
    expect(formatSARInteger(null)).toBe('—')
  })
})
