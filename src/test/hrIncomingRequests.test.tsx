import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import HrIncomingRequestsPage from '@/pages/hr/HrIncomingRequestsPage'
import {
  createOpportunityDraft,
  fetchDraftSuggestion,
  fetchIncomingRequests,
  fetchVolunteerMatches,
  normalizeIncomingRequest,
  safeInternalUrl,
  updateIncomingRequestStatus,
  updateOpportunityDraft,
  type IncomingCapabilities,
  type IncomingList,
  type IncomingRequest,
  type MatchResult,
  type OpportunityDraft,
} from '@/api/hrIncomingRequestsApi'

vi.mock('@/api/hrIncomingRequestsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hrIncomingRequestsApi')>()
  return {
    ...actual,
    fetchIncomingRequests: vi.fn(),
    fetchVolunteerMatches: vi.fn(),
    fetchDraftSuggestion: vi.fn(),
    createOpportunityDraft: vi.fn(),
    updateOpportunityDraft: vi.fn(),
    updateIncomingRequestStatus: vi.fn(),
  }
})
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))

const list = vi.mocked(fetchIncomingRequests)
const matches = vi.mocked(fetchVolunteerMatches)
const suggestion = vi.mocked(fetchDraftSuggestion)
const create = vi.mocked(createOpportunityDraft)
const update = vi.mocked(updateOpportunityDraft)
const setStatus = vi.mocked(updateIncomingRequestStatus)

const FULL: IncomingCapabilities = { canViewAll: true, canManage: true, canMatchVolunteers: true, canCreateDraft: true }
const NONE: IncomingCapabilities = { canViewAll: false, canManage: false, canMatchVolunteers: false, canCreateDraft: false }

function req(over: Partial<IncomingRequest> = {}): IncomingRequest {
  return {
    id: 1, title: 'مصمم محتوى — التسويق والإعلام', requestType: 'مصمم محتوى', department: { id: 3, name: 'التسويق والإعلام' }, requester: { id: 9, name: 'ليلى' },
    requiredCount: 2, skillsAndSpecs: 'تصميم جرافيك، صناعة المحتوى، مونتاج الفيديو', skills: ['تصميم جرافيك', 'صناعة المحتوى', 'مونتاج الفيديو', 'كتابة'], notes: 'دعم الحملات',
    status: 'pending', statusLabel: 'جديد', targetAudience: 'hr', targetAudienceLabel: 'الموارد البشرية', hrFeedback: null,
    createdAt: '2026-10-10T09:00:00+00:00', updatedAt: '2026-10-10T09:00:00+00:00', draft: null, ...over,
  }
}

function listOf(items: IncomingRequest[], caps: IncomingCapabilities = FULL, over: Partial<IncomingList> = {}): IncomingList {
  return {
    items,
    meta: { currentPage: 1, lastPage: 1, perPage: 25, total: items.length },
    stats: { total: items.length, pending: 1, inProgress: 1, approved: 0, rejected: 0, withDrafts: 1 },
    departments: [{ id: 3, name: 'التسويق والإعلام' }, { id: 4, name: 'المالية' }],
    capabilities: caps,
    ...over,
  }
}

function matchResult(count: number): MatchResult {
  const candidates = Array.from({ length: count }, (_, i) => ({
    id: 55 + i, name: i === 0 ? 'أحمد محمد' : `مرشح ${i}`, status: 'pending', statusLabel: 'جديد', score: 87 - i * 20, label: i === 0 ? 'مناسب جدًا' : 'يحتاج مراجعة',
    matchedSkills: ['تصميم جرافيك', 'صناعة المحتوى'], missingSkills: ['مونتاج الفيديو'], reasons: ['يمتلك مهارات مطابقة: تصميم جرافيك، صناعة المحتوى.', 'اختار نفس مجال القسم المطلوب.'],
    warnings: ['طلبه مقبول مسبقًا ولم يُسنَد بعد.'], breakdown: [{ key: 'skills', label: 'المهارات', earned: 26.7, max: 40 }], desiredDepartment: 'التسويق', experienceLevel: 'متوسط',
    availability: '10 ساعات', url: `/dashboard/hr/volunteer-requests/${55 + i}`, actionLabel: 'مراجعة المرشح',
  }))
  return { candidates, meta: { minScore: 45, evaluated: 12, returned: count, generatedAt: null, persisted: false, limitations: ['لا يحتوي الطلب على حقل للتوفر، لذلك لم يُحتسب التوفر في الدرجة.'] } }
}

