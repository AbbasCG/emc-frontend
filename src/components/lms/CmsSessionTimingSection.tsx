import EmcDateTimePicker from '@/components/ui/EmcDateTimePicker'
import { compareDatetimeLocal, formatDatetimeLocalPreview } from '@/utils/datetimeLocal'

type Props = {
  startAt: string
  endAt: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  startError?: string
  endError?: string
}

export function CmsSessionTimingSection({
  startAt,
  endAt,
  onStartChange,
  onEndChange,
  startError,
  endError,
}: Props) {
  const startPreview = formatDatetimeLocalPreview(startAt)
  const endPreview = formatDatetimeLocalPreview(endAt)
  const rangeInvalid =
    startAt.trim() &&
    endAt.trim() &&
    compareDatetimeLocal(endAt, startAt) <= 0 &&
    !endError

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <EmcDateTimePicker
          label="تاريخ ووقت البداية"
          required
          value={startAt}
          error={startError}
          onChange={onStartChange}
          showDatePresets
        />
        <EmcDateTimePicker
          label="تاريخ ووقت النهاية"
          value={endAt}
          error={endError ?? (rangeInvalid ? 'وقت النهاية يجب أن يكون بعد وقت البداية.' : undefined)}
          onChange={onEndChange}
          durationFrom={startAt.trim() ? startAt : undefined}
          showDatePresets={false}
        />
      </div>

      {(startPreview || endPreview) && (
        <div className="rounded-2xl border border-[#0077B6]/15 bg-[#0077B6]/5 px-4 py-3 text-right">
          <p className="text-[11px] font-black text-[#0C2A4B]/60">معاينة الجدولة</p>
          {startPreview ?
            <p className="mt-1.5 text-[13px] font-semibold text-[#0C2A4B]">
              <span className="font-black text-[#0077B6]">يبدأ:</span> {startPreview}
            </p>
          : null}
          {endPreview ?
            <p className="mt-1 text-[13px] font-semibold text-[#0C2A4B]">
              <span className="font-black text-[#F28C00]">ينتهي:</span> {endPreview}
            </p>
          : null}
        </div>
      )}
    </div>
  )
}
