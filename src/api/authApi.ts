import axios from 'axios'
import apiClient from './axios'
import type { User } from '../types'
import { unwrapData } from './unwrap'
import { normalizeAuthLoginPayload, normalizeAuthUser } from '../utils/userIdentity'

type AuthPayload = { token: string; user: User }

const cookieAuthEnabled = import.meta.env.VITE_AUTH_MODE === 'cookie'

function csrfCookieUrl(): string {
  const apiUrl = String(import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  return `${apiUrl.replace(/\/api$/, '')}/sanctum/csrf-cookie`
}

async function prepareCookieSession(): Promise<void> {
  if (!cookieAuthEnabled) return
  try {
    await axios.get(csrfCookieUrl(), {
      headers: { Accept: 'application/json' },
      withCredentials: true,
      withXSRFToken: true,
    })
  } catch {
    // Best-effort priming: an unreachable /sanctum/csrf-cookie (backend down,
    // tests, token-only deployments) must not veto the login itself — the
    // credential POST below still succeeds in token mode, and a true cookie
    // deployment surfaces its own 419 through normal error handling.
  }
}

function authModeHeaders(): Record<string, string> | undefined {
  return cookieAuthEnabled ? { 'X-EMC-Auth-Mode': 'cookie' } : undefined
}

export type RegisterAccountInput = {
  name: string
  email: string
  password: string
  password_confirmation: string
  country_code?: string
  phone_country_code?: string
  phone?: string
  city?: string
  gender?: string
  how_did_you_hear_about_us?: string
}

export async function login(email: string, password: string): Promise<AuthPayload> {
  await prepareCookieSession()
  const res = await apiClient.post<unknown>('/auth/login', { email, password }, {
    skipErrorToast: true,
    headers: authModeHeaders(),
  })
  return normalizeAuthLoginPayload(unwrapData(res.data))
}

export async function registerAccount(input: RegisterAccountInput): Promise<AuthPayload> {
  await prepareCookieSession()
  const res = await apiClient.post<unknown>('/auth/register', input, {
    skipErrorToast: true,
    headers: authModeHeaders(),
  })
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

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email }, { skipErrorToast: true })
}

export async function resetPassword(params: {
  token: string
  email: string
  password: string
  password_confirmation: string
}): Promise<void> {
  await apiClient.post('/auth/reset-password', params, { skipErrorToast: true })
}

/** Best-effort server session invalidation; callers must always clear client state regardless of outcome. */
export async function logoutRemote(): Promise<void> {
  await apiClient.post('/auth/logout', undefined, { skipErrorToast: true as const }).catch(() => {})
}
