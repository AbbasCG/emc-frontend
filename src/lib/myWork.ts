import type { MyWorkTicket, TicketPriority } from '@/types/ticket'
import type { OpsTask, TaskPriority, TaskScope } from '@/types/operations'
import { dueMs } from './dueDate'
import { isEstimateHidden } from './taskEstimate'
import { columnForTask, columnForTicket, MY_WORK_COLUMNS, type MyWorkColumnKey } from './myWorkColumns'

/**
 * One card on «مهامي ومسؤولياتي»: a task OR a ticket, in the same shape, so search, priority, due date and the
 * assignee are displayed and filtered the same way for both. Tickets are not copied into tasks: a ticket card is
 * derived from GET /v1/tickets/my-work on every load and the ticket stays the single source of truth.
 */

/** The page ticket cards open from (and the back link of the ticket page). */
export const MY_WORK_PATH = '/dashboard/admin/tasks/my'

export type WorkItemKind = 'task' | 'ticket'
export type WorkKindFilter = 'all' | 'tasks' | 'tickets'
export type WorkPriority = TaskPriority
export type DueFilter = 'all' | 'overdue' | 'week' | 'none'

export interface WorkItem {
  /** `task:12` / `ticket:5`: unique across both kinds. */
  key: string
  kind: WorkItemKind
  id: number
  title: string
  description: string | null
  /** The ticket number (`EMC-…`); null for tasks. */
  reference: string | null
  column: MyWorkColumnKey
  priority: WorkPriority
  /** ISO date/time the work is due, or null. */
  dueAt: string | null
  overdue: boolean
  assigneeName: string
  departmentName: string | null
  scope: TaskScope | null
  points: number | null
  hours: number | null
  /** The server left the estimate out for this viewer: «غير متاح لك», not «لم تُحدَّد». */
  estimateHidden: boolean
  /** Tickets: what the server says the viewer may do. Tasks: derived from the acceptance state. */
  canAccept: boolean
  canReject: boolean
  canComplete: boolean
  canOpen: boolean
  /** A ticket the assignee has submitted: it waits (for the review, the deployment or the live test) before it closes. */
  awaitingApproval: boolean
  /** The exact stage of such a ticket as a badge («بانتظار المراجعة» / «معتمدة للنشر» / «بانتظار اختبار المكلّف»), else null. */
  stageBadge: string | null
  /** Who moves next, in a short line («بانتظار مراجعة الإنجاز» / «بانتظار النشر» / «بانتظار اختبار المكلّف»), else null. */
  nextStep: string | null
  /** What a finished ticket credited to this member; null unless the server sent a `credited` credit block. */
  credited: { points: number; minutes: number | null; hours: number } | null
  /** Newest-first ordering key. */
  updatedAt: string | null
}

/** The stages that keep a ticket in «بانتظار الاعتماد والتقييم»: the badge naming the stage and the line saying who is next. */
export const TICKET_STAGE_CARD: Record<string, { badge: string; next: string }> = {
  PENDING_REVIEW: { badge: 'بانتظار المراجعة', next: 'بانتظار مراجعة الإنجاز' },
  APPROVED_FOR_DEPLOY: { badge: 'معتمدة للنشر', next: 'بانتظار النشر' },
  PENDING_VERIFICATION: { badge: 'بانتظار اختبار المكلّف', next: 'بانتظار اختبار المكلّف' },
}

const TICKET_PRIORITY: Record<TicketPriority, WorkPriority> = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' }
const PRIORITY_RANK: Record<WorkPriority, number> = { critical: 3, high: 2, medium: 1, low: 0 }

/** Columns whose work is finished or put aside: never "overdue". */
const NOT_OVERDUE: MyWorkColumnKey[] = ['completed', 'on_hold', 'closed']

const toMs = (iso: string | null): number | null => {
  if (!iso) return null
  const ms = Date.parse(iso)

  return Number.isFinite(ms) ? ms : null
}

export function ticketToWorkItem(t: MyWorkTicket, me: { name: string }, now: number = Date.now()): WorkItem {
  const column = columnForTicket(t.status)
  const due = t.expected_resolution_time ?? null
  const dueTime = dueMs(due)
  const caps = t.capabilities ?? {}

  return {
    key: `ticket:${t.id}`,
    kind: 'ticket',
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    reference: t.ticket_number,
    column,
    priority: TICKET_PRIORITY[t.priority] ?? 'medium',
    dueAt: due,
    overdue: !NOT_OVERDUE.includes(column) && (t.is_delayed === true || (dueTime !== null && dueTime < now)),
    assigneeName: me.name,
    departmentName: t.department?.name ?? null,
    scope: t.task_scope ?? null,
    points: t.task_points ?? null,
    hours: t.estimated_hours ?? null,
    estimateHidden: isEstimateHidden(t),
    canAccept: caps.can_accept === true,
    canReject: caps.can_reject === true,
    canComplete: caps.can_complete === true,
    canOpen: caps.can_open !== false,
    awaitingApproval: t.status in TICKET_STAGE_CARD,
    stageBadge: TICKET_STAGE_CARD[t.status]?.badge ?? null,
    nextStep: TICKET_STAGE_CARD[t.status]?.next ?? null,
    credited: t.credit?.status === 'credited' ? { points: Number(t.credit.points ?? 0), minutes: t.credit.minutes ?? null, hours: Number(t.credit.hours ?? 0) } : null,
    updatedAt: t.updated_at ?? t.created_at ?? null,
  }
}

