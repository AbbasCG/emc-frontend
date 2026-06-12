import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Filter, Search } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import type { ImpactActivityCategory, ImpactActivityRow } from '@/data/impactDashboard'
import { impactActivities } from '@/data/impactDashboard'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const categories: readonly (ImpactActivityCategory | 'الكل')[] = ['الكل', 'ورشة', 'دورة', 'جلسة', 'ملتقى'] as const

function formatArabicDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('ar', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

const catTone: Record<ImpactActivityCategory, string> = {
  ورشة: 'bg-customOrange/14 text-deepBlue ring-customOrange/30',
  دورة: 'bg-customBlue/12 text-deepBlue ring-customBlue/25',
  جلسة: 'bg-deepBlue/12 text-deepBlue ring-deepBlue/20',
  ملتقى: 'bg-accent-50 text-deepBlue ring-customOrange/35',
}

export default function ImpactActivitiesSection() {
  const [category, setCategory] = useState<(typeof categories)[number]>('الكل')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim()
    return impactActivities.filter((row: ImpactActivityRow) => {
      if (category !== 'الكل' && row.category !== category) return false
      if (!q) return true
      const hay = `${row.titleAr} ${row.trainerAr} ${row.category}`
      return hay.includes(q)
    })
  }, [category, query])

  return (
    <section className="py-16 lg:py-20" dir="rtl">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader
          align="right"
          eyebrow="سجل المراجعة"
          title="كل الأنشطة الموثقة"
          description="قائمة تفاعلية لأبرز الأنشطة المنفّذة—يمكن ضبطها لاحقاً من واجهة الإدارة عند ربط الـ API."
        />

        <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-deepBlue/[0.085] bg-white/[0.9] p-5 shadow-md ring-1 ring-white backdrop-blur-md lg:flex-row-reverse lg:flex-wrap lg:items-center lg:justify-between lg:gap-5 lg:p-6">
          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-start">
            <span className="inline-flex items-center gap-2 text-xs font-black text-deepBlue/65">
              <Filter size={16} className="text-customOrange" aria-hidden />
              التصنيف
            </span>
            <div className="flex flex-wrap justify-end gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={[
                    'rounded-xl border px-3.5 py-2 text-[12px] font-black transition',
                    category === c
                      ? 'border-customBlue/45 bg-customBlue/[0.12] text-deepBlue shadow-inner'
                      : 'border-deepBlue/[0.08] bg-emcBg/80 text-deepBlue hover:border-customBlue/25',
                  ].join(' ')}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-[1.125rem] -translate-y-1/2 text-deepBlue/35" aria-hidden />
            <input
              dir="rtl"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بعنوان النشاط أو الاسم أو التصنيف…"
              className="w-full rounded-2xl border border-deepBlue/[0.1] bg-white py-3 pe-11 ps-4 text-sm font-semibold text-deepBlue shadow-inner placeholder:text-deepBlue/40 focus:border-customBlue/45 focus:outline-none focus:ring-2 focus:ring-customBlue/15"
            />
          </div>
        </div>

        {/* Desktop */}
        <div className="mt-8 hidden overflow-x-auto overflow-y-hidden rounded-2xl border border-deepBlue/[0.072] shadow-sm md:block">
          <table className="w-full min-w-[640px] border-collapse text-right text-sm">
            <thead>
              <tr className="bg-gradient-to-l from-deepBlue/[0.04] via-white to-emcBg/80">
                <th className="px-4 py-3 font-black text-deepBlue">التصنيف</th>
                <th className="px-4 py-3 font-black text-deepBlue">النشاط</th>
                <th className="px-4 py-3 font-black text-deepBlue">المُنشِّط</th>
                <th className="px-4 py-3 font-black text-deepBlue">التاريخ</th>
                <th className="px-4 py-3 font-black text-deepBlue">الحضور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-deepBlue/[0.06] bg-white/[0.85]">
              {filtered.map((row) => (
                <motion.tr key={row.id} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} className="hover:bg-brand-50/[0.45]">
                  <td className="px-4 py-2.5 align-middle">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${catTone[row.category]}`}>{row.category}</span>
                  </td>
                  <td className="max-w-[14rem] px-4 py-2.5 text-sm font-bold leading-snug text-deepBlue">{row.titleAr}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm font-semibold text-foreground/75">{row.trainerAr}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm font-semibold text-foreground/70">{formatArabicDate(row.dateISO)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm font-black tabular-nums text-customBlue">{new Intl.NumberFormat('ar').format(row.attendance)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <motion.ul
          className="mt-6 space-y-3 md:hidden"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {filtered.map((row) => (
            <motion.li
              key={row.id}
              variants={staggerItem}
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-deepBlue/[0.08] bg-white/[0.95] p-4 text-right shadow-sm backdrop-blur"
            >
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${catTone[row.category]}`}>{row.category}</span>
              <p className="mt-3 text-base font-black leading-snug text-deepBlue">{row.titleAr}</p>
              <div className="mt-3 space-y-1 text-sm font-semibold text-foreground/72">
                <p>المُنشِّط: {row.trainerAr}</p>
                <p>التاريخ: {formatArabicDate(row.dateISO)}</p>
                <p className="text-customBlue">{new Intl.NumberFormat('ar').format(row.attendance)} حضور</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>

        {filtered.length === 0 ? <p className="mt-8 text-center text-sm font-bold text-foreground/50">لا توجد نتائج مطابقة.</p> : null}
      </div>
    </section>
  )
}
