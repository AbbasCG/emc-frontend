import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FilterBarProps = {
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
      className={cn('flex flex-col gap-2.5 sm:flex-row sm:items-center', className)}
    >
      <label className="relative block min-w-0 flex-[1.5] sm:max-w-[28rem]">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          dir="rtl"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          type="search"
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 ps-10 pe-4 text-right text-[13px] font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#0077B6]/50 focus:bg-white focus:ring-2 focus:ring-[#0077B6]/12"
        />
      </label>

      {children ?
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      : null}
    </div>
  )
}

/** Compact filter pill — no visible label, uses aria-label for a11y. Active state turns blue. */
export function MiniSelect(props: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; labelAr: string }[]
  disabled?: boolean
}) {
  const { label, value, onChange, options, disabled } = props
  const isActive = value !== (options[0]?.value ?? 'all')

  return (
    <select
      dir="rtl"
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-10 min-w-[7.5rem] cursor-pointer rounded-xl border px-3 pe-7 text-right text-[12.5px] font-semibold outline-none transition appearance-none',
        isActive
          ? 'border-[#0077B6]/40 bg-[#0077B6]/8 text-[#1a6e9a] font-black'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
        'focus:border-[#0077B6]/50 focus:ring-2 focus:ring-[#0077B6]/12',
        disabled && 'cursor-not-allowed opacity-45',
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.labelAr}
        </option>
      ))}
    </select>
  )
}
