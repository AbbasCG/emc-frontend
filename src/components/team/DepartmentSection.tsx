import { createElement } from 'react'
import { motion } from 'framer-motion'
import type { Department, TeamMember } from '@/services/teamApi'
import { resolveDepartmentIcon } from '@/components/team/teamIcons'
import TeamMemberCard from '@/components/team/TeamMemberCard'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const EXEC_SLUG = 'executive-leadership'

type Props = {
  department: Department
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
              <h2 className="text-xl font-black text-deepBlue sm:text-2xl">{department.name_ar}</h2>
            </div>
            <p className="mt-6 text-[1.03rem] font-medium leading-8 text-foreground/73">{department.description_ar}</p>
          </div>
        </div>

        {department.members.length === 0 ? (
          <p className="relative mt-8 text-center text-sm font-semibold text-foreground/50">
            لا توجد بطاقات أعضاء في هذا القسم بعد.
          </p>
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
