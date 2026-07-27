import { test, expect } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'
import { mockApi, loginAs, collectConsoleErrors } from './support/mocks'
import { EMC_DASHBOARD_ROLES, getDashboardPathByRole } from '../src/utils/dashboardAccess'

/**
 * M5.5.A — the polish album: every public page + every role's dashboard home,
 * captured on both viewports (desktop 1280 / mobile 375) for central review.
 *
 * Gate semantics are deliberately looser than smoke.spec.ts: a page FAILS only
 * when it is blank or its error boundary tripped. Console errors and unmatched
 * API warnings are *recorded* (test attachments + runner output), not asserted —
 * they are polish findings for the M5.5 report, and most exotic role dashboards
 * run entirely on the mock catch-all's empty payloads (empty states are part of
 * what M5.5 audits).
 *
 * Screenshots: e2e/__screenshots__/{project}/album/{slug}.png (full page for
 * public routes, viewport for dashboards).
 */

const PUBLIC_ROUTES = [
  '/',
  '/courses',
  '/workshops',
  '/instructors',
  '/about',
  '/contact',
  '/impact',
  '/team',
  '/departments',
  '/themes',
  '/tracks',
  '/paths',
  '/learning-paths',
  '/programs',
  '/platform',
  '/partnerships',
  '/partnerships/apply',
  '/volunteer',
  '/volunteer/apply',
  '/ambassador',
  '/ambassador/apply',
  '/support',
  '/knowledge',
  '/login',
  '/signup',
  '/forgot-password',
  '/submit-workshop',
  '/404',
] as const

const ERROR_BOUNDARY_HEADINGS = ['حدث خطأ غير متوقع']

function slugOf(route: string): string {
  if (route === '/') return 'home'
  return route.replace(/^\//, '').replace(/[/?#]+/g, '_')
}

/** Fires in-view animations so full-page captures don't show opacity-0 sections. */
async function settleAndSweep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  await page.evaluate(async () => {
    const step = window.innerHeight
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(400)
}

async function assertRenderedAndCapture(
  page: Page,
  testInfo: TestInfo,
  slug: string,
  consoleErrors: string[],
  opts: { fullPage: boolean },
): Promise<void> {
  const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim()
  expect(
    bodyText.length,
    `expected visible text on ${slug}, got: "${bodyText.slice(0, 120)}"`,
  ).toBeGreaterThan(40)
  for (const heading of ERROR_BOUNDARY_HEADINGS) {
    expect(bodyText, `error boundary tripped on ${slug}`).not.toContain(heading)
  }

  if (consoleErrors.length > 0) {
    await testInfo.attach(`console-errors-${slug}`, {
      body: consoleErrors.join('\n'),
      contentType: 'text/plain',
    })
  }

  await page.screenshot({
    path: `e2e/__screenshots__/${testInfo.project.name}/album/${slug}.png`,
    fullPage: opts.fullPage,
  })
}

for (const route of PUBLIC_ROUTES) {
  test(`album: public ${route}`, async ({ page }, testInfo) => {
    await mockApi(page)
    const consoleErrors = collectConsoleErrors(page)
    await page.goto(route)
    await settleAndSweep(page)
    await assertRenderedAndCapture(page, testInfo, slugOf(route), consoleErrors, {
      fullPage: true,
    })
  })
}

for (const role of EMC_DASHBOARD_ROLES) {
  test(`album: dashboard ${role}`, async ({ page }, testInfo) => {
    await mockApi(page, { role })
    const consoleErrors = collectConsoleErrors(page)
    await loginAs(page, role)

    const home = getDashboardPathByRole(role)
    await page.goto(home)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(400)

    // If the guard bounced this role off its own home, that is a real finding.
    expect(page.url(), `role ${role} was bounced off its home ${home}`).toContain('/dashboard')

    await assertRenderedAndCapture(page, testInfo, `dash-${role.replace(/_/g, '-')}`, consoleErrors, {
      fullPage: false,
    })
  })
}