function draft(over: Partial<OpportunityDraft> = {}): OpportunityDraft {
  return {
    id: null, incomingRequestId: 1, departmentId: 3, departmentName: 'التسويق والإعلام', title: 'فرصة تطوعية: مصمم محتوى لإدارة التسويق والإعلام',
    summary: 'تبحث إدارة التسويق والإعلام في EMC عن متطوعين للمساهمة.', responsibilities: ['دعم الحملات'], requiredSkills: ['تصميم جرافيك', 'صناعة المحتوى'], preferredSkills: [],
    volunteersNeeded: 2, availability: '', locationMode: '', startDate: '', applicationInstructions: 'قدّم طلب التطوع عبر المنصة.', status: 'draft', isPublished: false, ...over,
  }
}

function httpError(status: number, data: unknown = {}): unknown {
  return { isAxiosError: true, name: 'AxiosError', message: 'x', config: {}, response: { status, data } }
}

const renderPage = () => render(<MemoryRouter><HrIncomingRequestsPage /></MemoryRouter>)

async function openDrawer() {
  renderPage()
  const card = (await screen.findAllByTestId('incoming-request'))[0]
  await userEvent.click(within(card).getByRole('button', { name: /عرض التفاصيل/ }))
  return await screen.findByTestId('request-details')
}

beforeEach(() => {
  vi.clearAllMocks()
  list.mockResolvedValue(listOf([req(), req({ id: 2, title: 'محاسب — المالية', department: { id: 4, name: 'المالية' }, status: 'in_progress', statusLabel: 'قيد المراجعة', skills: [], skillsAndSpecs: '', draft: { id: 7, title: 'مسودة', status: 'draft' } })]))
  matches.mockResolvedValue(matchResult(2))
  suggestion.mockResolvedValue({ suggestion: draft(), existing: null })
})

