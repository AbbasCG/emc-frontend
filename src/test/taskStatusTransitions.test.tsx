import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskDetailPanel from '@/components/operations/TaskDetailPanel'
import { OUTCOME_STATUSES, STATUS_LOCK_HINT, isCreditBearing, statusControl } from '@/lib/taskStatusTransitions'
import { TASK_STATUS_ORDER } from '@/data/operationsLabels'
import type { OpsTask, TaskStatus } from '@/types/operations'

/**
 * The status control offers only what the server accepts by hand (backend TaskTransitionRules): «بانتظار الاعتماد» and «مكتملة»
 * are the RESULTS of the evaluation and the HR approval, and a task that carries one of them (or an evaluation / approval on
 * record) is shown read-only instead of offering to re-open it.
 */
const task = (over: Partial<OpsTask> = {}): OpsTask => ({
  id: 12, title: 'تصميم منشور', description: 'وصف', department_id: '3', department_name: 'الإعلام', assignee_id: 7, assignee_name: 'سلمى',
  status: 'in_progress', priority: 'high', acceptance_status: 'accepted', comments: [], checklist: [], ...over,
}) as OpsTask

beforeAll(() => {
  Element.prototype.scrollIntoView ??= () => {}
})

function mount(t: OpsTask, memberView = false) {
  const onPatch = vi.fn().mockResolvedValue(undefined)
  render(
    <TaskDetailPanel task={t} open onClose={vi.fn()} onPatch={onPatch} onToggleChecklist={vi.fn()} onComment={vi.fn()} memberView={memberView} />,
  )

  return { onPatch, drawer: screen.getByRole('complementary') }
}

const optionValues = (select: HTMLElement) => within(select).getAllByRole('option').map((o) => (o as HTMLOptionElement).value)

describe('the rule (mirrors the server)', () => {
  it('a working task offers every status except the two outcomes', () => {
    const c = statusControl(task(), false)
    expect(c.mode).toBe('select')
    if (c.mode !== 'select') return
    expect(c.options).toEqual(TASK_STATUS_ORDER.filter((s) => !OUTCOME_STATUSES.includes(s)))
    expect(c.options).toContain('needs_evaluation')
    expect(c.options).not.toContain('completed')
    expect(c.options).not.toContain('waiting_approval')
  })

  it.each<[string, Partial<OpsTask>]>([
    ['awaiting approval', { status: 'waiting_approval' }],
    ['completed', { status: 'completed' }],
    ['evaluated but moved off waiting_approval', { status: 'in_progress', manager_approved_at: '2026-11-20T10:00:00Z' }],
    ['approved by HR', { status: 'in_progress', hr_approved_at: '2026-11-21T10:00:00Z' }],
  ])('%s: credit-bearing, read-only for a manager too', (_label, over) => {
    expect(isCreditBearing(task(over))).toBe(true)
    expect(statusControl(task(over), false)).toEqual({ mode: 'locked', reason: 'outcome-recorded' })
  })

  it('a member keeps their own reasons first: completed, then waiting for the acceptance', () => {
    expect(statusControl(task({ status: 'completed' }), true)).toEqual({ mode: 'locked', reason: 'completed-member' })
    expect(statusControl(task({ acceptance_status: 'pending', status: 'planning' }), true)).toEqual({ mode: 'locked', reason: 'pending-acceptance' })
  })
})

describe('the drawer', () => {
  it('a manager moving a working task is offered the working statuses only', async () => {
    const { drawer, onPatch } = mount(task())
    const select = within(drawer).getByRole('combobox', { name: 'الحالة' })
    expect(optionValues(select)).toEqual(['idea', 'under_review', 'planning', 'in_progress', 'needs_evaluation', 'postponed', 'cancelled'])
    expect((select as HTMLSelectElement).value).toBe('in_progress')

    await userEvent.selectOptions(select, 'needs_evaluation')
    expect(onPatch).toHaveBeenCalledWith({ status: 'needs_evaluation' })
  })

  it.each<TaskStatus>(['waiting_approval', 'completed'])('a manager sees a %s task read-only, with why, and cannot re-open it here', (status) => {
    const { drawer } = mount(task({ status, manager_approved_at: '2026-11-20T10:00:00Z' }))
    expect(within(drawer).queryByRole('combobox', { name: 'الحالة' })).not.toBeInTheDocument()
    expect(within(drawer).getByTestId('status-readonly')).toBeInTheDocument()
    expect(within(drawer).getByTestId('status-hint')).toHaveTextContent(STATUS_LOCK_HINT['outcome-recorded'])
  })

  it('a member moving their task sends finished work to «بحاجة لتقييم» and is never offered the outcomes', () => {
    const { drawer } = mount(task(), true)
    const values = optionValues(within(drawer).getByRole('combobox', { name: 'الحالة' }))
    expect(values).toContain('needs_evaluation')
    expect(values).not.toContain('completed')
    expect(values).not.toContain('waiting_approval')
  })

  it('a member\'s completed task and an unaccepted task keep the read-only status and their own hint', () => {
    const done = mount(task({ status: 'completed' }), true)
    expect(within(done.drawer).getByTestId('status-hint')).toHaveTextContent('ولا يغيّر العضو حالتها')
  })
})
