import { describe, it, expect } from 'vitest'
import { MY_WORK_COLUMNS, columnForTask, columnForTicket, type MyWorkColumnKey } from '@/lib/myWorkColumns'

describe('columnForTicket: every ticket status has a column', () => {
  const table: Array<[string, MyWorkColumnKey]> = [
    ['ASSIGNED', 'pending'],
    ['IN_PROGRESS', 'in_progress'],
    ['PENDING_REVIEW', 'review'],
    ['RESOLVED', 'completed'],
    ['UNRESOLVED', 'closed'],
    ['REJECTED_BY_ASSIGNEE', 'closed'],
    ['REJECTED_BY_ADMIN', 'closed'],
    ['PENDING_APPROVAL', 'pending'],
  ]
  it.each(table)('%s -> %s', (status, col) => {
    expect(columnForTicket(status)).toBe(col)
  })

  it('an unknown status is never dropped: it waits for a response', () => {
    expect(columnForTicket('SOMETHING_NEW')).toBe('pending')
    expect(columnForTicket(null)).toBe('pending')
  })

  it('a ticket is never in the ideas column', () => {
    for (const [s] of table) expect(columnForTicket(s)).not.toBe('ideas')
  })
})

describe('columnForTask: every task status and acceptance state has a column', () => {
  const accepted: Array<[string, MyWorkColumnKey]> = [
    ['idea', 'ideas'],
    ['under_review', 'planning'],
    ['planning', 'planning'],
    ['waiting_approval', 'review'],
    ['in_progress', 'in_progress'],
    ['needs_evaluation', 'review'],
    ['completed', 'completed'],
    ['postponed', 'on_hold'],
    ['cancelled', 'on_hold'],
  ]
  it.each(accepted)('accepted %s -> %s', (status, col) => {
    expect(columnForTask(status, 'accepted')).toBe(col)
    // A task without an acceptance state yet (older rows) is treated as accepted.
    expect(columnForTask(status, undefined)).toBe(col)
    expect(columnForTask(status, null)).toBe(col)
  })

  it('a task waiting for the member shares the ticket column «بانتظار الاستلام», whatever its stage', () => {
    for (const s of ['idea', 'under_review', 'planning', 'waiting_approval', 'in_progress', 'needs_evaluation']) {
      expect(columnForTask(s, 'pending')).toBe('pending')
      expect(columnForTask(s, 'pending')).toBe(columnForTicket('ASSIGNED'))
    }
  })

  it('a finished or cancelled task is not pulled back to pending', () => {
    expect(columnForTask('completed', 'pending')).toBe('completed')
    expect(columnForTask('cancelled', 'pending')).toBe('on_hold')
  })

  it('a declined task lands in the declined column, with declined tickets', () => {
    for (const s of ['idea', 'planning', 'in_progress', 'completed']) expect(columnForTask(s, 'rejected')).toBe('closed')
    expect(columnForTask('planning', 'rejected')).toBe(columnForTicket('REJECTED_BY_ASSIGNEE'))
  })

  it('the ideas column holds only tasks in the idea stage', () => {
    expect(columnForTask('idea', 'accepted')).toBe('ideas')
    expect(columnForTask('planning', 'accepted')).not.toBe('ideas')
    expect(columnForTask('idea', 'pending')).not.toBe('ideas')
  })

  it('an unknown status is shown, not dropped', () => {
    expect(columnForTask('mystery', 'accepted')).toBe('planning')
  })
})

describe('MY_WORK_COLUMNS', () => {
  it('every column a mapper can return exists, once, with an Arabic label', () => {
    const keys = MY_WORK_COLUMNS.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const c of MY_WORK_COLUMNS) expect(c.label).toMatch(/[؀-ۿ]/)
    for (const k of ['ideas', 'pending', 'planning', 'in_progress', 'review', 'completed', 'on_hold', 'closed'] as const) expect(keys).toContain(k)
  })

  it('names the three states from the request exactly', () => {
    const label = (k: MyWorkColumnKey) => MY_WORK_COLUMNS.find((c) => c.key === k)?.label
    expect(label('pending')).toBe('بانتظار الاستلام')
    expect(label('in_progress')).toBe('قيد التنفيذ')
    expect(label('completed')).toBe('مكتملة')
    expect(label('closed')).toBe('متعذّر / معتذر عنه')
  })
})