describe('page layout', () => {
  it('renders the redesigned workspace: title, subtitle, refresh, RTL', async () => {
    const { container } = renderPage()

    expect(await screen.findByRole('heading', { name: 'الطلبات الواردة' })).toBeTruthy()
    expect(screen.getByText('إدارة طلبات الاحتياج الوظيفي الواردة من مختلف الأقسام')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'تحديث' })).toBeTruthy()
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull()
  })

  it('shows only the KPI cards the server can state', async () => {
    renderPage()
    await screen.findByTestId('kpi-total')

    expect(within(screen.getByTestId('kpi-total')).getByText('2')).toBeTruthy()
    expect(screen.getByTestId('kpi-pending')).toBeTruthy()
    expect(screen.getByTestId('kpi-in_progress')).toBeTruthy()
    expect(within(screen.getByTestId('kpi-drafts')).getByText('1')).toBeTruthy()
    expect(screen.queryByText('تحتاج مرشحين')).toBeNull()
  })

  it('renders search and filters', async () => {
    renderPage()
    await screen.findAllByTestId('incoming-request')

    expect(screen.getByRole('searchbox')).toBeTruthy()
    expect(screen.getByLabelText('الحالة')).toBeTruthy()
    expect(screen.getByLabelText('القسم')).toBeTruthy()
    expect(screen.getByLabelText('المسودة')).toBeTruthy()
    expect(screen.getByLabelText('من تاريخ')).toBeTruthy()
    expect(screen.getByLabelText('إلى تاريخ')).toBeTruthy()
    expect(within(screen.getByLabelText('القسم')).getAllByRole('option').map((o) => o.textContent)).toEqual(['كل الأقسام', 'التسويق والإعلام', 'المالية'])
  })

  it('changing a filter asks the server, and clearing restores the list', async () => {
    renderPage()
    await screen.findAllByTestId('incoming-request')

    await userEvent.selectOptions(screen.getByLabelText('الحالة'), 'pending')
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'pending' })))
    await userEvent.selectOptions(screen.getByLabelText('القسم'), '4')
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'pending', departmentId: 4 })))

    await userEvent.click(await screen.findByRole('button', { name: 'مسح التصفية' }))
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: '', departmentId: '' })))
  })

  it('typing in the search box queries the server after a short pause', async () => {
    renderPage()
    await screen.findAllByTestId('incoming-request')

    await userEvent.type(screen.getByRole('searchbox'), 'تصميم')

    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'تصميم' })))
  })

  it('each request shows its role, department, count, status, skills, date, requester and matching state', async () => {
    renderPage()
    const cards = await screen.findAllByTestId('incoming-request')
    const first = cards[0]

    expect(within(first).getByText('مصمم محتوى — التسويق والإعلام')).toBeTruthy()
    expect(within(first).getByText('جديد')).toBeTruthy()
    expect(within(first).getByText('تصميم جرافيك')).toBeTruthy()
    expect(within(first).getByText('+1')).toBeTruthy()
    expect(within(first).getByText('المطلوب: 2')).toBeTruthy()
    expect(within(first).getByText('ليلى')).toBeTruthy()
    expect(within(first).getByTestId('match-state').textContent).toBe('لم يتم البحث')
    expect(within(cards[1]).getByTestId('match-state').textContent).toBe('تم إنشاء مسودة فرصة')
    expect(within(cards[1]).getByText('لم تُحدَّد مهارات واضحة')).toBeTruthy()
  })
})

describe('hover preview and details drawer', () => {
  it('hovering shows a quick preview of the details; leaving hides it', async () => {
    renderPage()
    const card = (await screen.findAllByTestId('incoming-request'))[0]

    await userEvent.hover(card)
    const preview = await within(card).findByTestId('hover-preview')
    expect(preview.textContent).toContain('تصميم جرافيك، صناعة المحتوى، مونتاج الفيديو')
    expect(preview.textContent).toContain('دعم الحملات')

    await userEvent.unhover(card)
    expect(within(card).queryByTestId('hover-preview')).toBeNull()
  })

  it('does not rely on hover: clicking opens the full details drawer', async () => {
    const drawer = await openDrawer()

    expect(within(drawer).getByText('التسويق والإعلام')).toBeTruthy()
    expect(within(drawer).getByText('ليلى')).toBeTruthy()
    expect(within(drawer).getByText('الموارد البشرية')).toBeTruthy()
    expect(within(drawer).getByText(/تصميم جرافيك، صناعة المحتوى، مونتاج الفيديو/)).toBeTruthy()
    expect(within(drawer).getByText('دعم الحملات')).toBeTruthy()
    expect(within(drawer).getByRole('region', { name: 'المرشحون المحتملون' })).toBeTruthy()
  })

  it('status actions call the API and refresh', async () => {
    setStatus.mockResolvedValue(req({ status: 'approved' }))
    const drawer = await openDrawer()

    await userEvent.click(within(drawer).getByRole('button', { name: 'قبول' }))

    await waitFor(() => expect(setStatus).toHaveBeenCalledWith(1, 'approved'))
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })
})

