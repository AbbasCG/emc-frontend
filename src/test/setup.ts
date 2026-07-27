import '@testing-library/jest-dom'
import { expect } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers'

// M4.d — `expect(await axe(container)).toHaveNoViolations()` in component tests.
expect.extend(axeMatchers)

// jsdom ships neither observer; framer-motion's whileInView needs IntersectionObserver
// at mount and recharts needs ResizeObserver. No-op stubs: reveals stay at their
// initial state but the content is in the DOM, which is what RTL queries assert on.
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): unknown[] { return [] }
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds: number[] = []
}
globalThis.IntersectionObserver ??= ObserverStub as unknown as typeof IntersectionObserver
globalThis.ResizeObserver ??= ObserverStub as unknown as typeof ResizeObserver
