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
  const [data, setData] = useState<MyFinancialContext | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setData(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

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
  }, [user?.id, isAuthenticated])

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
