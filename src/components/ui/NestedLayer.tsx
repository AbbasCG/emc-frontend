import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/**
 * Renders a legacy `fixed inset-0` modal in a portal above any open CenteredModal.
 *
 * Why: inside a transformed, animated panel a `fixed` child is positioned against the panel, not the screen,
 * and its z-index competes inside the panel's stacking context, so it can end up clipped or behind. A portal to
 * `body` with the platform's `z-nested-modal` always sits on top, and the `data-nested-overlay` mark tells the
 * parent modal that this layer owns Escape and clicks while it is open.
 */
export function NestedLayer({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div data-nested-overlay dir="rtl" className="relative z-nested-modal">
      {children}
    </div>,
    document.body,
  )
}
