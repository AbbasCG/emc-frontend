import axios from 'axios'
import apiClient from './axios'
import { unwrapData } from './unwrap'

/** Avoid generic global 422 toast — Register page shows field-level errors */
const silent = { skipErrorToast: true as const }

export type RegistrationSubmitPayload = {
  course_id: number
  full_name: string
  phone: string
  email: string
  city: string
  gender: string
  notes: string
  registration_code?: string
  payment_provider?: string
  /** Sent for UX context; backend ignores via validated() */
  country?: string
  country_code?: string
  phone_country_code?: string
}

/** Body for POST `/courses/{id}/register` — course id is in the URL */
export type CourseRegisterBody = Omit<RegistrationSubmitPayload, 'course_id'>

export type RegistrationResponse = {
  id: number
  checkout_url?: string | null
  payment_id?: number | null
}

/**
 * Preferred: POST /courses/{course}/register (under configured `/api` base).
 * Falls back to legacy POST /register if the route is missing (404) or not allowed (405).
 */
export async function registerForCourse(
  courseId: number,
  body: CourseRegisterBody,
): Promise<RegistrationResponse> {
  const path = `/courses/${courseId}/register`
  if (import.meta.env.DEV) {
    console.log('[EMC registration submit]', {
      method: 'POST',
      path,
      baseURL: apiClient.defaults.baseURL,
      payloadKeys: Object.keys(body),
    })
  }
  const res = await apiClient.post<{ data: RegistrationResponse }>(path, body, silent)
  const out = unwrapData<RegistrationResponse>(res.data)
  if (import.meta.env.DEV) {
    console.log('[EMC registration submit] response', { httpStatus: res.status, id: out?.id })
  }
  return out
}

export async function submitCourseRegistration(
  payload: RegistrationSubmitPayload,
): Promise<RegistrationResponse> {
  const { course_id, ...rest } = payload
  try {
    return await registerForCourse(course_id, rest)
  } catch (first) {
    if (!axios.isAxiosError(first)) throw first
    const st = first.response?.status
    if (import.meta.env.DEV && st === 409) {
      console.log('[EMC registration submit] duplicate / conflict', {
        status: st,
        body: first.response?.data,
      })
    }
    if (st !== 404 && st !== 405) throw first
    if (import.meta.env.DEV) {
      console.log('[EMC registration submit] fallback POST /register', { course_id })
    }
    const res = await apiClient.post<{ data: RegistrationResponse }>('/register', payload, silent)
    return unwrapData<RegistrationResponse>(res.data)
  }
}
