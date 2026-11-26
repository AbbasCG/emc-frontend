import apiClient from './axios'
import { unwrapData } from './unwrap'
import type { DepartmentMember } from './operationsReportsApi'

/**
 * What the task-writing UI of the operations board (create / assign / edit a task) reads from the server. Every call is open to
 * anyone who holds ANY of tasks.create / tasks.assign / tasks.update and is scoped exactly like the writes themselves: a global
 * actor gets every active department, anybody else only the departments they lead and the members of those departments. The
 * role-gated readers (`operations/departments`, `operations/departments/{id}/members`) are NOT used for this: they are closed to
 * some of the people who may now write tasks, and they are not a write scope.
 *
 * Failures are not toasted here: the form that asked says the reason (the server's Arabic message) where the user is looking.
 */

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const num = (v: unknown): number | null => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)

export interface TaskScopeDepartment {
  id: number
  name: string
  name_ar: string | null
}

export interface TaskScopeDepartments {
  items: TaskScopeDepartment[]
  /** null = every department (a global actor); a list = only those; [] = nowhere. */
  manageableDepartmentIds: number[] | null
}

/** GET operations/board/task-scope/departments */
export async function fetchTaskScopeDepartments(): Promise<TaskScopeDepartments> {
  const res = await apiClient.get<unknown>('/operations/board/task-scope/departments', { skipErrorToast: true })
  const body = rec(res.data)
  const ids = rec(body.meta).manageable_department_ids

  return {
    items: (Array.isArray(body.data) ? body.data : []).flatMap((x): TaskScopeDepartment[] => {
      const d = rec(x)
      const id = num(d.id)

      return id === null || id <= 0 ? [] : [{ id, name: str(d.name) ?? String(id), name_ar: str(d.name_ar) }]
    }),
    manageableDepartmentIds: ids === null ? null : Array.isArray(ids) ? ids.map(Number).filter((n) => Number.isFinite(n)) : [],
  }
}

/** GET operations/board/task-scope/departments/{id}/members: the people a task of that department may be put on. 403 outside the scope. */
export async function fetchTaskScopeMembers(departmentId: number): Promise<DepartmentMember[]> {
  const res = await apiClient.get<unknown>(`/operations/board/task-scope/departments/${departmentId}/members`, { skipErrorToast: true })

  return unwrapData<DepartmentMember[]>(res.data) ?? []
}

/** The editable values of one task (to pre-fill the edit form) and what the viewer may do with it. */
export interface EditableTask {
  id: number
  title: string
  description: string | null
  notes: string | null
  department_id: number | null
  section_id: number | null
  assigned_to: { id: number; name: string } | null
  /** The SERVER's vocabulary (`urgent`, not `critical`). */
  priority: string
  task_scope: string | null
  points: number | null
  estimated_hours: number | null
  status: string
  start_date: string | null
  due_date: string | null
  due_datetime: string | null
  is_locked: boolean
  capabilities: { can_edit: boolean; can_reassign: boolean }
}

/** GET operations/board/tasks/{id}/editable: 403 when the viewer can neither edit nor reassign that task. */
export async function fetchEditableTask(id: number): Promise<EditableTask> {
  const res = await apiClient.get<unknown>(`/operations/board/tasks/${id}/editable`, { skipErrorToast: true })
  const t = rec(unwrapData<unknown>(res.data))
  const who = rec(t.assigned_to)
  const caps = rec(t.capabilities)
  const assigneeId = num(who.id)

  return {
    id: num(t.id) ?? id,
    title: typeof t.title === 'string' ? t.title : '',
    description: str(t.description),
    notes: str(t.notes),
    department_id: num(t.department_id),
    section_id: num(t.section_id),
    assigned_to: assigneeId === null ? null : { id: assigneeId, name: typeof who.name === 'string' ? who.name : '' },
    priority: typeof t.priority === 'string' ? t.priority : 'medium',
    task_scope: str(t.task_scope),
    points: num(t.points),
    estimated_hours: num(t.estimated_hours),
    status: typeof t.status === 'string' ? t.status : '',
    start_date: str(t.start_date),
    due_date: str(t.due_date),
    due_datetime: str(t.due_datetime),
    is_locked: t.is_locked === true,
    capabilities: { can_edit: caps.can_edit === true, can_reassign: caps.can_reassign === true },
  }
}

/** What the edit form saves. `assigned_to` is present ONLY when the assignee really changes (that needs tasks.assign too). */
export interface TaskEditPayload {
  title: string
  description: string | null
  notes: string | null
  department_id?: number
  /** Cleared when the department changes: a section of the old department would be refused. */
  section_id?: null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  task_scope?: string
  points?: number
  estimated_hours?: number | null
  due_date: string | null
  /** Left out unless the date/time was changed (or the task already had one): a time of day is never invented. */
  due_datetime?: string | null
  assigned_to?: number
}

/** PATCH operations/tasks/{id} (tasks.update; also tasks.assign when `assigned_to` changes). 423: locked. 403: outside the scope. */
export async function updateTaskFields(id: number, payload: TaskEditPayload): Promise<void> {
  await apiClient.patch(`/operations/tasks/${id}`, payload, { skipErrorToast: true })
}
