/**
 * EMC UI kit — premium design-system primitives.
 *
 * Existing primitives (EmcButton, FormField, DashboardPageShell, ApiErrorAlert)
 * are exported here too so any page can pull the whole kit from one place.
 */

export { default as EmcButton } from './EmcButton'
export { default as FormField } from './FormField'
export { default as DashboardPageShell } from './DashboardPageShell'
export { default as ApiErrorAlert } from './ApiErrorAlert'

export { default as Surface } from './Surface'
export type { SurfaceVariant, SurfaceElevation, SurfacePadding } from './Surface'

export { default as Eyebrow } from './Eyebrow'
export type { EyebrowTone } from './Eyebrow'

export { default as StatTile } from './StatTile'
export type { StatTone, StatTrend } from './StatTile'

export { default as SectionHeading } from './SectionHeading'
