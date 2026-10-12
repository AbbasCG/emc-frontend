import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, type AxiosResponse } from 'axios'
import MeetingReportsPage from '@/pages/operations/MeetingReportsPage'

/**
 * The page runs against the REAL api module (normalization included); only the
 * HTTP client and the department-scope hook are replaced. That is what makes the
 * crash regression meaningful: the raw payload that broke production is fed
 * through the same code path production uses.
 */

const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock('@/api/axios', () => ({ default: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a) } }))

const mockAccess = vi.fn()
vi.mock('@/hooks/useDepartmentAccess', () => ({ useDepartmentAccess: () => mockAccess() }))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

// ── Fixtures ────────────────────────────────────────────────────────────────

const LEADER_ACCESS = {
  manifest: {
    department_scope: 'restricted', allowed_departments: [{ id: 1, name: 'إدارة البرامج' }], can_select_any_department: false,
    can_create_report: true,
  },
  loading: false, error: false, soleDepartmentId: 1,
  readableDepartments: [{ id: 1, name: 'إدارة البرامج' }], canViewMultipleDepartments: false,
}
const MEMBER_ACCESS = {
  manifest: { department_scope: 'restricted', allowed_departments: [], can_select_any_department: false, can_create_report: false },
  loading: false, error: false, soleDepartmentId: null,
  readableDepartments: [{ id: 1, name: 'إدارة البرامج' }], canViewMultipleDepartments: false,
}
const GLOBAL_ACCESS = {
  manifest: { department_scope: 'global', allowed_departments: [{ id: 1, name: 'إدارة البرامج' }, { id: 2, name: 'إدارة الجودة' }], can_select_any_department: true, can_create_report: true },
  loading: false, error: false, soleDepartmentId: null,
  readableDepartments: [{ id: 1, name: 'إدارة البرامج' }, { id: 2, name: 'إدارة الجودة' }], canViewMultipleDepartments: true,
}

const STATS = { total: 2, this_month: 1, latest_at: '2026-10-12T09:30:00+00:00', attendance_rate: 75 }

const row = (over: Record<string, unknown> = {}) => ({
  id: 1, title: 'الاجتماع الأسبوعي', meeting_date: '2026-10-12', department: { id: 1, name: 'إدارة البرامج' },
  author: { id: 9, name: 'قائد الإدارة' }, ratings_count: 4, attended_count: 3, created_at: '2026-10-12T09:30:00+00:00', ...over,
})

function listResponse(rows: unknown[], extra: Record<string, unknown> = {}, stats: Record<string, unknown> = STATS) {
  return {
    data: {
      success: true,
      data: { data: rows, total: rows.length, current_page: 1, last_page: 1, ...extra },
      stats,
    },
  }
}

const axiosError = (status?: number) =>
  new AxiosError('failed', status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK', undefined, undefined,
    status ? ({ status, data: {}, statusText: '', headers: {}, config: {} } as AxiosResponse) : undefined)

/** Routes GETs: list vs details. */
function serve(handlers: { list?: () => unknown; detail?: (id: number) => unknown }) {
  mockGet.mockImplementation(async (url: string) => {
    const detail = url.match(/meeting-reports\/(\d+)$/)
    if (detail) {
      const out = handlers.detail?.(Number(detail[1]))
      if (out instanceof Error) throw out
      return out
    }
    if (url.endsWith('/meeting-reports')) {
      const out = handlers.list?.()
      if (out instanceof Error) throw out
      return out
    }
    return { data: { data: [] } }
  })
}

const lastListParams = () => {
  const calls = mockGet.mock.calls.filter((c) => String(c[0]).endsWith('/meeting-reports'))
  return (calls[calls.length - 1]?.[1] as { params?: Record<string, unknown> } | undefined)?.params ?? {}
}

beforeEach(() => {
  mockGet.mockReset()
  mockPost.mockReset()
  mockAccess.mockReset()
  mockAccess.mockReturnValue(LEADER_ACCESS)
})

