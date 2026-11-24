import { BadgeCheck, Loader2 } from 'lucide-react'
import type { Ticket } from '@/types/ticket'
import { useConfirmReview } from '@/hooks/useConfirmReview'
import { cn } from '@/lib/utils'

export interface ConfirmReviewButtonProps {
  ticket: Pick<Ticket, 'id' | 'status' | 'ticket_number' | 'capabilities'> & Partial<Pick<Ticket, 'review_round'>>
  /** The server answered (confirmed, or refused): re-read what shows this ticket. */
  onDone: () => void
  /** `row`: the compact button of the tickets table / cards. `full`: the button of the ticket details. */
  variant?: 'row' | 'full'
}

const ROW = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40'
const FULL = 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition'

/**
 * «تأكيد المراجعة»: ONE press, no dialog. Shown only for a ticket that is waiting for review AND whose server-computed
 * `capabilities.confirm_review` is true (the server also re-checks on the request). While the request runs the button is
 * disabled with a spinner and a second press does nothing. Used by the ticket details and by the tickets table, so both behave alike.
 */
export function ConfirmReviewButton({ ticket, onDone, variant = 'full' }: ConfirmReviewButtonProps) {
  const { confirm, isPending } = useConfirmReview(onDone)
  if (ticket.status !== 'PENDING_REVIEW' || ticket.capabilities?.confirm_review !== true) return null
  const busy = isPending(ticket.id)
  const size = variant === 'row' ? 12 : 16

  return (
    <button
      type="button"
      onClick={() => void confirm(ticket.id, ticket.review_round)}
      disabled={busy}
      aria-busy={busy || undefined}
      aria-label={variant === 'row' ? `تأكيد مراجعة التذكرة ${ticket.ticket_number}` : undefined}
      data-testid="confirm-review-button"
      className={cn(variant === 'row' ? ROW : FULL, 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60')}
    >
      {busy ? <Loader2 size={size} className="animate-spin" aria-hidden="true" /> : <BadgeCheck size={size} aria-hidden="true" />}
      {busy ? 'جارٍ التأكيد...' : 'تأكيد المراجعة'}
    </button>
  )
}

export default ConfirmReviewButton
