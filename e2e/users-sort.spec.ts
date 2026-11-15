import { test, expect, type Page, type Route } from '@playwright/test'
import { mockApi, loginAs } from './support/mocks'

/**
 * Users management — sort buttons (تاريخ الإنشاء / آخر دخول).
 *
 * The server paginates but does not sort, so the frontend must fetch every page and
 * sort the whole list. The mock below serves 30 users in id order, 15 per page by
 * default, with dates deliberately out of id order and some users who never logged in.
 */

const SHOT_DIR = process.env.SORT_SHOT_DIR ?? 'test-results/users-sort'

type MockUser = {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  email_verified_at: string
  created_at: string
  last_login_at: string | null
}

// Deterministic scramble: created_at day = (id * 7) % 30, last login missing for every 4th user.
const USERS: MockUser[] = Array.from({ length: 30 }, (_, i) => {
  const id = i + 1
  const createdDay = ((id * 7) % 30) + 1
  const loginDay = ((id * 11) % 28) + 1
  return {
    id,
    name: `مستخدم ${String(id).padStart(2, '0')}`,
    email: `user${id}@emc.test`,
    role: 'student',
    is_active: true,
    email_verified_at: '2025-01-01T00:00:00Z',
    created_at: `2025-06-${String(createdDay).padStart(2, '0')}T10:00:00Z`,
    last_login_at: id % 4 === 0 ? null : `2026-10-${String(loginDay).padStart(2, '0')}T09:00:00Z`,
  }
})

const newestCreated = [...USERS].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
const oldestCreated = [...USERS].sort((a, b) => a.created_at.localeCompare(b.created_at))[0]
const latestLogin = [...USERS]
  .filter((u) => u.last_login_at)
  .sort((a, b) => b.last_login_at!.localeCompare(a.last_login_at!))[0]

async function mockPaginatedUsers(page: Page): Promise<void> {
  const handler = (route: Route) => {
    const url = new URL(route.request().url())
    if (route.request().method() === 'OPTIONS') return route.fallback()
    const perPage = Number(url.searchParams.get('per_page') ?? 15)
    const current = Number(url.searchParams.get('page') ?? 1)
    const lastPage = Math.ceil(USERS.length / perPage)
    const data = USERS.slice((current - 1) * perPage, current * perPage)
    return route.fulfill({
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:4173',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data,
        meta: { total: USERS.length, current_page: current, per_page: perPage, last_page: lastPage },
      }),
    })
  }
  await page.route((u) => u.pathname.endsWith('/api/admin/users'), handler)
}

test('sort buttons order users by creation date and last login across all pages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockApi(page)
  await mockPaginatedUsers(page)
  await loginAs(page, 'super_admin')
  await page.goto('/dashboard/super-admin/crud/users')

  const rows = page.locator('main tbody tr')
  await expect(rows.first()).toContainText('مستخدم 01')
  // Cookie banner overlaps the table — dismiss it so screenshots show the rows.
  const acceptCookies = page.getByRole('button', { name: 'قبول الكل' })
  if (await acceptCookies.isVisible()) await acceptCookies.click()
  await page.screenshot({ path: `${SHOT_DIR}/1-default.png`, fullPage: true })

  const createdBtn = page.getByRole('button', { name: 'تاريخ الإنشاء' })
  const loginBtn = page.getByRole('button', { name: 'آخر دخول' })

  // تاريخ الإنشاء — newest first (the newest user lives on page 2 of the server data).
  await createdBtn.click()
  await expect(createdBtn).toHaveAttribute('aria-pressed', 'true')
  await expect(rows.first()).toContainText(newestCreated.name)
  await page.screenshot({ path: `${SHOT_DIR}/2-created-desc.png`, fullPage: true })

  // Second click flips to oldest first.
  await createdBtn.click()
  await expect(rows.first()).toContainText(oldestCreated.name)
  await page.screenshot({ path: `${SHOT_DIR}/3-created-asc.png`, fullPage: true })

  // آخر دخول — most recent login first; never-logged-in users go last.
  await loginBtn.click()
  await expect(loginBtn).toHaveAttribute('aria-pressed', 'true')
  await expect(createdBtn).toHaveAttribute('aria-pressed', 'false')
  await expect(rows.first()).toContainText(latestLogin.name)
  await page.screenshot({ path: `${SHOT_DIR}/4-login-desc.png`, fullPage: true })

  // Never-logged-in users (every 4th id) must sit at the very end: check the last page.
  await page.getByRole('button', { name: '2', exact: true }).click()
  // 22 users have a login, 8 don't (ids 4, 8 … 28, tie-broken by id) → user 28 is last overall.
  await expect(rows.last()).toContainText('مستخدم 28')
  await page.screenshot({ path: `${SHOT_DIR}/5-login-desc-page2.png`, fullPage: true })
})
