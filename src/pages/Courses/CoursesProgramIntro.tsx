import { motion } from 'framer-motion'
import { BookOpen, Layers, Sparkles } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { fadeUp } from '@/utils/motion'

const categories = [
  { label: 'ذكاء اصطناعي وتقنية', hint: 'مسارات رقمية وتطبيقية' },
  { label: 'لغات', hint: 'مهارات تواصل أكاديمية ومهنية' },
  { label: 'أعمال', hint: 'مهارات مهنية وريادية' },
  { label: 'أكاديمي', hint: 'تخطيط وقبول ومسار دراسي' },
  { label: 'تطوير شخصي', hint: 'وعي ومهارات ناعمة' },
]

export default function CoursesProgramIntro() {
  return (
    <section className="bg-[#f4f7fb] py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          title="فئات البرامج"
          description="تساعدك الفئات على تصفية الكتالوج بسرعة — مع بقاء البحث والفرز متاحين في الشريط أعلاه."
        />

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="grid gap-4 lg:grid-cols-3"
        >
          <div className="rounded-3xl bg-white p-7 text-right shadow-md ring-1 ring-slate-100">
            <Layers className="text-customBlue" size={28} />
            <h3 className="mt-4 text-lg font-black text-deepBlue">دورات وورش ومسارات</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              تجمع الصفحة بين ورش قصيرة ودورات أطول ومسارات تعلم مترابطة — حسب توفرها في
              الكتالوج الحالي من الـ API.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-7 text-right shadow-md ring-1 ring-slate-100">
            <BookOpen className="text-customOrange" size={28} />
            <h3 className="mt-4 text-lg font-black text-deepBlue">محاذاة مع مجالات EMC</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              اطلع على صفحة المجالات الاثنا عشر لفهم كيف تتكامل البرامج مع منظومة EMC الأوسع.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-7 text-right shadow-md ring-1 ring-slate-100">
            <Sparkles className="text-customBlue" size={28} />
            <h3 className="mt-4 text-lg font-black text-deepBlue">فئات سريعة</h3>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
              {categories.map((c) => (
                <li key={c.label}>
                  <span className="text-deepBlue">{c.label}</span> — {c.hint}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
