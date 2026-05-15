import { motion } from 'framer-motion'
import type { Department } from '@/services/teamApi'
import { resolveDepartmentIcon } from '@/components/team/teamIcons'

const EXEC_SLUG = 'executive-leadership'

type Props = {
  executive: Department | null
  departments: Department[]
}

/** Visual hierarchy: executive node → connector → department nodes. Desktop-first / RTL-aware. */
export default function OrganizationChart({ executive, departments }: Props) {
  const deptNodes = departments.filter((d) => d.slug !== EXEC_SLUG)

  return (
    <section aria-labelledby="org-chart-heading" className="mb-20" dir="rtl">
      <h2 id="org-chart-heading" className="mb-12 text-center text-xl font-black text-deepBlue sm:text-2xl">
        مخطّط تنظيمي مبسّط
      </h2>

      <div className="relative mx-auto max-w-[980px]">
        {/* vertical spine */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-1/2 top-[3.75rem] h-[calc(100%-10rem)] w-px translate-x-1/2 bg-gradient-to-b from-customBlue/[0.22] via-deepBlue/15 to-transparent"
        />

        <div className="relative flex justify-center pb-14">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="relative z-10 text-center"
          >
            <div className="inline-flex flex-col items-center rounded-3xl border border-deepBlue/[0.08] bg-white px-8 py-7 shadow-emc-xl ring-1 ring-customBlue/[0.12] backdrop-blur-sm">
              <span className="rounded-full bg-gradient-to-l from-customBlue to-deepBlue px-4 py-1.5 text-[11px] font-black text-white shadow-emc-glow">
                الإدارة التنفيذية
              </span>
              <p className="mt-5 max-w-[20rem] text-base font-black leading-relaxed text-deepBlue">
                {executive?.name_ar ?? 'الإدارة العليا لـ EMC'}
              </p>
              <p className="mt-2 text-xs font-semibold leading-7 text-foreground/55">{executive?.members.length ?? 0} بطاقات منشورة</p>
            </div>
          </motion.div>
        </div>

        {/* horizontal junction */}
        <div
          aria-hidden
          className="relative mx-auto hidden h-px max-w-[min(85%,52rem)] bg-gradient-to-r from-transparent via-deepBlue/[0.2] to-transparent lg:block"
        />

        <ul className="relative z-10 mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {deptNodes.map((dept, i) => {
            const Icon = resolveDepartmentIcon(dept.icon)
            return (
              <motion.li
                key={dept.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ delay: i * 0.05, duration: 0.42 }}
                className="relative text-center before:absolute before:top-0 before:right-1/2 before:hidden before:h-8 before:w-px before:-translate-y-full before:bg-gradient-to-b before:from-transparent before:to-customBlue/25 before:xl:block"
              >
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById(`dept-${dept.slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className="w-full rounded-2xl border border-deepBlue/[0.06] bg-white px-4 py-5 text-center shadow-emc-md transition hover:border-customBlue/25 hover:shadow-emc-lg"
                >
                  <Icon className="mx-auto mb-4 text-customBlue" size={26} aria-hidden />
                  <span className="block text-sm font-black text-deepBlue">{dept.name_ar}</span>
                  <span className="mt-2 block text-xs font-semibold text-foreground/50">{dept.members.length} أعضاء</span>
                </button>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
