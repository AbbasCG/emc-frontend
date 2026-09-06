import { ALL_COUNTRIES } from '@/lib/countries'

/**
 * Legacy demonym aliases → ISO. Used only to resolve historically stored free-text
 * values (e.g. "هولندية" / "هولندي"). Display always uses Arabic country names
 * from ALL_COUNTRIES — never these adjectives.
 */
const LEGACY_DEMONYM_TO_CODE: Record<string, string> = {
  إماراتية: 'AE', أفغانية: 'AF', ألبانية: 'AL', أرمنية: 'AM', أنغولية: 'AO',
  أرجنتينية: 'AR', نمساوية: 'AT', أسترالية: 'AU', أذربيجانية: 'AZ', بوسنية: 'BA',
  بنغلاديشية: 'BD', بلجيكية: 'BE', بلغارية: 'BG', بحرينية: 'BH', بنينية: 'BJ',
  برازيلية: 'BR', بيلاروسية: 'BY', كندية: 'CA', كونغولية: 'CD', سويسرية: 'CH',
  إيفوارية: 'CI', تشيلية: 'CL', كاميرونية: 'CM', صينية: 'CN', كولومبية: 'CO',
  كوبية: 'CU', قبرصية: 'CY', تشيكية: 'CZ', ألمانية: 'DE', جيبوتية: 'DJ',
  دنماركية: 'DK', جزائرية: 'DZ', إكوادورية: 'EC', مصرية: 'EG', إريترية: 'ER',
  إسبانية: 'ES', إثيوبية: 'ET', فنلندية: 'FI', فرنسية: 'FR', بريطانية: 'GB',
  جورجية: 'GE', غانية: 'GH', غينية: 'GN', يونانية: 'GR', كرواتية: 'HR',
  هنغارية: 'HU', إندونيسية: 'ID', أيرلندية: 'IE', إسرائيلية: 'IL', هندية: 'IN',
  عراقية: 'IQ', إيرانية: 'IR', إيطالية: 'IT', أردنية: 'JO', يابانية: 'JP',
  كينية: 'KE', قيرغيزية: 'KG', كويتية: 'KW', كازاخستانية: 'KZ', لبنانية: 'LB',
  سريلانكية: 'LK', ليبيرية: 'LR', ليبية: 'LY', مغربية: 'MA', مولدوفية: 'MD',
  مونتينيغرية: 'ME', مدغشقرية: 'MG', مقدونية: 'MK', مالية: 'ML', موريتانية: 'MR',
  مالطية: 'MT', مكسيكية: 'MX', ماليزية: 'MY', نيجرية: 'NE', نيجيرية: 'NG',
  هولندية: 'NL', نرويجية: 'NO', نيبالية: 'NP', نيوزيلندية: 'NZ', 'عُمانية': 'OM',
  بنمية: 'PA', بيروفية: 'PE', فلبينية: 'PH', باكستانية: 'PK', بولندية: 'PL',
  فلسطينية: 'PS', برتغالية: 'PT', قطرية: 'QA', رومانية: 'RO', صربية: 'RS',
  روسية: 'RU', رواندية: 'RW', سعودية: 'SA', سودانية: 'SD', سويدية: 'SE',
  سنغافورية: 'SG', سلوفينية: 'SI', سلوفاكية: 'SK', سنغالية: 'SN', صومالية: 'SO',
  'جنوب سودانية': 'SS', سورية: 'SY', تشادية: 'TD', توغولية: 'TG', تايلاندية: 'TH',
  طاجيكية: 'TJ', تركمانستانية: 'TM', تونسية: 'TN', تركية: 'TR', تنزانية: 'TZ',
  أوكرانية: 'UA', أوغندية: 'UG', أمريكية: 'US', أوزبكستانية: 'UZ', فنزويلية: 'VE',
  فيتنامية: 'VN', يمنية: 'YE', 'جنوب أفريقية': 'ZA', زامبية: 'ZM', زيمبابوية: 'ZW',
  // Common masculine free-text variants
  هولندي: 'NL', يمني: 'YE', سعودي: 'SA', فلسطيني: 'PS', مصري: 'EG',
  أردني: 'JO', سوري: 'SY', عراقي: 'IQ', فرنسي: 'FR', ألماني: 'DE',
}

/** Arabic country name for an ISO nationality code (from shared ALL_COUNTRIES). */
export function getNationalityLabel(code: string | null | undefined): string | null {
  if (!code?.trim()) return null
  const iso = code.trim().toUpperCase()
  return ALL_COUNTRIES.find((c) => c.code === iso)?.name ?? null
}

/**
 * Resolve stored nationality (ISO, country name, or legacy demonym) to an ISO code.
 * Does not invent mappings from phone dial codes.
 */
export function resolveNationalityCode(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null
  const text = stored.trim()

  if (/^[A-Za-z]{2}$/.test(text)) {
    const iso = text.toUpperCase()
    return ALL_COUNTRIES.some((c) => c.code === iso) ? iso : null
  }

  const byLegacy = LEGACY_DEMONYM_TO_CODE[text]
  if (byLegacy) return byLegacy

  const lower = text.toLowerCase()
  const byCountryName = ALL_COUNTRIES.find(
    (c) => c.name === text || c.englishName.toLowerCase() === lower,
  )
  return byCountryName?.code ?? null
}

/**
 * Nationality dropdown options — reuse ALL_COUNTRIES.
 * Display: Arabic country name + ISO meta. Value: ISO code.
 */
export function buildNationalityOptions(): {
  value: string
  label: string
  meta: string
  keywords: string[]
  leading: string
}[] {
  return ALL_COUNTRIES.map((c) => ({
    value: c.code,
    label: c.name,
    meta: c.code,
    leading: c.flag,
    keywords: [c.name, c.englishName, c.code, c.flag],
  }))
}

/** Options for residence country — no dial codes. */
export function buildResidenceCountryOptions(): {
  value: string
  label: string
  keywords: string[]
  leading: string
}[] {
  return ALL_COUNTRIES.map((c) => ({
    value: c.code,
    label: c.name,
    leading: c.flag,
    keywords: [c.name, c.englishName, c.code, c.flag],
  }))
}
