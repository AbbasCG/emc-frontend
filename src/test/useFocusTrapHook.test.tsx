import { describe, it, expect, vi } from 'vitest'
import { useRef, useState } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useFocusTrap } from '@/hooks/useFocusTrap'

/**
 * Contract under test (src/hooks/useFocusTrap.ts):
 * - on activation focuses the first focusable descendant (or the panel itself when there is none);
 * - Tab from the last focusable wraps to the first; Shift+Tab from the first wraps to the last;
 * - Escape invokes the latest `onEscape` without re-running the trap;
 * - on deactivation / unmount focus returns to the element that was focused before.
 */

function Panel({
  active,
  onEscape,
  empty = false,
}: {
  active: boolean
  onEscape?: () => void
  empty?: boolean
}) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  useFocusTrap(panelRef, { active, onEscape })
  return (
    <div ref={panelRef} tabIndex={-1} data-testid="panel">
      {!empty && (
        <>
          <button type="button">first</button>
          <button type="button">middle</button>
          <button type="button">last</button>
        </>
      )}
    </div>
  )
}

function Harness({ onEscape, empty }: { onEscape?: () => void; empty?: boolean }) {
  const [active, setActive] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setActive((a) => !a)}>
        opener
      </button>
      {active ? <Panel active onEscape={onEscape} empty={empty} /> : null}
    </div>
  )
}

// jsdom reports offsetParent as null for everything, so the hook's visibility filter
// would drop every candidate. Make laid-out elements report a real offsetParent.
function withLayout(run: () => Promise<void> | void) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() {
      return this.parentElement
    },
  })
  return Promise.resolve(run()).finally(() => {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, 'offsetParent', descriptor)
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>).offsetParent
  })
}

describe('useFocusTrap', () => {
  it('focuses the first focusable descendant on activation', async () => {
    await withLayout(async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await user.click(screen.getByRole('button', { name: 'opener' }))
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }))
    })
  })

  it('falls back to the panel itself when there is nothing focusable inside', async () => {
    await withLayout(async () => {
      const user = userEvent.setup()
      render(<Harness empty />)
      await user.click(screen.getByRole('button', { name: 'opener' }))
      expect(document.activeElement).toBe(screen.getByTestId('panel'))
    })
  })

  it('wraps Tab from the last focusable back to the first', async () => {
    await withLayout(async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await user.click(screen.getByRole('button', { name: 'opener' }))

      const last = screen.getByRole('button', { name: 'last' })
      act(() => last.focus())
      await user.tab()

      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }))
    })
  })

  it('wraps Shift+Tab from the first focusable back to the last', async () => {
    await withLayout(async () => {
      const user = userEvent.setup()
      render(<Harness />)
      await user.click(screen.getByRole('button', { name: 'opener' }))

      const first = screen.getByRole('button', { name: 'first' })
      act(() => first.focus())
      await user.tab({ shift: true })

      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'last' }))
    })
  })

  it('calls onEscape on Escape', async () => {
    await withLayout(async () => {
      const user = userEvent.setup()
      const onEscape = vi.fn()
      render(<Harness onEscape={onEscape} />)
      await user.click(screen.getByRole('button', { name: 'opener' }))

      await user.keyboard('{Escape}')
      expect(onEscape).toHaveBeenCalledTimes(1)
    })
  })

  it('restores focus to the opener when the trap deactivates', async () => {
    await withLayout(async () => {
      const user = userEvent.setup()
      render(<Harness />)
      const opener = screen.getByRole('button', { name: 'opener' })

      await user.click(opener)
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }))

      // Toggling `active` off unmounts the panel and runs the trap cleanup.
      await user.click(opener)
      expect(document.activeElement).toBe(opener)
    })
  })

  it('does not trap while inactive', async () => {
    await withLayout(async () => {
      const onEscape = vi.fn()
      const user = userEvent.setup()
      function Inactive() {
        const ref = useRef<HTMLDivElement | null>(null)
        useFocusTrap(ref, { active: false, onEscape })
        return (
          <div ref={ref} tabIndex={-1}>
            <button type="button">inside</button>
          </div>
        )
      }
      render(<Inactive />)

      expect(document.activeElement).toBe(document.body)
      await user.keyboard('{Escape}')
      expect(onEscape).not.toHaveBeenCalled()
    })
  })
})
