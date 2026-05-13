import type { NotificationPreferenceRow as PreferenceRowModel } from '@/types/phase7'
import ChannelToggleGroup from '@/components/enterprise/ChannelToggleGroup'

export default function NotificationPreferenceRow({
  row,
  onChange,
  disabled,
}: {
  row: PreferenceRowModel
  onChange: (next: PreferenceRowModel) => void
  disabled?: boolean
}) {
  return (
    <div
      dir="rtl"
      className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
    >
      <div className="min-w-0">
        <p className="text-sm font-black text-deepBlue">{row.label_ar}</p>
        <p className="mt-1 text-xs font-bold text-slate-400">اضبط القنوات المناسبة لهذا النوع من الرسائل.</p>
      </div>
      <ChannelToggleGroup
        disabled={disabled}
        value={row.channels}
        onChange={(channels) => onChange({ ...row, channels })}
      />
    </div>
  )
}
