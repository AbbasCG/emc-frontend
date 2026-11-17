import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import HrVolunteersPage from '@/pages/hr/HrVolunteersPage'
import VolunteerDetailDrawer from '@/components/operations/VolunteerDetailDrawer'
import * as hubApi from '@/api/volunteersHubApi'
import type { VolunteerActivityItem, VolunteerHubItem, VolunteerHubSummary, VolunteerProfile } from '@/api/volunteersHubApi'
import type { VolunteerRequest } from '@/api/volunteerApplicationApi'
import { withoutAccountMessage } from '@/utils/volunteerMessages'
import { formatDateTime } from '@/utils/dateTime'
import { axeCheck } from './axe'

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, role: 'hr_manager' } }) }))
vi.mock('@/api/volunteersHubApi', async (importActual) => {
  const actual = await importActual<typeof import('@/api/volunteersHubApi')>()
  return {
    ...actual,
    fetchVolunteersHub: vi.fn(),
    fetchVolunteerPointsLedger: vi.fn(),
    fetchVolunteerProfile: vi.fn(),
    fetchVolunteerActivity: vi.fn(),
    fetchVolunteerWeeklyRatings: vi.fn(),
  }
})

const fetchHub = vi.mocked(hubApi.fetchVolunteersHub)
const fetchLedger = vi.mocked(hubApi.fetchVolunteerPointsLedger)
const fetchProfile = vi.mocked(hubApi.fetchVolunteerProfile)
const fetchActivity = vi.mocked(hubApi.fetchVolunteerActivity)
const fetchRatings = vi.mocked(hubApi.fetchVolunteerWeeklyRatings)

const DEPARTMENTS = [
  { id: 1, name: 'الإعلام والتسويق' },
  { id: 2, name: 'التقنية' },
]

function vol(id: number, over: Partial<VolunteerHubItem> = {}): VolunteerHubItem {
  return {
    id,
    user_id: 100 + id,
    name: `متطوع ${id}`,
    email: `v${id}@example.com`,
    avatar: null,
    department_id: 1,
    department_name: 'الإعلام والتسويق',
    is_leader: false,
    status: 'active',
    hours_logged: 10,
    actual_points: 50,
    used_points: 10,
    balance: 40,
    last_weekly_rating: null,
    created_at: '2026-01-01',
    ...over,
  }
}

function summary(over: Partial<VolunteerHubSummary> = {}): VolunteerHubSummary {
  return {
    total_volunteers: 0,
    total_actual_points: 0,
    total_used_points: 0,
    total_balance: 0,
    status_counts: { active: 0, inactive: 0, on_leave: 0, withdrawn: 0 },
    without_account: 0,
    ...over,
  }
}

function hubResponse(volunteers: VolunteerHubItem[], sum: Partial<VolunteerHubSummary> = {}) {
  return { volunteers, departments: DEPARTMENTS, summary: summary({ total_volunteers: volunteers.length, ...sum }) }
}

function profileFixture(over: Partial<VolunteerProfile> = {}, request: Partial<VolunteerRequest> | null = {}): VolunteerProfile {
  return {
    volunteer: {
      id: 7, user_id: 107, name: 'متطوع 7', email: 'v7@example.com', phone: '+967 770000007', status: 'active', department_id: 1, department_name: 'الإعلام والتسويق',
      hours_logged: 10, created_at: '2026-01-01',
      account: { has_account: true, email_verified: true, must_change_password: true, created_at: '2026-02-03T08:00:00Z' },
    },
    request: request === null ? null : {
      id: 70, full_name: 'متطوع 7', email: 'v7@example.com', status: 'converted_to_member', is_converted: true, gender: 'female', city: 'عدن', country: 'اليمن',
      languages: ['العربية', 'الفرنسية'], professional_bio: 'نبذة المتطوع السابعة', linkedin_url: 'https://www.linkedin.com/in/v7',
      professional_profile_consent: false, motivation_ratings: { m1: 4 }, personal_skills: ['حل المشكلات'], admin_notes: 'ملاحظة داخلية', ...request,
    },
    source: 'volunteer_request',
    team_profile: null,
    ...over,
  }
}

