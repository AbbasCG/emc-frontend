import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Building2,
  ChevronLeft,
  Cog,
  Cpu,
  HeartHandshake,
  Landmark,
  Megaphone,
  ShieldCheck,
  UserCog,
  UsersRound,
  Waypoints,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { departments10, type PublicDepartment } from '@/data/publicPages'

const iconMap: Record<string, LucideIcon> = {
  Building2,
  Waypoints,
  Cog,
  Megaphone,
  UsersRound,
  Landmark,
  Cpu,
  UserCog,
  HeartHandshake,
  ShieldCheck,
}

const accentRing = ['ring-customBlue/40', 'ring-customOrange/45', 'ring-deepBlue/30'] as const

function lineActive(
  i: number,
  satellites: PublicDepartment[],
  selectedId: string | null,
  hoveredId: string | null,
  centerId: string
) {
  const sid = satellites[i]!.id
  if (selectedId === centerId || hoveredId === centerId) return 'pulse'
  if (selectedId === sid || hoveredId === sid) return 'hot'
  if (hoveredId) return 'dim'
  return 'idle'
}

function DeptNode({
  dept,
  accent,
  active,
  hovered,
  onSelect,
  onHover,
  variant = 'satellite',
}: {
  dept: PublicDepartment
  accent: number
  active: boolean
  hovered: boolean
  onSelect: () => void
  onHover: (enter: boolean) => void
  variant?: 'satellite' | 'hub'
}) {
  const Icon = iconMap[dept.icon] ?? Building2
  const ring = accentRing[accent % 3]

  if (variant === 'hub') {
    return (
      <motion.button
        type="button"
        onClick={onSelect}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        whileHover={{ scale: 1.02, y: -3 }}
        whileTap={{ scale: 0.98 }}
        className={[
          'group relative flex max-w-[11.5rem] flex-col items-center rounded-[1.35rem] border border-white/10 bg-gradient-to-b from-deepBlue to-[#0a1f32] px-5 py-5 text-center text-white shadow-[0_28px_56px_-18px_rgba(15,42,67,0.62)] backdrop-blur-sm transition-shadow duration-300',
          active || hovered
            ? 'shadow-[0_0_0_1px_rgba(247,148,29,0.35),0_28px_60px_-14px_rgba(38,145,201,0.35)] ring-2 ring-customOrange/50'
            : 'ring-2 ring-customBlue/30 hover:ring-customBlue/55',
        ].join(' ')}
      >
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[1.35rem] bg-gradient-to-t from-customBlue/0 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-customBlue transition-colors duration-300 group-hover:bg-customBlue group-hover:text-white">
          <Icon size={24} strokeWidth={2} aria-hidden />
        </span>
        <span className="relative mt-3 line-clamp-3 text-xs font-black leading-snug text-white sm:text-sm">{dept.title.ar}</span>
        <span className="relative mt-2 text-[10px] font-bold leading-relaxed text-white/70">النواة · التوجيه · الحوكمة العليا</span>
        {(active || hovered) && (
          <motion.span
            layoutId="hub-pulse"
            className="absolute -bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-customOrange shadow-[0_0_16px_rgba(247,148,29,0.85)]"
          />
        )}
      </motion.button>
    )
  }

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={[
        'group relative flex max-w-[9rem] flex-col items-center text-center transition-[box-shadow,transform] duration-300',
        active || hovered
          ? `z-10 scale-[1.03] shadow-[0_22px_48px_-16px_rgba(15,42,67,0.28)] ring-2 ${ring} backdrop-blur-md`
          : 'shadow-[0_12px_32px_-14px_rgba(15,42,67,0.14)] ring-1 ring-deepBlue/[0.08] hover:shadow-[0_18px_40px_-12px_rgba(38,145,201,0.22)] hover:ring-customBlue/35',
        'rounded-2xl border border-white/70 bg-white/90 px-3 py-3.5 backdrop-blur-sm',
      ].join(' ')}
    >
      <span
        className={[
          'relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-300',
          active
            ? 'bg-customBlue text-white shadow-[0_0_20px_rgba(38,145,201,0.45)]'
            : hovered
              ? 'bg-customOrange text-white'
              : 'bg-deepBlue/[0.05] text-customBlue group-hover:bg-customBlue group-hover:text-white',
        ].join(' ')}
      >
        <Icon size={22} strokeWidth={2} aria-hidden />
      </span>
      <span
        className={[
          'mt-2.5 line-clamp-2 text-[11px] font-black leading-snug text-deepBlue sm:text-xs',
          active || hovered ? 'text-customBlue' : 'group-hover:text-customBlue',
        ].join(' ')}
      >
        {dept.title.ar}
      </span>
      {active && (
        <motion.span
          layoutId="dept-dot"
          className="absolute -bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-customOrange shadow-[0_0_10px_rgba(247,148,29,0.7)]"
        />
      )}
    </motion.button>
  )
}

