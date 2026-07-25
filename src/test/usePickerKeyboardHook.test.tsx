import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCallback, useMemo, useRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePickerKeyboard } from '@/components/ui/usePickerKeyboard'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { axeCheck } from './axe'

/**
 * `usePickerKeyboard` has no consumer in the app yet, so these tests drive it
 * through a minimal, accessible 7-column calendar grid built exactly to the
 * DOM contract the hook documents (`[data-cell-index]` + roving tabindex).
 */

// A 30-day month whose 1st falls in the 4th column: three leading pads, two trailing pads.
// Index of day d === d + 2.
const MONTH_A: (number | null)[] = [
  null, null, null, 1, 2, 3, 4,
  5, 6, 7, 8, 9, 10, 11,
  12, 13, 14, 15, 16, 17, 18,
  19, 20, 21, 22, 23, 24, 25,
  26, 27, 28, 29, 30, null, null,
]

// A 31-day month starting flush in the first column. Index of day d === d - 1.
const MONTH_B: (number | null)[] = [
  1, 2, 3, 4, 5, 6, 7,
  8, 9, 10, 11, 12, 13, 14,
  15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 26, 27, 28,
  29, 30, 31, null, null, null, null,
]

// A short 28-day month — four rows only, so high indices from MONTH_A fall out of range.
const MONTH_SHORT: (number | null)[] = [
  1, 2, 3, 4, 5, 6, 7,
  8, 9, 10, 11, 12, 13, 14,
  15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 26, 27, 28,
]

const ALL_PADS: (number | null)[] = [null, null, null, null, null, null, null]

const dayIndexA = (day: number) => day + 2

type GridProps = {
  cells: (number | null)[]
  selectedIndex?: number
  open?: boolean
  disabledIndices?: number[]
  onSelect?: (index: number) => void
  onPrevMonth?: () => void
  onNextMonth?: () => void
  onClose?: () => void
}

function CalendarGrid({
  cells,
  selectedIndex = -1,
  open = true,
  disabledIndices,
  onSelect = () => {},
  onPrevMonth = () => {},
  onNextMonth = () => {},
  onClose = () => {},
}: GridProps) {
  const disabled = useMemo(() => new Set(disabledIndices ?? []), [disabledIndices])
  const isDisabled = useCallback((index: number) => disabled.has(index), [disabled])

  const { gridRef, onGridKeyDown, activeIndex } = usePickerKeyboard({
    cells,
    selectedIndex,
    open,
    onSelect,
    onPrevMonth,
    onNextMonth,
    onClose,
    isDisabled,
  })

  const rows: (number | null)[][] = []
  for (let start = 0; start < cells.length; start += 7) rows.push(cells.slice(start, start + 7))

  return (
    <div ref={gridRef} role="grid" aria-label="التقويم" dir="rtl" onKeyDown={onGridKeyDown}>
      {rows.map((row, rowIndex) => (
        <div role="row" key={rowIndex}>
          {row.map((day, col) => {
            const index = rowIndex * 7 + col
            if (day == null) {
              return <div role="gridcell" key={index} data-cell-index={index} aria-disabled="true" />
            }
            return (
              <div
                role="gridcell"
                key={index}
                data-cell-index={index}
                tabIndex={index === activeIndex ? 0 : -1}
                aria-selected={index === selectedIndex}
                aria-disabled={isDisabled(index) ? true : undefined}
              >
                {day}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** The day number of the cell that currently holds DOM focus. */
function focusedDay(): string | null {
  return document.activeElement?.textContent ?? null
}

/** The grid index of the cell that currently holds DOM focus. */
function focusedIndex(): string | null {
  return document.activeElement?.getAttribute('data-cell-index') ?? null
}

function grid(): HTMLElement {
  return screen.getByRole('grid', { name: 'التقويم' })
}

describe('usePickerKeyboard — initial roving index', () => {
  it('starts on the selected day when it is selectable', () => {
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} />)
    expect(focusedDay()).toBe('8')
  })

  it('falls back to the first real day when the selected index is a pad cell', () => {
    render(<CalendarGrid cells={MONTH_A} selectedIndex={1} />)
    expect(focusedDay()).toBe('1')
    expect(focusedIndex()).toBe('3')
  })

  it('falls back to the first real day when nothing is selected', () => {
    render(<CalendarGrid cells={MONTH_A} selectedIndex={-1} />)
    expect(focusedIndex()).toBe('3')
  })

  it('skips a disabled first day when choosing the initial cell', () => {
    render(<CalendarGrid cells={MONTH_A} disabledIndices={[dayIndexA(1)]} />)
    expect(focusedDay()).toBe('2')
  })

  it('exposes exactly one tabbable cell (roving tabindex)', () => {
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} />)
    const tabbable = screen
      .getAllByRole('gridcell')
      .filter((cell) => cell.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toHaveTextContent('8')
  })

  it('does not steal focus while the picker is closed', () => {
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} open={false} />)
    expect(document.activeElement).toBe(document.body)
  })

  it('has no axe violations', async () => {
    const { container } = render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} />)
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

describe('usePickerKeyboard — horizontal movement is RTL-mirrored', () => {
  it('ArrowRight moves to the PREVIOUS day', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} />)

    await user.keyboard('{ArrowRight}')
    expect(focusedDay()).toBe('7')
  })

  it('ArrowLeft moves to the NEXT day', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} />)

    await user.keyboard('{ArrowLeft}')
    expect(focusedDay()).toBe('9')
  })

  it('stops at the first day instead of wrapping into the leading pad cells', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(1)} />)

    await user.keyboard('{ArrowRight}')
    expect(focusedDay()).toBe('1')
    expect(focusedIndex()).toBe('3')
  })

  it('stops at the last day instead of wrapping into the trailing pad cells', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(30)} />)

    await user.keyboard('{ArrowLeft}')
    expect(focusedDay()).toBe('30')
  })

  it('jumps over a disabled day rather than landing on it', async () => {
    const user = userEvent.setup()
    render(
      <CalendarGrid
        cells={MONTH_A}
        selectedIndex={dayIndexA(8)}
        disabledIndices={[dayIndexA(9)]}
      />,
    )

    await user.keyboard('{ArrowLeft}')
    expect(focusedDay()).toBe('10')
  })

  it('crosses the row boundary in index order', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(4)} />)

    // Day 4 ends row 0; the next index is day 5, the first cell of row 1.
    await user.keyboard('{ArrowLeft}')
    expect(focusedDay()).toBe('5')
  })
})

