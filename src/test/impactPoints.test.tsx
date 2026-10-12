import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import ImpactPointsPage from '@/pages/operations/ImpactPointsPage'
import ImpactSparkWidget from '@/components/operations/ImpactSparkWidget'
import type { PointsCapabilities, PointsMember, PointsMembersPage } from '@/api/volunteerPointsApi'

/**
 * Impact Points — one page, two experiences, decided only by the SERVER's
 * capabilities. A member sees their own score, level and history; authorized
 * staff additionally see the people who received points, per-person history,
 * and can award or adjust. Nothing management-related renders without the
 * matching capability, and a failure never leaves an endless skeleton.
 */

const allowedKeys = new Set<string>()

vi.mock('@/contexts/PageAccessContext', () => ({
  usePageAccess: () => ({ canAccessKey: (key: string) => allowedKeys.has(key) }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 5, name: 'مدير الموارد' } }),
}))

const mockSummary = vi.fn()
const mockAwards = vi.fn()
const mockBoard = vi.fn()
const mockPolicy = vi.fn()
const mockRecipients = vi.fn()
const mockAward = vi.fn()
const mockMembers = vi.fn()
const mockHistory = vi.fn()
const mockAdjust = vi.fn()

vi.mock('@/api/volunteerPointsApi', () => ({
  AWARD_CATEGORIES: [{ value: 'task', label: 'مهمة' }],
  fetchMyPointsSummary: () => mockSummary(),
  fetchMyAwards: () => mockAwards(),
  fetchPointsLeaderboard: () => mockBoard(),
  fetchPointsPolicy: () => mockPolicy(),
  fetchPointRecipients: () => mockRecipients(),
  awardPoints: (input: unknown) => mockAward(input),
  fetchPointsMembers: (query: unknown) => mockMembers(query),
  fetchMemberHistory: (id: number, page?: number) => mockHistory(id, page),
  adjustMemberPoints: (id: number, input: unknown) => mockAdjust(id, input),
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('@/lib/toast', () => ({ default: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }))

const level = { id: 'volunteer', title: 'متطوع EMC', months: 0, points: 0, sadeem: 'Open Community' }
const next = { id: 'contributor', title: 'متطوع مشارك', months: 3, points: 1500, sadeem: 'Standard' }

const NONE: PointsCapabilities = { can_view_all: false, can_award: false, can_adjust: false, can_view_history: false, can_manage: false, scope: 'none' }
const HR: PointsCapabilities = { can_view_all: true, can_award: true, can_adjust: true, can_view_history: true, can_manage: true, scope: 'organization' }

const summary = (caps: PointsCapabilities) => ({
  lifetime_points: 120, available_points: 120, redeemed_points: 0, credit_eur: 1.2,
  active_months: 1, eligible_level: level, next_level: next, can_award: caps.can_award, capabilities: caps, monthly_cap: 2500,
})

const member = (over: Partial<PointsMember> = {}): PointsMember => ({
  user_id: 11, name: 'سارة العلي', department_id: 2, department: 'إدارة البرامج', role_title: 'منسقة برامج',
  month_points: 400, lifetime_points: 900, awards_count: 3, last_activity_at: '2026-10-01T10:00:00Z',
  level: { id: 'volunteer', title: 'متطوع EMC' }, is_self: false, ...over,
})

const membersPage = (rows: PointsMember[], over: Partial<PointsMembersPage> = {}): PointsMembersPage => ({
  rows, total: rows.length, perPage: 10, currentPage: 1, lastPage: 1,
  kpis: {
    total_points: 1300, members_with_points: rows.length, scope_members: 5, month_points_total: 650,
    top_contributor_month: { user_id: 11, name: 'سارة العلي', department: 'إدارة البرامج', points: 400 },
  },
  filters: { departments: [{ id: 2, name: 'إدارة البرامج' }, { id: 3, name: 'إدارة الإعلام' }], levels: [{ id: 'volunteer', title: 'متطوع EMC' }, { id: 'senior', title: 'متطوع أول' }] },
  capabilities: HR,
  ...over,
})

const SARA = member()
const KHALED = member({ user_id: 12, name: 'خالد', department: 'إدارة الإعلام', department_id: 3, role_title: 'مصمم', lifetime_points: 400, month_points: 250, awards_count: 1 })
const ME = member({ user_id: 5, name: 'مدير الموارد', role_title: 'مدير', is_self: true, lifetime_points: 120 })

const history = (entries: object[] = []) => ({
  user: { id: 11, name: 'سارة العلي', department: 'إدارة البرامج', role_title: 'منسقة برامج' },
  summary: { lifetime_points: 900, available_points: 900, redeemed_points: 0, eligible_level: level },
  entries, currentPage: 1, lastPage: 1, total: entries.length,
})

function resolveAll(caps: PointsCapabilities, rows: PointsMember[] = [SARA, KHALED]) {
  mockSummary.mockResolvedValue(summary(caps))
  mockAwards.mockResolvedValue([])
  mockBoard.mockResolvedValue([])
  mockPolicy.mockResolvedValue({ levels: [level, next], euro_per_1000: 10, monthly_cap: 2500, version: '1.0' })
  mockRecipients.mockResolvedValue([
    { user_id: 11, name: 'سارة', department_id: 2, department: 'إدارة البرامج', role_title: 'منسقة', month_points: 400, lifetime_points: 900 },
    { user_id: 12, name: 'خالد', department_id: 3, department: null, role_title: null, month_points: 0, lifetime_points: 0 },
  ])
  mockMembers.mockResolvedValue(membersPage(rows))
  mockHistory.mockResolvedValue(history())
}

const renderPage = () => render(<ImpactPointsPage />)

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Ordinary member ──────────────────────────────────────────────────────────

describe('ImpactPointsPage — member self view', () => {
  beforeEach(() => resolveAll(NONE))

  it('shows own score, level and history with no management surface', async () => {
    renderPage()

    expect(await screen.findByText('نقاط الأثر التراكمية')).toBeInTheDocument()
    expect(screen.getByText('سجل نقاطي')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'نقاط الأثر' })).toBeInTheDocument()

    expect(screen.queryByText('المستفيدون من نقاط الأثر')).not.toBeInTheDocument()
    expect(screen.queryByText('منح نقاط لأعضاء الفريق')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^منح نقاط$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /تعديل نقاط|منح نقاط لـ|سجل نقاط/ })).not.toBeInTheDocument()
  })

  it('never requests the people list or recipients without the capability', async () => {
    renderPage()
    await screen.findByText('نقاط الأثر التراكمية')

    expect(mockMembers).not.toHaveBeenCalled()
    expect(mockRecipients).not.toHaveBeenCalled()
  })

  it('explains why management actions are not available instead of hiding it silently', async () => {
    renderPage()
    expect(await screen.findByText(/متاحة لقيادة الموارد البشرية والإدارات المخوَّلة فقط/)).toBeInTheDocument()
  })

  it('shows the member\'s own ledger with kind, reason and actor', async () => {
    mockAwards.mockResolvedValue([
      { id: 1, kind: 'award', category: 'task', points: 100, reason: 'تنظيم ورشة', awarded_at: '2026-10-01T00:00:00Z', awarder: { id: 9, name: 'منى' } },
      { id: 2, kind: 'adjustment', category: 'adjustment', points: -20, reason: 'منحة مكررة', awarded_at: '2026-10-02T00:00:00Z', awarder: { id: 9, name: 'منى' } },
    ])
    renderPage()

    const section = (await screen.findByText('سجل نقاطي')).closest('section') as HTMLElement
    expect(within(section).getByText('تنظيم ورشة')).toBeInTheDocument()
    expect(within(section).getByText('تصحيح')).toBeInTheDocument()
    expect(within(section).getByText('-20')).toBeInTheDocument()
    expect(within(section).getAllByText(/منى/)).toHaveLength(2)
  })

  it('shows an error with retry instead of an endless skeleton when a request fails', async () => {
    mockBoard.mockRejectedValueOnce(new Error('403'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر تحميل نقاط الأثر')
    await userEvent.click(screen.getByRole('button', { name: /إعادة المحاولة/ }))
    expect(await screen.findByText('نقاط الأثر التراكمية')).toBeInTheDocument()
  })

  it('shows a loading state while the first request is pending', () => {
    mockSummary.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByLabelText('جارٍ التحميل')).toHaveAttribute('aria-busy', 'true')
  })

  it('does not crash on a leaderboard row whose user is missing', async () => {
    mockBoard.mockResolvedValue([
      { user: null, lifetime_points: 900 },
      { user: { id: 3, name: 'منى', role: 'volunteer' }, lifetime_points: 400 },
    ])
    renderPage()

    expect(await screen.findByText('منى')).toBeInTheDocument()
  })

  it('shows the level ladder with progress toward the next level', async () => {
    renderPage()

    expect(await screen.findByText('رحلة المتطوع — المستويات الست')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'التقدم نحو المستوى التالي' })).toHaveAttribute('aria-valuenow', '8')
  })
})