describe('meeting reports page — rendering', () => {
  it('shows a loading skeleton first, then the reports', async () => {
    serve({ list: () => listResponse([row()]) })
    render(<MeetingReportsPage />)

    expect(screen.getByLabelText('جارٍ تحميل التقارير')).toBeInTheDocument()
    expect(await screen.findByText('الاجتماع الأسبوعي')).toBeInTheDocument()
    expect(screen.queryByLabelText('جارٍ تحميل التقارير')).not.toBeInTheDocument()
  })

  it('renders title, date, department, author and attendance on the card', async () => {
    serve({ list: () => listResponse([row()]) })
    render(<MeetingReportsPage />)

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('button')!
    expect(within(card).getByText('إدارة البرامج')).toBeInTheDocument()
    expect(within(card).getByText('قائد الإدارة')).toBeInTheDocument()
    expect(within(card).getByText(/12/)).toBeInTheDocument()
    expect(within(card).getByText('3/4')).toBeInTheDocument()
  })

  it('does NOT crash on the legacy row that took production down (null title, date, department, author)', async () => {
    // Exactly what the old list endpoint returned for a lounge quick-report.
    const legacy = {
      id: 7, department_id: null, meeting_id: 3, title: null, meeting_date: null, achieved: null, planned: null,
      created_by: null, challenges: 'تحدي', created_at: '2026-10-12T22:23:06.000000Z', updated_at: '2026-10-12T22:23:06.000000Z',
      ratings_count: 0, department: null, author: null,
    }
    serve({ list: () => listResponse([legacy]) })
    render(<MeetingReportsPage />)

    expect(await screen.findByText('تقرير اجتماع')).toBeInTheDocument()
    expect(screen.getByText('غير محدّدة')).toBeInTheDocument()
    expect(screen.getByText('غير معروف')).toBeInTheDocument()
    expect(screen.getByText('بلا سجل حضور')).toBeInTheDocument()
  })

  it('survives garbage rows and a missing stats block without throwing', async () => {
    serve({ list: () => ({ data: { success: true, data: { data: [null, 5, 'x', { nope: true }, row({ id: 2, title: 'سليم' })] } } }) })
    render(<MeetingReportsPage />)

    expect(await screen.findByText('سليم')).toBeInTheDocument()
    expect(screen.getByTestId('kpi-إجمالي التقارير')).toHaveTextContent('0')
  })

  it('survives a payload with no data at all', async () => {
    serve({ list: () => ({ data: {} }) })
    render(<MeetingReportsPage />)

    expect(await screen.findByText('لا توجد تقارير اجتماعات بعد')).toBeInTheDocument()
  })

  it('shows the four KPIs from the server', async () => {
    serve({ list: () => listResponse([row()]) })
    render(<MeetingReportsPage />)

    await screen.findByText('الاجتماع الأسبوعي')
    expect(screen.getByTestId('kpi-إجمالي التقارير')).toHaveTextContent('2')
    expect(screen.getByTestId('kpi-تقارير هذا الشهر')).toHaveTextContent('1')
    expect(screen.getByTestId('kpi-نسبة الحضور')).toHaveTextContent('75%')
    expect(screen.getByTestId('kpi-آخر تقرير')).toHaveTextContent('2026')
  })

  it('shows a dash instead of a misleading zero when attendance was never recorded', async () => {
    serve({ list: () => listResponse([row({ ratings_count: 0, attended_count: 0 })], {}, { ...STATS, attendance_rate: null }) })
    render(<MeetingReportsPage />)

    await screen.findByText('الاجتماع الأسبوعي')
    expect(screen.getByTestId('kpi-نسبة الحضور')).toHaveTextContent('—')
  })
})

