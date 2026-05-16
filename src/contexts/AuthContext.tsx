import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '../api/authApi'
import type { User } from '../types'
import { normalizeAuthUser } from '../utils/userIdentity'

export const TOKEN_KEY = 'emc_token'
export const USER_KEY = 'emc_user'

interface RegisterAccountInput {
  name: string
  email: string
  password: string
  password_confirmation: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ user: User; token: string }>
  registerAccount: (input: RegisterAccountInput) => Promise<{ user: User; token: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)

    if (!storedToken) {
      setIsLoading(false)
      return
    }

    setToken(storedToken)

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
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    const cached = localStorage.getItem(USER_KEY)
    if (cached) {
      try {
        setUser(normalizeAuthUser(JSON.parse(cached) as unknown))
      } catch {
        localStorage.removeItem(USER_KEY)
      }
    }

    hydrate()
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
    return payload
  }

  async function registerAccount(input: RegisterAccountInput) {
    const payload = await authApi.registerAccount(input)
    const { token: newToken, user: newUser } = payload
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    return payload
  }

  function logout() {
    void (async () => {
      try {
        await authApi.logoutRemote()
      } catch {
        // Always clear locally even if backend is unreachable / session already expired.
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
      window.location.assign('/login')
    })()
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
