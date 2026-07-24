import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchMyFinancialContext, type MyFinancialContext } from '@/api/financialRequestsApi'
import { useAuth } from './AuthContext'

interface FinancialRequestContextValue {
  /** Backend-authoritative: user may submit a financial request for at least one department. */
  canCreate: boolean
  departments: MyFinancialContext['departments']
  primaryDepartment: MyFinancialContext['primary_department']
  isSuperAdmin: boolean
  isLoading: boolean
}

const FinancialRequestContext = createContext<FinancialRequestContextValue>({
  canCreate: false,
  departments: [],
  primaryDepartment: null,
  isSuperAdmin: false,
  isLoading: true,
})

/**
 * Loads GET /api/financial-requests/my-context once per authenticated session.
 * Re-fetches when user.id changes (login, logout, impersonation).
 * Never duplicates business logic — canCreate is the backend's decision.
 */
export function FinancialRequestProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  /** Identity of the session whose context is loaded — `null` when signed out. */
  const sessionId = isAuthenticated ? (user?.id ?? null) : null

  const [data, setData] = useState<MyFinancialContext | null>(null)
  const [isLoading, setIsLoading] = useState(sessionId !== null)

  // Re-arm for a new session (login, logout, impersonation) during render — react.dev
  // "adjusting state when a prop changes" — so consumers never read the previous
  // user's permissions for a frame.
  const [seenSession, setSeenSession] = useState(sessionId)
  if (seenSession !== sessionId) {
    setSeenSession(sessionId)
    setData(null)
    setIsLoading(sessionId !== null)
  }

  useEffect(() => {
    if (sessionId === null) return

    let cancelled = false

    fetchMyFinancialContext()
      .then((ctx) => {
        if (!cancelled) setData(ctx)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sessionId])

  return (
    <FinancialRequestContext.Provider
      value={{
        canCreate: data?.can_create ?? false,
        departments: data?.departments ?? [],
        primaryDepartment: data?.primary_department ?? null,
        isSuperAdmin: data?.is_super_admin ?? false,
        isLoading,
      }}
    >
      {children}
    </FinancialRequestContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- paired hook for FinancialRequestProvider
export function useFinancialRequestContext(): FinancialRequestContextValue {
  return useContext(FinancialRequestContext)
}
