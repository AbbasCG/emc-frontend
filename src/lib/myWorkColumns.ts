/**
 * «مهامي ومسؤولياتي»: the ONE place that decides which column a piece of work belongs to. Tasks and tickets are two
 * different systems with different states; this maps both onto the same few columns so the page never decides
 * anywhere else. (The ticket stays the single source of truth for its own status; this only presents it.)
 *
 * Task states (Task::status + acceptance_status), from the server:
 *   idea, under_review, planning, waiting_approval, in_progress, needs_evaluation, completed, postponed, cancelled
 *   acceptance: pending (assigned, not yet accepted) · accepted · rejected (the member declined)
 * Ticket states (Ticket::status):
 *   PENDING_APPROVAL, ASSIGNED (assigned, not yet accepted), IN_PROGRESS (accepted), PENDING_REVIEW (submitted, waiting
 *   for the final approval), RESOLVED, UNRESOLVED,
 *   REJECTED_BY_ADMIN, REJECTED_BY_ASSIGNEE (declined)
 */

export type MyWorkColumnKey = 'ideas' | 'pending' | 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold' | 'closed'

export interface MyWorkColumn {
  key: MyWorkColumnKey
  label: string
  /** One line saying what lands here (shown as the empty-state text). */
  empty: string
}

/** The columns, in the order they are shown. Every column is always rendered, even when empty. */
export const MY_WORK_COLUMNS: readonly MyWorkColumn[] = [
  { key: 'ideas', label: 'أفكار', empty: 'لا أفكار بعد' },
  { key: 'pending', label: 'بانتظار الاستلام', empty: 'لا شيء بانتظار قبولك' },
  { key: 'planning', label: 'قيد المراجعة والتخطيط', empty: 'لا مهام قيد التخطيط' },
  { key: 'in_progress', label: 'قيد التنفيذ', empty: 'لا شيء قيد التنفيذ' },
  { key: 'review', label: 'بانتظار الاعتماد والتقييم', empty: 'لا شيء بانتظار الاعتماد' },
  { key: 'completed', label: 'مكتملة', empty: 'لا مكتمل بعد' },
  { key: 'on_hold', label: 'مؤجلة / ملغاة', empty: 'لا مؤجل ولا ملغى' },
  { key: 'closed', label: 'متعذّر / معتذر عنه', empty: 'لا شيء معتذَر عنه أو متعذّر' },
] as const

export const MY_WORK_COLUMN_LABEL: Record<MyWorkColumnKey, string> = Object.fromEntries(MY_WORK_COLUMNS.map((c) => [c.key, c.label])) as Record<MyWorkColumnKey, string>

const TASK_STATUS_COLUMN: Record<string, MyWorkColumnKey> = {
  idea: 'ideas',
  under_review: 'planning',
  planning: 'planning',
  waiting_approval: 'review',
  in_progress: 'in_progress',
  needs_evaluation: 'review',
  completed: 'completed',
  postponed: 'on_hold',
  cancelled: 'on_hold',
  // Vocabulary of the previous management screens, kept so a stale payload still lands somewhere sensible.
  study: 'planning',
  pending_approval: 'review',
  needs_review: 'review',
  done: 'completed',
  deferred: 'on_hold',
}

/**
 * The column of a task. A task still waiting for the member's answer is «بانتظار الاستلام» whatever its stage
 * (unless it is already finished or cancelled); a declined task is «معتذر عنه»; otherwise the stage decides.
 * An unknown status never disappears: it is shown in «قيد المراجعة والتخطيط».
 */
export function columnForTask(status: string | null | undefined, acceptance?: string | null): MyWorkColumnKey {
  const byStatus = TASK_STATUS_COLUMN[status ?? ''] ?? 'planning'
  if (acceptance === 'rejected') return 'closed'
  if (acceptance === 'pending' && byStatus !== 'completed' && byStatus !== 'on_hold') return 'pending'

  return byStatus
}

const TICKET_STATUS_COLUMN: Record<string, MyWorkColumnKey> = {
  PENDING_APPROVAL: 'pending',
  ASSIGNED: 'pending',
  IN_PROGRESS: 'in_progress',
  // Submitted by the assignee, waiting for the final approval: the same column as a task waiting for approval.
  PENDING_REVIEW: 'review',
  RESOLVED: 'completed',
  UNRESOLVED: 'closed',
  REJECTED_BY_ASSIGNEE: 'closed',
  REJECTED_BY_ADMIN: 'closed',
}

/** The column of a ticket. An unknown status is treated as awaiting a response, so it is never hidden. */
export function columnForTicket(status: string | null | undefined): MyWorkColumnKey {
  return TICKET_STATUS_COLUMN[status ?? ''] ?? 'pending'
}
