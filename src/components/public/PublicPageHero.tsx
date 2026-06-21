import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { fadeUp, staggerContainer } from '@/utils/animations'

export type BreadcrumbItem = { label: string; href?: string }

export type HeroStat = { value: string; label: string }

type PublicPageHeroProps = {
  title: string
  subtitle?: string
  breadcrumbs: BreadcrumbItem[]
  eyebrow?: string
  badge?: string
  variant?: 'centered' | 'split'
  primaryAction?: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
  stats?: HeroStat[]
}

export default function PublicPageHero({
  title,
  subtitle,
  breadcrumbs,
  eyebrow,
  badge,
  variant = 'centered',
  primaryAction,
  secondaryAction,
  stats,
}: PublicPageHeroProps) {
  const isSplit = variant === 'split'

  const breadcrumbsRow = (
    <div className="mb-5 flex flex-wrap items-center gap-2 text-sm font-bold text-white/80">
      {breadcrumbs.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
          {index > 0 && <span className="text-customOrange/95">&gt;</span>}
          {item.href ? (
            <Link to={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ) : (
            <span className="text-white">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  )

  const actions = (primaryAction || secondaryAction) && (
    <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
      {primaryAction && (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            to={primaryAction.href}
            className="inline-flex items-center gap-2 rounded-2xl bg-customOrange px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_32px_-8px_rgba(242, 140, 0,0.45)] transition hover:brightness-105"
          >
            {primaryAction.label}
            <ArrowLeft size={18} />
          </Link>
        </motion.div>
      )}
      {secondaryAction && (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            to={secondaryAction.href}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-extrabold text-white backdrop-blur-md transition hover:border-white/40 hover:bg-white/15"
          >
            {secondaryAction.label}
          </Link>
        </motion.div>
      )}
    </motion.div>
  )

  const statsPanel =
    stats && stats.length > 0 ? (
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.35 }}
        className="grid gap-3 sm:grid-cols-3 lg:max-w-sm lg:grid-cols-1"
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-4 text-right shadow-lg backdrop-blur-md"
          >
            <p className="text-lg font-black text-customOrange sm:text-xl">{s.value}</p>
            <p className="mt-1 text-xs font-bold leading-relaxed text-white/70">{s.label}</p>
          </div>
        ))}
      </motion.div>
    ) : null

  const titleBlock = (
    <>
      {badge ? (
        <motion.span
          variants={fadeUp}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-black text-white/95 backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-customOrange shadow-[0_0_10px_rgba(242, 140, 0,0.6)]" />
          {badge}
        </motion.span>
      ) : (
        eyebrow && (
          <motion.p variants={fadeUp} className="mb-3 text-sm font-bold text-customBlue/95">
            {eyebrow}
          </motion.p>
        )
      )}
      <motion.div variants={fadeUp}>{breadcrumbsRow}</motion.div>
      <motion.h1
        variants={fadeUp}
        className={
          isSplit
            ? 'text-4xl font-black leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.25rem]'
            : 'text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl'
        }
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          variants={fadeUp}
          className={
            isSplit
              ? 'mt-5 max-w-xl text-base font-medium leading-8 text-white/80 sm:text-lg sm:leading-9'
              : 'mx-auto mt-5 max-w-2xl text-lg leading-9 text-white/80'
          }
        >
          {subtitle}
        </motion.p>
      )}
      {actions}
    </>
  )

  return (
    <motion.section
      className="relative isolate overflow-hidden bg-deepBlue px-4 pb-16 pt-28 text-white sm:px-6 sm:pb-20 lg:px-8 lg:pt-32"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <div className="absolute inset-0 bg-deepBlue" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_100%_-15%,rgba(0, 119, 182,0.38),transparent_52%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_-10%_110%,rgba(242, 140, 0,0.14),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(12, 42, 75,0.98)_0%,rgba(12, 42, 75,0.92)_45%,rgba(26,42,62,1)_100%)]" />
      <div className="pointer-events-none absolute -left-28 top-1/4 h-72 w-72 rounded-full bg-customBlue/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-customOrange/12 blur-3xl" />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-customBlue/35 to-transparent" />

      <div className="relative mx-auto max-w-7xl">
        {isSplit ? (
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <motion.div
              className="text-right"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {titleBlock}
            </motion.div>
            <div className="flex justify-center lg:justify-start">{statsPanel}</div>
          </div>
        ) : (
          <motion.div
            className="mx-auto max-w-3xl text-center"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <div className="flex flex-col items-center">
              {badge ? (
                <motion.span
                  variants={fadeUp}
                  className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-black text-white/95 backdrop-blur-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-customOrange" />
                  {badge}
                </motion.span>
              ) : (
                eyebrow && <p className="mb-3 text-sm font-bold text-customBlue/95">{eyebrow}</p>
              )}
              <div className="mb-5 flex flex-wrap items-center justify-center gap-2 text-sm font-bold text-white/80">
                {breadcrumbs.map((item, index) => (
                  <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
                    {index > 0 && <span className="text-customOrange/95">&gt;</span>}
                    {item.href ? (
                      <Link to={item.href} className="transition hover:text-white">
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-white">{item.label}</span>
                    )}
                  </span>
                ))}
              </div>
              <motion.h1
                variants={fadeUp}
                className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl"
              >
                {title}
              </motion.h1>
              {subtitle && (
                <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-lg leading-9 text-white/80">
                  {subtitle}
                </motion.p>
              )}
              {actions}
            </div>
          </motion.div>
        )}
      </div>
    </motion.section>
  )
}