export function taskToWorkItem(t: OpsTask, me: { name: string }, now: number = Date.now()): WorkItem {
  const column = columnForTask(t.status, t.acceptance_status)
  const due = t.due_datetime ?? t.due_at ?? null
  const dueTime = dueMs(due)

  return {
    key: `task:${t.id}`,
    kind: 'task',
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    reference: null,
    column,
    priority: t.priority,
    dueAt: due,
    overdue: !NOT_OVERDUE.includes(column) && dueTime !== null && dueTime < now,
    assigneeName: t.assignee_name ?? me.name,
    departmentName: t.department_name ?? null,
    scope: t.task_scope ?? null,
    points: t.points ?? null,
    hours: t.estimated_hours ?? null,
    estimateHidden: false,
    canAccept: column === 'pending' && t.acceptance_status === 'pending',
    canReject: column === 'pending' && t.acceptance_status === 'pending',
    canComplete: false,
    canOpen: true,
    awaitingApproval: false,
    stageBadge: null,
    nextStep: null,
    credited: null,
    updatedAt: null,
  }
}

/**
 * A collective task is stored as a parent (given to the first member) PLUS one copy per member. The member who owns
 * both would see the same work twice, so a task is hidden when the same person also owns one of its copies: the
 * copy is what they work on. Recognized from the flat list (a copy names its parent) and from loaded `subtasks`.
 */
export function hideOwnedParents(tasks: OpsTask[]): OpsTask[] {
  const owned = new Set<string>()
  for (const t of tasks) if (t.parent_task_id != null && t.assignee_id != null) owned.add(`${t.parent_task_id}:${t.assignee_id}`)

  return tasks.filter((t) => {
    if (t.assignee_id == null) return true
    if (owned.has(`${t.id}:${t.assignee_id}`)) return false

    return !(t.subtasks ?? []).some((c) => c.assignee_id === t.assignee_id)
  })
}

/** Each work item exactly once: the first occurrence of a key wins. */
export function dedupeWorkItems(items: WorkItem[]): WorkItem[] {
  const seen = new Set<string>()

  return items.filter((i) => (seen.has(i.key) ? false : (seen.add(i.key), true)))
}

export interface WorkFilters {
  kind: WorkKindFilter
  search: string
  priority: WorkPriority | 'all'
  due: DueFilter
}

export const DEFAULT_WORK_FILTERS: WorkFilters = { kind: 'all', search: '', priority: 'all', due: 'all' }

const normalizeSearch = (s: string): string => s.normalize('NFKC').toLowerCase().trim()

export function filterWorkItems(items: WorkItem[], f: WorkFilters, now: number = Date.now()): WorkItem[] {
  const q = normalizeSearch(f.search)
  const weekEnd = now + 7 * 24 * 3600 * 1000

  return items.filter((i) => {
    if (f.kind === 'tasks' && i.kind !== 'task') return false
    if (f.kind === 'tickets' && i.kind !== 'ticket') return false
    if (f.priority !== 'all' && i.priority !== f.priority) return false
    if (f.due !== 'all') {
      const due = dueMs(i.dueAt)
      if (f.due === 'none' && due !== null) return false
      if (f.due === 'overdue' && !i.overdue) return false
      // «خلال 7 أيام»: still ahead of us and inside the week (the late ones have their own filter).
      if (f.due === 'week' && (due === null || due < now || due > weekEnd || NOT_OVERDUE.includes(i.column))) return false
    }
    if (q) {
      const hay = normalizeSearch([i.title, i.description ?? '', i.reference ?? '', i.departmentName ?? '', i.assigneeName].join(' '))
      if (!hay.includes(q)) return false
    }

    return true
  })
}

/** Overdue first, then the more urgent, then the sooner due, then the most recently changed. */
export function sortWorkItems(items: WorkItem[]): WorkItem[] {
  return [...items].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    if (a.priority !== b.priority) return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
    const da = dueMs(a.dueAt) ?? Number.POSITIVE_INFINITY
    const db = dueMs(b.dueAt) ?? Number.POSITIVE_INFINITY
    if (da !== db) return da - db

    return (toMs(b.updatedAt) ?? 0) - (toMs(a.updatedAt) ?? 0)
  })
}

/** Items per column, every column present (empty ones too), each sorted. */
export function groupByColumn(items: WorkItem[]): Record<MyWorkColumnKey, WorkItem[]> {
  const out = Object.fromEntries(MY_WORK_COLUMNS.map((c) => [c.key, [] as WorkItem[]])) as Record<MyWorkColumnKey, WorkItem[]>
  for (const i of sortWorkItems(items)) out[i.column].push(i)

  return out
}
