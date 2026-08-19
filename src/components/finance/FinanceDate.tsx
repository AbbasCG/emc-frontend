import {
  FINANCE_DATE_VALUE_CLASS,
  FINANCE_TIME_VALUE_CLASS,
  formatFinanceDate,
  formatFinanceTime,
  isFinanceDateOnly,
} from '@/utils/financeDateFormatters'
import { cn } from '@/lib/utils'

export type FinanceDateProps = {
  value?: string | number | Date | null
  showTime?: boolean
  className?: string
}

/**
 * Shared finance date cell — matches workshop-requests table styling.
 * Date-only fields: pass showTime={false} (default).
 * Timestamps: pass showTime — time renders on a separate line.
 */
export default function FinanceDate({ value, showTime = false, className = '' }: FinanceDateProps) {
  const dateText = formatFinanceDate(value)
  const timeText =
    showTime && value && !isFinanceDateOnly(value) ? formatFinanceTime(value) : ''

  if (dateText === '—' && !timeText) {
    return <span className={cn(FINANCE_DATE_VALUE_CLASS, className)}>—</span>
  }

  return (
    <span className={cn('inline-flex flex-col items-start', className)}>
      {/* dir=auto: the formatted date leads with an Arabic month name forcing LTR
          reordered it to "يوليو 27 2026"; pure-digit strings still lay out LTR. */}
      <span className={FINANCE_DATE_VALUE_CLASS} dir="auto">
        {dateText}
      </span>
      {timeText && timeText !== '—' && (
        <span className={FINANCE_TIME_VALUE_CLASS} dir="ltr">
          {timeText}
        </span>
      )}
    </span>
  )
}
