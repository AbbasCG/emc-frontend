import { memo } from 'react'
import { motion } from 'framer-motion'
import { BadgePercent, Coins, Gift } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { fadeUp } from '@/utils/motion'

function CoursesPricingSection() {
  return (
    <section className="bg-[#f4f7fb] py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          title="مجاني مقابل مدفوع"
          description="يعتمد السعر على طبيعة البرنامج، مدته، ونوع الشهادة أو المرافقة — مع إمكانية وجود عروض أو منح عند الإعلان عنها رسمياً."
        />

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="grid gap-6 md:grid-cols-2"
        >
          <div className="rounded-3xl bg-white p-8 text-right shadow-lg ring-1 ring-slate-100">
            <Gift className="text-customBlue" size={30} />
            <h3 className="mt-4 text-xl font-black text-deepBlue">برامج مجانية أو مدعومة</h3>
            <p className="mt-3 leading-8 text-slate-600">
              قد تُتاح برامج مجانية أو مدعومة جزئياً ضمن مبادرات محددة. راجع بطاقة البرنامج
              لمعرفة إن كان مجانياً، وتابع الشروط المعروضة في صفحة التفاصيل.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-8 text-right shadow-lg ring-1 ring-slate-100">
            <Coins className="text-customOrange" size={30} />
            <h3 className="mt-4 text-xl font-black text-deepBlue">برامج مدفوعة</h3>
            <p className="mt-3 leading-8 text-slate-600">
              تظهر التكلفة في بطاقة الدورة عند توفرها من الـ API. أي استفسار مالي يُدار عبر
              القنوات الرسمية وليس عبر رسائل عشوائية.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-deepBlue">
              <BadgePercent size={18} className="text-customOrange" />
              تابع إعلانات المنح أو الخصومات في صفحة البرنامج أو النشرة الرسمية.
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default memo(CoursesPricingSection)
