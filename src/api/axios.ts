import axios from 'axios'

// Storage keys — must stay in sync with TOKEN_KEY in AuthContext.tsx
const TOKEN_KEY = 'emc_token'
const USER_KEY = 'emc_user'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
  },
})

// ── Request interceptor ─────────────────────────────────────────────────────
// Reads the token from localStorage on every request so the header stays
// fresh even if the token was set after the axios instance was created.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor ────────────────────────────────────────────────────
// On 401, clear the stored session and redirect to /login.
// The login request itself is excluded to avoid an infinite redirect loop
// when the user submits wrong credentials.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url: string = error.config?.url ?? ''

    if (status === 401 && !url.includes('/login')) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      window.location.href = '/login'
    }

    return Promise.reject(error)
  },
)

export default apiClient
