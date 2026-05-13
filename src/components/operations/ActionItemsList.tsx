import type { OpsActionItem } from '@/types/operations'

export default function ActionItemsList({
  items,
  onConvert,
}: {
  items: OpsActionItem[]
  onConvert: (actionItemId: number) => Promise<void>
}) {
  return (
    <ul className="space-y-3 text-right">
      {items.map((a) => (
        <li
          key={a.id}
          className="flex flex-col gap-2 rounded-xl bg-deepBlue/[0.03] px-4 py-3 ring-1 ring-deepBlue/[0.06] sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-black text-deepBlue">{a.text}</p>
            <p className="mt-1 text-[11px] font-bold text-slate-500">
              المالك: {a.owner ?? '—'} · الاستحقاق: {a.due_at ?? '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onConvert(a.id)}
            className="shrink-0 rounded-xl bg-customBlue px-4 py-2 text-[11px] font-black text-white shadow-sm"
          >
            تحويل إلى مهمة
          </button>
        </li>
      ))}
    </ul>
  )
}