describe('meeting reports page — empty and error states', () => {
  it('empty state invites a leader to upload', async () => {
    serve({ list: () => listResponse([], {}, { total: 0, this_month: 0, latest_at: null, attendance_rate: null }) })
    render(<MeetingReportsPage />)

    expect(await screen.findByText('لا توجد تقارير اجتماعات بعد')).toBeInTheDocument()
    expect(screen.getByText('ابدأ بتوثيق أول اجتماع لإدارتك.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /رفع تقرير اجتماع/ }).length).toBeGreaterThan(0)
  })

  it('empty state for a read-only user has no upload call to action', async () => {
    mockAccess.mockReturnValue(MEMBER_ACCESS)
    serve({ list: () => listResponse([]) })
    render(<MeetingReportsPage />)

    expect(await screen.findByText('لا توجد تقارير اجتماعات بعد')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /رفع تقرير اجتماع/ })).not.toBeInTheDocument()
  })

  it('a 500 shows a clear error with retry, and retrying recovers', async () => {
    let fail = true
    serve({ list: () => (fail ? axiosError(500) : listResponse([row()])) })
    render(<MeetingReportsPage />)

    expect(await screen.findByText('حدث خطأ أثناء تحميل التقارير')).toBeInTheDocument()
    expect(screen.queryByText('تعذّر تحميل هذه الصفحة')).not.toBeInTheDocument()

    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByText('الاجتماع الأسبوعي')).toBeInTheDocument()
  })

  it('a 403 shows a permission message and offers no pointless retry', async () => {
    serve({ list: () => axiosError(403) })
    render(<MeetingReportsPage />)

    expect(await screen.findByText('لا تملك صلاحية عرض هذه التقارير')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).not.toBeInTheDocument()
  })

  it('a 401 tells the user the session ended', async () => {
    serve({ list: () => axiosError(401) })
    render(<MeetingReportsPage />)

    expect(await screen.findByText('انتهت جلسة الدخول')).toBeInTheDocument()
  })

  it('a 422 explains the filters were invalid and allows retry', async () => {
    serve({ list: () => axiosError(422) })
    render(<MeetingReportsPage />)

    expect(await screen.findByText('بيانات غير صالحة')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument()
  })

  it('a network failure is reported as a connection problem', async () => {
    serve({ list: () => axiosError() })
    render(<MeetingReportsPage />)

    expect(await screen.findByText('تعذّر الاتصال بالخادم')).toBeInTheDocument()
  })
})

