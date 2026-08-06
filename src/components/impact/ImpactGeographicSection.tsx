import { motion } from 'framer-motion'
import { Globe2, MapPinned } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { impactCountries, impactNetherlandsCities } from '@/data/impactDashboard'
import { fadeUp } from '@/utils/animations'

const maxNl = Math.max(...impactNetherlandsCities.map((c) => c.count))
const totalCountriesShown = impactCountries.reduce((s, c) => s + c.count, 0)
const maxCountryCount = Math.max(...impactCountries.map((c) => c.count), 0)

function bubbleDims(count: number) {
  const t = Math.sqrt(count / maxNl)
  return Math.round(24 + t * 22)
}

export default function ImpactGeographicSection() {
  const mapHeightClass = 'min-h-[14rem] max-h-[20rem] sm:max-h-[22rem] lg:max-h-none lg:min-h-0 lg:flex-1'

  return (
    <section className="border-y border-deepBlue/[0.06] bg-gradient-to-b from-white via-emcBg/55 to-emcBg py-16 lg:py-20" dir="rtl">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader
          align="right"
          eyebrow="التوزيع"
          title="من أين يأتي مشاركو EMC"
          description="تجربة بصرية مجرّبة للكثافة الهولندية مع قائمة دول العربية لتسهيل القراءة دون اعتماد مصدر خارجي للخرائط."
        />

        <div className="mt-10 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-5">
          {/* في RTL العمود الأول يظهر جهة اليمين — الخريطة 60% */}
          <motion.div
            className="flex min-h-0 flex-col lg:col-span-3 lg:h-full lg:max-h-[35rem]"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.22 }}
          >
            <div className="mb-4 flex flex-wrap items-center justify-start gap-2 text-right lg:justify-start">
              <MapPinned size={20} className="text-customBlue" aria-hidden />
              <h3 className="font-display text-lg font-black text-deepBlue md:text-xl">التجمعات داخل هولندا</h3>
            </div>
            <div
              dir="ltr"
              className={`relative isolate flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl border border-deepBlue/[0.075] bg-gradient-to-br from-[#e9f6fc] via-[#f4fafd] to-[#eaf1f9] shadow-sm shadow-deepBlue/[0.05] ring-1 ring-white ${mapHeightClass} aspect-[5/4] lg:aspect-auto`}
            >
              <svg className="absolute inset-3 max-h-[90%] w-auto opacity-[0.14]" viewBox="0 0 400 460" preserveAspectRatio="xMidYMid meet" aria-hidden>
                <path
                  fill="rgba(38,145,194,0.35)"
                  d="M205 72c35 8 55 42 92 62 28 15 72 26 71 74-3 92-134 218-258 246-76 18-86-132-72-216 14-93 167-171 167-166Z"
                  className=""
                />
                <path fill="rgba(34,51,74,0.12)" d="m120 300 140-40 50 140-260 55z" />
              </svg>
              <span className="absolute left-[10%] top-[8%] rounded-full bg-white/95 px-3 py-1 text-[11px] font-black text-deepBlue shadow-emc-sm ring-1 ring-customBlue/25">
                هولندا · نشاط حضوري
              </span>
              {impactNetherlandsCities.map((city, i) => {
                const dim = bubbleDims(city.count)
                return (
                  <motion.span
                    key={city.city}
                    initial={{ opacity: 0, scale: 0.86 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.04 * i, duration: 0.42 }}
                    className="absolute flex flex-col items-center justify-center rounded-full border border-white/95 bg-white/93 px-1.5 shadow-sm ring-1 ring-customBlue/12"
                    style={{
                      width: dim,
                      height: dim,
                      left: `${city.xPct}%`,
                      top: `${city.yPct}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <span className="tabular-nums text-xs font-black leading-none text-deepBlue sm:text-sm">{city.count}</span>
                    <span className="mt-px max-w-[3.75rem] text-center text-[7.5px] font-bold leading-tight tracking-tight text-foreground/55">
                      {city.city}
                    </span>
                  </motion.span>
                )
              })}
            </div>
          </motion.div>

          <motion.div
            className="flex min-h-0 flex-col lg:col-span-2 lg:h-full lg:max-h-[35rem]"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.22 }}
          >
            <div className="mb-4 flex flex-wrap items-center gap-2 text-right lg:flex-row-reverse lg:justify-end">
              <Globe2 size={20} className="shrink-0 text-customOrange" aria-hidden />
              <div>
                <h3 className="font-display text-lg font-black text-deepBlue md:text-xl">توزيع حسب الدولة</h3>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-foreground/65 sm:text-sm">
                  المجموع المعروض: {new Intl.NumberFormat('ar').format(totalCountriesShown)} نقطة مشاركة
                  موثّقة ضمن هذا العرض
                </p>
              </div>
            </div>
            <div className="flex min-h-[14rem] flex-1 flex-col overflow-hidden rounded-3xl border border-deepBlue/[0.07] bg-white/[0.92] shadow-sm backdrop-blur lg:min-h-0">
              <ul className="min-h-0 flex-1 divide-y divide-deepBlue/[0.055] overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4">
                {impactCountries.map((row, idx) => {
                  const barPct = maxCountryCount > 0 ? (row.count / maxCountryCount) * 100 : 0
                  return (
                    <motion.li
                      key={row.countryAr}
                      initial={{ opacity: 0, x: 14 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.15 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.24), duration: 0.38 }}
                      className="flex flex-wrap items-center justify-between gap-3 py-2.5 last:pb-0 first:pt-0"
                    >
                      <span className="text-sm font-black text-deepBlue">{row.countryAr}</span>
                      <span className="flex min-w-[10rem] max-w-[14rem] flex-1 items-center gap-3">
                        <span className="relative h-2.5 min-w-[5rem] flex-1 overflow-hidden rounded-full bg-deepBlue/[0.06] shadow-inner ring-1 ring-deepBlue/[0.04]">
                          <motion.span
                            className="absolute inset-y-0 right-0 block rounded-full bg-gradient-to-l from-deepBlue to-customBlue"
                            initial={{ width: '0%' }}
                            whileInView={{ width: `${barPct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
                          />
                        </span>
                        <span className="w-10 shrink-0 tabular-nums text-right text-sm font-black text-customBlue">
                          {row.count}
                        </span>
                      </span>
                    </motion.li>
                  )
                })}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
