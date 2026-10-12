import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactElement } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AxiosError, type AxiosResponse } from 'axios'
import OpsMeetingsPage from '@/pages/operations/admin/OpsMeetingsPage'
import MeetingLoungePage from '@/pages/department/MeetingLoungePage'
import OpsMeetingDetailPage from '@/pages/operations/admin/OpsMeetingDetailPage'

/**
 * Both meeting pages run against the REAL api module (normalization included).
 * Only the HTTP client is replaced, by a tiny in-memory "server" that behaves
 * like the real one: creating a meeting adds a row to the list, filing a report
 * flips the row to has_report and refuses a second report with the same 422.
 */

const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock('@/api/axios', () => ({
  default: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a), patch: vi.fn() },
}))

vi.mock('@/api/operationsApi', () => ({
  fetchWorkspaceDepartments: vi.fn().mockResolvedValue({ items: [{ id: '1', name_ar: 'إدارة البرامج' }, { id: '2', name_ar: 'إدارة الجودة' }], noDepartmentLinked: false }),
}))

vi.mock('@/api/aiInsightsApi', () => ({ fetchMeetingIntelligence: vi.fn().mockResolvedValue(null) }))
vi.mock('@/api/tasksApi', () => ({ createTaskFromActionItem: vi.fn() }))
vi.mock('@/components/ai/AiSummaryPanel', () => ({ default: () => null }))

