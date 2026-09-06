import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type CrudChromeProps = {
  eyebrow?: string
  title: string
  subtitle: string
  actionSlot?: React.ReactNode
  bento?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function CrudChrome({
  eyebrow,
  title,
  subtitle,
  actionSlot,
  bento,
  className,
  children,
}: CrudChromeProps) {
  return (
    <div dir="rtl" className={cn('space-y-8 pb-10 text-right rtl:text-right', className)}>
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative overflow-hidden rounded-[28px] border border-ink-100 bg-white p-6 text-right shadow-[0_12px_44px_rgba(15,23,42,0.07)] sm:p-8"
      >
        <div className="pointer-events-none absolute -left-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-customBlue/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-accent-400/[0.12] blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-brand-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-brand-800">
              <Sparkles className="h-3.5 w-3.5 text-customBlue" aria-hidden />
              {eyebrow ?? 'مركز التحكم'}
            </div>
            <h1 className="mt-4 text-2xl font-black leading-tight text-deepBlue sm:text-3xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-[13px] font-semibold leading-relaxed text-muted-600 sm:text-[14px]">
              {subtitle}
            </p>
            <Link
              to="/dashboard/super-admin"
              className="mt-4 inline-flex items-center gap-2 text-[12px] font-black text-customBlue hover:underline"
            >
              لوحة السوبر مشرف
              <ArrowRight className="h-4 w-4 rotate-180" aria-hidden />
            </Link>
          </div>
          {actionSlot ? <div dir="rtl" className="flex flex-wrap items-center gap-2 text-right">{actionSlot}</div> : null}
        </div>

        {bento ?
          <div
            dir="rtl"
            className="relative mt-8 grid gap-4 border-t border-ink-100 pt-7 text-right sm:grid-cols-2 xl:grid-cols-4 rtl:text-right"
          >
            {bento}
          </div>
        : null}
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        className="text-right rtl:text-right"
      >
        {children}
      </motion.div>
    </div>
  )
}
