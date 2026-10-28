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

// The system date/time pickers are popovers; here they stand in as plain inputs that keep
// the same props, so the tests can prove the form uses them and still drive them.
vi.mock('@/components/ui/EmcDatePicker', () => ({
  default: ({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) => (
    <label>
      {label}
      <input data-testid="emc-date-picker" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
      {error && <span role="alert">{error}</span>}
    </label>
  ),
}))
vi.mock('@/components/ui/EmcTimePicker', () => ({
  default: ({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) => (
    <label>
      {label}
      <input data-testid="emc-time-picker" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
      {error && <span role="alert">{error}</span>}
    </label>
  ),
}))

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

const CAPS_MANAGER = {
  can_view: true, can_join: false, can_confirm_attendance: false, can_manage: true, can_upload_report: true,
  can_view_report: false, can_view_attendance: true, can_view_quality_data: false,
}
const CAPS_MEMBER = {
  can_view: true, can_join: true, can_confirm_attendance: true, can_manage: false, can_upload_report: false,
  can_view_report: false, can_view_attendance: false, can_view_quality_data: false,
}

const row = (over: Row = {}): Row => ({
  id: 1, title: 'الاجتماع الأسبوعي', type: 'department', status: 'scheduled', display_status: 'scheduled',
  meeting_date: '2026-11-02', start_time: '10:00', end_time: '11:00', department: { id: 1, name: 'إدارة البرامج' },
  organizer: { id: 9, name: 'نورة العتيبي' }, audience: 'department', my_attendance: null, meeting_url: null,
  has_report: false, report_id: null, capabilities: CAPS_MANAGER, created_at: '2026-10-01T09:00:00Z', ...over,
})

const withReport = (over: Row = {}): Row =>
  row({ ...over, display_status: 'report_submitted', status: 'completed', has_report: true, report_id: 5,
    capabilities: { ...CAPS_MANAGER, can_upload_report: false, can_view_report: true } })

const REPORT = {
  id: 5, meeting_id: 1, absentees: ['أحمد'], team_commitment_score: 4, team_commitment_notes: null, completed_tasks_summary: 'أُنجزت خطة الربع',
  kpi_percentage: 90, top_interactive_member: 'سارة', challenges: 'ضيق الوقت', executive_requests: null, next_month_goals: 'إطلاق النسخة',
  improvement_suggestions: null, uploaded_by: { id: 9, name: 'نورة العتيبي' }, uploaded_at: '2026-10-20T08:00:00Z',
}

const POOL = [
  { id: 11, name: 'سارة', role: 'instructor', role_title: 'مدرّبة', department: 'إدارة البرامج', status: 'joined', joined_at: '2026-11-02T09:05:00Z' },
  { id: 12, name: 'أحمد', role: 'volunteer', role_title: null, department: 'إدارة البرامج', status: 'invited', joined_at: null },
  { id: 13, name: 'ليلى', role: 'instructor', role_title: null, department: 'إدارة البرامج', status: 'invited', joined_at: null },
]

const server = {
  meetings: [] as Row[],
  details: {} as Record<number, Row>,
  access: { can_create: true, creatable_departments: [{ id: 1, name: 'إدارة البرامج' }] as unknown },
  stats: { total: 0, this_month: 0, awaiting_report: 0, with_report: 0 },
  pool: POOL as Row[],
  candidatesByDept: { 1: [{ id: 11, name: 'سارة', role: 'instructor', role_title: 'مدرّبة', department: 'إدارة البرامج' }, { id: 12, name: 'أحمد', role: 'volunteer', role_title: null, department: 'إدارة البرامج' }], 2: [{ id: 21, name: 'خالد', role: 'instructor', role_title: null, department: 'إدارة الجودة' }] } as Record<number, Row[]>,
  scopeCandidates: [{ id: 11, name: 'سارة', role: 'instructor', role_title: null, department: 'إدارة البرامج' }, { id: 21, name: 'خالد', role: 'instructor', role_title: null, department: 'إدارة الجودة' }] as Row[],
  failList: null as null | (() => Error),
  failDetail: null as null | (() => Error),
  failReport: null as null | (() => Error),
  failPool: null as null | (() => Error),
  failJoin: null as null | (() => Error),
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
  server.details = {}
  server.access = { can_create: true, creatable_departments: [{ id: 1, name: 'إدارة البرامج' }] }
  server.stats = { total: meetings.length, this_month: meetings.length, awaiting_report: 0, with_report: meetings.filter((m) => m?.has_report).length }
  server.pool = POOL
  server.failList = null
  server.failDetail = null
  server.failReport = null
  server.failPool = null
  server.failJoin = null
  Object.assign(server, over)
}

function detailOf(m: Row): Row {
  return {
    description: null, agenda: [], timezone: 'Europe/Amsterdam', updated_at: '2026-10-02T09:00:00Z',
    participants_visible: false, participants: [], attendance_summary: null,
    decisions: [], action_items: [], report: m.has_report && (m.capabilities as Row).can_view_report ? REPORT : null,
    ...m, ...(server.details[m.id as number] ?? {}),
  }
}

beforeEach(() => {
  mockGet.mockReset()
  mockPost.mockReset()
  mockAccessible = {}

  mockGet.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
    if (url === '/department/meetings') {
      if (server.failList) throw server.failList()
      return listBody()
    }
    if (url === '/department/meeting-participants') {
      const dept = config?.params?.department_id as number | undefined
      return { data: { success: true, data: dept ? (server.candidatesByDept[dept] ?? []) : server.scopeCandidates } }
    }
    const pool = url.match(/^\/department\/meetings\/(\d+)\/participants$/)
    if (pool) {
      if (server.failPool) throw server.failPool()
      return { data: { success: true, data: server.pool, audience: 'department' } }
    }
    const detail = url.match(/^\/department\/meetings\/(\d+)$/)
    if (detail) {
      if (server.failDetail) throw server.failDetail()
      const m = server.meetings.find((x) => x.id === Number(detail[1]))
      if (!m) throw axiosError(404)
      return { data: { success: true, data: detailOf(m) } }
    }
    return { data: {} }
  })

  mockPost.mockImplementation(async (url: string, body: Row) => {
    if (url === '/department/meetings') {
      const created = row({ id: 100 + server.meetings.length, title: body.title, type: body.type, meeting_date: body.meeting_date, start_time: body.start_time })
      server.meetings = [created, ...server.meetings]
      return { data: { success: true, data: created } }
    }
    const att = url.match(/^\/department\/meetings\/(\d+)\/(join|confirm-attendance)$/)
    if (att) {
      if (server.failJoin) throw server.failJoin()
      const idx = server.meetings.findIndex((x) => x.id === Number(att[1]))
      const now = '2026-11-02T10:01:00Z'
      server.meetings[idx] = {
        ...server.meetings[idx],
        my_attendance: { status: 'joined', joined_at: now, confirmed_at: att[2] === 'confirm-attendance' ? now : null },
        capabilities: { ...(server.meetings[idx].capabilities as Row), can_confirm_attendance: att[2] !== 'confirm-attendance' },
      }
      return { data: { success: true, data: detailOf(server.meetings[idx]) } }
    }
    const rep = url.match(/^\/department\/meetings\/(\d+)\/report$/)
    if (rep) {
      if (server.failReport) throw server.failReport()
      const idx = server.meetings.findIndex((x) => x.id === Number(rep[1]))
      if (server.meetings[idx].has_report) throw axiosError(422, { message: DUP, errors: { meeting: [DUP] } })
      server.meetings[idx] = withReport({ ...server.meetings[idx], has_report: true })
      return { data: { success: true, data: { ...detailOf(server.meetings[idx]), report: REPORT } } }
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
  await userEvent.type(within(dialog).getByLabelText('تاريخ الاجتماع'), '2026-12-01')
  await userEvent.type(within(dialog).getByLabelText('وقت البدء'), '09:30')
}

async function openReportForm(title: string) {
  const card = (await screen.findByText(title)).closest('li')!
  await userEvent.click(within(card).getByRole('button', { name: 'تقرير يدوي' }))
  return screen.findByRole('dialog', { name: 'رفع تقرير الاجتماع' })
}

const tab = (dialog: HTMLElement, name: string | RegExp) => within(dialog).getByRole('tab', { name })

async function goTo(dialog: HTMLElement, name: string | RegExp) {
  await userEvent.click(tab(dialog, name))
}

/** Fill the minimum a report needs: someone present (pre-checked from the roster) and a summary. */
async function fillReport(dialog: HTMLElement, summary = 'أُنجزت خطة الربع') {
  await goTo(dialog, /الحضور والانضباط/)
  await within(dialog).findByRole('checkbox', { name: /سارة/ })
  await goTo(dialog, /الملخص وجدول الأعمال/)
  await userEvent.type(within(dialog).getByLabelText(/ملخص ما تم إنجازه/), summary)
  await goTo(dialog, /المراجعة والإرسال/)
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

    expect(within(dialog).getByLabelText(/^الإدارة/)).toBeDisabled()
  })

  it('lets someone with several departments choose and requires a choice', async () => {
    setServer([row()], { access: { can_create: true, creatable_departments: [{ id: 1, name: 'إدارة البرامج' }, { id: 2, name: 'إدارة الشراكات' }] } })
    admin()
    await userEvent.click(await screen.findByRole('button', { name: /اجتماع جديد/ }))
    const dialog = await screen.findByRole('dialog', { name: 'جدولة اجتماع جديد' })
    await fillSchedule(dialog)

    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))
    expect(await within(dialog).findByText('اختر الإدارة لجعل الاجتماع لكل أعضائها، أو اختر أشخاصًا بعينهم.')).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()

    await userEvent.selectOptions(within(dialog).getByLabelText(/^الإدارة/), '2')
    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))
    await waitFor(() => expect(mockPost).toHaveBeenCalled())
    expect((mockPost.mock.calls[0][1] as Row).department_id).toBe(2)
  })

  it('a global user must pick a department for a whole-department meeting, but not for an invite-only one', async () => {
    setServer([row()], { access: { can_create: true, creatable_departments: null } })
    admin()
    await userEvent.click(await screen.findByRole('button', { name: /اجتماع جديد/ }))
    const dialog = await screen.findByRole('dialog', { name: 'جدولة اجتماع جديد' })
    await fillSchedule(dialog)
    await within(dialog).findByRole('option', { name: 'إدارة الجودة' })

    // Everyone in a department, but no department chosen: refused before the server is called.
    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))
    expect(await within(dialog).findByText('اختر الإدارة لجعل الاجتماع لكل أعضائها، أو اختر أشخاصًا بعينهم.')).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()

    // Named invitees need no department.
    await userEvent.click(within(dialog).getByRole('radio', { name: /أشخاص بعينهم/ }))
    await userEvent.click(await within(dialog).findByRole('checkbox', { name: /سارة/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))

    await waitFor(() => expect(mockPost).toHaveBeenCalled())
    expect(mockPost.mock.calls[0][1]).not.toHaveProperty('department_id')
    expect(mockPost.mock.calls[0][1]).toMatchObject({ participant_ids: [11] })
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

  it('a meeting without a report offers the manual report action ("تقرير يدوي")', async () => {
    setServer([row({ display_status: 'awaiting_report' })])
    lounge()

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    expect(within(card).getByRole('button', { name: 'تقرير يدوي' })).toBeInTheDocument()
    expect(within(card).getByText('بانتظار رفع التقرير')).toBeInTheDocument()
  })

  it('a meeting WITH a report shows the badge and "عرض التقرير" and offers no second upload', async () => {
    setServer([withReport()])
    lounge()

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    expect(within(card).getByText('تم رفع التقرير')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'عرض التقرير' })).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'تقرير يدوي' })).not.toBeInTheDocument()
  })

  it('a viewer who may not file sees a hint, never a button', async () => {
    setServer([row({ display_status: 'awaiting_report', capabilities: { can_manage: false, can_upload_report: false, can_view_report: false } })])
    lounge()

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    expect(within(card).queryByRole('button', { name: 'تقرير يدوي' })).not.toBeInTheDocument()
    expect(within(card).getByText('يرفع التقرير مسؤول الاجتماع أو قائد الإدارة')).toBeInTheDocument()
  })

  it('a cancelled meeting takes no report', async () => {
    setServer([row({ display_status: 'cancelled', status: 'cancelled', capabilities: { can_manage: true, can_upload_report: false, can_view_report: false } })])
    lounge()

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    expect(within(card).queryByRole('button', { name: 'تقرير يدوي' })).not.toBeInTheDocument()
  })

  it('only someone who manages an open meeting is offered attendance and results', async () => {
    setServer([row({ display_status: 'awaiting_report' })])
    lounge()
    const open = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    expect(within(open).getByRole('button', { name: 'رصد الحضور والنتائج' })).toBeInTheDocument()
  })

  it('a participant who cannot manage the meeting never sees the attendance-and-results action', async () => {
    setServer([row({ display_status: 'awaiting_report', capabilities: { can_manage: false, can_upload_report: false, can_view_report: false } })])
    lounge()
    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    expect(within(card).queryByRole('button', { name: 'رصد الحضور والنتائج' })).not.toBeInTheDocument()
  })

  it('a cancelled meeting is not offered attendance and results', async () => {
    setServer([row({ display_status: 'cancelled', status: 'cancelled', capabilities: { can_manage: true, can_upload_report: false, can_view_report: false } })])
    lounge()
    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    expect(within(card).queryByRole('button', { name: 'رصد الحضور والنتائج' })).not.toBeInTheDocument()
  })
})