let mockAccessible: Record<string, boolean> = {}
vi.mock('@/contexts/PageAccessContext', () => ({
  usePageAccess: () => ({ canAccessPath: (p: string) => mockAccessible[p] === true }),
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

// ── In-memory server ─────────────────────────────────────────────────────────

type Row = Record<string, unknown>

const DUP = 'تم رفع تقرير لهذا الاجتماع مسبقًا.'

const row = (over: Row = {}): Row => ({
  id: 1, title: 'الاجتماع الأسبوعي', type: 'department', status: 'scheduled', display_status: 'scheduled',
  meeting_date: '2026-11-02', start_time: '10:00', end_time: '11:00', department: { id: 1, name: 'إدارة البرامج' },
  organizer: { id: 9, name: 'نورة العتيبي' }, has_report: false, report_id: null,
  capabilities: { can_manage: true, can_upload_report: true, can_view_report: false }, created_at: '2026-10-01T09:00:00Z', ...over,
})

const withReport = (over: Row = {}): Row =>
  row({ ...over, display_status: 'report_submitted', status: 'completed', has_report: true, report_id: 5,
    capabilities: { can_manage: true, can_upload_report: false, can_view_report: true } })

const REPORT = {
  id: 5, meeting_id: 1, absentees: ['أحمد'], team_commitment_score: 4, team_commitment_notes: null, completed_tasks_summary: 'أُنجزت خطة الربع',
  kpi_percentage: 90, top_interactive_member: 'سارة', challenges: 'ضيق الوقت', executive_requests: null, next_month_goals: 'إطلاق النسخة',
  improvement_suggestions: null, uploaded_by: { id: 9, name: 'نورة العتيبي' }, uploaded_at: '2026-10-20T08:00:00Z',
}

const server = {
  meetings: [] as Row[],
  access: { can_create: true, creatable_departments: [{ id: 1, name: 'إدارة البرامج' }] as unknown },
  stats: { total: 0, this_month: 0, awaiting_report: 0, with_report: 0 },
  failList: null as null | (() => Error),
  failDetail: null as null | (() => Error),
  failReport: null as null | (() => Error),
}

const axiosError = (status?: number, data: unknown = {}) =>
  new AxiosError('failed', status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK', undefined, undefined,
    status ? ({ status, data, statusText: '', headers: {}, config: {} } as AxiosResponse) : undefined)

function listBody() {
  const rows = server.meetings
  return {
    data: {
      success: true,
      data: { data: rows, meta: { current_page: 1, last_page: 1, total: rows.length } },
      stats: server.stats,
      access: server.access,
    },
  }
}

const listCalls = () => mockGet.mock.calls.filter((c) => c[0] === '/department/meetings')
const lastParams = () => (listCalls().at(-1)?.[1] as { params?: Record<string, unknown> } | undefined)?.params ?? {}

function setServer(meetings: Row[], over: Partial<typeof server> = {}) {
  server.meetings = meetings
  server.access = { can_create: true, creatable_departments: [{ id: 1, name: 'إدارة البرامج' }] }
  server.stats = { total: meetings.length, this_month: meetings.length, awaiting_report: 0, with_report: meetings.filter((m) => m?.has_report).length }
  server.failList = null
  server.failDetail = null
  server.failReport = null
  Object.assign(server, over)
}

beforeEach(() => {
  mockGet.mockReset()
  mockPost.mockReset()
  mockAccessible = {}

  mockGet.mockImplementation(async (url: string) => {
    if (url === '/department/meetings') {
      if (server.failList) throw server.failList()
      return listBody()
    }
    const detail = url.match(/^\/department\/meetings\/(\d+)$/)
    if (detail) {
      if (server.failDetail) throw server.failDetail()
      const m = server.meetings.find((x) => x.id === Number(detail[1]))
      if (!m) throw axiosError(404)
      return { data: { success: true, data: { ...m, report: m.has_report ? REPORT : null, decisions: [], action_items: [], attendees: [], agenda: null } } }
    }
    return { data: {} }
  })

  mockPost.mockImplementation(async (url: string, body: Row) => {
    if (url === '/department/meetings') {
      const created = row({ id: 100 + server.meetings.length, title: body.title, type: body.type, meeting_date: body.meeting_date, start_time: body.start_time })
      server.meetings = [created, ...server.meetings]
      return { data: { success: true, data: created } }
    }
    const rep = url.match(/^\/department\/meetings\/(\d+)\/report$/)
    if (rep) {
      if (server.failReport) throw server.failReport()
      const idx = server.meetings.findIndex((x) => x.id === Number(rep[1]))
      if (server.meetings[idx].has_report) throw axiosError(422, { message: DUP, errors: { meeting: [DUP] } })
      server.meetings[idx] = withReport({ ...server.meetings[idx], has_report: true })
      return { data: { success: true, data: { ...server.meetings[idx], report: REPORT } } }
    }
    return { data: {} }
  })
})

function renderPage(ui: ReactElement, path = '/x') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>,
  )
}

const admin = () => renderPage(<OpsMeetingsPage />)
const lounge = () => renderPage(<MeetingLoungePage />)

async function fillSchedule(dialog: HTMLElement, title = 'اجتماع الإطلاق') {
  await userEvent.type(within(dialog).getByLabelText(/عنوان الاجتماع/), title)
  await userEvent.type(within(dialog).getByLabelText(/تاريخ الاجتماع/), '2026-12-01')
  await userEvent.type(within(dialog).getByLabelText(/وقت البدء/), '09:30')
}

async function openReportForm(title: string) {
  const card = (await screen.findByText(title)).closest('li')!
  await userEvent.click(within(card).getByRole('button', { name: 'رفع التقرير' }))
  return screen.findByRole('dialog', { name: 'رفع تقرير الاجتماع' })
}

async function nextStep(dialog: HTMLElement) {
  await userEvent.click(within(dialog).getByRole('button', { name: /التالي/ }))
}

// ═══ Admin schedule ══════════════════════════════════════════════════════════

describe('admin meetings page', () => {
  it('explains its purpose and renders KPIs and meeting cards', async () => {
    setServer([row(), withReport({ id: 2, title: 'مراجعة الجودة', type: 'quality' })], {
      stats: { total: 9, this_month: 4, awaiting_report: 2, with_report: 3 },
    })
    admin()

    expect(screen.getByRole('heading', { level: 1, name: 'جدول الاجتماعات' })).toBeInTheDocument()
    expect(screen.getByText(/هنا تُجدول الاجتماعات/)).toBeInTheDocument()
    expect(await screen.findByText('الاجتماع الأسبوعي')).toBeInTheDocument()
    expect(screen.getByText('مراجعة الجودة')).toBeInTheDocument()
    expect(screen.getByTestId('kpi-إجمالي الاجتماعات')).toHaveTextContent('9')
    expect(screen.getByTestId('kpi-اجتماعات هذا الشهر')).toHaveTextContent('4')
    expect(screen.getByTestId('kpi-بانتظار التقرير')).toHaveTextContent('2')
    expect(screen.getByTestId('kpi-تم رفع التقرير')).toHaveTextContent('3')
  })

  it('shows plain Arabic labels and never a raw enum value', async () => {
    setServer([
      row({ id: 1, display_status: 'scheduled', type: 'external_partner' }),
      row({ id: 2, title: 'ب', display_status: 'in_progress', type: 'executive' }),
      row({ id: 3, title: 'ج', display_status: 'awaiting_report', type: 'partnerships' }),
      withReport({ id: 4, title: 'د' }),
      row({ id: 5, title: 'هـ', display_status: 'cancelled', status: 'cancelled' }),
    ])
    const { container } = admin()
    await screen.findByText('هـ')

    for (const label of ['مجدول', 'جارٍ الآن', 'بانتظار رفع التقرير', 'ملغى']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    expect(screen.getAllByText('تم رفع التقرير').length).toBeGreaterThan(0)
    const list = within(screen.getByTestId('meetings-list'))
    expect(list.getByText('اجتماع مع شريك خارجي')).toBeInTheDocument()
    expect(list.getByText('اجتماع الإدارة العليا')).toBeInTheDocument()
    expect(container.textContent ?? '').not.toMatch(/in_progress|awaiting_report|report_submitted|external_partner|scheduled|executive|partnerships|cancelled/)
  })

  it('does not crash on an older server that sends the old type names and no display status', async () => {
    setServer([{ id: 7, title: 'قديم', type: 'departments', status: 'in_progress', meeting_date: '2026-03-04T00:00:00.000000Z' }])
    admin()

    expect(await screen.findByText('قديم')).toBeInTheDocument()
    const list = within(screen.getByTestId('meetings-list'))
    expect(list.getByText('اجتماع الإدارة')).toBeInTheDocument()
    expect(list.getByText('جارٍ الآن')).toBeInTheDocument()
    expect(list.getByText('غير محدّدة')).toBeInTheDocument()
  })

  it('shows loading skeletons first', async () => {
    setServer([row()])
    admin()

    expect(screen.getByLabelText('جارٍ تحميل الاجتماعات')).toBeInTheDocument()
    await screen.findByText('الاجتماع الأسبوعي')
  })

  it('shows the empty state with a call to action for someone who can schedule', async () => {
    setServer([])
    admin()

    expect(await screen.findByText('لا توجد اجتماعات حاليًا')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /اجتماع جديد/ }).length).toBeGreaterThan(1)
  })

  it('offers no scheduling to someone the server did not allow', async () => {
    setServer([row()], { access: { can_create: false, creatable_departments: [] } })
    admin()

    await screen.findByText('الاجتماع الأسبوعي')
    expect(screen.queryByRole('button', { name: /اجتماع جديد/ })).not.toBeInTheDocument()
  })

  it('an API failure shows a clear error with retry, and retrying recovers', async () => {
    setServer([row()], { failList: () => axiosError(500) })
    admin()

    expect(await screen.findByText('تعذّر تحميل الاجتماعات')).toBeInTheDocument()
    server.failList = null
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByText('الاجتماع الأسبوعي')).toBeInTheDocument()
  })

  it('a 403 shows a permission message with no retry', async () => {
    setServer([], { failList: () => axiosError(403, { message: 'غير مصرح' }) })
    admin()

    expect(await screen.findByText('لا تملك الصلاحية')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).not.toBeInTheDocument()
  })

  it('a network failure is reported as a connection problem', async () => {
    setServer([], { failList: () => axiosError() })
    admin()

    expect(await screen.findByText('تحقق من اتصالك بالإنترنت ثم أعد المحاولة.')).toBeInTheDocument()
  })

  it('survives garbage rows and a missing stats block', async () => {
    setServer([null as unknown as Row, 4 as unknown as Row, row({ id: 3, title: 'سليم' })])
    server.stats = undefined as never
    admin()

    expect(await screen.findByText('سليم')).toBeInTheDocument()
    expect(screen.getByTestId('kpi-إجمالي الاجتماعات')).toHaveTextContent('0')
  })

  it('links to the lounge and to the quality reports only when the viewer can open them', async () => {
    mockAccessible = { '/dashboard/department/meeting-lounge': true }
    setServer([row()])
    admin()

    await screen.findByText('الاجتماع الأسبوعي')
    expect(screen.getByRole('link', { name: /صالة الاجتماعات/ })).toHaveAttribute('href', '/dashboard/department/meeting-lounge')
    expect(screen.queryByRole('link', { name: /تقارير الاجتماعات/ })).not.toBeInTheDocument()
  })
})

