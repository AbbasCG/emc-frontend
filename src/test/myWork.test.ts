import { describe, it, expect } from 'vitest'
import {
  DEFAULT_WORK_FILTERS,
  dedupeWorkItems,
  filterWorkItems,
  groupByColumn,
  sortWorkItems,
  taskToWorkItem,
  ticketToWorkItem,
} from '@/lib/myWork'
import { MY_WORK_COLUMNS } from '@/lib/myWorkColumns'
import type { MyWorkTicket } from '@/types/ticket'
import type { OpsTask } from '@/types/operations'

const NOW = Date.parse('2026-11-22T10:00:00Z')
const me = { name: 'سلمى' }

const ticket = (over: Partial<MyWorkTicket> = {}): MyWorkTicket => ({
  id: 5, ticket_number: 'EMC-5', title: 'الشبكة لا تعمل', status: 'ASSIGNED', priority: 'HIGH',
  department: { id: 1, name: 'التقنية' }, expected_resolution_time: '2026-11-25T10:00:00Z', is_delayed: false,
  task_scope: 'medium', task_points: 120, estimated_hours: 2.5,
  capabilities: { can_accept: true, can_reject: true, can_complete: false, can_open: true },
  ...over,
})

const task = (over: Partial<OpsTask> = {}): OpsTask => ({
  id: 12, title: 'تصميم منشور', department_id: '3', department_name: 'الإعلام', assignee_id: 7, assignee_name: 'سلمى',
  status: 'planning', priority: 'medium', acceptance_status: 'accepted', due_at: '2026-11-24', ...over,
})

describe('ticketToWorkItem / taskToWorkItem', () => {
  it('a ticket is a «ticket» item in its mapped column, with the server capabilities', () => {
    const i = ticketToWorkItem(ticket(), me, NOW)
    expect(i).toMatchObject({ key: 'ticket:5', kind: 'ticket', column: 'pending', priority: 'high', reference: 'EMC-5', canAccept: true, canReject: true, canComplete: false })
    expect(i.points).toBe(120)
    expect(i.hours).toBe(2.5)
    expect(i.estimateHidden).toBe(false)
  })

  it('priority, due date and assignee are shaped the same for both kinds', () => {
    const t = ticketToWorkItem(ticket({ priority: 'CRITICAL' }), me, NOW)
    const k = taskToWorkItem(task({ priority: 'critical' }), me, NOW)
    expect(t.priority).toBe(k.priority)
    expect(typeof t.dueAt).toBe(typeof k.dueAt)
    expect(t.assigneeName).toBe('سلمى')
    expect(k.assigneeName).toBe('سلمى')
  })

  it('the estimate keys missing from the payload mean «not available», present nulls mean «not set»', () => {
    const { task_scope: _s, task_points: _p, estimated_hours: _h, ...bare } = ticket()
    void _s; void _p; void _h
    expect(ticketToWorkItem(bare as MyWorkTicket, me, NOW).estimateHidden).toBe(true)
    const unset = ticketToWorkItem(ticket({ task_scope: null, task_points: null, estimated_hours: null }), me, NOW)
    expect(unset.estimateHidden).toBe(false)
    expect(unset.points).toBeNull()
  })

  it('overdue: past due and still open, never when finished or declined', () => {
    expect(ticketToWorkItem(ticket({ expected_resolution_time: '2026-11-20T10:00:00Z', status: 'IN_PROGRESS' }), me, NOW).overdue).toBe(true)
    expect(ticketToWorkItem(ticket({ expected_resolution_time: '2026-11-20T10:00:00Z', status: 'RESOLVED' }), me, NOW).overdue).toBe(false)
    expect(ticketToWorkItem(ticket({ is_delayed: true, status: 'IN_PROGRESS' }), me, NOW).overdue).toBe(true)
    expect(taskToWorkItem(task({ due_at: '2026-11-21' }), me, NOW).overdue).toBe(true)
    // a date-only due date lasts until the end of that day
    expect(taskToWorkItem(task({ due_at: '2026-11-22' }), me, NOW).overdue).toBe(false)
    expect(taskToWorkItem(task({ due_at: '2026-11-01', status: 'completed' }), me, NOW).overdue).toBe(false)
  })

  it('a task waiting for the member can be accepted or declined; an accepted one cannot', () => {
    const pending = taskToWorkItem(task({ acceptance_status: 'pending' }), me, NOW)
    expect(pending.column).toBe('pending')
    expect(pending.canAccept && pending.canReject).toBe(true)
    const done = taskToWorkItem(task({ acceptance_status: 'accepted' }), me, NOW)
    expect(done.canAccept || done.canReject).toBe(false)
  })
})

