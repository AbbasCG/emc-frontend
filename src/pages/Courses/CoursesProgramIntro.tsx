import { memo } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Layers, Sparkles } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { fadeUp } from '@/utils/motion'

export type DerivedCategory = { label: string; count: number }

type Props = {
  derivedCategories: DerivedCategory[]
  loading: boolean
}

// Calm, two-family rotation — sea tints + a single ember tint, never the rainbow.
const palette = [
  'from-brand-500/10 to-brand-600/4 border-brand-200/60',
  'from-accent-500/10 to-accent-600/4 border-accent-200/50',
  'from-ocean/10 to-ocean/4 border-brand-200/50',
]

function CoursesProgramIntro({ derivedCategories, loading }: Props) {
  return (
    <section className="bg-gradient-to-b from-[#f0f5fb] to-white py-10 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          title="فئات البرامج"
          description="تعرض الخانات أدناه توزيعاً حقيقياً مستخرجاً من كتالوج الدورات الحالي — مع شرح سريع لطريقة التصفية."
        />

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 'some', margin: '0px 0px -96px 0px' }}
          transition={{ duration: 0.5 }}
          className="mb-8 grid gap-4 lg:grid-cols-3"
        >
          <div className="rounded-3xl border border-line bg-white p-7 text-right">
            <Layers className="text-brand-500" size={28} />
            <h3 className="mt-4 font-display text-lg font-black tracking-tight text-deepBlue">دورات وورش ومسارات</h3>
            <p className="mt-2 text-sm leading-7 text-muted-600">
              تجمع الصفحة بين ورش قصيرة ودورات أطول ومسارات تعلم مترابطة — حسب توفرها في الكتالوج الحالي من الخادم.
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-white p-7 text-right">
            <BookOpen className="text-accent-500" size={28} />
            <h3 className="mt-4 font-display text-lg font-black tracking-tight text-deepBlue">محاذاة مع مجالات EMC</h3>
            <p className="mt-2 text-sm leading-7 text-muted-600">
              اطلع على صفحة المجالات الاثنا عشر لفهم كيف تتكامل البرامج مع منظومة EMC الأوسع.
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-white p-7 text-right">
            <Sparkles className="text-brand-500" size={28} />
            <h3 className="mt-4 font-display text-lg font-black tracking-tight text-deepBlue">تصفية ذكية</h3>
            <p className="mt-2 text-sm leading-7 text-muted-600">
              استخدم الشريط اللاصق أعلاه للمزج بين السعر، نمط التقديم، المستوى، ونوع البرنامج — كلها مبنية على بياناتك
              الفعلية.
            </p>
          </div>
        </motion.div>

        {!loading && derivedCategories.length === 0 ? (
          <p className="text-center text-sm text-muted-500">
            عند توفر دورات في الكتالوج، ستظهر هنا بطاقات بنيوية تعرض أكثر المسارات والأقسام نشاطاً.
          </p>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-3xl border border-slate-100 bg-slate-100/80"
                  />
                ))
              : derivedCategories.map((c, i) => (
                  <div
                    key={`${c.label}-${i}`}
                    className={`flex items-center justify-between gap-3 rounded-3xl border bg-gradient-to-br p-5 text-right ${palette[i % palette.length]}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-deepBlue">{c.label}</p>
                      <p className="mt-1 text-xs text-muted-500">برنامج في هذه الفئة</p>
                    </div>
                    <div className="flex h-12 min-w-[3rem] shrink-0 items-center justify-center rounded-2xl bg-white/90 px-3 text-lg font-black tabular-nums text-deepBlue">
                      {c.count.toLocaleString('ar-EG')}
                    </div>
                  </div>
                ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}

export default memo(CoursesProgramIntro)