// ── Authorized staff ─────────────────────────────────────────────────────────

describe('ImpactPointsPage — HR / management view', () => {
  beforeEach(() => resolveAll(HR))

  it('renders the dashboard: KPIs, people list and side tools', async () => {
    renderPage()

    expect(await screen.findByText('المستفيدون من نقاط الأثر')).toBeInTheDocument()
    const kpis = screen.getByRole('region', { name: 'مؤشرات نقاط الأثر' })
    for (const label of ['إجمالي نقاط الأثر', 'عدد المستفيدين', 'نقاطي الحالية', 'أعلى مساهم هذا الشهر', 'النقاط الممنوحة هذا الشهر']) {
      expect(within(kpis).getByText(label)).toBeInTheDocument()
    }
    expect(within(kpis).getByText('1,300')).toBeInTheDocument()
    expect(within(kpis).getByText('650')).toBeInTheDocument()
    expect(within(kpis).getByText('سارة العلي')).toBeInTheDocument()

    expect(screen.getByText('منح نقاط لأعضاء الفريق')).toBeInTheDocument()
    expect(screen.getByText('رحلة المتطوع — المستويات الست')).toBeInTheDocument()
    expect(screen.getByText('لوحة صدارة الأثر')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^منح نقاط$/ })).toBeInTheDocument()
  })

  it('lists every person with name, department, title, points, level and last activity', async () => {
    renderPage()

    const list = (await screen.findByText('خالد')).closest('ul') as HTMLElement
    const row = within(list).getByText('سارة العلي').closest('li') as HTMLElement

    expect(within(row).getByText('إدارة البرامج')).toBeInTheDocument()
    expect(within(row).getByText('منسقة برامج')).toBeInTheDocument()
    expect(within(row).getByText('900')).toBeInTheDocument()
    expect(within(row).getByText('متطوع EMC')).toBeInTheDocument()
    expect(row.textContent).toMatch(/آخر نشاط/)
    expect(within(list).getByText('مصمم')).toBeInTheDocument()
    expect(within(list).getByText('إدارة الإعلام')).toBeInTheDocument()
  })

  it('shows history, adjust and award actions per person when the server allows them', async () => {
    renderPage()
    await screen.findByText('خالد')

    expect(screen.getByRole('button', { name: 'سجل نقاط سارة العلي' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تعديل نقاط سارة العلي' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'منح نقاط لـ سارة العلي' })).toBeInTheDocument()
  })

  it('offers no edit or award on the user\'s own row, only the history', async () => {
    mockMembers.mockResolvedValue(membersPage([ME, SARA]))
    renderPage()

    const own = (await screen.findByRole('button', { name: 'سجل نقاط مدير الموارد' })).closest('li') as HTMLElement
    expect(within(own).getByText('أنت')).toBeInTheDocument()
    expect(within(own).getByRole('button', { name: /سجل نقاط/ })).toBeInTheDocument()
    expect(within(own).queryByRole('button', { name: /تعديل نقاط/ })).not.toBeInTheDocument()
    expect(within(own).queryByRole('button', { name: /منح نقاط/ })).not.toBeInTheDocument()
  })

  it('renders only the actions the capabilities grant', async () => {
    const readOnly: PointsCapabilities = { ...HR, can_adjust: false, can_award: false, can_manage: false }
    mockSummary.mockResolvedValue(summary(readOnly))
    renderPage()
    await screen.findByText('خالد')

    expect(screen.getByRole('button', { name: 'سجل نقاط سارة العلي' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /تعديل نقاط/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /منح نقاط لـ/ })).not.toBeInTheDocument()
    expect(screen.queryByText('منح نقاط لأعضاء الفريق')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^منح نقاط$/ })).not.toBeInTheDocument()
  })

  it('lists only the server-provided recipients in the award form, with department and title', async () => {
    renderPage()
    const picker = await screen.findByRole('combobox', { name: 'العضو المستحق' })
    await waitFor(() => expect(within(picker).getAllByRole('option')).toHaveLength(3))

    const labels = within(picker).getAllByRole('option').map((o) => o.textContent)
    expect(labels).toContain('سارة — إدارة البرامج — منسقة')
    expect(labels).toContain('خالد — بدون إدارة')
  })

  it('shows the remaining monthly cap for the chosen member', async () => {
    renderPage()
    const picker = await screen.findByRole('combobox', { name: 'العضو المستحق' })
    await waitFor(() => expect(within(picker).getAllByRole('option')).toHaveLength(3))
    await userEvent.selectOptions(picker, '11')

    expect(screen.getByText(/المتبقي من سقف هذا الشهر/)).toHaveTextContent('2,100')
  })

  it('submits an award for the chosen recipient and refreshes the list', async () => {
    mockAward.mockResolvedValue({ id: 1 })
    renderPage()
    const picker = await screen.findByRole('combobox', { name: 'العضو المستحق' })
    await waitFor(() => expect(within(picker).getAllByRole('option')).toHaveLength(3))
    const callsBefore = mockMembers.mock.calls.length

    await userEvent.selectOptions(picker, '11')
    await userEvent.type(screen.getByRole('spinbutton', { name: 'عدد النقاط' }), '150')
    await userEvent.type(screen.getByRole('textbox', { name: 'سبب المنح' }), 'تنظيم ورشة')
    await userEvent.click(screen.getByRole('button', { name: /امنح النقاط/ }))

    await waitFor(() => expect(mockAward).toHaveBeenCalledWith({ user_id: 11, category: 'task', points: 150, reason: 'تنظيم ورشة' }))
    await waitFor(() => expect(mockMembers.mock.calls.length).toBeGreaterThan(callsBefore))
  })

  it('a row\'s award button picks that member in the award form', async () => {
    renderPage()
    const picker = await screen.findByRole('combobox', { name: 'العضو المستحق' })
    await waitFor(() => expect(within(picker).getAllByRole('option')).toHaveLength(3))

    await userEvent.click(await screen.findByRole('button', { name: 'منح نقاط لـ سارة العلي' }))

    expect(picker).toHaveValue('11')
  })

  it('explains an empty award scope instead of offering an unusable form', async () => {
    mockRecipients.mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('لا يوجد أعضاء فريق ضمن نطاق صلاحيتك حالياً.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /امنح النقاط/ })).toBeDisabled()
  })
})

