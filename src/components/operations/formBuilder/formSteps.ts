import type { FormQuestion } from '@/types/operations'
import { isMultiChoice } from './questionTypes'
import type { AnswerValue } from './formValidation'
import { isEmptyAnswer } from './formValidation'

/**
 * Steps: how a form is cut into the stages a respondent moves through.
 *
 * A step is what sits between two step breaks (`page_break` blocks). The break at the top of a step carries its title (the block's
 * label) and its description; whatever comes before the first break is the first step and has no title. A break may carry a
 * visibility rule like any block, which hides the whole step. A step with nothing to show (empty, or every block hidden) is skipped,
 * so a respondent never meets an empty page. Nothing here sends anything: a response is only ever submitted once, at the end.
 */

export type Step = {
  /** Stable while the form is: the id of the break that opens it, or `first` for the stage before any break. */
  key: string
  /** The step break that opens it (null for the first stage when the form does not open with one). */
  breakId: number | null
  title: string
  description: string
  /** Everything after the break up to the next one, in order, hidden or not. */
  blocks: FormQuestion[]
}

export function splitSteps(questions: FormQuestion[]): Step[] {
  const steps: Step[] = [{ key: 'first', breakId: null, title: '', description: '', blocks: [] }]
  for (const q of questions) {
    if (q.type === 'page_break') {
      steps.push({ key: `step-${q.id}`, breakId: q.id, title: (q.label ?? '').trim(), description: (q.description ?? '').trim(), blocks: [] })
    } else {
      steps[steps.length - 1].blocks.push(q)
    }
  }
  // A form that opens with a break has no "first" stage; an empty stage is never shown.
  return steps.filter((s) => s.blocks.length > 0)
}

/** The blocks of a step a respondent can see. */
export const visibleBlocks = (step: Step, visible: Record<number, boolean>): FormQuestion[] => step.blocks.filter((b) => visible[b.id] !== false)

/** The steps a respondent goes through: the break is shown (or there is none) and at least one block is. */
export function shownSteps(steps: Step[], visible: Record<number, boolean>): Step[] {
  return steps.filter((s) => (s.breakId === null || visible[s.breakId] !== false) && visibleBlocks(s, visible).length > 0)
}

/** True when the form is more than one stage: several steps, or titled ones. */
export const isMultiStep = (steps: Step[]): boolean => steps.length > 1

/** One answer as a person reads it on the review page; null when there is nothing to show. */
export function answerSummary(q: FormQuestion, value: AnswerValue): string | null {
  if (value === undefined || isEmptyAnswer(value)) return null
  if (value instanceof File) return value.name
  if (Array.isArray(value)) return value.join('، ')
  if (q.type === 'yes_no') return value === 'yes' ? 'نعم' : value === 'no' ? 'لا' : value
  if (q.type === 'consent') return value === 'yes' ? 'موافق' : value
  if (q.type === 'star_rating') return `${value} / ${q.config?.scale?.max ?? 5}`
  if (q.type === 'linear_scale') return `${value} (من ${q.config?.scale?.min ?? 1} إلى ${q.config?.scale?.max ?? 5})`
  if (isMultiChoice(q.type)) return String(value)

  return String(value)
}
