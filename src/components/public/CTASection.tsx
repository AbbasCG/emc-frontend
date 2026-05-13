import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { fadeUp } from '@/utils/animations'

type CTASectionProps = {
  title: string
  description: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel?: string
  secondaryHref?: string
}

export default function CTASection({
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: CTASectionProps) {
  return (
    <section className="px-4 pb-20 sm:px-6 lg:px-8">
      <motion.div
        className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 overflow-hidden rounded-[1.75rem] bg-gradient-to-l from-deepBlue via-deepBlue to-deepBlue p-8 text-right text-white shadow-[0_28px_60px_-24px_rgba(34,51,74,0.35)] ring-1 ring-white/10 sm:p-10 lg:flex-row lg:items-center"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_0%_50%,rgba(38,145,194,0.15),transparent_50%),radial-gradient(ellipse_60%_50%_at_100%_100%,rgba(236,148,60,0.1),transparent_45%)]" />
        <div className="relative z-[1] max-w-2xl">
          <h2 className="text-3xl font-black sm:text-4xl">{title}</h2>
          <p className="mt-4 text-lg leading-9 text-white/82">{description}</p>
        </div>
        <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-center">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              to={primaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-customOrange px-7 py-4 text-sm font-extrabold text-white shadow-lg"
            >
              {primaryLabel}
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
          {secondaryLabel && secondaryHref && (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                to={secondaryHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 px-7 py-4 text-sm font-extrabold text-white transition hover:bg-white/10"
              >
                {secondaryLabel}
              </Link>
            </motion.div>
          )}
        </div>
      </motion.div>
    </section>
  )
}
