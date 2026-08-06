import type { NotificationChannelKey } from '@/types/phase7'
import { cn } from '@/lib/utils'

const LABELS: Record<NotificationChannelKey, string> = {
  in_app: 'داخل المنصة',
  email: 'البريد الإلكتروني',
  whatsapp: 'واتساب',
}

export default function ChannelToggleGroup({
  value,
  onChange,
  disabled,
}: {
  value: Record<NotificationChannelKey, boolean>
  onChange: (next: Record<NotificationChannelKey, boolean>) => void
  disabled?: boolean
}) {
  const keys = Object.keys(LABELS) as NotificationChannelKey[]

  function toggle(k: NotificationChannelKey) {
    if (disabled) return
    onChange({ ...value, [k]: !value[k] })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {keys.map((k) => {
        const on = value[k]
        return (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => toggle(k)}
            className={cn(
              'rounded-xl px-3 py-2 text-[11px] font-black ring-1 ring-inset transition',
              on
                ? 'bg-customBlue text-white ring-customBlue shadow-md shadow-sky-100'
                : 'bg-white text-slate-500 ring-slate-200 hover:border-customBlue/20',
            )}
          >
            {LABELS[k]}
          </button>
        )
      })}
    </div>
  )
}
