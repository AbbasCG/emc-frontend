import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MenuAction = { key: string; label: string; onClick: () => void; destructive?: boolean; disabled?: boolean }

export function RowActionsMenu({
  ariaLabel,
  actions,
}: {
  ariaLabel: string
  actions: MenuAction[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div dir="rtl" className="relative inline-flex justify-end" ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-xl border border-ink-100 bg-white text-deepBlue shadow-sm transition hover:border-customBlue/40 hover:bg-brand-50"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open ?
        <div
          dir="rtl"
          className={cn(
            'absolute end-0 z-30 mt-1 min-w-[10.5rem] overflow-hidden rounded-2xl border border-ink-100 bg-white py-1 text-right shadow-[0_16px_50px_rgba(15,23,42,0.12)]',
          )}
        >
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={a.disabled}
              onClick={() => {
                if (!a.disabled) {
                  setOpen(false)
                  a.onClick()
                }
              }}
              className={cn(
                'block w-full px-4 py-2.5 text-right text-[12px] font-black rtl:text-right transition-colors',
                a.destructive ? 'text-red-700 hover:bg-red-50' : 'text-deepBlue hover:bg-brand-50',
                a.disabled ? 'cursor-not-allowed opacity-45' : '',
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      : null}
    </div>
  )
}