describe('smart volunteer matching', () => {
  it('starts idle and does nothing until HR asks', async () => {
    const drawer = await openDrawer()

    expect(within(drawer).getByText(/لم يتم البحث عن مرشحين بعد/)).toBeTruthy()
    expect(matches).not.toHaveBeenCalled()
  })

  it('«البحث عن مرشحين» calls the server and shows each candidate with score, label, skills and reasons', async () => {
    const drawer = await openDrawer()

    await userEvent.click(within(drawer).getByRole('button', { name: 'البحث عن مرشحين' }))

    await waitFor(() => expect(matches).toHaveBeenCalledWith(1, 45))
    expect(await within(drawer).findByText('تم العثور على 2 مرشح محتمل')).toBeTruthy()
    const card = within(drawer).getAllByTestId('match-candidate')[0]
    expect(within(card).getByText('أحمد محمد')).toBeTruthy()
    expect(within(card).getByTestId('match-score').textContent).toBe('87/100')
    expect(within(card).getByTestId('match-label').textContent).toBe('مناسب جدًا')
    expect(within(within(card).getByTestId('matched-skills')).getByText('صناعة المحتوى')).toBeTruthy()
    expect(within(within(card).getByTestId('missing-skills')).getByText('مونتاج الفيديو')).toBeTruthy()
    expect(within(card).getByText('اختار نفس مجال القسم المطلوب.')).toBeTruthy()
    expect(within(card).getByText('طلبه مقبول مسبقًا ولم يُسنَد بعد.')).toBeTruthy()
    expect(within(card).getByRole('link', { name: 'مراجعة الطلب' }).getAttribute('href')).toBe('/dashboard/hr/volunteer-requests/55')
    expect(within(drawer).getByText(/نتائج مباشرة وغير محفوظة/)).toBeTruthy()
  })

  it('the minimum score can be changed and the search reruns with it', async () => {
    const drawer = await openDrawer()
    await userEvent.click(within(drawer).getByRole('button', { name: 'البحث عن مرشحين' }))
    await within(drawer).findByText('تم العثور على 2 مرشح محتمل')

    await userEvent.selectOptions(within(drawer).getByLabelText('الحد الأدنى للدرجة'), '65')
    await waitFor(() => expect(matches).toHaveBeenLastCalledWith(1, 65))

    await userEvent.click(within(drawer).getByRole('button', { name: 'إعادة البحث' }))
    await waitFor(() => expect(matches).toHaveBeenCalledTimes(3))
  })

  it('the list row reflects the result of a search in this session', async () => {
    const drawer = await openDrawer()
    await userEvent.click(within(drawer).getByRole('button', { name: 'البحث عن مرشحين' }))
    await within(drawer).findByText('تم العثور على 2 مرشح محتمل')

    expect(within(screen.getAllByTestId('incoming-request')[0]).getByTestId('match-state').textContent).toBe('يوجد مرشحون محتملون')
  })

  it('with no match it says so and offers «إنشاء مسودة فرصة»', async () => {
    matches.mockResolvedValue(matchResult(0))
    const drawer = await openDrawer()

    await userEvent.click(within(drawer).getByRole('button', { name: 'البحث عن مرشحين' }))

    const none = await within(drawer).findByTestId('no-matches')
    expect(within(none).getByText('لم يتم العثور على مرشح مناسب')).toBeTruthy()
    expect(within(none).getByRole('button', { name: 'إنشاء مسودة فرصة' })).toBeTruthy()
    expect(within(screen.getAllByTestId('incoming-request')[0]).getByTestId('match-state').textContent).toBe('لا يوجد مرشح مناسب')
  })

  it('shows a clear message when matching fails or is refused', async () => {
    matches.mockRejectedValueOnce(httpError(500))
    const drawer = await openDrawer()
    await userEvent.click(within(drawer).getByRole('button', { name: 'البحث عن مرشحين' }))
    expect((await within(drawer).findByText(/تعذّر البحث عن مرشحين/)).textContent).toContain('إعادة البحث')

    matches.mockRejectedValueOnce(httpError(403))
    await userEvent.click(within(drawer).getByRole('button', { name: 'إعادة البحث' }))
    expect(await within(drawer).findByText('لا تملك صلاحية البحث عن مرشحين.')).toBeTruthy()
  })
})

