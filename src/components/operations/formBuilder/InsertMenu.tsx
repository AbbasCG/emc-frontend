import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { QuestionType } from '@/types/operations'
import { BLOCK_GROUPS, LIBRARY_TYPES, TYPE_SPECS } from './questionTypes'

/** A small menu of every block, for "add here" on the canvas. Picking one inserts it where the menu was opened. */
export default function InsertMenu({
  label,
  onPick,
  children,
  className,
  testId,
}: {
  /** Accessible name of the button that opens the menu. */
  label: string
  onPick: (type: QuestionType) => void
  children: ReactNode
  className?: string
  testId?: string
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLSpanElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const outside = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)

    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <span ref={root} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        data-testid={testId}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className={className}
      >
        {children}
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          aria-label={label}
          dir="rtl"
          className="absolute end-0 top-full z-30 mt-1 max-h-80 w-64 overflow-y-auto rounded-2xl bg-white p-2 text-right shadow-xl ring-1 ring-deepBlue/10"
          onClick={(e) => e.stopPropagation()}
        >
          {BLOCK_GROUPS.map((group) => (
            <div key={group.key} className="mb-1">
              <p className="px-2 py-1 text-[10px] font-black text-slate-400">{group.label}</p>
              {LIBRARY_TYPES.filter((t) => TYPE_SPECS[t].group === group.key).map((type) => {
                const spec = TYPE_SPECS[type]
                const Icon = spec.icon

                return (
                  <button
                    key={type}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false)
                      onPick(type)
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold text-deepBlue hover:bg-customBlue/10"
                  >
                    <Icon size={15} aria-hidden className="text-customBlue" />
                    {spec.label}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </span>
  )
}
