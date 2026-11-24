import { AlertTriangle, Check, ExternalLink, Lock, Rocket } from 'lucide-react'
import type { Ticket, TicketStatus, TicketWorkflowStage } from '@/types/ticket'
import { formatDateTime, ticketActionLabel } from '@/components/tickets/ops/ticketOpsUi'
import { NEXT_ACTOR_TEXT, NEXT_STEP_TEXT } from '@/lib/ticketLifecycle'
import { cn } from '@/lib/utils'
import { TASK_SCOPE_RULES, formatDurationHours, formatDurationMinutes, isTaskScope } from '@/lib/taskEstimate'
import { TicketReviewContextNotice } from '@/components/tickets/TicketReviewContextNotice'
import { ReviewLogMeta } from '@/components/tickets/ReviewLogMeta'

const DEPLOYMENT_STEPS: { stage: TicketWorkflowStage; label: string }[] = [
  { stage: 'in_progress', label: 'قيد التنفيذ' },
  { stage: 'pending_review', label: 'بانتظار المراجعة' },
  { stage: 'approved_for_deploy', label: 'معتمدة للنشر' },
  { stage: 'pending_verification', label: 'بانتظار الاختبار الحي' },
  { stage: 'resolved', label: 'تم الحل' },
]

/** A ticket that does not require live deployment keeps its shorter flow. */
const PLAIN_STEPS: { stage: TicketWorkflowStage; label: string }[] = [
  { stage: 'in_progress', label: 'قيد التنفيذ' },
  { stage: 'pending_review', label: 'بانتظار المراجعة والاعتماد' },
  { stage: 'resolved', label: 'تم الحل' },
]

const SHOWN_STATUSES: TicketStatus[] = ['IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED_FOR_DEPLOY', 'PENDING_VERIFICATION', 'RESOLVED']

const DEPLOYMENT_LOG = ['SUBMITTED_FOR_REVIEW', 'APPROVED_FOR_DEPLOY', 'DEPLOYED_LIVE', 'VERIFIED_RESOLVED', 'VERIFICATION_FAILED', 'RETURNED_FOR_REWORK']
const PLAIN_LOG = ['SUBMITTED_FOR_REVIEW', 'APPROVED_COMPLETION', 'RETURNED_FOR_REWORK']

/** Only an https address is ever turned into a link. */
const isHttps = (v: string | null | undefined): v is string => typeof v === 'string' && /^https:\/\/\S+$/i.test(v)

/**
 * During review the size, the points, the approximate duration and the actual duration are READ-ONLY (set at assignment and by the
 * assignee before sending): there is no input here. The reviewer only confirms or returns the ticket.
 */
