import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type UseFocusTrapOptions = {
  active: boolean
  onEscape?: () => void
}

/**
 * Traps keyboard focus within `panelRef` while `active`.
 *
 * On activation, stores the current `document.activeElement` as the opener and
 * focuses the first focusable descendant (or the panel itself). Tab / Shift+Tab
 * cycle within the focusable set; Escape calls `onEscape`. On deactivation /
 * cleanup, focus is restored to the stored opener.
 *
 * Contract modelled on `src/components/feedback/ConfirmDialog.tsx`.
 */
export function useFocusTrap(
  panelRef: React.RefObject<HTMLElement | null>,
  { active, onEscape }: UseFocusTrapOptions,
) {
  // Latest-callback ref so an inline `onEscape={() => …}` (what every consumer passes)
  // does not re-run the trap effect on each parent render — that would restore focus to
  // the opener and re-focus the first control while the user is still inside the panel.
  // Updated in an effect declared before the trap effect below, matching `useFetch`.
  const onEscapeRef = useRef(onEscape)
  useEffect(() => {
    onEscapeRef.current = onEscape
  })

  useEffect(() => {
    if (!active) return
    const panel = panelRef.current
    if (!panel) return

    const opener = document.activeElement as HTMLElement | null

    const getFocusable = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )

    const focusables = getFocusable()
    if (focusables.length > 0) {
      focusables[0]?.focus()
    } else {
      panel.focus()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscapeRef.current?.()
        return
      }
      if (e.key !== 'Tab') return

      const items = getFocusable()
      if (items.length === 0) {
        e.preventDefault()
        panel.focus()
        return
      }

      const first = items[0]!
      const last = items[items.length - 1]!
      // The listener lives on `panel`, so a real key event can only come from the panel
      // or a descendant: focus is always inside the trap here.
      const activeEl = document.activeElement

      if (e.shiftKey) {
        if (activeEl === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (activeEl === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    panel.addEventListener('keydown', onKeyDown)

    return () => {
      panel.removeEventListener('keydown', onKeyDown)
      opener?.focus?.()
    }
  }, [active, panelRef])
}
