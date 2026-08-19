import type { LearningPath } from '@/api/learningPathsApi'
import { toLatinDigits } from '@/utils/publicDetailFormat'
import { formatPathDuration, levelLabelAr } from '@/pages/LearningPaths/learningPathDisplay'

/**
 * EMC-WEB-001 §6.1 — the tracks comparison, seated ABOVE the catalogue list.
 *
 * Four columns answer the four questions a visitor asks before choosing:
 * لمن؟ · المدة · المتطلب المسبق · المخرَج الوظيفي.
 *
 * Every cell is read from a field the API actually sends (`level`, `duration` +
 * `duration_unit`, `requirements[]`, `learning_outcomes[]`). A field the payload
 * does not carry renders «—» — nothing is inferred, nothing is written on the
 * API's behalf, and «قريباً» never appears.
 *
 * Design Language 2.0: hairline rows and typography, no card, no shadow. The
 * real <table> is desktop-only and wrapped in `overflow-x-auto`; below `md` the
 * same data becomes a stacked definition list so the page never scrolls
 * sideways on a 380px screen.
 */

type Props = {
  /** The tracks currently listed below — the table compares exactly what the visitor sees. */
  paths: LearningPath[]
}

type ComparisonRow = {
  id: number
  title: string
  audience: string | null
  duration: string | null
  requirement: string | null
  outcome: string | null
}

/** §6.1 — the level enum rendered as an audience answer. A 1:1 mapping, never a claim. */
const AUDIENCE_AR: Record<string, string> = {
  beginner: 'للمبتدئين',
  intermediate: 'للمستوى المتوسط',
  advanced: 'للمستوى المتقدم',
}

const COLUMNS = [
  { key: 'audience', label: 'لمن؟' },
  { key: 'duration', label: 'المدة' },
  { key: 'requirement', label: 'المتطلب المسبق' },
  { key: 'outcome', label: 'المخرَج الوظيفي' },
] as const

function audienceLabel(path: LearningPath): string | null {
  const key = path.level?.trim().toLowerCase()
  if (!key) return null
  return AUDIENCE_AR[key] ?? levelLabelAr(path.level)
}

/** First entry of an API string list, trimmed. Returns null for an absent/blank list. */
function firstEntry(list: string[] | null | undefined): string | null {
  if (!Array.isArray(list)) return null
  for (const entry of list) {
    const text = typeof entry === 'string' ? entry.trim() : ''
    if (text) return toLatinDigits(text)
  }
  return null
}

function toRow(path: LearningPath): ComparisonRow {
  const duration = formatPathDuration(path)
  return {
    id: path.id,
    title: path.title,
    audience: audienceLabel(path),
    duration: duration ? toLatinDigits(duration) : null,
    requirement: firstEntry(path.requirements),
    outcome: firstEntry(path.learning_outcomes),
  }
}

/** The «—» placeholder for a field the API did not send. */
function Missing() {
  return (
    <span className="text-ink-300">
      <span aria-hidden>—</span>
      <span className="sr-only">غير متاح</span>
    </span>
  )
}

export default function TracksComparisonTable({ paths }: Props) {
  if (paths.length === 0) return null
  const rows = paths.map(toRow)

  return (
    <section aria-labelledby="tracks-comparison-title" className="bg-paper">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <h2
          id="tracks-comparison-title"
          className="emc-title-arc font-display text-2xl font-black tracking-tight text-deepBlue sm:text-3xl"
        >
          قارن المسارات
        </h2>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-ink-400">
          أربعة أسئلة تحسم اختيارك: لمن هذا المسار، كم يستغرق، ما الذي تحتاجه قبل أن تبدأ، وما الذي
          ستخرج به.
        </p>

        {/* Desktop — a real table on hairlines, scrollable inside its own container */}
        <div className="mt-9 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[46rem] border-collapse">
            <caption className="sr-only">
              مقارنة المسارات حسب الفئة والمدة والمتطلب المسبق والمخرَج الوظيفي
            </caption>
            <thead>
              <tr className="border-b border-line">
                <th
                  scope="col"
                  className="w-[24%] py-3 pe-5 text-start text-[11px] font-black tracking-[0.14em] text-ink-500"
                >
                  المسار
                </th>
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="py-3 pe-5 text-start text-[11px] font-black tracking-[0.14em] text-ink-500 last:pe-0"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line align-top">
                  <th scope="row" className="py-5 pe-5 text-start">
                    <a
                      href={`#path-${String(row.id)}`}
                      className="font-display text-base font-black leading-snug text-deepBlue transition-colors duration-200 hover:text-customBlue"
                    >
                      {row.title}
                    </a>
                  </th>
                  <td className="py-5 pe-5 text-sm font-semibold leading-7 text-ink-500">
                    {row.audience ?? <Missing />}
                  </td>
                  <td className="py-5 pe-5 text-sm font-black leading-7 tabular-nums text-ink-600">
                    {row.duration ?? <Missing />}
                  </td>
                  <td className="py-5 pe-5 text-sm leading-7 text-ink-500">
                    {row.requirement ?? <Missing />}
                  </td>
                  <td className="py-5 text-sm leading-7 text-ink-500">{row.outcome ?? <Missing />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile — the same data as a stacked definition list (no sideways scroll) */}
        <div className="mt-8 md:hidden">
          {rows.map((row) => (
            <div key={row.id} className="border-b border-line py-6 first:border-t first:border-line">
              <a
                href={`#path-${String(row.id)}`}
                className="font-display text-lg font-black leading-snug text-deepBlue transition-colors duration-200 hover:text-customBlue"
              >
                {row.title}
              </a>
              <dl className="mt-4 space-y-2.5">
                {COLUMNS.map((column) => (
                  <div key={column.key} className="flex items-baseline gap-4">
                    <dt className="w-28 shrink-0 text-[11px] font-black tracking-[0.12em] text-ink-400">
                      {column.label}
                    </dt>
                    <dd
                      className={`min-w-0 flex-1 text-sm leading-7 text-ink-500 ${
                        column.key === 'duration' ? 'font-black tabular-nums text-ink-600' : ''
                      }`}
                    >
                      {row[column.key] ?? <Missing />}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
