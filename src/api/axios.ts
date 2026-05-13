import axios from 'axios'
import { toast } from 'sonner'
import { getApiErrorMessage } from './apiErrors'

// Storage keys — must stay in sync with TOKEN_KEY in AuthContext.tsx
const TOKEN_KEY = 'emc_token'
const USER_KEY = 'emc_user'

const apiClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ??
    import.meta.env.VITE_API_BASE_URL ??
    'http://127.0.0.1:8000/api',
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

    // 401: clear session except during login/register attempts
    if (status === 401 && !isAuthAttempt) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)

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

    // Global toast (Arabic) — skip for auth forms & silent requests
    if (!skipToast && status !== 401 && !isAuthAttempt) {
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
