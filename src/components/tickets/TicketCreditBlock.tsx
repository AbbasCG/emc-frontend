import { Coins } from 'lucide-react'
import type { TicketCredit } from '@/types/ticket'
import { TASK_SCOPE_RULES, formatEstimate, hasEstimate, isEstimateHidden, isTaskScope } from '@/lib/taskEstimate'
import { formatDateTime } from '@/components/tickets/ops/ticketOpsUi'

type CreditSubject = {
  task_scope?: string | null
  task_points?: number | null
  estimated_hours?: number | string | null
  credit?: TicketCredit
  assignee?: { name: string } | null
}

/**
 * «الرصيد والتقدير»: what the ticket is estimated at and what (if anything) it has credited to its assignee.
 *
 * The server sends the estimate and the `credit` block only to managers, global roles and the assignee. For anyone
 * else both are ABSENT, and then nothing at all is rendered (not even a heading). Nothing here decides who may do
 * what; it only reports the server's data.
 */
export function TicketCreditBlock({ ticket, className = '' }: { ticket: CreditSubject; className?: string }) {
  const credit = ticket.credit
  if (!credit && isEstimateHidden(ticket)) return null

  const known = hasEstimate(ticket)
  const scope = isTaskScope(ticket.task_scope) ? TASK_SCOPE_RULES[ticket.task_scope].label : null
  const who = ticket.assignee?.name ?? 'المكلف'

  return (
    <section aria-label="الرصيد والتقدير" data-testid="ticket-credit-block" className={`space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
        <Coins className="h-3.5 w-3.5" aria-hidden="true" />
        الرصيد والتقدير
      </h3>

      {known ? (
        <dl className="space-y-1.5 text-sm" data-testid="credit-estimate">
          {scope ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">الحجم المقدّر</dt>
              <dd className="font-medium text-slate-700">{scope}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">النقاط والمدة المقدّرة</dt>
            <dd className="font-medium text-slate-700">{formatEstimate(ticket)}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-xs font-bold text-amber-700" data-testid="credit-no-estimate">لا تقدير لهذه التذكرة</p>
      )}

      {credit ? (
        <div className="space-y-1.5 border-t border-slate-100 pt-3" data-testid="credit-status" data-status={credit.status}>
          {credit.status === 'credited' ? (
            <>
              <p className="text-sm font-bold text-emerald-700">
                أُضيف إلى رصيد {who}
                {credit.credited_at ? ` بتاريخ ${formatDateTime(credit.credited_at)}` : ''}
              </p>
              <p className="text-xs font-semibold text-slate-600" data-testid="credit-amounts">
                المعتمد: {formatEstimate({ task_points: credit.points, estimated_hours: credit.hours ?? 0 })}
              </p>
              {credit.credited_by_name ? <p className="text-xs font-semibold text-slate-500">اعتمده: {credit.credited_by_name}</p> : null}
            </>
          ) : credit.status === 'pending_review' ? (
            <p className="text-sm font-bold text-indigo-700">بانتظار الاعتماد النهائي</p>
          ) : (
            <p className="text-sm font-bold text-slate-500">لم يُسجَّل رصيد</p>
          )}
        </div>
      ) : null}
    </section>
  )
}

export default TicketCreditBlock