// ── History drawer ───────────────────────────────────────────────────────────

describe('ImpactPointsPage — history drawer', () => {
  beforeEach(() => resolveAll(HR))

  it('opens the person\'s ledger with amount, reason, kind, actor, date and the internal note', async () => {
    mockHistory.mockResolvedValue(history([
      { id: 1, kind: 'award', category: 'task', points: 100, reason: 'تنظيم ورشة', note: null, awarded_at: '2026-10-01T10:00:00Z', awarder: { id: 9, name: 'منى' } },
      { id: 2, kind: 'adjustment', category: 'adjustment', points: -30, reason: 'منحة مكررة', note: 'تأكدت من المحضر', awarded_at: '2026-10-02T10:00:00Z', awarder: { id: 9, name: 'منى' } },
    ]))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'سجل نقاط سارة العلي' }))

    const drawer = await screen.findByRole('dialog', { name: 'سجل نقاط سارة العلي' })
    expect(mockHistory).toHaveBeenCalledWith(11, 1)
    expect(await within(drawer).findByText('تنظيم ورشة')).toBeInTheDocument()
    expect(within(drawer).getByText('+100')).toBeInTheDocument()
    expect(within(drawer).getByText('-30')).toBeInTheDocument()
    expect(within(drawer).getByText('منحة')).toBeInTheDocument()
    expect(within(drawer).getByText('تصحيح')).toBeInTheDocument()
    expect(within(drawer).getAllByText(/بواسطة منى/)).toHaveLength(2)
    expect(within(drawer).getByText(/تأكدت من المحضر/)).toBeInTheDocument()
    expect(within(drawer).getByText('إدارة البرامج — منسقة برامج')).toBeInTheDocument()
  })

  it('shows no internal-note block when the server did not send one', async () => {
    mockHistory.mockResolvedValue(history([{ id: 1, kind: 'award', category: 'task', points: 10, reason: 'سبب', awarded_at: '2026-10-01T00:00:00Z', awarder: null }]))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'سجل نقاط سارة العلي' }))
    const drawer = await screen.findByRole('dialog')
    await within(drawer).findByText('سبب')

    expect(within(drawer).queryByText(/ملاحظة داخلية/)).not.toBeInTheDocument()
    expect(within(drawer).getByText(/بواسطة النظام/)).toBeInTheDocument()
  })

  it('closes with the close button and with Escape', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'سجل نقاط سارة العلي' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'إغلاق' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'سجل نقاط سارة العلي' }))
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows an empty state and a retryable error state', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'سجل نقاط سارة العلي' }))
    expect(await screen.findByText('لا توجد حركات نقاط لهذا العضو بعد.')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    mockHistory.mockRejectedValueOnce(new Error('500'))
    await userEvent.click(screen.getByRole('button', { name: 'سجل نقاط سارة العلي' }))
    const drawer = await screen.findByRole('dialog')
    expect(await within(drawer).findByRole('alert')).toHaveTextContent('تعذر تحميل السجل')

    mockHistory.mockResolvedValue(history([{ id: 1, kind: 'award', category: 'task', points: 5, reason: 'عاد', awarded_at: '2026-10-01T00:00:00Z' }]))
    await userEvent.click(within(drawer).getByRole('button', { name: /إعادة المحاولة/ }))
    expect(await within(drawer).findByText('عاد')).toBeInTheDocument()
  })

  it('loads more entries when the history has another page', async () => {
    mockHistory
      .mockResolvedValueOnce({ ...history([{ id: 1, kind: 'award', category: 'task', points: 5, reason: 'الأولى', awarded_at: '2026-10-01T00:00:00Z' }]), currentPage: 1, lastPage: 2 })
      .mockResolvedValueOnce({ ...history([{ id: 2, kind: 'award', category: 'task', points: 7, reason: 'الثانية', awarded_at: '2026-09-01T00:00:00Z' }]), currentPage: 2, lastPage: 2 })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'سجل نقاط سارة العلي' }))
    const drawer = await screen.findByRole('dialog')
    await within(drawer).findByText('الأولى')
    await userEvent.click(within(drawer).getByRole('button', { name: 'عرض المزيد' }))

    expect(await within(drawer).findByText('الثانية')).toBeInTheDocument()
    expect(within(drawer).getByText('الأولى')).toBeInTheDocument()
    expect(mockHistory).toHaveBeenLastCalledWith(11, 2)
  })
})

