import apiClient from './axios'
import type { User } from '../types'
import { unwrapData } from './unwrap'
import { normalizeAuthLoginPayload, normalizeAuthUser } from '../utils/userIdentity'

type AuthPayload = { token: string; user: User }

export class TwoFactorRequiredError extends Error {
  userId: number
  constructor(userId: number) {
    super('Two-factor authentication required')
    this.name = 'TwoFactorRequiredError'
    this.userId = userId
  }
}

export async function login(email: string, password: string): Promise<AuthPayload> {
  const res = await apiClient.post<unknown>('/auth/login', { email, password }, { skipErrorToast: true })
  const body = res.data as Record<string, unknown>
  if (body.requires_2fa) {
    const userId = Number((body.data as Record<string, unknown> | undefined)?.user_id ?? 0)
    throw new TwoFactorRequiredError(userId)
  }
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

/** Super Admin only — swaps issued token to target user perspective. */
export async function postImpersonateUser(userId: number): Promise<unknown> {
  const res = await apiClient.post<unknown>(`/admin/impersonate/${userId}`, {}, { skipErrorToast: true })
  return unwrapData(res.data)
}

/** End impersonation preview — restores super_admin session server-side when supported. */
export async function postImpersonateStop(): Promise<unknown> {
  const res = await apiClient.post<unknown>('/admin/impersonate/stop', {}, { skipErrorToast: true })
  return unwrapData(res.data)
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
