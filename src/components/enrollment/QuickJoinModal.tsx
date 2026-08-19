import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react'
import {
  clearEnrollIntent,
  getEnrollIntentSnapshot,
  registerEnrollIntentHost,
  subscribeEnrollIntent,
} from '@/lib/enrollIntent'

// Bundle discipline: the join/login form, country/phone widgets and enrollment
// calls live in a separate chunk that loads only when a guest actually clicks
// an enroll CTA — the always-mounted host below costs a subscription and nothing else.
const QuickJoinModalBody = lazy(() => import('./QuickJoinModalBody'))

/**
 * Host for the in-context join+enroll modal — mounted ONCE in the public Layout.
 *
 * Listens to the enroll-intent store (`src/lib/enrollIntent.ts`); whenever
 * `gatePublicEnrollClick` records an intent for a guest or a non-student
 * account, the body chunk loads and opens over the current page. Clearing the
 * intent (escape / backdrop / success navigation) unmounts it again.
 */
export default function QuickJoinModal() {
  const intent = useSyncExternalStore(subscribeEnrollIntent, getEnrollIntentSnapshot)

  // Presence registration — tells the gate the in-page flow is available, so it
  // stops sending guests on the /login?redirect round-trip.
  useEffect(() => registerEnrollIntentHost(), [])

  if (!intent) return null

  return (
    <Suspense fallback={null}>
      {/* Keyed so a different program's click restarts the flow with fresh state. */}
      <QuickJoinModalBody
        key={`${intent.kind}:${intent.slug}`}
        intent={intent}
        onClose={clearEnrollIntent}
      />
    </Suspense>
  )
}
