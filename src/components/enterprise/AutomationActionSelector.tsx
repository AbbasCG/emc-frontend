import type { AutomationActionKind } from '@/types/platform'
import { AUTOMATION_ACTION_OPTIONS } from '@/components/enterprise/automationCatalog'
import { cn } from '@/lib/utils'

export default function AutomationActionSelector({
  value,
  onChange,
}: {
  value: AutomationActionKind[]
  onChange: (next: AutomationActionKind[]) => void
}) {
  function toggle(a: AutomationActionKind) {
    if (value.includes(a)) onChange(value.filter((x) => x !== a))
    else onChange([...value, a])
  }

  return (
    <div dir="rtl" className="grid gap-2 md:grid-cols-2">
      {AUTOMATION_ACTION_OPTIONS.map((opt) => {
        const on = value.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              'rounded-xl px-3 py-3 text-right text-xs font-black ring-1 ring-inset transition',
              on ? 'bg-customOrange text-white ring-customOrange shadow-md' : 'bg-white text-slate-600 ring-slate-200 hover:ring-customOrange/40',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
