import type { TicketActivityLog } from '@/types/ticket'
import { REVIEW_DECISION_ACTIONS, reviewerRelationLabels } from '@/lib/ticketLifecycle'

/**
 * Under a review decision in the history: when the reviewer was also the ticket's creator / assignee / submitter, say so
 * («المراجع هو: المنشئ والمكلّف») with the review round. The data is `activity_logs[].metadata`, which the server sends to
 * internal viewers only; a row without it (a reporter, an older row) shows nothing here.
 */
export function ReviewLogMeta({ log, className = '' }: { log: TicketActivityLog; className?: string }) {
  const meta = log.metadata
  if (!meta || !REVIEW_DECISION_ACTIONS.includes(log.action)) return null
  const relations = reviewerRelationLabels(meta.reviewer_relation)
  const round = typeof meta.review_round === 'number' && meta.review_round > 0 ? meta.review_round : null
  if (relations.length === 0 && round === null) return null

  return (
    <p className={className} data-testid="review-log-meta">
      {relations.length > 0 ? (
        <span data-testid="reviewer-relation" className="inline-flex flex-wrap items-center gap-1">
          <span>المراجع هو:</span>
          {relations.map((r) => (
            <span key={r} className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-800 ring-1 ring-amber-200">{r}</span>
          ))}
          {meta.participated === true ? <span className="text-[10px] font-semibold text-slate-500">(بصلاحية اعتماد التذاكر التي أشارك فيها)</span> : null}
        </span>
      ) : null}
      {round !== null ? <span className="ms-2" data-testid="review-round">جولة المراجعة {round}</span> : null}
    </p>
  )
}

export default ReviewLogMeta
