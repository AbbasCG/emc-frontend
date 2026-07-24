import { test, expect } from '@playwright/test'
import { mockApi, collectConsoleErrors } from './support/mocks'

/**
 * Smoke — every key public page loads with visible content and a clean console.
 *
 * All /api traffic is intercepted (see e2e/support/mocks.ts); known noise
 * (asset 404s, disabled Reverb/websocket logs) is whitelisted via
 * CONSOLE_ERROR_WHITELIST. A screenshot of each page is stored under
 * e2e/__screenshots__/{project}/{route}.png for visual drift review.
 */

const ROUTES = [
  '/',
  '/courses',
  '/about',
  '/contact',
  '/impact',
  '/login',
  '/signup',
  '/submit-workshop',
] as const

function routeSlug(route: string): string {
  if (route === '/') return 'home'
  return route.replace(/^\//, '').replace(/[/?#]+/g, '_')
}

for (const route of ROUTES) {
  test(`smoke: ${route} renders without console errors`, async ({ page }, testInfo) => {
    await mockApi(page)
    const consoleErrors = collectConsoleErrors(page)

    await page.goto(route)
    // Best-effort settle — lazy chunks / mocked XHRs; never block the assertion.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    // (a) body has real visible text (not a blank white screen)
    const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim()
    expect(
      bodyText.length,
      `expected visible text on ${route}, got: "${bodyText.slice(0, 120)}"`,
    ).toBeGreaterThan(40)

    // Error boundary must not have tripped
    expect(bodyText).not.toContain('حدث خطأ غير متوقع')

    // (b) zero non-whitelisted console errors
    expect(
      consoleErrors,
      `console errors on ${route}:\n${consoleErrors.join('\n')}`,
    ).toEqual([])

    // Screenshot for visual review: e2e/__screenshots__/{project}/{route}.png
    await page.screenshot({
      path: `e2e/__screenshots__/${testInfo.project.name}/${routeSlug(route)}.png`,
      fullPage: false,
    })
  })
}
