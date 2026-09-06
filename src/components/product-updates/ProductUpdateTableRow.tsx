import { forwardRef, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, Edit2, Eye, Send, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductUpdate } from '@/api/productUpdatesApi'
import {
  formatProductUpdateCount,
  formatProductUpdateShortDate,
} from '@/utils/productUpdateFormatters'
import { ROLE_LABELS, STATUS_META } from './productUpdateMeta'
import { TypeBadge } from './ProductUpdateBadges'

type Props = {
  item: ProductUpdate
  selected: boolean
  onOpen: () => void
  onEdit: () => void
  onPublish: () => void
  onDelete: () => void
}

function stop(e: React.MouseEvent | React.KeyboardEvent) {
  e.stopPropagation()
}

export const ProductUpdateTableRow = forwardRef<HTMLTableRowElement, Props>(function ProductUpdateTableRow(
  { item, selected, onOpen, onEdit, onPublish, onDelete },
  ref,
) {
  const reduce = useReducedMotion()
  const st = STATUS_META[item.status]

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onOpen()
      }
    },
    [onOpen],
  )

  return (
    <motion.tr
      ref={ref}
      tabIndex={0}
      role="button"
      aria-label={`عرض تفاصيل التحديث: ${item.title}`}
      aria-selected={selected}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -1, boxShadow: '0 8px 24px -12px rgba(15,23,42,0.12)' }}
      transition={{ duration: 0.18 }}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className={cn(
        'group cursor-pointer border-b border-ink-100/60 outline-none transition-colors duration-200',
        'hover:bg-brand-50/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-customBlue/40',
        selected && 'bg-brand-50/60',
      )}
    >
      <td className="px-4 py-3.5 text-right">
        <div className="flex items-start justify-between gap-2">
          <ChevronLeft
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-deepBlue transition group-hover:text-customBlue">
              {item.title}
            </p>
            {item.target_roles && item.target_roles.length > 0 && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-400">
                {item.target_roles.map((r) => ROLE_LABELS[r] ?? r).join('، ')}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-right">
        <TypeBadge item={item} />
      </td>
      <td className="px-4 py-3.5 text-right">
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold', st.color)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} aria-hidden />
          {st.label}
        </span>
      </td>
      <td className="px-4 py-3.5 text-right">
        <span
          className="text-xs font-semibold text-muted-500 tabular-nums"
          dir="ltr"
          style={{ unicodeBidi: 'isolate' }}
        >
          {item.published_at ? formatProductUpdateShortDate(item.published_at) : '—'}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div
          className="flex justify-end gap-0.5 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100"
          onClick={stop}
          onKeyDown={stop}
        >
          <button
            type="button"
            onClick={(e) => { stop(e); onOpen() }}
            title="عرض التفاصيل"
            aria-label="عرض التفاصيل"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-brand-50 hover:text-customBlue focus-visible:outline focus-visible:outline-2 focus-visible:outline-customBlue/50"
          >
            <Eye className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => { stop(e); onEdit() }}
            title="تعديل"
            aria-label="تعديل التحديث"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-brand-50 hover:text-customBlue focus-visible:outline focus-visible:outline-2 focus-visible:outline-customBlue/50"
          >
            <Edit2 className="h-4 w-4" aria-hidden />
          </button>
          {item.status === 'draft' && (
            <button
              type="button"
              onClick={(e) => { stop(e); onPublish() }}
              title="نشر"
              aria-label="نشر التحديث"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500/50"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { stop(e); onDelete() }}
            title="حذف"
            aria-label="حذف التحديث"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400/50"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {item.reads_count > 0 && (
          <p
            className="mt-1 text-end text-[10px] font-semibold text-muted-400 tabular-nums sm:hidden"
            dir="ltr"
          >
            {formatProductUpdateCount(item.reads_count)} قراءة
          </p>
        )}
      </td>
    </motion.tr>
  )
})
