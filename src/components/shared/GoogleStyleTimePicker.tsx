import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropdownPortal } from '@/components/ui/DropdownPortal'

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseTime(v: string): { h: number; m: number } | null {
  const match = v.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return { h, m }
}

function fmt(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function toMinutes(v: string): number | null {
  const p = parseTime(v)
  return p ? p.h * 60 + p.m : null
}

function buildOptions(step: number, min?: string, max?: string): string[] {
  const minM = min ? toMinutes(min) : null
  const maxM = max ? toMinutes(max) : null
  const opts: string[] = []
  for (let total = 0; total < 24 * 60; total += step) {
    const h = Math.floor(total / 60)
    const m = total % 60
    if (minM !== null && total < minM) continue
    if (maxM !== null && total > maxM) continue
    opts.push(fmt(h, m))
  }
  return opts
}

// ─── props ────────────────────────────────────────────────────────────────────

export type GoogleStyleTimePickerProps = {
  value: string | null
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  minuteStep?: 5 | 10 | 15 | 30
  minTime?: string
  maxTime?: string
  error?: string
  className?: string
}

// ─── component ────────────────────────────────────────────────────────────────

export default function GoogleStyleTimePicker({
  value,
  onChange,
  label,
  placeholder = 'اختر الوقت',
  disabled = false,
  required = false,
  minuteStep = 15,
  minTime,
  maxTime,
  error,
  className,
}: GoogleStyleTimePickerProps) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const listRef   = useRef<HTMLUListElement>(null)
  const [open, setOpen]       = useState(false)
  const [rawInput, setRawInput] = useState('')
  const [inputMode, setInputMode] = useState(false)
  const [focusIdx, setFocusIdx]   = useState(-1)
  const fieldId = useId()
  const listId  = useId()

  const options = buildOptions(minuteStep, minTime, maxTime)

  // scroll selected item into view on open
  useEffect(() => {
    if (!open) return
    setRawInput(value ?? '')
    setInputMode(false)
    const idx = value ? options.indexOf(value) : -1
    setFocusIdx(idx >= 0 ? idx : 0)
    // give portal a tick to render
    requestAnimationFrame(() => {
      if (!listRef.current) return
      const item = listRef.current.children[idx >= 0 ? idx : 0] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'center' })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // focus the list item on focusIdx change
  useEffect(() => {
    if (!open || focusIdx < 0) return
    const item = listRef.current?.children[focusIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [open, focusIdx])

  const close = useCallback(() => {
    setOpen(false)
    setInputMode(false)
  }, [])

  function select(opt: string) {
    onChange(opt)
    close()
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = rawInput.trim()
      if (parseTime(trimmed)) {
        onChange(trimmed.length === 4 ? `0${trimmed}` : trimmed)
        close()
      }
    }
    if (e.key === 'Escape') { close(); anchorRef.current?.focus() }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setInputMode(false)
      setFocusIdx(0)
    }
  }

  function handleListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusIdx(i => Math.min(i + 1, options.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (focusIdx === 0) { setInputMode(true); setTimeout(() => inputRef.current?.focus(), 0) }
      else setFocusIdx(i => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (focusIdx >= 0) select(options[focusIdx])
    }
    if (e.key === 'Escape') { close(); anchorRef.current?.focus() }
    if (e.key === 'Tab') close()
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) }
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true) }
  }

  const displayValue = value && parseTime(value) ? value : null

  return (
    <div className={cn('block text-right', className)} dir="rtl">
      {label && (
        <label
          htmlFor={fieldId}
          className="mb-1.5 block text-[12px] font-black text-[#0C2A4B]/70"
        >
          {label}
          {required && <span className="text-[#F28C00]"> *</span>}
        </label>
      )}

      <button
        ref={anchorRef}
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label ?? placeholder}
        onKeyDown={handleTriggerKeyDown}
        onClick={() => !disabled && setOpen(v => !v)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-right transition',
          error
            ? 'border-rose-400 focus:ring-rose-200'
            : 'border-[#0C2A4B]/12 hover:border-[#0077B6]/40 focus:border-[#0077B6]/60',
          'bg-white focus:outline-none focus:ring-4 focus:ring-[#0077B6]/10',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <Clock className="h-4 w-4 shrink-0 text-[#0077B6]" aria-hidden />
        <span className="min-w-0 flex-1 font-semibold tabular-nums" style={{ fontSize: 13 }}>
          {displayValue
            ? <span className="text-[#0C2A4B]">{displayValue}</span>
            : <span className="text-slate-400">{placeholder}</span>}
        </span>
      </button>

      {error && (
        <p role="alert" className="mt-1 text-[11px] font-bold text-rose-700">{error}</p>
      )}

      <DropdownPortal
        open={open}
        anchorRef={anchorRef}
        onClose={close}
        align="start"
        offset={6}
        layer="datetime"
        constrainViewport
        className="w-[min(100vw-1rem,13rem)]"
      >
        <div
          role="dialog"
          aria-label={label ?? 'اختر الوقت'}
          className="overflow-hidden rounded-2xl border border-[#0C2A4B]/8 bg-white shadow-[0_8px_30px_-6px_rgba(12,42,75,0.22),0_2px_8px_-2px_rgba(12,42,75,0.12)]"
          dir="rtl"
        >
          {/* manual typing row */}
          <div className="border-b border-slate-100 px-3 py-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 focus-within:border-[#0077B6]/50 focus-within:ring-2 focus-within:ring-[#0077B6]/10">
              <Clock className="h-3.5 w-3.5 shrink-0 text-[#0077B6]/60" aria-hidden />
              <input
                ref={inputRef}
                type="text"
                dir="ltr"
                inputMode="numeric"
                placeholder="HH:mm"
                value={rawInput}
                aria-label="أدخل الوقت يدوياً"
                onChange={(e) => {
                  setRawInput(e.target.value)
                  setInputMode(true)
                  // live select when format matches
                  const t = e.target.value.trim()
                  if (parseTime(t)) {
                    const normalised = t.length === 4 ? `0${t}` : t
                    const idx = options.indexOf(normalised)
                    if (idx >= 0) setFocusIdx(idx)
                  }
                }}
                onKeyDown={handleInputKeyDown}
                className="min-w-0 flex-1 bg-transparent font-mono text-[13px] font-semibold text-[#0C2A4B] outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* options list */}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label ?? 'خيارات الوقت'}
            tabIndex={0}
            onKeyDown={handleListKeyDown}
            className="max-h-52 overflow-y-auto overscroll-contain py-1 scrollbar-thin focus:outline-none"
          >
            {options.map((opt, i) => {
              const isSelected = opt === value
              const isFocused  = i === focusIdx && !inputMode
              return (
                <li
                  key={opt}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(opt)}
                  className={cn(
                    'mx-1 flex cursor-pointer items-center rounded-xl px-3 py-1.5 font-mono text-[13px] font-semibold tabular-nums transition-colors select-none',
                    isSelected
                      ? 'bg-[#1565C0] text-white'
                      : isFocused
                      ? 'bg-[#0077B6]/10 text-[#0C2A4B]'
                      : 'text-[#0C2A4B] hover:bg-slate-100',
                  )}
                >
                  {opt}
                  {isSelected && (
                    <svg className="mr-auto h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
                    </svg>
                  )}
                </li>
              )
            })}
            {options.length === 0 && (
              <li className="px-4 py-3 text-center text-[12px] text-slate-400">لا توجد خيارات</li>
            )}
          </ul>
        </div>
      </DropdownPortal>
    </div>
  )
}
