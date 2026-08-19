import { toLatinDigits } from '@/utils/publicDetailFormat'

/**
 * EMC-WEB-001 §7.1 — the five stages of the fellowship, as one rail.
 *
 * التقييم · مختبرات الخبراء · الإقامة التطبيقية · التحقق · يوم العرض
 *
 * Design Language 2.0: a 2px ocean rail carries the order, numbered dots in Latin
 * numerals (§1) mark the stages, and typography does the rest — no boxes, no
 * shadows, no chips. The rail is vertical on mobile and horizontal from `lg` up.
 * It is drawn as one segment per gap so the line terminates exactly at the fifth
 * dot instead of overshooting past it; the segments meet, so it reads as a single
 * continuous rail at every width.
 *
 * The five NAMES are the entire content of this component. Stage descriptions,
 * durations and deliverables are not in the approved document, so nothing is
 * written beneath a stage rather than inventing a line for it (§11).
 */

/** §7.1 — the approved order. The last stage is the only dot filled solid orange. */
const STAGES = ['التقييم', 'مختبرات الخبراء', 'الإقامة التطبيقية', 'التحقق', 'يوم العرض']

export default function FellowshipStages() {
  return (
    <ol aria-label="مراحل الزمالة" className="relative mt-10 lg:grid lg:grid-cols-5 lg:gap-0">
      {STAGES.map((stage, index) => {
        const isLast = index === STAGES.length - 1

        return (
          <li
            key={stage}
            className="relative pb-9 ps-11 text-right last:pb-0 lg:pb-0 lg:pe-8 lg:ps-0 lg:pt-11"
          >
            {/* The rail — 2px ocean, one segment per gap: vertical on mobile, horizontal at lg. */}
            {!isLast && (
              <span
                aria-hidden
                className="absolute bottom-0 start-[11px] top-7 w-0.5 bg-ocean/35 lg:-end-3 lg:bottom-auto lg:start-8 lg:top-[11px] lg:h-0.5 lg:w-auto"
              />
            )}

            {/* Stage dot — Latin numeral (§1); the fifth is solid customOrange (§7.1). */}
            <span
              aria-hidden
              className={[
                'absolute start-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-black tabular-nums',
                isLast
                  ? 'border-customOrange bg-customOrange text-white'
                  : 'border-ocean bg-white text-ocean',
              ].join(' ')}
            >
              {toLatinDigits(index + 1)}
            </span>

            <p className="font-display text-base font-black leading-snug text-navy sm:text-lg">
              {stage}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
