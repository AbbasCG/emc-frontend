import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type KeyboardEvent } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

export type AnimatedSelectOption = {
  value: string
  label: string
  /** Extra searchable strings (English name, ISO, demonym aliases, …). */
  keywords?: string[]
  /** Optional leading node (e.g. flag). */
  leading?: ReactNode
  /** Optional trailing meta (e.g. ISO code) shown beside the label. */
  meta?: string
}

type Props = {
  value: string
  onChange: (value: string) => void
  options: AnimatedSelectOption[]
  placeholder?: string
  error?: string
  ariaLabel?: string
  disabled?: boolean
  searchable?: boolean
  searchPlaceholder?: string
}

/**
 * Custom animated dropdown — replaces a native <select> where consistent EMC
 * styling + hover/selected visual states matter. Hover only previews visually;
 * it never changes `value` — only click/Enter commits a selection.
 */
export default function AnimatedSelect({
  value,
  onChange,
  options,
  placeholder = 'اختر',
  error,
  ariaLabel,
  disabled,
  searchable = false,
  searchPlaceholder = 'ابحث…',
}: Props) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => {
      if (o.label.toLowerCase().includes(q)) return true
      if (o.value.toLowerCase().includes(q)) return true
      return (o.keywords ?? []).some((k) => k.toLowerCase().includes(q))
    })
  }, [options, query])

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  // Clear the search + highlight when the menu closes — render-phase
  // adjustment (docs/04-references/effect-patterns.md §P2), not a setState
  // inside an effect.
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (!open) {
      setQuery('')
      setActiveIndex(-1)
    }
  }

  useEffect(() => {
    if (open && searchable) {
      // Focus search when the menu opens.
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open, searchable])

  function commit(next: string) {
    onChange(next)
    setOpen(false)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (disabled) return
    if (e.key === 'Enter' || (e.key === ' ' && !searchable)) {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      if (activeIndex >= 0 && filtered[activeIndex]) commit(filtered[activeIndex].value)
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Tab') setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`flex min-h-[42px] w-full items-center justify-between gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:ring-2 focus:ring-customBlue/15 disabled:opacity-60 ${
          error ? 'border-red-300' : 'border-slate-200'
        }`}
      >
        <span className={`flex min-w-0 items-center gap-2 ${selected ? 'text-deepBlue' : 'text-slate-400'}`}>
          {selected?.leading}
          <span className="truncate">{selected?.label ?? placeholder}</span>
          {selected?.meta ? (
            <span className="shrink-0 font-black tracking-wide text-slate-400" dir="ltr">
              {selected.meta}
            </span>
          ) : null}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          style={{ animation: 'emc-select-open 170ms ease' }}
        >
          {searchable && (
            <div className="border-b border-slate-100 p-2">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200 focus-within:ring-customBlue/30">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setActiveIndex(0)
                  }}
                  onKeyDown={onKeyDown}
                  placeholder={searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-deepBlue outline-none placeholder:text-slate-400"
                  aria-label={searchPlaceholder}
                />
              </div>
            </div>
          )}
          <ul
            id={listId}
            role="listbox"
            className="max-h-64 overflow-auto p-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs font-semibold text-slate-400">لا توجد نتائج</li>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value
                const isActive = i === activeIndex
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commit(opt.value)}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold [transition:background-color_160ms_ease,color_160ms_ease,transform_160ms_ease] ${
                      isSelected
                        ? 'bg-customBlue font-bold text-white'
                        : isActive
                          ? '-translate-x-[3px] text-customBlue'
                          : 'text-deepBlue'
                    }`}
                    style={!isSelected && isActive ? { backgroundColor: 'rgba(38, 145, 194, 0.10)' } : undefined}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      {opt.leading}
                      <span className="truncate">{opt.label}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {opt.meta ? (
                        <span
                          className={`font-black tracking-wide ${isSelected ? 'text-white/85' : 'text-slate-400'}`}
                          dir="ltr"
                        >
                          {opt.meta}
                        </span>
                      ) : null}
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </span>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
      {error && <span className="mt-1 block text-[11px] font-bold text-red-600">{error}</span>}
      <style>{`
        @keyframes emc-select-open {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
