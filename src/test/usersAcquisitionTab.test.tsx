import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { AxiosError } from 'axios'
import { axe } from 'vitest-axe'
import type { AcquisitionData } from '@/api/usersAnalyticsApi'

const api = vi.hoisted(() => ({
  fetchUsersAcquisition: vi.fn(),
}))
vi.mock('@/api/usersAnalyticsApi', () => api)

const charts = vi.hoisted(() => ({ drawn: [] as string[] }))
// recharts needs a real layout engine; the lazy wrapper is replaced by a marker that records what would be drawn
// (the real chart is exercised in usersSourcesChart.test.tsx)
vi.mock('@/pages/super-admin/users/hub/analytics/LazyTimeSeries', () => ({
  LazyTimeSeries: (p: { kind: string; data: unknown[] }) => {
    charts.drawn.push(p.kind)
    return <div data-testid={`chart-${p.kind}`} data-points={p.data.length} />
  },
}))

import AcquisitionTab from '@/pages/super-admin/users/hub/tabs/AcquisitionTab'

const PERIOD = { from: '2026-10-22', to: '2026-11-20', days: 30, timezone: 'Europe/Amsterdam' }
const days = ['2026-11-18', '2026-11-19', '2026-11-20']

const NOTE_BASE = 'هذه زيارات لصفحات وليست تسجيلات'
const UTM_NOTE_BOTH = `${NOTE_BASE}: تُسجَّل فقط لمن وافق على ملفات التحليلات، ولا ترتبط بالحساب الذي ينشئه الزائر لاحقًا.`

const REASONS = {
  referral_codes: 'لا يوجد حقل لرمز الإحالة عند التسجيل.',
  direct_registration: 'لا نميّز التسجيل المباشر عن غيره، فغياب المصدر لا يعني أنه مباشر.',
  conversion_rate: 'لا يمكن حسابه لأن الزيارات لا ترتبط بالحسابات.',
  utm_to_account: 'لا تُحفظ معاملات الحملة مع الحساب عند إنشائه.',
}
const NO_REASON = 'لا تتوفر بيانات لهذا البند'

type Unavailable = AcquisitionData['unavailable']
const ALL_UNAVAILABLE: Unavailable = {
  referral_codes: { available: false, reason: REASONS.referral_codes },
  direct_registration: { available: false, reason: REASONS.direct_registration },
  conversion_rate: { available: false, reason: REASONS.conversion_rate },
  utm_to_account: { available: false, reason: REASONS.utm_to_account },
}

function acquisition(
  over: Partial<AcquisitionData['self_reported']> = {},
  utm: Partial<AcquisitionData['utm_visits']> = {},
  unavailable: Unavailable = ALL_UNAVAILABLE,
): AcquisitionData {
  return {
    meta: { period: PERIOD, previous_period: { ...PERIOD, from: '2026-09-22', to: '2026-10-21' }, generated_at: '2026-11-20T10:00:00+00:00' },
    self_reported: {
      total_accounts_created: 240,
      items: [
        { source: 'instagram', count: 80, previous: 50, change_pct: 60 },
        { source: 'google', count: 45, previous: 60, change_pct: -25 },
        { source: 'صديق', count: 30, previous: 0, change_pct: null },
      ],
      other: 25,
      unknown: 60,
      coverage_pct: 75,
      daily: [
        { source: 'instagram', series: days.map((date, i) => ({ date, count: 10 + i })) },
        { source: 'google', series: days.map((date) => ({ date, count: 5 })) },
      ],
      free_text: true,
      ...over,
    },
    utm_visits: {
      unit: 'visits',
      consent_gated: true,
      linked_to_accounts: false,
      total_pageviews: 5200,
      with_utm: 640,
      by_source: [
        { name: 'newsletter', visits: 300, visitors: 210 },
        { name: 'tiktok', visits: 220, visitors: 170 },
      ],
      by_medium: [{ name: 'email', visits: 300, visitors: 210 }],
      by_campaign: [{ name: 'ramadan-2026', visits: 410, visitors: 330 }],
      ...utm,
    },
    unavailable,
  }
}

