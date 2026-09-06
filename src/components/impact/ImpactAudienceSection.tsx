import { motion } from 'framer-motion'
import { PieChart as PieChartIcon, UsersRound } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { impactAudienceRoles } from '@/data/impactDashboard'
import { fadeUp, staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

type RoleTone = (typeof impactAudienceRoles)[number]['tone']

const toneHex: Record<RoleTone, string> = {
  blue: '#0077B6',
  orange: '#F28C00',
  ink: '#0C2A4B',
  amber: '#E8A047',
}

const toneBg: Record<RoleTone, string> = {
  blue: 'bg-customBlue',
  orange: 'bg-customOrange',
  ink: 'bg-deepBlue',
  amber: 'bg-[#E8A047]',
}

function conicSegments() {
  let acc = 0
  return impactAudienceRoles
    .map((r) => {
      const start = acc
      acc += r.percent
      return `${toneHex[r.tone]} ${start}% ${acc}%`
    })
    .join(', ')
}

export default function ImpactAudienceSection() {
  const gradient = `conic-gradient(from 240deg at 50% 50%, ${conicSegments()})`

  return (
    <section className="border-y border-deepBlue/[0.06] bg-gradient-to-bl from-brand-50/40 via-white to-white py-16 lg:py-20" dir="rtl">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader
          align="right"
          eyebrow="الجمهور"
          title="جمهورنا الحقيقي"
          description="مزيج من المتعلّمين والمساهمين والمهتمّين؛ نسب تقريبيّة لمقارنة سريعة التفاصيل الكاملة في تقارير التشغيل."
        />

        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12 xl:gap-14">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.28 }}
            className="flex flex-col items-center lg:items-end"
          >
            <div className="relative flex h-[10.75rem] w-[10.75rem] shrink-0 items-center justify-center sm:h-[11.75rem] sm:w-[11.75rem]">
              <div
                className="absolute inset-0 rounded-full shadow-md ring-[5px] ring-white/98"
                style={{ backgroundImage: gradient }}
              />
              <div className="relative z-[1] flex h-[44%] w-[44%] items-center justify-center rounded-full bg-white shadow-inner ring-1 ring-deepBlue/[0.08]">
                <PieChartIcon className="size-7 text-customBlue/45 sm:size-8" aria-hidden />
              </div>
            </div>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-deepBlue/[0.08] bg-white/92 px-3 py-1.5 text-xs font-black text-deepBlue shadow-sm backdrop-blur">
              <UsersRound size={14} className="text-customOrange" aria-hidden />
              المشاركون حسب الدور
            </p>
          </motion.div>

          <motion.div
            className="space-y-5"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            <div className="overflow-hidden rounded-3xl border border-deepBlue/[0.07] bg-white/[0.82] shadow-sm backdrop-blur-md">
              <div className="flex h-3 w-full overflow-hidden">
                {impactAudienceRoles.map((r) => (
                  <div
                    key={r.roleAr}
                    className={`first:rounded-ss-3xl ${toneBg[r.tone]} hover:opacity-95`}
                    style={{ width: `${r.percent}%` }}
                    title={r.roleAr}
                  />
                ))}
              </div>
              <div className="px-5 py-5 text-right sm:px-6">
                <p className="text-xs font-black uppercase tracking-wider text-customBlue">ملخص المركبة</p>
                <div className="mt-4 flex flex-col gap-3">
                  {impactAudienceRoles.map((r) => (
                    <div key={r.roleAr} className="flex flex-wrap items-center justify-between gap-2 border-b border-deepBlue/[0.045] pb-3 text-sm last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: toneHex[r.tone] }}
                          aria-hidden
                        />
                        <span className="font-black text-deepBlue">{r.roleAr}</span>
                      </div>
                      <span className="tabular-nums text-base font-black text-deepBlue">
                        %{new Intl.NumberFormat('ar').format(r.percent)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <motion.div variants={staggerItem} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4 xl:gap-4">
              <div className="rounded-3xl border border-deepBlue/[0.07] bg-gradient-to-bl from-deepBlue/[0.03] to-white p-6 text-right shadow-sm backdrop-blur">
                <h3 className="text-sm font-black text-customBlue">الطلاب</h3>
                <p className="mt-2 text-sm leading-relaxed font-semibold text-foreground/72">
                  المسجّلون في مسارات نشطة وحضور منظّم.
                </p>
              </div>
              <div className="rounded-3xl border border-deepBlue/[0.07] bg-white/[0.9] p-6 text-right shadow-sm backdrop-blur">
                <h3 className="text-sm font-black text-deepBlue">الخريجون</h3>
                <p className="mt-2 text-sm leading-relaxed font-semibold text-foreground/72">
                  شركاء تأثير بعد الإتمام ومواكبة للفعاليات.
                </p>
              </div>
              <div className="rounded-3xl border border-deepBlue/[0.07] bg-gradient-to-br from-customOrange/[0.08] to-white p-6 text-right shadow-sm backdrop-blur">
                <h3 className="text-sm font-black text-customOrange">المتطوّعون</h3>
                <p className="mt-2 text-sm leading-relaxed font-semibold text-foreground/72">
                  مساهمة ميدانية وتنظيم وفق آليات EMC.
                </p>
              </div>
              <div className="rounded-3xl border border-deepBlue/[0.07] bg-white/[0.88] p-6 text-right shadow-sm backdrop-blur">
                <h3 className="text-sm font-black text-deepBlue/85">المهتمّون</h3>
                <p className="mt-2 text-sm leading-relaxed font-semibold text-foreground/72">
                  جمهور يتابع المحتوى ويطلب الانضمام لمراحل لاحقة.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
