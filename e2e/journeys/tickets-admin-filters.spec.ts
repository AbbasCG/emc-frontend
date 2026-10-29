import { test, expect } from '@playwright/test'
import { mockApi, loginAs } from '../support/mocks'

/**
 * Tech-admin ticket operations center (/dashboard/tickets/admin) — filters.
 *
 * Regression: each filter's onChange used to call its own setter AND
 * setCurrentPage(1). Both wrote the URL from the same stale searchParams
 * snapshot, so the second write erased the first — typed text vanished,
 * the status select snapped back, the "late only" checkbox unticked.
 *
 * GET /v1/tickets is served from FIXTURE_TICKETS and filtered by the same
 * query params the real API receives, so the table reacts like the backend.
 *
 * Explore manually instead of asserting:  PAUSE=1 npx playwright test tickets-admin-filters --project=desktop --headed
 */

const now = Date.now()
const iso = (offsetHours: number) => new Date(now + offsetHours * 3_600_000).toISOString()

const FIXTURE_TICKETS = [
  { id: 1, ticket_number: 'TK-1001', title: 'تعطل بوابة الدفع', status: 'PENDING_APPROVAL', is_delayed: false },
  { id: 2, ticket_number: 'TK-1002', title: 'بطء لوحة الطالب', status: 'IN_PROGRESS', is_delayed: true },
  { id: 3, ticket_number: 'TK-1003', title: 'اقتراح تحسين البحث', status: 'IN_PROGRESS', is_delayed: false },
  { id: 4, ticket_number: 'TK-1004', title: 'خطأ في الشهادات', status: 'RESOLVED', is_delayed: false },
  { id: 5, ticket_number: 'TK-1005', title: 'تعطل البريد الإلكتروني', status: 'ASSIGNED', is_delayed: true },
].map((t) => ({
  ...t,
  ticket_category: t.title.startsWith('اقتراح') ? 'NEW_SUGGESTION' : 'OLD_ISSUE',
  department_id: 1,
  department: { id: 1, name_ar: 'الإدارة التقنية' },
  unit_id: null,
  unit: null,
  assignee: null,
  created_at: iso(-48),
  expected_resolution_time: iso(t.is_delayed ? -2 : 24),
  capabilities: {},
}))

test('search, status and late-only filters stick and combine', async ({ page }) => {
  await mockApi(page, { role: 'super_admin' })
  await loginAs(page, 'super_admin')

  await page.route(
    (url) => url.pathname.endsWith('/api/v1/tickets'),
    (route) => {
      const q = new URL(route.request().url()).searchParams
      const search = q.get('search') ?? ''
      const status = q.get('status') ?? ''
      const overdue = q.get('overdue')
      const rows = FIXTURE_TICKETS.filter(
        (t) =>
          (!search || t.title.includes(search) || t.ticket_number.includes(search)) &&
          (!status || status.split(',').includes(t.status)) &&
          (!overdue || t.is_delayed),
      )
      return route.fulfill({ json: { success: true, data: { data: rows, total: rows.length } } })
    },
  )

  await page.goto('/dashboard/tickets/admin')
  await expect(page.getByRole('heading', { name: 'مركز عمليات التذاكر' })).toBeVisible()
  await expect(page.getByText('5 تذكرة', { exact: true })).toBeVisible()

  if (process.env.PAUSE) await page.pause()

  // Search: text must survive the URL update and narrow the table.
  const search = page.getByRole('searchbox', { name: 'بحث في التذاكر' })
  await search.fill('تعطل')
  await expect(search).toHaveValue('تعطل')
  await expect(page).toHaveURL(/search=/)
  // Identify the rows, not just the count: two different filters can both give "2", which would let a stale screen pass.
  await expect(page.getByRole('button', { name: /فتح التذكرة TK-1001/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /فتح التذكرة TK-1005/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /فتح التذكرة TK-1002/ })).toHaveCount(0)

  // Status (advanced filters): the choice must stick and keep working once the search is cleared.
  await search.fill('')
  // The search box commits to the URL after a short pause; wait for that like a person would see the full list return,
  // so the pending clear cannot land after (and overwrite) the status chosen next.
  await expect(page).not.toHaveURL(/search=/)
  await expect(page.getByRole('button', { name: /فتح التذكرة TK-1002/ })).toBeVisible()
  await page.getByRole('button', { name: 'فلاتر متقدمة' }).click()
  const inProgress = page.getByRole('button', { name: 'قيد المعالجة', exact: true })
  await inProgress.click()
  await expect(page).toHaveURL(/status=IN_PROGRESS/)
  // Wait for the screen itself (not only the URL) to reflect the status before the next click: the filters merge into the
  // query string they were rendered with, so a click made before that re-render would start from a stale one.
  await expect(page.getByRole('button', { name: /فتح التذكرة TK-1003/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /فتح التذكرة TK-1001/ })).toHaveCount(0)

  // Late only (quick filter): must stay applied and combine with the status.
  await page.getByRole('group', { name: 'تصفية سريعة' }).getByRole('button', { name: 'متأخرة' }).click()
  await expect(page).toHaveURL(/status=IN_PROGRESS/)
  await expect(page).toHaveURL(/overdue=1/)
  await expect(page.getByText('1 تذكرة', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /فتح التذكرة TK-1002/ })).toBeVisible()
})
