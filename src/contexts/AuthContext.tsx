import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import toast from '@/lib/toast'
import * as authApi from '../api/authApi'
import type { User } from '../types'
import {
  TOKEN_KEY,
  USER_KEY,
  clearImpersonationSessionMarks,
  readCurrentAuthBackupFromLocal,
  readStoredImpersonationOriginal,
  writeImpersonationSessionBackup,
} from '@/lib/impersonationSession'
import { normalizeAuthLoginPayload, normalizeAuthUser } from '../utils/userIdentity'

export { TOKEN_KEY, USER_KEY } from '@/lib/impersonationSession'

interface RegisterAccountInput {
  name: string
  email: string
  password: string
  password_confirmation: string
  country_code: string
  phone_country_code: string
  phone: string
  city: string
  gender: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ user: User; token: string }>
  registerAccount: (input: RegisterAccountInput) => Promise<{ user: User; token: string }>
  logout: () => void
  /** True when JWT represents a target user previewed by super_admin (session markers present). */
  isImpersonating: boolean
  /** Super-admin profile stored before impersonation snapshot — never the impersonated user. */
  impersonationOriginalUser: User | null
  startImpersonationPreview: (targetUserId: number) => Promise<void>
  stopImpersonationPreview: () => Promise<void>
  /** Re-fetch `/auth/me` after profile / avatar changes. Returns null if probe fails while session persists. */
  refreshUser: () => Promise<User | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Cached `/auth/me` payload from a previous session — only trusted while a token is
 * present, and refreshed by `hydrate()` on mount. A malformed entry is dropped.
 */
function readCachedUser(): User | null {
  if (!localStorage.getItem(TOKEN_KEY)) return null
  const cached = localStorage.getItem(USER_KEY)
  if (!cached) return null
  try {
    return normalizeAuthUser(JSON.parse(cached) as unknown)
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Session bootstrap reads localStorage in lazy initialisers rather than from the
  // mount effect: the first render already reflects the stored session, so there is
  // no logged-out frame to flash and no cascading re-render.
  const [user, setUser] = useState<User | null>(readCachedUser)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [isLoading, setIsLoading] = useState(() => localStorage.getItem(TOKEN_KEY) != null)
  const [impersonationOriginalUser, setImpersonationOriginalUser] = useState<User | null>(
    () => readStoredImpersonationOriginal()?.originalUser ?? null,
  )

  const isImpersonating = impersonationOriginalUser != null

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return

    let cancelled = false

    async function hydrate() {
      try {
        const freshUser = await authApi.fetchMe()
        if (cancelled) return
        setUser(freshUser)
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser))
      } catch {
        if (cancelled) return
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
        clearImpersonationSessionMarks()
        setImpersonationOriginalUser(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  async function login(email: string, password: string) {
    const payload = await authApi.login(email, password)
    const { token: newToken, user: newUser } = payload
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    clearImpersonationSessionMarks()
    setImpersonationOriginalUser(null)
    return payload
  }

  async function registerAccount(input: RegisterAccountInput) {
    const payload = await authApi.registerAccount(input)
    const { token: newToken, user: newUser } = payload
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    clearImpersonationSessionMarks()
    setImpersonationOriginalUser(null)
    return payload
  }

  function logout() {
    void (async () => {
      try {
        await authApi.logoutRemote()
      } catch {
        /* always clear locally */
      }
      try {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      } catch {
        /* ignore */
      }
      try {
        sessionStorage.clear()
      } catch {
        /* ignore */
      }
      setToken(null)
      setUser(null)
      clearImpersonationSessionMarks()
      setImpersonationOriginalUser(null)
      window.location.assign('/login')
    })()
  }

  async function startImpersonationPreview(targetUserId: number) {
    if (readStoredImpersonationOriginal()) {
      toast.warning('وضع معاينة نشط بالفعل. أنِهِ الحالي قبل البدء بآخر.')
      throw new Error('already_impersonating')
    }

    const cur = readCurrentAuthBackupFromLocal()
    if (!cur?.token || !cur.user) {
      toast.error('تعذر قراءة الجلسة الحالية.')
      throw new Error('missing_session')
    }

    writeImpersonationSessionBackup(cur.token, cur.user)
    setImpersonationOriginalUser(cur.user)

    try {
      const raw = await authApi.postImpersonateUser(targetUserId)
      const { token: nextToken, user: nextUser } = normalizeAuthLoginPayload(raw)

      if (!nextToken.trim()) {
        throw new Error('missing_impersonation_token')
      }

      localStorage.setItem(TOKEN_KEY, nextToken)
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
      setToken(nextToken)
      setUser(nextUser)

      toast.success(`تم بدء المعاينة — عرض المنصّة كـ ${nextUser.name || 'مستخدم مستهدَف'}.`)
    } catch (e) {
      clearImpersonationSessionMarks()
      setImpersonationOriginalUser(null)
      throw e
    }
  }

  async function stopImpersonationPreview() {
    const fallback = readStoredImpersonationOriginal()

    try {
      const raw = await authApi.postImpersonateStop()
      try {
        const { token: restoredToken, user: restoredUser } = normalizeAuthLoginPayload(raw)
        if (restoredToken.trim()) {
          localStorage.setItem(TOKEN_KEY, restoredToken)
          localStorage.setItem(USER_KEY, JSON.stringify(restoredUser))
          setToken(restoredToken)
          setUser(restoredUser)
          clearImpersonationSessionMarks()
          setImpersonationOriginalUser(null)
          return
        }
      } catch {
        /* fall through — restore fallback */
      }
    } catch {
      /* fallback below */
    }

    if (fallback?.originalToken && fallback.originalUser?.id) {
      localStorage.setItem(TOKEN_KEY, fallback.originalToken)
      localStorage.setItem(USER_KEY, JSON.stringify(fallback.originalUser))
      setToken(fallback.originalToken)
      setUser(fallback.originalUser)
      clearImpersonationSessionMarks()
      setImpersonationOriginalUser(null)
      return
    }

    clearImpersonationSessionMarks()
    setImpersonationOriginalUser(null)
    throw new Error('stop_impersonation_failed')
  }

  async function refreshUser() {
    try {
      const fresh = await authApi.fetchMe()
      setUser(fresh)
      localStorage.setItem(USER_KEY, JSON.stringify(fresh))
      return fresh
    } catch {
      try {
        const cached = localStorage.getItem(USER_KEY)
        if (!cached) return null
        return normalizeAuthUser(JSON.parse(cached) as unknown)
      } catch {
        return null
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        registerAccount,
        logout,
        isImpersonating,
        impersonationOriginalUser,
        startImpersonationPreview,
        stopImpersonationPreview,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Provider + hook must share one module; Fast Refresh wants components-only exports.
// eslint-disable-next-line react-refresh/only-export-components -- paired hook for AuthProvider
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
