import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ClipboardCheck, UserPlus } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { staggerContainer, staggerItem } from '@/utils/motion'

const steps = [
  {
    title: 'اختيار البرنامج',
    body: 'راجع الوصف، المدة، والمتطلبات — ثم انتقل لصفحة تفاصيل الدورة.',
  },
  {
    title: 'التسجيل',
    body: 'أكمل بيانات التسجيل عبر مسار المنصة الحالي (حساب/تسجيل) دون تغيير الـ API.',
  },
  {
    title: 'تأكيد والمتابعة',
    body: 'ستصلك تعليمات المشاركة عبر القنوات الرسمية للبرنامج.',
  },
]

export default function CoursesRegistrationSection() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          title="كيف يعمل التسجيل؟"
          description="مسار موحّد: تصفح — تفاصيل — تسجيل — متابعة. أي تحديثات مستقبلية على المنصة ستظهر هنا تلقائياً عبر نفس الروابط."
        />

        <motion.div
          className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          <ol className="space-y-4 text-right">
            {steps.map((s, i) => (
              <motion.li
                key={s.title}
                variants={staggerItem}
                className="rounded-3xl border border-slate-100 bg-[#f4f7fb] p-6"
              >
                <span className="text-xs font-black text-customOrange">خطوة {i + 1}</span>
                <p className="mt-2 text-lg font-black text-deepBlue">{s.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{s.body}</p>
              </motion.li>
            ))}
          </ol>

          <motion.div
            variants={staggerItem}
            className="flex flex-col justify-center rounded-3xl bg-deepBlue p-8 text-right text-white shadow-xl"
          >
            <UserPlus className="text-customOrange" size={32} />
            <h3 className="mt-4 text-xl font-black">جاهز للبدء؟</h3>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              إذا احتجت استشارة قبل التسجيل، يمكنك التواصل معنا أو حجز جلسة توجيه عبر القنوات
              المعلنة.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-customOrange px-6 py-3 text-sm font-extrabold text-white"
              >
                تواصل معنا
                <ArrowLeft size={18} />
              </Link>
              <Link
                to="/submit-workshop"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-6 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                <ClipboardCheck size={18} />
                طلب ورشة للفريق
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
