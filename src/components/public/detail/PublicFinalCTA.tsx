import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  coverUrl?: string
  cta: ReactNode
  backHref?: string
  backLabel?: string
  compact?: boolean
}

export default function PublicFinalCTA({
  title,
  description,
  coverUrl,
  cta,
  backHref = '/courses',
  backLabel = 'العودة إلى الدورات',
  compact = false,
}: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 'some', margin: '0px 0px -96px 0px' }}
      transition={{ duration: 0.45 }}
      className={`overflow-hidden bg-gradient-to-l from-[#0C2A4B] via-[#1c4567] to-[#162334] ring-1 ring-white/10 ${
        compact ? 'mt-8 rounded-2xl' : 'mt-10 rounded-[2rem]'
      }`}
    >
      <div
        className={`grid items-center gap-6 ${
          compact ? 'p-5 sm:p-6 lg:grid-cols-[1fr_auto]' : 'gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_320px]'
        }`}
      >
        <div className="text-right">
          <h2 className={`font-black leading-tight text-white ${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>
            {title}
          </h2>
          {!compact && description && (
            <p className="mt-3 max-w-xl text-base leading-8 text-slate-300">{description}</p>
          )}
          <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap ${compact ? 'mt-4' : 'mt-7'}`}>
            {cta}
            <Link
              to={backHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-black text-white transition hover:bg-white/15 sm:w-auto"
            >
              {backLabel}
              <ArrowLeft size={18} aria-hidden />
            </Link>
          </div>
        </div>
        {coverUrl && !compact && (
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            className="h-52 w-full rounded-3xl object-cover opacity-90 ring-1 ring-white/10 lg:h-64"
          />
        )}
      </div>
    </motion.section>
  )
}
