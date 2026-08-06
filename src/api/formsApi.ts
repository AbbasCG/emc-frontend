import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import type { FormSubmissionRow, OpsFormDefinition } from '@/types/operations'

export async function fetchFormDefinitions(): Promise<OpsFormDefinition[]> {
  const res = await apiClient.get<unknown>('/operations/forms')
  return asList<OpsFormDefinition>(res.data)
}

export async function fetchFormDefinition(id: number): Promise<OpsFormDefinition> {
  const res = await apiClient.get<unknown>(`/operations/forms/${id}`)
  return unwrapLms<OpsFormDefinition>(res.data)
}

export async function fetchPublicFormBySlug(slug: string): Promise<OpsFormDefinition> {
  const res = await apiClient.get<unknown>(`/forms/${slug}`)
  return unwrapLms<OpsFormDefinition>(res.data)
}

export async function submitPublicForm(slug: string, answers: Record<string, unknown>): Promise<void> {
  await apiClient.post(`/forms/${slug}/submit`, { answers })
}

export async function createFormDefinition(body: Partial<OpsFormDefinition>): Promise<OpsFormDefinition> {
  const res = await apiClient.post<unknown>('/operations/forms', body)
  return unwrapLms<OpsFormDefinition>(res.data)
}

export async function updateFormDefinition(
  id: number,
  body: Partial<OpsFormDefinition>,
): Promise<OpsFormDefinition> {
  const res = await apiClient.put<unknown>(`/operations/forms/${id}`, body)
  return unwrapLms<OpsFormDefinition>(res.data)
}

export async function fetchFormSubmissions(formId: number): Promise<FormSubmissionRow[]> {
  const res = await apiClient.get<unknown>(`/operations/forms/${formId}/submissions`)
  return asList<FormSubmissionRow>(res.data)
}