describe('usePickerKeyboard — vertical movement', () => {
  it('ArrowUp moves back a full week', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} />)

    await user.keyboard('{ArrowUp}')
    expect(focusedDay()).toBe('1')
  })

  it('ArrowDown moves forward a full week', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} />)

    await user.keyboard('{ArrowDown}')
    expect(focusedDay()).toBe('15')
  })

  it('ArrowUp stays put when the week above is out of the month', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(2)} />)

    await user.keyboard('{ArrowUp}')
    expect(focusedDay()).toBe('2')
  })

  it('ArrowDown stays put when the cell a week below is a trailing pad', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(25)} />)

    await user.keyboard('{ArrowDown}')
    expect(focusedDay()).toBe('25')
  })

  it('ArrowDown stays put when the target week is disabled', async () => {
    const user = userEvent.setup()
    render(
      <CalendarGrid
        cells={MONTH_A}
        selectedIndex={dayIndexA(8)}
        disabledIndices={[dayIndexA(15)]}
      />,
    )

    await user.keyboard('{ArrowDown}')
    expect(focusedDay()).toBe('8')
  })
})

describe('usePickerKeyboard — Home / End', () => {
  it('Home jumps to the first day of the current week', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} />)

    await user.keyboard('{Home}')
    expect(focusedDay()).toBe('5')
  })

  it('End jumps to the last day of the current week', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} />)

    await user.keyboard('{End}')
    expect(focusedDay()).toBe('11')
  })

  it('Home skips the leading pad cells of the first week', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(3)} />)

    await user.keyboard('{Home}')
    expect(focusedDay()).toBe('1')
    expect(focusedIndex()).toBe('3')
  })

  it('End skips the trailing pad cells of the last week', async () => {
    const user = userEvent.setup()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(28)} />)

    await user.keyboard('{End}')
    expect(focusedDay()).toBe('30')
  })

  it('End skips a disabled day at the end of the week', async () => {
    const user = userEvent.setup()
    render(
      <CalendarGrid
        cells={MONTH_A}
        selectedIndex={dayIndexA(8)}
        disabledIndices={[dayIndexA(11)]}
      />,
    )

    await user.keyboard('{End}')
    expect(focusedDay()).toBe('10')
  })
})

