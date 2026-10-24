import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import HrOpportunitiesPage from '@/pages/hr/HrOpportunitiesPage'
import { ApplicantsPanel } from '@/components/hrIncoming/ApplicantsPanel'
import {
  createAdminOpportunity,
  fetchAdminOpportunities,
  fetchDepartmentOptions,
  fetchOpportunityApplicants,
  normalizeAdminOpportunity,
  runOpportunityAction,
  setApplicantStatus,
  updateAdminOpportunity,
  type AdminOpportunity,
  type AdminOpportunityList,
  type ApplicantsResult,
} from '@/api/volunteerOpportunitiesAdminApi'
import toast from '@/lib/toast'

vi.mock('@/api/volunteerOpportunitiesAdminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/volunteerOpportunitiesAdminApi')>()
  return {
    ...actual,
    fetchAdminOpportunities: vi.fn(),
    fetchDepartmentOptions: vi.fn(),
    createAdminOpportunity: vi.fn(),
    updateAdminOpportunity: vi.fn(),
    runOpportunityAction: vi.fn(),
    fetchOpportunityApplicants: vi.fn(),
    setApplicantStatus: vi.fn(),
  }
})
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() } }))

const list = vi.mocked(fetchAdminOpportunities)
const act = vi.mocked(runOpportunityAction)
const create = vi.mocked(createAdminOpportunity)
const edit = vi.mocked(updateAdminOpportunity)
const applicantsOf = vi.mocked(fetchOpportunityApplicants)
const review = vi.mocked(setApplicantStatus)

function o(over: Partial<AdminOpportunity> = {}): AdminOpportunity {
  return {
    id: 1, incomingRequestId: 7, departmentId: 3, departmentName: 'التسويق والإعلام', title: 'فرصة تطوعية: مصمم محتوى', summary: 'تبحث إدارة التسويق عن متطوعين للمساهمة.',
    responsibilities: ['مهمة'], requiredSkills: ['تصميم'], preferredSkills: [], volunteersNeeded: 2, availability: '8 ساعات', duration: '3 أشهر', locationMode: 'remote', startDate: '', closesAt: '2026-11-30',
    applicationInstructions: '', status: 'draft', statusLabel: 'مسودة', isPublished: false, publishedAt: null,
    incomingRequest: { id: 7, title: 'مصمم محتوى' }, applicantsCount: 0, acceptsApplications: false, missingForPublish: {}, ...over,
  }
}

function listOf(items: AdminOpportunity[], canManage = true): AdminOpportunityList {
  return {
    items,
    meta: { currentPage: 1, lastPage: 1, perPage: 20, total: items.length },
    stats: { total: items.length, draft: 1, published: 1, closed: 0 },
    capabilities: { canViewAll: true, canManage, canMatchVolunteers: canManage, canCreateDraft: canManage },
  }
}

function applicants(over: Partial<ApplicantsResult> = {}): ApplicantsResult {
  return {
    items: [
      { id: 11, name: 'سارة الأحمد', status: 'pending', statusLabel: 'جديد', source: 'direct_application', sourceLabel: 'تقدّم مباشرة', appliedAt: '2026-10-12T10:00:00+00:00', reviewedAt: null, experienceLevel: 'متوسط', availability: '5-10 ساعات', skills: 'تصميم جرافيك', opportunity: { id: 1, title: 'فرصة تطوعية: مصمم محتوى' }, url: '/dashboard/hr/volunteer-requests/11' },
      { id: 12, name: 'خالد', status: 'accepted', statusLabel: 'مقبول', source: 'direct_application', sourceLabel: 'تقدّم مباشرة', appliedAt: '2026-10-11T10:00:00+00:00', reviewedAt: null, experienceLevel: null, availability: null, skills: null, opportunity: { id: 1, title: 'فرصة تطوعية: مصمم محتوى' }, url: '/dashboard/hr/volunteer-requests/12' },
    ],
    counts: { pending: 1, accepted: 1, reviewing: 0 },
    total: 2,
    opportunity: { id: 1, title: 'فرصة تطوعية: مصمم محتوى', status: 'published', statusLabel: 'منشورة', acceptsApplications: true },
    ...over,
  }
}

function http(status: number, data: unknown = {}): unknown {
  return { isAxiosError: true, name: 'AxiosError', message: 'x', config: {}, response: { status, data } }
}

const renderPage = () => render(<MemoryRouter><HrOpportunitiesPage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  list.mockResolvedValue(listOf([o(), o({ id: 2, status: 'published', statusLabel: 'منشورة', isPublished: true, acceptsApplications: true, applicantsCount: 2, incomingRequest: null, title: 'فرصة مستقلة' })]))
  vi.mocked(fetchDepartmentOptions).mockResolvedValue([{ id: 3, name: 'التسويق والإعلام' }])
  applicantsOf.mockResolvedValue(applicants())
})

