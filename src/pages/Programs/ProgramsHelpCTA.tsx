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
        className="emc-depth mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl p-8 text-right text-white shadow-emc-xl ring-1 ring-white/10 sm:p-10 lg:flex-row lg:items-center"
      >
        <div>
          <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">تحتاج مساعدة في اختيار البرنامج؟</h2>
          <p className="mt-3 max-w-xl text-base leading-8 text-ice/90">
            فريق مستشارينا جاهز لمساعدتك في اختيار الدورة أو المسار أو الورشة المناسبة لأهدافك.
          </p>
        </div>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 rounded-xl bg-customOrange px-7 py-3.5 text-sm font-black text-white shadow-emc-md transition duration-300 ease-emc hover:bg-[#d9832e]"
        >
          تواصل معنا
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
      </motion.div>
    </section>
  )
}