describe('usePickerKeyboard — month paging and commit keys', () => {
  it('PageUp asks for the previous month without moving the roving index', async () => {
    const user = userEvent.setup()
    const onPrevMonth = vi.fn()
    const onNextMonth = vi.fn()
    render(
      <CalendarGrid
        cells={MONTH_A}
        selectedIndex={dayIndexA(8)}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
      />,
    )

    await user.keyboard('{PageUp}')
    expect(onPrevMonth).toHaveBeenCalledTimes(1)
    expect(onNextMonth).not.toHaveBeenCalled()
    expect(focusedDay()).toBe('8')
  })

  it('PageDown asks for the next month', async () => {
    const user = userEvent.setup()
    const onNextMonth = vi.fn()
    render(
      <CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} onNextMonth={onNextMonth} />,
    )

    await user.keyboard('{PageDown}')
    expect(onNextMonth).toHaveBeenCalledTimes(1)
    expect(focusedDay()).toBe('8')
  })

  it('Enter commits the active cell', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} onSelect={onSelect} />)

    await user.keyboard('{ArrowLeft}{Enter}')
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(dayIndexA(9))
  })

  it('Space commits the active cell', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} onSelect={onSelect} />)

    await user.keyboard(' ')
    expect(onSelect).toHaveBeenCalledWith(dayIndexA(8))
  })

  it('accepts the legacy "Spacebar" key name', () => {
    const onSelect = vi.fn()
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} onSelect={onSelect} />)

    fireEvent.keyDown(grid(), { key: 'Spacebar' })
    expect(onSelect).toHaveBeenCalledWith(dayIndexA(8))
  })

  it('Escape closes the picker without selecting', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSelect = vi.fn()
    render(
      <CalendarGrid
        cells={MONTH_A}
        selectedIndex={dayIndexA(8)}
        onClose={onClose}
        onSelect={onSelect}
      />,
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('ignores unrelated keys', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
      <CalendarGrid
        cells={MONTH_A}
        selectedIndex={dayIndexA(8)}
        onSelect={onSelect}
        onClose={onClose}
      />,
    )

    await user.keyboard('a{Tab}')
    expect(onSelect).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('never commits a disabled cell', () => {
    const onSelect = vi.fn()
    const { rerender } = render(
      <CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} onSelect={onSelect} />,
    )

    // The constraint changes (e.g. a min-date arrives) while the same month stays rendered.
    rerender(
      <CalendarGrid
        cells={MONTH_A}
        selectedIndex={dayIndexA(8)}
        onSelect={onSelect}
        disabledIndices={[dayIndexA(8)]}
      />,
    )

    fireEvent.keyDown(grid(), { key: 'Enter' })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('commits nothing when the grid holds no selectable day at all', () => {
    const onSelect = vi.fn()
    render(<CalendarGrid cells={ALL_PADS} onSelect={onSelect} />)

    expect(document.activeElement).toBe(document.body)
    fireEvent.keyDown(grid(), { key: 'Enter' })
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('usePickerKeyboard — keeps the index valid as the grid changes', () => {
  it('keeps the same position when the new month still has a day there', () => {
    const { rerender } = render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} />)
    expect(focusedIndex()).toBe('10')

    rerender(<CalendarGrid cells={MONTH_B} selectedIndex={-1} />)

    expect(focusedIndex()).toBe('10')
    expect(focusedDay()).toBe('11')
  })

  it('falls back to the first day when the position becomes a pad cell', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<CalendarGrid cells={MONTH_B} selectedIndex={-1} />)
    await user.keyboard('{ArrowLeft}')
    expect(focusedIndex()).toBe('1')

    rerender(<CalendarGrid cells={MONTH_A} selectedIndex={-1} />)

    expect(focusedIndex()).toBe('3')
    expect(focusedDay()).toBe('1')
  })

  it('falls back into range when the new month has fewer cells', () => {
    const { rerender } = render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(30)} />)
    expect(focusedIndex()).toBe('32')

    rerender(<CalendarGrid cells={MONTH_SHORT} selectedIndex={-1} />)

    expect(focusedIndex()).toBe('0')
    expect(focusedDay()).toBe('1')
  })

  it('moves to the newly selected day when the selection changes', () => {
    const { rerender } = render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} />)

    rerender(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(18)} />)

    expect(focusedDay()).toBe('18')
    const tabbable = screen
      .getAllByRole('gridcell')
      .filter((cell) => cell.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
  })

  it('leaves nothing active when the new month is entirely pad cells', () => {
    const { rerender } = render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} />)

    rerender(<CalendarGrid cells={ALL_PADS} selectedIndex={-1} />)

    expect(
      screen.getAllByRole('gridcell').filter((cell) => cell.getAttribute('tabindex') === '0'),
    ).toHaveLength(0)
  })
})