describe('draft opportunity', () => {
  async function openModal() {
    const drawer = await openDrawer()
    await userEvent.click(within(within(drawer).getByRole('region', { name: 'مسودة الفرصة' })).getByRole('button', { name: 'إنشاء مسودة فرصة' }))
    return await screen.findByRole('dialog', { name: /مراجعة مسودة الفرصة/ }).catch(() => screen.findByText('مراجعة مسودة الفرصة'))
  }

  it('opens pre-filled with the generated draft', async () => {
    await openModal()

    expect(suggestion).toHaveBeenCalledWith(1)
    expect((screen.getByLabelText('العنوان') as HTMLInputElement).value).toBe('فرصة تطوعية: مصمم محتوى لإدارة التسويق والإعلام')
    expect((screen.getByLabelText('الوصف المختصر') as HTMLTextAreaElement).value).toContain('تبحث إدارة التسويق والإعلام')
    expect((screen.getByLabelText('المهارات المطلوبة') as HTMLTextAreaElement).value).toBe('تصميم جرافيك\nصناعة المحتوى')
    expect((screen.getByLabelText('العدد المطلوب') as HTMLInputElement).value).toBe('2')
    expect((screen.getAllByLabelText('القسم').at(-1) as HTMLInputElement).value).toBe('التسويق والإعلام')
  })

  it('lets HR edit every field and saves them as a draft', async () => {
    create.mockResolvedValue(draft({ id: 5 }))
    await openModal()

    const title = screen.getByLabelText('العنوان')
    await userEvent.clear(title)
    await userEvent.type(title, 'فرصة تطوعية: مصمم')
    await userEvent.type(screen.getByLabelText('التوفر والساعات'), '8 ساعات أسبوعيًا')
    await userEvent.selectOptions(screen.getByLabelText('نمط العمل'), 'remote')
    const skills = screen.getByLabelText('المهارات المطلوبة')
    await userEvent.clear(skills)
    await userEvent.type(skills, 'تصميم، مونتاج')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ كمسودة' }))

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    const [id, payload] = create.mock.calls[0]
    expect(id).toBe(1)
    expect(payload).toMatchObject({ title: 'فرصة تطوعية: مصمم', availability: '8 ساعات أسبوعيًا', locationMode: 'remote', requiredSkills: ['تصميم', 'مونتاج'], volunteersNeeded: 2, departmentId: 3 })
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
    expect(update).not.toHaveBeenCalled()
  })

  it('offers no publish control: «نشر لاحقًا» is disabled', async () => {
    await openModal()

    expect((screen.getByRole('button', { name: 'نشر لاحقًا' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: /^نشر$/ })).toBeNull()
  })

  it('shows the server\'s validation messages next to the fields and keeps the form open', async () => {
    create.mockRejectedValueOnce(httpError(422, { errors: { title: ['عنوان الفرصة مطلوب.'], summary: ['الوصف المختصر مطلوب.'] } }))
    await openModal()

    await userEvent.click(screen.getByRole('button', { name: 'حفظ كمسودة' }))

    expect(await screen.findByText('عنوان الفرصة مطلوب.')).toBeTruthy()
    expect(screen.getByText('الوصف المختصر مطلوب.')).toBeTruthy()
    expect(screen.getByLabelText('العنوان')).toBeTruthy()
  })

  it('an existing draft opens for editing (update, not create) and can be cancelled', async () => {
    list.mockResolvedValue(listOf([req({ draft: { id: 7, title: 'مسودة قائمة', status: 'draft' } })]))
    suggestion.mockResolvedValue({ suggestion: draft(), existing: draft({ id: 7, title: 'مسودة قائمة' }) })
    update.mockResolvedValue(draft({ id: 7 }))
    const drawer = await openDrawer()

    expect(within(drawer).getByText('المسودة غير منشورة ولا تظهر للعامة.')).toBeTruthy()
    await userEvent.click(within(drawer).getByRole('button', { name: 'مراجعة المسودة وتعديلها' }))
    expect((await screen.findByLabelText('العنوان') as HTMLInputElement).value).toBe('مسودة قائمة')

    await userEvent.click(screen.getByRole('button', { name: 'حفظ كمسودة' }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(create).not.toHaveBeenCalled()
  })
})

describe('permissions', () => {
  it('hides every action the server did not grant', async () => {
    list.mockResolvedValue(listOf([req()], NONE))
    const drawer = await openDrawer()

    expect(within(drawer).queryByRole('button', { name: 'قبول' })).toBeNull()
    expect(within(drawer).queryByRole('button', { name: 'رفض' })).toBeNull()
    expect(within(drawer).queryByRole('button', { name: 'البحث عن مرشحين' })).toBeNull()
    expect(within(drawer).queryByRole('button', { name: 'إنشاء مسودة فرصة' })).toBeNull()
    expect(within(drawer).getByText(/البحث عن مرشحين متاح لفريق الموارد البشرية فقط/)).toBeTruthy()
  })

  it('a department leader (view only) sees details but cannot manage, match or draft', async () => {
    list.mockResolvedValue(listOf([req()], { canViewAll: false, canManage: false, canMatchVolunteers: false, canCreateDraft: false }))
    const drawer = await openDrawer()

    expect(drawer.textContent).toContain('التسويق والإعلام')
    expect(matches).not.toHaveBeenCalled()
  })

  it('a 403 on the list is an unauthorized state with no data', async () => {
    list.mockRejectedValue(httpError(403))
    renderPage()

    expect(await screen.findByText('لا تملك صلاحية عرض الطلبات الواردة')).toBeTruthy()
    expect(screen.queryByTestId('incoming-request')).toBeNull()
  })
})

describe('states', () => {
  it('shows a loading skeleton first', () => {
    list.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByTestId('incoming-loading')).toBeTruthy()
  })

  it('shows an empty state with no requests, and a different one when a filter finds nothing', async () => {
    list.mockResolvedValue(listOf([]))
    renderPage()
    expect(await screen.findByText('لا توجد طلبات واردة')).toBeTruthy()

    await userEvent.selectOptions(screen.getByLabelText('الحالة'), 'approved')
    expect(await screen.findByText('لا توجد نتائج مطابقة')).toBeTruthy()
  })

  it('shows an error with a retry button and recovers', async () => {
    list.mockRejectedValueOnce(httpError(500))
    renderPage()

    expect(await screen.findByText('تعذّر تحميل الطلبات الواردة')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findAllByTestId('incoming-request')).toHaveLength(2)
  })

  it('pages through results', async () => {
    list.mockResolvedValue(listOf([req()], FULL, { meta: { currentPage: 1, lastPage: 3, perPage: 25, total: 60 } }))
    renderPage()
    await screen.findAllByTestId('incoming-request')

    await userEvent.click(screen.getByRole('button', { name: /التالي/ }))

    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))
  })

  it('mobile: the list is one column of cards with no table to overflow', async () => {
    const { container } = renderPage()
    await screen.findAllByTestId('incoming-request')

    expect(container.querySelector('table')).toBeNull()
    expect(screen.getByRole('list', { name: 'قائمة الطلبات' })).toBeTruthy()
  })
})

describe('api client', () => {
  it('normalizes a legacy or partial payload without crashing', () => {
    const r = normalizeIncomingRequest({ id: 3, status: 'weird', required_count: 0, department: null, requester: null, skills: 'x', draft: { id: 9 } })

    expect(r).toMatchObject({ id: 3, status: 'pending', requiredCount: 1, department: null, requester: null, skills: [], notes: null })
    expect(r.draft).toEqual({ id: 9, title: '', status: 'draft' })
  })

  it('only an internal dashboard path can be a candidate link', () => {
    expect(safeInternalUrl('https://evil.example')).toBe('/dashboard')
    expect(safeInternalUrl('/dashboard/hr/volunteer-requests/5')).toBe('/dashboard/hr/volunteer-requests/5')
  })
})
