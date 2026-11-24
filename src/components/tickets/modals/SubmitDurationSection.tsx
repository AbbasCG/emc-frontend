import type { Ref } from 'react'
import { ActualDurationFields } from '@/components/operations/TaskEstimateFields'
import {
  actualDraftToMinutes,
  formatDurationHours,
  formatDurationMinutes,
  type ActualDurationDraft,
} from '@/lib/taskEstimate'

export const SUBMIT_DURATION_REQUIRED_MESSAGE = 'أدخل المدة الفعلية للإنجاز (بالساعات والدقائق) قبل الإرسال للمراجعة.'

/**
 * The assignee's «المدة الفعلية» before sending a ticket to review: hours + minutes selects that START EMPTY (no zero default,
 * never the approximate duration), the total must be greater than 0 (minutes are exact), and a live preview of what the
 * reviewer will see (the approved points, the approximate duration and the actual duration entered).
 */
export function SubmitDurationSection({
  value,
  onChange,
  error,
  idPrefix,
  disabled,
  hoursRef,
  points,
  estimatedHours,
}: {
  value: ActualDurationDraft
  onChange: (next: ActualDurationDraft) => void
  error?: string | null
  idPrefix: string
  disabled?: boolean
  hoursRef?: Ref<HTMLSelectElement>
  points?: number | null
  estimatedHours?: number | string | null
}) {
  const entered = actualDraftToMinutes(value)
  const approximate = estimatedHours == null || estimatedHours === '' ? null : formatDurationHours(estimatedHours)

  return (
    <fieldset className="space-y-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-4" data-testid="submit-duration-section" disabled={disabled}>
      <legend className="px-1 text-xs font-black text-emerald-800">
        المدة الفعلية للإنجاز <span className="text-red-500" aria-hidden="true">*</span>
      </legend>
      <p className="text-[11px] font-bold leading-relaxed text-slate-600">
        سجّل الوقت الذي استغرقه العمل فعليًا. يُعرض للمراجع للقراءة فقط، وهو الوقت الذي يُضاف إلى رصيدك بعد اكتمال المسار.
      </p>
      <ActualDurationFields value={value} onChange={onChange} error={error} idPrefix={idPrefix} disabled={disabled} hoursRef={hoursRef} />
      <p className="rounded-lg bg-white p-2.5 text-xs font-black text-emerald-800" data-testid="submit-duration-preview" aria-live="polite">
        {entered.ok
          ? `ستُرسل بمدة فعلية ${formatDurationMinutes(entered.minutes)}${points == null ? '' : ` ونقاط ${points}`}${approximate ? ` (المدة التقريبية: ${approximate})` : ''}`
          : 'أدخل الساعات والدقائق لمعرفة ما سيُرسل للمراجعة.'}
      </p>
    </fieldset>
  )
}
