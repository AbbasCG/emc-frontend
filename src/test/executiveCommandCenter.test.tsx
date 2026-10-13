import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import ExecutiveCommandCenterPage from '@/pages/executive/ExecutiveCommandCenterPage'
import {
  fetchCommandCenter,
  normalizeCommandCenter,
  safeInternalUrl,
  type CommandCenterData,
  type CommandCenterItem,
  type CommandCenterSectionKey,
} from '@/api/executiveCommandCenterApi'
import { getSidebarByRole } from '@/layouts/dashboardSidebar'
import { resolveSidebarNavigation } from '@/utils/sidebarAccessFilter'
import type { EffectivePageAccessRow, PageAccessSource } from '@/api/accessControlApi'

vi.mock('@/api/executiveCommandCenterApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/executiveCommandCenterApi')>()
  return { ...actual, fetchCommandCenter: vi.fn() }
})

const access = vi.hoisted(() => ({ keys: new Set<string>() }))
vi.mock('@/contexts/PageAccessContext', () => ({
  usePageAccess: () => ({ status: 'ready', pages: [], allowedKeys: access.keys, isReady: true, canAccessKey: (k: string) => access.keys.has(k), canAccessPath: () => true, pageForPath: () => null, refresh: async () => {} }),
}))

const mocked = vi.mocked(fetchCommandCenter)

function item(over: Partial<CommandCenterItem> = {}): CommandCenterItem {
  return {
    id: 'ticket_new-1', source: 'tickets', type: 'ticket_new', title: 'لا يعمل تسجيل الدخول', description: 'بلاغ جديد بانتظار الاعتماد والتوجيه.',
    status: 'PENDING_APPROVAL', statusLabel: 'بانتظار الاعتماد', priority: 'high', priorityLabel: 'مهم',
    timestamp: new Date(Date.now() - 2 * 3600_000).toISOString(), dueAt: null, actor: { name: 'سارة' }, url: '/dashboard/tickets/1', actionLabel: 'فتح التذكرة', badge: 'جديد', ...over,
  }
}

function data(over: Partial<Record<CommandCenterSectionKey, CommandCenterItem[]>> = {}, extra: Partial<CommandCenterData> = {}): CommandCenterData {
  const lists: Record<CommandCenterSectionKey, CommandCenterItem[]> = {
    needs_attention: [item(), item({ id: 'meeting_missing_report-4', source: 'meetings', title: 'اجتماع المتابعة', description: 'انتهى الاجتماع ولم يُرفع تقريره بعد.', priority: 'high', url: '/dashboard/operations/meeting-reports', actionLabel: 'مراجعة التقارير', actor: null })],
    upcoming: [item({ id: 'meeting_upcoming-9', source: 'meetings', title: 'اجتماع الغد', priority: 'medium', priorityLabel: 'متوسط', url: '/dashboard/department/meeting-lounge/9', actionLabel: 'فتح الاجتماع', dueAt: new Date(Date.now() + 86400_000).toISOString() })],
    recent_updates: [item({ id: 'ticket_resolved-2', title: 'تم حل المشكلة', priority: 'info', priorityLabel: 'معلومة', description: 'تم حل البلاغ.', actionLabel: 'فتح التذكرة' })],
    errors: [item({ id: 'email_failures-welcome', source: 'system', title: 'فشل إرسال 6 رسائل: بريد الترحيب', description: 'رسائل لم تُسلَّم.', priority: 'critical', priorityLabel: 'عاجل', url: '/dashboard/super-admin/email-logs', actionLabel: 'فتح سجلات البريد', actor: null })],
    ...over,
  }
  const titles: Record<CommandCenterSectionKey, string> = { needs_attention: 'يحتاج انتباه الآن', upcoming: 'القادم', recent_updates: 'آخر التحديثات', errors: 'مشاكل وتنبيهات' }
  return {
    meta: { generatedAt: '2026-10-13T18:00:00+00:00', range: 'today', source: 'all', priority: 'all', timezone: 'Europe/Amsterdam' },
    summary: { needs_attention: lists.needs_attention.length, upcoming: lists.upcoming.length, recent_updates: lists.recent_updates.length, errors: lists.errors.length, sourcesActive: 7, sourcesTotal: 7 },
    sections: (Object.keys(titles) as CommandCenterSectionKey[]).map((k) => ({ key: k, title: titles[k], total: lists[k].length, items: lists[k] })),
    sources: (['tickets', 'meetings', 'education', 'finance', 'hr', 'quality', 'system'] as const).map((k) => ({ key: k, label: { tickets: 'التذاكر', meetings: 'الاجتماعات', education: 'التعليم', finance: 'المالية', hr: 'الموارد البشرية', quality: 'الجودة', system: 'النظام' }[k], available: true, count: 1, unavailable: [] })),
    capabilities: { canView: true, canRefresh: true, readOnly: true },
    ...extra,
  }
}

