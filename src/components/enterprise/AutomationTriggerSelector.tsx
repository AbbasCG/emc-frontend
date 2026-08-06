import type { AutomationTrigger } from '@/types/platform'
import { AUTOMATION_TRIGGER_OPTIONS } from '@/components/enterprise/automationCatalog'

export default function AutomationTriggerSelector({
  value,
  onChange,
}: {
  value: AutomationTrigger
  onChange: (v: AutomationTrigger) => void
}) {
  return (
    <label className="block" dir="rtl">
      <span className="text-xs font-black text-slate-400">المحفّز</span>
      <select
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-deepBlue outline-none ring-customBlue/25 focus:ring-2"
        value={value}
        onChange={(e) => onChange(e.target.value as AutomationTrigger)}
      >
        {AUTOMATION_TRIGGER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}
