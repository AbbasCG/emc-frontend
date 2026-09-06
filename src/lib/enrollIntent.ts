/**
 * Enroll-intent store — the tiny module heart of the in-context join+enroll flow.
 *
 * A guest (or a non-student account) clicking «سجل الآن» anywhere on the public
 * surface records WHAT they wanted to join here, and the QuickJoinModal (mounted
 * once in the public Layout) picks it up and finishes the job in place — no
 * /login round-trip, no lost context.
 *
 * Deliberately a module-level store, not React context: enroll clicks happen in
 * deep leaf components (course cards, detail CTAs) and a context provider high
 * enough to serve them all would re-render the whole public tree on every
 * open/close. `subscribe` + `getSnapshot` are shaped for `useSyncExternalStore`,
 * so exactly one component (the modal host) re-renders when intent changes.
 */

export type EnrollIntentKind = 'course' | 'path'

export type EnrollIntent = {
  kind: EnrollIntentKind
  slug: string
  /** Arabic display title — shown in the modal header and success state. May be '' when the caller has no title at hand. */
  title: string
  isFree: boolean
  /** Numeric PK (course id / learning-path id). Enables in-modal auto-enrollment and the «ابدأ التعلّم» deep link. */
  id?: number
  price?: number
  currency?: string
}

type Listener = () => void

let current: EnrollIntent | null = null
const listeners = new Set<Listener>()
let hostCount = 0

function emit(): void {
  for (const listener of [...listeners]) listener()
}

/** Record what the visitor wanted to join — the QuickJoinModal host reacts to this. */
export function setEnrollIntent(intent: EnrollIntent): void {
  current = intent
  emit()
}

export function clearEnrollIntent(): void {
  if (current === null) return
  current = null
  emit()
}

/** `useSyncExternalStore` snapshot — reference-stable until set/clear. */
export function getEnrollIntentSnapshot(): EnrollIntent | null {
  return current
}

/** `useSyncExternalStore` subscribe — returns the unsubscribe function. */
export function subscribeEnrollIntent(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * The QuickJoinModal registers itself on mount; returns the unregister cleanup.
 * `gatePublicEnrollClick` only routes guests into the modal while a host is
 * actually mounted — otherwise it falls back to the classic /login?redirect trip.
 */
export function registerEnrollIntentHost(): () => void {
  hostCount += 1
  return () => {
    hostCount = Math.max(0, hostCount - 1)
  }
}

export function hasEnrollIntentHost(): boolean {
  return hostCount > 0
}
