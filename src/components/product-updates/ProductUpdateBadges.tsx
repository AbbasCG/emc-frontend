import type { ProductUpdate } from '@/api/productUpdatesApi'
import { cn } from '@/lib/utils'
import { getTypeMeta } from './productUpdateMeta'

export function TypeBadge({ item }: { item: ProductUpdate }) {
  const m = getTypeMeta(item)
  const Icon = m.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold', m.bg, m.color)}>
      <Icon className="h-3 w-3" aria-hidden />
      {m.label}
    </span>
  )
}

export function StatusBadge({ status }: { status: ProductUpdate['status'] }) {
  const st = {
    draft: { label: 'مسودة', cls: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400' },
    published: { label: 'منشور', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
    archived: { label: 'مؤرشف', cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-400' },
  }[status]

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ring-1', st.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} aria-hidden />
      {st.label}
    </span>
  )
}
