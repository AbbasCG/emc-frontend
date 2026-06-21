import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { dropdownMotion } from '@/utils/animations'
import { routeMatchesPath } from '@/utils/routeMatch'

function dropdownItemActive(
  pathname: string,
  locationHash: string,
  href: string,
  items: MegaDropdownItem[]
): boolean {
  const path = href.split('#')[0] ?? href
  const frag = href.split('#')[1]
  if (!routeMatchesPath(pathname, path)) return false

  if (frag) {
    return (locationHash || '') === `#${frag}`
  }

  const hashedSibling = items.some((i) => {
    const [p, f] = i.href.split('#')
    return Boolean(f) && (p ?? i.href) === path
  })
  if (hashedSibling) {
    const h = locationHash || ''
    return h === '' || h === '#'
  }

  return true
}

export type MegaDropdownItem = {
  href: string
  label: string
  description: string
  icon: LucideIcon
}

type MegaDropdownProps = {
  label: string
  items: MegaDropdownItem[]
  isOpen: boolean
  onToggle: () => void
  isActive: boolean
  pathname: string
  locationHash: string
}

export default function MegaDropdown({
  label,
  items,
  isOpen,
  onToggle,
  isActive,
  pathname,
  locationHash,
}: MegaDropdownProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={[
          'flex min-h-[2.625rem] items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold tracking-tight transition-all duration-200 ease-out',
          isOpen || isActive
            ? 'bg-customBlue/[0.1] text-customBlue shadow-[inset_0_0_0_1px_rgba(0, 119, 182,0.28)] backdrop-blur-sm'
            : 'text-deepBlue hover:bg-white/80 hover:text-customBlue hover:shadow-emc-xs',
        ].join(' ')}
      >
        {label}
        <ChevronDown
          size={15}
          strokeWidth={2.5}
          className={['opacity-60 transition-transform duration-200', isOpen ? '-rotate-180' : ''].join(' ')}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownMotion}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-0 top-full z-50 mt-3 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-deepBlue/[0.08] bg-white/95 shadow-emc-lg ring-1 ring-white/80 backdrop-blur-xl"
            role="menu"
          >
            <div className="border-b border-deepBlue/[0.06] bg-gradient-to-l from-customBlue/[0.12] via-white to-emcBg px-5 py-3.5">
              <p className="text-right text-[12px] font-black text-customBlue/90">{label}</p>
              <p className="mt-1 text-right text-xs font-semibold leading-relaxed text-deepBlue/65">
                انتقال سريع ضمن منظومة EMC
              </p>
            </div>
            <div className="max-h-[min(70vh,26rem)] overflow-y-auto p-2.5">
              {items.map((item) => {
                const Icon = item.icon
                const itemActive = dropdownItemActive(pathname, locationHash, item.href, items)
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    role="menuitem"
                    className={[
                      'group flex gap-3.5 rounded-xl p-3 text-right transition-colors duration-150',
                      itemActive
                        ? 'bg-customBlue/[0.1] shadow-[inset_0_0_0_1px_rgba(38,145,201,0.25)]'
                        : 'hover:bg-[#F8FBFE]',
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-150',
                        itemActive
                          ? 'bg-customBlue text-white'
                          : 'bg-deepBlue/[0.04] text-customBlue group-hover:bg-customBlue group-hover:text-white',
                      ].join(' ')}
                    >
                      <Icon size={20} strokeWidth={2} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <p
                        className={[
                          'text-sm font-black leading-snug',
                          itemActive ? 'text-customBlue' : 'text-deepBlue group-hover:text-customBlue',
                        ].join(' ')}
                      >
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-deepBlue/55">{item.description}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
