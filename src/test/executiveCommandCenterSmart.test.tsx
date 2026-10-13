import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import ExecutiveCommandCenterPage from '@/pages/executive/ExecutiveCommandCenterPage'
import {
  fetchCommandCenter,
  normalizeCommandCenter,
  type CommandCenterData,
  type CommandCenterItem,
  type CommandCenterSectionKey,
} from '@/api/executiveCommandCenterApi'

vi.mock('@/api/executiveCommandCenterApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/executiveCommandCenterApi')>()
  return { ...actual, fetchCommandCenter: vi.fn() }
})

vi.mock('@/contexts/PageAccessContext', () => ({
  usePageAccess: () => ({ status: 'ready', pages: [], allowedKeys: new Set<string>(), isReady: true, canAccessKey: () => false, canAccessPath: () => true, pageForPath: () => null, refresh: async () => {} }),
}))

const mocked = vi.mocked(fetchCommandCenter)

function alert(over: Partial<CommandCenterItem> & { score?: number } = {}): CommandCenterItem {
  const { score = 85, ...rest } = over
  return {
    id: 'smart-ticket_unassigned_too_long-ticket-123', source: 'smart_rules', type: 'operational_alert', title: 'تذكرة بدون مكلف',
    description: 'لم يُعيَّن لهذه التذكرة مكلف منذ 6 ساعات.', status: null, statusLabel: null, priority: 'high', priorityLabel: 'عاجل',
    timestamp: new Date(Date.now() - 6 * 3600_000).toISOString(), dueAt: null, actor: null, url: '/dashboard/tickets/123', actionLabel: 'فتح التذكرة',
    badge: 'تنبيه ذكي', module: 'tickets',
    smart: { ruleKey: 'ticket_unassigned_too_long', priorityScore: score, detectedAt: new Date().toISOString(), suggestedAction: 'راجع التذكرة وعيّنها للفريق المناسب.', relatedEntity: { type: 'ticket', id: '123', title: 'لا يعمل الدخول' } },
    ...rest,
  }
}

const critical = () => alert({
  id: 'smart-repeated_email_failure_type-email_type-welcome', title: 'تكرار فشل بريد: بريد الترحيب', description: 'فشل إرسال هذا النوع 12 مرات.', priority: 'critical', priorityLabel: 'حرج',
  module: 'email', url: '/dashboard/super-admin/email-settings', actionLabel: 'فتح إعدادات البريد', score: 99,
  smart: { ruleKey: 'repeated_email_failure_type', priorityScore: 99, detectedAt: null, suggestedAction: 'افحص إعدادات البريد أو القالب المرتبط بهذا النوع.', relatedEntity: null },
})

const plain = (): CommandCenterItem => ({
  id: 'users_new-all', source: 'users', module: 'users', type: 'users_new', title: '3 مستخدمين جدد', description: 'حسابات أُنشئت.', status: null, statusLabel: null, priority: 'info', priorityLabel: 'معلومة',
  timestamp: new Date().toISOString(), dueAt: null, actor: null, url: '/dashboard/super-admin/crud/users', actionLabel: 'عرض المستخدمين', badge: null, smart: null,
})

function data(lists: Partial<Record<CommandCenterSectionKey, CommandCenterItem[]>> = {}, extra: Partial<CommandCenterData> = {}): CommandCenterData {
  const l: Record<CommandCenterSectionKey, CommandCenterItem[]> = { needs_attention: [critical(), alert()], upcoming: [], recent_updates: [plain()], errors: [], ...lists }
  const titles: Record<CommandCenterSectionKey, string> = { needs_attention: 'يحتاج انتباه الآن', upcoming: 'القادم', recent_updates: 'آخر التحديثات', errors: 'مشاكل وتنبيهات' }
  const labels = { smart_rules: 'التنبيهات الذكية', tickets: 'التذاكر', meetings: 'الاجتماعات', education: 'التعليم', finance: 'المالية', hr: 'الموارد البشرية', quality: 'الجودة', email: 'البريد', users: 'المستخدمون', system: 'النظام' } as const
  return {
    meta: { generatedAt: '2026-10-13T18:00:00+00:00', range: 'today', source: 'all', priority: 'all', timezone: 'Europe/Amsterdam' },
    summary: { needs_attention: l.needs_attention.length, upcoming: 0, recent_updates: l.recent_updates.length, errors: l.errors.length, sourcesActive: 10, sourcesTotal: 10, smartAlerts: l.needs_attention.filter((i) => i.smart).length },
    sections: (Object.keys(titles) as CommandCenterSectionKey[]).map((k) => ({ key: k, title: titles[k], total: l[k].length, items: l[k] })),
    sources: (Object.keys(labels) as (keyof typeof labels)[]).map((k) => ({ key: k, label: labels[k], available: true, count: 1, unavailable: [] })),
    smartRules: [],
    capabilities: { canView: true, canRefresh: true, readOnly: true },
    ...extra,
  }
}