function ReviewValues({ ticket }: { ticket: Ticket }) {
  const rows: { key: string; label: string; value: string }[] = [
    { key: 'scope', label: 'الحجم', value: isTaskScope(ticket.task_scope) ? TASK_SCOPE_RULES[ticket.task_scope].label : '—' },
    { key: 'points', label: 'النقاط', value: ticket.task_points == null ? '—' : `${ticket.task_points} نقطة` },
    { key: 'estimated', label: 'المدة التقريبية', value: ticket.estimated_hours == null ? '—' : formatDurationHours(ticket.estimated_hours) },
    { key: 'actual', label: 'المدة الفعلية', value: ticket.actual_minutes == null ? '—' : formatDurationMinutes(ticket.actual_minutes) },
  ]

  return (
    <section aria-label="قيم المراجعة" data-testid="review-values" className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h4 className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-700">
        قيم المراجعة
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200" data-testid="review-values-locked">
          <Lock className="h-3 w-3" aria-hidden="true" /> مقفلة أثناء المراجعة
        </span>
      </h4>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.key}>
            <dt className="text-[11px] text-slate-500">{r.label}</dt>
            <dd className="font-bold text-slate-800" data-testid={`review-value-${r.key}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Why the review cannot be confirmed yet (the server's reasons). «إعادة للتنفيذ» stays available so the ticket can be completed. */
function ReviewBlockers({ ticket }: { ticket: Ticket }) {
  const blockers = ticket.review_blockers ?? []
  if (ticket.status !== 'PENDING_REVIEW' || blockers.length === 0) return null

  return (
    <div role="alert" data-testid="review-blockers" className="space-y-1.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
      <p className="flex items-center gap-1.5 font-black"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> لا يمكن تأكيد المراجعة بعد</p>
      <ul className="list-disc space-y-0.5 ps-5 font-bold leading-relaxed">
        {blockers.map((b, i) => <li key={`${b.code}-${i}`} data-code={b.code}>{b.message_ar}</li>)}
      </ul>
      {blockers.some((b) => b.code === 'HR_APPROVAL_REQUIRED') ? <p className="font-semibold text-amber-800" data-testid="review-blockers-hr-hint">يلزم أن يؤكد المراجعة مسؤول موارد بشرية يملك صلاحية الاعتماد.</p> : null}
      {ticket.capabilities?.return_for_rework && blockers.some((b) => b.code !== 'HR_APPROVAL_REQUIRED') ? <p className="font-semibold text-amber-800" data-testid="review-blockers-rework-hint">يمكنك إعادة التذكرة للتنفيذ ليكتمل المطلوب ثم تُرسل للمراجعة من جديد.</p> : null}
    </div>
  )
}

/**
 * «مسار التذكرة»: where the ticket is in its lifecycle, who has the next move, and what has happened in the review.
 *
 * Everything shown comes from the server: `workflow` (stage, next actor, next step), `requires_deployment`,
 * `deployment` and the activity log. The panel renders nothing when the server did not send `workflow` (plain members,
 * reporters) or while the ticket has not started work. A ticket that does not require deployment shows its shorter
 * flow and NOTHING about deployment, so an older ticket waiting for approval never looks deployed or tested.
 */
export function TicketLifecyclePanel({ ticket, className = '' }: { ticket: Ticket; className?: string }) {
  const workflow = ticket.workflow
  if (!workflow || !SHOWN_STATUSES.includes(ticket.status)) return null

  const deployment = ticket.requires_deployment === true
  const steps = deployment ? DEPLOYMENT_STEPS : PLAIN_STEPS
  const current = steps.findIndex((s) => s.stage === workflow.stage)
  const next = NEXT_STEP_TEXT[workflow.next_step_key] ?? null
  const actor = workflow.next_actor ? NEXT_ACTOR_TEXT[workflow.next_actor] : null
  const d = deployment ? (ticket.deployment ?? null) : null
  const allowed = deployment ? DEPLOYMENT_LOG : PLAIN_LOG
  const history = (ticket.activity_logs ?? []).filter((l) => allowed.includes(l.action))

  return (
    <section aria-label="مسار التذكرة" data-testid="ticket-lifecycle" data-deployment={deployment ? 'true' : 'false'} className={cn('space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
          {deployment ? <Rocket className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" /> : null}
          مسار التذكرة
        </h3>
        {deployment ? <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-700 ring-1 ring-teal-200" data-testid="lifecycle-deployment-badge">تتطلب نشرًا على الموقع الحي</span> : null}
      </div>

      <ol className="grid gap-2 sm:flex sm:items-stretch" data-testid="lifecycle-steps">
        {steps.map((s, i) => {
          const state = current === -1 ? 'upcoming' : i < current ? 'done' : i === current ? 'current' : 'upcoming'

          return (
            <li
              key={s.stage}
              data-stage={s.stage}
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
              className={cn(
                'flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold',
                state === 'done' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                state === 'current' && 'border-customBlue bg-customBlue/5 text-customBlue ring-1 ring-customBlue/30',
                state === 'upcoming' && 'border-slate-200 bg-slate-50 text-slate-400',
              )}
            >
              <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px]', state === 'done' ? 'bg-emerald-600 text-white' : state === 'current' ? 'bg-customBlue text-white' : 'bg-slate-200 text-slate-500')}>
                {state === 'done' ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
              </span>
              <span className="min-w-0">{s.label}</span>
            </li>
          )
        })}
      </ol>

      {next ? (
        <p className="flex flex-wrap items-center gap-2 rounded-xl bg-indigo-50 p-3 text-sm font-bold text-indigo-800" data-testid="lifecycle-next">
          <span>{next}</span>
          {actor ? <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-200" data-testid="lifecycle-actor">المسؤول: {actor}</span> : null}
        </p>
      ) : null}

      <TicketReviewContextNotice context={ticket.review_context} />

      {ticket.status === 'PENDING_REVIEW' ? <ReviewValues ticket={ticket} /> : null}
      <ReviewBlockers ticket={ticket} />

      {d && (d.review_approved_at || d.deployed_at || d.verified_at) ? (
        <dl className="space-y-1.5 text-sm" data-testid="lifecycle-deployment">
          {d.round != null && d.round > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">الجولة</dt>
              <dd className="font-medium text-slate-700" data-testid="lifecycle-round">{d.round}</dd>
            </div>
          ) : null}
          {d.review_approved_at ? (
            <div className="flex items-center justify-between gap-3" data-testid="lifecycle-approved">
              <dt className="text-slate-500">اعتُمد للنشر</dt>
              <dd className="text-end font-medium text-slate-700">{d.review_approved_by_name ?? '—'} · {formatDateTime(d.review_approved_at)}</dd>
            </div>
          ) : null}
          {d.deployed_at ? (
            <div className="flex items-center justify-between gap-3" data-testid="lifecycle-deployed">
              <dt className="text-slate-500">نُشر على الموقع الحي</dt>
              <dd className="text-end font-medium text-slate-700">{d.deployed_by_name ?? '—'} · {formatDateTime(d.deployed_at)}</dd>
            </div>
          ) : null}
          {isHttps(d.live_url) ? (
            <div className="flex items-center justify-between gap-3" data-testid="lifecycle-live-link">
              <dt className="text-slate-500">الموقع الحي</dt>
              <dd className="min-w-0 text-end">
                <a href={d.live_url} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex max-w-full items-center gap-1 truncate text-xs font-bold text-customBlue hover:underline">
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{d.live_url}</span>
                </a>
              </dd>
            </div>
          ) : null}
          {d.verified_at ? (
            <div className="flex items-center justify-between gap-3" data-testid="lifecycle-verified">
              <dt className="text-slate-500">تم التحقق</dt>
              <dd className="font-medium text-slate-700">{formatDateTime(d.verified_at)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {history.length > 0 ? (
        <ol className="space-y-2 border-t border-slate-100 pt-3" data-testid="lifecycle-history" aria-label="سجل المراجعة">
          {history.map((l, i) => (
            <li key={`${l.id ?? i}-${l.action}`} className="text-xs" data-action={l.action}>
              <p className="font-bold text-slate-800">{ticketActionLabel(l.action)}</p>
              {l.details ? <p className="mt-0.5 leading-relaxed text-slate-500">{l.details}</p> : null}
              <p className="mt-0.5 text-[10px] text-slate-400">
                {l.performed_by_name ? `بواسطة: ${l.performed_by_name} — ` : ''}
                {formatDateTime(l.logged_at)}
              </p>
              <ReviewLogMeta log={l} className="mt-0.5 text-[10px] text-slate-500" />
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}

export default TicketLifecyclePanel
