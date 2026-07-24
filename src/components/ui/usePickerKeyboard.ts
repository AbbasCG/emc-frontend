import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * RTL-aware keyboard navigation for a 7-column calendar grid.
 *
 * The grid is a flat array of cells where `null` entries are leading/trailing
 * pad cells that have no day. `cells` should be the same array used to render
 * the grid (e.g. the output of `buildCalendarDays`).
 *
 * Direction is RTL: visually the week reads right-to-left, so ArrowRight moves
 * to the PREVIOUS day (index - 1) and ArrowLeft to the NEXT day (index + 1).
 * Vertical movement (ArrowUp/ArrowDown) crosses a full week (±7) and is not
 * mirrored. Home/End jump to the start/end of the current week row. PageUp /
 * PageDown delegate to `onPrevMonth` / `onNextMonth`. Enter/Space select the
 * active cell (unless disabled). Escape closes.
 *
 * A roving `activeIndex` is kept; it always points at a selectable (non-null,
 * non-disabled) cell and exposes a roving tabIndex pattern to the caller.
 */

const COLS = 7

type UsePickerKeyboardOptions = {
  /** Flat grid cells; `null` marks a pad cell with no day. */
  cells: (number | null)[]
  /** Index in `cells` of the currently selected day, or -1 if none. */
  selectedIndex: number
  /** Whether the picker/dialog is open (controls auto-focus). */
  open: boolean
  /** Commit a selection for the cell at `index`. */
  onSelect: (index: number) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onClose: () => void
  /** Optional predicate; return true to make the cell at `index` non-selectable. */
  isDisabled?: (index: number) => boolean
}

type UsePickerKeyboardResult = {
  gridRef: React.RefObject<HTMLDivElement | null>
  onGridKeyDown: (e: React.KeyboardEvent) => void
  activeIndex: number
}

export function usePickerKeyboard({
  cells,
  selectedIndex,
  open,
  onSelect,
  onPrevMonth,
  onNextMonth,
  onClose,
  isDisabled,
}: UsePickerKeyboardOptions): UsePickerKeyboardResult {
  const gridRef = useRef<HTMLDivElement | null>(null)

  const isSelectable = useCallback(
    (index: number): boolean => {
      if (index < 0 || index >= cells.length) return false
      if (cells[index] == null) return false
      if (isDisabled?.(index)) return false
      return true
    },
    [cells, isDisabled],
  )

  const firstSelectable = useCallback((): number => {
    for (let i = 0; i < cells.length; i++) {
      if (isSelectable(i)) return i
    }
    return -1
  }, [cells, isSelectable])

  const [activeIndex, setActiveIndex] = useState<number>(() =>
    isSelectable(selectedIndex) ? selectedIndex : firstSelectable(),
  )

  // Keep the roving index valid as the visible month / selection changes. Adjusted
  // during render so the grid never exposes a stale `aria-activedescendant` for a frame.
  const [seenGrid, setSeenGrid] = useState({ cells, selectedIndex })
  if (seenGrid.cells !== cells || seenGrid.selectedIndex !== selectedIndex) {
    setSeenGrid({ cells, selectedIndex })
    setActiveIndex((prev) => {
      if (isSelectable(selectedIndex)) return selectedIndex
      if (isSelectable(prev)) return prev
      return firstSelectable()
    })
  }

  // Focus the active gridcell whenever the picker is open.
  useEffect(() => {
    if (!open) return
    const grid = gridRef.current
    if (!grid) return
    const el = grid.querySelector<HTMLElement>(`[data-cell-index="${activeIndex}"]`)
    el?.focus()
  }, [open, activeIndex])

  /** Find the nearest selectable cell stepping by `step` from `from`. */
  const seek = useCallback(
    (from: number, step: number): number => {
      let i = from + step
      while (i >= 0 && i < cells.length) {
        if (isSelectable(i)) return i
        i += step
      }
      return from
    },
    [cells, isSelectable],
  )

  const onGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight': {
          // RTL: previous day
          e.preventDefault()
          setActiveIndex((cur) => seek(cur, -1))
          break
        }
        case 'ArrowLeft': {
          // RTL: next day
          e.preventDefault()
          setActiveIndex((cur) => seek(cur, +1))
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          setActiveIndex((cur) => {
            const target = cur - COLS
            return isSelectable(target) ? target : cur
          })
          break
        }
        case 'ArrowDown': {
          e.preventDefault()
          setActiveIndex((cur) => {
            const target = cur + COLS
            return isSelectable(target) ? target : cur
          })
          break
        }
        case 'Home': {
          e.preventDefault()
          setActiveIndex((cur) => {
            const rowStart = cur - (cur % COLS)
            for (let i = rowStart; i < rowStart + COLS; i++) {
              if (isSelectable(i)) return i
            }
            return cur
          })
          break
        }
        case 'End': {
          e.preventDefault()
          setActiveIndex((cur) => {
            const rowStart = cur - (cur % COLS)
            for (let i = rowStart + COLS - 1; i >= rowStart; i--) {
              if (isSelectable(i)) return i
            }
            return cur
          })
          break
        }
        case 'PageUp': {
          e.preventDefault()
          onPrevMonth()
          break
        }
        case 'PageDown': {
          e.preventDefault()
          onNextMonth()
          break
        }
        case 'Enter':
        case ' ':
        case 'Spacebar': {
          e.preventDefault()
          if (isSelectable(activeIndex)) onSelect(activeIndex)
          break
        }
        case 'Escape': {
          e.preventDefault()
          onClose()
          break
        }
        default:
          break
      }
    },
    [activeIndex, seek, isSelectable, onSelect, onPrevMonth, onNextMonth, onClose],
  )

  return { gridRef, onGridKeyDown, activeIndex }
}