describe('opportunity management page', () => {
  it('lists every opportunity with its state, origin, department and applicant count', async () => {
    const { container } = renderPage()
    const rows = await screen.findAllByTestId('opportunity-row')

    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByTestId('opportunity-status').textContent).toBe('مسودة')
    expect(within(rows[0]).getByText('من طلب وارد')).toBeTruthy()
    expect(within(rows[1]).getByText('فرصة مستقلة', { selector: 'h3' })).toBeTruthy()
    expect(within(rows[1]).getByText('منشورة')).toBeTruthy()
    expect(within(rows[1]).getAllByText('فرصة مستقلة').length).toBeGreaterThan(0)
    expect(within(rows[1]).getByTestId('applicants-count').textContent).toBe('2')
    expect(within(screen.getByTestId('kpi-published')).getByText('1')).toBeTruthy()
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'فرص التطوع' })).toBeTruthy()
  })

  it('a published opportunity links to its public page; one from a request links back to it', async () => {
    renderPage()
    const rows = await screen.findAllByTestId('opportunity-row')

    expect(within(rows[1]).getByRole('link', { name: /الصفحة العامة/ }).getAttribute('href')).toBe('/volunteer-opportunities/2')
    expect(within(rows[0]).getByRole('link', { name: /الطلب الوارد/ }).getAttribute('href')).toBe('/dashboard/hr/incoming-requests')
    expect(within(rows[0]).queryByRole('link', { name: /الصفحة العامة/ })).toBeNull()
  })

  it('a draft shows what is still missing before it can be published', async () => {
    list.mockResolvedValue(listOf([o({ missingForPublish: { required_skills: 'أضف مهارة مطلوبة واحدة على الأقل.', location_mode: 'حدّد نمط العمل (عن بُعد أو حضوري أو مختلط).' } })]))
    renderPage()

    const hint = await screen.findByTestId('missing-fields')
    expect(hint.textContent).toContain('أضف مهارة مطلوبة واحدة على الأقل.')
    expect(hint.textContent).toContain('حدّد نمط العمل')
  })

  it('publishing is a two-step action: nothing happens until it is confirmed', async () => {
    act.mockResolvedValue({ opportunity: o({ status: 'published' }), message: 'تم نشر الفرصة. أصبحت ظاهرة للزوار.' })
    renderPage()
    const row = (await screen.findAllByTestId('opportunity-row'))[0]

    await userEvent.click(within(row).getByRole('button', { name: 'نشر' }))
    expect(act).not.toHaveBeenCalled()
    const dialog = within(row).getByRole('alertdialog')
    expect(dialog.textContent).toContain('ظاهرًا لجميع الزوار')
    expect(dialog.textContent).toContain('لا يُرسَل أي إشعار')

    await userEvent.click(within(dialog).getByRole('button', { name: 'تأكيد النشر' }))

    await waitFor(() => expect(act).toHaveBeenCalledWith(1, 'publish'))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('تم نشر الفرصة. أصبحت ظاهرة للزوار.'))
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })

  it('cancelling the confirmation publishes nothing', async () => {
    renderPage()
    const row = (await screen.findAllByTestId('opportunity-row'))[0]

    await userEvent.click(within(row).getByRole('button', { name: 'نشر' }))
    await userEvent.click(within(row).getByRole('button', { name: 'تراجع' }))

    expect(act).not.toHaveBeenCalled()
    expect(within(row).queryByRole('alertdialog')).toBeNull()
  })

  it('reports the server\'s validation refusal instead of pretending it published', async () => {
    act.mockRejectedValueOnce(http(422, { errors: { required_skills: ['أضف مهارة مطلوبة واحدة على الأقل.'] } }))
    renderPage()
    const row = (await screen.findAllByTestId('opportunity-row'))[0]

    await userEvent.click(within(row).getByRole('button', { name: 'نشر' }))
    await userEvent.click(within(row).getByRole('button', { name: 'تأكيد النشر' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('لا يمكن النشر: أضف مهارة مطلوبة واحدة على الأقل.'))
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('a published opportunity can be closed or unpublished, each after a confirmation', async () => {
    act.mockResolvedValue({ opportunity: o(), message: 'تم.' })
    renderPage()
    const row = (await screen.findAllByTestId('opportunity-row'))[1]

    await userEvent.click(within(row).getByRole('button', { name: 'إغلاق التقديم' }))
    await userEvent.click(within(row).getByRole('button', { name: 'تأكيد الإغلاق' }))
    await waitFor(() => expect(act).toHaveBeenLastCalledWith(2, 'close'))

    await userEvent.click(within(row).getByRole('button', { name: 'إلغاء النشر' }))
    await userEvent.click(within(row).getByRole('button', { name: 'تأكيد إلغاء النشر' }))
    await waitFor(() => expect(act).toHaveBeenLastCalledWith(2, 'unpublish'))
  })

  it('shows applicants of an opportunity on demand', async () => {
    renderPage()
    const row = (await screen.findAllByTestId('opportunity-row'))[1]
    expect(applicantsOf).not.toHaveBeenCalled()

    await userEvent.click(within(row).getByRole('button', { name: /عرض المتقدمين/ }))

    const panel = await within(row).findByTestId('applicants-panel')
    expect(applicantsOf).toHaveBeenCalledWith(2)
    expect(within(panel).getAllByTestId('applicant')).toHaveLength(2)
  })

  it('creates a standalone opportunity as a draft (department chosen, never published by the form)', async () => {
    create.mockResolvedValue(o({ id: 9, incomingRequest: null }))
    renderPage()
    await screen.findAllByTestId('opportunity-row')

    await userEvent.click(screen.getByRole('button', { name: 'فرصة جديدة' }))
    await userEvent.type(await screen.findByLabelText('العنوان'), 'فرصة مستقلة جديدة')
    await userEvent.type(screen.getByLabelText('الوصف المختصر'), 'وصف مفصل لفرصة تطوعية جديدة')
    await userEvent.selectOptions(screen.getByLabelText('القسم'), '3')
    await userEvent.type(screen.getByLabelText('المدة'), 'شهران')
    expect(within(screen.getByRole('dialog')).queryByRole('button', { name: /نشر/ })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'حفظ كمسودة' }))

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(create.mock.calls[0][0]).toMatchObject({ title: 'فرصة مستقلة جديدة', departmentId: 3, duration: 'شهران' })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('تم حفظ الفرصة كمسودة.'))
  })

  it('edits an existing opportunity through the update endpoint', async () => {
    edit.mockResolvedValue(o())
    renderPage()
    const row = (await screen.findAllByTestId('opportunity-row'))[0]

    await userEvent.click(within(row).getByRole('button', { name: 'تعديل' }))
    expect((await screen.findByLabelText('العنوان') as HTMLInputElement).value).toBe('فرصة تطوعية: مصمم محتوى')
    expect((screen.getByLabelText('آخر موعد للتقديم') as HTMLInputElement).value).toBe('2026-11-30')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ كمسودة' }))

    await waitFor(() => expect(edit).toHaveBeenCalledWith(1, expect.objectContaining({ closesAt: '2026-11-30', duration: '3 أشهر' })))
    expect(create).not.toHaveBeenCalled()
  })

  it('hides every change control from a read-only viewer', async () => {
    list.mockResolvedValue(listOf([o(), o({ id: 2, status: 'published', statusLabel: 'منشورة', isPublished: true })], false))
    renderPage()
    await screen.findAllByTestId('opportunity-row')

    for (const name of ['نشر', 'تعديل', 'إغلاق التقديم', 'إلغاء النشر', 'فرصة جديدة']) {
      expect(screen.queryByRole('button', { name })).toBeNull()
    }
    expect(screen.getAllByRole('button', { name: /عرض المتقدمين/ }).length).toBeGreaterThan(0)
  })

  it('filters by state through the server', async () => {
    renderPage()
    await screen.findAllByTestId('opportunity-row')

    await userEvent.click(screen.getByRole('button', { name: 'منشورة' }))

    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'published' })))
  })

  it('shows loading, empty, error-with-retry and unauthorized states', async () => {
    list.mockReturnValueOnce(new Promise(() => {}))
    const first = renderPage()
    expect(screen.getByTestId('opportunities-admin-loading')).toBeTruthy()
    first.unmount()

    list.mockResolvedValueOnce(listOf([]))
    const second = renderPage()
    expect(await screen.findByText('لا توجد فرص بعد')).toBeTruthy()
    second.unmount()

    list.mockRejectedValueOnce(http(500))
    const third = renderPage()
    expect(await screen.findByText('تعذّر تحميل الفرص')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findAllByTestId('opportunity-row')).toHaveLength(2)
    third.unmount()

    list.mockRejectedValue(http(403))
    renderPage()
    expect(await screen.findByText('لا تملك صلاحية عرض الفرص التطوعية')).toBeTruthy()
    expect(screen.queryByTestId('opportunity-row')).toBeNull()
  })
})

