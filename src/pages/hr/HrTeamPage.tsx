import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import EmptyState from '@/components/dashboard/EmptyState'
import LoadErrorState from '@/components/dashboard/LoadErrorState'
import { HrPageShell } from '@/components/hr/HrLayout'
import { useRetryableLoad } from '@/hooks/useRetryableLoad'
import { describeLoadError } from '@/lib/describeLoadError'
import { getTeam, resolveTeamMemberImage, type Department, type TeamMember } from '@/services/teamApi'

const FORBIDDEN_AR = 'لا تملك صلاحية عرض أعضاء الفريق. اطلب من مسؤول الوصول منحك الصلاحية المناسبة.'

export default function HrTeamPage() {
  const load = useRetryableLoad<Department[]>(getTeam, 'hr-team')
  const depts = load.data
  const loadError = load.error ? describeLoadError(load.cause, { forbiddenMessage: FORBIDDEN_AR }) : null

  function renderMember(m: TeamMember) {
    const src = resolveTeamMemberImage(m.image)
    return (
      <motion.li
        key={m.id}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3"
      >
        {src ?
          <img src={src} alt="" className="h-12 w-12 rounded-2xl object-cover shadow-sm" loading="lazy" />
        : <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-lg font-black text-brand-700">
            {m.name_ar.slice(0, 1)}
          </div>
        }
        <div className="min-w-0 flex-1 text-right">
          <p className="font-black text-deepBlue">{m.name_ar}</p>
          <p className="mt-1 text-[12px] font-semibold text-slate-600">{m.position_ar}</p>
        </div>
      </motion.li>
    )
  }

  if (load.loading) {
    return <div className="animate-pulse text-right opacity-70">يتم تحميل أعضاء الفريق...</div>
  }

  return (
    <HrPageShell
      title="أعضاء الفريق"
      description="عرض أعضاء فريق EMC حسب الوحدات المعروضة في دليل المنصّة العام."
    >
      {loadError ?
        <LoadErrorState error={loadError} onRetry={load.retry} />
      : !depts || depts.length === 0 ?
        <EmptyState icon={Users} title="لا توجد مجموعات ضمن دليل الفريق" />
      : <div className="grid gap-6">
          {depts.map((d) => (
            <section key={d.id} className="rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.9] p-6 shadow-emc ring-1 ring-deepBlue/[0.04]">
              <h2 className="border-b border-slate-100 pb-3 text-right text-lg font-black text-deepBlue">{d.name_ar}</h2>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">{d.members?.map(renderMember) ?? []}</ul>
            </section>
          ))}
        </div>
      }
    </HrPageShell>
  )
}
