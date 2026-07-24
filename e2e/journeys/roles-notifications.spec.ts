import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  mockApi,
  loginAs,
  USERS,
  UNREAD_COUNT,
  ERROR_BOUNDARY_TEXT,
  type MockRole,
} from '../support/mocks'

/**
 * Journey 4 — role dashboards render + notifications polling fallback.
 *
 * For student / instructor / super_admin: seed auth storage (loginAs), open the
 * role's dashboard home, assert the shell renders (sidebar present, role-specific
 * heading, no error boundary / no 'خطأ') and that the notification bell shows the
 * mocked unread count fetched via the REST polling path (realtime stays disabled
 * because VITE_REVERB_APP_KEY is unset — see src/lib/echo.ts).
 */

const ROLE_CASES: {
  role: MockRole
  home: string
  /** Role-specific proof that the actual page (not a blank shell) rendered. */
  assertPage: (page: Page) => Promise<void>
}[] = [
  {
    role: 'student',
    home: '/dashboard/student',
    assertPage: async (page) => {
      // Hero role label from src/pages/Dashboard.tsx
      await expect(page.getByText('بوابة الطالب')).toBeVisible()
    },
  },
  {
    role: 'instructor',
    home: '/dashboard/instructor',
    assertPage: async (page) => {
      // TeacherDashboard hero <h1> greets the user by name
      await expect(
        page.getByRole('heading', { name: new RegExp(String(USERS.instructor.name)) }),
      ).toBeVisible()
    },
  },
  {
    role: 'super_admin',
    home: '/dashboard/super-admin',
    assertPage: async (page) => {
      // SuperAdminOverviewPage <h1>
      await expect(
        page.getByRole('heading', { name: 'لوحة القيادة التنفيذية' }),
      ).toBeVisible()
    },
  },
]

for (const { role, home, assertPage } of ROLE_CASES) {
  test(`${role} dashboard renders with mocked unread notifications`, async ({ page }) => {
    await mockApi(page, { role })
    await loginAs(page, role)

    await page.goto(home)
    await expect(page).toHaveURL(new RegExp(`${home.replace(/\//g, '\\/')}$`))

    // Shell renders: dashboard sidebar nav exists (off-canvas on mobile → attached)
    await expect(
      page.locator('nav[aria-label="قائمة لوحة التحكم"]'),
    ).toBeAttached()

    // Role-specific page content (not a blank screen)
    await assertPage(page)

    // No error boundary, no generic Arabic error text
    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0)
    await expect(page.getByText('حدث خطأ', { exact: true })).toHaveCount(0)

    // Notifications: unread badge fed by the mocked GET /notifications poll
    const bell = page.locator('button[aria-label="الإشعارات"]').first()
    await expect(bell).toBeAttached()
    await expect(bell).toContainText(String(UNREAD_COUNT))
  })
}
