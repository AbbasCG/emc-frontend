import { test, expect, type Page } from '@playwright/test'
import { mockApi, loginAs } from './support/mocks'

/**
 * Users hub — the analytics and activity tabs, end to end with fixture data (no API needed).
 *
 * Checks what unit tests cannot: that the lazy recharts bundle really renders, that the tabs live under the users page URL,
 * that the period filter drives the requests, and that nothing overflows on a phone. Set USERS_HUB_SHOTS_DIR to also write
 * screenshots (used for design review; off by default).
 */

const DAYS = 30
const END = new Date('2026-11-20T00:00:00Z')

function day(offset: number): string {
  return new Date(END.getTime() - (DAYS - 1 - offset) * 86_400_000).toISOString().slice(0, 10)
}

const series = Array.from({ length: DAYS }, (_, i) => i)

const OVERVIEW = {
  meta: {
    period: { from: day(0), to: day(DAYS - 1), days: DAYS, timezone: 'Europe/Amsterdam' },
    previous_period: { from: '2026-09-22', to: '2026-10-21', days: DAYS, timezone: 'Europe/Amsterdam' },
    generated_at: '2026-11-20T10:00:00+00:00',
    cumulative: ['total_accounts'],
    login_history: { first_event_at: '2026-08-04T09:12:00+00:00', partial: false },
  },
  kpis: {
    total_accounts: { value: 1284, cumulative: true },
    accounts_created: { value: 96, previous: 71, change_pct: 35.2 },
    successful_logins: { value: 2310, previous: 2488, change_pct: -7.2 },
    unique_logged_in_users: { value: 412, previous: 398, change_pct: 3.5 },
    registration_growth_pct: { value: 35.2, previous: null, change_pct: null },
  },
  charts: {
    accounts_growth: series.map((i) => ({ date: day(i), created: 2 + (i % 5), total: 1188 + i * 3 + (i % 4) })),
    login_trend: series.map((i) => ({ date: day(i), events: 50 + ((i * 7) % 40), users: 20 + ((i * 5) % 18) })),
    new_vs_returning: series.map((i) => ({ date: day(i), new: 2 + (i % 4), returning: 16 + ((i * 3) % 14) })),
    by_role: [
      { role: 'student', count: 902 },
      { role: 'volunteer', count: 188 },
      { role: 'instructor', count: 74 },
      { role: 'department_member', count: 61 },
      { role: 'admin', count: 9 },
    ],
    by_status: { active: 1241, inactive: 43, deleted: 17, verified: 1102, unverified: 182 },
    by_country: {
      items: [
        { country: 'YE', count: 512 },
        { country: 'NL', count: 301 },
        { country: 'SA', count: 144 },
        { country: 'EG', count: 63 },
      ],
      other: 71,
      unknown: 193,
      coverage_pct: 85.0,
      self_reported: true,
    },
  },
}

const ACTIVITY = {
  meta: {
    ...OVERVIEW.meta,
    cumulative: ['inactivity', 'never_logged_in'],
    excludes: ['sessions_without_new_login', 'failed_logins'],
  },
  kpis: {
    login_events: { value: 2310, previous: 2488, change_pct: -7.2 },
    unique_logged_in_users: { value: 412, previous: 398, change_pct: 3.5 },
    returning_users: { value: 371, previous: 352, change_pct: 5.4 },
    new_users_logged_in: { value: 41, previous: 46, change_pct: -10.9 },
    users_back_on_another_day: { value: 268, share_pct: 65.0 },
  },
  charts: {
    login_trend: OVERVIEW.charts.login_trend,
    heatmap: {
      weekday_hour: Array.from({ length: 7 }, (_, w) =>
        Array.from({ length: 24 }, (_, h) => (h >= 8 && h <= 22 ? Math.round(6 + 14 * Math.sin(((h - 8) / 14) * Math.PI) + (w < 5 ? 5 : 0)) : h < 3 ? 2 : 0)),
      ),
      weekday_base: 'iso (index 0 = Monday)',
      timezone: 'Europe/Amsterdam',
    },
    return_frequency: [
      { label: '1', users: 144 },
      { label: '2-3', users: 131 },
      { label: '4-7', users: 92 },
      { label: '8+', users: 45 },
    ],
    by_role: [
      { role: 'student', events: 1604, users: 301 },
      { role: 'volunteer', events: 402, users: 68 },
      { role: 'instructor', events: 198, users: 29 },
      { role: 'admin', events: 106, users: 9 },
    ],
  },
  inactivity: [
    { days: 30, users: 388 },
    { days: 60, users: 241 },
    { days: 90, users: 154 },
  ],
  never_logged_in: 96,
}

const LAST_LOGINS = {
  data: [
    { id: 11, name: 'ليلى الحداد', role: 'student', is_active: true, last_login_at: '2026-11-20T09:41:00+00:00' },
    { id: 12, name: 'يوسف المقطري', role: 'volunteer', is_active: true, last_login_at: '2026-11-20T08:02:00+00:00' },
    { id: 13, name: 'سارة العمري', role: 'instructor', is_active: true, last_login_at: '2026-11-19T21:15:00+00:00' },
    { id: 14, name: 'أحمد باوزير', role: 'student', is_active: false, last_login_at: '2026-11-19T18:30:00+00:00' },
  ],
  meta: { total: 412, current_page: 1, last_page: 42, per_page: 10 },
}

