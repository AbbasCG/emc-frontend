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
}

export function UsersKpiStrip({
  total,
  active,
  inactive,
  verified,
  unverified,
  serverPaginated,
  loading,
}: Props) {
  const hint = serverPaginated ? 'إحصائيات من الخادم' : 'إحصائيات محلية للنتائج المفلترة'

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <EnterpriseMetricTile
        accent="blue"
        icon={Users}
        label="إجمالي المستخدمين"
        value={total}
        hint={hint}
        loading={loading}
      />
      <EnterpriseMetricTile
        accent="mint"
        icon={ShieldCheck}
        label="حسابات نشطة"
        value={active}
        deltaLabel={inactive > 0 ? `${inactive} موقوف` : undefined}
        loading={loading}
      />
      <EnterpriseMetricTile
        accent="orange"
        icon={UserX}
        label="حسابات موقوفة"
        value={inactive}
        hint={active > 0 ? `${active} نشط حالياً` : undefined}
        loading={loading}
      />
      <EnterpriseMetricTile
        accent="navy"
        icon={MailCheck}
        label="بريد موثَّق"
        value={verified}
        hint={`${unverified} غير موثَّق`}
        loading={loading}
      />
    </div>
  )
}
