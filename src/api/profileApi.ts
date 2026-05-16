import apiClient from './axios'
import type { User } from '@/types'
import { normalizeAuthUser } from '@/utils/userIdentity'

/** Profile sections use dash placeholders for empty fields (Arabic UI). */
export function normalizeProfilePayload(payload: unknown): User {
  const u = normalizeAuthUser(payload)
  return {
    ...u,
    name: u.name.trim() === '' ? '—' : u.name,
    email: u.email.trim() === '' ? '—' : u.email,
  }
}

/** Canonical order: Laravel API `/user`, then `/me`, then existing app `/auth/me`. */
const PROFILE_GET_PATHS = ['/user', '/me', '/auth/me'] as const

export async function fetchProfileUser(): Promise<User> {
  let last: unknown
  for (const path of PROFILE_GET_PATHS) {
    try {
      const res = await apiClient.get<unknown>(path, { skipErrorToast: true })
      return normalizeProfilePayload(res.data)
    } catch (e) {
      last = e
    }
  }
  throw last ?? new Error('PROFILE_FETCH_FAILED')
}
