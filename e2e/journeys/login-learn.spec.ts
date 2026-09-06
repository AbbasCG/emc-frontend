import { test, expect } from '@playwright/test'
import {
  mockApi,
  COURSE_ENROLLED,
  ERROR_BOUNDARY_TEXT,
  STUDENT_DASH_ERROR_TEXT,
  PASSWORD,
} from '../support/mocks'

/**
 * Journey 2 — UI-driven login → student dashboard renders the mocked enrollment.
 *
 * This is the one spec that drives the REAL login form (src/pages/Login.tsx:
 * #login-email / #login-password) against the intercepted POST /auth/login,
 * instead of the storage-seeding fast path used elsewhere.
 */
test('student logs in through the real form and lands on a working dashboard', async ({
  page,
}) => {
  await mockApi(page)

  await page.goto('/login')
  // NOTE: PageHeader renders a second h1 with the same title → .first()
  await expect(
    page.getByRole('heading', { name: 'تسجيل الدخول', level: 1 }).first(),
  ).toBeVisible()

  // Real field ids from src/pages/Login.tsx
  await page.locator('#login-email').fill('student@emc.test')
  await page.locator('#login-password').fill(PASSWORD)
  await page.getByRole('button', { name: /تسجيل الدخول/ }).click()

  // getPostLoginRedirect('/dashboard') → RoleRedirect → /dashboard/student
  await expect(page).toHaveURL(/\/dashboard\/student$/)

  // Student dashboard shell renders (hero role label from src/pages/Dashboard.tsx)
  await expect(page.getByText('بوابة الطالب')).toBeVisible()

  // The mocked enrollment (course 202) is listed on the dashboard
  await expect(page.getByText(COURSE_ENROLLED.title).first()).toBeVisible()

  // No raw error states anywhere
  await expect(page.getByText(STUDENT_DASH_ERROR_TEXT)).toHaveCount(0)
  await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0)
  // No lingering login-error alert either
  await expect(page.getByText('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى')).toHaveCount(0)
})
