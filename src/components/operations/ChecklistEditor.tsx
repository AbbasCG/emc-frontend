import type { OpsChecklistItem } from '@/types/operations'

type Props = {
  items: OpsChecklistItem[]
  onToggle: (id: number, done: boolean) => void
  disabled?: boolean
}

export default function ChecklistEditor({ items, onToggle, disabled }: Props) {
  return (
    <ul className="space-y-2 text-right">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-end gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <span className="text-sm font-semibold text-deepBlue">{item.label}</span>
          <input
            type="checkbox"
            checked={item.done}
            disabled={disabled}
            onChange={(e) => onToggle(item.id, e.target.checked)}
            className="h-4 w-4 accent-customBlue"
          />
        </li>
      ))}
    </ul>
  )
}
