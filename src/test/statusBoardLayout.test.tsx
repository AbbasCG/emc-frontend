import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import StatusBoard from '@/components/ui/StatusBoard'
import KanbanBoard from '@/components/operations/KanbanBoard'
import { TicketKanbanBoard } from '@/components/tickets/ops/TicketKanbanBoard'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { TASK_STATUS_AR, TASK_STATUS_ORDER } from '@/data/operationsLabels'
import type { OpsTask } from '@/types/operations'
import type { Ticket } from '@/types/ticket'

function setWidth(narrow: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: narrow && query.includes('max-width: 768px'), media: query, onchange: null, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const task = (id: number, status: OpsTask['status']): OpsTask => ({ id, title: `مهمة ${id}`, department_id: '1', status, priority: 'medium' })

describe('StatusBoard', () => {
  const cols = [
    { key: 'a', label: 'الأولى', count: 0, children: null },
    { key: 'b', label: 'الثانية', count: 2, children: [<p key="1">عنصر ب1</p>, <p key="2">عنصر ب2</p>] },
    { key: 'c', label: 'الثالثة', count: 1, children: <p>عنصر ج</p> },
  ]

  it('wide: a wrapping grid with every column, empty ones included, each with its count', () => {
    setWidth(false)
    render(<StatusBoard ariaLabel="لوحة" columns={cols} />)
    const board = screen.getByTestId('status-board')
    expect(board).toHaveAttribute('data-layout', 'grid')
    expect(board.style.gridTemplateColumns).toMatch(/repeat\(auto-fit, minmax\(min\(100%, 15\.5rem\), 1fr\)\)/)
    expect(board.className).not.toMatch(/overflow-x|flex/)
    expect(within(board).getAllByRole('region')).toHaveLength(3)
    expect(screen.getByRole('region', { name: 'الأولى: 0' })).toHaveTextContent('لا عناصر هنا')
    expect(screen.getByRole('region', { name: 'الثانية: 2' })).toBeInTheDocument()
  })

  it('narrow: tabs with counts, one status at a time, arrow keys move between them', async () => {
    setWidth(true)
    render(<StatusBoard ariaLabel="لوحة" columns={cols} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(tabs.map((t) => within(t).getByTestId('tab-count').textContent)).toEqual(['0', '2', '1'])
    // opens on the first column that has items
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('عنصر ب1')
    expect(screen.queryByText('عنصر ج')).not.toBeInTheDocument()

    await userEvent.click(tabs[2])
    expect(screen.getByRole('tabpanel')).toHaveTextContent('عنصر ج')
    await userEvent.click(tabs[0])
    expect(screen.getByRole('tabpanel')).toHaveTextContent('لا عناصر هنا')

    tabs[0].focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true')
  })
})

describe('the task kanban uses it', () => {
  it('all nine statuses are reachable on a phone, each with its count', () => {
    setWidth(true)
    render(<KanbanBoard tasks={[task(1, 'idea'), task(2, 'completed'), task(3, 'completed'), task(4, 'waiting_approval')]} onOpenTask={vi.fn()} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(TASK_STATUS_ORDER.length)
    const done = tabs.find((t) => t.textContent?.startsWith(TASK_STATUS_AR.completed))
    expect(done).toHaveTextContent('2')
  })

  it('the real server statuses land in their own columns (none is lost)', () => {
    setWidth(false)
    render(<KanbanBoard tasks={[task(1, 'under_review'), task(2, 'needs_evaluation'), task(3, 'postponed')]} onOpenTask={vi.fn()} />)
    expect(screen.getByRole('region', { name: `${TASK_STATUS_AR.under_review}: 1` })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: `${TASK_STATUS_AR.needs_evaluation}: 1` })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: `${TASK_STATUS_AR.postponed}: 1` })).toBeInTheDocument()
  })
})

describe('the ticket board uses it', () => {
  const t = (id: number, status: Ticket['status']): Ticket => ({
    id, ticket_number: `EMC-${id}`, title: `تذكرة ${id}`, description: '', ticket_category: 'OLD_ISSUE', priority: 'LOW', department_id: 1,
    created_by_name: 'x', status, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  })
  const columns = [
    { status: 'PENDING_APPROVAL' as const, count: 0, tickets: [] },
    { status: 'ASSIGNED' as const, count: 9, tickets: [t(1, 'ASSIGNED')] },
  ]

  it('wide: columns wrap, the «show the rest» link stays', () => {
    setWidth(false)
    render(<TicketKanbanBoard columns={columns} loading={false} activeId={null} onOpen={vi.fn()} onAction={vi.fn()} onShowAll={vi.fn()} />)
    expect(screen.getByTestId('ticket-status-board')).toHaveAttribute('data-layout', 'grid')
    expect(screen.getByText('عرض الباقي (8) في الجدول')).toBeInTheDocument()
  })

  it('narrow: a status switcher with exact counts', () => {
    setWidth(true)
    render(<TicketKanbanBoard columns={columns} loading={false} activeId={null} onOpen={vi.fn()} onAction={vi.fn()} onShowAll={vi.fn()} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((x) => within(x).getByTestId('tab-count').textContent)).toEqual(['0', '9'])
  })
})

describe('stacked dialogs', () => {
  function Stack({ onOuter, onInner }: { onOuter: () => void; onInner: () => void }) {
    const [inner, setInner] = useState(false)

    return (
      <CenteredModal open onClose={onOuter} title="الخارجية">
        <button type="button" onClick={() => setInner(true)}>افتح الداخلية</button>
        <CenteredModal open={inner} onClose={() => { onInner(); setInner(false) }} title="الداخلية">
          <button type="button">داخل الداخلية</button>
        </CenteredModal>
      </CenteredModal>
    )
  }

  it('Escape closes only the top dialog, then the next one', async () => {
    const outer = vi.fn()
    const inner = vi.fn()
    render(<Stack onOuter={outer} onInner={inner} />)
    await userEvent.click(await screen.findByRole('button', { name: 'افتح الداخلية' }))
    expect(await screen.findByRole('dialog', { name: 'الداخلية' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()

    await userEvent.keyboard('{Escape}')
    expect(outer).toHaveBeenCalledTimes(1)
  })
})
