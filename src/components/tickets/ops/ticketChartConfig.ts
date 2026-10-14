/**
 * Chart palette for the ticket analytics view: the platform's own CSS variables (src/index.css), so the
 * charts follow the brand tokens and no raw colour is introduced here.
 */
export const TICKET_CHART = {
  brand: 'var(--customBlue)',
  accent: 'var(--customOrange)',
  success: 'var(--emc-success)',
  danger: 'var(--emc-danger)',
  grid: 'var(--emc-line-strong)',
} as const
