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

const ACQUISITION = {
  meta: {
    period: OVERVIEW.meta.period,
    previous_period: OVERVIEW.meta.previous_period,
    generated_at: '2026-11-20T10:00:00+00:00',
  },
  self_reported: {
    total_accounts_created: 240,
    items: [
      { source: 'instagram', count: 80, previous: 50, change_pct: 60.0 },
      { source: 'google', count: 45, previous: 60, change_pct: -25.0 },
      { source: 'صديق', count: 30, previous: 0, change_pct: null },
      { source: 'newsletter', count: 18, previous: 20, change_pct: -10.0 },
      { source: 'tiktok', count: 12, previous: 9, change_pct: 33.3 },
    ],
    other: 25,
    unknown: 60,
    coverage_pct: 75.0,
    daily: [
      { source: 'instagram', series: series.map((i) => ({ date: day(i), count: 3 + Math.round(2 * Math.sin(i / 4)) })) },
      { source: 'google', series: series.map((i) => ({ date: day(i), count: 2 + Math.round(Math.cos(i / 5)) })) },
      { source: 'صديق', series: series.map((i) => ({ date: day(i), count: 1 + (i % 9 < 4 ? 1 : 0) })) },
      { source: 'newsletter', series: series.map((i) => ({ date: day(i), count: i % 10 < 5 ? 1 : 0 })) },
      { source: 'tiktok', series: series.map((i) => ({ date: day(i), count: i % 11 === 0 ? 2 : 0 })) },
    ],
    free_text: true,
  },
  utm_visits: {
    unit: 'visits',
    consent_gated: true,
    linked_to_accounts: false,
    total_pageviews: 5200,
    with_utm: 640,
    by_source: [
      { name: 'newsletter', visits: 300, visitors: 210 },
      { name: 'instagram', visits: 220, visitors: 170 },
      { name: 'tiktok', visits: 120, visitors: 95 },
    ],
    by_medium: [
      { name: 'email', visits: 300, visitors: 210 },
      { name: 'social', visits: 340, visitors: 265 },
    ],
    by_campaign: [
      { name: 'ramadan-2026', visits: 410, visitors: 330 },
      { name: 'open-day', visits: 230, visitors: 180 },
    ],
  },
  unavailable: {
    referral_codes: { available: false, reason: 'لا يوجد حقل لرمز الإحالة عند التسجيل، فلا يمكن نسب الحسابات إلى مُحيل.' },
    direct_registration: { available: false, reason: 'لا نميّز التسجيل المباشر عن غيره، فغياب المصدر لا يعني أن الشخص جاء مباشرة.' },
    conversion_rate: { available: false, reason: 'لا يمكن حسابه لأن زيارات الحملات لا ترتبط بالحسابات المنشأة.' },
    utm_to_account: { available: false, reason: 'لا تُحفظ معاملات الحملة مع الحساب عند إنشائه.' },
  },
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

async function mockAnalytics(page: Page, requests: string[], acquisition: unknown = ACQUISITION): Promise<void> {
  await page.route('**/admin/users-analytics/**', async (route) => {
    const url = new URL(route.request().url())
    requests.push(`${url.pathname.split('/').pop()}?${url.searchParams.toString()}`)
    const name = url.pathname.split('/').pop()
    const body =
      name === 'overview' ? { success: true, data: OVERVIEW }
      : name === 'activity' ? { success: true, data: ACTIVITY }
      : name === 'acquisition' ? { success: true, data: acquisition }
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

async function open(page: Page, tab: string, requests: string[], acquisition: unknown = ACQUISITION): Promise<void> {
  await mockApi(page)
  await mockAnalytics(page, requests, acquisition)
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

test.describe('acquisition tab', () => {
  test('renders the figures, the lazy multi-line chart, the visits note and the unavailable panel', async ({ page }) => {
    const requests: string[] = []
    await open(page, 'acquisition', requests)

    await expect(page.getByRole('tab', { name: 'الاستقطاب' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('حسابات أُنشئت في الفترة', { exact: true })).toBeVisible()
    await expect(page.getByRole('group', { name: 'حسابات أُنشئت في الفترة' }).getByText('240', { exact: true })).toBeVisible()
    await expect(page.getByRole('group', { name: 'صرّحوا بمصدر' }).getByText('75.0% من الحسابات')).toBeVisible()

    const sources = page.getByRole('region', { name: 'مصادر التسجيل المعلنة' })
    await expect(sources.getByText('instagram')).toBeVisible()
    await expect(sources.getByRole('listitem').filter({ hasText: 'غير محدد' })).toBeVisible()
    await expect(sources.getByText('+60.0%')).toBeVisible()

    const chart = page.getByRole('region', { name: 'التسجيلات اليومية حسب المصدر المعلن' })
    await expect(chart.locator('.recharts-surface').first()).toBeVisible() // the lazy chart bundle loaded and drew
    await expect(chart.locator('.recharts-line')).toHaveCount(5)

    await expect(page.getByText('هذه زيارات لصفحات وليست تسجيلات', { exact: false })).toBeVisible()
    const unavailable = page.getByRole('region', { name: 'غير متاح حاليًا' })
    await expect(unavailable.getByText('معدل التحويل')).toBeVisible()
    await expect(unavailable.getByText('غير متاح', { exact: true })).toHaveCount(4)

    // only this tab's data was requested
    expect(requests.length).toBeGreaterThan(0)
    expect(requests.every((r) => r.startsWith('acquisition?'))).toBe(true)
    await shot(page, `acquisition-${test.info().project.name}`)
  })

  test('the period filter drives the request and the URL, and the page does not scroll sideways', async ({ page }) => {
    const requests: string[] = []
    await open(page, 'acquisition', requests)
    await expect(page.getByRole('group', { name: 'حسابات أُنشئت في الفترة' }).getByText('240', { exact: true })).toBeVisible()

    await page.getByRole('switch', { name: 'مقارنة بالفترة السابقة' }).click()
    await expect.poll(() => requests.at(-1)).toContain('compare=0')
    await expect(page).toHaveURL(/cmp=0/)
    await expect(page).toHaveURL(/tab=acquisition/)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    expect(requests.every((r) => r.startsWith('acquisition?'))).toBe(true)
  })
})

/* ── layout guards: the page must not only avoid a horizontal scrollbar, every panel and popover must stay on screen ── */

const LONG_SENTENCE = 'سمعت عنكم من صديق قديم كان يدرس في الدورات السابقة وأخبرني عن المنصة في اجتماع عائلي'
const LONG_URL = 'https://www.example-referrer.com/some/very/long/path/with/query?utm_source=a&utm_medium=b&utm_campaign=c'
const LONG_WORD = 'abcdefghijklmnopqrstuvwxyzabcd'
const HOSTILE_NAMES = [LONG_SENTENCE, LONG_URL, LONG_WORD]

const HOSTILE_ACQUISITION = {
  ...ACQUISITION,
  self_reported: {
    ...ACQUISITION.self_reported,
    items: HOSTILE_NAMES.map((source, i) => ({ source, count: 80 - i * 20, previous: 50, change_pct: 60.0 })),
    daily: HOSTILE_NAMES.map((source, k) => ({ source, series: series.map((i) => ({ date: day(i), count: 1 + ((i + k) % 4) })) })),
  },
  utm_visits: {
    ...ACQUISITION.utm_visits,
    by_source: HOSTILE_NAMES.map((name, i) => ({ name, visits: 300 - i * 50, visitors: 200 })),
    by_medium: HOSTILE_NAMES.map((name, i) => ({ name, visits: 300 - i * 50, visitors: 200 })),
    by_campaign: HOSTILE_NAMES.map((name, i) => ({ name, visits: 300 - i * 50, visitors: 200 })),
  },
}

async function expectPanelsOnScreen(page: Page): Promise<void> {
  const problems = await page.evaluate(() => {
    const width = window.innerWidth
    const out: string[] = []
    for (const el of Array.from(document.querySelectorAll('[id^="users-hub-panel-"] section[aria-label], [id^="users-hub-panel-"] [role="group"][aria-label], [id^="users-hub-panel-"] .recharts-surface'))) {
      const r = el.getBoundingClientRect()
      if (r.width === 0) continue
      if (r.left < -0.5 || r.right > width + 0.5) out.push(`${el.getAttribute('aria-label') ?? el.className}: left=${Math.round(r.left)} right=${Math.round(r.right)} (viewport ${width})`)
    }
    if (document.documentElement.scrollWidth - width > 1) out.push(`page scrolls sideways by ${document.documentElement.scrollWidth - width}px`)
    return out
  })
  expect(problems).toEqual([])
}

async function dateLabelOverlaps(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    // recharts draws tick labels (both axes) in one layer per chart; the x labels are the row lowest on the chart
    const out: string[] = []
    const surfaces = document.querySelectorAll('.recharts-surface')
    if (surfaces.length === 0) out.push('no chart found: the check would pass vacuously')
    surfaces.forEach((surface, n) => {
      const boxes = Array.from(surface.querySelectorAll('.recharts-cartesian-axis-tick-value')).map((t) => t.getBoundingClientRect())
      const lowest = Math.max(...boxes.map((b) => b.top))
      const labels = boxes.filter((b) => Math.abs(b.top - lowest) < 3).sort((a, b) => a.left - b.left)
      if (labels.length < 2) out.push(`chart ${n}: fewer than two date labels measured`)
      for (let i = 1; i < labels.length; i++) {
        const gap = labels[i].left - labels[i - 1].right
        if (gap < 4) out.push(`chart ${n}: date labels ${i - 1} and ${i} are ${Math.round(gap)}px apart`)
      }
    })
    return out
  })
}

test.describe('layout on a phone', () => {
  test('long free-text sources (sentence, URL, unbroken word) stay inside their panels and the screen', async ({ page }) => {
    await open(page, 'acquisition', [], HOSTILE_ACQUISITION)
    const sources = page.getByRole('region', { name: 'مصادر التسجيل المعلنة' })
    await expect(sources.getByRole('listitem').first()).toBeVisible()
    await expect(page.locator('.recharts-surface').first()).toBeVisible()

    await expectPanelsOnScreen(page)

    // cut short, with the full text available on hover
    const first = sources.getByRole('listitem').first().locator('span').first()
    await expect(first).toHaveAttribute('title', LONG_SENTENCE)
    await shot(page, `acquisition-hostile-${test.info().project.name}`)
  })

  for (const [tab, ready] of [
    ['analytics', (p: Page) => p.getByText('1,284')],
    ['activity', (p: Page) => p.getByText('إجمالي أحداث الدخول')],
    ['acquisition', (p: Page) => p.getByRole('group', { name: 'حسابات أُنشئت في الفترة' })],
  ] as const) {
    test(`every info popover on the ${tab} tab opens inside the screen`, async ({ page }) => {
      await open(page, tab, [])
      await expect(ready(page)).toBeVisible()
      const buttons = page.getByRole('button', { name: /^ما معنى/ })
      const count = await buttons.count()
      expect(count).toBeGreaterThan(3)

      for (let i = 0; i < count; i++) {
        await buttons.nth(i).scrollIntoViewIfNeeded() // the page scrolls smoothly: settle before measuring
        await buttons.nth(i).focus()
        const tip = page.getByRole('tooltip')
        await expect(tip).toBeVisible()
        const box = await tip.boundingBox()
        const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
        expect(box, `tooltip ${i}`).not.toBeNull()
        expect(box!.x, `tooltip ${i} left`).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width, `tooltip ${i} right`).toBeLessThanOrEqual(viewport.width)
        expect(box!.y, `tooltip ${i} top`).toBeGreaterThanOrEqual(0)
        expect(box!.y + box!.height, `tooltip ${i} bottom`).toBeLessThanOrEqual(viewport.height)
      }
    })

    test(`the ${tab} tab's panels and charts stay on screen, and its date labels never overlap`, async ({ page }) => {
      await open(page, tab, [])
      await expect(ready(page)).toBeVisible()
      await expect(page.locator('.recharts-surface').first()).toBeVisible()

      await expectPanelsOnScreen(page)

      const overlaps = await dateLabelOverlaps(page)
      expect(overlaps).toEqual([])
    })
  }
})

test.describe('layout at the narrowest desktop width (1024px, charts in half-width panels)', () => {
  test.skip(({ isMobile }) => isMobile, 'the phone project is covered above')

  for (const [tab, ready] of [
    ['analytics', (p: Page) => p.getByText('1,284')],
    ['activity', (p: Page) => p.getByText('إجمالي أحداث الدخول')],
    ['acquisition', (p: Page) => p.getByRole('group', { name: 'حسابات أُنشئت في الفترة' })],
  ] as const) {
    test(`the ${tab} tab's date labels never overlap`, async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 800 })
      await open(page, tab, [])
      await expect(ready(page)).toBeVisible()
      await expect(page.locator('.recharts-surface').first()).toBeVisible()

      expect(await dateLabelOverlaps(page)).toEqual([])
      await expectPanelsOnScreen(page)
    })
  }
})