function Url() {
  const l = useLocation()
  return <output data-testid="url">{`${l.pathname}${l.search}`}</output>
}

function renderTab(initial = '/dashboard/super-admin/crud/users?tab=acquisition') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Url />
      <AcquisitionTab />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-20T12:00:00Z'))
  api.fetchUsersAcquisition.mockReset()
  charts.drawn.length = 0
  api.fetchUsersAcquisition.mockResolvedValue(acquisition())
})

afterEach(() => {
  vi.useRealTimers()
})

const lastCall = (m: ReturnType<typeof vi.fn>) => m.mock.calls.at(-1)![0]
const region = (name: string) => screen.getByRole('region', { name })
const card = (label: string) => screen.getByRole('group', { name: label })
const sourceList = () => screen.getByRole('list', { name: 'المصادر المعلنة وعدد الحسابات لكل مصدر' })
const SOURCES = 'مصادر التسجيل المعلنة'
const DAILY = 'التسجيلات اليومية حسب المصدر المعلن'
const UTM = 'زيارات الحملات (UTM)'

describe('acquisition tab: requests and figures', () => {
  it('requests the last 30 days with the comparison from its own endpoint', async () => {
    renderTab()

    await screen.findByText('240')

    expect(api.fetchUsersAcquisition).toHaveBeenCalledTimes(1)
    expect(lastCall(api.fetchUsersAcquisition)).toEqual({ from: '2026-10-22', to: '2026-11-20', compare: true })
  })

  it('shows the four KPIs straight from the response, with the coverage and the page-view base', async () => {
    renderTab()
    await screen.findByText('240')

    expect(within(card('حسابات أُنشئت في الفترة')).getByText('240')).toBeInTheDocument()
    const answered = card('صرّحوا بمصدر')
    expect(within(answered).getByText('180')).toBeInTheDocument()
    expect(within(answered).getByText('75.0% من الحسابات')).toBeInTheDocument()
    expect(within(card('بلا مصدر معلن')).getByText('60')).toBeInTheDocument()
    const utm = card('زيارات بحملات UTM')
    expect(within(utm).getByText('640')).toBeInTheDocument()
    expect(within(utm).getByText('من 5,200 زيارة صفحة مسجَّلة')).toBeInTheDocument()
  })

  it('«answered» equals created − unknown when the payload is consistent (top sources + the rest beyond them)', async () => {
    api.fetchUsersAcquisition.mockResolvedValue(
      acquisition({ total_accounts_created: 300, unknown: 40, items: [{ source: 'instagram', count: 150 }, { source: 'google', count: 90 }], other: 20, coverage_pct: 86.7 }),
    )
    renderTab()
    await screen.findByRole('group', { name: 'صرّحوا بمصدر' })

    // 150 + 90 + 20 listed; 300 created − 40 without a source: the same 260, computed independently of the component
    expect(within(card('صرّحوا بمصدر')).getByText('260')).toBeInTheDocument()
  })

  it('an inconsistent payload shows the API-derived sum, not a subtraction, and keeps the coverage note as sent', async () => {
    api.fetchUsersAcquisition.mockResolvedValue(
      acquisition({ total_accounts_created: 240, unknown: 60, items: [{ source: 'instagram', count: 100 }], other: 0, coverage_pct: 75 }),
    )
    renderTab()
    await screen.findByText('240')

    const answered = card('صرّحوا بمصدر')
    expect(within(answered).getByText('100')).toBeInTheDocument() // not 180
    expect(within(answered).getByText('75.0% من الحسابات')).toBeInTheDocument()
  })

  it('never shows a negative number when «unknown» exceeds the accounts created', async () => {
    api.fetchUsersAcquisition.mockResolvedValue(
      acquisition({ total_accounts_created: 10, unknown: 14, items: [{ source: 'instagram', count: 3 }], other: 0, coverage_pct: 30, daily: [] }),
    )
    renderTab()
    await screen.findByText('بلا مصدر معلن')

    expect(within(card('بلا مصدر معلن')).getByText('14')).toBeInTheDocument()
    expect(within(card('صرّحوا بمصدر')).getByText('3')).toBeInTheDocument()
    for (const label of ['حسابات أُنشئت في الفترة', 'صرّحوا بمصدر', 'بلا مصدر معلن']) {
      expect(card(label).textContent).not.toMatch(/-\d/)
    }
  })

  it('no accounts and no coverage: zeros, no percentage note, empty states instead of lists and charts', async () => {
    api.fetchUsersAcquisition.mockResolvedValue(
      acquisition({ total_accounts_created: 0, items: [], other: 0, unknown: 0, coverage_pct: null, daily: [] }),
    )
    renderTab()
    await screen.findByText('بلا مصدر معلن')

    const answered = card('صرّحوا بمصدر')
    expect(within(answered).getByText('0')).toBeInTheDocument()
    expect(answered.textContent).not.toMatch(/%/)
    expect(within(region(SOURCES)).getByText('لا توجد حسابات أُنشئت في هذه الفترة')).toBeInTheDocument()
    expect(within(region(DAILY)).getByText('لا توجد مصادر معلنة في هذه الفترة')).toBeInTheDocument()
    expect(screen.queryByTestId('chart-sources')).toBeNull()
  })

  it('invents no comparison for the cards: the API gives none, so they carry no previous value, change or sign', async () => {
    renderTab()
    await screen.findByText('240')

    for (const label of ['حسابات أُنشئت في الفترة', 'صرّحوا بمصدر', 'بلا مصدر معلن', 'زيارات بحملات UTM']) {
      const text = card(label).textContent ?? ''
      expect(text).not.toMatch(/السابقة|عن الفترة/)
      expect(text).not.toMatch(/[+-]\s?\d/)
    }
    // the only percentage on any card is the coverage the API sent
    expect(card('حسابات أُنشئت في الفترة').textContent).not.toMatch(/%/)
    expect(card('بلا مصدر معلن').textContent).not.toMatch(/%/)
    expect(card('زيارات بحملات UTM').textContent).not.toMatch(/%/)
  })

  it('marks the UTM card as visits so it is not read as a sign-up figure', async () => {
    renderTab()
    await screen.findByText('240')

    expect(within(card('زيارات بحملات UTM')).getByText('زيارات', { selector: 'span.rounded-md' })).toBeInTheDocument()
    expect(within(card('حسابات أُنشئت في الفترة')).queryByText('زيارات')).toBeNull()
  })
})

