import { useId, useRef, useState } from 'react';
import type { Ticket } from '@/types/ticket';
import { ticketService } from '@/services/ticketService';
import { apiErrorCode, apiMessage, httpStatus, reviewRefusalOf } from '@/services/ticketOpsService';
import { getLaravelFieldErrors } from '@/api/apiErrors';
import TaskEstimateFields, { ActualDurationFields } from '@/components/operations/TaskEstimateFields';
import { CenteredModal } from '@/components/ui/CenteredModal';
import { useEstimateDraft } from '@/hooks/useEstimateDraft';
import { useTicketPointsOptions } from '@/hooks/useTicketPointsOptions';
import {
  ACTUAL_DURATION_REQUIRED_DEPLOY_MESSAGE,
  ACTUAL_DURATION_REQUIRED_MESSAGE,
  TASK_SCOPE_RULES,
  actualDraftFromMinutes,
  actualDraftToMinutes,
  actualDurationMessage,
  durationToHours,
  estimateFromRecord,
  formatDurationHours,
  formatDurationMinutes,
  isTaskScope,
  type ActualDurationDraft,
  type EstimateDraft,
} from '@/lib/taskEstimate';
import toast from '@/lib/toast';

/** The server's sentence when this ticket has already credited its assignee (a replay or a concurrent approval). Fallback only: the `code` is what decides. */
export const ALREADY_CREDITED_MESSAGE = 'تم اعتماد هذه التذكرة وإضافة رصيدها مسبقًا.';
export const ALREADY_CREDITED_CODE = 'ALREADY_CREDITED';
export const ACTUAL_DURATION_REQUIRED_CODE = 'ACTUAL_DURATION_REQUIRED';

/** Did the reviewer change the size, the points or the hours? (Typing the same value in minutes is not a change.) */
function estimateChanged(draft: EstimateDraft, stored: EstimateDraft): boolean {
  if (draft.scope !== stored.scope) return true
  if (draft.points.trim() !== stored.points.trim()) return true
  const a = durationToHours(draft.duration, draft.unit)
  const b = durationToHours(stored.duration, stored.unit)

  return !(a === b || (a !== null && b !== null && Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.005))
}

export interface ApproveCompletionModalProps {
  ticket: Pick<Ticket, 'id' | 'task_scope' | 'task_points' | 'estimated_hours' | 'assignee'> & Partial<Pick<Ticket, 'actual_minutes' | 'requires_deployment'>>;
  /**
   * `completion` (default): the final approval of a regular ticket, which credits. `deploy`: «اعتماد للنشر» for a ticket that
   * requires live deployment: it APPROVES the points and the actual time (nothing is credited until the assignee confirms
   * the live test) and always sends the size, the points and the actual duration.
   */
  mode?: 'completion' | 'deploy';
  onClose: () => void;
  /** Approved, or it had already been credited: close and re-read the ticket. */
  onSuccess: () => void;
  /** The ticket is no longer waiting for review (another 409): close and re-read it too. Defaults to `onSuccess`. */
  onStale?: () => void;
}

/**
 * The FINAL approval of a ticket that its assignee submitted for review: POST /v1/tickets/{id}/approve-completion.
 * This is the one action that credits points and hours, once, to the ASSIGNEE (never to the approver).
 *
 * - The shared estimate fields are always shown, editable and prefilled with the stored size, points and hours:
 *   this request is the ONLY place a reviewer can correct the estimate (the work-estimate PATCH is frozen while the
 *   ticket is in review). The values are sent only when they differ from the stored ones; unchanged sends just the note.
 * - A legacy ticket without a size/points must supply them (points required, as the server requires).
 * - 409 ALREADY_CREDITED: shown as information, the modal closes and the ticket is re-read. Never resubmitted.
 * - Any other 409 (NOT_PENDING_REVIEW): the server's message and a re-read. 403 (REVIEW_PERMISSION_REQUIRED,
 *   PARTICIPATION_PERMISSION_REQUIRED, HR_APPROVAL_REQUIRED when the size is above «بسيطة») and 422 stay in the dialog
 *   with the server's Arabic sentence.
 * - «المدة الفعلية» (hours + minutes) is REQUIRED and is the ONLY time credited: it starts empty (or at the stored
 *   `actual_minutes`, so it can be corrected), never from the approximate duration, and is always sent as
 *   `actual_minutes`. The approximate duration is shown read-only for comparison.
 * - One request at a time, even on a double click.
 */
