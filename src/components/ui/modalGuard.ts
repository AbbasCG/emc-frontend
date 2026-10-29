import { createContext, useContext, useEffect } from 'react'

/**
 * Shared plumbing for CenteredModal: how a child reports "I am submitting" (busy) or "I hold unsaved input"
 * (dirty), and how the modal recognises that another layer owns the keyboard.
 */

export type Guard = { busy: boolean; dirty: boolean }
export type GuardApi = { set: (key: string, g: Partial<Guard>) => void; clear: (key: string) => void }

export const GuardContext = createContext<GuardApi | null>(null)

/**
 * Tell the surrounding modal this component is mid-submission (`busy`) or holds unsaved input (`dirty`). A
 * no-op outside a CenteredModal, so shared components can call it unconditionally.
 */
export function useModalGuard(key: string, state: Partial<Guard>) {
  const api = useContext(GuardContext)
  const { busy = false, dirty = false } = state

  useEffect(() => {
    api?.set(key, { busy, dirty })
  }, [api, key, busy, dirty])

  useEffect(() => () => api?.clear(key), [api, key])
}

/** Something else on screen owns the keyboard right now (an open native dialog or a nested overlay). */
export function hasNestedLayer(): boolean {
  if (typeof document === 'undefined') return false

  return document.querySelector('dialog[open]') !== null || document.querySelector('[data-nested-overlay]') !== null
}

let scrollLocks = 0
let savedOverflow = ''

/** Lock page scrolling; returns the release function. Counted, so stacked locks restore the original value once. */
export function lockBodyScroll(): () => void {
  if (scrollLocks++ === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }

  return () => {
    if (--scrollLocks === 0) document.body.style.overflow = savedOverflow
  }
}