const renderPage = () => render(<MemoryRouter><ExecutiveCommandCenterPage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  mocked.mockResolvedValue(data())
})

describe('smart alerts in the command center', () => {
  it('renders a smart alert with the «تنبيه ذكي» badge and its area', async () => {
    renderPage()
    const sec = await screen.findByTestId('section-needs_attention')
    const card = within(sec).getAllByTestId('command-center-item').find((c) => c.getAttribute('data-smart') === 'true' && c.textContent?.includes('تذكرة بدون مكلف'))!

    expect(within(card).getByText('تنبيه ذكي')).toBeTruthy()
    expect(within(card).getByText('التذاكر')).toBeTruthy()
    expect(within(card).getByText('تذكرة بدون مكلف')).toBeTruthy()
    expect(within(card).getByText('لم يُعيَّن لهذه التذكرة مكلف منذ 6 ساعات.')).toBeTruthy()
  })

  it('shows the severity badge with the new Arabic scale', async () => {
    mocked.mockResolvedValue(data({ needs_attention: [critical(), alert(), alert({ id: 'm', priority: 'medium', priorityLabel: 'مهم' }), alert({ id: 'l', priority: 'low', priorityLabel: 'متوسط' }), alert({ id: 'i', priority: 'info', priorityLabel: 'معلومة' })] }))
    renderPage()
    const sec = await screen.findByTestId('section-needs_attention')

    for (const label of ['حرج', 'عاجل', 'مهم', 'متوسط', 'معلومة']) {
      expect(within(sec).getAllByText(label).length).toBeGreaterThan(0)
    }
  })

  it('shows the suggested action', async () => {
    renderPage()
    const sec = await screen.findByTestId('section-needs_attention')

    const boxes = within(sec).getAllByTestId('suggested-action')
    expect(boxes[0].textContent).toContain('الإجراء المقترح')
    expect(boxes.map((b) => b.textContent).join(' ')).toContain('راجع التذكرة وعيّنها للفريق المناسب.')
  })

  it('shows the priority score on smart alerts only', async () => {
    renderPage()
    const sec = await screen.findByTestId('section-needs_attention')

    expect(within(sec).getAllByTestId('priority-score').map((s) => s.textContent)).toEqual(expect.arrayContaining(['85/100', '99/100']))
    const recent = screen.getByTestId('section-recent_updates')
    expect(within(recent).queryByTestId('priority-score')).toBeNull()
    expect(within(recent).queryByText('تنبيه ذكي')).toBeNull()
  })

  it('a missing or out-of-range score is clamped or hidden safely', () => {
    const d = normalizeCommandCenter({ data: { sections: [{ key: 'needs_attention', items: [
      { id: 'a', type: 'operational_alert', rule_key: 'x', source: 'smart_rules', module: 'tickets', priority: 'high', priority_score: 250, url: '/dashboard/tickets/1' },
      { id: 'b', type: 'operational_alert', rule_key: 'y', source: 'smart_rules', module: 'weird', priority: 'high', url: '/dashboard/tickets/2' },
    ] }] } })

    expect(d.sections[0].items[0].smart?.priorityScore).toBe(100)
    expect(d.sections[0].items[1].smart?.priorityScore).toBe(0)
    expect(d.sections[0].items[1].module).toBe('smart_rules')
  })

  it('critical alerts come first in «يحتاج انتباه الآن», as the server ordered them', async () => {
    renderPage()
    const sec = await screen.findByTestId('section-needs_attention')

    const order = within(sec).getAllByTestId('command-center-item').map((c) => c.getAttribute('data-priority'))
    expect(order).toEqual(['critical', 'high'])
  })

  it('the «التنبيهات الذكية» chip asks the server for smart alerts only', async () => {
    renderPage()
    await screen.findByTestId('source-filters')

    await userEvent.click(within(screen.getByTestId('source-filters')).getByRole('button', { name: /التنبيهات الذكية/ }))

    await waitFor(() => expect(mocked).toHaveBeenLastCalledWith({ range: 'today', source: 'smart_rules' }))
  })

  it('the area chips (e.g. البريد، المستخدمون) re-query by that area', async () => {
    renderPage()
    await screen.findByTestId('source-filters')

    await userEvent.click(within(screen.getByTestId('source-filters')).getByRole('button', { name: /البريد/ }))
    await waitFor(() => expect(mocked).toHaveBeenLastCalledWith({ range: 'today', source: 'email' }))
    await userEvent.click(within(screen.getByTestId('source-filters')).getByRole('button', { name: /المستخدمون/ }))
    await waitFor(() => expect(mocked).toHaveBeenLastCalledWith({ range: 'today', source: 'users' }))
  })

  it('no smart alerts is a normal page, not an error', async () => {
    mocked.mockResolvedValue(data({ needs_attention: [], errors: [] }))
    renderPage()

    expect(await screen.findByText('لا يوجد ما يحتاج انتباهك الآن.')).toBeTruthy()
    expect(screen.queryByTestId('priority-score')).toBeNull()
    expect(screen.getByTestId('kpi-needs_attention')).toBeTruthy()
  })

  it('warns when smart rules are unavailable and lists the inactive ones', async () => {
    const d = data()
    d.sources = d.sources.map((s) => (s.key === 'smart_rules' ? { ...s, available: false, unavailable: ['طلب موارد بشرية معلق'] } : s))
    d.summary.sourcesActive = 9
    d.smartRules = [
      { key: 'hr_request_pending_too_long', label: 'طلب موارد بشرية معلق', module: 'hr', status: 'failed', count: 0 },
      { key: 'new_meeting_report_needs_quality_review', label: 'تقرير اجتماع بانتظار مراجعة الجودة', module: 'quality', status: 'skipped', count: 0 },
    ]
    mocked.mockResolvedValue(d)
    renderPage()

    const health = await screen.findByTestId('source-health')
    expect(within(health).getByRole('alert').textContent).toContain('طلب موارد بشرية معلق')
    expect(within(health).getByTestId('inactive-rules').textContent).toContain('تقرير اجتماع بانتظار مراجعة الجودة')
    expect(within(screen.getByTestId('kpi-sources')).getByText('9/10')).toBeTruthy()
  })

  it('the action button links to the alert\'s internal URL', async () => {
    renderPage()
    const sec = await screen.findByTestId('section-needs_attention')

    expect(within(sec).getByRole('link', { name: /فتح التذكرة/ }).getAttribute('href')).toBe('/dashboard/tickets/123')
    expect(within(sec).getByRole('link', { name: /فتح إعدادات البريد/ }).getAttribute('href')).toBe('/dashboard/super-admin/email-settings')
  })

  it('a hostile alert URL cannot become a link off the dashboard', () => {
    const d = normalizeCommandCenter({ data: { sections: [{ key: 'needs_attention', items: [{ id: 'x', type: 'operational_alert', rule_key: 'r', source: 'smart_rules', url: 'https://evil.example/phish' }] }] } })

    expect(d.sections[0].items[0].url).toBe('/dashboard')
  })

  it('stays right-to-left and lets the chips scroll on a narrow screen', async () => {
    const { container } = renderPage()
    const nav = await screen.findByTestId('source-filters')

    expect(container.querySelector('[dir="rtl"]')).not.toBeNull()
    expect(nav.className).toMatch(/overflow-x-auto/)
  })

  it('normalizes the smart fields of a server payload', () => {
    const d = normalizeCommandCenter({ data: {
      summary: { smart_alerts: 3 },
      smart_rules: [{ key: 'a', label: 'A', module: 'tickets', status: 'ok', count: 2 }, { key: 'b', label: 'B', module: 'hr', status: 'weird', count: 'x' }],
      sections: [{ key: 'needs_attention', items: [{ id: 'a', type: 'operational_alert', rule_key: 'ticket_overdue', source: 'smart_rules', module: 'tickets', priority: 'critical', priority_label: 'حرج', priority_score: 94, detected_at: '2026-10-13T10:00:00Z', suggested_action: 'راجع', related_entity: { type: 'ticket', id: 5, title: 'T' }, url: '/dashboard/tickets/5' }] }],
    } })

    expect(d.summary.smartAlerts).toBe(3)
    expect(d.smartRules.map((r) => r.status)).toEqual(['ok', 'ok'])
    expect(d.sections[0].items[0].smart).toEqual({ ruleKey: 'ticket_overdue', priorityScore: 94, detectedAt: '2026-10-13T10:00:00Z', suggestedAction: 'راجع', relatedEntity: { type: 'ticket', id: '5', title: 'T' } })
  })
})
