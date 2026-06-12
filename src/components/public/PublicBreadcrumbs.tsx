import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export type Crumb = { label: string; href?: string }

export default function PublicBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="مسار التصفح" className="mb-6 flex flex-wrap items-center gap-1 text-[12px] font-bold text-white/55">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 ?
              <ChevronLeft className="h-3.5 w-3.5 rotate-180 opacity-50" aria-hidden />
            : null}
            {item.href && !isLast ?
              <Link to={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            : <span className={isLast ? 'text-white/90' : undefined}>{item.label}</span>}
          </span>
        )
      })}
    </nav>
  )
}
