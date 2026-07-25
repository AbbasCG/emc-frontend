import React from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { BookOpen, Globe, GraduationCap, MapPin, Phone } from 'lucide-react'

interface ContactInfo {
  website: string
  phone: string
  address: string
}

export interface HeroSectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  badge?: string
  title: React.ReactNode
  subtitle: string
  primaryAction: { text: string; href: string }
  secondaryAction: { text: string; href: string }
  backgroundImage: string
  contactInfo: ContactInfo
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.11, delayChildren: 0.12 },
  },
}

const itemVariants = {
  hidden: { y: 18, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  (
    {
      className,
      badge,
      title,
      subtitle,
      primaryAction,
      secondaryAction,
      backgroundImage,
      contactInfo,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        dir="ltr"
        className={cn('relative flex min-h-[680px] w-full overflow-hidden bg-white', className)}
        {...props}
      >
        {/* Content */}
        <motion.div
          className="relative z-10 flex w-full flex-col justify-between px-8 pb-12 pt-28 md:w-3/5 md:px-14 md:pb-14 md:pt-32 lg:px-20 lg:pt-36"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div>
            {badge && (
              <motion.div variants={itemVariants} className="mb-7">
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-1.5 text-sm font-bold text-customBlue ring-1 ring-customBlue/20">
                  {badge}
                </span>
              </motion.div>
            )}

            <motion.h1
              variants={itemVariants}
              className="max-w-xl text-4xl font-black leading-[1.15] tracking-tight text-deepBlue md:text-5xl lg:text-[3.5rem]"
            >
              {title}
            </motion.h1>

            <motion.div
              variants={itemVariants}
              className="my-7 h-1 w-16 rounded-full bg-customOrange"
            />

            <motion.p
              variants={itemVariants}
              className="mb-10 max-w-md text-base leading-8 text-slate-500"
            >
              {subtitle}
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to={primaryAction.href}
                  className="inline-flex items-center gap-2 rounded-lg bg-customOrange px-7 py-4 text-base font-extrabold text-white shadow-lg shadow-orange-200/60 transition hover:bg-[#d8832e]"
                >
                  <BookOpen size={19} />
                  {primaryAction.text}
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to={secondaryAction.href}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-7 py-4 text-base font-extrabold text-deepBlue shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <GraduationCap size={19} />
                  {secondaryAction.text}
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Footer contact strip */}
          <motion.footer
            variants={itemVariants}
            className="mt-16 border-t border-slate-100 pt-6"
          >
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Globe size={13} className="text-customBlue" />
                {contactInfo.website}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone size={13} className="text-customBlue" />
                {contactInfo.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-customBlue" />
                {contactInfo.address}
              </span>
            </div>
          </motion.footer>
        </motion.div>

        {/* Right image with clip-path reveal */}
        <motion.div
          className="hidden bg-cover bg-center md:block md:w-2/5"
          style={{ backgroundImage: `url(${backgroundImage})` }}
          initial={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
          animate={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)' }}
          transition={{ duration: 1.1, ease: 'circOut' }}
        />
      </div>
    )
  }
)

HeroSection.displayName = 'HeroSection'

export { HeroSection }
