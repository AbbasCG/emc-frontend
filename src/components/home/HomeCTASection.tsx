import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Handshake, Heart, MessageCircle } from 'lucide-react'
import { fadeUp } from '../../utils/course'

export default function HomeCTASection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55 }}
          className="rounded-3xl bg-gradient-to-l from-deepBlue via-[#1c3f5e] to-[#162334] px-8 py-16 text-center text-white shadow-2xl md:px-16"
        >
          <h2 className="text-3xl font-black leading-tight sm:text-5xl">
            ابدأ رحلتك مع EMC اليوم
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-9 text-slate-300">
            سواء كنت تبحث عن دورة، استشارة، شراكة، أو فرصة للتطوع، نحن هنا لمساعدتك على
            بناء خطوة أفضل.
          </p>

          <div className="mt-10 flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row">
            <motion.div whileHover={{ scale: 1.02 }}>
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-customOrange px-7 py-4 font-extrabold text-white shadow-xl shadow-orange-900/20 transition hover:bg-[#d9822f]"
              >
                <BookOpen size={20} aria-hidden="true" />
                التسجيل في البرامج
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Link
                to="/volunteer"
                className="inline-flex items-center gap-2 rounded-xl border border-customOrange px-7 py-4 font-extrabold text-customOrange transition hover:bg-customOrange hover:text-white"
              >
                <Heart size={20} aria-hidden="true" />
                التطوع
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Link
                to="/partnerships"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-7 py-4 font-extrabold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                <Handshake size={20} aria-hidden="true" />
                شراكة
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-4 font-extrabold text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                <MessageCircle size={20} aria-hidden="true" />
                تواصل معنا
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
