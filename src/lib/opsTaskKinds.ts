import type { OpsTask } from '@/types/operations'

/** How many member copies a task has: the server's `subtasks_count` when it sends one, else the loaded copies. */
export const subtaskCount = (t: OpsTask): number => t.subtasks_count ?? t.subtasks?.length ?? 0

/** A task is a group task when it is a copy made for one member of a collective assignment, or has such copies. */
export const isGroupTask = (t: OpsTask): boolean => t.parent_task_id != null || subtaskCount(t) > 0

/** Nobody has been given the task yet (it waits in the department's unassigned list). */
export const isUnassignedTask = (t: OpsTask): boolean => t.assignee_id == null

/**
 * The server may not say how many copies a parent task has (the board rows carry neither `subtasks` nor
 * `subtasks_count`). Then only the COPIES (tasks with a parent) can be recognized as group tasks, and the parent
 * is not: the filter says so instead of silently leaving it out.
 */
export const groupParentsUnknown = (tasks: OpsTask[]): boolean => tasks.length > 0 && tasks.every((t) => t.subtasks_count == null && t.subtasks == null)