describe('applicants panel', () => {
  const load = () => applicantsOf(1)

  it('lists applicants with their source, status, counts and a link to the application', async () => {
    render(<MemoryRouter><ApplicantsPanel load={load} canReview /></MemoryRouter>)
    const items = await screen.findAllByTestId('applicant')

    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('سارة الأحمد')).toBeTruthy()
    expect(within(items[0]).getByTestId('applicant-source').textContent).toBe('تقدّم مباشرة')
    expect(within(items[0]).getByText('جديد')).toBeTruthy()
    expect(within(items[0]).getByText(/عبر الفرصة: فرصة تطوعية: مصمم محتوى/)).toBeTruthy()
    expect(within(items[0]).getByRole('link', { name: /عرض الطلب/ }).getAttribute('href')).toBe('/dashboard/hr/volunteer-requests/11')
    expect(screen.getByTestId('applicants-total').textContent).toBe('2')
    expect(screen.getByTestId('applicant-counts').textContent).toContain('جديد: 1')
  })

  it('review actions use the existing workflow and reload, without touching anything else', async () => {
    review.mockResolvedValue()
    render(<MemoryRouter><ApplicantsPanel load={load} canReview /></MemoryRouter>)
    const first = (await screen.findAllByTestId('applicant'))[0]

    await userEvent.click(within(first).getByRole('button', { name: 'بدء المراجعة' }))

    await waitFor(() => expect(review).toHaveBeenCalledWith(11, 'reviewing'))
    await waitFor(() => expect(applicantsOf).toHaveBeenCalledTimes(2))
    expect(toast.success).toHaveBeenCalledWith('تم تحديث حالة المتقدم.')
    // The accepted applicant is not offered "accept" again.
    const second = screen.getAllByTestId('applicant')[1]
    expect(within(second).queryByRole('button', { name: 'قبول' })).toBeNull()
    expect(within(second).getByRole('button', { name: 'رفض' })).toBeTruthy()
  })

  it('offers no review action without permission', async () => {
    render(<MemoryRouter><ApplicantsPanel load={load} canReview={false} /></MemoryRouter>)
    await screen.findAllByTestId('applicant')

    for (const name of ['بدء المراجعة', 'قبول', 'رفض']) {
      expect(screen.queryByRole('button', { name })).toBeNull()
    }
  })

  it('shows an empty message, a permission message and an error', async () => {
    applicantsOf.mockResolvedValueOnce(applicants({ items: [], total: 0, counts: {} }))
    const a = render(<MemoryRouter><ApplicantsPanel load={load} canReview emptyText="لم يتقدم أحد بعد." /></MemoryRouter>)
    expect(await screen.findByText('لم يتقدم أحد بعد.')).toBeTruthy()
    a.unmount()

    applicantsOf.mockRejectedValueOnce(http(403))
    const b = render(<MemoryRouter><ApplicantsPanel load={load} canReview /></MemoryRouter>)
    expect(await screen.findByText('لا تملك صلاحية عرض بيانات المتقدمين.')).toBeTruthy()
    b.unmount()

    applicantsOf.mockRejectedValueOnce(http(500))
    render(<MemoryRouter><ApplicantsPanel load={load} canReview /></MemoryRouter>)
    expect(await screen.findByText('تعذّر تحميل المتقدمين.')).toBeTruthy()
  })

  it('reports a failed review instead of silently ignoring it', async () => {
    review.mockRejectedValueOnce(http(403, { message: 'ليس لديك صلاحية.' }))
    render(<MemoryRouter><ApplicantsPanel load={load} canReview /></MemoryRouter>)
    const first = (await screen.findAllByTestId('applicant'))[0]

    await userEvent.click(within(first).getByRole('button', { name: 'رفض' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('ليس لديك صلاحية.'))
  })
})

describe('admin api client', () => {
  it('normalizes a partial opportunity payload and defaults everything safely', () => {
    const r = normalizeAdminOpportunity({ id: 4, status: 'published', incoming_request: null, missing_for_publish: { title: 'x' } })

    expect(r).toMatchObject({ id: 4, status: 'published', incomingRequest: null, applicantsCount: 0, acceptsApplications: false, responsibilities: [] })
    expect(r.missingForPublish).toEqual({ title: 'x' })
  })

  it('never turns a hostile applicant link into an off-site link', async () => {
    const { default: apiClient } = await import('@/api/axios')
    const actual = await vi.importActual<typeof import('@/api/volunteerOpportunitiesAdminApi')>('@/api/volunteerOpportunitiesAdminApi')
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { items: [{ id: 1, name: 'x', url: 'https://evil.example' }], counts: {}, total: 1 } } } as never)

    const res = await actual.fetchRequestApplicants(5)

    expect(res.items[0].url).toBe('/dashboard')
    spy.mockRestore()
  })
})