describe('meeting reports page — permissions on the UI', () => {
  it('shows the upload button to a department leader and opens the form', async () => {
    serve({ list: () => listResponse([row()]) })
    render(<MeetingReportsPage />)

    await userEvent.click(await screen.findByRole('button', { name: /رفع تقرير اجتماع/ }))

    const dialog = await screen.findByRole('dialog', { name: 'رفع تقرير اجتماع' })
    expect(within(dialog).getByLabelText(/عنوان الاجتماع/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'حفظ التقرير' })).toBeInTheDocument()
  })

  it('hides the upload button from a member who does not lead a department', async () => {
    mockAccess.mockReturnValue(MEMBER_ACCESS)
    serve({ list: () => listResponse([row()]) })
    render(<MeetingReportsPage />)

    await screen.findByText('الاجتماع الأسبوعي')
    expect(screen.queryByRole('button', { name: /رفع تقرير اجتماع/ })).not.toBeInTheDocument()
  })

  it('hides it while the department scope is still loading', async () => {
    mockAccess.mockReturnValue({ ...MEMBER_ACCESS, manifest: null, loading: true })
    serve({ list: () => listResponse([row()]) })
    render(<MeetingReportsPage />)

    await screen.findByText('الاجتماع الأسبوعي')
    expect(screen.queryByRole('button', { name: /رفع تقرير اجتماع/ })).not.toBeInTheDocument()
  })

  it('validates required fields in the form before calling the server', async () => {
    serve({ list: () => listResponse([row()]) })
    render(<MeetingReportsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /رفع تقرير اجتماع/ }))
    const dialog = await screen.findByRole('dialog', { name: 'رفع تقرير اجتماع' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ التقرير' }))

    expect(await within(dialog).findByText('اكتب عنوان الاجتماع.')).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('submits the report and refreshes the list', async () => {
    serve({ list: () => listResponse([row()]), detail: () => ({ data: {} }) })
    mockGet.mockImplementation(async (url: string) =>
      url.includes('/members') ? { data: { data: [{ id: 5, name: 'عضو', role: null, role_title: null, kind: 'team' }] } } : listResponse([row()]),
    )
    mockPost.mockResolvedValue({ data: { success: true, data: { id: 99 } } })
    render(<MeetingReportsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /رفع تقرير اجتماع/ }))
    const dialog = await screen.findByRole('dialog', { name: 'رفع تقرير اجتماع' })

    await userEvent.type(within(dialog).getByLabelText(/عنوان الاجتماع/), 'اجتماع الإطلاق')
    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ التقرير' }))

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1))
    const [url, body] = mockPost.mock.calls[0] as [string, { title: string; department_id: number; ratings: unknown[] }]
    expect(url).toBe('/operations/meeting-reports')
    expect(body.title).toBe('اجتماع الإطلاق')
    expect(body.department_id).toBe(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows server validation errors inline and keeps the form open', async () => {
    serve({ list: () => listResponse([row()]) })
    mockPost.mockRejectedValue(
      Object.assign(new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 422, data: { message: 'invalid', errors: { title: ['The title field is required.'] } }, statusText: '', headers: {}, config: {},
      } as unknown as AxiosResponse)),
    )
    render(<MeetingReportsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /رفع تقرير اجتماع/ }))
    const dialog = await screen.findByRole('dialog', { name: 'رفع تقرير اجتماع' })
    await userEvent.type(within(dialog).getByLabelText(/عنوان الاجتماع/), 'x')

    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ التقرير' }))

    expect(await within(dialog).findByText('راجع الحقول المظلَّلة ثم أعد المحاولة.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'رفع تقرير اجتماع' })).toBeInTheDocument()
  })

  it('shows a 403 from the server on save as a message, not a crash', async () => {
    serve({ list: () => listResponse([row()]) })
    mockPost.mockRejectedValue(
      new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 403, data: { message: 'ليست لديك صلاحية إنشاء تقرير لهذه الإدارة' }, statusText: '', headers: {}, config: {},
      } as unknown as AxiosResponse),
    )
    render(<MeetingReportsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /رفع تقرير اجتماع/ }))
    const dialog = await screen.findByRole('dialog', { name: 'رفع تقرير اجتماع' })
    await userEvent.type(within(dialog).getByLabelText(/عنوان الاجتماع/), 'x')

    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ التقرير' }))

    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()
  })
})

