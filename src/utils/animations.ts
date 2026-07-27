import type { Variants } from 'framer-motion'

// UX-0 (calm motion): reveal travel, durations and stagger are intentionally kept small so
// content reads fast and animation guides rather than distracts.
// See docs/02-planning/ux-simplification-plan.md §2.

/**
 * Default viewport for scroll reveals — premium feel, no repeat flicker.
 *
 * `amount` is a fraction of the ELEMENT, so a fractional threshold on a container
 * taller than viewport/amount can NEVER fire — on a 812px phone, `amount: 0.25`
 * permanently hides any section taller than ~3200px (M5.5 album: the 12-themes
 * grid, about/partnerships/volunteer bodies…). `amount: 'some'` + a negative
 * bottom margin keeps the "meaningfully entered" reveal feel while guaranteeing
 * the trigger fires for content of any height.
 */
export const viewportOnce = {
  once: true,
  amount: 'some',
  margin: '0px 0px -96px 0px',
} as const

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] },
  },
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0 },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] },
  },
}

export const cardHover = {
  rest: { y: 0, boxShadow: '0 14px 40px -14px rgba(12,42,75,0.14)' },
  hover: {
    y: -2,
    boxShadow: '0 18px 44px -18px rgba(12,42,75,0.16)',
    transition: { duration: 0.18, ease: 'easeOut' as const },
  },
}

export const dropdownMotion: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: { duration: 0.12, ease: 'easeIn' as const },
  },
}

export const mobileMenuMotion: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: { duration: 0.28, ease: 'easeOut' as const },
  },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2 } },
}
