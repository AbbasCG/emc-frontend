import type { User } from '@/types'
import { normalizeAuthUser } from '@/utils/userIdentity'

/** Keep in sync with `AuthContext.tsx` / `axios` token storage. */
export const TOKEN_KEY = 'emc_token'
export const USER_KEY = 'emc_user'

export const IMPERSONATION_ACTIVE_KEY = 'emc_sa_impersonation_active'
export const IMPERSONATION_ORIGINAL_TOKEN_KEY = 'emc_sa_original_token'
export const IMPERSONATION_ORIGINAL_USER_KEY = 'emc_sa_original_user_json'

export function clearImpersonationSessionMarks(): void {
  try {
    sessionStorage.removeItem(IMPERSONATION_ACTIVE_KEY)
    sessionStorage.removeItem(IMPERSONATION_ORIGINAL_TOKEN_KEY)
    sessionStorage.removeItem(IMPERSONATION_ORIGINAL_USER_KEY)
  } catch {
    /* ignore */
  }
}

export function readStoredImpersonationOriginal(): {
  originalUser: User
  originalToken: string
} | null {
  try {
    if (sessionStorage.getItem(IMPERSONATION_ACTIVE_KEY) !== '1') return null
    const token = sessionStorage.getItem(IMPERSONATION_ORIGINAL_TOKEN_KEY)?.trim()
    const rawUser = sessionStorage.getItem(IMPERSONATION_ORIGINAL_USER_KEY)
    if (!token || !rawUser) return null
    const originalUser = normalizeAuthUser(JSON.parse(rawUser) as unknown)
    return { originalUser, originalToken: token }
  } catch {
    return null
  }
}

export function writeImpersonationSessionBackup(originalToken: string, originalUser: User): void {
  try {
    sessionStorage.setItem(IMPERSONATION_ACTIVE_KEY, '1')
    sessionStorage.setItem(IMPERSONATION_ORIGINAL_TOKEN_KEY, originalToken)
    sessionStorage.setItem(IMPERSONATION_ORIGINAL_USER_KEY, JSON.stringify(originalUser))
  } catch {
    /* ignore — impersonation UX degrades gracefully */
  }
}

/** Current token + user in localStorage — used immediately before impersonation swap. */
export function readCurrentAuthBackupFromLocal(): { token: string; user: User } | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY)?.trim()
    const raw = localStorage.getItem(USER_KEY)
    if (!token || !raw) return null
    return { token, user: normalizeAuthUser(JSON.parse(raw) as unknown) }
  } catch {
    return null
  }
}