describe('meeting reports page — filters, paging and details', () => {
  it('searches by title after a short pause and sends it to the server', async () => {
    serve({ list: () => listResponse([row()]) })
    render(<MeetingReportsPage />)
    await screen.findByText('الاجتماع الأسبوعي')

    await userEvent.type(screen.getByPlaceholderText('ابحث بعنوان الاجتماع…'), 'خطة')

    await waitFor(() => expect(lastListParams().q).toBe('خطة'))
    expect(lastListParams().page).toBe(1)
  })

  it('shows the no-results state for an active filter and clears it', async () => {
    serve({ list: () => listResponse([]) })
    render(<MeetingReportsPage />)
    await screen.findByText('لا توجد تقارير اجتماعات بعد')

    await userEvent.type(screen.getByPlaceholderText('ابحث بعنوان الاجتماع…'), 'لا شيء')

    expect(await screen.findByText('لا توجد تقارير مطابقة')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'مسح التصفية' })[0])
    await waitFor(() => expect(lastListParams().q).toBeUndefined())
  })

  it('sends the date range', async () => {
    serve({ list: () => listResponse([row()]) })
    render(<MeetingReportsPage />)
    await screen.findByText('الاجتماع الأسبوعي')

    await userEvent.type(screen.getByLabelText('من تاريخ'), '2026-01-01')

    await waitFor(() => expect(lastListParams().date_from).toBe('2026-01-01'))
  })

  it('offers a department filter only to users who can browse several departments', async () => {
    serve({ list: () => listResponse([row()]) })
    const { unmount } = render(<MeetingReportsPage />)
    await screen.findByText('الاجتماع الأسبوعي')
    expect(screen.queryByLabelText('الإدارة')).not.toBeInTheDocument()
    unmount()

    mockAccess.mockReturnValue(GLOBAL_ACCESS)
    render(<MeetingReportsPage />)
    const select = await screen.findByLabelText('الإدارة')
    await userEvent.selectOptions(select, '2')

    await waitFor(() => expect(lastListParams().department_id).toBe(2))
  })

  it('collapses the filters behind a toggle for small screens', async () => {
    serve({ list: () => listResponse([row()]) })
    render(<MeetingReportsPage />)
    await screen.findByText('الاجتماع الأسبوعي')

    const toggle = screen.getByRole('button', { name: /^تصفية/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('pages through results', async () => {
    serve({ list: () => listResponse([row()], { last_page: 3, total: 30, current_page: 1 }) })
    render(<MeetingReportsPage />)
    await screen.findByText('الاجتماع الأسبوعي')

    await userEvent.click(screen.getByRole('button', { name: /التالي/ }))

    await waitFor(() => expect(lastListParams().page).toBe(2))
  })

  it('opens the details panel with the minutes, attendance and scores', async () => {
    serve({
      list: () => listResponse([row()]),
      detail: () => ({
        data: {
          success: true,
          data: {
            ...row(), achieved: 'أنجزنا الخطة', planned: 'سننجز المرحلة التالية', needs: null, needs_reason: null, decisions: 'اعتماد الميزانية',
            notes: null, extras: {},
            ratings: [
              { id: 1, attended: true, scores: null, avg_score: 9.2, note: null, user: { id: 5, name: 'سارة' } },
              { id: 2, attended: false, scores: null, avg_score: null, note: null, user: { id: 6, name: 'أحمد' } },
              { id: 3, attended: true, scores: null, avg_score: null, note: null, user: null },
            ],
          },
        },
      }),
    })
    render(<MeetingReportsPage />)

    await userEvent.click(await screen.findByText('الاجتماع الأسبوعي'))

    const panel = await screen.findByRole('dialog', { name: 'تفاصيل تقرير الاجتماع' })
    expect(await within(panel).findByText('أنجزنا الخطة')).toBeInTheDocument()
    expect(within(panel).getByText('اعتماد الميزانية')).toBeInTheDocument()
    expect(within(panel).getByText('9.2/10')).toBeInTheDocument()
    expect(within(panel).getByText('غائب')).toBeInTheDocument()
    expect(within(panel).getByText('عضو غير معروف')).toBeInTheDocument()
    // Sections with no text are not rendered as empty boxes, and there is no file area.
    expect(within(panel).queryByText('الاحتياجات')).not.toBeInTheDocument()
    expect(within(panel).queryByText(/تنزيل|مرفق/)).not.toBeInTheDocument()
  })

  it('details of a legacy row render the quick-report figures', async () => {
    serve({
      list: () => listResponse([row({ id: 7, title: null, meeting_date: null, department: null, author: null })]),
      detail: () => ({
        data: {
          data: {
            id: 7, title: 'تقرير دوري — اجتماع', meeting_date: '2026-09-14', department: null, author: null, ratings_count: 0, attended_count: 0,
            created_at: '2026-09-14T10:00:00Z', achieved: 'أُنجزت المهام', planned: null, needs: null, needs_reason: 'تحدي الجدولة',
            decisions: null, notes: null,
            extras: { kpi_percentage: 80, absentees: ['أحمد', 'ليلى'], top_interactive_member: 'سارة' }, ratings: [],
          },
        },
      }),
    })
    render(<MeetingReportsPage />)

    await userEvent.click(await screen.findByText('تقرير اجتماع'))

    const panel = await screen.findByRole('dialog', { name: 'تفاصيل تقرير الاجتماع' })
    expect(await within(panel).findByText('تحدي الجدولة')).toBeInTheDocument()
    expect(within(panel).getByText('80%')).toBeInTheDocument()
    expect(within(panel).getByText('أحمد، ليلى')).toBeInTheDocument()
    expect(within(panel).getByText('لم يُسجَّل حضور لهذا الاجتماع.')).toBeInTheDocument()
  })

  it('a 403 on one report shows a permission message inside the panel and leaves the list intact', async () => {
    serve({ list: () => listResponse([row()]), detail: () => axiosError(403) })
    render(<MeetingReportsPage />)

    await userEvent.click(await screen.findByText('الاجتماع الأسبوعي'))

    const panel = await screen.findByRole('dialog', { name: 'تفاصيل تقرير الاجتماع' })
    expect(await within(panel).findByText('لا تملك صلاحية عرض هذه التقارير')).toBeInTheDocument()
    await userEvent.click(within(panel).getByRole('button', { name: 'إغلاق' }))
    expect(screen.getByText('الاجتماع الأسبوعي')).toBeInTheDocument()
  })

  it('a failed details request can be retried', async () => {
    let fail = true
    serve({
      list: () => listResponse([row()]),
      detail: () => (fail ? axiosError(500) : { data: { data: { ...row(), achieved: 'تم', extras: {}, ratings: [] } } }),
    })
    render(<MeetingReportsPage />)
    await userEvent.click(await screen.findByText('الاجتماع الأسبوعي'))
    const panel = await screen.findByRole('dialog', { name: 'تفاصيل تقرير الاجتماع' })
    await within(panel).findByText('حدث خطأ أثناء تحميل التقارير')

    fail = false
    await userEvent.click(within(panel).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await within(panel).findByText('تم')).toBeInTheDocument()
  })

  it('closes the details panel with Escape', async () => {
    serve({ list: () => listResponse([row()]), detail: () => ({ data: { data: { ...row(), extras: {}, ratings: [] } } }) })
    render(<MeetingReportsPage />)
    await userEvent.click(await screen.findByText('الاجتماع الأسبوعي'))
    await screen.findByRole('dialog', { name: 'تفاصيل تقرير الاجتماع' })

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('meeting reports page — layout contract', () => {
  it('is right-to-left and never renders a wide table (cards at every width)', async () => {
    serve({ list: () => listResponse([row(), row({ id: 2, title: 'ثان' })]) })
    const { container } = render(<MeetingReportsPage />)
    await screen.findByText('الاجتماع الأسبوعي')

    expect(container.firstElementChild).toHaveAttribute('dir', 'rtl')
    expect(container.querySelector('table')).toBeNull()
    expect(screen.getByTestId('meeting-reports-list').children).toHaveLength(2)
  })
})

describe('meeting reports page — reports filed from the lounge', () => {
  it('shows the source meeting type on the card and the linked meeting in the details', async () => {
    serve({
      list: () => listResponse([row({ meeting: { id: 8, title: 'مراجعة الجودة الفصلية', type: 'quality' } })]),
      detail: () => ({ data: { data: { ...row({ meeting: { id: 8, title: 'مراجعة الجودة الفصلية', type: 'quality' } }), achieved: 'تم', extras: {}, ratings: [] } } }),
    })
    render(<MeetingReportsPage />)

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('button')!
    expect(within(card).getByTestId('report-source')).toHaveTextContent('اجتماع الجودة')

    await userEvent.click(card)
    const panel = await screen.findByRole('dialog')
    expect(await within(panel).findByTestId('report-source-meeting')).toHaveTextContent('مراجعة الجودة الفصلية')
  })

  it('a standalone department report has no source chip', async () => {
    serve({ list: () => listResponse([row()]) })
    render(<MeetingReportsPage />)

    await screen.findByText('الاجتماع الأسبوعي')
    expect(screen.queryByTestId('report-source')).not.toBeInTheDocument()
  })
})
