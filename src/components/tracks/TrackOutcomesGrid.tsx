import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { toLatinDigits } from '@/utils/publicDetailFormat'
import type { LearningPath } from '@/api/learningPathsApi'

/**
 * EMC-WEB-001 §6.2 — «ماذا يحمل خريج المسار».
 *
 * The graduate's inventory: what the learning outcomes say they will be able to
 * do, plus the certificate they leave with. Editorial rows on hairlines with a
 * small left arrow — no tiles, no tinted cards, no shadows (design language 2.0).
 *
 * Everything is API content. When the path carries neither outcomes nor a
 * certificate name the section is simply absent — no placeholder, no «قريباً».
 */

type TrackOutcomesGridProps = { path: LearningPath }

export default function TrackOutcomesGrid({ path }: TrackOutcomesGridProps) {
  const outcomes = (path.learning_outcomes ?? [])
    .map((item) => (typeof item === 'string' ? toLatinDigits(item.trim()) : ''))
    .filter(Boolean)

  const certificateName = typeof path.certificate_name === 'string' ? path.certificate_name.trim() : ''
  // The API sometimes stores the word «شهادة» inside the name and sometimes not.
  const certificate =
    certificateName === '' ? null
    : certificateName.startsWith('شهادة') ? toLatinDigits(certificateName)
    : `شهادة ${toLatinDigits(certificateName)}`

  if (outcomes.length === 0 && !certificate) return null

  return (
    <section aria-labelledby="track-outcomes-title">
      <h2
        id="track-outcomes-title"
        className="emc-title-arc mb-6 font-display text-2xl font-black tracking-tight text-deepBlue"
      >
        ماذا يحمل خريج المسار
      </h2>

      <ul className="grid gap-x-10 sm:grid-cols-2">
        {outcomes.map((item, index) => (
          <li key={index} className="emc-row flex items-start gap-3 px-2 py-4">
            <ArrowLeftIcon size={14} className="mt-1.5 shrink-0 text-customBlue" />
            <span className="text-sm font-medium leading-7 text-ink-500">{item}</span>
          </li>
        ))}
        {certificate && (
          <li className="emc-row flex items-start gap-3 px-2 py-4">
            <ArrowLeftIcon size={14} className="mt-1.5 shrink-0 text-ember" />
            <span className="text-sm font-black leading-7 text-deepBlue">{certificate}</span>
          </li>
        )}
      </ul>
    </section>
  )
}
