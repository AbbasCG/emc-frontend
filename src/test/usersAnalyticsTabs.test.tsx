import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { AxiosError } from 'axios'
import { axe } from 'vitest-axe'
import type { ActivityData, OverviewData } from '@/api/usersAnalyticsApi'

const api = vi.hoisted(() => ({
  fetchUsersOverview: vi.fn(),
  fetchUsersActivity: vi.fn(),
  fetchLastLogins: vi.fn(),
}))
vi.mock('@/api/usersAnalyticsApi', () => api)

const charts = vi.hoisted(() => ({ drawn: [] as string[] }))
// recharts needs a real layout engine; the lazy wrapper is replaced by a marker that records what would be drawn
vi.mock('@/pages/super-admin/users/hub/analytics/LazyTimeSeries', () => ({
  LazyTimeSeries: (p: { kind: string; data: unknown[] }) => {
    charts.drawn.push(p.kind)
    return <div data-testid={`chart-${p.kind}`} data-points={p.data.length} />
  },
}))

import AnalyticsTab from '@/pages/super-admin/users/hub/tabs/AnalyticsTab'
import ActivityTab from '@/pages/super-admin/users/hub/tabs/ActivityTab'

const PERIOD = { from: '2026-10-22', to: '2026-11-20', days: 30, timezone: 'Europe/Amsterdam' }
const kpi = (value: number, previous: number | null, change: number | null) => ({ value, previous, change_pct: change })
const days = ['2026-11-18', '2026-11-19', '2026-11-20']

function overview(over: Partial<OverviewData['charts']> = {}, meta: Partial<OverviewData['meta']> = {}): OverviewData {
  return {
    meta: {
      period: PERIOD,
      previous_period: { ...PERIOD, from: '2026-09-22', to: '2026-10-21' },
      generated_at: '2026-11-20T10:00:00+00:00',
      cumulative: ['total_accounts'],
      login_history: { first_event_at: '2026-08-04T09:12:00+00:00', partial: false },
      ...meta,
    },
    kpis: {
      total_accounts: { value: 1284, cumulative: true },
      accounts_created: kpi(96, 71, 35.2),
      successful_logins: kpi(2310, 2488, -7.2),
      unique_logged_in_users: kpi(412, 398, 3.5),
      registration_growth_pct: { value: 35.2, previous: null, change_pct: null },
    },
    charts: {
      accounts_growth: days.map((d, i) => ({ date: d, created: 1, total: 1280 + i })),
      login_trend: days.map((d) => ({ date: d, events: 10, users: 6 })),
      new_vs_returning: days.map((d) => ({ date: d, new: 2, returning: 4 })),
      by_role: [
        { role: 'student', count: 902 },
        { role: 'instructor', count: 74 },
      ],
      by_status: { active: 1241, inactive: 43, deleted: 17, verified: 1102, unverified: 182 },
      by_country: { items: [{ country: 'YE', count: 512 }], other: 10, unknown: 193, coverage_pct: 85, self_reported: true },
      ...over,
    },
  }
}

const matrix = Array.from({ length: 7 }, (_, w) => Array.from({ length: 24 }, (_, h) => (h === 10 ? w + 1 : 0)))

function activity(meta: Partial<ActivityData['meta']> = {}): ActivityData {
  return {
    meta: {
      period: PERIOD,
      previous_period: null,
      generated_at: '2026-11-20T10:00:00+00:00',
      cumulative: ['inactivity', 'never_logged_in'],
      excludes: ['sessions_without_new_login', 'failed_logins'],
      login_history: { first_event_at: '2026-08-04T09:12:00+00:00', partial: false },
      ...meta,
    },
    kpis: {
      login_events: kpi(2310, null, null),
      unique_logged_in_users: kpi(412, null, null),
      returning_users: kpi(371, null, null),
      new_users_logged_in: kpi(41, null, null),
      users_back_on_another_day: { value: 268, share_pct: 65 },
    },
    charts: {
      login_trend: days.map((d) => ({ date: d, events: 10, users: 6 })),
      heatmap: { weekday_hour: matrix, weekday_base: 'iso (index 0 = Monday)', timezone: 'Europe/Amsterdam' },
      return_frequency: [
        { label: '1', users: 144 },
        { label: '2-3', users: 131 },
        { label: '4-7', users: 92 },
        { label: '8+', users: 45 },
      ],
      by_role: [{ role: 'student', events: 1604, users: 301 }],
    },
    inactivity: [
      { days: 30, users: 388 },
      { days: 60, users: 241 },
      { days: 90, users: 154 },
    ],
    never_logged_in: 96,
  }
}