function event(over: Partial<VolunteerActivityItem> = {}): VolunteerActivityItem {
  return { id: 'e1', type: 'request_submitted', title: 'قدّم طلب التطوع', description: null, occurred_at: '2026-10-01T10:00:00Z', date_formatted: '2026-10-01', actor_name: null, meta: {}, ...over }
}

const renderPage = () => render(<MemoryRouter><HrVolunteersPage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('withoutAccountMessage', () => {
  it('agrees with the number in Arabic', () => {
    expect(withoutAccountMessage(1)).toBe('متطوع قديم واحد بلا حساب لا يمكن منحه نقاطًا حتى يُحوَّل بحساب.')
    expect(withoutAccountMessage(2)).toContain('متطوعان قديمان')
    expect(withoutAccountMessage(5)).toBe('5 متطوعين قدامى بلا حساب لا يمكن منحهم نقاطًا حتى يُحوَّلوا بحساب.')
    expect(withoutAccountMessage(14)).toContain('14 متطوعًا قديمًا')
  })
})

describe('Ops volunteers hub page', () => {
  it('shows EVERY row the server returned (no client-side truncation) with its department', async () => {
    fetchHub.mockResolvedValue(hubResponse(Array.from({ length: 73 }, (_, i) => vol(i + 1, i % 2 ? { department_id: 2, department_name: 'التقنية' } : {}))))
    renderPage()

    expect(await screen.findByText('متطوع 73')).toBeInTheDocument()
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(1 + 73) // header + every volunteer
    expect(screen.getAllByText('التقنية').length).toBeGreaterThan(0)
  })

  it('renders a muted «غير محدد» chip only when the department is truly missing', async () => {
    fetchHub.mockResolvedValue(hubResponse([vol(1), vol(2, { department_id: null, department_name: '' })]))
    renderPage()

    await screen.findByText('متطوع 2')
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(within(rows[1]).getByText('الإعلام والتسويق')).toBeInTheDocument()
    expect(within(rows[1]).queryByText('غير محدد')).not.toBeInTheDocument()
    expect(within(rows[2]).getByText('غير محدد')).toBeInTheDocument()
  })

  it('shows the no-account notice when summary.without_account > 0, and nothing when it is 0', async () => {
    fetchHub.mockResolvedValueOnce(hubResponse([vol(1)], { without_account: 4 }))
    const { unmount } = renderPage()

    const banner = await screen.findByTestId('without-account-banner')
    expect(banner).toHaveTextContent('4 متطوعين قدامى بلا حساب لا يمكن منحهم نقاطًا حتى يُحوَّلوا بحساب.')
    expect(within(banner).queryByRole('link')).not.toBeInTheDocument() // no dead links
    unmount()

    fetchHub.mockResolvedValueOnce(hubResponse([vol(1)], { without_account: 0 }))
    renderPage()
    await screen.findByText('متطوع 1')
    expect(screen.queryByTestId('without-account-banner')).not.toBeInTheDocument()
  })

  it('the department filter is sent to the server AND never shows another department in the table', async () => {
    const all = [vol(1), vol(2, { department_id: 2, department_name: 'التقنية' }), vol(3, { department_id: 2, department_name: 'التقنية' })]
    // a server that ignored the filter would still return everyone
    fetchHub.mockResolvedValue(hubResponse(all))
    renderPage()
    await screen.findByText('متطوع 3')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'تصفية حسب الإدارة' }), '2')

    await waitFor(() => expect(fetchHub).toHaveBeenLastCalledWith(expect.objectContaining({ department_id: '2' })))
    await waitFor(() => expect(screen.queryByText('متطوع 1')).not.toBeInTheDocument())
    expect(screen.getByText('متطوع 2')).toBeInTheDocument()
    expect(screen.getByText('متطوع 3')).toBeInTheDocument()
  })

  it('a department that only appears on a row is still selectable', async () => {
    fetchHub.mockResolvedValue({ ...hubResponse([vol(1, { department_id: 9, department_name: 'الجودة' })]), departments: [] })
    renderPage()
    await screen.findByText('متطوع 1')

    expect(within(screen.getByRole('combobox', { name: 'تصفية حسب الإدارة' })).getByRole('option', { name: 'الجودة' })).toBeInTheDocument()
  })

  it('a failed load is an error with a retry, never the «no volunteers» empty state', async () => {
    fetchHub.mockRejectedValueOnce(new Error('500'))
    renderPage()

    const error = await screen.findByTestId('hub-load-error')
    expect(error).toHaveTextContent('تعذّر تحميل قائمة المتطوعين')
    expect(screen.queryByText('لا يوجد متطوعون مسجَّلون بعد')).not.toBeInTheDocument()
    expect(screen.queryByText('لا يوجد متطوعون يطابقون خيارات البحث والفلترة')).not.toBeInTheDocument()

    fetchHub.mockResolvedValueOnce(hubResponse([vol(1)]))
    await userEvent.click(within(error).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByText('متطوع 1')).toBeInTheDocument()
    expect(screen.queryByTestId('hub-load-error')).not.toBeInTheDocument()
  })

  it('the empty state is accurate: no filters = nobody registered; with a search = nothing matches', async () => {
    fetchHub.mockResolvedValue(hubResponse([]))
    renderPage()
    expect(await screen.findByText('لا يوجد متطوعون مسجَّلون بعد')).toBeInTheDocument()
    expect(screen.queryByText('إعادة ضبط الفلاتر')).not.toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'بحث باسم المتطوع أو بريده' }), 'xyz')

    expect(await screen.findByText('لا يوجد متطوعون يطابقون خيارات البحث والفلترة')).toBeInTheDocument()
    expect(screen.getByText('إعادة ضبط الفلاتر')).toBeInTheDocument()
  })

  it('one request per pause in typing, not one per keystroke', async () => {
    fetchHub.mockResolvedValue(hubResponse([vol(1)]))
    renderPage()
    await screen.findByText('متطوع 1')
    fetchHub.mockClear()

    await userEvent.type(screen.getByRole('searchbox', { name: 'بحث باسم المتطوع أو بريده' }), 'علي')

    await waitFor(() => expect(fetchHub).toHaveBeenCalledWith(expect.objectContaining({ search: 'علي' })))
    expect(fetchHub.mock.calls.every(([p]) => p?.search === undefined || p.search === 'علي')).toBe(true)
  })

  it('has no accessibility violations', async () => {
    fetchHub.mockResolvedValue(hubResponse([vol(1)], { without_account: 2 }))
    const { container } = renderPage()
    await screen.findByText('متطوع 1')

    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

describe('Volunteer detail drawer: no silent failures', () => {
  beforeEach(() => {
    fetchProfile.mockResolvedValue(profileFixture())
  })

  const v = vol(7)
  const renderDrawer = (onClose = vi.fn()) => render(<MemoryRouter><VolunteerDetailDrawer volunteer={v} onClose={onClose} onOpenStatusModal={vi.fn()} /></MemoryRouter>)

  it('the personal tab never links to the cancelled HR-profile form', async () => {
    fetchProfile.mockResolvedValue(profileFixture())
    renderDrawer()

    await screen.findByText('بطاقة المتطوع')
    expect(document.body.innerHTML).not.toContain('hr-profile')
    expect(document.querySelector('a[href*="hr-profile"]')).toBeNull()
  })

  it('personal tab: the account card, and the SAME data sections the accepted page shows (languages, bio, linkedin, consent…)', async () => {
    fetchProfile.mockResolvedValue(profileFixture())
    renderDrawer()

    expect(fetchProfile).toHaveBeenCalledWith(7)
    const account = (await screen.findByText('الحساب', { selector: 'h3' })).closest('section') as HTMLElement
    expect(within(account).getByText('حساب الدخول').parentElement).toHaveTextContent('موجود')
    expect(within(account).getByText('البريد موثّق').parentElement).toHaveTextContent('نعم')
    expect(within(account).getByText('يجب تغيير كلمة المرور').parentElement).toHaveTextContent('نعم')
    expect(within(account).getByText('تاريخ الانضمام')).toBeInTheDocument()

    expect(screen.getByText('الفرنسية')).toBeInTheDocument()
    expect(screen.getByText('نبذة المتطوع السابعة')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /linkedin\.com\/in\/v7/ })).toHaveAttribute('href', 'https://www.linkedin.com/in/v7')
    expect(screen.getByText('عرض البيانات المهنية').parentElement).toHaveTextContent('لا')
    expect(screen.getByText('ملاحظة داخلية')).toBeInTheDocument()
    expect(screen.getByText('4 / 5 · أتفق')).toBeInTheDocument()
    expect(screen.getByText('أنثى')).toBeInTheDocument()
    expect(screen.queryByTestId('no-request-card')).not.toBeInTheDocument()
  })

  it('personal tab: without a linked request it says so and shows what the team profile holds', async () => {
    fetchProfile.mockResolvedValue(profileFixture({
      source: 'team_profile',
      team_profile: { id: 3, position_ar: 'منسق فعاليات', member_type: 'volunteer', joined_at: '2025-05-01', is_active: true, phone: '+31600000000', email: 'team@example.com', country: 'هولندا', city: 'أمستردام', gender: 'male' },
    }, null))
    renderDrawer()

    const card = await screen.findByTestId('no-request-card')
    expect(card).toHaveTextContent('لا يوجد طلب تطوع مرتبط بهذا المتطوع — أُضيف يدويًا أو من مصدر قديم')
    expect(within(card).getByText('منسق فعاليات')).toBeInTheDocument()
    expect(within(card).getByText('أمستردام')).toBeInTheDocument()
    expect(within(card).getByText('ذكر')).toBeInTheDocument()
    expect(screen.getByText('بطاقة المتطوع')).toBeInTheDocument()
    expect(screen.getByText('الحساب', { selector: 'h3' })).toBeInTheDocument()
    expect(screen.queryByText('المعلومات الشخصية')).not.toBeInTheDocument() // no empty request sections
  })

  it('personal tab: an account-only volunteer still gets the message, and the account card says there is no login', async () => {
    fetchProfile.mockResolvedValue(profileFixture({
      source: 'account_only',
      volunteer: { ...profileFixture().volunteer, account: { has_account: false, email_verified: false, must_change_password: false, created_at: null } },
    }, null))
    renderDrawer()

    expect(await screen.findByTestId('no-request-card')).toHaveTextContent('لا يوجد طلب تطوع مرتبط بهذا المتطوع')
    expect(screen.getByText('لا يوجد حساب دخول لهذا المتطوع')).toBeInTheDocument()
  })

  it('personal tab: a 403 is an information card (not an error, no retry) and the card from the list row stays', async () => {
    fetchProfile.mockRejectedValueOnce({ response: { status: 403, data: { message: 'Forbidden' } } })
    renderDrawer()

    const note = await screen.findByTestId('profile-forbidden-card')
    expect(note).toHaveTextContent('لا تملك صلاحية عرض البيانات الشخصية الكاملة للمتطوع')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).not.toBeInTheDocument()
    // what the list row already gave: name, department, e-mail, hours; no account card, no request data
    const card = screen.getByText('بطاقة المتطوع', { selector: 'h3' }).closest('section') as HTMLElement
    expect(within(card).getByText('متطوع 7')).toBeInTheDocument()
    expect(within(card).getByText('الإعلام والتسويق')).toBeInTheDocument()
    expect(within(card).getByText('v7@example.com')).toBeInTheDocument()
    expect(within(card).getByText('10 ساعة')).toBeInTheDocument()
    expect(screen.queryByText('الحساب', { selector: 'h3' })).not.toBeInTheDocument()
    expect(screen.queryByText('المعلومات الشخصية')).not.toBeInTheDocument()
    expect(fetchProfile).toHaveBeenCalledTimes(1)
  })

  it('personal tab: any other status (500, network) keeps the retry state', async () => {
    fetchProfile.mockRejectedValueOnce({ response: { status: 500 } })
    renderDrawer()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذّر تحميل بيانات المتطوع')
    expect(screen.queryByTestId('profile-forbidden-card')).not.toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument()
  })

  it('personal tab: a request linked only by e-mail carries the amber «check it is theirs» note above the request data', async () => {
    fetchProfile.mockResolvedValue(profileFixture({ match: 'email' }))
    renderDrawer()

    const note = await screen.findByTestId('email-match-note')
    expect(note).toHaveTextContent('رُبط هذا الطلب بالمتطوع عبر البريد الإلكتروني فقط — تحقق من أنه يخصه')
    expect(note).toHaveClass('bg-amber-50')
    // above the request data
    const sections = screen.getByTestId('volunteer-data-sections')
    expect(note.compareDocumentPosition(sections) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it.each([['team_source'], ['converted_member'], [null], [undefined]])('personal tab: no e-mail note when the match is %s', async (match) => {
    fetchProfile.mockResolvedValue(profileFixture({ match: match as VolunteerProfile['match'] }))
    renderDrawer()

    await screen.findByText('بطاقة المتطوع')
    expect(screen.queryByTestId('email-match-note')).not.toBeInTheDocument()
  })

  it('personal tab: nothing is invented: unknown flags are «غير معروف» and a missing hours figure is a dash', async () => {
    const base = profileFixture()
    fetchProfile.mockResolvedValue({
      ...base,
      volunteer: { ...base.volunteer, hours_logged: null, status: null, account: { has_account: null, email_verified: null, must_change_password: null, created_at: null } },
    })
    renderDrawer()

    const account = (await screen.findByText('الحساب', { selector: 'h3' })).closest('section') as HTMLElement
    expect(within(account).getByText('حساب الدخول').parentElement).toHaveTextContent('غير معروف')
    expect(within(account).getByText('البريد موثّق').parentElement).toHaveTextContent('غير معروف')
    expect(within(account).getByText('يجب تغيير كلمة المرور').parentElement).toHaveTextContent('غير معروف')
    expect(within(account).queryByText('لا يوجد حساب دخول لهذا المتطوع')).not.toBeInTheDocument()
  })

  it('personal tab: a failed load says so and retries', async () => {
    fetchProfile.mockRejectedValueOnce(new Error('500'))
    renderDrawer()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذّر تحميل بيانات المتطوع')
    expect(screen.queryByTestId('no-request-card')).not.toBeInTheDocument()

    fetchProfile.mockResolvedValueOnce(profileFixture())
    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByText('بطاقة المتطوع')).toBeInTheDocument()
    expect(fetchProfile).toHaveBeenCalledTimes(2)
  })

  it('points: an API failure shows an explicit error with retry; retry loads the ledger', async () => {
    fetchLedger.mockRejectedValueOnce(new Error('500'))
    renderDrawer()

    await userEvent.click(screen.getByRole('tab', { name: /نقاط الأثر/ }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذّر تحميل سجل حركات النقاط')
    expect(screen.queryByText(/لا توجد حركات نقاط/)).not.toBeInTheDocument()

    fetchLedger.mockResolvedValueOnce({
      ledger: [{ id: 'a1', date: '2026-10-01', category: 'task', reason: 'مهمة منجزة', points: 5, type: 'earn', source: 'tasks', creator: 'المدير' }],
      actual_points: 5, used_points: 0, balance: 5,
    })
    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByText('مهمة منجزة')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetchLedger).toHaveBeenCalledTimes(2)
  })

  it('points: an empty ledger is the honest empty state, not an error', async () => {
    fetchLedger.mockResolvedValueOnce({ ledger: [], actual_points: 0, used_points: 0, balance: 0 })
    renderDrawer()

    await userEvent.click(screen.getByRole('tab', { name: /نقاط الأثر/ }))

    expect(await screen.findByText(/لا توجد حركات نقاط مسجلة/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('activity: renders every kind of event with its title, description, actor and date; unknown kinds stay visible', async () => {
    fetchActivity.mockResolvedValueOnce([
      event({ id: 'a', type: 'weekly_rating', title: 'تقييم أسبوعي', description: 'أداء ممتاز', actor_name: 'قائد الفريق', date_formatted: '2026-11-02', meta: { avg_score: 8.5 } }),
      event({ id: 'b', type: 'points_awarded', title: 'مُنح نقاطًا', description: 'مهمة منجزة', actor_name: 'المدير', meta: { points: 5 } }),
      event({ id: 'c', type: 'status_change', title: 'تغيير الحالة', description: null, actor_name: 'مدير الموارد', meta: { old_status: 'active', new_status: 'on_leave', reason: 'سفر طويل' } }),
      event({ id: 'd', type: 'converted_to_member', title: 'تم التحويل إلى عضو', description: 'إلى إدارة الإعلام' }),
      event({ id: 'e', type: 'brand_new_kind', title: 'حدث من إصدار أحدث', description: null, actor_name: null, occurred_at: null, date_formatted: null }),
      event({ id: 'f', type: 'request_submitted', title: '', description: null }),
    ])
    renderDrawer()

    await userEvent.click(screen.getByRole('tab', { name: 'سجل النشاط' }))

    const list = await screen.findByRole('list', { name: 'سجل نشاط المتطوع' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(6)
    expect(items[0]).toHaveTextContent('تقييم أسبوعي')
    expect(items[0]).toHaveTextContent('أداء ممتاز')
    expect(items[0]).toHaveTextContent('قائد الفريق')
    // the date is the browser's own time zone (like the rest of the drawer), not the server's UTC date_formatted
    expect(items[0]).toHaveTextContent(formatDateTime('2026-10-01T10:00:00Z'))
    expect(items[0]).not.toHaveTextContent('2026-11-02')
    expect(items[0]).toHaveTextContent('8.5 / 10')
    expect(items[1]).toHaveTextContent('5 نقطة')
    // status change: the old status badges and the reason
    expect(items[2]).toHaveTextContent('نشط')
    expect(items[2]).toHaveTextContent('في إجازة')
    expect(items[2]).toHaveTextContent('سفر طويل')
    expect(items[2]).toHaveTextContent('مدير الموارد')
    expect(items[3]).toHaveTextContent('إلى إدارة الإعلام')
    // an unknown type still renders (generic icon), a missing title falls back to the Arabic default
    expect(items[4]).toHaveTextContent('حدث من إصدار أحدث')
    expect(items[4]).toHaveAttribute('data-activity-type', 'brand_new_kind')
    expect(items[5]).toHaveTextContent('تقديم طلب التطوع')
  })

  it('activity: an event without an actor shows no actor line (never «null» or an invented name)', async () => {
    fetchActivity.mockResolvedValueOnce([
      event({ id: 'n1', type: 'request_accepted', title: 'قُبل الطلب', actor_name: null }),
      event({ id: 'n2', type: 'status_change', title: 'تغيير الحالة', actor_name: null, meta: { old_status: 'active', new_status: 'withdrawn' } }),
    ])
    renderDrawer()

    await userEvent.click(screen.getByRole('tab', { name: 'سجل النشاط' }))

    const items = within(await screen.findByRole('list', { name: 'سجل نشاط المتطوع' })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    for (const item of items) {
      expect(item).not.toHaveTextContent('بواسطة')
      expect(item).not.toHaveTextContent(/null|undefined|مسؤول النظام/)
    }
  })

  it('activity: an event matched by e-mail only carries the «مطابقة بالبريد» tag; others do not', async () => {
    fetchActivity.mockResolvedValueOnce([
      event({ id: 'm1', type: 'request_submitted', title: 'قدّم طلب التطوع', meta: { match: 'email' } }),
      event({ id: 'm2', type: 'request_accepted', title: 'قُبل الطلب', meta: { match: 'converted_member' } }),
      event({ id: 'm3', type: 'points_awarded', title: 'نقاط', meta: {} }),
    ])
    renderDrawer()

    await userEvent.click(screen.getByRole('tab', { name: 'سجل النشاط' }))

    const items = within(await screen.findByRole('list', { name: 'سجل نشاط المتطوع' })).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('مطابقة بالبريد')
    expect(items[1]).not.toHaveTextContent('مطابقة بالبريد')
    expect(items[2]).not.toHaveTextContent('مطابقة بالبريد')
  })

  it('activity: a volunteer with no events gets a real empty state, not an error', async () => {
    fetchActivity.mockResolvedValueOnce([])
    renderDrawer()

    await userEvent.click(screen.getByRole('tab', { name: 'سجل النشاط' }))

    expect(await screen.findByText('لا توجد أحداث مسجلة لهذا المتطوع حتى الآن.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('activity: error + retry', async () => {
    fetchActivity.mockRejectedValueOnce(new Error('500'))
    renderDrawer()

    await userEvent.click(screen.getByRole('tab', { name: 'سجل النشاط' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذّر تحميل سجل النشاط')
    expect(screen.queryByText(/لا توجد أحداث مسجلة/)).not.toBeInTheDocument()

    fetchActivity.mockResolvedValueOnce([event({ title: 'قدّم طلب التطوع', description: 'عبر الموقع' })])
    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByText('عبر الموقع')).toBeInTheDocument()
    expect(fetchActivity).toHaveBeenCalledTimes(2)
  })

  it('weekly ratings: error + retry', async () => {
    fetchRatings.mockRejectedValueOnce(new Error('500'))
    renderDrawer()

    await userEvent.click(screen.getByRole('tab', { name: 'التقييمات الأسبوعية' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('تعذّر تحميل التقييمات الأسبوعية')
    expect(screen.queryByText(/لم يُسجل أي تقييم/)).not.toBeInTheDocument()

    fetchRatings.mockResolvedValueOnce({ ratings: [], monthly_averages: [], criteria_averages: {}, overall_avg: null })
    await userEvent.click(within(alert).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByText(/لم يُسجل أي تقييم أسبوعي/)).toBeInTheDocument()
  })

  it('each tab is requested once, on first open, and not again when switching back', async () => {
    fetchLedger.mockResolvedValue({ ledger: [], actual_points: 0, used_points: 0, balance: 0 })
    fetchActivity.mockResolvedValue([])
    renderDrawer()
    expect(fetchLedger).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('tab', { name: /نقاط الأثر/ }))
    await screen.findByText(/لا توجد حركات نقاط/)
    await userEvent.click(screen.getByRole('tab', { name: 'سجل النشاط' }))
    await userEvent.click(screen.getByRole('tab', { name: /نقاط الأثر/ }))

    expect(fetchLedger).toHaveBeenCalledTimes(1)
    expect(fetchRatings).not.toHaveBeenCalled()
  })

  it('Escape closes the status modal first and leaves the drawer open; a second Escape closes the drawer', async () => {
    fetchHub.mockResolvedValue(hubResponse([vol(1)]))
    renderPage()
    await userEvent.click(await screen.findByText('متطوع 1'))
    const drawer = await screen.findByRole('dialog', { name: 'متطوع 1' })

    await userEvent.click(within(drawer).getByRole('button', { name: 'تعديل الحالة الآن' }))
    expect(await screen.findByRole('dialog', { name: 'تعديل حالة المتطوع' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'تعديل حالة المتطوع' })).not.toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: 'متطوع 1' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'متطوع 1' })).not.toBeInTheDocument())
  })

  it('the drawer ignores an Escape another layer already handled', async () => {
    const onClose = vi.fn()
    renderDrawer(onClose)

    const handled = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true })
    handled.preventDefault()
    document.dispatchEvent(handled)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('is a labelled dialog that Escape closes', async () => {
    const onClose = vi.fn()
    renderDrawer(onClose)

    expect(screen.getByRole('dialog', { name: 'متطوع 7' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
