import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import EmptyState from '@/components/dashboard/EmptyState'
import { HrPageShell } from '@/components/hr/HrLayout'
import { getTeam, resolveTeamMemberImage, type Department, type TeamMember } from '@/services/teamApi'

export default function HrTeamPage() {
  const [depts, setDepts] = useState<Department[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        const d = await getTeam()
        if (!c) setDepts(d)
      } catch {
        if (!c) setDepts(null)
      } finally {
        if (!c) setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [])

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

  if (loading) {
    return <div className="animate-pulse text-right opacity-70">يتم تحميل أعضاء الفريق...</div>
  }

  return (
    <HrPageShell
      title="أعضاء الفريق"
      description="عرض أعضاء فريق EMC حسب الوحدات المعروضة في دليل المنصّة العام."
    >
      {depts == null ?
        <p className="rounded-3xl bg-amber-50 px-6 py-8 text-center text-sm font-bold text-amber-900 ring-1 ring-amber-100">
          لم يتم ربط هذا القسم بالبيانات بعد
        </p>
      : depts.length === 0 ?
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
