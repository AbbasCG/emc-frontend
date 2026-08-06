import axios from 'axios'
import toast from '@/lib/toast'
import { getApiErrorMessage } from './apiErrors'

// Storage keys — must stay in sync with `src/lib/impersonationSession.ts` (+ AuthContext exports).
const TOKEN_KEY = 'emc_token'
const USER_KEY = 'emc_user'
const IMPERSONATION_ACTIVE_KEY = 'emc_sa_impersonation_active'
const IMPERSONATION_ORIGINAL_TOKEN_KEY = 'emc_sa_original_token'
const IMPERSONATION_ORIGINAL_USER_KEY = 'emc_sa_original_user_json'

function clearAuthStorage(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  try {
    sessionStorage.removeItem(IMPERSONATION_ACTIVE_KEY)
    sessionStorage.removeItem(IMPERSONATION_ORIGINAL_TOKEN_KEY)
    sessionStorage.removeItem(IMPERSONATION_ORIGINAL_USER_KEY)
  } catch { /* ignore */ }
}

const apiBaseUrl = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL
if (!apiBaseUrl && !import.meta.env.DEV) {
  throw new Error('[EMC] VITE_API_URL is not set. Add it to your .env file.')
}

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
})

// ── Request interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor ────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status as number | undefined
    const url: string = error.config?.url ?? ''
    const skipToast = Boolean(error.config?.skipErrorToast)

    const msg = getApiErrorMessage(error)
    error.apiMessage = msg

    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register')

    const isSilentAuthProbe = url.includes('/auth/me')

    const pathOnly = url.split('?')[0] ?? ''
    const method = String(error.config?.method ?? 'get').toLowerCase()

    const isScopedCourseLmsPath =
      /^\/admin\/courses\/\d+(?:\/|$)/.test(pathOnly) ||
      /^\/instructor\/courses\/\d+(?:\/|$)/.test(pathOnly)
    if (isScopedCourseLmsPath && import.meta.env.DEV) {
      console.log('LMS API ERROR', error.config?.method, error.config?.url, error.response?.status, error.response?.data)
    }

    // 401: restore impersonation backup if active, otherwise clear session
    if (status === 401 && !isAuthAttempt) {
      const impersonating = sessionStorage.getItem(IMPERSONATION_ACTIVE_KEY) === '1'
      const originalToken = sessionStorage.getItem(IMPERSONATION_ORIGINAL_TOKEN_KEY)?.trim()
      const originalUser = sessionStorage.getItem(IMPERSONATION_ORIGINAL_USER_KEY)

      if (impersonating && originalToken) {
        localStorage.setItem(TOKEN_KEY, originalToken)
        if (originalUser) localStorage.setItem(USER_KEY, originalUser)
        try {
          sessionStorage.removeItem(IMPERSONATION_ACTIVE_KEY)
          sessionStorage.removeItem(IMPERSONATION_ORIGINAL_TOKEN_KEY)
          sessionStorage.removeItem(IMPERSONATION_ORIGINAL_USER_KEY)
        } catch { /* ignore */ }
        if (!isSilentAuthProbe) {
          window.location.href = '/login?reason=impersonation_expired'
        }
      } else {
        clearAuthStorage()
        const path = window.location.pathname
        const shouldHardRedirect =
          !isSilentAuthProbe &&
          !path.startsWith('/login') &&
          !path.startsWith('/signup') &&
          !path.startsWith('/register')
        if (shouldHardRedirect) {
          window.location.href = `/login?reason=session&next=${encodeURIComponent(path)}`
        }
      }
    }

    // 403: suspended account — clear session and redirect before toast
    if (status === 403 && !isAuthAttempt) {
      const responseMsg =
        (error.response?.data as { message?: string } | undefined)?.message ?? ''
      if (responseMsg === 'Account is suspended.' || responseMsg.toLowerCase().includes('suspended')) {
        clearAuthStorage()
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?reason=suspended'
        }
        return Promise.reject(error)
      }
    }

    // Global toast (Arabic) — skip forms, probes, silent flags, optional `/notifications*`, `/finance*` GET probes
    if (!skipToast && status !== 401 && !isAuthAttempt) {
      const silentFinanceGet =
        method === 'get' &&
        (status === 403 || status === 404) &&
        /^\/finance(\/|$)/i.test(pathOnly)
      if (silentFinanceGet) {
        return Promise.reject(error)
      }
      if ((status === 404 || status === 403) && /^\/notifications(\/|$)/.test(pathOnly)) {
        return Promise.reject(error)
      }
      if (status && status >= 500) {
        toast.error(msg)
      } else if (status === 403 || status === 404) {
        toast.warning(msg)
      } else if (status === 422 || status === 429) {
        toast.warning(msg)
      } else if (status && status >= 400) {
        toast.error(msg)
      } else if (!status) {
        toast.error(msg)
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient
