import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

export default function ProgramsHelpCTA() {
  return (
    <section className="px-4 pb-20 pt-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-l from-deepBlue via-[#1c4567] to-[#162334] p-8 text-right text-white shadow-2xl sm:p-10 lg:flex-row lg:items-center"
      >
        <div>
          <h2 className="text-2xl font-black sm:text-3xl">تحتاج مساعدة في اختيار البرنامج؟</h2>
          <p className="mt-3 max-w-xl text-base leading-8 text-slate-200">
            فريق مستشارينا جاهز لمساعدتك في اختيار الدورة أو المسار أو الورشة المناسبة لأهدافك.
          </p>
        </div>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 rounded-xl bg-customOrange px-7 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-[#d9832e]"
        >
          تواصل معنا
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
      </motion.div>
    </section>
  )
}
