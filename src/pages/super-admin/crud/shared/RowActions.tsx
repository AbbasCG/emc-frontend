import { useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { DropdownPortal } from '@/components/ui/DropdownPortal'
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
  const anchorRef = useRef<HTMLDivElement>(null)

  return (
    <div dir="rtl" className="relative inline-flex justify-end" ref={anchorRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="grid h-9 w-9 place-items-center rounded-xl border border-ink-100 bg-white text-deepBlue shadow-sm transition hover:border-customBlue/40 hover:bg-brand-50"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      <DropdownPortal
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        align="end"
        className="min-w-[10.5rem] overflow-hidden rounded-2xl border border-ink-100 bg-white py-1 text-right shadow-[0_16px_50px_rgba(15,23,42,0.12)]"
      >
        <div role="menu" aria-label={ariaLabel}>
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              role="menuitem"
              disabled={a.disabled}
              onClick={(e) => {
                e.stopPropagation()
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
      </DropdownPortal>
    </div>
  )
}
