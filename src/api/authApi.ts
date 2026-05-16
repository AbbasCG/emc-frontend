import apiClient from './axios'
import type { User } from '../types'
import { unwrapData } from './unwrap'
import { normalizeAuthLoginPayload, normalizeAuthUser } from '../utils/userIdentity'

type AuthPayload = { token: string; user: User }

export async function login(email: string, password: string): Promise<AuthPayload> {
  const res = await apiClient.post<unknown>('/auth/login', { email, password }, { skipErrorToast: true })
  return normalizeAuthLoginPayload(unwrapData(res.data))
}

export async function registerAccount(input: {
  name: string
  email: string
  password: string
  password_confirmation: string
}): Promise<AuthPayload> {
  const res = await apiClient.post<unknown>('/auth/register', input, { skipErrorToast: true })
  return normalizeAuthLoginPayload(unwrapData(res.data))
}

export async function fetchMe(): Promise<User> {
  const res = await apiClient.get<unknown>('/auth/me', { skipErrorToast: true })
  return normalizeAuthUser(unwrapData(res.data))
}

/** Best-effort server session invalidation; callers must always clear client state regardless of outcome. */
export async function logoutRemote(): Promise<void> {
  const opts = { skipErrorToast: true as const }
  try {
    await apiClient.post('/logout', undefined, opts)
    return
  } catch {
    await apiClient.post('/auth/logout', undefined, opts).catch(() => {})
  }
}