describe('acquisition tab: self-reported sources', () => {
  it('lists the sources as typed, plus the «beyond the top 12» and «unknown» rows, and never a «direct» row', async () => {
    renderTab()
    await screen.findByText('240')

    const list = sourceList()
    const rows = within(list).getAllByRole('listitem')

    expect(rows.map((r) => r.querySelector('span')?.textContent)).toEqual(['instagram', 'google', 'صديق', 'مصادر أخرى خارج الأعلى 3', 'غير محدد'])
    expect(within(rows[0]).getByText('80')).toBeInTheDocument()
    expect(within(rows[3]).getByText('25')).toBeInTheDocument()
    expect(within(rows[4]).getByText('60')).toBeInTheDocument()
    expect(within(list).queryByText(/مباشر/)).toBeNull()
  })

  it('the caption says the text is trimmed and case-folded, and that «unknown» is not «direct»', async () => {
    renderTab()
    await screen.findByText('240')

    const panel = region(SOURCES)
    expect(within(panel).getByText(/بعد قص المسافات وتوحيد حالة الأحرف/)).toBeInTheDocument()
    expect(within(panel).getByText(/وليست «تسجيل مباشر»/)).toBeInTheDocument()
  })

  it('a source literally named «direct» or «مباشر» is shown as typed, and stays apart from the «unknown» row', async () => {
    api.fetchUsersAcquisition.mockResolvedValue(
      acquisition({ items: [{ source: 'direct', count: 7 }, { source: 'مباشر', count: 5 }], other: 0, unknown: 9, total_accounts_created: 21, coverage_pct: 57.1 }),
    )
    renderTab()
    await screen.findByText('21')

    const rows = within(sourceList()).getAllByRole('listitem')
    expect(rows.map((r) => r.querySelector('span')?.textContent)).toEqual(['direct', 'مباشر', 'غير محدد'])
    expect(within(rows[2]).getByText('9')).toBeInTheDocument()
  })

  it('with the comparison on, shows each source change (sign kept) and its previous count', async () => {
    renderTab()
    await screen.findByText('240')

    const [instagram, google, friend] = within(sourceList()).getAllByRole('listitem')

    expect(within(instagram).getByText('+60.0%')).toHaveAttribute('dir', 'ltr')
    expect(within(instagram).getByText('الفترة السابقة 50')).toBeInTheDocument()
    expect(within(google).getByText('-25.0%')).toBeInTheDocument()
    expect(within(google).getByText('الفترة السابقة 60')).toBeInTheDocument()
    // previous 0 → the API has no percentage: only the previous count is shown, no invented number
    expect(within(friend).getByText('الفترة السابقة 0')).toBeInTheDocument()
    expect(within(friend).queryByText(/%/)).toBeNull()
  })

  it('a change of exactly 0 is shown as 0.0% (no sign) with its previous count', async () => {
    api.fetchUsersAcquisition.mockResolvedValue(acquisition({ items: [{ source: 'instagram', count: 30, previous: 30, change_pct: 0 }], other: 0, unknown: 0 }))
    renderTab()
    await screen.findByText('240')

    const [row] = within(sourceList()).getAllByRole('listitem')
    expect(within(row).getByText('0.0%')).toBeInTheDocument()
    expect(within(row).getByText('الفترة السابقة 30')).toBeInTheDocument()
  })

  it('a null or missing previous shows nothing for that row (null and undefined alike)', async () => {
    api.fetchUsersAcquisition.mockResolvedValue(
      acquisition({ items: [{ source: 'instagram', count: 30, previous: null, change_pct: null }, { source: 'google', count: 20 }], other: 0, unknown: 0 }),
    )
    renderTab()
    await screen.findByText('240')

    const list = sourceList()
    expect(within(list).queryByText(/الفترة السابقة/)).toBeNull()
    expect(within(list).queryByText(/%/)).toBeNull()
  })

  it('with the comparison off, hides previous values and changes even if the response carried them', async () => {
    renderTab('/dashboard/super-admin/crud/users?tab=acquisition&cmp=0')
    await screen.findByText('240')

    expect(lastCall(api.fetchUsersAcquisition).compare).toBe(false)
    const list = sourceList()
    expect(within(list).queryByText(/السابقة/)).toBeNull()
    expect(within(list).queryByText(/%/)).toBeNull()
  })

  it('a long source is cut short in the row but its full text is on the title, and an empty name is said so', async () => {
    const long = 'سمعت عنكم من صديق قديم كان يدرس في الدورات السابقة وأخبرني عن المنصة في اجتماع عائلي طويل'
    api.fetchUsersAcquisition.mockResolvedValue(acquisition({ items: [{ source: long, count: 9 }, { source: '   ', count: 4 }], other: 0, unknown: 0 }))
    renderTab()
    await screen.findByText('240')

    const [first, second] = within(sourceList()).getAllByRole('listitem')
    expect(first.querySelector('span')).toHaveAttribute('title', long)
    expect(first.querySelector('span')).toHaveClass('truncate', 'min-w-0')
    expect(within(second).getByText('(بلا اسم)')).toBeInTheDocument()
  })

  it('draws the leading-source trend from the daily series, under a title that does not claim attribution', async () => {
    renderTab()
    await screen.findByText('240')

    expect(charts.drawn).toContain('sources')
    expect(screen.getByTestId('chart-sources')).toHaveAttribute('data-points', '2')
    expect(within(region(DAILY)).getByTestId('chart-sources')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'نمو القنوات' })).toBeNull()
  })

  it('shows an empty note instead of an empty chart and list when there are no answered sources', async () => {
    api.fetchUsersAcquisition.mockResolvedValue(
      acquisition({ total_accounts_created: 12, items: [], other: 0, unknown: 12, coverage_pct: 0, daily: [] }),
    )
    renderTab()
    await screen.findByText('بلا مصدر معلن')

    expect(screen.queryByTestId('chart-sources')).toBeNull()
    expect(within(region(DAILY)).getByText('لا توجد مصادر معلنة في هذه الفترة')).toBeInTheDocument()
    const list = sourceList()
    expect(within(list).getAllByRole('listitem')).toHaveLength(1) // only «غير محدد»
    expect(within(list).getByText('غير محدد')).toBeInTheDocument()
  })
})

