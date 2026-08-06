import * as FlagSvgs from 'country-flag-icons/string/3x2'
import { formatCountryDisplay, codeToFlag } from '@/lib/countries'

/**
 * Shared country/nationality display: real flag + ISO + localized name.
 * Uses bundled SVG strings from `country-flag-icons` (no CDN / no emoji
 * letter-glyph duplication on Windows).
 */
export default function CountryDisplay({
  code,
  localizedName,
}: {
  code?: string | null
  localizedName?: string | null
}) {
  const { country, label } = formatCountryDisplay(code, localizedName)

  if (!label) return null

  if (!country) {
    return (
      <span data-testid="country-value" className="font-bold text-deepBlue" dir="auto">
        {label}
      </span>
    )
  }

  const svgMarkup = (FlagSvgs as Record<string, string | undefined>)[country.code]
  const dataUri = svgMarkup
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`
    : null

  return (
    <span
      data-testid="country-value"
      className="inline-flex flex-wrap items-center gap-1.5"
      dir="ltr"
      aria-label={country.name}
    >
      {dataUri ? (
        <img
          src={dataUri}
          alt=""
          width={22}
          height={15}
          className="h-3.5 w-[1.35rem] shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.08)]"
          aria-hidden
        />
      ) : (
        <span
          className="inline-block h-3.5 w-[1.35rem] shrink-0 overflow-hidden text-[14px] leading-none"
          aria-hidden
          data-testid="country-flag-emoji-fallback"
        >
          {country.flag || codeToFlag(country.code)}
        </span>
      )}
      <span className="font-black tracking-wide text-deepBlue">{country.code}</span>
      <span className="font-bold text-deepBlue" dir="rtl">
        ({country.name})
      </span>
    </span>
  )
}
