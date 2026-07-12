import type { ElementType } from 'react'
import { Activity, Calendar, Clock, ShieldCheck, Users, Zap } from 'lucide-react'
import type { AdminAuditLogStats } from '@/types/adminAudit'
import { formatEnglishCount } from '@/utils/formatEnglishNumber'

function KpiCard({
  label, value, icon: Icon, iconBg, iconColor, sub,
}: {
  label: string
  value: string
  icon: ElementType
  iconBg: string
  iconColor: string
  sub?: string
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-emc-xs ring-1 ring-slate-200/80 transition-shadow duration-200 hover:shadow-emc-sm">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={17} className={iconColor} />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-500">{label}</p>
      <p className="mt-1.5 font-latin text-[28px] font-black leading-none text-ink-500">{value}</p>
      {sub && <p className="mt-1 text-[11px] font-semibold text-muted-400">{sub}</p>}
    </div>
  )
}

export default function AuditLogsStats({ stats }: { stats: AdminAuditLogStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      <KpiCard label="إجمالي السجلات" value={formatEnglishCount(stats.total)} icon={Activity} iconBg="bg-brand-50" iconColor="text-brand-600" />
      <KpiCard label="اليوم" value={formatEnglishCount(stats.today)} icon={Zap} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
      <KpiCard label="هذا الأسبوع" value={formatEnglishCount(stats.this_week)} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" />
      <KpiCard label="هذا الشهر" value={formatEnglishCount(stats.this_month)} icon={Calendar} iconBg="bg-sky-50" iconColor="text-sky-600" />
      <KpiCard label="مستخدمون فريدون" value={formatEnglishCount(stats.unique_users)} icon={Users} iconBg="bg-violet-50" iconColor="text-violet-600" />
      <KpiCard
        label="ناجح / فاشل"
        value={`${formatEnglishCount(stats.successful_operations)} / ${formatEnglishCount(stats.failed_operations)}`}
        icon={ShieldCheck}
        iconBg="bg-teal-50"
        iconColor="text-teal-600"
        sub={stats.top_entity ? `أعلى كيان: ${stats.top_entity}` : undefined}
      />
    </div>
  )
}
