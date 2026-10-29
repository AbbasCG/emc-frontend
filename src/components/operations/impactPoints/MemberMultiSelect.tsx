import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Check, ChevronDown, RefreshCw, Search, X } from 'lucide-react'
import PersonAvatar from './PersonAvatar'
import { normalizeSearch } from './impactPointsUi'

export type SelectablePerson = {
  user_id: number
  name: string
  department: string | null
  role_title: string | null
}

type Props = {
  /** Accessible name of the combobox. */
  label: string
  people: SelectablePerson[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  status: 'loading' | 'ready' | 'error'
  onRetry?: () => void
  disabled?: boolean
  /** Shown when the server returned nobody in the caller's scope. */
  emptyText?: string
}

/**
 * Searchable multi-select for people.
 *
 * What is SHOWN where, deliberately:
 *   chip / selected value   the person's NAME ONLY (long titles never leak in)
 *   dropdown row            name on the main line; "department · title" muted below
 *
 * Search matches name, department and job title (email is not part of the
 * recipient payload by design). Keyboard: ↓/↑ move, Enter toggles, Esc closes,
 * Backspace on an empty search removes the last chip. Everything truncates
 * inside the field, so a very long name cannot widen the page.
 */
export default function MemberMultiSelect({
  label, people, selectedIds, onChange, status, onRetry, disabled = false,
  emptyText = 'لا يوجد أعضاء فريق ضمن نطاق صلاحيتك حالياً.',
}: Props) {
  const uid = useId()
  const listId = `${uid}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const selected = useMemo(
    () => selectedIds.map((id) => people.find((p) => p.user_id === id)).filter((p): p is SelectablePerson => Boolean(p)),
    [selectedIds, people],
  )

  const filtered = useMemo(() => {
    const needle = normalizeSearch(query)
    if (!needle) return people
    return people.filter((p) => normalizeSearch(`${p.name} ${p.department ?? ''} ${p.role_title ?? ''}`).includes(needle))
  }, [people, query])

  // Close when the user clicks or taps anywhere outside the control.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])

  const activeIndex = Math.min(active, Math.max(0, filtered.length - 1))
  const activePerson = filtered[activeIndex]

  function toggle(id: number) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
    setQuery('')
    inputRef.current?.focus()
  }

  function remove(id: number) {
    onChange(selectedIds.filter((x) => x !== id))
    inputRef.current?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      else setActive((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      if (open && activePerson) {
        e.preventDefault()
        toggle(activePerson.user_id)
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
      }
    } else if (e.key === 'Backspace' && query === '' && selectedIds.length > 0) {
      onChange(selectedIds.slice(0, -1))
    }
  }

  const showEmpty = status === 'ready' && people.length === 0
  const noMatches = status === 'ready' && people.length > 0 && filtered.length === 0

  return (
    <div ref={rootRef} className="relative">
      <div
        onClick={() => !disabled && inputRef.current?.focus()}
        className={`flex min-h-[2.75rem] w-full flex-wrap items-center gap-1.5 rounded-xl border bg-white px-2.5 py-1.5 transition-colors ${
          open ? 'border-brand-500 ring-2 ring-brand-500/15' : 'border-slate-200'
        } ${disabled ? 'opacity-60' : 'cursor-text'}`}
      >
        {selected.map((p) => (
          <span key={p.user_id} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-brand-50 py-1 ps-2.5 pe-1 text-xs font-black text-brand-600 ring-1 ring-brand-100">
            <span dir="auto" className="max-w-[11rem] truncate" title={p.name}>{p.name}</span>
            <button
              type="button"
              aria-label={`إزالة ${p.name}`}
              disabled={disabled}
              onClick={(e) => { e.stopPropagation(); remove(p.user_id) }}
              className="rounded-md p-0.5 text-brand-600/70 transition hover:bg-brand-100 hover:text-brand-600"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </span>
        ))}

        <div className="relative flex min-w-[8rem] flex-1 items-center">
          <input
            ref={inputRef}
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && activePerson ? `${uid}-opt-${activePerson.user_id}` : undefined}
            autoComplete="off"
            disabled={disabled}
            value={query}
            placeholder={selected.length === 0 ? 'اختر المتطوعين…' : 'أضف عضواً آخر…'}
            onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="w-full min-w-0 bg-transparent py-1 text-sm font-semibold text-navy outline-none placeholder:font-medium placeholder:text-muted-400"
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setOpen((o) => !o); inputRef.current?.focus() }}
            className="shrink-0 rounded-md p-1 text-muted-500 hover:bg-slate-100"
          >
            <ChevronDown size={16} aria-hidden="true" className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {status === 'loading' ? (
            <p role="status" className="flex items-center gap-2 px-4 py-5 text-xs font-bold text-muted-500">
              <RefreshCw size={14} className="animate-spin" aria-hidden="true" /> جارٍ تحميل الأعضاء…
            </p>
          ) : status === 'error' ? (
            <p className="px-4 py-5 text-center text-xs font-bold text-rose-600">تعذر تحميل الأعضاء.</p>
          ) : showEmpty ? (
            <p className="px-4 py-5 text-center text-xs font-bold text-muted-500">{emptyText}</p>
          ) : noMatches ? (
            <p role="status" className="flex flex-col items-center gap-1 px-4 py-6 text-center text-xs font-bold text-muted-500">
              <Search size={18} className="text-slate-300" aria-hidden="true" />
              لا نتائج مطابقة «{query.trim()}»
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-multiselectable="true" aria-label={label} className="max-h-64 overflow-y-auto py-1.5">
              {filtered.map((p, i) => {
                const isSelected = selectedIds.includes(p.user_id)
                const meta = [p.department, p.role_title].filter(Boolean).join(' · ')
                return (
                  <li
                    key={p.user_id}
                    id={`${uid}-opt-${p.user_id}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => toggle(p.user_id)}
                    className={`mx-1.5 flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors ${
                      i === activeIndex ? 'bg-slate-100' : ''
                    } ${isSelected ? 'bg-brand-50/70' : ''}`}
                  >
                    <PersonAvatar name={p.name} id={p.user_id} />
                    <div className="min-w-0 flex-1">
                      <p dir="auto" className="truncate text-right text-sm font-black text-navy" title={p.name}>{p.name}</p>
                      {meta && <p dir="auto" className="truncate text-right text-[11px] font-semibold text-muted-500" title={meta}>{meta}</p>}
                    </div>
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300'}`}
                    >
                      {isSelected && <Check size={13} />}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}

          {selectedIds.length > 0 && status === 'ready' && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-bold text-muted-600">
              <span>{selectedIds.length} محدد</span>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onChange([])} className="font-black text-brand-600 hover:underline">
                مسح التحديد
              </button>
            </div>
          )}
        </div>
      )}

      {status === 'error' && (
        <div role="alert" className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
          <span className="text-xs font-bold text-rose-700">تعذر تحميل قائمة الأعضاء المستحقين.</span>
          {onRetry && (
            <button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-black text-navy ring-1 ring-rose-200">
              <RefreshCw size={12} aria-hidden="true" /> إعادة المحاولة
            </button>
          )}
        </div>
      )}

      {showEmpty && !open && <p className="mt-2 text-xs font-bold text-muted-500">{emptyText}</p>}
    </div>
  )
}
