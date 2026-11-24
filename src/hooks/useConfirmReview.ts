import { useCallback, useRef, useState } from 'react'
import { ticketService } from '@/services/ticketService'
import { apiErrorCode, apiMessage, httpStatus, reviewRefusalOf } from '@/services/ticketOpsService'
import { invalidateTicketDetail } from '@/services/ticketDetailCache'
import type { Ticket, TicketStatus } from '@/types/ticket'
import toast from '@/lib/toast'

export const CONFIRM_REVIEW_DEPLOY_MESSAGE = 'تم تأكيد المراجعة — بانتظار النشر'
export const CONFIRM_REVIEW_CLOSED_MESSAGE = 'تم تأكيد المراجعة وإغلاق التذكرة وإضافة الرصيد'
const CONFIRM_REVIEW_GENERIC_MESSAGE = 'تم تأكيد المراجعة'
const CONFIRM_REVIEW_FAILED_MESSAGE = 'تعذّر تأكيد المراجعة'

/** The success sentence for the stage the SERVER put the ticket in (never a guess from the ticket's flags). */
export function confirmReviewSuccessMessage(status: TicketStatus | string | undefined, serverMessage?: string): string {
  if (status === 'APPROVED_FOR_DEPLOY') return CONFIRM_REVIEW_DEPLOY_MESSAGE
  if (status === 'RESOLVED') return CONFIRM_REVIEW_CLOSED_MESSAGE

  return serverMessage && serverMessage.trim() !== '' ? serverMessage : CONFIRM_REVIEW_GENERIC_MESSAGE
}

/**
 * «تأكيد المراجعة»: the ONE implementation behind the button in the ticket details and the one in the tickets table.
 *
 * One press sends one request (a second press while it runs is ignored: the ticket id is held in a ref, so even two clicks in
 * the same tick make a single call). No dialog and no values. `onDone` runs after every ANSWER from the server (success or a
 * refusal), so the caller re-reads the ticket, the list, the figures and the tab counts: a refusal means the screen was stale
 * (the stage moved, a permission changed, the data is incomplete and the ticket now carries its `review_blockers`).
 * The detail cache is dropped first, so «مهامي» and the work board read the new stage on their next view.
 */
export function useConfirmReview(onDone: (result: { ok: boolean; ticket: Ticket | null }) => void) {
  const inFlight = useRef<Set<number>>(new Set())
  const [pending, setPending] = useState<number[]>([])

  const confirm = useCallback(
    async (ticketId: number, reviewRound?: number | null): Promise<boolean> => {
      if (inFlight.current.has(ticketId)) return false
      inFlight.current.add(ticketId)
      setPending((p) => [...p, ticketId])
      try {
        const res = typeof reviewRound === 'number' ? await ticketService.confirmReview(ticketId, undefined, reviewRound) : await ticketService.confirmReview(ticketId)
        invalidateTicketDetail()
        toast.success(confirmReviewSuccessMessage(res.data?.status, res.message))
        onDone({ ok: true, ticket: res.data ?? null })

        return true
      } catch (e) {
        const status = httpStatus(e)
        const code = apiErrorCode(e)
        const message = reviewRefusalOf(e)?.message ?? apiMessage(e, CONFIRM_REVIEW_FAILED_MESSAGE)
        if (status === 409 && code === 'ALREADY_CREDITED') toast.message(message)
        else if (status === 409 && code === 'STALE_REVIEW') toast.warning(message)
        else toast.error(message)
        // Any answer from the server means the screen may be out of date: show what the ticket is now.
        if (status !== null) {
          invalidateTicketDetail()
          onDone({ ok: false, ticket: null })
        }

        return false
      } finally {
        inFlight.current.delete(ticketId)
        setPending((p) => p.filter((id) => id !== ticketId))
      }
    },
    [onDone],
  )

  const isPending = useCallback((ticketId: number) => pending.includes(ticketId), [pending])

  return { confirm, isPending }
}
