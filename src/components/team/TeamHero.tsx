import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { fadeUp } from '@/utils/animations'

export default function TeamHero() {
  return (
    <section className="relative isolate overflow-hidden bg-white pb-16 pt-[5.75rem] sm:pb-20 lg:pt-[6.25rem]" dir="rtl">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-emc-hero bg-cover" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-emc-grid bg-grid-32 opacity-[0.38] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.55),transparent_78%)]"
      />
      <div aria-hidden className="absolute right-[-22%] top-[5%] h-[min(38rem,88vw)] w-[min(38rem,88vw)] rounded-full bg-customBlue/[0.08] blur-3xl animate-soft-float" />
      <div
        aria-hidden
        className="absolute bottom-[-20%] left-[-16%] h-[min(32rem,80vw)] w-[min(32rem,80vw)] rounded-full bg-customOrange/[0.07] blur-3xl animate-soft-float [animation-delay:1.8s]"
      />

      <div className="relative mx-auto max-w-[1540px] px-4 sm:px-6 lg:px-10">
        <nav className="mb-8 flex flex-wrap items-center justify-end gap-2 text-xs font-semibold text-foreground/50">
          <Link to="/" className="transition hover:text-customBlue">
            الرئيسية
          </Link>
          <span aria-hidden>/</span>
          <span className="text-deepBlue">الفريق</span>
        </nav>

        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div className="mb-8 flex justify-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-deepBlue/[0.08] bg-white/92 px-4 py-2 text-[11px] font-black tracking-wide text-deepBlue shadow-emc-xs backdrop-blur-md ring-1 ring-white">
              <Shield size={13} className="text-customOrange" aria-hidden />
              EMC V3 · 2026
            </span>
          </div>

          <h1 className="font-display text-[2.05rem] font-black leading-[1.1] text-deepBlue sm:text-5xl lg:text-[3.25rem] xl:text-[3.55rem]">
            فريق EMC V3
          </h1>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-9 text-foreground/72 sm:text-xl sm:leading-[2.05rem]">
            الهيكل الإداري الرسمي لمركز EMC لعام 2026
          </p>
          <p className="mt-8 max-w-4xl border-t border-deepBlue/[0.07] pt-10 text-[1.06rem] font-medium leading-9 text-foreground/76">
            نعمل كفريق واحد لبناء منصّة تعليمية وإدارية قوية، منظّمة، وقادرة على صناعة أثر حقيقي في المجتمع.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
