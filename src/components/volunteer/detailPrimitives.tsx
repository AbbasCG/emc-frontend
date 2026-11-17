import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { InfoRow } from '@/components/detailModal/detailModalUi'
import type { QuestionAnswer } from '@/lib/volunteerRequestLabels'
import { toHttpUrl } from '@/utils/safeUrl'

/**
 * Small presentational pieces of the volunteer data windows (the accepted-volunteers popup and the operations
 * drawer). They sit on the shared detail-window look (`InfoRow`, `CardShell`) and add one rule of their own: an empty
 * value is a dash, never a blank, so a missing answer is visible as missing.
 */

/** The dash shown for an empty value; screen readers hear «غير متوفر». */
export function EmptyValue() {
  return (
    <span className="font-semibold text-slate-300">
      <span aria-hidden="true">—</span>
      <span className="sr-only">غير متوفر</span>
    </span>
  )
}

export interface DataRowSpec {
  label: string
  value: ReactNode
  preserveLineBreaks?: boolean
}

/** A column of label/value rows; the last one has no divider, empty values show the dash. */
export function DataRows({ rows, wide }: { rows: DataRowSpec[]; wide?: boolean }) {
  return (
    <>
      {rows.map((row, i) => (
        <InfoRow
          key={row.label}
          label={row.label}
          value={row.value == null || row.value === '' || row.value === false ? <EmptyValue /> : typeof row.value === 'string' ? <bdi>{row.value}</bdi> : row.value}
          wide={wide}
          preserveLineBreaks={row.preserveLineBreaks}
          last={i === rows.length - 1}
        />
      ))}
    </>
  )
}

const CHIP_TONES = {
  blue: 'bg-customBlue/10 text-customBlue ring-1 ring-customBlue/15',
  sky: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
} as const

/** A small heading with a list of chips under it (skills, days, languages…); the dash when there are none. */
export function ChipBlock({ label, items, tone = 'blue' }: { label: string; items: readonly string[] | null | undefined; tone?: keyof typeof CHIP_TONES }) {
  const list = (items ?? []).map((i) => String(i).trim()).filter(Boolean)

  return (
    <div className="py-2">
      <p className="mb-1.5 text-[11px] font-bold text-slate-400">{label}</p>
      {list.length === 0 ? (
        <EmptyValue />
      ) : (
        <ul className="flex flex-wrap gap-1.5" aria-label={label}>
          {list.map((item, i) => (
            // The same word can be chosen twice in free text: the position keeps the keys unique.
            <li key={`${i}-${item}`} dir="auto" className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${CHIP_TONES[tone]}`}>
              <bdi>{item}</bdi>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** A link to a place the applicant typed: only a real http(s) address becomes a link, anything else stays text. */
export function ExternalLinkValue({ url, label }: { url: string | null | undefined; label?: string }) {
  const text = (url ?? '').trim()
  if (!text) return <EmptyValue />
  const href = toHttpUrl(text)
  if (!href) return <bdi>{text}</bdi>

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      dir="ltr"
      className="inline-flex max-w-full items-center gap-1 text-customBlue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40"
    >
      <span className="truncate">{label ?? text}</span>
      <ExternalLink size={12} className="shrink-0" aria-hidden="true" />
    </a>
  )
}

/** Question and answer pairs (the apply form's scales and practical situations), in the form's own wording. */
export function QuestionAnswerList({ label, items }: { label: string; items: QuestionAnswer[] }) {
  return (
    <div className="py-2">
      <p className="mb-1.5 text-[11px] font-bold text-slate-400">{label}</p>
      {items.length === 0 ? (
        <EmptyValue />
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.key} className="rounded-xl bg-slate-50 px-3 py-2 text-[12px] leading-6 text-slate-700 ring-1 ring-slate-100">
              <bdi className="block font-bold text-deepBlue">{item.question}</bdi>
              <bdi className="block font-semibold text-slate-600">{item.answer || '—'}</bdi>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
