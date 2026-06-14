import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import type { PublicEnrollCta } from '@/utils/publicCourseDetailCta'
import { PUBLIC_ENROLL_STUDENT_ONLY_MSG } from '@/utils/publicEnrollAuth'
import toast from '@/lib/toast'

type Props = {
  cta: PublicEnrollCta
  onScrollToEnroll?: () => void
  size?: 'md' | 'lg'
  className?: string
}

const sizeCls = {
  md: 'rounded-2xl px-6 py-3.5 text-sm',
  lg: 'rounded-2xl px-8 py-4 text-base',
}

const variantCls = {
  primary: 'bg-customOrange text-white shadow-lg shadow-customOrange/25 hover:bg-[#d4832e]',
  success: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-700',
  muted: 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none',
}

export default function PublicDetailCtaButton({
  cta,
  onScrollToEnroll,
  size = 'md',
  className = '',
}: Props) {
  const cls = `inline-flex w-full items-center justify-center gap-2 font-black transition sm:w-auto ${sizeCls[size]} ${variantCls[cta.variant]} ${className}`

  if (cta.disabled) {
    return <span className={cls}>{cta.label}</span>
  }

  if (cta.href) {
    return (
      <Link to={cta.href} className={cls}>
        <GraduationCap size={size === 'lg' ? 20 : 18} aria-hidden />
        {cta.label}
        <ArrowLeft size={size === 'lg' ? 18 : 16} aria-hidden />
      </Link>
    )
  }

  if (cta.denyNonStudent) {
    return (
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)}
        className={cls}
      >
        <GraduationCap size={size === 'lg' ? 20 : 18} aria-hidden />
        {cta.label}
        <ArrowLeft size={size === 'lg' ? 18 : 16} aria-hidden />
      </motion.button>
    )
  }

  if (cta.scrollToEnroll) {
    return (
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onScrollToEnroll}
        className={cls}
      >
        <GraduationCap size={size === 'lg' ? 20 : 18} aria-hidden />
        {cta.label}
        <ArrowLeft size={size === 'lg' ? 18 : 16} aria-hidden />
      </motion.button>
    )
  }

  return null
}
