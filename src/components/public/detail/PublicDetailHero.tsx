import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import PublicDetailShareActions from '@/components/public/detail/PublicDetailShareActions'

export type HeroBadge = {
  label: string
  tone: 'blue' | 'orange' | 'green' | 'slate'
}

type Breadcrumb = { label: string; href?: string }

type Props = {
  breadcrumbs: Breadcrumb[]
  title: string
  description?: string
  coverUrl: string
  badges: HeroBadge[]
  keywordTags?: string[]
  cta: ReactNode
  onShare: () => void
}

const badgeTone: Record<HeroBadge['tone'], string> = {
  blue: 'bg-sky-500/15 text-sky-100 ring-sky-400/30',
  orange: 'bg-orange-500/15 text-orange-100 ring-orange-400/30',
  green: 'bg-emerald-500/15 text-emerald-100 ring-emerald-400/30',
  slate: 'bg-white/10 text-white/80 ring-white/20',
}

export default function PublicDetailHero({
  breadcrumbs,
  title,
  description,
  coverUrl,
  badges,
  keywordTags = [],
  cta,
  onShare,
}: Props) {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-bl from-[#22334A] via-[#1a3550] to-[#162334] text-white shadow-[0_20px_60px_-20px_rgba(34,51,74,0.45)] ring-1 ring-white/10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -end-20 top-0 h-72 w-72 rounded-full bg-[#2691C2]/20 blur-3xl" />
        <div className="absolute -bottom-16 start-10 h-56 w-56 rounded-full bg-[#EC943C]/15 blur-3xl" />
      </div>

      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.1fr_0.85fr] lg:p-8">
        <div className="order-2 flex flex-col text-right lg:order-1">
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold text-white/55">
            {breadcrumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-2">
                {i > 0 && <span className="text-customOrange">/</span>}
                {crumb.href ?
                  <Link to={crumb.href} className="transition hover:text-white">
                    {crumb.label}
                  </Link>
                : <span className="text-white/90">{crumb.label}</span>}
              </span>
            ))}
          </nav>

          <div className="mb-4 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b.label}
                className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${badgeTone[b.tone]}`}
              >
                {b.label}
              </span>
            ))}
          </div>

          <h1 className="text-3xl font-black leading-[1.15] tracking-tight sm:text-4xl lg:text-[2.75rem]">
            {title}
          </h1>

          {description && (
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/75 sm:text-lg">{description}</p>
          )}

          {keywordTags.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-start gap-2">
              {keywordTags.map((tag, i) => (
                <span
                  key={`${tag}-${i}`}
                  className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-white/85 ring-1 ring-white/15"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {cta}
            <PublicDetailShareActions title={title} onNativeShare={onShare} />
          </div>
        </div>

        <motion.div
          className="order-1 lg:order-2"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-white/15 shadow-xl lg:aspect-[5/4]">
            <img
              src={coverUrl}
              alt=""
              loading="eager"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#22334A]/50 via-transparent to-transparent" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
