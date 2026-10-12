import { test, expect } from '@playwright/test'
import { mockApi, loginAs } from '../support/mocks'

/**
 * Tech-admin ticket command center (/dashboard/tickets/admin) — filters.
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
      const delayed = q.get('delayed_only')
      const rows = FIXTURE_TICKETS.filter(
        (t) =>
          (!search || t.title.includes(search) || t.ticket_number.includes(search)) &&
          (!status || t.status === status) &&
          (!delayed || t.is_delayed),
      )
      return route.fulfill({ json: { success: true, data: { data: rows, total: rows.length } } })
    },
  )

  await page.goto('/dashboard/tickets/admin')
  await expect(page.getByText('مركز قيادة التذاكر والـ SLA')).toBeVisible()
  await expect(page.getByText('إجمالي: 5 تذكرة')).toBeVisible()

  if (process.env.PAUSE) await page.pause()

  // Search: text must survive the URL update and narrow the table.
  const search = page.getByPlaceholder('بحث بالرقم، العنوان، أو اسم المُدخل...')
  await search.fill('تعطل')
  await expect(search).toHaveValue('تعطل')
  await expect(page).toHaveURL(/search=/)
  await expect(page.getByText('إجمالي: 2 تذكرة')).toBeVisible()

  // Status: selection must stick and keep the search.
  await search.fill('')
  const status = page.locator('select')
  await status.selectOption('IN_PROGRESS')
  await expect(status).toHaveValue('IN_PROGRESS')
  await expect(page.getByText('إجمالي: 2 تذكرة')).toBeVisible()

  // Late only: checkbox must stay ticked and combine with status. A plain click,
  // not check(): the box is URL-driven, so it ticks a tick after the click and
  // check()'s immediate state assertion would misfire.
  const lateOnly = page.getByRole('checkbox')
  await lateOnly.click()
  await expect(lateOnly).toBeChecked()
  await expect(page).toHaveURL(/status=IN_PROGRESS/)
  await expect(page).toHaveURL(/delayed=1/)
  await expect(page.getByText('إجمالي: 1 تذكرة')).toBeVisible()
  await expect(page.getByText('TK-1002')).toBeVisible()
})