describe('admin meetings page — scheduling', () => {
  it('saves a meeting and shows it in the list without a page reload', async () => {
    setServer([row()])
    admin()
    await screen.findByText('الاجتماع الأسبوعي')

    await userEvent.click(screen.getByRole('button', { name: /اجتماع جديد/ }))
    const dialog = await screen.findByRole('dialog', { name: 'جدولة اجتماع جديد' })
    await fillSchedule(dialog)
    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('اجتماع الإطلاق')).toBeInTheDocument()
    expect(mockPost).toHaveBeenCalledTimes(1)
    const [url, body] = mockPost.mock.calls[0] as [string, Row]
    expect(url).toBe('/department/meetings')
    expect(body).toMatchObject({ title: 'اجتماع الإطلاق', type: 'general', meeting_date: '2026-12-01', start_time: '09:30', department_id: 1 })
  })

  it('sends canonical type names the API accepts', async () => {
    setServer([row()])
    admin()
    await userEvent.click(await screen.findByRole('button', { name: /اجتماع جديد/ }))
    const dialog = await screen.findByRole('dialog', { name: 'جدولة اجتماع جديد' })
    await fillSchedule(dialog)

    const types = within(dialog).getByLabelText(/نوع الاجتماع/) as HTMLSelectElement
    expect([...types.options].map((o) => o.value)).toEqual(['executive', 'department', 'programs', 'partnerships', 'quality', 'external_partner', 'general'])
    await userEvent.selectOptions(types, 'external_partner')
    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))

    await waitFor(() => expect(mockPost).toHaveBeenCalled())
    expect((mockPost.mock.calls[0][1] as Row).type).toBe('external_partner')
  })

  it('locks the department when the user may schedule for exactly one', async () => {
    setServer([row()])
    admin()
    await userEvent.click(await screen.findByRole('button', { name: /اجتماع جديد/ }))
    const dialog = await screen.findByRole('dialog', { name: 'جدولة اجتماع جديد' })

    expect(within(dialog).getByLabelText(/الإدارة/)).toBeDisabled()
  })

  it('lets someone with several departments choose and requires a choice', async () => {
    setServer([row()], { access: { can_create: true, creatable_departments: [{ id: 1, name: 'إدارة البرامج' }, { id: 2, name: 'إدارة الشراكات' }] } })
    admin()
    await userEvent.click(await screen.findByRole('button', { name: /اجتماع جديد/ }))
    const dialog = await screen.findByRole('dialog', { name: 'جدولة اجتماع جديد' })
    await fillSchedule(dialog)

    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))
    expect(await within(dialog).findByText('اختر الإدارة التي يتبعها الاجتماع.')).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()

    await userEvent.selectOptions(within(dialog).getByLabelText(/الإدارة/), '2')
    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))
    await waitFor(() => expect(mockPost).toHaveBeenCalled())
    expect((mockPost.mock.calls[0][1] as Row).department_id).toBe(2)
  })

  it('a global user (no fixed list) may leave the department empty', async () => {
    setServer([row()], { access: { can_create: true, creatable_departments: null } })
    admin()
    await userEvent.click(await screen.findByRole('button', { name: /اجتماع جديد/ }))
    const dialog = await screen.findByRole('dialog', { name: 'جدولة اجتماع جديد' })
    await fillSchedule(dialog)
    await within(dialog).findByRole('option', { name: 'إدارة الجودة' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))

    await waitFor(() => expect(mockPost).toHaveBeenCalled())
    expect(mockPost.mock.calls[0][1]).not.toHaveProperty('department_id')
  })

  it('validates required fields in Arabic before calling the server', async () => {
    setServer([row()])
    admin()
    await userEvent.click(await screen.findByRole('button', { name: /اجتماع جديد/ }))
    const dialog = await screen.findByRole('dialog', { name: 'جدولة اجتماع جديد' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))

    expect(await within(dialog).findByText('اكتب عنوان الاجتماع.')).toBeInTheDocument()
    expect(within(dialog).getByText('حدّد تاريخ الاجتماع.')).toBeInTheDocument()
    expect(within(dialog).getByText('حدّد وقت بدء الاجتماع.')).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('rejects an end time that is not after the start', async () => {
    setServer([row()])
    admin()
    await userEvent.click(await screen.findByRole('button', { name: /اجتماع جديد/ }))
    const dialog = await screen.findByRole('dialog', { name: 'جدولة اجتماع جديد' })
    await fillSchedule(dialog)
    await userEvent.type(within(dialog).getByLabelText(/وقت الانتهاء/), '09:00')

    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))

    expect(await within(dialog).findByText('يجب أن يكون وقت الانتهاء بعد وقت البدء.')).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('shows the server field errors inline and keeps the form open', async () => {
    setServer([row()])
    mockPost.mockRejectedValueOnce(axiosError(422, { message: 'Validation failed.', errors: { title: ['اكتب عنوان الاجتماع.'] } }))
    admin()
    await userEvent.click(await screen.findByRole('button', { name: /اجتماع جديد/ }))
    const dialog = await screen.findByRole('dialog', { name: 'جدولة اجتماع جديد' })
    await fillSchedule(dialog)

    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))

    expect(await within(dialog).findByText('راجع الحقول المظلَّلة ثم أعد المحاولة.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'جدولة اجتماع جديد' })).toBeInTheDocument()
  })

  it("shows the server's Arabic reason when scheduling is refused", async () => {
    setServer([row()])
    mockPost.mockRejectedValueOnce(axiosError(403, { message: 'ليست لديك صلاحية جدولة اجتماعات لهذه الإدارة.' }))
    admin()
    await userEvent.click(await screen.findByRole('button', { name: /اجتماع جديد/ }))
    const dialog = await screen.findByRole('dialog', { name: 'جدولة اجتماع جديد' })
    await fillSchedule(dialog)

    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))

    expect(await within(dialog).findByText('ليست لديك صلاحية جدولة اجتماعات لهذه الإدارة.')).toBeInTheDocument()
  })

  it('clears filters that could hide the saved meeting', async () => {
    setServer([row()])
    admin()
    await screen.findByText('الاجتماع الأسبوعي')
    await userEvent.type(screen.getByPlaceholderText('ابحث بعنوان الاجتماع…'), 'غير موجود')
    await waitFor(() => expect(lastParams().q).toBe('غير موجود'))

    await userEvent.click(screen.getByRole('button', { name: /اجتماع جديد/ }))
    const dialog = await screen.findByRole('dialog', { name: 'جدولة اجتماع جديد' })
    await fillSchedule(dialog, 'اجتماع جديد تمامًا')
    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))

    await waitFor(() => expect(lastParams().q).toBeUndefined())
    expect(await screen.findByText('اجتماع جديد تمامًا')).toBeInTheDocument()
  })
})

