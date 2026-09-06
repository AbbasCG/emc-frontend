import type { NoViolationsMatcherResult } from 'vitest-axe/matchers'

/**
 * vitest-axe ships its ambient types against the legacy `Vi` namespace, which Vitest 4
 * no longer reads — so `expect(...).toHaveNoViolations()` type-checks as a missing
 * property even though the matcher is registered at runtime in `setup.ts`. This
 * re-declares it against Vitest 4's `Matchers` interface.
 */
declare module 'vitest' {
  interface Matchers<_T = unknown> {
    /** Asserts an axe run returned no accessibility violations. */
    toHaveNoViolations(): NoViolationsMatcherResult
  }
}
