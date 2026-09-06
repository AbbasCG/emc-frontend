import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Footer action strip for detail drawers / modals */
export function EntityActionMenu(props: {
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
  closeLabel?: string
  editLabel?: string
  deleteLabel?: string
  extraStart?: ReactNode
  className?: string
  deleteDisabled?: boolean
}) {
  const {
    onClose,
    onEdit,
    onDelete,
    closeLabel = 'إغلاق',
    editLabel = 'تحرير',
    deleteLabel = 'حذف',
    extraStart,
    className,
    deleteDisabled,
  } = props
  return (
    <div className={cn('flex flex-wrap items-center justify-start gap-2', className)} dir="rtl">
      {extraStart}
      {onEdit ?
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-w-[7rem] flex-1 items-center justify-center rounded-2xl bg-gradient-to-l from-[#0077B6] to-[#0C2A4B] px-4 py-2.5 text-[12px] font-black text-white shadow-md sm:flex-none"
        >
          {editLabel}
        </button>
      : null}
      {onDelete ?
        <button
          type="button"
          disabled={deleteDisabled}
          onClick={onDelete}
          className="inline-flex min-w-[6.5rem] items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12px] font-black text-rose-900 shadow-sm transition hover:bg-rose-100 disabled:pointer-events-none disabled:opacity-40"
        >
          {deleteLabel}
        </button>
      : null}
      <button
        type="button"
        onClick={onClose}
        className="inline-flex min-w-[6.5rem] items-center justify-center rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-[12px] font-black text-deepBlue shadow-sm"
      >
        {closeLabel}
      </button>
    </div>
  )
}
