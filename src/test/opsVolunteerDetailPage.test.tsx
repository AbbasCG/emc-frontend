import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/api/axios'
import OpsVolunteerDetailPage from '@/pages/operations/admin/OpsVolunteerDetailPage'

vi.mock('@/api/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }))

const get = vi.mocked(apiClient.get)
const patch = vi.mocked(apiClient.patch)

function httpError(status: number) {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, {}, { status, statusText: '', headers: {}, config, data: { message: 'Forbidden' } })
}
const volunteer = { id: 7, name: 'علي المتطوع', status: 'accepted', department_id: '2', department_name: 'الإعلام', skills: ['تصميم'], hours_logged: 3 }

function route(answers: { volunteer?: () => unknown; workspace?: () => unknown; options?: () => unknown }) {
  get.mockImplementation(((url: string) => {
    const u = String(url)
    const fn = u.includes('/operations/volunteers/') ? answers.volunteer : u.includes('/operations/departments') ? answers.workspace : u.includes('/departments/options') ? answers.options : undefined
    return Promise.resolve().then(fn ?? (() => ({ data: { data: [] } })))
  }) as never)
}
const ok = (data: unknown) => () => ({ data: { data: data } })
const mount = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard/volunteer/7']}>
      <Routes><Route path="/dashboard/volunteer/:id" element={<OpsVolunteerDetailPage />} /></Routes>
    </MemoryRouter>,
  )

describe('OpsVolunteerDetailPage', () => {
  beforeEach(() => { get.mockReset(); patch.mockReset() })

  it('the operations departments 403 does not kill the page: the volunteer renders and the open list fills the dropdown', async () => {
    route({
      volunteer: ok(volunteer),
      workspace: () => { throw httpError(403) },
      options: ok([{ id: 2, name_ar: 'الإعلام', name: 'Media' }, { id: 3, name_ar: 'التقنية', name: 'Tech' }]),
    })
    mount()
    expect(await screen.findByRole('heading', { name: 'علي المتطوع' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'التقنية' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(get).toHaveBeenCalledWith('/operations/departments', expect.objectContaining({ skipErrorToast: true }))
  })

  it('both department sources failing keeps the page, disables the department select and says why', async () => {
    route({ volunteer: ok(volunteer), workspace: () => { throw httpError(403) }, options: () => { throw httpError(500) } })
    mount()
    expect(await screen.findByRole('heading', { name: 'علي المتطوع' })).toBeInTheDocument()
    expect(screen.getByText(/تعذّر تحميل قائمة الإدارات/)).toBeInTheDocument()
    expect(screen.getByLabelText('الإدارة')).toBeDisabled()
    expect(screen.getByLabelText('الحالة')).not.toBeDisabled()
  })

  it('a 403 on the volunteer itself is an Arabic permission state without a retry button', async () => {
    route({ volunteer: () => { throw httpError(403) } })
    mount()
    expect(await screen.findByText(/لا تملك صلاحية عرض بيانات هذا المتطوع/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).toBeNull()
  })

  it('a server failure on the volunteer offers retry and recovers', async () => {
    let calls = 0
    route({ volunteer: () => { calls += 1; if (calls === 1) throw httpError(500); return { data: { data: volunteer } } }, workspace: ok([]) })
    mount()
    await userEvent.click(await screen.findByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByRole('heading', { name: 'علي المتطوع' })).toBeInTheDocument()
  })

  it('a 403 when saving rolls the change back, shows an Arabic permission message and locks the controls', async () => {
    route({ volunteer: ok(volunteer), workspace: ok([{ id: '2', title: 'الإعلام' }]) })
    patch.mockRejectedValue(httpError(403))
    mount()
    const status = await screen.findByLabelText('الحالة')
    await userEvent.selectOptions(status, 'inactive')
    expect(await screen.findByText('لا تملك صلاحية تعديل بيانات هذا المتطوع.')).toBeInTheDocument()
    await waitFor(() => expect(status).toHaveValue('accepted'))
    expect(status).toBeDisabled()
    expect(screen.getByLabelText('الإدارة')).toBeDisabled()
    expect(patch).toHaveBeenCalledWith('/operations/volunteers/7', { status: 'inactive' }, expect.objectContaining({ skipErrorToast: true }))
  })

  it('another save failure says so and keeps the controls usable', async () => {
    route({ volunteer: ok(volunteer), workspace: ok([]) })
    patch.mockRejectedValue(httpError(500))
    mount()
    const status = await screen.findByLabelText('الحالة')
    await userEvent.selectOptions(status, 'inactive')
    expect(await screen.findByText('تعذّر حفظ التعديل. حاول مرة أخرى.')).toBeInTheDocument()
    expect(status).not.toBeDisabled()
  })
})