function httpError(status: number): unknown {
  return { isAxiosError: true, name: 'AxiosError', message: 'x', config: {}, response: { status, data: {} } }
}

function renderPage() {
  return render(<MemoryRouter><ExecutiveCommandCenterPage /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  access.keys = new Set()
  mocked.mockResolvedValue(data())
})

describe('page', () => {
  it('renders the title, subtitle and RTL shell for an authorized user', async () => {
    const { container } = renderPage()

    expect(await screen.findByRole('heading', { name: 'مركز المتابعة التنفيذي' })).toBeTruthy()
    expect(screen.getByText('متابعة أهم أحداث المنصة والمهام القادمة والتنبيهات من مكان واحد.')).toBeTruthy()
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull()
    expect(mocked).toHaveBeenCalledWith({ range: 'today', source: 'all' })
  })

  it('renders the five KPI cards', async () => {
    renderPage()
    await screen.findByTestId('kpi-needs_attention')

    expect(within(screen.getByTestId('kpi-needs_attention')).getByText('2')).toBeTruthy()
    expect(within(screen.getByTestId('kpi-upcoming')).getByText('1')).toBeTruthy()
    expect(screen.getByTestId('kpi-recent_updates')).toBeTruthy()
    expect(screen.getByTestId('kpi-errors')).toBeTruthy()
    expect(within(screen.getByTestId('kpi-sources')).getByText('7/7')).toBeTruthy()
  })

  it('renders the source filter chips in the required order', async () => {
    renderPage()
    const nav = await screen.findByTestId('source-filters')

    expect(within(nav).getAllByRole('button').map((b) => b.textContent?.replace(/\d+$/, '').trim())).toEqual(
      ['الكل', 'التذاكر', 'الاجتماعات', 'التعليم', 'المالية', 'الموارد البشرية', 'الجودة', 'النظام'],
    )
  })

  it('renders the four sections with their items', async () => {
    renderPage()
    await screen.findByTestId('section-needs_attention')

    for (const [key, title] of [['needs_attention', 'يحتاج انتباه الآن'], ['upcoming', 'القادم'], ['recent_updates', 'آخر التحديثات'], ['errors', 'مشاكل وتنبيهات']] as const) {
      const sec = screen.getByTestId(`section-${key}`)
      expect(within(sec).getByRole('heading', { name: title })).toBeTruthy()
      expect(within(sec).getAllByTestId('command-center-item').length).toBeGreaterThan(0)
    }
  })

  it('an item shows its source, priority, status, time, person and action', async () => {
    renderPage()
    const sec = await screen.findByTestId('section-needs_attention')
    const card = within(sec).getAllByTestId('command-center-item')[0]

    expect(within(card).getByText('التذاكر')).toBeTruthy()
    expect(within(card).getByText('مهم')).toBeTruthy()
    expect(within(card).getByText('بانتظار الاعتماد')).toBeTruthy()
    expect(within(card).getByText('لا يعمل تسجيل الدخول')).toBeTruthy()
    expect(within(card).getByText('سارة')).toBeTruthy()
    expect(card.querySelector('time')).not.toBeNull()
    expect(within(card).getByRole('link', { name: /فتح التذكرة/ })).toBeTruthy()
    expect(card.getAttribute('data-source')).toBe('tickets')
    expect(card.getAttribute('data-priority')).toBe('high')
  })

  it('every action link goes to the item\'s internal URL', async () => {
    renderPage()
    await screen.findByTestId('section-errors')

    expect(within(screen.getByTestId('section-errors')).getByRole('link', { name: /فتح سجلات البريد/ }).getAttribute('href')).toBe('/dashboard/super-admin/email-logs')
    expect(within(screen.getByTestId('section-upcoming')).getByRole('link', { name: /فتح الاجتماع/ }).getAttribute('href')).toBe('/dashboard/department/meeting-lounge/9')
    expect(within(screen.getByTestId('section-needs_attention')).getByRole('link', { name: /مراجعة التقارير/ }).getAttribute('href')).toBe('/dashboard/operations/meeting-reports')
  })

  it('choosing a source re-queries by that source, and a range re-queries by that range', async () => {
    renderPage()
    await screen.findByTestId('source-filters')

    await userEvent.click(within(screen.getByTestId('source-filters')).getByRole('button', { name: /التذاكر/ }))
    await waitFor(() => expect(mocked).toHaveBeenLastCalledWith({ range: 'today', source: 'tickets' }))

    await userEvent.click(screen.getByRole('button', { name: '7 أيام' }))
    await waitFor(() => expect(mocked).toHaveBeenLastCalledWith({ range: 'week', source: 'tickets' }))
    expect(screen.getByRole('button', { name: '7 أيام' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('quick search narrows the items shown without another request', async () => {
    renderPage()
    await screen.findByTestId('section-needs_attention')
    const calls = mocked.mock.calls.length

    await userEvent.type(screen.getByRole('searchbox'), 'اجتماع المتابعة')

    const needs = screen.getByTestId('section-needs_attention')
    expect(within(needs).getAllByTestId('command-center-item')).toHaveLength(1)
    expect(within(screen.getByTestId('section-errors')).getByText('لا توجد نتائج مطابقة للبحث.')).toBeTruthy()
    expect(mocked.mock.calls.length).toBe(calls)
  })

  it('refresh re-fetches', async () => {
    renderPage()
    await screen.findByTestId('section-errors')

    await userEvent.click(screen.getByRole('button', { name: 'تحديث' }))

    await waitFor(() => expect(mocked).toHaveBeenCalledTimes(2))
  })
})

describe('states', () => {
  it('shows a loading skeleton first', () => {
    mocked.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByTestId('command-center-loading')).toBeTruthy()
  })

  it('shows an empty message per section when there is nothing', async () => {
    mocked.mockResolvedValue(data({ needs_attention: [], upcoming: [], recent_updates: [], errors: [] }))
    renderPage()

    expect(await screen.findByText('لا يوجد ما يحتاج انتباهك الآن.')).toBeTruthy()
    expect(screen.getByText('لا توجد أخطاء أو تنبيهات. كل شيء يعمل.')).toBeTruthy()
    expect(screen.getByText('لا توجد مواعيد قادمة ضمن هذه الفترة.')).toBeTruthy()
    expect(screen.getByText('لا توجد تحديثات حديثة ضمن هذه الفترة.')).toBeTruthy()
  })

  it('shows an error with a retry button, and recovers', async () => {
    mocked.mockRejectedValueOnce(httpError(500))
    renderPage()

    expect(await screen.findByText('تعذّر تحميل مركز المتابعة')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByTestId('section-errors')).toBeTruthy()
  })

  it('renders the unauthorized state on 403, with no feed and refresh disabled', async () => {
    mocked.mockRejectedValue(httpError(403))
    renderPage()

    expect(await screen.findByText('لا تملك صلاحية عرض مركز المتابعة')).toBeTruthy()
    expect(screen.queryByTestId('section-needs_attention')).toBeNull()
    expect((screen.getByRole('button', { name: 'تحديث' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('warns about unavailable sources', async () => {
    const d = data({}, {})
    d.sources = d.sources.map((s) => (s.key === 'quality' ? { ...s, available: false, unavailable: ['الجودة'] } : s))
    d.summary.sourcesActive = 6
    mocked.mockResolvedValue(d)
    renderPage()

    const health = await screen.findByTestId('source-health')
    expect(within(health).getByText('غير متاح')).toBeTruthy()
    expect(within(health).getByRole('alert').textContent).toContain('الجودة')
    expect(within(screen.getByTestId('kpi-sources')).getByText('6/7')).toBeTruthy()
  })

  it('quick links appear only for pages the viewer has access to', async () => {
    renderPage()
    await screen.findByTestId('source-health')
    expect(screen.getByText('لا توجد صفحات إضافية متاحة لحسابك.')).toBeTruthy()
  })

  it('quick links show for allowed pages', async () => {
    access.keys = new Set(['administration.email_logs'])
    renderPage()

    await screen.findByTestId('source-health')
    const quick = screen.getByRole('region', { name: 'روابط سريعة' })
    expect(within(quick).getByRole('link', { name: /سجلات البريد/ }).getAttribute('href')).toBe('/dashboard/super-admin/email-logs')
    expect(within(quick).queryByRole('link', { name: /لوحة التذاكر/ })).toBeNull()
  })

  it('the page is read-only: no form, no edit/approve/delete control', async () => {
    const { container } = renderPage()
    await screen.findByTestId('section-errors')

    for (const b of screen.getAllByRole('button')) {
      expect((b.getAttribute('aria-label') ?? b.textContent ?? '')).not.toMatch(/تعديل|حذف|اعتماد|رفض|حفظ|إرسال|إنشاء/)
    }
    expect(container.querySelector('form')).toBeNull()
  })

  it('mobile: the filter strip scrolls sideways instead of overflowing the page', async () => {
    renderPage()
    const nav = await screen.findByTestId('source-filters')

    expect(nav.className).toMatch(/overflow-x-auto/)
  })
})

describe('api client', () => {
  it('refuses any URL that is not an internal dashboard path', () => {
    for (const bad of ['https://evil.example', '//evil.example', 'javascript:alert(1)', '/etc/passwd', '/dashboard//x', '/dashboard/../x?y=1', '', null]) {
      expect(safeInternalUrl(bad)).toBe('/dashboard')
    }
    expect(safeInternalUrl('/dashboard/tickets/12')).toBe('/dashboard/tickets/12')
  })

  it('normalizes a hostile or partial payload without crashing', () => {
    const d = normalizeCommandCenter({ data: { sections: [{ key: 'needs_attention', items: [{ id: 'x', url: 'https://evil.example', priority: 'bogus', source: 'bogus', actor: 'str' }, { nope: true }] }], sources: [{ key: 'tickets', available: true }, { key: 'weird' }] } })

    expect(d.sections.map((s) => s.key)).toEqual(['needs_attention', 'upcoming', 'recent_updates', 'errors'])
    expect(d.sections[0].items).toHaveLength(1)
    expect(d.sections[0].items[0]).toMatchObject({ url: '/dashboard', priority: 'info', source: 'system', actor: null })
    expect(d.sources.map((s) => s.key)).toEqual(['tickets'])
    expect(d.summary.sourcesTotal).toBe(0)
  })
})

describe('sidebar: needs page access AND the permission', () => {
  const HREF = '/dashboard/executive/command-center'
  const row = (allowed: boolean, sources: PageAccessSource[] = ['root_authority']): EffectivePageAccessRow => ({
    key: 'executive.command_center', allowed, primarySource: (allowed ? sources[0] : 'none') as PageAccessSource, primarySourceLabelAr: '', sources: allowed ? sources : [],
    overrideState: null, protected: false, reason: '', labelAr: 'مركز المتابعة التنفيذي', category: 'administration' as never, categoryLabelAr: 'الإدارة والنظام',
    riskLevel: 'ADMIN_ONLY' as never, primaryRoute: HREF, routePatterns: [HREF],
  })
  const hrefs = (role: string, pages: EffectivePageAccessRow[], permissions: string[]) =>
    resolveSidebarNavigation({ groups: getSidebarByRole(role), pages, status: 'ready', permissions }).groups.flatMap((g) => g.items.map((i) => i.href))

  it('super_admin and tech_admin menus list it', () => {
    expect(getSidebarByRole('super_admin').flatMap((g) => g.items.map((i) => i.href))).toContain(HREF)
    expect(getSidebarByRole('tech_admin').flatMap((g) => g.items.map((i) => i.href))).toContain(HREF)
  })

  it('shows with page access and the permission', () => {
    expect(hrefs('super_admin', [row(true)], ['executive.command_center.view'])).toContain(HREF)
  })

  it('is hidden without the permission even though root page access allows the page', () => {
    expect(hrefs('tech_admin', [row(true)], [])).not.toContain(HREF)
  })

  it('is hidden without page access even with the permission', () => {
    expect(hrefs('super_admin', [row(false)], ['executive.command_center.view'])).not.toContain(HREF)
  })

  it('a granted user (page allow + permission) gets it injected into a role whose menu lacks it', () => {
    const injected = hrefs('student', [row(true, ['user_allow'])], ['executive.command_center.view'])
    expect(injected).toContain(HREF)
    expect(hrefs('student', [row(true, ['user_allow'])], [])).not.toContain(HREF)
  })
})
