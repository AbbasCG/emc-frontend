/**
 * EMC-WEB-001 §1 — direction arrows.
 *
 * Every directional arrow on the public site points LEFT and is drawn as an
 * inline SVG: never a font glyph, never a literal arrow character in markup.
 * One shared source keeps the stroke weight, cap style and optical size
 * identical on every surface that shows a "continue" affordance.
 *
 * Colour comes from `currentColor`, so the icon inherits its parent's token
 * class (text-white, text-navy, text-customOrange …) and never needs a hex.
 */
type ArrowLeftIconProps = {
  /** Square edge in px. Defaults to the 16px body-inline size. */
  size?: number
  className?: string
}

export default function ArrowLeftIcon({ size = 16, className }: ArrowLeftIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path d="M10 3L5 8l5 5" />
    </svg>
  )
}
