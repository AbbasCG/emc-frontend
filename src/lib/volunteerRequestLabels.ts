import {
  COMMITMENT_STATEMENTS,
  LIKERT_SCALE,
  MOTIVATION_STATEMENTS,
  SITUATIONAL_QUESTIONS,
  SKILL_RATINGS,
} from '@/components/volunteerOpportunities/volunteerFormSpec'
import { getEducationLabel } from '@/data/educationLevels'
import { getNationalityLabel, resolveNationalityCode } from '@/data/nationalities'

/**
 * Human-readable values for a volunteer request. The apply form stores its answers as the Arabic text the person
 * picked, but older rows and other sources hold codes (`full_time`, `yes`, `male`…): both are shown in Arabic, and a
 * value nobody mapped is shown as it is rather than dropped.
 */

/** A trimmed string, or null when there is nothing to show. */
export function textOrNull(value: string | number | null | undefined): string | null {
  if (value == null) return null
  const s = String(value).trim()

  return s || null
}

const CODE_LABELS: Record<string, string> = {
  // availability (legacy codes)
  full_time: 'دوام كامل',
  part_time: 'دوام جزئي',
  weekends: 'عطلة نهاية الأسبوع',
  flexible: 'مرن',
  // yes / no style answers
  yes: 'نعم',
  no: 'لا',
  true: 'نعم',
  false: 'لا',
  sometimes: 'أحيانًا',
  depends: 'حسب الظروف',
  // gender
  male: 'ذكر',
  female: 'أنثى',
  unspecified: 'غير محدد',
  // time of day
  morning: 'صباحًا',
  evening: 'مساءً',
  anytime: 'أي وقت',
}

/** Arabic label for a stored code; free text (already Arabic) passes through unchanged. */
export function codeLabel(value: string | null | undefined): string | null {
  const text = textOrNull(value)
  if (!text) return null

  return CODE_LABELS[text.toLowerCase()] ?? text
}

export function genderLabel(value: string | null | undefined): string | null {
  return codeLabel(value)
}

export function educationLabel(value: string | null | undefined): string | null {
  return getEducationLabel(value)
}

/** The country name for an ISO code or a demonym («يمني» → اليمن); free text is kept. */
export function nationalityLabel(value: string | null | undefined): string | null {
  const text = textOrNull(value)
  if (!text) return null
  const code = resolveNationalityCode(text)

  return (code ? getNationalityLabel(code) : null) ?? text
}

export function yesNoLabel(value: boolean | null | undefined, unanswered = '—'): string {
  if (value === true) return 'نعم'
  if (value === false) return 'لا'

  return unanswered
}

/** The professional-profile consent: three states, never a guessed «no». */
export function consentLabel(value: boolean | null | undefined): string {
  return yesNoLabel(value, 'لم يُجب')
}

/** Whole years since the birth date, or null when it is missing, invalid or not plausible. */
export function ageFromBirthDate(value: string | null | undefined, now: Date = new Date()): number | null {
  const text = textOrNull(value)
  if (!text) return null
  const birth = new Date(text)
  if (Number.isNaN(birth.getTime())) return null

  let age = now.getFullYear() - birth.getFullYear()
  const monthGap = now.getMonth() - birth.getMonth()
  if (monthGap < 0 || (monthGap === 0 && now.getDate() < birth.getDate())) age -= 1

  return age >= 0 && age <= 120 ? age : null
}

/** «4 / 5 · متقدم» for the self-assessed skill level. */
export function skillRatingLabel(value: number | null | undefined): string | null {
  if (value == null) return null
  const found = SKILL_RATINGS.find((r) => r.value === value)

  return found ? `${value} / 5 · ${found.label}` : `${value} / 5`
}

/** A request has a handful of answers; more than this is garbage and is not rendered. */
const MAX_ANSWERS = 100

export interface QuestionAnswer {
  key: string
  question: string
  answer: string
}

function ratingAnswers(
  ratings: Record<string, unknown> | null | undefined,
  statements: ReadonlyArray<{ id: string; text: string }>,
): QuestionAnswer[] {
  if (!ratings || typeof ratings !== 'object') return []
  const textById = new Map(statements.map((s) => [s.id, s.text]))

  return Object.entries(ratings).slice(0, MAX_ANSWERS).map(([key, raw]) => {
    const n = Number(raw)
    const scale = LIKERT_SCALE.find((l) => l.value === n)
    const answer = Number.isFinite(n) ? `${n} / 5${scale ? ` · ${scale.label}` : ''}` : String(raw)

    return { key, question: textById.get(key) ?? key, answer }
  })
}

/** The motivation scale, one line per statement the apply form asked, in the form's own wording. */
export function motivationAnswers(ratings: Record<string, unknown> | null | undefined): QuestionAnswer[] {
  return ratingAnswers(ratings, MOTIVATION_STATEMENTS)
}

export function commitmentAnswers(ratings: Record<string, unknown> | null | undefined): QuestionAnswer[] {
  return ratingAnswers(ratings, COMMITMENT_STATEMENTS)
}

export function situationalAnswers(responses: Record<string, unknown> | null | undefined): QuestionAnswer[] {
  if (!responses || typeof responses !== 'object') return []
  const textById = new Map<string, string>(SITUATIONAL_QUESTIONS.map((q) => [q.id, q.question]))

  return Object.entries(responses).slice(0, MAX_ANSWERS).map(([key, answer]) => ({
    key,
    question: textById.get(key) ?? key,
    answer: String(answer ?? ''),
  }))
}
