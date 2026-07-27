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

/**
 * Fires in-view animations so full-page captures don't show opacity-0 sections.
 * Half-viewport steps with a 150ms dwell: under parallel-worker load, faster
 * jump-scrolling outruns IntersectionObserver and leaf reveals (amount 0.2-0.25)
 * never fire, which reads as fake "blank section" findings in the album review.
 */
async function settleAndSweep(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight / 2))
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 150))
    }
    window.scrollTo(0, 0)
  })
  // Headless rAF runs slow under parallel-worker load: one-shot 0.5s framer
  // transitions can take ~2s of wall clock, so the page's tail sections (whose
  // reveals fire on the sweep's last steps) need this settle to finish fading in.
  await page.waitForTimeout(1800)
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

  const base = `e2e/__screenshots__/${testInfo.project.name}/album/${slug}`
  // Chromium's max texture height is 16384px: a fullPage capture of a taller page
  // corrupts its tail (ghosted fixed elements, blank/duplicated bands) — clipping
  // doesn't help because the clip is cut from the same corrupted capture. Zoom the
  // document down just enough to fit under the limit, capture once, restore.
  const pageHeight = await page.evaluate(() => document.body.scrollHeight)
  if (opts.fullPage && pageHeight > 16000) {
    // Content past ~16384px is corrupted in Chromium fullPage captures (max texture
    // height) and clipping can't recover it — so capture the safe region in one
    // clipped shot and photograph the true tail with a plain viewport shot.
    const width = page.viewportSize()?.width ?? 1280
    await page.screenshot({ path: `${base}.png`, fullPage: true, clip: { x: 0, y: 0, width, height: 16000 } })
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${base}--tail.png` })
    return
  }
  await page.screenshot({ path: `${base}.png`, fullPage: opts.fullPage })
}

/**
 * The consent banner is a fixed overlay that obscures mid-page content in captures;
 * it has been reviewed and has its own styling coverage, so album shots pre-seed
 * consent to photograph the page itself. Keys mirror src/lib/cookieConsent.ts.
 */
async function seedCookieConsent(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'emc_cookie_consent_v1',
      JSON.stringify({ version: 1, necessary: true, analytics: false, marketing: false, updatedAt: '2026-01-01T00:00:00Z' }),
    )
  })
}

for (const route of PUBLIC_ROUTES) {
  test(`album: public ${route}`, async ({ page }, testInfo) => {
    await mockApi(page)
    await seedCookieConsent(page)
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
    await seedCookieConsent(page)
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
