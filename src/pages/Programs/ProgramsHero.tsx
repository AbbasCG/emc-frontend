import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, GraduationCap, Route, Sparkles } from 'lucide-react'

type Props = {
  coursesCount: number
  pathsCount: number
  workshopsCount: number
}

export default function ProgramsHero({ coursesCount, pathsCount, workshopsCount }: Props) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-ink-900 via-deepBlue to-[#1a2a3f] pt-28 pb-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 end-0 h-72 w-72 -translate-y-1/3 translate-x-1/4 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="absolute bottom-0 start-1/4 h-56 w-56 translate-y-1/2 rounded-full bg-accent-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-brand-200"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent-400" aria-hidden />
          EMC · منظومة البرامج التدريبية
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-4xl font-black leading-tight text-white md:text-5xl"
        >
          استكشف جميع برامج EMC
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/70 md:text-lg"
        >
          دورات · مسارات احترافية · ورش عمل — كل ما تحتاجه في مكان واحد، من بيانات الكتالوج الحقيقية.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-8 grid grid-cols-3 gap-3 sm:mx-auto sm:max-w-lg"
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-sm">
            <BookOpen className="mx-auto mb-2 h-5 w-5 text-brand-300" aria-hidden />
            <p className="text-xl font-black tabular-nums text-white">{coursesCount.toLocaleString('ar-EG')}</p>
            <p className="text-[11px] font-bold text-white/60">دورة</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-sm">
            <Route className="mx-auto mb-2 h-5 w-5 text-accent-300" aria-hidden />
            <p className="text-xl font-black tabular-nums text-white">{pathsCount.toLocaleString('ar-EG')}</p>
            <p className="text-[11px] font-bold text-white/60">مسار</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-sm">
            <GraduationCap className="mx-auto mb-2 h-5 w-5 text-emerald-300" aria-hidden />
            <p className="text-xl font-black tabular-nums text-white">{workshopsCount.toLocaleString('ar-EG')}</p>
            <p className="text-[11px] font-bold text-white/60">ورشة</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a
            href="#program-courses"
            className="rounded-xl bg-brand-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600"
          >
            تصفح الدورات
          </a>
          <Link
            to="/courses"
            className="rounded-xl border-2 border-white/25 px-7 py-3.5 text-sm font-bold text-white/90 hover:bg-white/10"
          >
            كتالوج الدورات الكامل
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
