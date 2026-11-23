import axios from 'axios'
import { TaskApiError, taskApiMessage } from './taskErrors'
import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import { unwrapData } from './unwrap'
import { normalizeOpsTask, serverTaskPriority } from './normalizers/opsTask'
import type { OpsTask, TaskPriority, TaskStatus } from '@/types/operations'

/** Plain list or Laravel paginator (`data.data`) to the rows. */
function rowsOf(payload: unknown): unknown[] {
  const inner = unwrapData<unknown>(payload)
  if (Array.isArray(inner)) return inner
  const nested = (inner as { data?: unknown } | null)?.data

  return Array.isArray(nested) ? nested : []
}

/** `{ idea: [...], planning: [...] }` (the board payload) to one flat list. */
function flattenColumns(payload: unknown): unknown[] {
  const cols = unwrapData<unknown>(payload)
  if (!cols || typeof cols !== 'object' || Array.isArray(cols)) return []

  return Object.values(cols as Record<string, unknown>).flatMap((v) => (Array.isArray(v) ? v : []))
}

/**
 * The tasks the signed-in user is responsible for, in EVERY acceptance state and status, from the own-only
 * GET /my-work/tasks (any authenticated user; newest first, capped). `truncated`: more exist than were sent.
 * A failure (403 included) is thrown, never shown as "no tasks".
 */
export async function fetchMyTasks(signal?: AbortSignal): Promise<{ tasks: OpsTask[]; total: number; truncated: boolean }> {
  const res = await apiClient.get<unknown>('/my-work/tasks', { signal, skipErrorToast: true })
  const body = (res.data ?? {}) as { meta?: { total?: number; truncated?: boolean } }
  const tasks = rowsOf(res.data).map(normalizeOpsTask)

  return { tasks, total: Number(body.meta?.total ?? tasks.length), truncated: body.meta?.truncated === true }
}

async function guarded<T>(call: () => Promise<T>, fallback: string, on409?: string): Promise<T> {
  try {
    return await call()
  } catch (e) {
    const status = axios.isAxiosError(e) ? (e.response?.status ?? null) : null
    throw new TaskApiError(taskApiMessage(e, fallback, on409), status)
  }
}

/** The member accepts one of THEIR tasks (409 when it is no longer pending). */
export function acceptMyTask(id: number): Promise<void> {
  return guarded(async () => {
    await apiClient.post(`/my-work/tasks/${id}/accept`)
  }, 'تعذّر قبول المهمة.', 'لم تعد هذه المهمة بانتظار ردّك (ربما أُعيد إسنادها).')
}

/** The member declines one of THEIR tasks; the reason is required (3 to 1000 characters). */
export function rejectMyTask(id: number, reason: string): Promise<void> {
  return guarded(async () => {
    await apiClient.post(`/my-work/tasks/${id}/reject`, { reason })
  }, 'تعذّر تسجيل الاعتذار.', 'لم تعد هذه المهمة بانتظار ردّك (ربما أُعيد إسنادها).')
}

/** One of THEIR tasks in full (comments, checklist, attachments, evaluation, subtasks): 404 when it is not assigned to them. */
export function fetchMyTask(id: number): Promise<OpsTask> {
  return guarded(async () => {
    const res = await apiClient.get<unknown>(`/my-work/tasks/${id}`, { skipErrorToast: true })

    return normalizeOpsTask(unwrapData<unknown>(res.data))
  }, 'تعذّر تحميل تفاصيل المهمة.')
}

/** A comment on one of THEIR tasks (same body as the management comment: `{ comment }`). */
export function commentOnMyTask(id: number, text: string): Promise<void> {
  return guarded(async () => {
    await apiClient.post(`/my-work/tasks/${id}/comments`, { comment: text }, { skipErrorToast: true })
  }, 'تعذّر إضافة التعليق.')
}

/** Tick or untick one checklist item of THEIR task (same body as the management update: `{ is_completed }`). */
export function toggleMyChecklist(id: number, itemId: number, done: boolean): Promise<void> {
  return guarded(async () => {
    await apiClient.put(`/my-work/tasks/${id}/checklist/${itemId}`, { is_completed: done }, { skipErrorToast: true })
  }, 'تعذّر تحديث بند القائمة.')
}

/** Move one of THEIR tasks between stages (own-only endpoint; a task still waiting for their answer is refused). */
export function setMyTaskStatus(id: number, status: TaskStatus): Promise<void> {
  return guarded(async () => {
    await apiClient.patch(`/my-work/tasks/${id}/status`, { status }, { skipErrorToast: true })
  }, 'تعذّر تغيير مرحلة المهمة.', 'اقبل المهمة أولًا قبل تحريك حالتها.')
}

/**
 * Management lists. `all`: every task of the agile board (no pagination, any status); `overdue`: the server's own
 * overdue rule. `mine` is {@link fetchMyTasks} (kept here so the workspace hook has one entry point). Errors are
 * thrown so the page can show them with a retry.
 */
export async function fetchTasks(params?: {
  scope?: 'all' | 'mine' | 'overdue'
  department_id?: string
}): Promise<OpsTask[]> {
  if (params?.scope === 'mine') return (await fetchMyTasks()).tasks
  if (params?.scope === 'overdue') {
    const res = await apiClient.get<unknown>('/admin/tasks/overdue', { params: { department_id: params.department_id }, skipErrorToast: true })

    return rowsOf(res.data).map(normalizeOpsTask)
  }
  const res = await apiClient.get<unknown>('/operations/board', { params: { department_id: params?.department_id }, skipErrorToast: true })

  return flattenColumns(res.data).map(normalizeOpsTask)
}

export async function fetchTask(id: number): Promise<OpsTask> {
  const res = await apiClient.get<unknown>(`/operations/tasks/${id}`)
  return normalizeOpsTask(unwrapLms<unknown>(res.data))
}

export async function updateTask(
  id: number,
  body: Partial<Pick<OpsTask, 'status' | 'priority' | 'title' | 'description'>> & {
    checklist?: { id: number; done: boolean }[]
  },
): Promise<OpsTask> {
  const payload = { ...body, ...(body.priority !== undefined ? { priority: serverTaskPriority(body.priority) } : {}) }
  const res = await apiClient.patch<unknown>(`/operations/tasks/${id}`, payload)
  return normalizeOpsTask(unwrapLms<unknown>(res.data))
}

export async function addTaskComment(id: number, body: string): Promise<void> {
  // the server validates `comment` (not `body`)
  await apiClient.post(`/operations/tasks/${id}/comments`, { comment: body })
}

export async function createTaskFromActionItem(
  meetingId: number,
  actionItemId: number,
): Promise<OpsTask> {
  const res = await apiClient.post<unknown>(
    `/operations/meetings/${meetingId}/action-items/${actionItemId}/convert-task`,
  )
  return unwrapLms<OpsTask>(res.data)
}

export type CreateTaskPayload = {
  title: string
  department_id: string
  priority?: TaskPriority
  status?: TaskStatus
  due_at?: string | null
}

export async function createTask(payload: CreateTaskPayload): Promise<OpsTask> {
  const res = await apiClient.post<unknown>('/operations/tasks', payload)
  return unwrapLms<OpsTask>(res.data)
}
