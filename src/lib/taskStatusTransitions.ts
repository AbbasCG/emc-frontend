import type { OpsTask, TaskStatus } from '@/types/operations'
import { TASK_STATUS_ORDER } from '@/data/operationsLabels'

/**
 * Which status a person may pick for a task by hand: the SAME rules the server enforces (backend App\Services\TaskTransitionRules),
 * so the UI offers only what will be accepted.
 *
 * The workflow is: needs_evaluation -> (the manager evaluates) -> simple size: completed | other sizes: waiting_approval ->
 * (HR approves) -> completed. `waiting_approval` and `completed` are the RESULTS of the evaluation and the HR approval, never
 * something a person sets; and a task that already carries one of them (or an evaluation / approval on record) is not moved
 * or re-opened by hand. The server refuses the rest with 422, whatever this file says; this only stops offering it.
 */
export const OUTCOME_STATUSES: readonly TaskStatus[] = ['waiting_approval', 'completed']

type StatusFacts = Pick<OpsTask, 'status' | 'manager_approved_at' | 'hr_approved_at'> & Partial<Pick<OpsTask, 'acceptance_status'>>

/** Awaiting approval, evaluated / approved by the manager or HR, or completed: the evaluation outcome is on record. */
export function isCreditBearing(task: StatusFacts): boolean {
  return OUTCOME_STATUSES.includes(task.status) || Boolean(task.manager_approved_at) || Boolean(task.hr_approved_at)
}

export type StatusControl =
  /** A status the person may choose by hand, the current one included (it is what the control shows). */
  | { mode: 'select'; options: TaskStatus[] }
  /** The status is shown, not offered as a choice, with the reason. */
  | { mode: 'locked'; reason: 'completed-member' | 'pending-acceptance' | 'outcome-recorded' }

export function statusControl(task: StatusFacts, memberView: boolean): StatusControl {
  if (memberView && task.status === 'completed') return { mode: 'locked', reason: 'completed-member' }
  if (memberView && task.acceptance_status === 'pending') return { mode: 'locked', reason: 'pending-acceptance' }
  if (isCreditBearing(task)) return { mode: 'locked', reason: 'outcome-recorded' }

  return { mode: 'select', options: TASK_STATUS_ORDER.filter((s) => !OUTCOME_STATUSES.includes(s)) }
}

export const STATUS_LOCK_HINT: Record<Extract<StatusControl, { mode: 'locked' }>['reason'], string> = {
  'completed-member': 'المهمة مكتملة، ولا يغيّر العضو حالتها بعد ذلك.',
  'pending-acceptance': 'اقبل المهمة أولًا لتتمكن من تحريك حالتها.',
  'outcome-recorded': 'المهمة مقيَّمة أو بانتظار الاعتماد أو مكتملة: تتغير حالتها بالتقييم واعتماد الموارد البشرية فقط، ولا تُعاد فتحها هنا.',
}
