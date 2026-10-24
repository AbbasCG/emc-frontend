import { useMemo, useState } from 'react'
import { AlertTriangle, Check, RefreshCw, Search, X } from 'lucide-react'
import type { MeetingCandidate, ParticipantStatus } from '@/types/operations'

export type PickerCandidate = MeetingCandidate & { status?: ParticipantStatus }

type Props = {
  /** The people the SERVER allows. The picker never widens this list. */
  candidates: PickerCandidate[]
  loading: boolean
  error?: string | null
  onRetry?: () => void
  selected: number[]
  onChange: (ids: number[]) => void
  /** Text for the empty list, e.g. "لا يوجد أعضاء مرتبطون بهذه الإدارة." */
  emptyText: string
  /** Aria label for the search box. */
  searchLabel?: string
}

const STATUS_BADGE: Partial<Record<ParticipantStatus, string>> = {
  joined: 'انضم',
  attended: 'حضر',
}

/**
 * Searchable multi-select over a list the server provided. Selected people show
 * as chips with the NAME only; each row shows name, a role/title when there is
 * one, and the department as secondary text.
 */
export function ParticipantPicker({ candidates, loading, error, onRetry, selected, onChange, emptyText, searchLabel = 'ابحث عن عضو' }: Props) {
  const [query, setQuery] = useState('')
  const chosen = useMemo(() => new Set(selected), [selected])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q === '' ? candidates : candidates.filter((c) => c.name.toLowerCase().includes(q) || (c.department ?? '').toLowerCase().includes(q))
  }, [candidates, query])

  function toggle(id: number) {
    onChange(chosen.has(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  function selectVisible(all: boolean) {
    const visibleIds = visible.map((c) => c.id)
    onChange(all ? Array.from(new Set([...selected, ...visibleIds])) : selected.filter((id) => !visibleIds.includes(id)))
  }

  const selectedPeople = candidates.filter((c) => chosen.has(c.id))
  const allVisibleChosen = visible.length > 0 && visible.every((c) => chosen.has(c.id))

  if (loading) {
    return (
      <div aria-busy="true" aria-label="جارٍ تحميل الأعضاء" className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
        <span className="inline-flex items-center gap-2">
          <AlertTriangle size={14} aria-hidden="true" />
          {error}
        </span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-rose-700 ring-1 ring-rose-200">
            <RefreshCw size={12} aria-hidden="true" />
            إعادة المحاولة
          </button>
        )}
      </div>
    )
  }

  if (candidates.length === 0) {
    return <p className="rounded-2xl bg-paper px-4 py-3 text-xs font-bold text-muted-500">{emptyText}</p>
  }

  return (
    <div className="space-y-3">
      {selectedPeople.length > 0 && (
        <ul aria-label="المحددون" className="flex flex-wrap gap-1.5">
          {selectedPeople.map((c) => (
            <li key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 ps-3 pe-1.5 text-[12px] font-black text-brand-700 ring-1 ring-brand-200">
              {c.name}
              <button
                type="button"
                onClick={() => toggle(c.id)}
                aria-label={`إزالة ${c.name}`}
                className="rounded-full p-0.5 transition hover:bg-brand-100"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{searchLabel}</span>
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${searchLabel}…`}
            className="w-full rounded-xl border border-line bg-white py-2 ps-9 pe-3 text-sm font-semibold text-navy outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
          />
        </label>
        <button
          type="button"
          onClick={() => selectVisible(!allVisibleChosen)}
          disabled={visible.length === 0}
          className="shrink-0 rounded-xl border border-line px-3 py-2 text-xs font-black text-navy transition hover:bg-slate-50 disabled:opacity-40"
        >
          {allVisibleChosen ? 'إلغاء تحديد الظاهر' : 'تحديد الظاهر'}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-paper px-4 py-3 text-xs font-bold text-muted-500">لا نتائج مطابقة للبحث.</p>
      ) : (
        <ul className="max-h-60 divide-y divide-line overflow-y-auto rounded-2xl border border-line bg-white">
          {visible.map((c) => {
            const on = chosen.has(c.id)
            const badge = c.status ? STATUS_BADGE[c.status] : undefined
            return (
              <li key={c.id}>
                <label className={`flex cursor-pointer items-center gap-3 px-3.5 py-2.5 transition hover:bg-paper ${on ? 'bg-brand-50/40' : ''}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(c.id)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-navy">{c.name}</span>
                    {(c.role_title || c.department) && (
                      <span className="block truncate text-[11px] font-semibold text-muted-500">
                        {[c.role_title, c.department].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                  {badge && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200">
                      <Check size={10} aria-hidden="true" />
                      {badge}
                    </span>
                  )}
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