const lastLogins = (page = 1) => ({
  rows: [{ id: page, name: `مستخدم ${page}`, role: 'student', is_active: true, last_login_at: '2026-11-19T22:30:00+00:00' }],
  total: 25,
  page,
  lastPage: 3,
  perPage: 10,
})

function Url() {
  const l = useLocation()
  return <output data-testid="url">{`${l.pathname}${l.search}`}</output>
}

function renderTab(ui: React.ReactElement, initial = '/dashboard/super-admin/crud/users?tab=analytics') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Url />
      {ui}
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-20T12:00:00Z'))
  Object.values(api).forEach((m) => m.mockReset())
  charts.drawn.length = 0
  api.fetchUsersOverview.mockResolvedValue(overview())
  api.fetchUsersActivity.mockResolvedValue(activity())
  api.fetchLastLogins.mockImplementation(async (page: number) => lastLogins(page))
})

afterEach(() => vi.useRealTimers())

const lastCall = (m: ReturnType<typeof vi.fn>) => m.mock.calls.at(-1)![0]

describe('analytics tab', () => {
  it('requests the last 30 days with the comparison, and only its own endpoint', async () => {
    renderTab(<AnalyticsTab />)

    await screen.findByText('1,284')

    expect(api.fetchUsersOverview).toHaveBeenCalledTimes(1)
    expect(lastCall(api.fetchUsersOverview)).toEqual({ from: '2026-10-22', to: '2026-11-20', compare: true })
    expect(api.fetchUsersActivity).not.toHaveBeenCalled()
    expect(api.fetchLastLogins).not.toHaveBeenCalled()
  })

  it('shows the KPIs, marks the cumulative one, and calls the login metric «users who logged in», never «active»', async () => {
    renderTab(<AnalyticsTab />)

    await screen.findByText('1,284')
    expect(screen.getByText('تراكمي · لا يتأثر بالفترة')).toBeInTheDocument()
    expect(screen.getByText('96')).toBeInTheDocument()
    expect(screen.getByText('2,310')).toBeInTheDocument()
    expect(screen.getByText('412')).toBeInTheDocument()
    expect(screen.getAllByText('المستخدمون الذين سجلوا الدخول').length).toBeGreaterThan(0)
    expect(screen.queryByText('المستخدمون النشطون')).toBeNull()
    expect(screen.queryByText('مستخدمون نشطون')).toBeNull()
    expect(screen.getAllByText('+35.2%').length).toBe(2) // «accounts created» change and the growth card
  })

  it('shows the change against the previous period with the previous value', async () => {
    renderTab(<AnalyticsTab />)

    await screen.findByText('1,284')

    expect(screen.getByText('-7.2%')).toBeInTheDocument()
    expect(screen.getByText('(2,488)', { exact: false })).toBeInTheDocument()
    expect(screen.getAllByText('عن الفترة السابقة', { exact: false }).length).toBeGreaterThan(0)
  })

  it('states what the login numbers cover, and says so when history is partial', async () => {
    api.fetchUsersOverview.mockResolvedValue(overview({}, { login_history: { first_event_at: '2026-11-01T08:00:00+00:00', partial: true } }))
    renderTab(<AnalyticsTab />)

    await screen.findByText('1,284')

    expect(screen.getByText(/لا تشمل الجلسات المستمرة دون تسجيل دخول جديد/)).toBeInTheDocument()
    expect(screen.getByText(/التغطية التاريخية جزئية/)).toBeInTheDocument()
    expect(screen.getByText(/1 نوفمبر 2026/)).toBeInTheDocument()
  })

  it('says there are no login events at all when none was ever recorded', async () => {
    api.fetchUsersOverview.mockResolvedValue(overview({}, { login_history: { first_event_at: null, partial: true } }))
    renderTab(<AnalyticsTab />)

    await screen.findByText('1,284')

    expect(screen.getByText(/لم يُسجَّل أي حدث دخول بعد/)).toBeInTheDocument()
  })

  it('draws the time charts from the response (lazy chart wrapper) and lists roles and countries by Arabic name', async () => {
    renderTab(<AnalyticsTab />)

    await screen.findByText('1,284')

    expect(charts.drawn).toEqual(expect.arrayContaining(['growth', 'logins', 'newVsReturning']))
    expect(screen.getByTestId('chart-growth')).toHaveAttribute('data-points', '3')
    expect(screen.getByText('طالب')).toBeInTheDocument()
    expect(screen.getByText('اليمن')).toBeInTheDocument()
    expect(screen.getByText('غير محدد')).toBeInTheDocument() // the unknown-country bucket is shown, not hidden
    expect(screen.getByText(/معلن ذاتيًا/)).toBeInTheDocument()
  })

  it('shows empty states instead of empty charts when there are no logins', async () => {
    api.fetchUsersOverview.mockResolvedValue(
      overview({ login_trend: days.map((d) => ({ date: d, events: 0, users: 0 })), new_vs_returning: days.map((d) => ({ date: d, new: 0, returning: 0 })) }),
    )
    renderTab(<AnalyticsTab />)

    await screen.findByText('1,284')

    expect(screen.queryByTestId('chart-logins')).toBeNull()
    expect(screen.queryByTestId('chart-newVsReturning')).toBeNull()
    expect(screen.getAllByText('لا توجد تسجيلات دخول في هذه الفترة').length).toBe(2)
  })

  it('shows a loading region (and no numbers) before the first response', async () => {
    api.fetchUsersOverview.mockReturnValue(new Promise(() => {}))
    renderTab(<AnalyticsTab />)

    expect(screen.getByText('جارٍ تحميل البيانات').closest('[role="status"]')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('1,284')).toBeNull()
  })

  it('explains a failure and retries on request', async () => {
    api.fetchUsersOverview.mockRejectedValueOnce(new Error('network down')).mockResolvedValue(overview())
    renderTab(<AnalyticsTab />)

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('تعذّر تحميل البيانات')).toBeInTheDocument()

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))

    await screen.findByText('1,284')
    expect(api.fetchUsersOverview).toHaveBeenCalledTimes(2)
  })

  it('says so on a 403 and offers no retry (it cannot help)', async () => {
    const err = new AxiosError('forbidden', 'ERR_BAD_REQUEST', undefined, undefined, { status: 403, data: {}, statusText: 'Forbidden', headers: {}, config: {} as never })
    api.fetchUsersOverview.mockRejectedValue(err)
    renderTab(<AnalyticsTab />)

    const alert = await screen.findByRole('alert')

    expect(within(alert).getByText('لا تملك صلاحية عرض هذا القسم')).toBeInTheDocument()
    expect(within(alert).queryByRole('button', { name: 'إعادة المحاولة' })).toBeNull()
  })

  it('a preset refetches with the new window, keeps the tab in the URL and keeps the old data dimmed meanwhile', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderTab(<AnalyticsTab />)
    await screen.findByText('1,284')

    let resolveNext: (v: OverviewData) => void = () => {}
    api.fetchUsersOverview.mockReturnValue(new Promise<OverviewData>((r) => (resolveNext = r)))
    await user.click(screen.getByRole('button', { name: 'آخر 7 أيام' }))

    expect(lastCall(api.fetchUsersOverview)).toEqual({ from: '2026-11-14', to: '2026-11-20', compare: true })
    expect(screen.getByTestId('url').textContent).toContain('range=7d')
    expect(screen.getByTestId('url').textContent).toContain('tab=analytics')
    expect(screen.getByText('1,284')).toBeInTheDocument() // previous data still shown…
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull() // …while loading

    resolveNext(overview())
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
  })

  it('yesterday is the previous Amsterdam day', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderTab(<AnalyticsTab />)
    await screen.findByText('1,284')

    await user.click(screen.getByRole('button', { name: 'أمس' }))

    expect(lastCall(api.fetchUsersOverview)).toEqual({ from: '2026-11-19', to: '2026-11-19', compare: true })
  })

  it('the comparison switch drives compare=, hides the deltas and is kept in the URL', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderTab(<AnalyticsTab />)
    await screen.findByText('1,284')

    api.fetchUsersOverview.mockResolvedValue({ ...overview(), kpis: { ...overview().kpis, successful_logins: kpi(2310, null, null), accounts_created: kpi(96, null, null), unique_logged_in_users: kpi(412, null, null), registration_growth_pct: { value: null, previous: null, change_pct: null } } })
    await user.click(screen.getByRole('switch', { name: 'مقارنة بالفترة السابقة' }))

    expect(lastCall(api.fetchUsersOverview).compare).toBe(false)
    expect(screen.getByTestId('url').textContent).toContain('cmp=0')
    await waitFor(() => expect(screen.queryByText('-7.2%')).toBeNull())
    expect(screen.getByText(/فعّل «مقارنة بالفترة السابقة» لعرض النمو/)).toBeInTheDocument()
  })

  it('a custom range is validated before any request and applied when valid', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderTab(<AnalyticsTab />)
    await screen.findByText('1,284')
    const calls = api.fetchUsersOverview.mock.calls.length

    await user.click(screen.getByRole('button', { name: 'فترة مخصصة' }))
    const from = screen.getByLabelText('من')
    const to = screen.getByLabelText('إلى')

    await user.clear(from)
    await user.type(from, '2026-11-16')
    await user.clear(to)
    await user.type(to, '2026-11-10')
    await user.click(screen.getByRole('button', { name: 'تطبيق' }))
    expect(screen.getByRole('alert')).toHaveTextContent('يجب ألا يكون تاريخ البداية بعد تاريخ النهاية')
    expect(api.fetchUsersOverview.mock.calls.length).toBe(calls) // no request for an invalid range

    await user.clear(from)
    await user.type(from, '2026-11-10')
    await user.clear(to)
    await user.type(to, '2026-11-16')
    await user.click(screen.getByRole('button', { name: 'تطبيق' }))

    expect(lastCall(api.fetchUsersOverview)).toEqual({ from: '2026-11-10', to: '2026-11-16', compare: true })
    expect(screen.getByTestId('url').textContent).toMatch(/range=custom&from=2026-11-10&to=2026-11-16/)
  })

  it('opens on the range given in the URL', async () => {
    renderTab(<AnalyticsTab />, '/dashboard/super-admin/crud/users?tab=analytics&range=90d&cmp=0')

    await screen.findByText('1,284')

    expect(lastCall(api.fetchUsersOverview)).toEqual({ from: '2026-08-23', to: '2026-11-20', compare: false })
    expect(screen.getByRole('button', { name: 'آخر 90 يومًا' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('a metric tooltip is a keyboard-reachable definition', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderTab(<AnalyticsTab />)
    await screen.findByText('1,284')

    await user.tab() // first stop is the period filter; walk to the first info button
    const info = screen.getAllByRole('button', { name: /ما معنى/ })[0]
    info.focus()

    const tip = await screen.findByRole('tooltip')
    expect(info).toHaveAttribute('aria-describedby', tip.id)
    expect(tip).toHaveTextContent('عدد الحسابات القائمة الآن')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})

describe('activity tab', () => {
  it('requests its own endpoints only', async () => {
    renderTab(<ActivityTab />, '/dashboard/super-admin/crud/users?tab=activity')

    await screen.findByText('2,310')

    expect(api.fetchUsersActivity).toHaveBeenCalledTimes(1)
    expect(lastCall(api.fetchUsersActivity)).toEqual({ from: '2026-10-22', to: '2026-11-20', compare: true })
    expect(api.fetchLastLogins).toHaveBeenCalledWith(1, 10, expect.anything())
    expect(api.fetchUsersOverview).not.toHaveBeenCalled()
  })

  it('shows the headline as «users who logged in» with the limits stated', async () => {
    renderTab(<ActivityTab />, '/dashboard/super-admin/crud/users?tab=activity')

    await screen.findByText('2,310')

    expect(screen.getAllByText('المستخدمون الذين سجلوا الدخول').length).toBeGreaterThan(0)
    expect(screen.queryByText('المستخدمون النشطون')).toBeNull()
    expect(screen.getByText(/لا تشمل الجلسات المستمرة دون تسجيل دخول جديد/)).toBeInTheDocument()
    expect(screen.getByText('65.0% ممن سجلوا الدخول')).toBeInTheDocument()
  })

  it('draws the weekday × hour grid with every cell labelled', async () => {
    renderTab(<ActivityTab />, '/dashboard/super-admin/crud/users?tab=activity')

    const table = await screen.findByRole('table', { name: /تسجيلات الدخول حسب اليوم والساعة/ })

    expect(within(table).getAllByRole('cell')).toHaveLength(7 * 24)
    expect(within(table).getByLabelText('الاثنين الساعة 10: 1 تسجيل دخول')).toBeInTheDocument()
    expect(within(table).getByLabelText('الأحد الساعة 10: 7 تسجيل دخول')).toBeInTheDocument()
    expect(within(table).getByLabelText('الاثنين الساعة 3: 0 تسجيل دخول')).toBeInTheDocument()
  })

  it('shows an empty heatmap note when there were no logins', async () => {
    const empty = activity()
    empty.charts.heatmap.weekday_hour = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))
    api.fetchUsersActivity.mockResolvedValue(empty)
    renderTab(<ActivityTab />, '/dashboard/super-admin/crud/users?tab=activity')

    await screen.findByText('2,310')

    expect(screen.queryByRole('table', { name: /تسجيلات الدخول حسب اليوم والساعة/ })).toBeNull()
  })

  it('lists inactivity buckets as cumulative, plus never-logged-in, roles and return frequency in Arabic', async () => {
    renderTab(<ActivityTab />, '/dashboard/super-admin/crud/users?tab=activity')

    await screen.findByText('2,310')

    expect(screen.getByText('بلا دخول منذ أكثر من 30 يومًا')).toBeInTheDocument()
    expect(screen.getByText('388')).toBeInTheDocument()
    expect(screen.getByText('بلا دخول منذ أكثر من 90 يومًا')).toBeInTheDocument()
    expect(screen.getByText('لم يسجلوا الدخول أبدًا')).toBeInTheDocument()
    expect(screen.getByText('96')).toBeInTheDocument()
    expect(screen.getByText('301 مستخدم')).toBeInTheDocument()
    expect(screen.getByText('8 أيام فأكثر')).toBeInTheDocument()
    expect(screen.getAllByText('تراكمي').length).toBeGreaterThan(0)
  })

  it('lists the last logins without contact data and pages through them', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderTab(<ActivityTab />, '/dashboard/super-admin/crud/users?tab=activity')

    await screen.findByRole('rowheader', { name: 'مستخدم 1' })
    expect(screen.queryByText(/@/)).toBeNull() // no email anywhere on the tab
    expect(screen.getByText(/صفحة 1 من 3/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'الصفحة السابقة' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'الصفحة التالية' }))

    await screen.findByRole('rowheader', { name: 'مستخدم 2' })
    expect(api.fetchLastLogins).toHaveBeenLastCalledWith(2, 10, expect.anything())
  })

  it('a failed last-logins list does not take the rest of the tab down', async () => {
    api.fetchLastLogins.mockRejectedValue(new Error('nope'))
    renderTab(<ActivityTab />, '/dashboard/super-admin/crud/users?tab=activity')

    await screen.findByText('2,310')

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تحميل البيانات')
    expect(screen.getByText('بلا دخول منذ أكثر من 30 يومًا')).toBeInTheDocument()
  })

  it('shares the period with the other tab through the URL', async () => {
    renderTab(<ActivityTab />, '/dashboard/super-admin/crud/users?tab=activity&range=custom&from=2026-11-01&to=2026-11-05&cmp=0')

    await screen.findByText('2,310')

    expect(lastCall(api.fetchUsersActivity)).toEqual({ from: '2026-11-01', to: '2026-11-05', compare: false })
  })
})

describe('accessibility', () => {
  it('the analytics tab has no axe violations (structure, names, roles)', async () => {
    const { container } = renderTab(<AnalyticsTab />)
    await screen.findByText('1,284')

    expect(await axe(container)).toHaveNoViolations()
  })

  it('the activity tab has no axe violations (heatmap table, last-logins table, controls)', async () => {
    const { container } = renderTab(<ActivityTab />, '/dashboard/super-admin/crud/users?tab=activity')
    await screen.findByText('2,310')
    await screen.findByRole('rowheader', { name: 'مستخدم 1' })

    expect(await axe(container)).toHaveNoViolations()
  })
})
