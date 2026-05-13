import apiClient from './axios'
import { unwrapData } from './unwrap'

export type RegistrationSubmitPayload = {
  course_id: number
  full_name: string
  phone: string
  email: string
  city: string
  gender: string
  notes: string
  payment_provider?: string
}

export type RegistrationResponse = {
  id: number
  checkout_url?: string | null
  payment_id?: number | null
}

export async function submitCourseRegistration(
  payload: RegistrationSubmitPayload,
): Promise<RegistrationResponse> {
  const res = await apiClient.post<{ data: RegistrationResponse }>('/register', payload)
  return unwrapData<RegistrationResponse>(res.data)
}