describe('meetings filters', () => {
  it('sends search, type, report state and dates to the server, and clears them', async () => {
    setServer([row()])
    admin()
    await screen.findByText('الاجتماع الأسبوعي')

    await userEvent.type(screen.getByPlaceholderText('ابحث بعنوان الاجتماع…'), 'خطة')
    await waitFor(() => expect(lastParams().q).toBe('خطة'))
    await userEvent.selectOptions(screen.getByLabelText('نوع الاجتماع'), 'quality')
    await waitFor(() => expect(lastParams().type).toBe('quality'))
    await userEvent.selectOptions(screen.getByLabelText('حالة التقرير'), 'pending')
    await waitFor(() => expect(lastParams().report_status).toBe('pending'))
    await userEvent.type(screen.getByLabelText('من تاريخ'), '2026-01-01')
    await waitFor(() => expect(lastParams().date_from).toBe('2026-01-01'))

    await userEvent.click(screen.getAllByRole('button', { name: 'مسح التصفية' })[0])
    await waitFor(() => expect(lastParams().q).toBeUndefined())
    expect(lastParams().type).toBeUndefined()
    expect(lastParams().report_status).toBeUndefined()
  })

  it('shows a no-match state for an active filter', async () => {
    setServer([])
    admin()
    await screen.findByText('لا توجد اجتماعات حاليًا')

    await userEvent.type(screen.getByPlaceholderText('ابحث بعنوان الاجتماع…'), 'لا شيء')

    expect(await screen.findByText('لا توجد اجتماعات مطابقة')).toBeInTheDocument()
  })

  it('offers the department filter only to someone with several departments', async () => {
    setServer([row()])
    const { unmount } = admin()
    await screen.findByText('الاجتماع الأسبوعي')
    expect(screen.queryByLabelText('الإدارة')).not.toBeInTheDocument()
    unmount()

    setServer([row()], { access: { can_create: true, creatable_departments: [{ id: 1, name: 'إدارة البرامج' }, { id: 2, name: 'إدارة الشراكات' }] } })
    admin()
    await userEvent.selectOptions(await screen.findByLabelText('الإدارة'), '2')
    await waitFor(() => expect(lastParams().department_id).toBe(2))
  })

  it('collapses the filters behind a toggle on small screens', async () => {
    setServer([row()])
    admin()
    await screen.findByText('الاجتماع الأسبوعي')

    const toggle = screen.getByRole('button', { name: /^تصفية/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('is right-to-left and uses cards, never a wide table', async () => {
    setServer([row(), row({ id: 2, title: 'ثان' })])
    const { container } = admin()
    await screen.findByText('ثان')

    expect(container.firstElementChild).toHaveAttribute('dir', 'rtl')
    expect(container.querySelector('table')).toBeNull()
    expect(screen.getByTestId('meetings-list').children).toHaveLength(2)
  })
})

// ═══ Lounge ══════════════════════════════════════════════════════════════════

describe('meeting lounge', () => {
  it('renders its title and description and links the three pages by what the viewer may open', async () => {
    mockAccessible = { '/dashboard/admin/meetings': true, '/dashboard/operations/meeting-reports': true }
    setServer([row()])
    lounge()

    expect(screen.getByRole('heading', { level: 1, name: 'صالة الاجتماعات الذكية' })).toBeInTheDocument()
    expect(screen.getByText('عرض الاجتماعات وجدولة التقارير الرسمية وربطها بإدارة الجودة.')).toBeInTheDocument()
    await screen.findByText('الاجتماع الأسبوعي')
    expect(screen.getByRole('link', { name: /جدول الاجتماعات/ })).toHaveAttribute('href', '/dashboard/admin/meetings')
    expect(screen.getByRole('link', { name: /تقارير الاجتماعات/ })).toHaveAttribute('href', '/dashboard/operations/meeting-reports')
  })

  it('shows the meeting-type tiles only to someone who may schedule, and the clicked tile fixes the type', async () => {
    setServer([row()])
    lounge()
    await screen.findByText('الاجتماع الأسبوعي')

    await userEvent.click(screen.getByRole('button', { name: /اجتماع داخلي للإدارة/ }))
    const dialog = await screen.findByRole('dialog', { name: 'جدولة اجتماع جديد' })
    expect(within(dialog).queryByLabelText(/نوع الاجتماع/)).not.toBeInTheDocument()
    await fillSchedule(dialog, 'اجتماع داخلي')
    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))

    await waitFor(() => expect(mockPost).toHaveBeenCalled())
    expect((mockPost.mock.calls[0][1] as Row).type).toBe('department')
    expect(await screen.findByText('اجتماع داخلي')).toBeInTheDocument()
  })

  it('hides the tiles from someone who may not schedule', async () => {
    setServer([row()], { access: { can_create: false, creatable_departments: [] } })
    lounge()
    await screen.findByText('الاجتماع الأسبوعي')

    expect(screen.queryByRole('button', { name: /اجتماع داخلي للإدارة/ })).not.toBeInTheDocument()
  })

  it('a meeting without a report offers "رفع التقرير"', async () => {
    setServer([row({ display_status: 'awaiting_report' })])
    lounge()

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    expect(within(card).getByRole('button', { name: 'رفع التقرير' })).toBeInTheDocument()
    expect(within(card).getByText('بانتظار رفع التقرير')).toBeInTheDocument()
  })

  it('a meeting WITH a report shows the badge and "عرض التقرير" and offers no second upload', async () => {
    setServer([withReport()])
    lounge()

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    expect(within(card).getByText('تم رفع التقرير')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'عرض التقرير' })).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'رفع التقرير' })).not.toBeInTheDocument()
  })

  it('a viewer who may not file sees a hint, never a button', async () => {
    setServer([row({ display_status: 'awaiting_report', capabilities: { can_manage: false, can_upload_report: false, can_view_report: false } })])
    lounge()

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    expect(within(card).queryByRole('button', { name: 'رفع التقرير' })).not.toBeInTheDocument()
    expect(within(card).getByText('يرفع التقرير مسؤول الاجتماع أو قائد الإدارة')).toBeInTheDocument()
  })

  it('a cancelled meeting takes no report', async () => {
    setServer([row({ display_status: 'cancelled', status: 'cancelled', capabilities: { can_manage: true, can_upload_report: false, can_view_report: false } })])
    lounge()

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    expect(within(card).queryByRole('button', { name: 'رفع التقرير' })).not.toBeInTheDocument()
  })
})

