import { useState, useEffect, useRef } from 'react'
import { X, Search } from 'lucide-react'
import { fetchAdminCoursesPage } from '@/api/superAdminCatalogApi'
import type { Course } from '@/types'

export type ChipItem = { id: number; label: string }

interface Props {
  chips: ChipItem[]
  onAdd: (chip: ChipItem) => void
  onRemove: (id: number) => void
  className?: string
}

function useDebounce<T>(val: T, ms: number): T {
  const [deb, setDeb] = useState(val)
  useEffect(() => {
    const id = setTimeout(() => setDeb(val), ms)
    return () => clearTimeout(id)
  }, [val, ms])
  return deb
}

export function CourseMultiChipSearch({ chips, onAdd, onRemove, className = '' }: Props) {
  const [text, setText]             = useState('')
  const [suggestions, setSuggestions] = useState<Course[]>([])
  const [open, setOpen]             = useState(false)
  const [active, setActive]         = useState(-1)
  const [busy, setBusy]             = useState(false)

  const inputRef     = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedText = useDebounce(text, 300)

  useEffect(() => {
    if (!debouncedText.trim()) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setBusy(true)
    fetchAdminCoursesPage({ search: debouncedText.trim(), per_page: 8 })
      .then((result) => {
        const rows = result?.rows ?? []
        const filtered = rows.filter((r) => !chips.find((c) => c.id === r.id))
        setSuggestions(filtered)
        setOpen(filtered.length > 0)
        setActive(-1)
      })
      .finally(() => setBusy(false))
  }, [debouncedText, chips])

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function addSuggestion(s: Course) {
    onAdd({ id: s.id, label: s.title })
    setText('')
    setSuggestions([])
    setOpen(false)
    setActive(-1)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((p) => Math.min(p + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((p) => Math.max(p - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0 && suggestions[active]) {
        addSuggestion(suggestions[active])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    } else if (e.key === 'Backspace' && text === '' && chips.length > 0) {
      onRemove(chips[chips.length - 1].id)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`} dir="rtl">
      {/* Input + chips */}
      <div
        className="flex min-h-[2.625rem] flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 cursor-text transition focus-within:border-[#2691C2] focus-within:ring-1 focus-within:ring-[#2691C2]/20"
        onClick={() => inputRef.current?.focus()}
      >
        <Search size={14} className="shrink-0 text-slate-400" aria-hidden />

        {chips.map((chip) => (
          <span
            key={chip.id}
            className="inline-flex items-center gap-1 rounded-lg bg-[#2691C2]/10 px-2 py-0.5 text-[11px] font-black text-[#2691C2]"
          >
            {chip.label}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(chip.id) }}
              className="hover:text-[#22334A] transition-colors"
              aria-label={`إزالة ${chip.label}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={chips.length === 0 ? 'ابحث بالعنوان، المدرب، slug…' : 'أضف بحثاً آخر…'}
          className="min-w-[140px] flex-1 border-none bg-transparent text-[12px] font-semibold text-deepBlue placeholder-slate-400 outline-none"
          aria-label="البحث عن دورة"
          aria-expanded={open}
          aria-autocomplete="list"
          role="combobox"
        />

        {busy && (
          <span className="h-3 w-3 animate-spin rounded-full border border-[#2691C2] border-t-transparent" aria-hidden />
        )}
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <ul
          className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg"
          role="listbox"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === active}
              className={[
                'flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-[12px] transition',
                i === active
                  ? 'bg-[#2691C2]/8 text-[#2691C2]'
                  : 'text-deepBlue hover:bg-slate-50',
              ].join(' ')}
              onMouseEnter={() => setActive(i)}
              onClick={() => addSuggestion(s)}
            >
              <span className="min-w-0 flex-1 truncate font-black">{s.title}</span>
              {s.slug && (
                <code className="shrink-0 text-[10px] text-slate-400">{s.slug}</code>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