describe('dedupe', () => {
  it('each ticket (and task) appears once', () => {
    const a = ticketToWorkItem(ticket(), me, NOW)
    const b = ticketToWorkItem(ticket({ title: 'نسخة مكررة' }), me, NOW)
    const t = taskToWorkItem(task({ id: 5 }), me, NOW)
    const out = dedupeWorkItems([a, b, t])
    expect(out.map((i) => i.key)).toEqual(['ticket:5', 'task:5'])
    expect(out[0].title).toBe('الشبكة لا تعمل')
  })
})

describe('filters', () => {
  const items = [
    ticketToWorkItem(ticket({ id: 1, ticket_number: 'EMC-1', title: 'طابعة المكتب', priority: 'LOW', expected_resolution_time: null }), me, NOW),
    ticketToWorkItem(ticket({ id: 2, ticket_number: 'EMC-2', title: 'الشبكة', priority: 'CRITICAL', expected_resolution_time: '2026-11-20T00:00:00Z', status: 'IN_PROGRESS' }), me, NOW),
    taskToWorkItem(task({ id: 3, title: 'تصميم الشبكة الاجتماعية', priority: 'critical', due_at: '2026-11-23' }), me, NOW),
    taskToWorkItem(task({ id: 4, title: 'مراجعة', priority: 'low', due_at: null }), me, NOW),
  ]
  const f = (over: Partial<typeof DEFAULT_WORK_FILTERS>) => filterWorkItems(items, { ...DEFAULT_WORK_FILTERS, ...over }, NOW).map((i) => i.key)

  it('الكل / المهام / التذاكر', () => {
    expect(f({})).toHaveLength(4)
    expect(f({ kind: 'tasks' })).toEqual(['task:3', 'task:4'])
    expect(f({ kind: 'tickets' })).toEqual(['ticket:1', 'ticket:2'])
  })

  it('search covers title and ticket number, for both kinds', () => {
    expect(f({ search: 'الشبكة' })).toEqual(['ticket:2', 'task:3'])
    expect(f({ search: 'emc-1' })).toEqual(['ticket:1'])
  })

  it('priority and due-date filters act on both kinds', () => {
    expect(f({ priority: 'critical' })).toEqual(['ticket:2', 'task:3'])
    expect(f({ due: 'overdue' })).toEqual(['ticket:2'])
    expect(f({ due: 'none' })).toEqual(['ticket:1', 'task:4'])
    expect(f({ due: 'week' })).toEqual(['task:3'])
  })
})

describe('grouping and order', () => {
  it('every column is present, empty ones too', () => {
    const g = groupByColumn([ticketToWorkItem(ticket(), me, NOW)])
    expect(Object.keys(g).sort()).toEqual(MY_WORK_COLUMNS.map((c) => c.key).sort())
    expect(g.pending).toHaveLength(1)
    expect(g.closed).toHaveLength(0)
  })

  it('overdue first, then the more urgent, then the sooner due', () => {
    const a = taskToWorkItem(task({ id: 1, priority: 'low', due_at: '2026-11-30' }), me, NOW)
    const b = taskToWorkItem(task({ id: 2, priority: 'high', due_at: '2026-11-29' }), me, NOW)
    const c = taskToWorkItem(task({ id: 3, priority: 'low', due_at: '2026-11-01' }), me, NOW)
    expect(sortWorkItems([a, b, c]).map((i) => i.id)).toEqual([3, 2, 1])
  })
})
