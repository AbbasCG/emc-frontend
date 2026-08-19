import { useEffect } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { SITE_INDEX } from './siteIndex'

/**
 * Site index — every destination the old mega-dropdowns carried, but organised
 * instead of stacked: the visitor reads FOUR main sections first, and only the
 * chosen one unfolds its pages. Two panes, hairline separated, no cards, no
 * shadows (§1).
 */

type Props = {
  /** Dark shell (over the home hero) inverts the sheet. */
  dark?: boolean
  /** Which main section is unfolded — owned by the bar so its triggers stay in sync. */
  activeIndex: number
  onActiveIndexChange: (index: number) => void
  onClose: () => void
}

export default function SiteIndexPanel({ dark = false, activeIndex, onActiveIndexChange, onClose }: Props) {
  const setActiveIndex = onActiveIndexChange
  const active = SITE_INDEX[activeIndex] ?? SITE_INDEX[0]

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const sectionIdle = dark ? 'text-white/60 hover:text-white' : 'text-ink-400 hover:text-deepBlue'
  const sectionActive = dark ? 'text-white' : 'text-deepBlue'

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      className={[
        'absolute inset-x-0 top-full border-t',
        dark ? 'border-white/12 bg-night/95 backdrop-blur-xl' : 'border-line bg-white',
      ].join(' ')}
    >
      <div className="mx-auto grid max-w-7xl gap-x-12 px-4 py-9 sm:px-6 lg:grid-cols-[15rem_1fr] lg:px-8">
        {/* Pane A the four main sections. This is what gets scanned first. */}
        <nav aria-label="أقسام الموقع" className="mb-8 lg:mb-0">
          <ul className="space-y-1">
            {SITE_INDEX.map((group, i) => {
              const isActive = i === activeIndex
              return (
                <li key={group.title}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onFocus={() => setActiveIndex(i)}
                    onClick={() => setActiveIndex(i)}
                    aria-current={isActive ? 'true' : undefined}
                    className={[
                      'group/sec relative block w-full rounded-lg py-2.5 pe-2 ps-4 text-start transition-colors duration-200',
                      isActive ? (dark ? 'bg-white/[0.06]' : 'bg-paper2/70') : '',
                    ].join(' ')}
                  >
                    <span
                      aria-hidden
                      className={[
                        'absolute inset-y-2 start-0 w-[3px] rounded-full bg-sky transition-transform duration-300 ease-emc-out',
                        isActive ? 'scale-y-100' : 'scale-y-0 group-hover/sec:scale-y-100',
                      ].join(' ')}
                    />
                    <span
                      className={[
                        'block font-display text-lg font-black transition-colors duration-200',
                        isActive ? sectionActive : sectionIdle,
                      ].join(' ')}
                    >
                      {group.title}
                    </span>
                    <span
                      className={[
                        'mt-0.5 block text-xs leading-relaxed',
                        dark ? 'text-white/45' : 'text-ink-400',
                      ].join(' ')}
                    >
                      {group.lead}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Pane B only the chosen section's pages. */}
        <div
          className={[
            'lg:border-s lg:ps-12',
            dark ? 'lg:border-white/10' : 'lg:border-line',
          ].join(' ')}
        >
          <motion.ul
            key={active.title}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="grid gap-x-8 gap-y-0.5 sm:grid-cols-2"
          >
            {active.links.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  onClick={onClose}
                  className={[
                    'group/idx relative block rounded-lg py-2.5 pe-2 ps-3 transition-colors duration-200',
                    dark ? 'hover:bg-white/[0.06]' : 'hover:bg-paper2/60',
                  ].join(' ')}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-2 start-0 w-[3px] origin-center scale-y-0 rounded-full bg-customOrange transition-transform duration-300 ease-emc-out group-hover/idx:scale-y-100"
                  />
                  <span
                    className={[
                      'flex items-center gap-1.5 text-sm font-bold',
                      dark ? 'text-white' : 'text-ink-900',
                    ].join(' ')}
                  >
                    {link.label}
                    <ArrowLeftIcon
                      size={13}
                      className={[
                        'opacity-0 transition-opacity duration-200 group-hover/idx:opacity-100',
                        dark ? 'text-ice' : 'text-customBlue',
                      ].join(' ')}
                    />
                  </span>
                  <span
                    className={[
                      'mt-0.5 block text-xs leading-relaxed',
                      dark ? 'text-white/50' : 'text-ink-400',
                    ].join(' ')}
                  >
                    {link.description}
                  </span>
                </Link>
              </li>
            ))}
          </motion.ul>
        </div>
      </div>
    </motion.div>
  )
}
