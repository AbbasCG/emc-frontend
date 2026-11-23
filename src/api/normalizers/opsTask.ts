import type { OpsChecklistItem, OpsComment, OpsTask, TaskAcceptanceStatus, TaskPriority, TaskScope, TaskStatus } from '@/types/operations'
import { normalizeDateOnly } from '@/lib/dueDate'
import { TASK_STATUS_ORDER } from '@/data/operationsLabels'

/**
 * The task rows the server sends (TaskResource: `assigned_to {id,name}`, `department {id,name}`, `due_date`,
 * `checklist_items`, priority `urgent`) → the {@link OpsTask} the management screens render. One adapter, so a
 * page never reads a field the server does not send (the old screens read `assignee_name` / `department_name` /
 * `due_at`, which do not exist, and a status vocabulary that did not match the server's).
 */

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

const SCOPES: TaskScope[] = ['simple', 'medium', 'large', 'strategic']
const ACCEPTANCE: TaskAcceptanceStatus[] = ['pending', 'accepted', 'rejected']

export function normalizeTaskPriority(v: unknown): TaskPriority {
  if (v === 'urgent' || v === 'critical') return 'critical'
  if (v === 'high' || v === 'medium' || v === 'low') return v

  return 'medium'
}

/** The priority the server accepts for a task (`urgent`, not `critical`). */
export const serverTaskPriority = (p: TaskPriority): 'low' | 'medium' | 'high' | 'urgent' => (p === 'critical' ? 'urgent' : p)

export function normalizeTaskStatus(v: unknown): TaskStatus {
  return typeof v === 'string' && (TASK_STATUS_ORDER as string[]).includes(v) ? (v as TaskStatus) : 'planning'
}

export function normalizeOpsTask(raw: unknown): OpsTask {
  const r = rec(raw)
  const assignee = rec(r.assigned_to)
  const department = rec(r.department)
  const checklistSrc = Array.isArray(r.checklist_items) ? r.checklist_items : Array.isArray(r.checklist) ? r.checklist : []
  const checklist: OpsChecklistItem[] = checklistSrc.map((c) => {
    const x = rec(c)

    return { id: Number(x.id), label: String(x.label ?? x.title ?? ''), done: Boolean(x.done ?? x.is_completed ?? x.is_done ?? x.completed) }
  })
  const commentsSrc = Array.isArray(r.comments) ? r.comments : []
  const comments: OpsComment[] = commentsSrc.map((c) => {
    const x = rec(c)
    const author = rec(x.author ?? x.user)

    return {
      id: Number(x.id),
      author_name: String(x.author_name ?? author.name ?? ''),
      body: String(x.body ?? x.comment ?? ''),
      created_at: String(x.created_at ?? ''),
    }
  })
  const scope = SCOPES.includes(r.task_scope as TaskScope) ? (r.task_scope as TaskScope) : null
  const acceptance = ACCEPTANCE.includes(r.acceptance_status as TaskAcceptanceStatus) ? (r.acceptance_status as TaskAcceptanceStatus) : undefined
  const assigneeId = numOrNull(assignee.id ?? r.assigned_to_id ?? (typeof r.assigned_to === 'number' ? r.assigned_to : null))
  const subtasks = Array.isArray(r.subtasks) ? r.subtasks.map(normalizeOpsTask) : undefined

  return {
    id: Number(r.id),
    parent_task_id: numOrNull(r.parent_task_id),
    title: String(r.title ?? ''),
    description: str(r.description),
    department_id: String(department.id ?? r.department_id ?? ''),
    department_name: str(department.name) ?? str(r.department_name),
    assignee_id: assigneeId,
    assignee_name: str(assignee.name) ?? str(r.assignee_name),
    status: normalizeTaskStatus(r.status),
    priority: normalizeTaskPriority(r.priority),
    task_scope: scope,
    points: numOrNull(r.points),
    estimated_hours: numOrNull(r.estimated_hours),
    // `due_date` is a date (serialized as midnight UTC): keep it as a plain day so it is read in the viewer's calendar.
    due_at: normalizeDateOnly(str(r.due_date)) ?? str(r.due_at),
    due_datetime: str(r.due_datetime),
    notes: str(r.notes),
    acceptance_status: acceptance,
    rejection_reason: str(r.rejection_reason),
    accepted_at: str(r.accepted_at),
    rejected_at: str(r.rejected_at),
    manager_approved_at: str(r.manager_approved_at),
    manager_approved_by: numOrNull(r.manager_approved_by),
    hr_approved_at: str(r.hr_approved_at),
    hr_approved_by: numOrNull(r.hr_approved_by),
    tags: Array.isArray(r.tags) ? r.tags.map(String) : undefined,
    checklist,
    checklist_total: checklist.length,
    checklist_done: checklist.filter((c) => c.done).length,
    comments,
    related_type: str(r.related_type),
    related_label: str(r.related_label),
    evaluation: (r.evaluation as OpsTask['evaluation']) ?? null,
    attachments: (r.attachments as OpsTask['attachments']) ?? null,
    subtasks,
    ...(r.subtasks_count != null && Number.isFinite(Number(r.subtasks_count)) ? { subtasks_count: Number(r.subtasks_count) } : {}),
  }
}