export function ApproveCompletionModal({ ticket, mode = 'completion', onClose, onSuccess, onStale }: ApproveCompletionModalProps) {
  const deploy = mode === 'deploy';
  const formId = useId();
  const inFlight = useRef(false);
  const known = { task_scope: ticket.task_scope, task_points: ticket.task_points, estimated_hours: ticket.estimated_hours };
  const missingEstimate = !isTaskScope(ticket.task_scope) || ticket.task_points == null;
  const initial = estimateFromRecord(known);
  const estimate = useEstimateDraft(initial);
  const ticketMode = useTicketPointsOptions({ scope: isTaskScope(ticket.task_scope) ? ticket.task_scope : '', points: ticket.task_points == null ? '' : String(ticket.task_points) });
  const [actual, setActual] = useState<ActualDurationDraft>(() => actualDraftFromMinutes(ticket.actual_minutes));
  const [actualError, setActualError] = useState<string | null>(null);
  const hoursRef = useRef<HTMLSelectElement>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const assigneeName = ticket.assignee?.name ?? 'المكلف';
  const storedActual = actualDraftFromMinutes(ticket.actual_minutes);
  const dirty = note.trim() !== '' || JSON.stringify(estimate.draft) !== JSON.stringify(initial) || JSON.stringify(actual) !== JSON.stringify(storedActual);

  // What will be added, live: the points of the (possibly corrected) estimate and the actual time entered.
  const entered = actualDraftToMinutes(actual);
  const draftPoints = estimate.draft.points.trim() !== '' && Number.isFinite(Number(estimate.draft.points)) ? Number(estimate.draft.points) : null;
  const previewPoints = draftPoints ?? (ticket.task_points ?? null);
  const approximate = ticket.estimated_hours == null ? null : formatDurationHours(ticket.estimated_hours);

  const showActualError = (message: string) => {
    setActualError(message);
    hoursRef.current?.focus();
  };

  const handleApprove = async () => {
    if (inFlight.current) return;
    setFailure(null);
    setNoteError(null);
    setActualError(null);
    if (note.trim().length > 1000) {
      setNoteError('الملاحظة طويلة جدًا؛ الحد الأقصى 1000 حرف.');
      return;
    }
    // A deployment approval always carries the size and points; a regular one only when the reviewer changed them.
    const changed = deploy || missingEstimate || estimateChanged(estimate.draft, initial);
    const estimateOk = !changed || estimate.check(true);
    const minutes = actualDraftToMinutes(actual);
    if (!minutes.ok) showActualError(actualDurationMessage(minutes.reason, deploy));
    if (!estimateOk) toast.error('أكمل حجم المهمة ونقاطها');
    if (!estimateOk || !minutes.ok) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const body = {
        ...(changed ? estimate.payload() : {}),
        actual_minutes: minutes.minutes,
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      if (deploy) await ticketService.approveForDeploy(ticket.id, { ...estimate.payload(), ...body });
      else await ticketService.approveCompletion(ticket.id, body);
      toast.success(deploy ? 'تم اعتماد التذكرة للنشر' : 'تم اعتماد الإنجاز وإضافة الرصيد إلى المكلف');
      onSuccess();
    } catch (e) {
      const status = httpStatus(e);
      const message = apiMessage(e, 'تعذّر اعتماد الإنجاز');
      if (status === 409 && (apiErrorCode(e) === ALREADY_CREDITED_CODE || message === ALREADY_CREDITED_MESSAGE)) {
        // Already done (a replay or another approver): say so, never submit again, and show the real state.
        toast.message(message);
        onSuccess();
      } else if (reviewRefusalOf(e)) {
        // 403 REVIEW_PERMISSION_REQUIRED / PARTICIPATION_PERMISSION_REQUIRED: the server's own sentence says what to ask for.
        setFailure(reviewRefusalOf(e)!.message);
      } else if (status === 409 && apiErrorCode(e) === 'ASSIGNEE_UNAVAILABLE') {
        // Nothing a refresh would change: the assignee must be restored or the ticket reassigned. Stay and say so.
        setFailure(message);
      } else if (status === 409) {
        toast.error(message);
        (onStale ?? onSuccess)();
      } else if (status === 422 && (getLaravelFieldErrors(e).actual_minutes || apiErrorCode(e) === ACTUAL_DURATION_REQUIRED_CODE)) {
        // The server's own sentence under the field (the code alone falls back to the same Arabic sentence).
        showActualError(getLaravelFieldErrors(e).actual_minutes ?? (deploy ? ACTUAL_DURATION_REQUIRED_DEPLOY_MESSAGE : ACTUAL_DURATION_REQUIRED_MESSAGE));
        estimate.fromServer(e);
      } else if (estimate.fromServer(e)) {
        toast.error('راجع النقاط والمدة');
      } else if (status === 422 && getLaravelFieldErrors(e).note) {
        setNoteError(getLaravelFieldErrors(e).note);
      } else {
        // 403 (not a manager, your own work, or the HR approval for larger work), 404, anything else: the server's words.
        setFailure(message);
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <CenteredModal
      open
      onClose={onClose}
      size="md"
      testId={deploy ? 'approve-for-deploy-modal' : 'approve-completion-modal'}
      busy={submitting}
      dirty={dirty}
      title={deploy ? 'اعتماد للنشر' : 'اعتماد إنجاز التذكرة'}
      subtitle={deploy
        ? 'يُعتمد العمل للنشر وتُعتمد النقاط والمدة الفعلية، ولا يُضاف شيء إلى الرصيد الآن؛ تُضاف عندما يؤكد المكلّف الحل بعد الاختبار الحي.'
        : 'الاعتماد النهائي هو ما يُضيف النقاط والمدة الفعلية إلى رصيد المكلف، مرة واحدة فقط.'}
      footer={(requestClose) => (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={requestClose}
            disabled={submitting}
            className="rounded-xl border px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form={formId}
            disabled={submitting}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? 'جارٍ الاعتماد...' : deploy ? 'اعتماد للنشر' : 'اعتماد الإنجاز وإضافة الرصيد'}
          </button>
        </div>
      )}
    >
      <form
        id={formId}
        noValidate
        dir="rtl"
        className="space-y-5 text-right"
        onSubmit={(e) => {
          e.preventDefault();
          void handleApprove();
        }}
      >
        <dl className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-sm" data-testid="completion-summary">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">{deploy ? 'المكلّف' : 'سيُضاف الرصيد إلى'}</dt>
            <dd className="font-bold text-slate-800" data-testid="completion-assignee">{assigneeName}</dd>
          </div>
          {missingEstimate ? null : (
            <>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">الحجم</dt>
                <dd className="font-medium text-slate-700" data-testid="completion-scope">{isTaskScope(ticket.task_scope) ? TASK_SCOPE_RULES[ticket.task_scope].label : '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">النقاط المقدّرة</dt>
                <dd className="font-bold text-slate-800" data-testid="completion-amounts">{ticket.task_points == null ? '—' : `${ticket.task_points} نقطة`}</dd>
              </div>
            </>
          )}
        </dl>

        {missingEstimate ? (
          <p role="note" className="rounded-xl bg-amber-50 p-3 text-[11px] font-bold leading-relaxed text-amber-800" data-testid="completion-legacy-note">
            لا تحمل هذه التذكرة تقديرًا للنقاط. حدّد الحجم والنقاط لتُضاف النقاط إلى رصيد المكلف عند الاعتماد، مع المدة الفعلية التي تُدخلها. لا يُضاف رصيد بأثر رجعي للتذاكر التي أُغلقت قبل هذه الميزة.
          </p>
        ) : (
          <p role="note" className="rounded-xl bg-sky-50 p-3 text-[11px] font-bold leading-relaxed text-sky-800" data-testid="completion-correct-note">
            يمكنك تصحيح الحجم والنقاط والمدة التقريبية للتخطيط؛ المدة التي تُضاف إلى الرصيد هي المدة الفعلية أدناه.
          </p>
        )}
        <TaskEstimateFields value={estimate.draft} onChange={estimate.setDraft} errors={estimate.errors} idPrefix={`${formId}-est`} disabled={submitting} ticketMode={{ ...ticketMode, requiresDeployment: deploy || ticket.requires_deployment === true }} />

        <fieldset className="space-y-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-4" data-testid="actual-duration-section" disabled={submitting}>
          <legend className="px-1 text-xs font-black text-emerald-800">
            المدة الفعلية للإنجاز <span className="text-red-500" aria-hidden="true">*</span>
          </legend>
          <p className="text-[11px] font-bold leading-relaxed text-slate-600" data-testid="actual-duration-help">
            تُضاف هذه المدة وحدها إلى رصيد المكلف؛ لا تُستخدم المدة التقريبية.
          </p>
          <p className="text-[11px] font-bold text-slate-500" data-testid="completion-estimated-duration">
            المدة التقريبية: {approximate ?? 'غير محددة'}
          </p>
          <ActualDurationFields value={actual} onChange={(next) => { setActual(next); setActualError(null); }} error={actualError} idPrefix={`${formId}-actual`} disabled={submitting} hoursRef={hoursRef} storedHours={ticket.actual_minutes != null ? Math.floor(ticket.actual_minutes / 60) : null} />
          <p className="rounded-lg bg-white p-2.5 text-xs font-black text-emerald-800" data-testid="completion-preview" aria-live="polite">
            {entered.ok
              ? `ستُعتمد ${previewPoints == null ? '' : `${previewPoints} نقطة و`}مدة فعلية ${formatDurationMinutes(entered.minutes)}، وتُضافان إلى رصيد ${assigneeName} ${deploy ? 'عند تأكيد الحل بعد الاختبار الحي' : 'عند الاعتماد'}`
              : 'أدخل المدة الفعلية لمعرفة ما سيُعتمد.'}
          </p>
        </fieldset>

        <div>
          <label htmlFor={`${formId}-note`} className="mb-1.5 block text-xs font-bold text-slate-700">
            ملاحظة الاعتماد (اختياري)
          </label>
          <textarea
            id={`${formId}-note`}
            rows={3}
            maxLength={1000}
            value={note}
            disabled={submitting}
            aria-invalid={noteError ? true : undefined}
            onChange={(e) => {
              setNote(e.target.value);
              setNoteError(null);
            }}
            placeholder="ملاحظة تُسجَّل مع الاعتماد..."
            className="w-full resize-none rounded-xl border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          {noteError ? <p className="mt-1 text-[11px] font-bold text-rose-600">{noteError}</p> : null}
        </div>

        {failure ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">
            {failure}
          </p>
        ) : null}
      </form>
    </CenteredModal>
  );
}

/** «اعتماد للنشر»: the review of a ticket that requires live deployment. */
export function ApproveForDeployModal(props: Omit<ApproveCompletionModalProps, 'mode'>) {
  return <ApproveCompletionModal {...props} mode="deploy" />;
}

export default ApproveCompletionModal;