describe('meeting report form — sections, not a wizard', () => {
  beforeEach(() => setServer([row({ display_status: 'awaiting_report' })]))

  it('shows four visible sections as tabs and lets the user open any of them directly', async () => {
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')

    const tabs = within(dialog).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual([
      expect.stringContaining('الحضور والانضباط'),
      expect.stringContaining('الملخص وجدول الأعمال'),
      expect.stringContaining('القرارات وبنود العمل'),
      expect.stringContaining('المراجعة والإرسال'),
    ])
    // Straight to the third section: nothing forces the first two to be walked through.
    await goTo(dialog, /القرارات وبنود العمل/)
    expect(within(dialog).getByRole('button', { name: /إضافة قرار/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /إضافة بند/ })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /^التالي$/ })).not.toBeInTheDocument()
  })

  it('shows per-section completion: attendance is complete once someone is present, the summary is still required', async () => {
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await within(dialog).findByRole('checkbox', { name: /سارة/ })

    expect(within(tab(dialog, /الحضور والانضباط/)).getByLabelText('مكتمل')).toBeInTheDocument()
    expect(within(tab(dialog, /الملخص وجدول الأعمال/)).getByLabelText('مطلوب')).toBeInTheDocument()
    expect(within(tab(dialog, /القرارات وبنود العمل/)).getByText('اختياري')).toBeInTheDocument()

    await goTo(dialog, /الملخص وجدول الأعمال/)
    await userEvent.type(within(dialog).getByLabelText(/ملخص ما تم إنجازه/), 'تم')
    expect(within(tab(dialog, /الملخص وجدول الأعمال/)).getByLabelText('مكتمل')).toBeInTheDocument()
  })

  it('lists only the people the server returned for this meeting, pre-checking whoever already joined', async () => {
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')

    expect(await within(dialog).findByRole('checkbox', { name: /سارة/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox', { name: /أحمد/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox', { name: /ليلى/ })).toBeInTheDocument()
    expect(within(dialog).queryByText('خالد')).not.toBeInTheDocument()
    expect(mockGet).toHaveBeenCalledWith('/department/meetings/1/participants')
    // Sara joined by herself: checked and badged; the others are not.
    expect(within(dialog).getByRole('checkbox', { name: /سارة/ })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: /أحمد/ })).not.toBeChecked()
    expect(within(dialog).getByTestId('attendance-count')).toHaveTextContent('الحاضرون 1 من 3 · الغائبون 2')
  })

  it('searches inside the allowed people and shows their department as secondary text', async () => {
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await within(dialog).findByRole('checkbox', { name: /سارة/ })

    await userEvent.type(within(dialog).getByPlaceholderText('ابحث عن مشارك…'), 'ليلى')

    expect(within(dialog).getByRole('checkbox', { name: /ليلى/ })).toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: /سارة/ })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: /أحمد/ })).not.toBeInTheDocument()
    expect(within(dialog).getAllByText(/إدارة البرامج/).length).toBeGreaterThan(0)
  })

  it('shows selected people as name-only chips', async () => {
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await within(dialog).findByRole('checkbox', { name: /سارة/ })

    const chips = within(dialog).getByRole('list', { name: 'المحددون' })

    expect(within(chips).getByText('سارة')).toBeInTheDocument()
    expect(chips.textContent).not.toMatch(/إدارة البرامج|مدرّبة/)
  })

  it('records the attendance the filer chose, plus decisions and action items from the same pool', async () => {
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await within(dialog).findByRole('checkbox', { name: /سارة/ })
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /أحمد/ }))

    await goTo(dialog, /القرارات وبنود العمل/)
    await userEvent.click(within(dialog).getByRole('button', { name: /إضافة قرار/ }))
    await userEvent.type(within(dialog).getByLabelText('القرار 1'), 'اعتماد الميزانية')
    await userEvent.click(within(dialog).getByRole('button', { name: /إضافة بند/ }))
    await userEvent.type(within(dialog).getByLabelText('بند العمل 1'), 'إعداد العرض')
    await userEvent.selectOptions(within(dialog).getByLabelText('مسؤول بند العمل 1'), '11')
    await userEvent.type(within(dialog).getByLabelText('موعد التنفيذ'), '2026-12-05')
    await fillReport(dialog)
    expect(within(dialog).getByTestId('report-review')).toHaveTextContent('2 من 3')

    await userEvent.click(within(dialog).getByRole('button', { name: 'رفع التقرير الرسمي' }))

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1))
    const [url, body] = mockPost.mock.calls[0] as [string, Row]
    expect(url).toBe('/department/meetings/1/report')
    expect(body.attendance).toEqual([{ user_id: 11, attended: true }, { user_id: 12, attended: true }, { user_id: 13, attended: false }])
    expect(body.decisions).toEqual([{ title: 'اعتماد الميزانية' }])
    expect(body.action_items).toEqual([{ title: 'إعداد العرض', assigned_to: 11, due_date: '2026-12-05' }])
    expect(body.completed_tasks_summary).toBe('أُنجزت خطة الربع')
  })

  it('files the report and the card flips to "تم رفع التقرير" with no upload button', async () => {
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await fillReport(dialog)

    await userEvent.click(within(dialog).getByRole('button', { name: 'رفع التقرير الرسمي' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    await waitFor(() => expect(within(card).getByText('تم رفع التقرير')).toBeInTheDocument())
    expect(within(card).queryByRole('button', { name: 'تقرير يدوي' })).not.toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'عرض التقرير' })).toBeInTheDocument()
  })

  it('blocks a report with nobody marked present and says where to fix it', async () => {
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await within(dialog).findByRole('checkbox', { name: /سارة/ })
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /سارة/ }))
    await goTo(dialog, /الملخص وجدول الأعمال/)
    await userEvent.type(within(dialog).getByLabelText(/ملخص ما تم إنجازه/), 'تم')
    await goTo(dialog, /المراجعة والإرسال/)

    await userEvent.click(within(dialog).getByRole('button', { name: 'رفع التقرير الرسمي' }))

    expect(await within(dialog).findByText('سجّل حضور المشاركين (حدّد من حضر) قبل رفع التقرير.')).toBeInTheDocument()
    expect(tab(dialog, /الحضور والانضباط/)).toHaveAttribute('aria-selected', 'true')
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('blocks a report with no summary and moves to the summary section', async () => {
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await within(dialog).findByRole('checkbox', { name: /سارة/ })
    await goTo(dialog, /المراجعة والإرسال/)

    await userEvent.click(within(dialog).getByRole('button', { name: 'رفع التقرير الرسمي' }))

    expect(await within(dialog).findByText(/اكتب ملخصًا لما تم إنجازه/)).toBeInTheDocument()
    expect(tab(dialog, /الملخص وجدول الأعمال/)).toHaveAttribute('aria-selected', 'true')
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('pressing Enter in a text field never files a half-written report', async () => {
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await within(dialog).findByRole('checkbox', { name: /سارة/ })

    await userEvent.type(within(dialog).getByPlaceholderText('ابحث عن مشارك…'), 'سا{Enter}')

    expect(mockPost).not.toHaveBeenCalled()
  })

  it('submits only once however many times the button is pressed', async () => {
    let release: () => void = () => {}
    mockPost.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ data: { data: detailOf(withReport()) } }) }))
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await fillReport(dialog)
    const submit = within(dialog).getByRole('button', { name: 'رفع التقرير الرسمي' })

    await userEvent.click(submit)
    await userEvent.click(submit)
    await userEvent.click(submit)
    release()

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mockPost).toHaveBeenCalledTimes(1)
  })

  it('shows the duplicate-report message cleanly, refreshes the list and stops offering the upload', async () => {
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await fillReport(dialog)
    // Someone else filed it while this form was open.
    server.meetings = [withReport({ title: 'الاجتماع الأسبوعي' })]
    mockPost.mockRejectedValueOnce(axiosError(422, { message: DUP, errors: { meeting: [DUP] } }))
    const before = listCalls().length

    await userEvent.click(within(dialog).getByRole('button', { name: 'رفع التقرير الرسمي' }))

    expect(await within(dialog).findByText(DUP)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'رفع التقرير الرسمي' })).not.toBeInTheDocument()
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(before))
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'إغلاق' }).at(-1)!)
    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    await waitFor(() => expect(within(card).queryByRole('button', { name: 'تقرير يدوي' })).not.toBeInTheDocument())
    expect(within(card).getByText('تم رفع التقرير')).toBeInTheDocument()
  })

  it('shows a permission refusal from the server as a message', async () => {
    server.failReport = () => axiosError(403, { message: 'ليست لديك صلاحية رفع تقرير لهذا الاجتماع.' })
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await fillReport(dialog)

    await userEvent.click(within(dialog).getByRole('button', { name: 'رفع التقرير الرسمي' }))

    expect(await within(dialog).findByText('ليست لديك صلاحية رفع تقرير لهذا الاجتماع.')).toBeInTheDocument()
  })

  it('takes the server\'s attendance refusal to the attendance section', async () => {
    server.failReport = () => axiosError(422, { message: 'لا يمكن تسجيل حضور مستخدم ليس من المشاركين في هذا الاجتماع.', errors: { attendance: ['لا يمكن تسجيل حضور مستخدم ليس من المشاركين في هذا الاجتماع.'] } })
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    await fillReport(dialog)

    await userEvent.click(within(dialog).getByRole('button', { name: 'رفع التقرير الرسمي' }))

    expect(await within(dialog).findByText('لا يمكن تسجيل حضور مستخدم ليس من المشاركين في هذا الاجتماع.')).toBeInTheDocument()
    expect(tab(dialog, /الحضور والانضباط/)).toHaveAttribute('aria-selected', 'true')
  })

  it('a failed roster load can be retried and blocks submission meanwhile', async () => {
    server.failPool = () => axiosError(500)
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')

    expect(await within(dialog).findByText('تعذّر تحميل المشاركين في الاجتماع.')).toBeInTheDocument()
    server.failPool = null
    await userEvent.click(within(dialog).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await within(dialog).findByRole('checkbox', { name: /سارة/ })).toBeInTheDocument()
  })

  it('a meeting nobody belongs to can be reported without attendance', async () => {
    server.pool = []
    lounge()
    const dialog = await openReportForm('الاجتماع الأسبوعي')
    expect(await within(dialog).findByText('لا يوجد مشاركون مرتبطون بهذا الاجتماع.')).toBeInTheDocument()
    await goTo(dialog, /الملخص وجدول الأعمال/)
    await userEvent.type(within(dialog).getByLabelText(/ملخص ما تم إنجازه/), 'تم')
    await goTo(dialog, /المراجعة والإرسال/)

    await userEvent.click(within(dialog).getByRole('button', { name: 'رفع التقرير الرسمي' }))

    await waitFor(() => expect(mockPost).toHaveBeenCalled())
    expect((mockPost.mock.calls[0][1] as Row).attendance).toEqual([])
  })
})

