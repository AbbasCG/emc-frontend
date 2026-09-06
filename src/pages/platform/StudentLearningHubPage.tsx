import { motion } from 'framer-motion'
import { ArrowLeft, BookOpenCheck, ClipboardCheck, Video } from 'lucide-react'
import { Link } from 'react-router'
const courseId = 1

export default function StudentLearningHubPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Advanced LMS</p>
        <h1 className="text-3xl font-black text-deepBlue">مسار التعلّم المتقدم</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500">
          وحدات، دروس بمشغّل غني، واختبارات بتجربة تشبه أفضل منصات SaaS التعليمية.
        </p>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-3">
        {[
          {
            title: 'الوحدات والدروس',
            desc: 'تنقّل بين الوحدات مع شريط تقدّم وأدوات المواد.',
            href: `/dashboard/courses/${courseId}/modules`,
            icon: BookOpenCheck,
            accent: 'from-customBlue/20 to-white',
          },
          {
            title: 'مشغّل الدرس',
            desc: 'درس تجريبي جاهز مع مواد وفيديو placeholder.',
            href: '/dashboard/lessons/1',
            icon: Video,
            accent: 'from-customOrange/15 to-white',
          },
          {
            title: 'اختبار قصير',
            desc: 'بطاقات أسئلة، إرسال، وشاشة نتيجة بنظام النجاح.',
            href: '/dashboard/quizzes/1',
            icon: ClipboardCheck,
            accent: 'from-emerald-50 to-white',
          },
        ].map((c, i) => (
          <motion.div
            key={c.href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-bl ${c.accent} p-6 shadow-sm`}
          >
            <c.icon className="text-deepBlue" size={26} />
            <h2 className="mt-4 text-lg font-black text-deepBlue">{c.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">{c.desc}</p>
            <Link
              to={c.href}
              className="mt-6 inline-flex items-center gap-2 text-sm font-black text-customBlue hover:underline"
            >
              بدء التجربة
              <ArrowLeft size={16} />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