describe('meeting lounge — filing the one official report', () => {
  it('files the report and the card flips to "تم رفع التقرير" with no upload button', async () => {
    setServer([row({ display_status: 'awaiting_report' })])
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')

    await nextStep(dialog)
    await userEvent.type(within(dialog).getByLabelText(/المهام التي أُنجزت/), 'أُنجزت خطة الربع')
    await nextStep(dialog)
    await userEvent.type(within(dialog).getByLabelText(/الأهداف التشغيلية للشهر القادم/), 'إطلاق النسخة')
    await userEvent.click(within(dialog).getByRole('button', { name: 'رفع التقرير النهائي' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    await waitFor(() => expect(within(card).getByText('تم رفع التقرير')).toBeInTheDocument())
    expect(within(card).queryByRole('button', { name: 'رفع التقرير' })).not.toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'عرض التقرير' })).toBeInTheDocument()

    const [url, body] = mockPost.mock.calls[0] as [string, Row]
    expect(url).toBe('/department/meetings/1/report')
    expect(body.completed_tasks_summary).toBe('أُنجزت خطة الربع')
    expect(body.absentees).toEqual([])
  })

  it('splits the absentees list on Arabic and Latin commas', async () => {
    setServer([row({ display_status: 'awaiting_report' })])
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await userEvent.type(within(dialog).getByLabelText(/الأعضاء الغائبون/), 'أحمد، سارة, ليلى')
    await nextStep(dialog)
    await userEvent.type(within(dialog).getByLabelText(/المهام التي أُنجزت/), 'تم')
    await nextStep(dialog)
    await userEvent.click(within(dialog).getByRole('button', { name: 'رفع التقرير النهائي' }))

    await waitFor(() => expect(mockPost).toHaveBeenCalled())
    expect((mockPost.mock.calls[0][1] as Row).absentees).toEqual(['أحمد', 'سارة', 'ليلى'])
  })

  it('blocks an empty report before calling the server', async () => {
    setServer([row({ display_status: 'awaiting_report' })])
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await nextStep(dialog)
    await nextStep(dialog)

    await userEvent.click(within(dialog).getByRole('button', { name: 'رفع التقرير النهائي' }))

    expect(await within(dialog).findByText(/أضف محتوى للتقرير قبل رفعه/)).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('pressing Enter in a text field never files a half-written report', async () => {
    setServer([row({ display_status: 'awaiting_report' })])
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')

    await userEvent.type(within(dialog).getByLabelText(/الأعضاء الغائبون/), 'أحمد{Enter}')

    expect(mockPost).not.toHaveBeenCalled()
    expect(within(dialog).getByText(/الخطوة 1 من 3/)).toBeInTheDocument()
  })

  it('submits only once however many times the button is pressed', async () => {
    setServer([row({ display_status: 'awaiting_report' })])
    let release: () => void = () => {}
    mockPost.mockImplementationOnce(
      () => new Promise((resolve) => { release = () => resolve({ data: { data: withReport() } }) }),
    )
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await nextStep(dialog)
    await userEvent.type(within(dialog).getByLabelText(/المهام التي أُنجزت/), 'تم')
    await nextStep(dialog)
    const submit = within(dialog).getByRole('button', { name: 'رفع التقرير النهائي' })

    await userEvent.click(submit)
    await userEvent.click(submit)
    await userEvent.click(submit)
    release()

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mockPost).toHaveBeenCalledTimes(1)
  })

  it('shows the duplicate-report message cleanly, refreshes the list and stops offering the upload', async () => {
    setServer([row({ display_status: 'awaiting_report' })])
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await nextStep(dialog)
    await userEvent.type(within(dialog).getByLabelText(/المهام التي أُنجزت/), 'تم')
    await nextStep(dialog)
    // Someone else filed it while this form was open.
    server.meetings = [withReport({ title: 'الاجتماع الأسبوعي' })]
    mockPost.mockRejectedValueOnce(axiosError(422, { message: DUP, errors: { meeting: [DUP] } }))
    const before = listCalls().length

    await userEvent.click(within(dialog).getByRole('button', { name: 'رفع التقرير النهائي' }))

    expect(await within(dialog).findByText(DUP)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'رفع التقرير النهائي' })).not.toBeInTheDocument()
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(before))
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'إغلاق' }).at(-1)!)
    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    await waitFor(() => expect(within(card).queryByRole('button', { name: 'رفع التقرير' })).not.toBeInTheDocument())
    expect(within(card).getByText('تم رفع التقرير')).toBeInTheDocument()
  })

  it('shows a permission refusal from the server as a message', async () => {
    setServer([row({ display_status: 'awaiting_report' })], {
      failReport: () => axiosError(403, { message: 'ليست لديك صلاحية رفع تقرير لهذا الاجتماع.' }),
    })
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await nextStep(dialog)
    await userEvent.type(within(dialog).getByLabelText(/المهام التي أُنجزت/), 'تم')
    await nextStep(dialog)

    await userEvent.click(within(dialog).getByRole('button', { name: 'رفع التقرير النهائي' }))

    expect(await within(dialog).findByText('ليست لديك صلاحية رفع تقرير لهذا الاجتماع.')).toBeInTheDocument()
  })
})