// ── Adjustment modal ─────────────────────────────────────────────────────────

describe('ImpactPointsPage — adjust points', () => {
  beforeEach(() => resolveAll(HR))

  async function openAdjust() {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'تعديل نقاط سارة العلي' }))
    return screen.findByRole('dialog', { name: 'تعديل نقاط الأثر' })
  }

  it('shows the person, current points and a clear warning that nothing is overwritten', async () => {
    const dialog = await openAdjust()

    expect(within(dialog).getByText(/سارة العلي/)).toBeInTheDocument()
    expect(within(dialog).getByText('900')).toBeInTheDocument()
    expect(within(dialog).getByText(/لا يمكن تعديله أو حذفه لاحقاً/)).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: /إضافة نقاط/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('requires a reason and a valid amount before sending anything', async () => {
    const dialog = await openAdjust()

    await userEvent.click(within(dialog).getByRole('button', { name: 'تأكيد التعديل' }))
    expect(within(dialog).getByText(/أدخل عدداً صحيحاً/)).toBeInTheDocument()
    expect(within(dialog).getByText(/السبب إلزامي/)).toBeInTheDocument()
    expect(mockAdjust).not.toHaveBeenCalled()

    await userEvent.type(within(dialog).getByLabelText('عدد النقاط'), '50')
    await userEvent.type(within(dialog).getByLabelText(/^السبب/), 'ab')
    await userEvent.click(within(dialog).getByRole('button', { name: 'تأكيد التعديل' }))
    expect(within(dialog).getByText(/السبب إلزامي/)).toBeInTheDocument()
    expect(mockAdjust).not.toHaveBeenCalled()
  })

  it('rejects a zero, negative, fractional or oversized amount', async () => {
    const dialog = await openAdjust()
    await userEvent.type(within(dialog).getByLabelText(/^السبب/), 'سبب كاف')

    for (const bad of ['0', '-5', '1.5', '5001']) {
      const field = within(dialog).getByLabelText('عدد النقاط')
      await userEvent.clear(field)
      await userEvent.type(field, bad)
      await userEvent.click(within(dialog).getByRole('button', { name: 'تأكيد التعديل' }))
      expect(within(dialog).getByText(/أدخل عدداً صحيحاً/)).toBeInTheDocument()
    }
    expect(mockAdjust).not.toHaveBeenCalled()
  })

  it('adds points with a reason and an optional internal note, then refreshes', async () => {
    mockAdjust.mockResolvedValue({ entry: { id: 9 }, total_before: 900, total_after: 1000 })
    const dialog = await openAdjust()
    const callsBefore = mockMembers.mock.calls.length

    await userEvent.type(within(dialog).getByLabelText('عدد النقاط'), '100')
    expect(within(dialog).getByText(/الرصيد بعد التعديل/)).toHaveTextContent('1,000')
    await userEvent.type(within(dialog).getByLabelText(/^السبب/), 'تعويض عن حضور غير مسجل')
    await userEvent.type(within(dialog).getByLabelText(/ملاحظة داخلية/), 'راجعت المحضر')
    await userEvent.click(within(dialog).getByRole('button', { name: 'تأكيد التعديل' }))

    await waitFor(() => expect(mockAdjust).toHaveBeenCalledWith(11, { direction: 'add', points: 100, reason: 'تعويض عن حضور غير مسجل', note: 'راجعت المحضر' }))
    expect(toastSuccess).toHaveBeenCalledWith('سُجِّل التعديل في سجل النقاط')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(mockMembers.mock.calls.length).toBeGreaterThan(callsBefore))
  })

  it('subtracts points as a correction', async () => {
    mockAdjust.mockResolvedValue({ entry: { id: 9 }, total_before: 900, total_after: 800 })
    const dialog = await openAdjust()

    await userEvent.click(within(dialog).getByRole('radio', { name: /خصم/ }))
    await userEvent.type(within(dialog).getByLabelText('عدد النقاط'), '100')
    await userEvent.type(within(dialog).getByLabelText(/^السبب/), 'منحة مكررة')
    await userEvent.click(within(dialog).getByRole('button', { name: 'تأكيد التعديل' }))

    await waitFor(() => expect(mockAdjust).toHaveBeenCalledWith(11, { direction: 'subtract', points: 100, reason: 'منحة مكررة', note: undefined }))
  })

  it('warns when a deduction would take the balance below zero', async () => {
    const dialog = await openAdjust()

    await userEvent.click(within(dialog).getByRole('radio', { name: /خصم/ }))
    await userEvent.type(within(dialog).getByLabelText('عدد النقاط'), '1000')

    expect(within(dialog).getByText(/لن يقبل الخادم رصيداً سالباً/)).toBeInTheDocument()
  })

  it('shows the server\'s own message and stays open when the server refuses', async () => {
    const { AxiosError } = await import('axios')
    mockAdjust.mockRejectedValue(new AxiosError('x', '422', undefined, undefined, {
      status: 422, statusText: '', headers: {}, config: {} as never, data: { message: 'لا يمكن خصم 100 نقطة: الرصيد التراكمي 50' },
    }))
    const dialog = await openAdjust()

    await userEvent.type(within(dialog).getByLabelText('عدد النقاط'), '100')
    await userEvent.type(within(dialog).getByLabelText(/^السبب/), 'سبب كاف')
    await userEvent.click(within(dialog).getByRole('button', { name: 'تأكيد التعديل' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('لا يمكن خصم 100 نقطة')
    expect(screen.getByRole('dialog', { name: 'تعديل نقاط الأثر' })).toBeInTheDocument()
  })

  it('closes with cancel without sending anything', async () => {
    const dialog = await openAdjust()

    await userEvent.click(within(dialog).getByRole('button', { name: 'إلغاء' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockAdjust).not.toHaveBeenCalled()
  })
})

// ── Search, filters, sort, pagination, states ────────────────────────────────

describe('ImpactPointsPage — people list controls and states', () => {
  beforeEach(() => resolveAll(HR))

  it('searches by name, department or title (debounced) through the server', async () => {
    renderPage()
    await userEvent.type(await screen.findByRole('searchbox', { name: 'بحث عن عضو' }), 'سارة')

    await waitFor(() => expect(mockMembers).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'سارة', page: 1 })))
  })

  it('filters by department and level and changes the sort', async () => {
    renderPage()
    await screen.findByText('خالد')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'الإدارة' }), '3')
    await waitFor(() => expect(mockMembers).toHaveBeenLastCalledWith(expect.objectContaining({ department_id: 3 })))

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'المستوى' }), 'senior')
    await waitFor(() => expect(mockMembers).toHaveBeenLastCalledWith(expect.objectContaining({ department_id: 3, level: 'senior' })))

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'الترتيب' }), 'recent')
    await waitFor(() => expect(mockMembers).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'recent' })))
  })

  it('paginates and keeps the filters', async () => {
    mockMembers.mockResolvedValue(membersPage([SARA], { total: 25, lastPage: 3, currentPage: 1 }))
    renderPage()
    await screen.findByRole('button', { name: 'سجل نقاط سارة العلي' })

    expect(screen.getByText('صفحة 1 من 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /السابق/ })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /التالي/ }))

    await waitFor(() => expect(mockMembers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))
  })

  it('shows the "no points yet" empty state', async () => {
    mockMembers.mockResolvedValue(membersPage([], { total: 0 }))
    renderPage()

    expect(await screen.findByText('لا توجد نقاط ممنوحة بعد')).toBeInTheDocument()
  })

  it('shows "no results" for a search and clears the filters', async () => {
    renderPage()
    await screen.findByText('خالد')

    mockMembers.mockResolvedValue(membersPage([], { total: 0 }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'بحث عن عضو' }), 'لا أحد')

    expect(await screen.findByText('لا نتائج مطابقة')).toBeInTheDocument()

    mockMembers.mockResolvedValue(membersPage([SARA, KHALED]))
    await userEvent.click(screen.getByRole('button', { name: 'مسح الفلاتر' }))

    expect(await screen.findByText('خالد')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'بحث عن عضو' })).toHaveValue('')
  })

  it('shows a retryable error when the list fails, without hiding the rest of the page', async () => {
    mockMembers.mockRejectedValueOnce(new Error('500'))
    renderPage()

    const alert = await screen.findByText('تعذر تحميل قائمة المستفيدين')
    expect(alert).toBeInTheDocument()
    expect(screen.getByText('نقاطي الحالية')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /إعادة المحاولة/ }))
    expect(await screen.findByText('خالد')).toBeInTheDocument()
  })

  it('shows a skeleton while the list loads', async () => {
    mockMembers.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(await screen.findByLabelText('جارٍ تحميل القائمة')).toHaveAttribute('aria-busy', 'true')
  })

  it('collapses the filters behind a toggle for small screens', async () => {
    renderPage()
    await screen.findByText('خالد')

    const toggle = screen.getByRole('button', { name: /تصفية/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('renders the same rows once (cards and table share one layout) and stays right-to-left', async () => {
    const { container } = renderPage()
    await screen.findByText('خالد')

    expect(screen.getAllByText('سارة العلي')).toHaveLength(2) // KPI top contributor + the row
    expect(within(screen.getByText('خالد').closest('ul') as HTMLElement).getAllByRole('listitem')).toHaveLength(2)
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull()
  })

  it('does not crash on a member with no department, title or activity', async () => {
    mockMembers.mockResolvedValue(membersPage([member({ user_id: 20, name: 'بلا بيانات', department: null, role_title: null, last_activity_at: null, lifetime_points: 0, awards_count: 0 })]))
    renderPage()

    expect(await screen.findByText('بلا بيانات')).toBeInTheDocument()
    expect(screen.getByText('بدون إدارة')).toBeInTheDocument()
    expect(screen.getByText('بدون مسمى')).toBeInTheDocument()
  })
})

// ── Older server without the capabilities object ─────────────────────────────

describe('ImpactPointsPage — capability fallback', () => {
  it('a server that only reports can_award enables the award form but nothing else', async () => {
    resolveAll(NONE)
    mockSummary.mockResolvedValue({ ...summary(NONE), capabilities: undefined, can_award: true })
    renderPage()

    expect(await screen.findByText('منح نقاط لأعضاء الفريق')).toBeInTheDocument()
    expect(screen.queryByText('المستفيدون من نقاط الأثر')).not.toBeInTheDocument()
    expect(mockMembers).not.toHaveBeenCalled()
  })
})

describe('ImpactSparkWidget', () => {
  beforeEach(() => allowedKeys.clear())

  it('is hidden when the page-access manifest does not allow the page', () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><ImpactSparkWidget /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: /نقاط أثر EMC/ })).not.toBeInTheDocument()
  })

  it('links to the page when the manifest allows it', () => {
    allowedKeys.add('operations.impact_points')
    render(<MemoryRouter initialEntries={['/dashboard']}><ImpactSparkWidget /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /نقاط أثر EMC/ })).toHaveAttribute('href', '/dashboard/operations/impact-points')
  })
})
