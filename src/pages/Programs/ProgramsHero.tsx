import { motion } from 'framer-motion'
import { BookOpen, Sparkles } from 'lucide-react'

type Props = {
  coursesCount: number
}

export default function ProgramsHero({ coursesCount }: Props) {
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
          className="emc-eyebrow mb-4 border-white/15 bg-white/10 text-ice"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber" aria-hidden />
          EMC · منظومة البرامج التدريبية
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="emc-title-arc is-center font-display text-4xl font-black leading-tight tracking-tight text-white md:text-5xl"
        >
          الدورات التدريبية
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/70 md:text-lg"
        >
          تصفح جميع الدورات المستقلة المتاحة — مع أدوات بحث وتصفية متقدمة.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-8 flex justify-center"
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 shadow-emc backdrop-blur-sm">
            <BookOpen className="mx-auto mb-2 h-5 w-5 text-brand-300" aria-hidden />
            <p className="font-latin text-2xl font-black tabular-nums text-white">{coursesCount.toLocaleString('en-US')}</p>
            <p className="text-[11px] font-bold text-white/60">دورة تدريبية مستقلة</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
