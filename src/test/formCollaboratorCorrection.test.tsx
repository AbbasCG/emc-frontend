import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import apiClient from '@/api/axios'
import FormCollaboratorsPanel from '@/components/operations/formAdmin/FormCollaboratorsPanel'
import type { OpsFormDefinition } from '@/types/operations'

/** Correcting answers is a grant of its own, on top of reading them: the collaborators screen shows it, and it only goes with response access. */

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
const api = vi.mocked(apiClient, true)
beforeEach(() => vi.clearAllMocks())

const form = { id: 7, title: 'استبيان', slug: 's', form_type: 'suggestion', questions: [], created_at: '', abilities: { view: true, edit: true, publish: true, manage_access: true, view_responses: true, manage_responses: true, delete: true } } as OpsFormDefinition
const person = (id: number, name: string) => ({ id, name, role: 'operations_manager', departments: [] as string[] })
const collaborator = (id: number, name: string, view: boolean, correct: boolean) => ({ id, user: person(id + 100, name), access_level: 'viewer', can_view_responses: view, can_correct_responses: correct, granted_by: { id: 1, name: 'المالك' }, granted_at: '2026-10-18T10:00:00Z' })
const ok = (data: unknown) => ({ data: { success: true, data } })

async function mount(rows: unknown[]) {
  api.get.mockResolvedValue(ok(rows))
  render(<FormCollaboratorsPanel form={form} />)
  await screen.findByText(String((rows[0] as { user: { name: string } }).user.name))
}

describe('the correction grant', () => {
  it('is shown per person, and cannot be ticked for someone who may not read the responses', async () => {
    await mount([collaborator(1, 'سلمى', true, true), collaborator(2, 'نورة', false, false)])

    expect(screen.getByLabelText('تصحيح الإجابات لـ سلمى')).toBeChecked()
    expect(screen.getByLabelText('تصحيح الإجابات لـ سلمى')).toBeEnabled()
    expect(screen.getByLabelText('تصحيح الإجابات لـ نورة')).not.toBeChecked()
    expect(screen.getByLabelText('تصحيح الإجابات لـ نورة')).toBeDisabled()
  })

  it('changing it sends that grant alone, and changing something else leaves it to the server', async () => {
    await mount([collaborator(1, 'سلمى', true, false)])
    api.put.mockResolvedValue(ok(collaborator(1, 'سلمى', true, true)))

    await userEvent.click(screen.getByLabelText('تصحيح الإجابات لـ سلمى'))
    expect(api.put).toHaveBeenLastCalledWith('/operations/forms/7/collaborators/1', { access_level: 'viewer', can_view_responses: true, can_correct_responses: true }, { skipErrorToast: true })

    await userEvent.selectOptions(screen.getByLabelText('مستوى سلمى'), 'editor')
    expect(api.put).toHaveBeenLastCalledWith('/operations/forms/7/collaborators/1', { access_level: 'editor', can_view_responses: true }, { skipErrorToast: true })
  })

  it('adding someone sends the grant only when it was chosen, and the choice needs response access', async () => {
    await mount([collaborator(1, 'سلمى', true, false)])
    api.get.mockImplementation((async (url: string) => (url.endsWith('/collaborators') ? ok([collaborator(1, 'سلمى', true, false)]) : ok([person(9, 'موظفة مرشحة')]))) as never)
    api.post.mockResolvedValue(ok(collaborator(9, 'موظفة مرشحة', true, true)))

    await userEvent.type(screen.getByLabelText(/ابحث عن موظف بالاسم/), 'مرشح')
    await userEvent.click(await screen.findByRole('button', { name: /موظفة مرشحة/ }))
    const form_ = screen.getByRole('button', { name: 'إضافة' }).parentElement!
    expect(within(form_).getByLabelText('يستطيع تصحيح الإجابات')).toBeDisabled()

    await userEvent.click(within(form_).getByLabelText('يستطيع قراءة الإجابات'))
    await userEvent.click(within(form_).getByLabelText('يستطيع تصحيح الإجابات'))
    await userEvent.click(screen.getByRole('button', { name: 'إضافة' }))

    expect(api.post).toHaveBeenCalledWith('/operations/forms/7/collaborators', { user_id: 9, access_level: 'viewer', can_view_responses: true, can_correct_responses: true }, { skipErrorToast: true })
  })
})
