import GoogleStyleTimePicker from '@/components/shared/GoogleStyleTimePicker'

function addMinutesTo(v: string, minutes: number): string {
  const match = v.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return v
  const h = Number(match[1])
  const m = Number(match[2])
  const total = (h * 60 + m + minutes) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export type EmcTimePickerProps = {
  label: string
  value: string // HH:mm
  onChange: (v: string) => void
  error?: string
  required?: boolean
  /** If set, shows +30 دقيقة / +1 ساعة presets calculated from this start time */
  durationFrom?: string
}

export default function EmcTimePicker({ label, value, onChange, error, required, durationFrom }: EmcTimePickerProps) {
  const showPresets = Boolean(durationFrom?.trim())

  return (
    <div className="block text-right" dir="rtl">
      {showPresets && (
        <div className="mb-2 flex gap-1.5">
          {[
            { label: '+30 دقيقة', min: 30 },
            { label: '+1 ساعة',   min: 60 },
          ].map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(addMinutesTo(durationFrom!, p.min))}
              className="flex-1 rounded-xl border border-[#EC943C]/25 bg-[#EC943C]/10 px-2.5 py-1.5 text-[11px] font-black text-[#b36a1f] transition hover:bg-[#EC943C]/20"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <GoogleStyleTimePicker
        label={label}
        value={value || null}
        onChange={onChange}
        error={error}
        required={required}
        minuteStep={15}
      />
    </div>
  )
}