describe('meeting details panel', () => {
  it('shows the filed report to someone who may read it, with no upload button', async () => {
    setServer([withReport()])
    lounge()

    await userEvent.click(within((await screen.findByText('الاجتماع الأسبوعي')).closest('li')!).getByRole('button', { name: 'عرض التقرير' }))

    const panel = await screen.findByRole('dialog', { name: 'تفاصيل الاجتماع' })
    expect(await within(panel).findByTestId('report-block')).toHaveTextContent('أُنجزت خطة الربع')
    expect(within(panel).getByTestId('report-block')).toHaveTextContent('نورة العتيبي')
    expect(within(panel).getByText('90%')).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'رفع التقرير' })).not.toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: /فتح صفحة الاجتماع كاملة/ })).toHaveAttribute('href', '/dashboard/department/meeting-lounge/1')
  })

  it('explains the next step for a meeting without a report and offers the upload when allowed', async () => {
    setServer([row({ display_status: 'awaiting_report' })])
    lounge()

    await userEvent.click(within((await screen.findByText('الاجتماع الأسبوعي')).closest('li')!).getByRole('button', { name: 'التفاصيل' }))

    const panel = await screen.findByRole('dialog', { name: 'تفاصيل الاجتماع' })
    expect(await within(panel).findByText(/لكل اجتماع تقرير رسمي واحد فقط/)).toBeInTheDocument()
    await userEvent.click(within(panel).getByRole('button', { name: 'رفع التقرير' }))
    expect(await screen.findByRole('dialog', { name: 'رفع تقرير الاجتماع' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'تفاصيل الاجتماع' })).not.toBeInTheDocument()
  })

  it('a 403 on one meeting shows a permission message inside the panel and leaves the list intact', async () => {
    setServer([row()], { failDetail: () => axiosError(403, { message: 'غير مصرح لك باستعراض اجتماع خاص بإدارة أخرى' }) })
    lounge()

    await userEvent.click(within((await screen.findByText('الاجتماع الأسبوعي')).closest('li')!).getByRole('button', { name: 'التفاصيل' }))

    const panel = await screen.findByRole('dialog', { name: 'تفاصيل الاجتماع' })
    expect(await within(panel).findByText('غير مصرح لك باستعراض اجتماع خاص بإدارة أخرى')).toBeInTheDocument()
    await userEvent.click(within(panel).getByRole('button', { name: 'إغلاق' }))
    expect(screen.getByText('الاجتماع الأسبوعي')).toBeInTheDocument()
  })

  it('a failed details request can be retried', async () => {
    setServer([row()], { failDetail: () => axiosError(500) })
    lounge()
    await userEvent.click(within((await screen.findByText('الاجتماع الأسبوعي')).closest('li')!).getByRole('button', { name: 'التفاصيل' }))
    const panel = await screen.findByRole('dialog', { name: 'تفاصيل الاجتماع' })
    await within(panel).findByText('تعذّر تحميل الاجتماع')

    server.failDetail = null
    await userEvent.click(within(panel).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await within(panel).findByText('الإدارة')).toBeInTheDocument()
  })

  it('closes with Escape', async () => {
    setServer([row()])
    lounge()
    await userEvent.click(within((await screen.findByText('الاجتماع الأسبوعي')).closest('li')!).getByRole('button', { name: 'التفاصيل' }))
    await screen.findByRole('dialog', { name: 'تفاصيل الاجتماع' })

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('meeting detail page', () => {
  function detailPage(m: Row) {
    setServer([m])
    return renderPage(<Routes><Route path="/dashboard/department/meeting-lounge/:id" element={<OpsMeetingDetailPage />} /></Routes>, '/dashboard/department/meeting-lounge/1')
  }

  it('hides the upload button once the report exists and shows the report', async () => {
    detailPage(withReport())

    expect(await screen.findByText('الاجتماع الأسبوعي')).toBeInTheDocument()
    expect(await screen.findByTestId('report-block')).toHaveTextContent('أُنجزت خطة الربع')
    expect(screen.queryByRole('button', { name: /رفع التقرير/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /صالة الاجتماعات/ })).toHaveAttribute('href', '/dashboard/department/meeting-lounge')
  })

  it('offers the upload only while the server allows it', async () => {
    detailPage(row({ display_status: 'awaiting_report' }))

    expect(await screen.findByRole('button', { name: /رفع التقرير/ })).toBeInTheDocument()
    expect(screen.getByText(/لم يُرفع تقرير لهذا الاجتماع بعد/)).toBeInTheDocument()
  })
})