describe('acquisition tab: UTM visits', () => {
  it('keeps the visits block apart from the sign-ups, with the visits-not-registrations note, and ranks source, medium and campaign', async () => {
    renderTab()
    await screen.findByText('240')

    const utm = region(UTM)
    expect(within(utm).getByText(UTM_NOTE_BOTH)).toBeInTheDocument()
    expect(within(utm).getByText('زيارات لا تسجيلات')).toBeInTheDocument()
    expect(within(utm).getByText('newsletter')).toBeInTheDocument()
    expect(within(utm).getAllByText('210 زائر')).toHaveLength(2) // newsletter and the email medium
    expect(within(utm).getByText('email')).toBeInTheDocument()
    expect(within(utm).getByText('ramadan-2026')).toBeInTheDocument()
    expect(within(utm).getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual(['المصدر', 'الوسيط', 'الحملة'])

    // the sources panel neither contains the visits note nor any UTM value
    const signups = region(SOURCES)
    expect(within(signups).queryByText(UTM_NOTE_BOTH)).toBeNull()
    expect(within(signups).queryByText('newsletter')).toBeNull()
    expect(utm.contains(signups)).toBe(false)
  })

  it('each UTM list is named by its heading (and the sources list has its own name)', async () => {
    renderTab()
    await screen.findByText('240')

    const utm = region(UTM)
    expect(within(utm).getByRole('list', { name: 'المصدر' })).toHaveTextContent('newsletter')
    expect(within(utm).getByRole('list', { name: 'الوسيط' })).toHaveTextContent('email')
    expect(within(utm).getByRole('list', { name: 'الحملة' })).toHaveTextContent('ramadan-2026')
    expect(sourceList()).toHaveTextContent('instagram')
  })

  it.each([
    [true, false, UTM_NOTE_BOTH],
    [true, true, `${NOTE_BASE}: تُسجَّل فقط لمن وافق على ملفات التحليلات.`],
    [false, false, `${NOTE_BASE}: لا ترتبط بالحساب الذي ينشئه الزائر لاحقًا.`],
    [false, true, `${NOTE_BASE}.`],
  ])('the note follows the response flags (consent_gated=%s, linked_to_accounts=%s)', async (consent, linked, expected) => {
    api.fetchUsersAcquisition.mockResolvedValue(acquisition({}, { consent_gated: consent, linked_to_accounts: linked }))
    renderTab()
    await screen.findByText('240')

    const utm = region(UTM)
    expect(within(utm).getByText(expected)).toBeInTheDocument()
    expect(within(utm).queryByText(/وافق على ملفات التحليلات/) === null).toBe(!consent)
    expect(within(utm).queryByText(/لا ترتبط بالحساب/) === null).toBe(linked)
  })

  it('shows an empty note for UTM visits when there are none, and the note stays', async () => {
    api.fetchUsersAcquisition.mockResolvedValue(
      acquisition({}, { with_utm: 0, total_pageviews: 80, by_source: [], by_medium: [], by_campaign: [] }),
    )
    renderTab()
    await screen.findByText('240')

    const utm = region(UTM)
    expect(within(utm).getByText('لا توجد زيارات بحملات UTM في هذه الفترة')).toBeInTheDocument()
    expect(within(utm).queryAllByRole('heading', { level: 4 })).toHaveLength(0)
    expect(within(utm).getByText(UTM_NOTE_BOTH)).toBeInTheDocument()
  })

  it('an empty UTM name is shown as «(بلا اسم)», not as a blank label', async () => {
    api.fetchUsersAcquisition.mockResolvedValue(
      acquisition({}, { by_source: [{ name: '', visits: 12, visitors: 9 }, { name: 'newsletter', visits: 5, visitors: 4 }] }),
    )
    renderTab()
    await screen.findByText('240')

    const list = within(region(UTM)).getByRole('list', { name: 'المصدر' })
    expect(within(list).getByText('(بلا اسم)')).toBeInTheDocument()
    expect(within(list).getByText('12')).toBeInTheDocument()
  })
})

describe('acquisition tab: unavailable', () => {
  it('lists the four items with the backend reasons, exactly, and never a figure for them', async () => {
    renderTab()
    await screen.findByText('240')

    const items = within(region('غير متاح حاليًا')).getAllByRole('listitem')

    expect(items.map((i) => i.textContent)).toEqual([
      `رموز الإحالةغير متاح${REASONS.referral_codes}`,
      `التسجيل المباشرغير متاح${REASONS.direct_registration}`,
      `معدل التحويلغير متاح${REASONS.conversion_rate}`,
      `ربط الحملة بالحسابغير متاح${REASONS.utm_to_account}`,
    ])
    for (const item of items) expect(item.textContent).not.toMatch(/\d/)
    expect(within(region('غير متاح حاليًا')).queryByRole('link')).toBeNull()
    // «conversion rate» appears once on the whole tab, and the internal design doc is not named
    expect(screen.getAllByText('معدل التحويل')).toHaveLength(1)
    expect(document.body.textContent).not.toMatch(/USER_ATTRIBUTION|docs\/architecture/)
  })

  it('still lists all four, with a generic line and no figure, when the response lacks an entry', async () => {
    const { conversion_rate: omitted, ...rest } = ALL_UNAVAILABLE
    void omitted
    api.fetchUsersAcquisition.mockResolvedValue(acquisition({}, {}, rest))
    renderTab()
    await screen.findByText('240')

    const items = within(region('غير متاح حاليًا')).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[2].textContent).toBe(`معدل التحويلغير متاح${NO_REASON}`)
    expect(items[2].textContent).not.toMatch(/\d/)
    expect(items[0].textContent).toBe(`رموز الإحالةغير متاح${REASONS.referral_codes}`)
  })

  it('lists all four with the generic line when the response has none at all', async () => {
    api.fetchUsersAcquisition.mockResolvedValue(acquisition({}, {}, {}))
    renderTab()
    await screen.findByText('240')

    const items = within(region('غير متاح حاليًا')).getAllByRole('listitem')
    expect(items.map((i) => i.textContent)).toEqual([
      `رموز الإحالةغير متاح${NO_REASON}`,
      `التسجيل المباشرغير متاح${NO_REASON}`,
      `معدل التحويلغير متاح${NO_REASON}`,
      `ربط الحملة بالحسابغير متاح${NO_REASON}`,
    ])
  })
})

