import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeeklyReportsPage from '@/pages/operations/WeeklyReportsPage'
import type { DepartmentAccessManifest, LedDepartmentState, WeeklyReport } from '@/api/operationsReportsApi'

/**
 * Weekly Reports — browse filter follows READ scope, create controls follow
 * CREATE scope. A read-only global role (quality) must be able to browse
 * every department without ever being offered creation.
 */

const mockAccess = vi.fn()
const mockReports = vi.fn()
const mockDue = vi.fn()

vi.mock('@/api/operationsReportsApi', () => ({
  fetchMyDepartmentAccess: () => mockAccess(),
  fetchWeeklyReports: (params: unknown) => mockReports(params),
  fetchWeeklyReportsDue: () => mockDue(),
  fetchWeeklyReportsSummary: () =>
    Promise.resolve({
      week_start: '2026-09-28', deadline: '2026-09-28T23:59:59Z', expected: 3, submitted: 1,
      overdue: 0, in_progress: 2, completion_rate: 33, deadline_passed: false,
    }),
  fetchDepartmentMembers: () => Promise.resolve([]),
  submitWeeklyReport: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const A = { id: 1, name: 'إدارة البرامج' }
const B = { id: 2, name: 'إدارة التسويق' }
const C = { id: 3, name: 'إدارة الموارد البشرية' }

const report: WeeklyReport = {
  id: 90, week_start: '2026-09-28', achievements: 'أنجزنا', planned: 'سننجز',
  blockers: null, needs: null, notes: null, department: B,
  submitter: { id: 7, name: 'قائد التسويق' }, submitted_at: '2026-09-28T09:00:00Z',
}

function manifest(overrides: Partial<DepartmentAccessManifest>): DepartmentAccessManifest {
  return {
    department_scope: 'restricted', allowed_departments: [], can_select_any_department: false,
    can_create_report: false, read_scope: 'restricted', readable_departments: [],
    can_view_multiple_departments: false, ...overrides,
  }
}

const qualityManifest = manifest({
  read_scope: 'global', readable_departments: [A, B, C], can_view_multiple_departments: true,
})

function due(led: LedDepartmentState[] = []) {
  return {
    week_start: '2026-09-28', missing: [], submitted: 1,
    deadline: '2026-09-28T23:59:59Z', deadline_passed: false, led_departments: led,
  }
}

async function renderPage() {
  render(<WeeklyReportsPage />)
  // Wait for the initial list fetch to settle.
  await waitFor(() => expect(mockReports).toHaveBeenCalled())
}

describe('WeeklyReportsPage — read scope vs create scope', () => {
  beforeEach(() => {
    mockAccess.mockReset()
    mockReports.mockReset().mockResolvedValue({ rows: [report], total: 1 })
    mockDue.mockReset().mockResolvedValue(due())
  })

  it('shows the department browse filter to a read-only global quality user', async () => {
    mockAccess.mockResolvedValue(qualityManifest)
    await renderPage()

    const filter = await screen.findByRole('combobox', { name: 'تصفية حسب الإدارة' })
    const options = within(filter).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['كل الأقسام', A.name, B.name, C.name])
  })

  it('never offers create controls to the read-only global quality user', async () => {
    mockAccess.mockResolvedValue(qualityManifest)
    await renderPage()
    await screen.findByRole('combobox', { name: 'تصفية حسب الإدارة' })

    expect(screen.queryByRole('button', { name: /إنشاء تقرير أسبوعي جديد/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إنشاء الآن' })).not.toBeInTheDocument()
    expect(screen.queryByText('تقرير إدارتك لهذا الأسبوع')).not.toBeInTheDocument()
  })

  it('can_create_report=false does not hide legitimate read-only browsing', async () => {
    mockAccess.mockResolvedValue(qualityManifest)
    await renderPage()

    // The cross-department report is listed and the filter is available.
    expect((await screen.findAllByText(B.name)).length).toBeGreaterThan(0)
    expect(screen.getByRole('combobox', { name: 'تصفية حسب الإدارة' })).toBeInTheDocument()
  })

  it('filters the list by the selected department', async () => {
    mockAccess.mockResolvedValue(qualityManifest)
    await renderPage()

    const filter = await screen.findByRole('combobox', { name: 'تصفية حسب الإدارة' })
    await userEvent.selectOptions(filter, String(C.id))

    await waitFor(() =>
      expect(mockReports).toHaveBeenLastCalledWith(expect.objectContaining({ department_id: C.id })),
    )
  })

  it('a sole department leader still sees their create control', async () => {
    mockAccess.mockResolvedValue(manifest({
      allowed_departments: [A], can_create_report: true, readable_departments: [A],
    }))
    mockDue.mockResolvedValue(due([{
      department: A, current_report: null, can_create: true, can_edit: false, can_submit: true, state: 'in_progress',
    }]))
    await renderPage()

    expect(await screen.findByText('تقرير إدارتك لهذا الأسبوع')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إنشاء تقرير أسبوعي جديد' })).toBeInTheDocument()
    // Reads only one department → no pointless filter.
    expect(screen.queryByRole('combobox', { name: 'تصفية حسب الإدارة' })).not.toBeInTheDocument()
  })

  it('a global admin keeps the create button and the filter', async () => {
    mockAccess.mockResolvedValue(manifest({
      department_scope: 'global', allowed_departments: [A, B, C], can_select_any_department: true,
      can_create_report: true, read_scope: 'global', readable_departments: [A, B, C], can_view_multiple_departments: true,
    }))
    await renderPage()

    expect(await screen.findByRole('button', { name: /إنشاء تقرير أسبوعي جديد/ })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'تصفية حسب الإدارة' })).toBeInTheDocument()
  })

  it('a single-department member gets no global filtering UI and no create control', async () => {
    mockAccess.mockResolvedValue(manifest({ readable_departments: [A] }))
    await renderPage()
    await screen.findAllByText(B.name)

    expect(screen.queryByRole('combobox', { name: 'تصفية حسب الإدارة' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /إنشاء تقرير أسبوعي جديد/ })).not.toBeInTheDocument()
  })

  it('a leader who is also a member elsewhere can browse both departments', async () => {
    mockAccess.mockResolvedValue(manifest({
      allowed_departments: [A], can_create_report: true,
      readable_departments: [A, B], can_view_multiple_departments: true,
    }))
    await renderPage()

    const filter = await screen.findByRole('combobox', { name: 'تصفية حسب الإدارة' })
    expect(within(filter).getAllByRole('option').map((o) => o.textContent)).toEqual(['كل الأقسام', A.name, B.name])
  })

  it('falls back to the create scope when an older backend omits read-scope fields', async () => {
    mockAccess.mockResolvedValue({
      department_scope: 'restricted', allowed_departments: [A, B],
      can_select_any_department: false, can_create_report: true,
    } satisfies DepartmentAccessManifest)
    await renderPage()

    const filter = await screen.findByRole('combobox', { name: 'تصفية حسب الإدارة' })
    expect(within(filter).getAllByRole('option')).toHaveLength(3)
  })
})
