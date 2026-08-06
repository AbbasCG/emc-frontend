import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import SettingsToggle from '@/components/settings/SettingsToggle'
import type { NotificationPreferenceRow as PreferenceRowModel } from '@/types/phase7'

type Props = {
  row: PreferenceRowModel
  disabled: boolean
  onChange: (next: PreferenceRowModel) => void
  index?: number
}

export default function NotificationPreferenceRow({ row, disabled, onChange, index = 0 }: Props) {
  function toggle(channel: 'in_app' | 'email' | 'sms') {
    if (row.mandatory) return
    onChange({
      ...row,
      channels: { ...row.channels, [channel]: !row.channels[channel] },
    })
  }

  const showSms = row.channels.sms !== undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.24) }}
      className="border-b border-slate-100/80 last:border-b-0"
    >
      {/* Desktop / tablet: fixed toggle columns */}
      <div
        className={`hidden gap-4 px-5 py-4 sm:grid ${showSms ? 'sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_6.5rem]' : 'sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem]'} sm:items-center`}
      >
        <div className="min-w-0 pe-2 text-right">
          <div className="flex items-center justify-end gap-2">
            {row.mandatory && <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />}
            <p className="text-[13px] font-bold text-[#22334A]">{row.labelAr}</p>
          </div>
          {row.descriptionAr && (
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{row.descriptionAr}</p>
          )}
        </div>

        <ToggleCell
          label="داخل المنصة"
          checked={!!row.channels.in_app}
          disabled={disabled || !!row.mandatory}
          onChange={() => toggle('in_app')}
          ariaLabel={`${row.labelAr} — داخل المنصة`}
        />
        <ToggleCell
          label="البريد الإلكتروني"
          checked={!!row.channels.email}
          disabled={disabled || !!row.mandatory}
          onChange={() => toggle('email')}
          ariaLabel={`${row.labelAr} — البريد الإلكتروني`}
        />
        {showSms && (
          <ToggleCell
            label="SMS"
            checked={!!row.channels.sms}
            disabled={disabled || !!row.mandatory}
            onChange={() => toggle('sms')}
            ariaLabel={`${row.labelAr} — SMS`}
          />
        )}
      </div>

      {/* Mobile: stacked layout */}
      <div className="space-y-3 px-4 py-4 sm:hidden">
        <div>
          <div className="flex items-center gap-2">
            {row.mandatory && <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />}
            <p className="text-[13px] font-bold text-[#22334A]">{row.labelAr}</p>
          </div>
          {row.descriptionAr && (
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{row.descriptionAr}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <MobileToggle label="داخل المنصة" checked={!!row.channels.in_app} disabled={disabled || !!row.mandatory} onChange={() => toggle('in_app')} />
          <MobileToggle label="البريد الإلكتروني" checked={!!row.channels.email} disabled={disabled || !!row.mandatory} onChange={() => toggle('email')} />
          {showSms && (
            <MobileToggle label="SMS" checked={!!row.channels.sms} disabled={disabled || !!row.mandatory} onChange={() => toggle('sms' as 'in_app')} />
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ToggleCell({
  label,
  checked,
  disabled,
  onChange,
  ariaLabel,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onChange: () => void
  ariaLabel: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <SettingsToggle checked={checked} disabled={disabled} onChange={onChange} aria-label={ariaLabel} />
    </div>
  )
}

function MobileToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold text-slate-500">{label}</span>
      <SettingsToggle checked={checked} disabled={disabled} onChange={onChange} aria-label={label} />
    </div>
  )
}
