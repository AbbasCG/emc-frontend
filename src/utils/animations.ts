import type { Variants } from 'framer-motion'

/** Default viewport for scroll reveals — premium feel, no repeat flicker */
export const viewportOnce = { once: true, amount: 0.25 as const }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export const cardHover = {
  rest: { y: 0, boxShadow: '0 14px 40px -14px rgba(34, 51, 74, 0.14)' },
  hover: {
    y: -3,
    boxShadow: '0 22px 50px -18px rgba(34, 51, 74, 0.2)',
    transition: { duration: 0.22, ease: 'easeOut' as const },
  },
}

export const dropdownMotion: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
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
