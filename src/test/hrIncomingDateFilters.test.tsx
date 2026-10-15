import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { IncomingFilters } from '@/components/hrIncoming/IncomingFilters'
import { EMPTY_FILTERS, type IncomingFilterState } from '@/components/hrIncoming/hrIncomingUi'

function Harness({ initial = EMPTY_FILTERS, onChange = () => {} }: { initial?: IncomingFilterState; onChange?: (f: IncomingFilterState) => void }) {
  const [v, setV] = useState(initial)

  return <IncomingFilters value={v} onChange={(n) => { setV(n); onChange(n) }} departments={[]} />
}

const from = () => screen.getByRole('button', { name: /^من تاريخ/ })
const to = () => screen.getByRole('button', { name: /^إلى تاريخ/ })

/** Day buttons of the open calendar (they are numbered buttons inside the date dialog). */
const day = (n: number) => within(screen.getByRole('dialog')).getByRole('button', { name: String(n) })

describe('HR date filters (EMC date picker)', () => {
  it('uses the EMC picker, not the browser date input, and keeps both fields inside the filter container', () => {
    const { container } = render(<Harness />)

    expect(container.querySelector('input[type="date"]')).toBeNull()
    const section = screen.getByRole('region', { name: 'التصفية' })
    expect(section.contains(from())).toBe(true)
    expect(section.contains(to())).toBe(true)
    // Each date field sits in its own grid cell that can shrink (min-w-0), so neither can push past the box.
    expect(screen.getByTestId('date-from')).toHaveClass('min-w-0')
    expect(screen.getByTestId('date-to')).toHaveClass('min-w-0')
  })

  it('start date only, end date only, then both, each reaching the page as a plain YYYY-MM-DD string', async () => {
    const seen = vi.fn()
    render(<Harness initial={{ ...EMPTY_FILTERS }} onChange={seen} />)

    await userEvent.click(from())
    await userEvent.click(day(10))
    expect(seen).toHaveBeenLastCalledWith(expect.objectContaining({ dateFrom: expect.stringMatching(/^\d{4}-\d{2}-10$/), dateTo: '' }))

    await userEvent.click(screen.getByRole('button', { name: 'مسح تاريخ البداية' }))
    await userEvent.click(to())
    await userEvent.click(day(20))
    expect(seen).toHaveBeenLastCalledWith(expect.objectContaining({ dateFrom: '', dateTo: expect.stringMatching(/^\d{4}-\d{2}-20$/) }))

    await userEvent.click(from())
    await userEvent.click(day(5))
    const last = seen.mock.calls.at(-1)![0] as IncomingFilterState
    expect(last.dateFrom).toMatch(/-05$/)
    expect(last.dateTo).toMatch(/-20$/)
  })

  it('does not allow an end before the start, or a start after the end', async () => {
    render(<Harness initial={{ ...EMPTY_FILTERS, dateFrom: '2026-10-10', dateTo: '2026-10-20' }} />)

    await userEvent.click(to())
    expect(day(9)).toBeDisabled()
    expect(day(10)).toBeEnabled()
    await userEvent.keyboard('{Escape}')

    await userEvent.click(from())
    expect(day(21)).toBeDisabled()
    expect(day(20)).toBeEnabled()
  })

  it('clearing a date empties just that field, and "clear filters" empties both', async () => {
    const seen = vi.fn()
    render(<Harness initial={{ ...EMPTY_FILTERS, dateFrom: '2026-10-10', dateTo: '2026-10-20' }} onChange={seen} />)

    await userEvent.click(screen.getByRole('button', { name: 'مسح تاريخ النهاية' }))
    expect(seen).toHaveBeenLastCalledWith(expect.objectContaining({ dateFrom: '2026-10-10', dateTo: '' }))

    await userEvent.click(screen.getByRole('button', { name: /مسح التصفية/ }))
    expect(seen).toHaveBeenLastCalledWith(EMPTY_FILTERS)
  })
})