describe('acquisition tab: unavailable (entries the backend marks available)', () => {
  it('leaves out an item the response marks available, and keeps the rest and any absent one as unavailable', async () => {
    const { conversion_rate: omitted, ...rest } = ALL_UNAVAILABLE
    void omitted
    api.fetchUsersAcquisition.mockResolvedValue(
      acquisition({}, {}, { ...rest, referral_codes: { available: true, reason: 'متاح الآن' } }),
    )
    renderTab()
    await screen.findByText('240')

    const items = within(region('غير متاح حاليًا')).getAllByRole('listitem')
    expect(items.map((i) => i.textContent)).toEqual([
      `التسجيل المباشرغير متاح${REASONS.direct_registration}`,
      `معدل التحويلغير متاح${NO_REASON}`, // absent: we cannot say it is available
      `ربط الحملة بالحسابغير متاح${REASONS.utm_to_account}`,
    ])
    expect(screen.queryByText('متاح الآن')).toBeNull()
  })

  it('hides the whole panel when every item is marked available', async () => {
    const all = Object.fromEntries(Object.keys(ALL_UNAVAILABLE).map((k) => [k, { available: true, reason: '' }])) as Unavailable
    api.fetchUsersAcquisition.mockResolvedValue(acquisition({}, {}, all))
    renderTab()
    await screen.findByText('240')

    expect(screen.queryByRole('region', { name: 'غير متاح حاليًا' })).toBeNull()
  })

  it('names the «rest» row after how many sources are listed, not a fixed number', async () => {
    const twelve = Array.from({ length: 12 }, (_, i) => ({ source: `src-${i}`, count: 12 - i }))
    api.fetchUsersAcquisition.mockResolvedValue(acquisition({ items: twelve, other: 9, unknown: 0, total_accounts_created: 87 }))
    renderTab()
    await screen.findByRole('group', { name: 'صرّحوا بمصدر' })

    expect(within(sourceList()).getByText('مصادر أخرى خارج الأعلى 12')).toBeInTheDocument()
  })
})

