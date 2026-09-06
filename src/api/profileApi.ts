import axios from 'axios'
import apiClient from './axios'
import type { User } from '@/types'
import { unwrapData } from '@/api/unwrap'
import { extractUserRecord, normalizeAuthUser } from '@/utils/userIdentity'

/** Profile sections use dash placeholders for empty fields (Arabic UI). */
export function normalizeProfilePayload(payload: unknown): User {
  const rec = extractUserRecord(payload)
  const u = normalizeAuthUser(rec ?? payload)
  return {
    ...u,
    name: u.name.trim() === '' ? '—' : u.name,
    email: u.email.trim() === '' ? '—' : u.email,
  }
}

/** Canonical order: Laravel API `/user`, then `/me`, then existing app `/auth/me`. */
const PROFILE_GET_PATHS = ['/profile', '/user', '/me', '/auth/me'] as const

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

export type ProfileWritePayload = {
  name?: string
  email?: string
  phone?: string | null
  city?: string | null
  country?: string | null
  instructor_bio?: string | null
}

async function unwrapUserEnvelope(resData: unknown): Promise<User> {
  const inner = unwrapData(resData)
  if (inner && typeof inner === 'object' && 'user' in inner) {
    return normalizeAuthUser((inner as { user: unknown }).user)
  }
  return normalizeAuthUser(inner ?? resData)
}

/** Persist profile patch — prefers PATCH then PUT only when PATCH is unsupported. */
export async function updateProfile(patch: ProfileWritePayload): Promise<User> {
  const body = { ...patch }

  async function finalize(resData: unknown): Promise<User> {
    const u = await unwrapUserEnvelope(resData)
    return {
      ...u,
    name: u.name.trim() === '' ? '—' : u.name,
    email: u.email.trim() === '' ? '—' : u.email,
    }
  }

  const silent = { skipErrorToast: true as const }
  try {
    const res = await apiClient.patch<unknown>('/profile', body, silent)
    return finalize(res.data)
  } catch (e: unknown) {
    const status = axios.isAxiosError(e) ? e.response?.status : undefined
    if (status === 404 || status === 405) {
      const res = await apiClient.put<unknown>('/profile', body, silent)
      return finalize(res.data)
    }
    throw e
  }
}

/** Upload avatar — POST multipart; probes common Laravel paths silently. */
export async function uploadProfileAvatar(file: File): Promise<User> {
  const fd = new FormData()
  fd.append('avatar', file)

  const tryPaths = ['/profile/avatar', '/user/avatar', '/me/avatar'] as const

  let lastErr: unknown
  for (const path of tryPaths) {
    try {
      const res = await apiClient.post<unknown>(path, fd, { skipErrorToast: true })
      const u = await unwrapUserEnvelope(res.data)
      return {
        ...u,
    name: u.name.trim() === '' ? '—' : u.name,
    email: u.email.trim() === '' ? '—' : u.email,
      }
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('AVATAR_UPLOAD_FAILED')
}

/** Remove avatar when backend supports explicit removal. */
export async function deleteProfileAvatar(): Promise<User> {
  const tryPaths = ['/profile/avatar', '/user/avatar'] as const
  let lastErr: unknown
  for (const path of tryPaths) {
    try {
      const res = await apiClient.delete<unknown>(path, { skipErrorToast: true })
      const inner = unwrapData(res.data)
      return normalizeAuthUser(inner ?? res.data)
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('AVATAR_DELETE_FAILED')
}

/** GDPR / account deletion — caller should clear session after success. */
export async function deleteOwnProfile(): Promise<void> {
  await apiClient.delete('/profile', { skipErrorToast: true })
}
