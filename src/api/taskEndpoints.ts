import {
  addTaskComment,
  commentOnMyTask,
  fetchMyTask,
  fetchTask,
  setMyTaskStatus,
  toggleMyChecklist,
  updateTask,
} from './tasksApi'
import type { OpsTask } from '@/types/operations'

/**
 * What the task drawer calls. Two sets, because they have different callers and different authorization:
 *  - MANAGEMENT: the management endpoints (`/operations/tasks/...`), for the «إدارة المهام» pages;
 *  - MEMBER: the own-only endpoints (`/my-work/tasks/...`) and the shared board status call, for «مهامي»: a plain
 *    member may use these on their own task, and the management ones answer them 403.
 */
export interface TaskEndpoints {
  fetchOne: (id: number) => Promise<OpsTask>
  comment: (id: number, text: string) => Promise<void>
  /** Tick / untick one checklist item; `all` is the whole list after the change (the management update wants it). */
  setChecklistItem: (id: number, itemId: number, done: boolean, all: Array<{ id: number; done: boolean }>) => Promise<void>
  /** Save what the drawer changed. Resolves once the server has it. */
  patch: (id: number, patch: Partial<OpsTask>) => Promise<void>
  /** May the drawer's user edit priority / title / description? A member may only move their task between stages. */
  canEditDetails: boolean
}

export const MANAGEMENT_ENDPOINTS: TaskEndpoints = {
  fetchOne: (id) => fetchTask(id),
  comment: (id, text) => addTaskComment(id, text),
  setChecklistItem: async (id, _itemId, _done, all) => {
    await updateTask(id, { checklist: all })
  },
  patch: async (id, patch) => {
    await updateTask(id, {
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
    })
  },
  canEditDetails: true,
}

export const MEMBER_ENDPOINTS: TaskEndpoints = {
  fetchOne: (id) => fetchMyTask(id),
  comment: (id, text) => commentOnMyTask(id, text),
  setChecklistItem: (id, itemId, done) => toggleMyChecklist(id, itemId, done),
  patch: async (id, patch) => {
    // Only the stage is the member's to change; the other fields are not offered to them.
    if (patch.status !== undefined) await setMyTaskStatus(id, patch.status)
  },
  canEditDetails: false,
}