async function mockAnalytics(page: Page, requests: string[]): Promise<void> {
  await page.route('**/admin/users-analytics/**', async (route) => {
    const url = new URL(route.request().url())
    requests.push(`${url.pathname.split('/').pop()}?${url.searchParams.toString()}`)
    const name = url.pathname.split('/').pop()
    const body =
      name === 'overview' ? { success: true, data: OVERVIEW }
      : name === 'activity' ? { success: true, data: ACTIVITY }
      : { success: true, ...LAST_LOGINS }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
}

async function shot(page: Page, name: string): Promise<void> {
  const dir = process.env.USERS_HUB_SHOTS_DIR
  if (!dir) return
  const decline = page.getByRole('button', { name: 'رفض غير الضرورية' })
  if (await decline.isVisible().catch(() => false)) await decline.click() // the cookie banner is not part of the design under review
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
}

async function open(page: Page, tab: string, requests: string[]): Promise<void> {
  await mockApi(page)
  await mockAnalytics(page, requests)
  await loginAs(page, 'super_admin')
  await page.goto(`/dashboard/super-admin/crud/users?tab=${tab}`)
}

test.describe('analytics tab', () => {
  test('renders the figures, the lazy charts and the data notes', async ({ page }) => {
    const requests: string[] = []
    await open(page, 'analytics', requests)

    await expect(page.getByRole('tab', { name: 'التحليلات' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('إجمالي الحسابات', { exact: true })).toBeVisible()
    await expect(page.getByText('1,284')).toBeVisible()
    await expect(page.getByText('تراكمي · لا يتأثر بالفترة')).toBeVisible()
    await expect(page.getByText('المستخدمون الذين سجلوا الدخول').first()).toBeVisible()
    await expect(page.getByText('لا تشمل الجلسات المستمرة دون تسجيل دخول جديد', { exact: false })).toBeVisible()
    await expect(page.locator('.recharts-surface').first()).toBeVisible() // the lazy chart bundle loaded and drew

    // only this tab's data was requested
    expect(requests.every((r) => r.startsWith('overview?'))).toBe(true)
    await shot(page, `analytics-${test.info().project.name}`)
  })

  test('the period filter drives the request and the URL', async ({ page }) => {
    const requests: string[] = []
    await open(page, 'analytics', requests)
    await expect(page.getByText('1,284')).toBeVisible()

    await page.getByRole('button', { name: 'آخر 7 أيام' }).click()

    await expect.poll(() => requests.some((r) => r.startsWith('overview?') && r.includes('compare=1') && !r.includes('from=2026-10'))).toBe(true)
    await expect(page).toHaveURL(/range=7d/)
    await expect(page).toHaveURL(/tab=analytics/)

    await page.getByRole('switch', { name: 'مقارنة بالفترة السابقة' }).click()
    await expect.poll(() => requests.at(-1)).toContain('compare=0')
    await expect(page).toHaveURL(/cmp=0/)
  })

  test('a tooltip explains a metric and the page does not scroll sideways', async ({ page }) => {
    await open(page, 'analytics', [])
    await page.getByRole('button', { name: 'ما معنى المستخدمون الذين سجلوا الدخول' }).first().focus()
    await expect(page.getByRole('tooltip')).toContainText('ليس «المستخدمين النشطين»')

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})

test.describe('activity tab', () => {
  test('renders the heatmap, inactivity buckets and the last logins', async ({ page }) => {
    const requests: string[] = []
    await open(page, 'activity', requests)

    await expect(page.getByRole('tab', { name: 'النشاط' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('إجمالي أحداث الدخول')).toBeVisible()
    await expect(page.getByRole('table', { name: /تسجيلات الدخول حسب اليوم والساعة/ })).toBeVisible()
    await expect(page.getByText('بلا دخول منذ أكثر من 90 يومًا')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'ليلى الحداد' }).or(page.getByRole('rowheader', { name: 'ليلى الحداد' }))).toBeVisible()
    await expect(page.locator('.recharts-surface').first()).toBeVisible() // the lazy chart bundle loaded and drew

    // the tab never asks for the analytics tab's endpoint
    expect(requests.some((r) => r.startsWith('overview?'))).toBe(false)
    await shot(page, `activity-${test.info().project.name}`)
  })

  test('switching tabs keeps the chosen period', async ({ page }) => {
    const requests: string[] = []
    await open(page, 'activity', requests)
    await page.getByRole('button', { name: 'آخر 90 يومًا' }).click()
    await expect(page).toHaveURL(/range=90d/)

    await page.getByRole('tab', { name: 'التحليلات' }).click()

    await expect(page).toHaveURL(/tab=analytics/)
    await expect(page).toHaveURL(/range=90d/)
    await expect(page.getByRole('button', { name: 'آخر 90 يومًا' })).toHaveAttribute('aria-pressed', 'true')
  })
})
