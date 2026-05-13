import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { OpsTask, TaskPriority, TaskStatus } from '@/types/operations'

export async function fetchTasks(params?: {
  scope?: 'all' | 'mine' | 'overdue'
  department_id?: string
}): Promise<OpsTask[]> {
  const res = await apiClient.get<unknown>('/operations/tasks', { params })
  return asList<OpsTask>(res.data)
}

export async function fetchTask(id: number): Promise<OpsTask> {
  const res = await apiClient.get<unknown>(`/operations/tasks/${id}`)
  return unwrapLms<OpsTask>(res.data)
}

export async function updateTask(
  id: number,
  body: Partial<Pick<OpsTask, 'status' | 'priority' | 'title' | 'description'>> & {
    checklist?: { id: number; done: boolean }[]
  },
): Promise<OpsTask> {
  const res = await apiClient.patch<unknown>(`/operations/tasks/${id}`, body)
  return unwrapLms<OpsTask>(res.data)
}

export async function addTaskComment(id: number, body: string): Promise<void> {
  await apiClient.post(`/operations/tasks/${id}/comments`, { body })
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
