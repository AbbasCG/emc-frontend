import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

type QuickStat = { label: string; value: string | number }

type Props = {
  greeting: string
  name: string
  role?: string
  subtitle?: ReactNode
  quickStats?: QuickStat[]
  /** Quick action chips rendered below the subtitle */
  actions?: ReactNode
  avatarUrl?: string | null
  avatarInitials?: string
}

export default function DashboardHero({ greeting, name, role, subtitle, quickStats, actions, avatarUrl, avatarInitials }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
      className="relative overflow-hidden rounded-[1.75rem] border border-deepBlue/[0.08] bg-gradient-to-bl from-deepBlue via-[#1c2f45] to-[#101c2e] shadow-emc-lg ring-1 ring-white/10"
    >
      <div aria-hidden className="pointer-events-none absolute -left-24 top-0 h-56 w-56 rounded-full bg-customBlue/30 blur-[100px]" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-[10%] h-44 w-44 rounded-full bg-customOrange/20 blur-[80px]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-emc-dots bg-dots-22 opacity-[0.06]" />

      <div className="relative px-7 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div className="flex items-start gap-4 text-right">
            {(avatarUrl || avatarInitials) && (
              <div className="relative shrink-0">
                <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-white/15 ring-2 ring-white/25 shadow-lg">
                  {avatarUrl ?
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  : <span className="text-lg font-black text-white">{avatarInitials}</span>}
                </div>
              </div>
            )}
            <div className="min-w-0 flex-1">
            {role && (
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45 mb-1">{role}</p>
            )}
            <p className="text-[11px] font-bold text-white/55">{greeting}،</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">{name}</h1>
            {subtitle && (
              <p className="mt-3 max-w-xl text-sm font-semibold leading-relaxed text-white/72">{subtitle}</p>
            )}
            {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
            </div>
          </div>

          {quickStats && quickStats.length > 0 && (
            <div className={`grid gap-3 ${quickStats.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {quickStats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 text-right backdrop-blur-sm"
                >
                  <div className="emc-display-num text-2xl leading-none text-white">{s.value}</div>
                  <p className="mt-1.5 text-[10px] font-black uppercase tracking-wider text-white/50">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  )
}
