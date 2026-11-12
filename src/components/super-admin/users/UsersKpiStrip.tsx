import { MailCheck, ShieldCheck, UserX, Users } from 'lucide-react'
import { EnterpriseMetricTile } from '@/pages/super-admin/crud/shared/enterprise'

type Props = {
  total: number
  active: number
  inactive: number
  verified: number
  unverified: number
  serverPaginated: boolean
  loading?: boolean
  statusFilter?: 'all' | 'active' | 'inactive' | 'deleted'
  verifiedFilter?: 'all' | 'verified' | 'unverified'
  onSelectStatus?: (status: 'all' | 'active' | 'inactive') => void
  onSelectVerified?: (verified: 'all' | 'verified') => void
}

export function UsersKpiStrip({
  total,
  active,
  inactive,
  verified,
  unverified,
  serverPaginated,
  loading,
  statusFilter,
  verifiedFilter,
  onSelectStatus,
  onSelectVerified,
}: Props) {
  const hint = serverPaginated ? 'إحصائيات من الخادم · اضغط للكل' : 'إحصائيات محلية · اضغط للكل'
  const isAllActive = statusFilter === 'all' && (verifiedFilter === 'all' || !verifiedFilter)

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <EnterpriseMetricTile
        accent="blue"
        icon={Users}
        label="إجمالي المستخدمين"
        value={total}
        hint={hint}
        loading={loading}
        onClick={
          onSelectStatus
            ? () => {
                onSelectStatus('all')
                onSelectVerified?.('all')
              }
            : undefined
        }
        active={isAllActive}
      />
      <EnterpriseMetricTile
        accent="mint"
        icon={ShieldCheck}
        label="حسابات نشطة"
        value={active}
        deltaLabel={inactive > 0 ? `${inactive} موقوف` : undefined}
        hint="اضغط لتصفية النشطين"
        loading={loading}
        onClick={onSelectStatus ? () => onSelectStatus(statusFilter === 'active' ? 'all' : 'active') : undefined}
        active={statusFilter === 'active'}
      />
      <EnterpriseMetricTile
        accent="orange"
        icon={UserX}
        label="حسابات موقوفة"
        value={inactive}
        hint={active > 0 ? `${active} نشط · اضغط للموقوفين` : 'اضغط للموقوفين'}
        loading={loading}
        onClick={onSelectStatus ? () => onSelectStatus(statusFilter === 'inactive' ? 'all' : 'inactive') : undefined}
        active={statusFilter === 'inactive'}
      />
      <EnterpriseMetricTile
        accent="navy"
        icon={MailCheck}
        label="بريد موثّق"
        value={verified}
        hint={`${unverified} غير موثّق · اضغط للتصفية`}
        loading={loading}
        onClick={onSelectVerified ? () => onSelectVerified(verifiedFilter === 'verified' ? 'all' : 'verified') : undefined}
        active={verifiedFilter === 'verified'}
      />
    </div>
  )
}
