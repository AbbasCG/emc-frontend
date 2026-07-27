import { createElement } from 'react'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import type { Department, TeamMember } from '@/services/teamApi'
import { resolveDepartmentIcon } from '@/components/team/teamIcons'
import TeamMemberCard from '@/components/team/TeamMemberCard'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const EXEC_SLUG = 'executive-leadership'

type Props = {
  department: Department
}

/** Arabic-correct member count: 0/1/2 have dedicated forms, 3-10 plural, 11+ singular accusative. */
function formatMemberCount(count: number): string {
  if (count === 0) return 'لا أعضاء'
  if (count === 1) return 'عضو واحد'
  if (count === 2) return 'عضوان'
  if (count <= 10) return `${count} أعضاء`
  return `${count} عضواً`
}

function partitionMembers(members: TeamMember[]) {
  const leaders = members.filter((m) => m.is_leader)
  const others = members.filter((m) => !m.is_leader)
  return { leaders, others }
}

export default function DepartmentSection({ department }: Props) {
  if (department.slug === EXEC_SLUG) return null

  const { leaders, others } = partitionMembers([...department.members])
  const ordered = [...leaders, ...others]

  return (
    <motion.section
      layout
      className="mb-14 scroll-mt-[6.75rem]"
      dir="rtl"
      id={`dept-${department.slug}`}
    >
      <div className="relative overflow-hidden rounded-[1.75rem] border border-deepBlue/[0.07] bg-gradient-to-bl from-brand-50/95 via-white to-white p-7 shadow-emc-lg ring-1 ring-white sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -left-28 top-0 h-72 w-72 rounded-full bg-customBlue/[0.07] blur-3xl" />
        <div className="relative flex flex-col gap-8 text-right lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-3 rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-emc-xs backdrop-blur-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-deepBlue/[0.04] text-customBlue ring-1 ring-deepBlue/[0.06]">
                {createElement(resolveDepartmentIcon(department.icon), { size: 24, strokeWidth: 2.1, 'aria-hidden': true })}
              </span>
              <h2 className="font-display text-xl font-black tracking-tight text-deepBlue sm:text-2xl">{department.name_ar}</h2>
              <span className="rounded-lg bg-deepBlue/[0.05] px-2.5 py-1 text-xs font-bold text-foreground/55">
                {formatMemberCount(department.members.length)}
              </span>
            </div>
            <p className="mt-6 text-[1.03rem] font-medium leading-8 text-foreground/73">{department.description_ar}</p>
          </div>
        </div>

        {department.members.length === 0 ? (
          <div className="relative mt-8 flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-customBlue/[0.06] ring-1 ring-customBlue/10">
              <Users size={22} strokeWidth={1.75} className="text-customBlue/60" aria-hidden />
            </span>
            <p className="text-sm font-semibold leading-7 text-foreground/55">
              سنعرض أعضاء هذا القسم هنا فور نشر بطاقاتهم.
            </p>
          </div>
        ) : (
          <motion.div
            className="relative mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            {ordered.map((member, idx) => (
              <motion.div key={member.id} variants={staggerItem} className="h-full">
                <TeamMemberCard
                  member={member}
                  departmentBadge={department.name_ar}
                  featured={idx === 0 && leaders.length > 0}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.section>
  )
}
