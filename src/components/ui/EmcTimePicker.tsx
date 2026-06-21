import { useEffect, useId, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropdownPortal } from '@/components/ui/DropdownPortal'

/** ArrowUp/ArrowDown/Home/End roving handler shared by the time columns. */
function listboxKeyDown(
  e: React.KeyboardEvent,
  items: number[],
  value: number,
  onSelect: (v: number) => void,
) {
  const idx = items.indexOf(value)
  const current = idx < 0 ? 0 : idx
  let next: number
  switch (e.key) {
    case 'ArrowDown':
      next = Math.min(items.length - 1, current + 1)
      break
    case 'ArrowUp':
      next = Math.max(0, current - 1)
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = items.length - 1
      break
    default:
      return
  }
  e.preventDefault()
  const target = items[next]
  if (target != null) onSelect(target)
}

function parseTime(v: string): { h: number; m: number } | null {
  const match = v.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return { h, m }
}

function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function addMinutesTo(v: string, minutes: number): string {
  const p = parseTime(v)
  if (!p) return v
  const total = (p.h * 60 + p.m + minutes) % (24 * 60)
  return formatTime(Math.floor(total / 60), total % 60)
}

function TimeColumn({
  label,
  items,
  value,
  onSelect,
  open,
}: {
  label: string
  items: number[]
  value: number
  onSelect: (v: number) => void
  open: boolean
}) {
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll the active option into view when the picker opens or the value moves.
  useEffect(() => {
    if (!open) return
    const list = listRef.current
    if (!list) return
    const el = list.querySelector<HTMLElement>(`[data-option-value="${value}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [open, value])

  return (
    <div className="min-w-0">
      <p className="mb-1 text-center text-[10px] font-bold text-slate-500">{label}</p>
      <div
        ref={listRef}
        role="listbox"
        aria-label={label}
        onKeyDown={(e) => listboxKeyDown(e, items, value, onSelect)}
        className="max-h-36 overflow-y-auto rounded-xl border border-[#22334A]/10 bg-white p-1 scrollbar-thin"
      >
        {items.map(item => {
          const active = item === value
          return (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected={active}
              data-option-value={item}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(item)}
              className={cn(
                'flex w-full items-center justify-center rounded-lg py-1.5 text-[12px] font-bold tabular-nums transition',
                active ? 'bg-[#2691C2] text-white' : 'text-[#22334A] hover:bg-slate-100',
              )}
            >
              {String(item).padStart(2, '0')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export type EmcTimePickerProps = {
  label: string
  value: string // HH:mm
  onChange: (v: string) => void
  error?: string
  required?: boolean
  /** If set, shows +30 دقيقة / +1 ساعة presets calculated from this start time */
  durationFrom?: string
}

export default function EmcTimePicker({ label, value, onChange, error, required, durationFrom }: EmcTimePickerProps) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const fieldId = useId()

  const parsed = parseTime(value)
  const [draftH, setDraftH] = useState(parsed?.h ?? 9)
  const [draftM, setDraftM] = useState(parsed?.m ?? 0)

  useEffect(() => {
    if (!open) return
    const p = parseTime(value)
    setDraftH(p?.h ?? 9)
    setDraftM(p?.m ?? 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function confirm() {
    onChange(formatTime(draftH, draftM))
    setOpen(false)
  }

  const showDurationPresets = Boolean(durationFrom && parseTime(durationFrom))
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  return (
    <div className="block text-right">
      <span className="text-[12px] font-black text-[#22334A]/70">
        {label}{required ? <span className="text-[#EC943C]"> *</span> : null}
      </span>
      <button
        ref={anchorRef}
        type="button"
        id={fieldId}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'mt-1.5 flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-right transition',
          error ? 'border-rose-400' : 'border-[#22334A]/12',
          'bg-white hover:border-[#2691C2]/30 focus:border-[#2691C2]/50 focus:outline-none focus:ring-4 focus:ring-[#2691C2]/10',
        )}
      >
        <Clock className="h-4 w-4 shrink-0 text-[#2691C2]" aria-hidden />
        <span className="min-w-0 flex-1">
          {value
            ? <span className="block text-[13px] font-semibold tabular-nums text-[#22334A]">{value}</span>
            : <span className="block text-[13px] font-semibold text-slate-400">اختر الوقت</span>
          }
        </span>
      </button>
      {error ? <p className="mt-1 text-[11px] font-bold text-rose-700">{error}</p> : null}

      <DropdownPortal
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        align="stretch"
        offset={8}
        layer="datetime"
        constrainViewport
        className="w-[min(100vw-1rem,16rem)]"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="overflow-hidden rounded-2xl border border-[#22334A]/10 bg-white shadow-[0_20px_50px_-12px_rgba(34,51,74,0.35)]"
          dir="rtl"
        >
          {showDurationPresets && (
            <div className="flex gap-1.5 border-b border-slate-100 bg-slate-50/80 p-2.5">
              {[
                { label: '+30 دقيقة', min: 30 },
                { label: '+1 ساعة', min: 60 },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const next = addMinutesTo(durationFrom!, p.min)
                    const np = parseTime(next)
                    if (np) { setDraftH(np.h); setDraftM(np.m) }
                    onChange(next)
                    setOpen(false)
                  }}
                  className="flex-1 rounded-lg border border-[#EC943C]/25 bg-[#EC943C]/10 px-2.5 py-1 text-[11px] font-black text-[#b36a1f] transition hover:bg-[#EC943C]/20"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <div className="px-3 py-3">
            <div className="grid grid-cols-2 gap-2">
              <TimeColumn label="ساعة" items={hours} value={draftH} onSelect={setDraftH} open={open} />
              <TimeColumn label="دقيقة" items={minutes} value={draftM} onSelect={setDraftM} open={open} />
            </div>
          </div>

          <div className="border-t border-slate-100 px-3 py-2.5">
            <p className="mb-2 text-center text-[13px] font-black tabular-nums text-[#2691C2]">
              {formatTime(draftH, draftM)}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-[#22334A]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirm}
                className="rounded-xl bg-[#2691C2] px-4 py-2 text-[11px] font-black text-white"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      </DropdownPortal>
    </div>
  )
}
