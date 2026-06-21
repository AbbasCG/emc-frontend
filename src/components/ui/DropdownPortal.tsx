import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export type DropdownAlign = 'start' | 'end' | 'stretch'

export type DropdownLayer = 'popover' | 'datetime'

const LAYER_Z: Record<DropdownLayer, number> = {
  popover: 100,
  datetime: 300,
}

type DropdownPortalProps = {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  onClose?: () => void
  children: ReactNode
  className?: string
  align?: DropdownAlign
  offset?: number
  dir?: 'rtl' | 'ltr'
  flip?: boolean
  /** Stacking layer — datetime uses z-[300] above modals */
  layer?: DropdownLayer
  /** Clamp popover height to viewport and enable internal scroll */
  constrainViewport?: boolean
}

function computeHorizontal(
  anchor: HTMLElement,
  align: DropdownAlign,
  portalWidth: number,
): Pick<CSSProperties, 'left' | 'right' | 'width'> {
  const rect = anchor.getBoundingClientRect()
  const vw = window.innerWidth
  const pad = 8

  if (align === 'stretch') {
    const width = Math.min(rect.width, vw - pad * 2)
    const right = vw - rect.right
    return { width, right: Math.max(pad, right) }
  }

  if (align === 'end') {
    const rightAlignedLeft = rect.right - portalWidth
    if (rightAlignedLeft < pad) {
      return { left: Math.max(pad, rect.left), width: Math.min(portalWidth, vw - pad * 2) }
    }
    return { right: vw - rect.right, width: Math.min(portalWidth, vw - pad * 2) }
  }

  const left = Math.min(rect.left, vw - portalWidth - pad)
  return { left: Math.max(pad, left), width: Math.min(portalWidth, vw - pad * 2) }
}

function computeVertical(
  anchor: HTMLElement,
  portalHeight: number,
  offset: number,
  flip: boolean,
  constrain: boolean,
): Pick<CSSProperties, 'top' | 'bottom' | 'maxHeight' | 'overflowY'> {
  const rect = anchor.getBoundingClientRect()
  const vh = window.innerHeight
  const pad = 8
  const gap = offset
  const spaceBelow = vh - rect.bottom - gap - pad
  const spaceAbove = rect.top - gap - pad

  let placeBelow = !flip || spaceBelow >= spaceAbove
  if (flip && portalHeight > spaceBelow && spaceAbove > spaceBelow) {
    placeBelow = false
  }

  const available = placeBelow ? spaceBelow : spaceAbove
  const maxHeight = constrain ? Math.max(160, Math.min(portalHeight, available, vh - pad * 2)) : undefined

  if (placeBelow) {
    const top = Math.min(rect.bottom + gap, vh - pad - (maxHeight ?? portalHeight))
    return {
      top: Math.max(pad, top),
      maxHeight,
      overflowY: constrain && maxHeight != null && portalHeight > maxHeight ? 'auto' : undefined,
    }
  }

  const top = Math.max(pad, rect.top - gap - (maxHeight ?? portalHeight))
  return {
    top,
    maxHeight,
    overflowY: constrain && maxHeight != null && portalHeight > maxHeight ? 'auto' : undefined,
  }
}

/**
 * Renders dropdown content in a document.body portal with fixed positioning.
 * Escapes overflow-hidden ancestors; datetime layer stacks above modals.
 */
export function DropdownPortal({
  open,
  anchorRef,
  onClose,
  children,
  className,
  align = 'end',
  offset = 4,
  dir = 'rtl',
  flip = true,
  layer = 'popover',
  constrainViewport = true,
}: DropdownPortalProps) {
  const portalRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden', position: 'fixed' })

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return

    const update = () => {
      const anchor = anchorRef.current
      const portal = portalRef.current
      if (!anchor) return

      const rect = anchor.getBoundingClientRect()
      const portalWidth = portal?.offsetWidth ?? (align === 'stretch' ? rect.width : 320)
      const portalHeight = portal?.scrollHeight ?? 420

      const horizontal = computeHorizontal(anchor, align, portalWidth)
      const vertical = computeVertical(anchor, portalHeight, offset, flip, constrainViewport)

      setStyle({
        position: 'fixed',
        zIndex: LAYER_Z[layer],
        visibility: 'visible',
        ...horizontal,
        ...vertical,
      })
    }

    update()
    const ro = portalRef.current ? new ResizeObserver(update) : null
    ro?.observe(portalRef.current!)

    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      ro?.disconnect()
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, anchorRef, align, offset, flip, layer, constrainViewport, children])

  useEffect(() => {
    if (!open || !onClose) return

    function onDoc(e: MouseEvent) {
      const target = e.target as Node
      if (anchorRef.current?.contains(target)) return
      if (portalRef.current?.contains(target)) return
      onClose?.()
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose?.()
      }
    }

    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={portalRef}
      dir={dir}
      style={style}
      className={cn(layer === 'datetime' ? 'z-datetime-popover' : 'z-popover', className)}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  )
}