describe('acquisition tab: states and period', () => {
  it('shows a loading region (and no numbers) before the first response', async () => {
    api.fetchUsersAcquisition.mockReturnValue(new Promise(() => {}))
    renderTab()

    expect(screen.getByText('جارٍ تحميل البيانات').closest('[role="status"]')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('240')).toBeNull()
  })

  it('explains a failure and retries on request', async () => {
    api.fetchUsersAcquisition.mockRejectedValueOnce(new Error('network down')).mockResolvedValue(acquisition())
    renderTab()

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('تعذّر تحميل البيانات')).toBeInTheDocument()

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))

    await screen.findByText('240')
    expect(api.fetchUsersAcquisition).toHaveBeenCalledTimes(2)
  })

  it('says so once on a 403 and offers no retry (it cannot help)', async () => {
    const err = new AxiosError('forbidden', 'ERR_BAD_REQUEST', undefined, undefined, { status: 403, data: {}, statusText: 'Forbidden', headers: {}, config: {} as never })
    api.fetchUsersAcquisition.mockRejectedValue(err)
    renderTab()

    const alert = await screen.findByRole('alert')

    expect(within(alert).getAllByText(/لا تملك صلاحية عرض هذا القسم/)).toHaveLength(1)
    expect(within(alert).queryByRole('button', { name: 'إعادة المحاولة' })).toBeNull()
  })

  it('opens on the period given in the URL', async () => {
    renderTab('/dashboard/super-admin/crud/users?tab=acquisition&range=custom&from=2026-11-01&to=2026-11-05&cmp=0')

    await screen.findByText('240')

    expect(lastCall(api.fetchUsersAcquisition)).toEqual({ from: '2026-11-01', to: '2026-11-05', compare: false })
  })

  it('a preset refetches with the new window and keeps the tab in the URL', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderTab()
    await screen.findByText('240')

    await user.click(screen.getByRole('button', { name: 'آخر 7 أيام' }))

    await waitFor(() => expect(lastCall(api.fetchUsersAcquisition)).toEqual({ from: '2026-11-14', to: '2026-11-20', compare: true }))
    expect(screen.getByTestId('url').textContent).toContain('range=7d')
    expect(screen.getByTestId('url').textContent).toContain('tab=acquisition')
  })

  it('has no axe violations (structure, names, roles)', async () => {
    const { container } = renderTab()
    await screen.findByText('240')

    expect(await axe(container)).toHaveNoViolations()
  })
})
