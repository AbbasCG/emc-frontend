import { useMemo, useState } from 'react'
import { useLocation } from 'react-router'
import { FinanceCommandCenter } from '@/components/finance/command-center'
import { useAuth } from '@/contexts/AuthContext'
import { financeSectionBase } from '@/utils/financeNav'
import { getUserDisplayName, getUserRoleLabel } from '@/utils/userIdentity'

export default function FinanceDashboardPage() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const financeBase = financeSectionBase(pathname)

  const [range, setRange] = useState(() => {
    const y = new Date().getFullYear()
    return { from: `${y}-01-01`, to: `${y}-12-31` }
  })

  const displayName = useMemo(() => getUserDisplayName(user) || 'زائر', [user])
  const roleLabel = useMemo(() => getUserRoleLabel(user) || 'مدير المالية', [user])

  return (
    <FinanceCommandCenter
      displayName={displayName}
      roleLabel={roleLabel}
      financeBase={financeBase}
      range={range}
      onRangeChange={setRange}
    />
  )
}