describe('usePickerKeyboard — closed picker', () => {
  it('still moves the roving tabindex without pulling focus', () => {
    render(<CalendarGrid cells={MONTH_A} selectedIndex={dayIndexA(8)} open={false} />)

    fireEvent.keyDown(grid(), { key: 'ArrowLeft' })

    expect(screen.getByText('9')).toHaveAttribute('tabindex', '0')
    expect(screen.getByText('8')).toHaveAttribute('tabindex', '-1')
    expect(document.activeElement).toBe(document.body)
  })
})

// ---------------------------------------------------------------------------
// useFocusTrap — the other shared a11y hook in this area.
// ---------------------------------------------------------------------------

function TrapHarness({
  active,
  onEscape,
  withFocusables = true,
  hideFirst = false,
}: {
  active: boolean
  onEscape?: () => void
  withFocusables?: boolean
  hideFirst?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, { active, onEscape })

  return (
    <div>
      <button type="button">فتح</button>
      <div ref={panelRef} role="dialog" aria-label="نافذة حوار" tabIndex={-1}>
        {withFocusables && (
          <>
            <button type="button" hidden={hideFirst}>
              الأول
            </button>
            <button type="button">الأوسط</button>
            <button type="button">الأخير</button>
          </>
        )}
      </div>
    </div>
  )
}

describe('useFocusTrap', () => {
  // jsdom has no layout, so `offsetParent` is always null and the hook's visibility
  // filter would discard every candidate. Emulate a laid-out document for the duration
  // of this block: attached and not [hidden] === visible.
  const originalOffsetParent = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetParent',
  )

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get(this: HTMLElement) {
        return this.hidden ? null : this.parentElement
      },
    })
  })

  afterEach(() => {
    if (originalOffsetParent) {
      Object.defineProperty(HTMLElement.prototype, 'offsetParent', originalOffsetParent)
    }
  })

  it('moves focus to the first focusable element on activation', () => {
    render(<TrapHarness active />)
    expect(document.activeElement).toHaveTextContent('الأول')
  })

  it('skips hidden elements when choosing the first focusable', () => {
    render(<TrapHarness active hideFirst />)
    expect(document.activeElement).toHaveTextContent('الأوسط')
  })

  it('focuses the panel itself when it contains nothing focusable', () => {
    render(<TrapHarness active withFocusables={false} />)
    expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'نافذة حوار' }))
  })

  it('does nothing while inactive', () => {
    render(<TrapHarness active={false} />)
    expect(document.activeElement).toBe(document.body)
  })

  it('wraps Tab from the last focusable back to the first', async () => {
    const user = userEvent.setup()
    render(<TrapHarness active />)

    await user.tab()
    await user.tab()
    expect(document.activeElement).toHaveTextContent('الأخير')

    await user.tab()
    expect(document.activeElement).toHaveTextContent('الأول')
  })

  it('wraps Shift+Tab from the first focusable back to the last', async () => {
    const user = userEvent.setup()
    render(<TrapHarness active />)

    await user.tab({ shift: true })
    expect(document.activeElement).toHaveTextContent('الأخير')
  })

  it('never lets Tab escape to controls outside the panel', async () => {
    const user = userEvent.setup()
    render(<TrapHarness active />)

    for (let i = 0; i < 6; i++) await user.tab()
    expect(screen.getByRole('dialog', { name: 'نافذة حوار' })).toContainElement(
      document.activeElement as HTMLElement,
    )
    expect(document.activeElement).not.toHaveTextContent('فتح')
  })

  it('calls onEscape when Escape is pressed inside the panel', async () => {
    const user = userEvent.setup()
    const onEscape = vi.fn()
    render(<TrapHarness active onEscape={onEscape} />)

    await user.keyboard('{Escape}')
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('tolerates Escape when no handler was provided', async () => {
    const user = userEvent.setup()
    render(<TrapHarness active />)

    await expect(user.keyboard('{Escape}')).resolves.toBeUndefined()
    expect(document.activeElement).toHaveTextContent('الأول')
  })

  it('restores focus to the opener when the trap is deactivated', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<TrapHarness active={false} />)

    await user.click(screen.getByRole('button', { name: 'فتح' }))
    expect(document.activeElement).toHaveTextContent('فتح')

    rerender(<TrapHarness active />)
    expect(document.activeElement).toHaveTextContent('الأول')

    rerender(<TrapHarness active={false} />)
    expect(document.activeElement).toHaveTextContent('فتح')
  })

  it('restores focus to the opener on unmount', () => {
    const opener = document.createElement('button')
    opener.textContent = 'زر خارجي'
    document.body.appendChild(opener)
    opener.focus()

    const { unmount } = render(<TrapHarness active />)
    expect(document.activeElement).toHaveTextContent('الأول')

    unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('has no axe violations', async () => {
    const { container } = render(<TrapHarness active />)
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})
