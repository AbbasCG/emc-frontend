const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex="0"]'

/**
 * Moves focus to the first control of the field `name` (marked with `data-field`) and brings it to the middle of the
 * screen, clear of the sticky header and the action bar. Returns false when that field is not on screen.
 */
export function focusField(name: string): boolean {
  const root = document.querySelector<HTMLElement>(`[data-field="${name}"]`)
  if (!root) return false

  const target = root.querySelector<HTMLElement>(FOCUSABLE) ?? root
  const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  target.focus({ preventScroll: true })
  root.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })

  return true
}