export default function DepartmentsOrgEcosystem() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const center = departments10[0]!
  const satellites = departments10.slice(1)

  const positions = useMemo(() => {
    const sats = departments10.slice(1)
    const R = 37
    const n = sats.length
    return sats.map((_, i) => {
      const angle = -Math.PI / 2 + (i / n) * 2 * Math.PI
      return {
        x: 50 + R * Math.cos(angle),
        y: 44 + R * Math.sin(angle) * 0.9,
      }
    })
  }, [])

  const selected = departments10.find((d) => d.id === selectedId) ?? null

  return (
    <section
      id="departments-network"
      className="relative scroll-mt-28 overflow-hidden border-y border-deepBlue/[0.08] bg-gradient-to-b from-white via-emcBg to-white py-16 sm:py-20 lg:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 18% 18%, rgba(38,145,201,0.11) 0%, transparent 42%),
            radial-gradient(circle at 82% 78%, rgba(247,148,29,0.09) 0%, transparent 40%),
            linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(248,251,254,0.95) 45%, rgba(255,255,255,0.92) 100%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-customBlue/30 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-customOrange/20 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          align="right"
          className="!mr-0 !max-w-3xl !text-right"
          eyebrow="خريطة التشغيل"
          title="منظومة الإدارات — مركز تحكم مؤسسي"
          description="تخطيط تفاعلي يربط الإدارة العليا بالوحدات التنفيذية: مرر المؤشر أو اختر إدارة لرؤية مسار الربط والتفاصيل."
        />

        <div className="mt-12 hidden gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_min(100%,340px)] lg:items-start lg:gap-14 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="relative mx-auto aspect-[16/11] w-full max-w-3xl">
            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden
            >
              <defs>
                <linearGradient id="emcConnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0077B6" stopOpacity="0.95" />
                  <stop offset="55%" stopColor="#0077B6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#F28C00" stopOpacity="0.9" />
                </linearGradient>
                <filter id="emcGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="0.9" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {positions.map((p, i) => {
                const mode = lineActive(i, satellites, selectedId, hoveredId, center.id)
                const hot = mode === 'hot' || mode === 'pulse'
                const opacity = mode === 'hot' ? 0.95 : mode === 'pulse' ? 0.55 : mode === 'dim' ? 0.12 : 0.28
                return (
                  <g key={satellites[i]!.id}>
                    <line
                      x1="50"
                      y1="44"
                      x2={p.x}
                      y2={p.y}
                      stroke={hot ? 'url(#emcConnGrad)' : 'rgba(15,42,67,0.14)'}
                      strokeWidth={hot ? 0.55 : 0.38}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      filter={hot ? 'url(#emcGlow)' : undefined}
                      style={{ opacity, transition: 'opacity 0.35s ease, stroke 0.35s ease' }}
                    />
                    {!hot && (
                      <line
                        x1="50"
                        y1="44"
                        x2={p.x}
                        y2={p.y}
                        stroke="rgba(38,145,201,0.12)"
                        strokeWidth={0.85}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        style={{ opacity: mode === 'dim' ? 0.06 : 0.18 }}
                      />
                    )}
                  </g>
                )
              })}
            </svg>

            <motion.div
              className="absolute left-1/2 top-[44%] z-20 -translate-x-1/2 -translate-y-1/2"
              initial={false}
              animate={{ scale: selectedId === center.id ? 1.02 : 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <DeptNode
                variant="hub"
                dept={center}
                accent={0}
                active={selectedId === center.id}
                hovered={hoveredId === center.id}
                onSelect={() => setSelectedId((id) => (id === center.id ? null : center.id))}
                onHover={(enter) => setHoveredId(enter ? center.id : null)}
              />
            </motion.div>

            {satellites.map((dept, i) => {
              const p = positions[i]!
              return (
                <div
                  key={dept.id}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                >
                  <DeptNode
                    dept={dept}
                    accent={i + 1}
                    active={selectedId === dept.id}
                    hovered={hoveredId === dept.id}
                    onSelect={() => setSelectedId((id) => (id === dept.id ? null : dept.id))}
                    onHover={(enter) => setHoveredId(enter ? dept.id : null)}
                  />
                </div>
              )
            })}
          </div>

          <aside className="lg:sticky lg:top-28">
            <SpotlightPanel selected={selected} onClose={() => setSelectedId(null)} />
          </aside>
        </div>

        <div className="mt-10 space-y-4 lg:hidden">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/20 bg-gradient-to-br from-deepBlue to-[#0a1f32] p-5 text-right text-white shadow-emc-lg backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-customOrange">الإدارة العليا</p>
                <h3 className="mt-1 text-lg font-black">{center.title.ar}</h3>
                <p className="mt-2 text-sm leading-7 text-white/85">{center.description.ar}</p>
              </div>
              <Building2 className="shrink-0 text-customBlue" size={32} />
            </div>
          </motion.div>

          <div className="grid gap-3 sm:grid-cols-2">
            {satellites.map((dept) => {
              const Icon = iconMap[dept.icon] ?? Building2
              const open = selectedId === dept.id
              return (
                <motion.div
                  key={dept.id}
                  layout
                  className={[
                    'overflow-hidden rounded-2xl border bg-white/95 text-right shadow-emc backdrop-blur-sm transition-colors',
                    open ? 'border-customOrange/45 ring-2 ring-customOrange/25' : 'border-deepBlue/10 hover:border-customBlue/30',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(open ? null : dept.id)}
                    className="flex w-full items-center gap-3 p-4 text-right"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-deepBlue/[0.05] text-customBlue ring-1 ring-deepBlue/[0.06]">
                      <Icon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-deepBlue">{dept.title.ar}</span>
                      <span className="mt-0.5 line-clamp-2 text-xs font-medium leading-relaxed text-deepBlue/55">
                        {dept.description.ar}
                      </span>
                    </span>
                    <ChevronLeft className={['shrink-0 text-deepBlue/40 transition-transform', open ? '-rotate-90' : ''].join(' ')} size={18} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-deepBlue/[0.06] bg-emcBg px-4 pb-4 pt-3"
                      >
                        <ul className="space-y-2">
                          {dept.responsibilities.map((r) => (
                            <li key={r.ar} className="flex gap-2 text-xs font-semibold leading-relaxed text-deepBlue/80">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-customOrange" />
                              {r.ar}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function SpotlightPanel({
  selected,
  onClose,
}: {
  selected: PublicDepartment | null
  onClose: () => void
}) {
  return (
    <div className="relative min-h-[300px] overflow-hidden rounded-[1.35rem] border border-deepBlue/10 bg-white/90 shadow-emc-lg backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-l from-customBlue via-ocean to-deepBlue" />
      <div className="pointer-events-none absolute -right-20 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-customBlue/[0.07] blur-3xl" />
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative p-6 text-right sm:p-8"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-customBlue">معاينة الإدارة</p>
                <h3 className="mt-2 text-xl font-black leading-snug text-deepBlue sm:text-2xl">{selected.title.ar}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3 py-1.5 text-xs font-black text-deepBlue/45 transition hover:bg-deepBlue/[0.05] hover:text-deepBlue"
              >
                إغلاق
              </button>
            </div>
            <p className="mt-4 text-sm font-medium leading-8 text-deepBlue/72">{selected.description.ar}</p>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-customOrange">مسؤوليات رئيسية</p>
            <ul className="mt-3 space-y-2.5">
              {selected.responsibilities.map((r, idx) => (
                <motion.li
                  key={r.ar}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex gap-3 rounded-xl border border-deepBlue/[0.07] bg-emcBg px-3 py-2.5 text-sm font-semibold leading-relaxed text-deepBlue/88 shadow-sm"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-customBlue shadow-[0_0_8px_rgba(38,145,201,0.5)]" />
                  {r.ar}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex h-full min-h-[300px] flex-col justify-center p-8 text-right"
          >
            <p className="text-xs font-black text-customOrange">وضع الاستكشاف</p>
            <h3 className="mt-2 text-lg font-black text-deepBlue">اختر عقدة في الخريطة</h3>
            <p className="mt-3 text-sm leading-8 text-deepBlue/65">
              تُظهر اللوحة الجانبية وصف الإدارة ومسؤولياتها فور الاختيار — مع تمييز بصري للخطوط بين الإدارة العليا
              والوحدات المحيطة.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-customBlue/25 bg-customBlue/[0.08] px-3 py-1.5 text-[11px] font-black text-customBlue">
                خطوط EMC متدرجة
              </span>
              <span className="rounded-full border border-customOrange/30 bg-customOrange/[0.08] px-3 py-1.5 text-[11px] font-black text-deepBlue">
                تفاعل فوري
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
