import { test, expect, type Route } from '@playwright/test'
import { mockApi, COURSE_MAIN, ERROR_BOUNDARY_TEXT } from './support/mocks'

/**
 * Course detail — session_format / study_time display (mocked API).
 *
 * The API returns raw values (`workshop_single_session`, `15:00`); the public
 * page must show Arabic labels and Netherlands time instead.
 */

const COURSE_WITH_SCHEDULE = {
  ...COURSE_MAIN,
  session_format: 'workshop_single_session',
  study_time: '15:00',
}

/** Same headers as e2e/support/mocks.ts — the API origin (:8000) differs from preview (:4173). */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
}

async function serveCourse(route: Route): Promise<void> {
  // Preflights and anything other than the detail GET go to the shared mocks.
  if (route.request().method() !== 'GET') return route.fallback()
  return route.fulfill({
    status: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true, data: COURSE_WITH_SCHEDULE }),
  })
}

test('course detail shows Arabic session format and Netherlands study time', async ({ page }) => {
  await mockApi(page)
  // Registered after mockApi → these take precedence for the detail endpoint only.
  await page.route(`**/api/courses/${COURSE_MAIN.slug}`, serveCourse)
  await page.route(`http://127.0.0.1:8000/api/courses/${COURSE_MAIN.slug}`, serveCourse)

  await page.goto(`/courses/${COURSE_MAIN.slug}`)
  await expect(page.getByRole('heading', { name: COURSE_MAIN.title }).first()).toBeVisible()
  await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0)

  await expect(page.getByText(/صيغة الجلسات.*ورشة \/ لقاء واحد/).first()).toBeVisible()
  await expect(page.getByText(/وقت الدراسة.*3:00.*بتوقيت هولندا/).first()).toBeVisible()

  await expect(page.getByText('workshop_single_session')).toHaveCount(0)
  await expect(page.getByText(/وقت الدراسة:\s*15:00/)).toHaveCount(0)
})
