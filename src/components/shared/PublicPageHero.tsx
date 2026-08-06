import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { fadeUp } from '@/utils/animations'
import StatCard from './StatCard'

export type HeroStatCard = {
  number: string
  label: string
}

type PublicPageHeroProps = {
  badge?: string
  title: ReactNode
  subtitle: string
  ctaText?: string
  ctaLink?: string
  secondaryCtaText?: string
  secondaryCtaLink?: string
  tertiaryCtaText?: string
  tertiaryCtaLink?: string
  statsCards?: HeroStatCard[]
}

export default function PublicPageHero({
  badge,
  title,
  subtitle,
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink,
  tertiaryCtaText,
  tertiaryCtaLink,
  statsCards,
}: PublicPageHeroProps) {
  return (
    <section className="relative isolate overflow-hidden pt-28 lg:pt-32">
      <div className="absolute inset-0 bg-gradient-to-b from-emcBg via-white to-white" />
      {/* Subtle grid texture (RTL-aware: faded toward the right edge) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-emc-grid bg-grid-32 opacity-[0.45] [mask-image:radial-gradient(ellipse_at_top,rgba(0,0,0,0.45),transparent_60%)]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-customBlue/25 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-20 h-96 w-96 rounded-full bg-customBlue/[0.10] blur-3xl animate-soft-float" />
      <div className="pointer-events-none absolute left-0 bottom-0 h-72 w-72 rounded-full bg-customOrange/[0.08] blur-3xl animate-soft-float [animation-delay:1.4s]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-20">
        <div className="order-2 text-right lg:order-1">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          >
            {badge && (
              <motion.span
                variants={fadeUp}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-deepBlue/10 bg-white/85 px-4 py-2 text-sm font-bold text-customBlue shadow-emc backdrop-blur-md ring-1 ring-white"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-customOrange/70" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-customOrange" />
                </span>
                {badge}
              </motion.span>
            )}
            <motion.h1
              variants={fadeUp}
              className="text-4xl font-black leading-tight text-deepBlue sm:text-5xl lg:text-[3.15rem]"
            >
              {title}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-xl text-lg font-medium leading-9 text-deepBlue/70"
            >
              {subtitle}
            </motion.p>
            {(ctaText && ctaLink) || (secondaryCtaText && secondaryCtaLink) || (tertiaryCtaText && tertiaryCtaLink) ? (
              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
                {ctaText && ctaLink && (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      to={ctaLink}
                      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-accent-gradient px-7 py-4 text-base font-extrabold text-white shadow-emc-glow-accent transition-all duration-300 ease-emc-out hover:shadow-[0_20px_44px_-10px_rgba(236,148,60,0.55)]"
                    >
                      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-emc-shimmer bg-[length:200%_100%] opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:translate-x-full" aria-hidden />
                      <span className="relative">{ctaText}</span>
                      <ArrowLeft size={20} className="relative transition-transform group-hover:-translate-x-0.5" />
                    </Link>
                  </motion.div>
                )}
                {secondaryCtaText && secondaryCtaLink && (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      to={secondaryCtaLink}
                      className="inline-flex items-center gap-2 rounded-2xl border border-deepBlue/12 bg-white/90 px-7 py-4 text-base font-extrabold text-deepBlue shadow-emc-xs backdrop-blur-sm transition-all duration-300 ease-emc-out hover:-translate-y-0.5 hover:border-customBlue/35 hover:bg-emcBg hover:shadow-emc"
                    >
                      {secondaryCtaText}
                    </Link>
                  </motion.div>
                )}
                {tertiaryCtaText && tertiaryCtaLink && (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      to={tertiaryCtaLink}
                      className="group inline-flex items-center gap-2 rounded-2xl border border-customBlue/25 bg-customBlue/[0.06] px-7 py-4 text-base font-extrabold text-customBlue transition-all duration-300 ease-emc-out hover:-translate-y-0.5 hover:bg-customBlue/10"
                    >
                      {tertiaryCtaText}
                      <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-0.5" />
                    </Link>
                  </motion.div>
                )}
              </motion.div>
            ) : null}
          </motion.div>
        </div>

        <motion.div
          className="order-1 lg:order-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {statsCards && statsCards.length > 0 && (
            <div className="flex flex-col gap-3 sm:mx-auto sm:max-w-md lg:mx-0 lg:max-w-none">
              {statsCards.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.25 + i * 0.1 }}
                  className={[
                    'shadow-[0_16px_40px_-20px_rgba(34,51,74,0.12)]',
                    i === 1 ? 'sm:mr-4 lg:mr-8' : '',
                    i === 2 ? 'sm:ml-4 lg:ml-0' : '',
                  ].join(' ')}
                >
                  <StatCard number={s.number} label={s.label} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
