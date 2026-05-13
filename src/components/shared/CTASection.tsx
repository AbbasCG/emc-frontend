import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Handshake, Heart, MessageCircle } from 'lucide-react'
import { fadeUp, viewportOnce } from '@/utils/animations'

type ExtraLink = {
  text: string
  to: string
  variant: 'orange' | 'glass' | 'muted'
}

type CTASectionProps = {
  title: string
  subtitle: string
  buttonText: string
  buttonLink: string
  /** Preserves secondary actions from the legacy home CTA block (same routes and labels). */
  extraLinks?: ExtraLink[]
}

const extraLinkClass: Record<ExtraLink['variant'], string> = {
  orange:
    'border border-customOrange text-customOrange hover:bg-customOrange hover:text-white',
  glass: 'border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15',
  muted: 'border border-white/20 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10',
}

function ExtraLinkIcon({ to }: { to: string }) {
  if (to === '/volunteer') return <Heart size={20} aria-hidden />
  if (to === '/partnerships') return <Handshake size={20} aria-hidden />
  if (to === '/contact') return <MessageCircle size={20} aria-hidden />
  return null
}

export default function CTASection({
  title,
  subtitle,
  buttonText,
  buttonLink,
  extraLinks,
}: CTASectionProps) {
  return (
    <section className="relative overflow-hidden bg-deepBlue px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(38,145,194,0.2),transparent_55%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-customOrange/10 blur-3xl" />
      <motion.div
        className="relative z-10 mx-auto max-w-3xl text-center"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-8 text-white/75 sm:text-lg sm:leading-9">
          {subtitle}
        </p>
        <motion.div
          className="mt-10 flex justify-center"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            to={buttonLink}
            className="inline-flex items-center gap-2 rounded-2xl bg-customOrange px-8 py-4 text-base font-extrabold text-white shadow-[0_12px_36px_-8px_rgba(236,148,60,0.45)] transition hover:brightness-105"
          >
            <BookOpen size={20} aria-hidden />
            {buttonText}
          </Link>
        </motion.div>
        {extraLinks && extraLinks.length > 0 ? (
          <div className="mt-8 flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row">
            {extraLinks.map((item) => (
              <motion.div key={item.to} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to={item.to}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 text-base font-extrabold transition ${extraLinkClass[item.variant]}`}
                >
                  <ExtraLinkIcon to={item.to} />
                  {item.text}
                </Link>
              </motion.div>
            ))}
          </div>
        ) : null}
      </motion.div>
    </section>
  )
}
