import { formatEstimate, hasEstimate, isEstimateHidden } from '@/lib/taskEstimate'

/**
 * A ticket's points and approximate duration, as staff see them:
 *  - values present:           «120 نقطة · 2.5 ساعة»
 *  - keys present but null:    «— لم تُحدَّد»   (a legacy ticket, or one not yet assigned work)
 *  - keys absent from payload: «غير متاح لك»    (the server hides the estimate from this viewer)
 * Never rendered for the reporter's projection, which does not carry these fields at all.
 */
export function TicketEstimateValue({
  ticket,
  mutedClass = 'text-slate-400',
}: {
  ticket: { task_scope?: string | null; task_points?: number | null; estimated_hours?: number | string | null }
  mutedClass?: string
}) {
  if (isEstimateHidden(ticket)) return <span className={mutedClass}>غير متاح لك</span>
  if (!hasEstimate(ticket)) return <span className={mutedClass}>— لم تُحدَّد</span>

  return <span>{formatEstimate(ticket)}</span>
}

export default TicketEstimateValue
