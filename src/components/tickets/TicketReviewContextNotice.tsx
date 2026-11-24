import { ShieldAlert } from 'lucide-react'
import type { TicketReviewContext } from '@/types/ticket'
import { viewerRelationSentence } from '@/lib/ticketLifecycle'
import { permissionActionLabelAr } from '@/utils/permissionLabels'

const MISSING = 'تلزمك صلاحية «مراجعة واعتماد إنجاز التذاكر» لاعتماد هذه التذكرة أو إعادتها للتنفيذ؛ اطلبها من مسؤول الصلاحيات.'
const PARTICIPATION_TAIL = 'يلزم أيضًا منحك صلاحية «اعتماد التذاكر التي أشارك فيها»، أو يعتمدها مراجع آخر.'
const UNKNOWN = 'لا تتوفر لك مراجعة هذه التذكرة الآن.'

/**
 * Why a leader / global role cannot review a ticket that is waiting for review (`review_context` from the server).
 *
 * Renders NOTHING when the server sent no context (reporters, plain members, tickets outside a review stage) and when the
 * viewer CAN review: the review buttons themselves come only from `capabilities`, never from this note. It explains an
 * absence; it grants nothing.
 */
export function TicketReviewContextNotice({ context }: { context: TicketReviewContext | null | undefined }) {
  if (!context || context.can_review) return null

  const relation = viewerRelationSentence(context.relation)
  const message =
    context.reason === 'needs_participation_permission' ? `${relation ? `${relation}؛ ` : ''}${PARTICIPATION_TAIL}`
    : context.reason === 'missing_permission' ? MISSING
    : UNKNOWN

  return (
    <div role="note" data-testid="review-context" data-reason={context.reason ?? 'unknown'} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-relaxed text-amber-900">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
      <div className="min-w-0">
        <p data-testid="review-context-message">{message}</p>
        {(context.required_permissions?.length ?? 0) > 0 ? (
          <p className="mt-1 text-[11px] font-semibold text-amber-800/80" data-testid="review-context-required">
            الصلاحيات المطلوبة: {(context.required_permissions ?? []).map((k) => permissionActionLabelAr(k)).join(' + ')}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default TicketReviewContextNotice
