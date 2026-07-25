import '@testing-library/jest-dom'
import { expect } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers'

// M4.d — `expect(await axe(container)).toHaveNoViolations()` in component tests.
expect.extend(axeMatchers)
