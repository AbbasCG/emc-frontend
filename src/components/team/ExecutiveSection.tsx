import { createElement } from 'react'
import { motion } from 'framer-motion'
import type { Department } from '@/services/teamApi'
import { resolveDepartmentIcon } from '@/components/team/teamIcons'
import TeamMemberCard from '@/components/team/TeamMemberCard'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const EXEC_SLUG = 'executive-leadership'

type Props = { department: Department | null }

/** Premium layout for الإدارة العليا (`executive-leadership`). */
export default function ExecutiveSection({ department }: Props) {
  if (!department || department.slug !== EXEC_SLUG) return null

  const members = [...department.members].sort((a, b) => Number(b.is_executive) - Number(a.is_executive))

  return (
    <section aria-labelledby="exec-heading" className="mb-20 lg:mb-28" dir="rtl">
      <div className="mx-auto mb-12 max-w-[1540px] text-right">
        <div className="mb-6 flex flex-wrap items-center justify-start gap-4">
          <span className="inline-flex items-center gap-2 rounded-xl border border-deepBlue/[0.08] bg-white px-4 py-2 shadow-emc-sm ring-1 ring-customBlue/15">
            {createElement(resolveDepartmentIcon(department.icon), { className: 'text-customOrange', size: 22, strokeWidth: 2, 'aria-hidden': true })}
            <span className="text-sm font-black text-deepBlue">{department.name_ar}</span>
          </span>
          <span className="rounded-xl border border-customOrange/35 bg-accent-50/80 px-3 py-1.5 text-[11px] font-black text-deepBlue ring-1 ring-customOrange/20">
            هيئة EMC V3 الإدارية
          </span>
        </div>
        <h2 id="exec-heading" className="emc-title-arc font-display text-3xl font-black tracking-tight text-deepBlue sm:text-4xl xl:text-[2.6rem]">
          القيادة التنفيذية
        </h2>
        <p className="mt-4 max-w-3xl text-[1.02rem] font-medium leading-8 text-foreground/73">{department.description_ar}</p>
      </div>

      {members.length === 0 ? (
        <p className="text-center text-sm font-semibold text-foreground/55">لم يتم نشر بطاقات أعضاء هذا القسم بعد.</p>
      ) : (
        <motion.div
          className="mx-auto grid max-w-[1540px] grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {members.map((m) => (
            <motion.div key={m.id} variants={staggerItem} className="h-full">
              <TeamMemberCard member={m} departmentBadge={department.name_ar} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  )
}
