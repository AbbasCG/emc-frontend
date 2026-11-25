import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/api/axios'
import HrDepartmentsPage from '@/pages/hr/HrDepartmentsPage'
import HrInstructorsPage from '@/pages/hr/HrInstructorsPage'
import HrOnboardingPage from '@/pages/hr/HrOnboardingPage'
import HrTeamPage from '@/pages/hr/HrTeamPage'
import InstructorsManagementPage from '@/pages/super-admin/crud/InstructorsManagementPage'

vi.mock('@/api/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }))
vi.mock('@/lib/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

const get = vi.mocked(apiClient.get)
const UNLINKED = 'لم يتم ربط هذا القسم بالبيانات بعد'
const RETRY = { name: 'إعادة المحاولة' }

function httpError(status: number) {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('Request failed with status code ' + status, 'ERR_BAD_REQUEST', config, {}, { status, statusText: '', headers: {}, config, data: { message: 'Forbidden' } })
}
const networkError = () => new AxiosError('Network Error', 'ERR_NETWORK')

/** Answer by URL: `answers` maps a path fragment to a handler; anything else is an empty success. */
function route(answers: Record<string, () => unknown>) {
  get.mockImplementation(((url: string) => {
    const hit = Object.keys(answers).find((k) => String(url).includes(k))
    return hit ? Promise.resolve().then(answers[hit]) : Promise.resolve({ data: { data: [] } })
  }) as never)
}
const render_ = (el: React.ReactElement) => render(<MemoryRouter>{el}</MemoryRouter>)

const hrInstructor = {
  id: 3, user_id: 9, name: 'منى الحداد', email: 'mona@example.com', phone: '+967700', avatar_url: null, instructor_image_url: null,
  title: 'مدربة قيادة', bio: null, is_active: true, assigned_courses_count: 2, active_courses_count: 1, workshops_count: 0, expertise: [], created_at: '2026-01-01',
}

describe('HrInstructorsPage reads the HR endpoint', () => {
  beforeEach(() => get.mockReset())

  it('requests /hr/instructors (not /admin/instructors) without a toast and lists the rows', async () => {
    route({ '/hr/instructors': () => ({ data: { success: true, data: [hrInstructor], meta: { total: 1, current_page: 1, last_page: 1 } } }) })
    render_(<HrInstructorsPage />)
    expect((await screen.findAllByText('منى الحداد')).length).toBeGreaterThan(0)
    const urls = get.mock.calls.map((c) => c[0])
    expect(urls).toContain('/hr/instructors')
    expect(urls).not.toContain('/admin/instructors')
    expect(get).toHaveBeenCalledWith('/hr/instructors', expect.objectContaining({ skipErrorToast: true }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('403 shows one Arabic permission message: no empty text, no raw URL, no retry', async () => {
    route({ '/hr/instructors': () => { throw httpError(403) } })
    render_(<HrInstructorsPage />)
    expect(await screen.findByText(/لا تملك صلاحية عرض المدربين/)).toBeInTheDocument()
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.queryByText(/لا يوجد مدربون حاليًا/)).toBeNull()
    expect(document.body.textContent).not.toContain('/api/')
    expect(screen.queryByRole('button', RETRY)).toBeNull()
  })

  it('a server failure offers retry and recovers', async () => {
    let calls = 0
    route({ '/hr/instructors': () => { calls += 1; if (calls === 1) throw httpError(500); return { data: { data: [hrInstructor] } } } })
    render_(<HrInstructorsPage />)
    await userEvent.click(await screen.findByRole('button', RETRY))
    expect((await screen.findAllByText('منى الحداد')).length).toBeGreaterThan(0)
    expect(calls).toBe(2)
  })

  it('a successful empty answer is the only case that says there are no instructors', async () => {
    route({ '/hr/instructors': () => ({ data: { data: [] } }) })
    render_(<HrInstructorsPage />)
    expect(await screen.findByText('لا يوجد مدربون حاليًا')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('InstructorsManagementPage (admin) keeps the admin endpoint but no longer hides a refusal', () => {
  beforeEach(() => get.mockReset())

  it('requests /admin/instructors and shows the permission message on 403 instead of an empty list', async () => {
    route({ '/admin/instructors': () => { throw httpError(403) } })
    render_(<InstructorsManagementPage />)
    expect(await screen.findByText(/لا تملك صلاحية عرض المدربين/)).toBeInTheDocument()
    expect(get.mock.calls.map((c) => c[0])).toContain('/admin/instructors')
    expect(screen.queryByText('لا يوجد مدربون حاليًا')).toBeNull()
    expect(document.body.textContent).not.toContain('/api/')
  })

  it('a network failure offers retry', async () => {
    let calls = 0
    route({ '/admin/instructors': () => { calls += 1; if (calls === 1) throw networkError(); return { data: { data: [hrInstructor] } } } })
    render_(<InstructorsManagementPage />)
    await userEvent.click(await screen.findByRole('button', RETRY))
    expect((await screen.findAllByText('منى الحداد')).length).toBeGreaterThan(0)
  })
})

describe('HrDepartmentsPage reads /hr/departments', () => {
  beforeEach(() => get.mockReset())
  const dept = { id: 1, name: 'الإعلام', slug: 'media', status: 'active', team_members_count: 4, volunteers_count: 7, tasks_count: 12 }

  it('lists the departments with their counts', async () => {
    route({ '/hr/departments': () => ({ data: { success: true, data: [dept] } }), '/team': () => ({ data: { data: [] } }) })
    render_(<HrDepartmentsPage />)
    expect(await screen.findByText('الإعلام')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(get.mock.calls.map((c) => c[0])).not.toContain('/operations/departments')
  })

  it('a failing public team directory does not hide the departments', async () => {
    route({ '/hr/departments': () => ({ data: { data: [dept] } }), '/team': () => { throw httpError(500) } })
    render_(<HrDepartmentsPage />)
    expect(await screen.findByText('الإعلام')).toBeInTheDocument()
  })

  it('403: permission message, not the unlinked notice', async () => {
    route({ '/hr/departments': () => { throw httpError(403) } })
    render_(<HrDepartmentsPage />)
    expect(await screen.findByText(/لا تملك صلاحية عرض الإدارات/)).toBeInTheDocument()
    expect(screen.queryByText(UNLINKED)).toBeNull()
    expect(screen.queryByRole('button', RETRY)).toBeNull()
  })

  it('network failure: retry recovers; empty success: empty state', async () => {
    let calls = 0
    route({ '/hr/departments': () => { calls += 1; if (calls === 1) throw networkError(); return { data: { data: [] } } } })
    render_(<HrDepartmentsPage />)
    await userEvent.click(await screen.findByRole('button', RETRY))
    expect(await screen.findByText('لا توجد إدارات ضمن هذا العرض')).toBeInTheDocument()
  })
})

describe('HrTeamPage and HrOnboardingPage never call a failure "not linked yet"', () => {
  beforeEach(() => get.mockReset())

  it('team: 403 shows the permission message', async () => {
    route({ '/team': () => { throw httpError(403) } })
    render_(<HrTeamPage />)
    expect(await screen.findByText(/لا تملك صلاحية عرض أعضاء الفريق/)).toBeInTheDocument()
    expect(screen.queryByText(UNLINKED)).toBeNull()
    expect(screen.queryByText('لا توجد مجموعات ضمن دليل الفريق')).toBeNull()
  })

  it('team: 500 retries and recovers to the list; an empty success shows the empty state', async () => {
    let calls = 0
    route({ '/team': () => { calls += 1; if (calls === 1) throw httpError(500); return { data: { data: [{ id: 1, name_ar: 'القيادة', members: [] }] } } } })
    render_(<HrTeamPage />)
    await userEvent.click(await screen.findByRole('button', RETRY))
    expect(await screen.findByText('القيادة')).toBeInTheDocument()
  })

  it('team: empty success is the empty state only', async () => {
    route({ '/team': () => ({ data: { data: [] } }) })
    render_(<HrTeamPage />)
    expect(await screen.findByText('لا توجد مجموعات ضمن دليل الفريق')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('onboarding: 403 permission message, network retry, empty success', async () => {
    route({ '/operations/volunteers': () => { throw httpError(403) } })
    const first = render_(<HrOnboardingPage />)
    expect(await screen.findByText(/لا تملك صلاحية عرض مسارات التأهيل/)).toBeInTheDocument()
    expect(screen.queryByText(UNLINKED)).toBeNull()
    first.unmount()

    let calls = 0
    route({ '/operations/volunteers': () => { calls += 1; if (calls === 1) throw networkError(); return { data: { data: [] } } } })
    render_(<HrOnboardingPage />)
    await userEvent.click(await screen.findByRole('button', RETRY))
    expect(await screen.findByText('لا توجد سجلات تأهيل واضحة في العيّنة الحالية')).toBeInTheDocument()
    expect(screen.queryByText(UNLINKED)).toBeNull()
  })
})
