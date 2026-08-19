import { formatEuroInteger } from '@/utils/currency'
import { toLatinDigits } from '@/utils/publicDetailFormat'
import { computePathSavings } from '@/utils/pathUpsell'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import type { LearningPath, LearningPathCourse } from '@/api/learningPathsApi'

/**
 * EMC-WEB-001 §6.2 — «قيمة المكونات منفردة» inside the track purchase box.
 *
 * A COLLAPSED disclosure: the one-line summary carries the whole argument
 * (components alone vs the track price vs what you save), and only the visitor
 * who wants the arithmetic opens the per-course table. Nothing about the buying
 * decision is hidden behind the toggle.
 *
 * HONESTY GATE — the component renders `null` unless `computePathSavings(path)`
 * returns a result. That helper is the single authority: it yields null unless
 * the path carries a real course list where EVERY course price is numeric and
 * the path's own price is genuinely below their sum. So this block can never
 * display an invented total, an invented saving, or a saving of 0%.
 *
 * The per-row price is read here only to LABEL rows that the gate already
 * proved numeric — the totals and the percent always come from the helper.
 */

type ValueBreakdownTone = 'dark' | 'light'

type ValueBreakdownProps = {
  path: LearningPath
  /** `dark` for the dawn hero field (default), `light` for paper surfaces. */
  tone?: ValueBreakdownTone
  className?: string
}

/* Two token palettes so the block reads correctly on either surface. On the navy
   dawn field the fire accent is amber (accent-300) ember is the light-surface
   rendition and fails contrast there. */
const TONE = {
  dark: {
    summary: 'text-ice',
    strong: 'text-white',
    muted: 'text-ice/70',
    accent: 'text-accent-300',
    rule: 'border-white/15',
  },
  light: {
    summary: 'text-ink-500',
    strong: 'text-deepBlue',
    muted: 'text-ink-400',
    accent: 'text-ember',
    rule: 'border-line',
  },
} as const

/**
 * Effective price of one component course, read defensively: the path payload is
 * not typed for course prices. Mirrors the gate's own precedence
 * (discount over base) so a labelled row can never disagree with the total.
 */
function componentPrice(course: LearningPathCourse): number | null {
  const raw = course as unknown as Record<string, unknown>
  for (const key of ['discount_price', 'price'] as const) {
    const value = raw[key]
    if (value == null || value === '') continue
    const n = typeof value === 'number' ? value : Number(String(value).trim())
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  return null
}

export default function ValueBreakdown({ path, tone = 'dark', className = '' }: ValueBreakdownProps) {
  const savings = computePathSavings(path)
  if (!savings) return null

  const t = TONE[tone]
  const rows = (path.courses ?? [])
    .map((course) => ({ course, price: componentPrice(course) }))
    .filter((row): row is { course: LearningPathCourse; price: number } => row.price != null)

  return (
    <details className={`text-right ${className}`}>
      <summary
        className={`flex cursor-pointer list-none items-start gap-2 text-[13px] font-semibold leading-6 ${t.summary} [&::-webkit-details-marker]:hidden`}
      >
        <ArrowLeftIcon size={14} className={`mt-1.5 shrink-0 ${t.accent}`} />
        <span>
          قيمة المكونات منفردة{' '}
          <span dir="ltr" className="tabular-nums line-through">
            {formatEuroInteger(savings.coursesTotal, 'ar')}
          </span>
          {' سعر المسار '}
          <span dir="ltr" className={`font-black tabular-nums ${t.strong}`}>
            {formatEuroInteger(savings.pathPrice, 'ar')}
          </span>{' '}
          <span className={t.accent}>
            (وفّر{' '}
            <span dir="ltr" className="tabular-nums">
              {toLatinDigits(savings.savingsPercent)}%
            </span>
            )
          </span>
        </span>
      </summary>

      <table className="mt-4 w-full text-[12px]">
        <caption className="sr-only">مكونات المسار وأسعارها منفردة</caption>
        <tbody>
          {rows.map(({ course, price }) => (
            <tr key={course.id} className={`border-t ${t.rule}`}>
              <th scope="row" className={`py-2 pe-3 text-right font-semibold ${t.summary}`}>
                {toLatinDigits(course.title)}
              </th>
              <td className={`py-2 text-left ${t.muted}`}>
                <span dir="ltr" className="tabular-nums">
                  {formatEuroInteger(price, 'ar')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={`border-t ${t.rule}`}>
            <th scope="row" className={`py-2 pe-3 text-right font-semibold ${t.muted}`}>
              المجموع منفرداً
            </th>
            <td className={`py-2 text-left ${t.muted}`}>
              <span dir="ltr" className="tabular-nums line-through">
                {formatEuroInteger(savings.coursesTotal, 'ar')}
              </span>
            </td>
          </tr>
          <tr className={`border-t ${t.rule}`}>
            <th scope="row" className={`py-2 pe-3 text-right font-black ${t.strong}`}>
              سعر المسار
            </th>
            <td className={`py-2 text-left font-black ${t.accent}`}>
              <span dir="ltr" className="tabular-nums">
                {formatEuroInteger(savings.pathPrice, 'ar')}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </details>
  )
}
