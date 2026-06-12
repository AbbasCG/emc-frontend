import type { ChangeEvent, ReactNode } from 'react'
import { Search } from 'lucide-react'
import PublicBreadcrumbs, { type Crumb } from './PublicBreadcrumbs'

type PublicCatalogHeroProps = {
  eyebrow: string
  title: string
  subtitle: string
  breadcrumbs?: Crumb[]
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  actions?: ReactNode
}

export default function PublicCatalogHero({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  searchPlaceholder = 'ابحث…',
  searchValue = '',
  onSearchChange,
  actions,
}: PublicCatalogHeroProps) {
  function handleSearch(e: ChangeEvent<HTMLInputElement>) {
    onSearchChange?.(e.target.value)
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-ink-900 via-deepBlue to-[#1a2a3f] pt-28 pb-14 text-right" dir="rtl">
      <div
        aria-hidden
        className="pointer-events-none absolute -start-24 top-0 h-72 w-72 rounded-full bg-[#2691C2]/20 blur-[100px]"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {breadcrumbs && breadcrumbs.length > 0 ?
          <PublicBreadcrumbs items={breadcrumbs} />
        : null}
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#EC943C]">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-white md:text-4xl lg:text-[2.65rem]">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-white/70 md:text-base">{subtitle}</p>

        {onSearchChange ?
          <div className="relative mt-8 max-w-xl">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              value={searchValue}
              onChange={handleSearch}
              placeholder={searchPlaceholder}
              className="w-full rounded-2xl border border-white/10 bg-white/10 py-3.5 pe-4 ps-12 text-sm font-semibold text-white placeholder:text-white/40 backdrop-blur-sm focus:border-[#2691C2]/50 focus:outline-none focus:ring-2 focus:ring-[#2691C2]/30"
              dir="rtl"
            />
          </div>
        : null}

        {actions ?
          <div className="mt-6 flex flex-wrap gap-3">{actions}</div>
        : null}
      </div>
    </section>
  )
}