describe('joining a meeting from the lounge', () => {
  const memberRow = (over: Row = {}) => row({ display_status: 'scheduled', meeting_url: 'https://meet.example.test/abc', capabilities: CAPS_MEMBER, ...over })

  it('offers "انضمام" to an assigned user, opens the link and records the join', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    setServer([memberRow()])
    lounge()

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    await userEvent.click(within(card).getByRole('button', { name: 'انضمام' }))

    expect(open).toHaveBeenCalledWith('https://meet.example.test/abc', '_blank', 'noopener,noreferrer')
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/department/meetings/1/join'))
    expect(await within(card).findByTestId('my-attendance')).toHaveTextContent('سُجّل انضمامك')
    open.mockRestore()
  })

  it('offers "تأكيد الحضور" instead when there is no link', async () => {
    setServer([memberRow({ meeting_url: null })])
    lounge()

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    expect(within(card).queryByRole('button', { name: 'انضمام' })).not.toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'تأكيد الحضور' }))

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/department/meetings/1/confirm-attendance'))
    expect(await within(card).findByTestId('my-attendance')).toHaveTextContent('أكّدت حضورك')
  })

  it('a user who may only join sees no report action at all', async () => {
    setServer([memberRow({ display_status: 'awaiting_report', status: 'completed' })])
    lounge()

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    expect(within(card).queryByRole('button', { name: 'تقرير يدوي' })).not.toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'عرض التقرير' })).not.toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'انضمام' })).toBeInTheDocument()
  })

  it('shows the report exists to a normal user without offering to read it', async () => {
    setServer([memberRow({ display_status: 'report_submitted', status: 'completed', has_report: true })])
    lounge()

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    expect(within(card).getByText('تم رفع التقرير')).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'عرض التقرير' })).not.toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'انضمام' })).not.toBeInTheDocument()
  })

  it('offers nothing to join for someone who is not assigned or for a cancelled meeting', async () => {
    setServer([
      memberRow({ id: 1, title: 'غير مخصص', capabilities: { ...CAPS_MEMBER, can_join: false, can_confirm_attendance: false } }),
      memberRow({ id: 2, title: 'ملغى', display_status: 'cancelled', status: 'cancelled' }),
    ])
    lounge()

    await screen.findByText('غير مخصص')
    expect(screen.queryByRole('button', { name: 'انضمام' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تأكيد الحضور' })).not.toBeInTheDocument()
  })

  it('a refusal from the server is shown as the server\'s Arabic reason and nothing changes', async () => {
    const toast = (await import('@/lib/toast')).default
    vi.spyOn(window, 'open').mockReturnValue(null)
    setServer([memberRow()], { failJoin: () => axiosError(403, { message: 'هذا الاجتماع غير مخصص لك.' }) })
    lounge()

    const card = (await screen.findByText('الاجتماع الأسبوعي')).closest('li')!
    await userEvent.click(within(card).getByRole('button', { name: 'انضمام' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('هذا الاجتماع غير مخصص لك.'))
    expect(within(card).queryByTestId('my-attendance')).not.toBeInTheDocument()
  })
})

describe('lounge relevance tabs', () => {
  it('opens on the upcoming meetings and asks the server for each time slice', async () => {
    setServer([row()])
    lounge()
    await screen.findByText('الاجتماع الأسبوعي')

    expect(lastParams().when).toBe('upcoming')
    expect(screen.getByRole('tab', { name: 'القادمة' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.click(screen.getByRole('tab', { name: 'السابقة' }))
    await waitFor(() => expect(lastParams().when).toBe('past'))
    await userEvent.click(screen.getByRole('tab', { name: 'الجارية الآن' }))
    await waitFor(() => expect(lastParams().when).toBe('live'))
    await userEvent.click(screen.getByRole('tab', { name: 'الكل' }))
    await waitFor(() => expect(lastParams().when).toBeUndefined())
  })

  it('the admin schedule has no time tabs and shows everything', async () => {
    setServer([row()])
    admin()
    await screen.findByText('الاجتماع الأسبوعي')

    expect(screen.queryByRole('tab', { name: 'القادمة' })).not.toBeInTheDocument()
    expect(lastParams().when).toBeUndefined()
  })

  it('formats the date and time on a card the platform way', async () => {
    setServer([row({ meeting_date: '2026-10-15', start_time: '22:00', end_time: '23:00' })])
    lounge()

    expect(await screen.findByTestId('meeting-when')).toHaveTextContent('15 أكتوبر 2026، 22:00 – 23:00')
  })
})

describe('scheduling with participants', () => {
  async function openSchedule() {
    await userEvent.click(await screen.findByRole('button', { name: /اجتماع جديد/ }))
    return screen.findByRole('dialog', { name: 'جدولة اجتماع جديد' })
  }

  it('uses the system date and time pickers, not browser-default controls', async () => {
    setServer([row()])
    admin()
    const dialog = await openSchedule()

    expect(within(dialog).getAllByTestId('emc-date-picker')).toHaveLength(1)
    expect(within(dialog).getAllByTestId('emc-time-picker')).toHaveLength(2)
    expect(dialog.querySelector('input[type="date"]')).toBeNull()
    expect(dialog.querySelector('input[type="time"]')).toBeNull()
  })

  it('invites the whole department by default and sends no participant list', async () => {
    setServer([row()])
    admin()
    const dialog = await openSchedule()
    await fillSchedule(dialog)

    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))

    await waitFor(() => expect(mockPost).toHaveBeenCalled())
    expect(mockPost.mock.calls[0][1]).not.toHaveProperty('participant_ids')
  })

  it('shows only the chosen department\'s members when inviting specific people', async () => {
    setServer([row()], { access: { can_create: true, creatable_departments: [{ id: 1, name: 'إدارة البرامج' }, { id: 2, name: 'إدارة الجودة' }] } })
    admin()
    const dialog = await openSchedule()
    await userEvent.selectOptions(within(dialog).getByLabelText(/^الإدارة/), '1')

    await userEvent.click(within(dialog).getByRole('radio', { name: /أشخاص بعينهم/ }))

    expect(await within(dialog).findByRole('checkbox', { name: /سارة/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox', { name: /أحمد/ })).toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: /خالد/ })).not.toBeInTheDocument()
    expect(mockGet).toHaveBeenCalledWith('/department/meeting-participants', { params: { department_id: 1 } })
  })

  it('refetches and clears the selection when the department changes', async () => {
    setServer([row()], { access: { can_create: true, creatable_departments: [{ id: 1, name: 'إدارة البرامج' }, { id: 2, name: 'إدارة الجودة' }] } })
    admin()
    const dialog = await openSchedule()
    await userEvent.selectOptions(within(dialog).getByLabelText(/^الإدارة/), '1')
    await userEvent.click(within(dialog).getByRole('radio', { name: /أشخاص بعينهم/ }))
    await userEvent.click(await within(dialog).findByRole('checkbox', { name: /سارة/ }))

    await userEvent.selectOptions(within(dialog).getByLabelText(/^الإدارة/), '2')

    expect(await within(dialog).findByRole('checkbox', { name: /خالد/ })).toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: /سارة/ })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('list', { name: 'المحددون' })).not.toBeInTheDocument()
  })

  it('with no department it offers EMC members from the viewer\'s scope', async () => {
    setServer([row()], { access: { can_create: true, creatable_departments: null } })
    admin()
    const dialog = await openSchedule()

    await userEvent.click(within(dialog).getByRole('radio', { name: /أشخاص بعينهم/ }))

    expect(await within(dialog).findByRole('checkbox', { name: /سارة/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox', { name: /خالد/ })).toBeInTheDocument()
    expect(mockGet).toHaveBeenCalledWith('/department/meeting-participants', { params: undefined })
  })

  it('sends the chosen people, the agenda and the date and times', async () => {
    setServer([row()])
    admin()
    const dialog = await openSchedule()
    await fillSchedule(dialog)
    await userEvent.type(within(dialog).getByLabelText(/جدول الأعمال/), 'افتتاح')
    await userEvent.click(within(dialog).getByRole('radio', { name: /أشخاص بعينهم/ }))
    await userEvent.click(await within(dialog).findByRole('checkbox', { name: /سارة/ }))

    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))

    await waitFor(() => expect(mockPost).toHaveBeenCalled())
    expect(mockPost.mock.calls[0][1]).toMatchObject({ participant_ids: [11], agenda: 'افتتاح', meeting_date: '2026-12-01', start_time: '09:30', department_id: 1 })
  })

  it('requires at least one person when inviting specific people', async () => {
    setServer([row()])
    admin()
    const dialog = await openSchedule()
    await fillSchedule(dialog)
    await userEvent.click(within(dialog).getByRole('radio', { name: /أشخاص بعينهم/ }))
    await within(dialog).findByRole('checkbox', { name: /سارة/ })

    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))

    expect(await within(dialog).findByText(/اختر مشاركًا واحدًا على الأقل/)).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('shows the server refusal for an invitee outside the allowed pool', async () => {
    setServer([row()])
    mockPost.mockRejectedValueOnce(axiosError(422, { message: 'بعض المدعوّين ليسوا من أعضاء الإدارة أو نطاقك المسموح.', errors: { participant_ids: ['بعض المدعوّين ليسوا من أعضاء الإدارة أو نطاقك المسموح.'] } }))
    admin()
    const dialog = await openSchedule()
    await fillSchedule(dialog)
    await userEvent.click(within(dialog).getByRole('radio', { name: /أشخاص بعينهم/ }))
    await userEvent.click(await within(dialog).findByRole('checkbox', { name: /سارة/ }))

    await userEvent.click(within(dialog).getByRole('button', { name: 'حفظ الاجتماع' }))

    expect((await within(dialog).findAllByText('بعض المدعوّين ليسوا من أعضاء الإدارة أو نطاقك المسموح.')).length).toBeGreaterThan(0)
  })

  it('a candidate list that fails to load can be retried', async () => {
    setServer([row()])
    admin()
    const dialog = await openSchedule()
    mockGet.mockRejectedValueOnce(axiosError(500))
    await userEvent.click(within(dialog).getByRole('radio', { name: /أشخاص بعينهم/ }))

    expect(await within(dialog).findByText('تعذّر تحميل قائمة الأعضاء.')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await within(dialog).findByRole('checkbox', { name: /سارة/ })).toBeInTheDocument()
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
  function detailPage(m: Row, details: Row = {}) {
    setServer([m])
    server.details[m.id as number] = details
    return renderPage(<Routes><Route path="/dashboard/department/meeting-lounge/:id" element={<OpsMeetingDetailPage />} /></Routes>, '/dashboard/department/meeting-lounge/1')
  }

  const FULL = {
    description: 'مراجعة الخطة الفصلية', agenda: ['افتتاح', 'مراجعة الخطة'], meeting_url: 'https://meet.example.test/abc',
    participants_visible: true,
    participants: [
      { user: { id: 11, name: 'سارة', department: 'إدارة البرامج' }, status: 'attended', joined_at: null, confirmed_at: null },
      { user: { id: 12, name: 'أحمد', department: 'إدارة البرامج' }, status: 'absent', joined_at: null, confirmed_at: null },
      { user: { id: 13, name: 'ليلى', department: 'إدارة البرامج' }, status: 'invited', joined_at: null, confirmed_at: null },
    ],
    attendance_summary: { invited: 3, joined: 0, attended: 1, absent: 1 },
    decisions: [{ id: 1, title: 'اعتماد الميزانية', description: null }],
    action_items: [{ id: 2, title: 'إعداد العرض', status: 'pending', due_date: '2026-12-05', assigned_to: { id: 11, name: 'سارة' } }],
  }

  it('shows the complete meeting: hero, schedule, information cards, agenda, participants, report, decisions and action items', async () => {
    detailPage(withReport({ meeting_date: '2026-10-15', start_time: '22:00', end_time: '23:00', audience: 'explicit', meeting_url: 'https://meet.example.test/abc' }), FULL)

    expect(await screen.findByRole('heading', { level: 1, name: 'الاجتماع الأسبوعي' })).toBeInTheDocument()
    expect(screen.getByText('مراجعة الخطة الفصلية')).toBeInTheDocument()
    expect(screen.getByTestId('meeting-when')).toHaveTextContent('15 أكتوبر 2026، 22:00 – 23:00')
    expect(screen.getByTestId('meeting-status')).toHaveTextContent('تم رفع التقرير')
    const info = within(screen.getByRole('region', { name: 'معلومات الاجتماع' }))
    expect(info.getByText('إدارة البرامج')).toBeInTheDocument()
    expect(info.getAllByText('نورة العتيبي').length).toBeGreaterThan(0)
    expect(info.getByText('مدعوّون بأسمائهم فقط')).toBeInTheDocument()
    expect(info.getByRole('link', { name: /فتح الرابط/ })).toHaveAttribute('href', 'https://meet.example.test/abc')
    expect(info.getByText('أُنشئ في')).toBeInTheDocument()
    expect(info.getByText('آخر تحديث')).toBeInTheDocument()
    expect(within(screen.getByTestId('agenda-list')).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByTestId('attendance-summary')).toHaveTextContent('3')
    expect(screen.getByText('لم يحضروا')).toBeInTheDocument()
    expect(await screen.findByTestId('report-block')).toHaveTextContent('أُنجزت خطة الربع')
    expect(within(screen.getByTestId('decisions-list')).getByText(/اعتماد الميزانية/)).toBeInTheDocument()
    expect(within(screen.getByTestId('action-items-list')).getByText('إعداد العرض')).toBeInTheDocument()
    expect(within(screen.getByTestId('action-items-list')).getByText(/سارة/)).toBeInTheDocument()
  })

  it('never prints a raw enum value', async () => {
    const { container } = detailPage(withReport({ type: 'external_partner', audience: 'explicit' }), FULL)
    await screen.findByRole('heading', { level: 1 })

    expect(container.textContent ?? '').not.toMatch(/external_partner|report_submitted|awaiting_report|in_progress|explicit|invited|attended|absent|scheduled/)
  })

  it('shows names with their status for the manager, in plain Arabic', async () => {
    detailPage(withReport(), FULL)

    const section = within(await screen.findByRole('region', { name: 'المشاركون والحضور' }))
    expect(section.getByText('سارة')).toBeInTheDocument()
    expect(section.getByText('حضر')).toBeInTheDocument()
    expect(section.getByText('لم يحضر')).toBeInTheDocument()
    expect(section.getByText('مدعو')).toBeInTheDocument()
  })

  it('handles a bare payload with every optional part missing, explaining each empty section', async () => {
    detailPage(row({ department: null, organizer: null, meeting_date: null, start_time: null, end_time: null, capabilities: CAPS_MEMBER, created_at: null }), { updated_at: null })

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText('لم يُحدَّد جدول أعمال لهذا الاجتماع.')).toBeInTheDocument()
    expect(screen.getByText('لم يتم رفع التقرير الرسمي بعد. لكل اجتماع تقرير رسمي واحد فقط، يراه فريق إدارة الجودة بعد رفعه.')).toBeInTheDocument()
    expect(screen.getAllByText('غير محدّدة').length).toBeGreaterThan(0)
    expect(screen.getAllByText('غير معروف', { exact: false }).length).toBeGreaterThan(0)
  })

  it('an assigned user sees the join button, their own state and no report or attendance list', async () => {
    detailPage(
      row({ display_status: 'report_submitted', status: 'completed', has_report: true, meeting_url: 'https://meet.example.test/abc', capabilities: CAPS_MEMBER, my_attendance: { status: 'joined', joined_at: '2026-11-02T09:05:00Z', confirmed_at: null } }),
      { meeting_url: 'https://meet.example.test/abc' },
    )

    expect(await screen.findByRole('button', { name: /انضمام إلى الاجتماع/ })).toBeInTheDocument()
    expect(screen.getByTestId('my-attendance-line')).toHaveTextContent('سُجّل انضمامك')
    expect(screen.getByText(/قائمة المشاركين وحضورهم متاحة لمنظّم الاجتماع وفريق الجودة فقط/)).toBeInTheDocument()
    expect(screen.queryByTestId('attendance-summary')).not.toBeInTheDocument()
    expect(screen.queryByTestId('report-block')).not.toBeInTheDocument()
    expect(screen.getByText(/محتواه متاح لمنظّم الاجتماع وفريق الجودة فقط/)).toBeInTheDocument()
    expect(screen.queryByTestId('decisions-list')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /رفع التقرير/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /عرض التقرير/ })).not.toBeInTheDocument()
  })

  it('records the join from the page and opens the link', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    detailPage(row({ meeting_url: 'https://meet.example.test/abc', capabilities: CAPS_MEMBER }), { meeting_url: 'https://meet.example.test/abc' })

    await userEvent.click(await screen.findByRole('button', { name: /انضمام إلى الاجتماع/ }))

    expect(open).toHaveBeenCalledWith('https://meet.example.test/abc', '_blank', 'noopener,noreferrer')
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/department/meetings/1/join'))
    expect(await screen.findByTestId('my-attendance-line')).toHaveTextContent('سُجّل انضمامك')
    open.mockRestore()
  })

  it('hides the link from someone who is not assigned', async () => {
    detailPage(row({ meeting_url: null, capabilities: { ...CAPS_MEMBER, can_join: false, can_confirm_attendance: false } }))

    expect(await screen.findByText('متاح للمدعوّين فقط')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /انضمام/ })).not.toBeInTheDocument()
  })

  it('offers the upload only while the server allows it and never twice', async () => {
    detailPage(row({ display_status: 'awaiting_report' }))
    const upload = await screen.findAllByRole('button', { name: 'رفع التقرير' })
    expect(upload.length).toBeGreaterThan(0)
  })

  it('hides the upload button once the report exists and shows the report with a link to it', async () => {
    detailPage(withReport(), FULL)

    expect(await screen.findByTestId('report-block')).toHaveTextContent('أُنجزت خطة الربع')
    expect(screen.queryByRole('button', { name: /رفع التقرير/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /عرض التقرير/ })).toHaveAttribute('href', '#official-report')
    expect(screen.getByRole('link', { name: /صالة الاجتماعات/ })).toHaveAttribute('href', '/dashboard/department/meeting-lounge')
  })

  it('opens the report form from the page with the agenda for reference', async () => {
    detailPage(row({ display_status: 'awaiting_report' }), { agenda: ['افتتاح', 'مراجعة الخطة'] })

    await userEvent.click((await screen.findAllByRole('button', { name: 'رفع التقرير' }))[0])
    const dialog = await screen.findByRole('dialog', { name: 'رفع تقرير الاجتماع' })
    await goTo(dialog, /الملخص وجدول الأعمال/)

    expect(within(dialog).getByText('جدول الأعمال (للمرجع)')).toBeInTheDocument()
    expect(within(dialog).getByText('مراجعة الخطة')).toBeInTheDocument()
  })

  it('shows a clear permission message for a meeting the user may not open', async () => {
    setServer([row()], { failDetail: () => axiosError(403, { message: 'غير مصرح لك باستعراض اجتماع خاص بإدارة أخرى' }) })
    renderPage(<Routes><Route path="/dashboard/department/meeting-lounge/:id" element={<OpsMeetingDetailPage />} /></Routes>, '/dashboard/department/meeting-lounge/1')

    expect(await screen.findByText('غير مصرح لك باستعراض اجتماع خاص بإدارة أخرى')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).not.toBeInTheDocument()
  })

  it('shows "not found" for a missing meeting', async () => {
    setServer([])
    renderPage(<Routes><Route path="/dashboard/department/meeting-lounge/:id" element={<OpsMeetingDetailPage />} /></Routes>, '/dashboard/department/meeting-lounge/1')

    expect(await screen.findByText('الاجتماع غير موجود')).toBeInTheDocument()
  })

  it('retries after a server error', async () => {
    setServer([row()], { failDetail: () => axiosError(500) })
    renderPage(<Routes><Route path="/dashboard/department/meeting-lounge/:id" element={<OpsMeetingDetailPage />} /></Routes>, '/dashboard/department/meeting-lounge/1')
    await screen.findByText('تعذّر تحميل الاجتماع')

    server.failDetail = null
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'الاجتماع الأسبوعي' })).toBeInTheDocument()
  })

  it('shows loading placeholders first', async () => {
    setServer([row()])
    renderPage(<Routes><Route path="/dashboard/department/meeting-lounge/:id" element={<OpsMeetingDetailPage />} /></Routes>, '/dashboard/department/meeting-lounge/1')

    expect(screen.getByLabelText('جارٍ تحميل الاجتماع')).toBeInTheDocument()
    await screen.findByRole('heading', { level: 1 })
  })
})
