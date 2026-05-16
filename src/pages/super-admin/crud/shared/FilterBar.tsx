import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type FilterBarProps = {
  searchValue: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string
  children?: React.ReactNode
  className?: string
}

export function CrudFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'بحث…',
  children,
  className,
}: FilterBarProps) {
  return (
    <div
      dir="rtl"
      className={cn(
        'flex flex-col gap-3 rounded-3xl border border-ink-100 bg-white/95 p-4 text-right shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <label className="relative block min-w-0 flex-[1] text-right sm:max-w-md">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-customBlue/50"
          aria-hidden
        />
        <input
          dir="rtl"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          type="search"
          className="w-full rounded-2xl border border-ink-100 bg-slate-50/80 py-2.5 ps-10 pe-4 text-right text-[13px] font-semibold text-foreground placeholder:text-right rtl:text-right outline-none transition focus:border-brand-400/60 focus:bg-white focus:ring-2 focus:ring-brand-400/25"
        />
      </label>
      {children ?
        <div className="flex flex-wrap gap-2 sm:justify-end">{children}</div>
      : null}
    </div>
  )
}

export function MiniSelect(props: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; labelAr: string }[]
}) {
  const { label, value, onChange, options } = props
  return (
    <label dir="rtl" className="flex flex-col items-stretch gap-1.5 text-right">
      <span className="text-[10px] font-black uppercase tracking-wide text-muted-500">{label}</span>
      <select
        dir="rtl"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[8.5rem] rounded-2xl border border-ink-100 bg-white px-3 py-2 text-right text-[12px] font-black text-deepBlue outline-none transition focus:border-customBlue focus:ring-2 focus:ring-brand-400/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.labelAr}
          </option>
        ))}
      </select>
    </label>
  )
}
