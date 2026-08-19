import { courseDurationLabel, journeyStations } from '@/pages/LearningPaths/learningPathDisplay'
import { toLatinDigits } from '@/utils/publicDetailFormat'
import type { LearningPath, LearningPathCourse } from '@/api/learningPathsApi'

/**
 * EMC-WEB-001 §6.2 — «رحلتك شهراً بشهر»: the centrepiece of the track page.
 *
 * One rail, numbered dots, and three facts per station: the unit's name, how
 * long it runs, and the concrete thing the learner walks out with. Vertical on
 * phones (the rail runs down the inline-start edge), a horizontal rail from lg
 * up so the whole journey is legible in one glance.
 *
 * Every station comes from the path's real course list, ordered by the shared
 * `journeyStations` helper (sort_order / order, whichever the payload ships) —
 * never from `courses_count`, which can outrun the rows actually returned.
 * A station with no duration simply shows none; a deliverable is labelled as
 * such ONLY when the API sends a deliverable field, so the label never dresses
 * up a generic description as a promised output.
 *
 * Design language 2.0: hairline rail, no cards, no boxes, no shadows.
 */

type TrackMonthTimelineProps = { path: LearningPath }

/** Beyond this many stations the horizontal rail's cells get too narrow to read. */
const HORIZONTAL_MAX = 6

/** The station's concrete output — a real API field only, never inferred. */
function stationDeliverable(course: LearningPathCourse): string | null {
  const raw = course as unknown as Record<string, unknown>
  for (const key of ['deliverable', 'final_deliverable', 'outcome', 'project', 'final_project']) {
    const value = raw[key]
    if (typeof value === 'string' && value.trim()) return toLatinDigits(value.trim())
  }
  return null
}

export default function TrackMonthTimeline({ path }: TrackMonthTimelineProps) {
  const total = (path.courses ?? []).length
  if (total === 0) return null

  const { items } = journeyStations(path, total)
  if (items.length === 0) return null

  const horizontal = items.length <= HORIZONTAL_MAX

  return (
    <section aria-labelledby="track-timeline-title">
      <h2
        id="track-timeline-title"
        className="emc-title-arc mb-10 font-display text-2xl font-black tracking-tight text-deepBlue sm:text-3xl"
      >
        رحلتك شهراً بشهر
      </h2>

      <ol className={`relative ${horizontal ? 'lg:grid lg:auto-cols-fr lg:grid-flow-col' : ''}`}>
        {items.map((course, index) => {
          const weeks = courseDurationLabel(course)
          const deliverable = stationDeliverable(course)
          const isLast = index === items.length - 1
          return (
            <li
              key={course.id}
              className={`relative flex gap-4 pb-9 last:pb-0 ${
                horizontal ? 'lg:flex-col lg:gap-4 lg:px-3 lg:pb-0' : ''
              }`}
            >
              {/* Rail segment — drawn per station so it never overshoots the last dot. */}
              {!isLast && (
                <span
                  aria-hidden
                  className={`absolute bottom-0 start-[19px] top-11 w-px bg-line ${
                    horizontal ?
                      'lg:bottom-auto lg:end-0 lg:top-[19px] lg:h-px lg:w-auto lg:start-[3.25rem]'
                    : ''
                  }`}
                />
              )}

              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-navy bg-paper font-display text-sm font-black tabular-nums text-deepBlue">
                {toLatinDigits(index + 1)}
              </span>

              <div className="min-w-0 flex-1 text-right">
                <h3 className="font-black leading-7 text-deepBlue">{toLatinDigits(course.title)}</h3>
                {weeks && <p className="mt-1 text-xs font-black text-ocean">{weeks}</p>}
                {deliverable ?
                  <p className="mt-2 text-sm leading-7 text-ink-500">
                    <span className="font-black text-ember">المُخرَج: </span>
                    {deliverable}
                  </p>
                : course.short_description ?
                  <p className="mt-2 text-sm leading-7 text-ink-400">
                    {toLatinDigits(course.short_description)}
                  </p>
                : null}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
