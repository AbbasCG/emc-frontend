import type { ReactNode } from 'react'
import { Coins } from 'lucide-react'
import type { TicketCredit } from '@/types/ticket'
import { TASK_SCOPE_RULES, creditedDurationText, formatDurationHours, formatDurationMinutes, hasEstimate, isEstimateHidden, isTaskScope } from '@/lib/taskEstimate'
import { formatDateTime } from '@/components/tickets/ops/ticketOpsUi'

type CreditSubject = {
  task_scope?: string | null
  task_points?: number | null
  estimated_hours?: number | string | null
  actual_minutes?: number | null
  credit?: TicketCredit
  assignee?: { name: string } | null
}

function Row({ label, testId, children }: { label: string; testId: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3" data-testid={testId}>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-end font-medium text-slate-700">{children}</dd>
    </div>
  )
}

/**
 * «الرصيد والتقدير»: what the ticket is estimated at (planning) and what it has credited to its assignee.
 *
 * Two durations, never mixed up:
 *  - «المدة التقريبية (تخطيط)»: the planning estimate, never credited;
 *  - «المدة الفعلية (المعتمدة)»: the actual time approved at the final approval: the ONLY time added to the balance.
 *    A credit made before the actual duration existed carries only decimal hours, shown with its own label.
 *
 * The server sends the estimate, the actual time and the `credit` block only to managers, global roles and the
 * assignee. For anyone else all of them are ABSENT, and then nothing at all is rendered. Nothing here decides who may
 * do what; it only reports the server's data.
 */
export function TicketCreditBlock({ ticket, className = '' }: { ticket: CreditSubject; className?: string }) {
  const credit = ticket.credit
  if (!credit && isEstimateHidden(ticket) && ticket.actual_minutes == null) return null

  const known = hasEstimate(ticket)
  const scope = isTaskScope(ticket.task_scope) ? TASK_SCOPE_RULES[ticket.task_scope].label : null
  const who = ticket.assignee?.name ?? 'المكلف'
  const credited = credit?.status === 'credited'
  // The approved actual time: what was credited, else what the reviewer has entered so far.
  const actualMinutes = credited && credit?.minutes != null ? credit.minutes : (ticket.actual_minutes ?? null)
  const legacyCredit = credited && credit?.minutes == null && ticket.actual_minutes == null

  return (
    <section aria-label="الرصيد والتقدير" data-testid="ticket-credit-block" className={`space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
        <Coins className="h-3.5 w-3.5" aria-hidden="true" />
        الرصيد والتقدير
      </h3>

      {known ? (
        <dl className="space-y-1.5 text-sm" data-testid="credit-estimate">
          {scope ? <Row label="الحجم المقدّر" testId="credit-scope">{scope}</Row> : null}
          {ticket.task_points != null ? <Row label="النقاط المقدّرة" testId="credit-points">{`${ticket.task_points} نقطة`}</Row> : null}
          <Row label="المدة التقريبية (تخطيط)" testId="credit-planned-duration">{formatDurationHours(ticket.estimated_hours ?? null)}</Row>
        </dl>
      ) : (
        <p className="text-xs font-bold text-amber-700" data-testid="credit-no-estimate">لا تقدير لهذه التذكرة</p>
      )}

      {legacyCredit ? (
        <dl className="space-y-1.5 text-sm" data-testid="credit-actual">
          <Row label="ساعات مُضافة (قبل تسجيل المدة الفعلية)" testId="credit-legacy-hours">{formatDurationHours(credit?.hours ?? 0)}</Row>
        </dl>
      ) : actualMinutes != null ? (
        <dl className="space-y-1.5 text-sm" data-testid="credit-actual">
          <Row label="المدة الفعلية (المعتمدة)" testId="credit-actual-duration">{formatDurationMinutes(actualMinutes)}</Row>
        </dl>
      ) : credit?.status === 'pending_review' ? (
        <p className="text-xs font-bold text-indigo-700" data-testid="credit-actual-missing">لم تُدخَل المدة الفعلية بعد</p>
      ) : null}

      {credit ? (
        <div className="space-y-1.5 border-t border-slate-100 pt-3" data-testid="credit-status" data-status={credit.status}>
          {credit.status === 'credited' ? (
            <>
              <p className="text-sm font-bold text-emerald-700">
                أُضيف إلى رصيد {who}
                {credit.credited_at ? ` بتاريخ ${formatDateTime(credit.credited_at)}` : ''}
              </p>
              <p className="text-xs font-semibold text-slate-600" data-testid="credit-amounts">
                المُضاف: {credit.points ?? 0} نقطة · {creditedDurationText(credit)}
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
