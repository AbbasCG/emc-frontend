import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchFormDefinitions,
  fetchFormDefinition,
  fetchPublicFormBySlug,
  submitPublicForm,
  createFormDefinition,
  updateFormDefinition,
  fetchFormSubmissions,
} from '@/api/formsApi'
import type { FormSubmissionRow, OpsFormDefinition } from '@/types/operations'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

const form = {
  id: 3,
  title: 'نموذج التطوع',
  description: 'انضم إلى فريق المتطوعين',
  slug: 'volunteer-form',
  form_type: 'volunteer',
  questions: [],
} as unknown as OpsFormDefinition

const submission: FormSubmissionRow = {
  id: 1,
  submitted_at: '2026-08-01T12:00:00Z',
  submitter_label: 'سارة أحمد',
  answers_preview: 'المدينة: القاهرة',
}

describe('definitions', () => {
  it('fetchFormDefinitions unwraps the list from /operations/forms', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [form] } })
    await expect(fetchFormDefinitions()).resolves.toEqual([form])
    expect(mockedApi.get).toHaveBeenCalledWith('/operations/forms')
  })

  it('fetchFormDefinitions normalizes a malformed payload to []', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { message: 'خطأ' } })
    await expect(fetchFormDefinitions()).resolves.toEqual([])
  })

  it('fetchFormDefinition unwraps the single definition', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: form } })
    await expect(fetchFormDefinition(3)).resolves.toEqual(form)
    expect(mockedApi.get).toHaveBeenCalledWith('/operations/forms/3')
  })

  it('fetchPublicFormBySlug hits the public /forms/{slug} route', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: form } })
    await expect(fetchPublicFormBySlug('volunteer-form')).resolves.toEqual(form)
    expect(mockedApi.get).toHaveBeenCalledWith('/forms/volunteer-form')
  })

  it('errors propagate (no silent catch anywhere in this module)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('404'))
    await expect(fetchFormDefinition(99)).rejects.toThrow('404')
  })
})

describe('mutations', () => {
  it('submitPublicForm POSTs answers under an { answers } envelope', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await expect(
      submitPublicForm('volunteer-form', { name: 'سارة', city: 'القاهرة' }),
    ).resolves.toBeUndefined()
    expect(mockedApi.post).toHaveBeenCalledWith('/forms/volunteer-form/submit', {
      answers: { name: 'سارة', city: 'القاهرة' },
    })
  })

  it('createFormDefinition POSTs the body and unwraps the created form', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: form } })
    await expect(createFormDefinition({ title: 'نموذج التطوع' })).resolves.toEqual(form)
    expect(mockedApi.post).toHaveBeenCalledWith('/operations/forms', { title: 'نموذج التطوع' })
  })

  it('updateFormDefinition PUTs the body and unwraps the updated form', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { data: form } })
    await expect(updateFormDefinition(3, { title: 'نموذج محدث' })).resolves.toEqual(form)
    expect(mockedApi.put).toHaveBeenCalledWith('/operations/forms/3', { title: 'نموذج محدث' })
  })

  it('mutation errors propagate to callers', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('422'))
    await expect(submitPublicForm('x', {})).rejects.toThrow('422')

    mockedApi.put.mockRejectedValueOnce(new Error('403'))
    await expect(updateFormDefinition(3, {})).rejects.toThrow('403')
  })
})

describe('fetchFormSubmissions', () => {
  it('unwraps the submissions list for a form', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [submission] } })
    await expect(fetchFormSubmissions(3)).resolves.toEqual([submission])
    expect(mockedApi.get).toHaveBeenCalledWith('/operations/forms/3/submissions')
  })

  it('malformed payload normalizes to []', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { rows: [] } } })
    await expect(fetchFormSubmissions(3)).resolves.toEqual([])
  })
})
