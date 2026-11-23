import { useId, useRef, useState } from 'react';
import type { Ticket } from '@/types/ticket';
import { ticketService } from '@/services/ticketService';
import { apiErrorCode, apiMessage, httpStatus } from '@/services/ticketOpsService';
import { getLaravelFieldErrors } from '@/api/apiErrors';
import TaskEstimateFields from '@/components/operations/TaskEstimateFields';
import { CenteredModal } from '@/components/ui/CenteredModal';
import { useEstimateDraft } from '@/hooks/useEstimateDraft';
import { TASK_SCOPE_RULES, durationToHours, estimateFromRecord, formatEstimate, isTaskScope, type EstimateDraft } from '@/lib/taskEstimate';
import toast from '@/lib/toast';

/** The server's sentence when this ticket has already credited its assignee (a replay or a concurrent approval). Fallback only: the `code` is what decides. */
export const ALREADY_CREDITED_MESSAGE = 'تم اعتماد هذه التذكرة وإضافة رصيدها مسبقًا.';
export const ALREADY_CREDITED_CODE = 'ALREADY_CREDITED';

/** Did the reviewer change the size, the points or the hours? (Typing the same value in minutes is not a change.) */
function estimateChanged(draft: EstimateDraft, stored: EstimateDraft): boolean {
  if (draft.scope !== stored.scope) return true
  if (draft.points.trim() !== stored.points.trim()) return true
  const a = durationToHours(draft.duration, draft.unit)
  const b = durationToHours(stored.duration, stored.unit)

  return !(a === b || (a !== null && b !== null && Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.005))
}

export interface ApproveCompletionModalProps {
  ticket: Pick<Ticket, 'id' | 'task_scope' | 'task_points' | 'estimated_hours' | 'assignee'>;
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
 * - Any other 409 (NOT_PENDING_REVIEW): the server's message and a re-read. 403 (SELF_REVIEW, HR_APPROVAL_REQUIRED
 *   when the size is above «بسيطة») and 422 stay in the dialog.
 * - One request at a time, even on a double click.
 */
export function ApproveCompletionModal({ ticket, onClose, onSuccess, onStale }: ApproveCompletionModalProps) {
  const formId = useId();
  const inFlight = useRef(false);
  const known = { task_scope: ticket.task_scope, task_points: ticket.task_points, estimated_hours: ticket.estimated_hours };
  const missingEstimate = !isTaskScope(ticket.task_scope) || ticket.task_points == null;
  const initial = estimateFromRecord(known);
  const estimate = useEstimateDraft(initial);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const assigneeName = ticket.assignee?.name ?? 'المكلف';
  const dirty = note.trim() !== '' || JSON.stringify(estimate.draft) !== JSON.stringify(initial);

  const handleApprove = async () => {
    if (inFlight.current) return;
    setFailure(null);
    setNoteError(null);
    if (note.trim().length > 1000) {
      setNoteError('الملاحظة طويلة جدًا؛ الحد الأقصى 1000 حرف.');
      return;
    }
    const changed = missingEstimate || estimateChanged(estimate.draft, initial);
    if (changed && !estimate.check(true)) {
      toast.error('أكمل حجم المهمة ونقاطها');
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    try {
      await ticketService.approveCompletion(ticket.id, {
        ...(changed ? estimate.payload() : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast.success('تم اعتماد الإنجاز وإضافة الرصيد إلى المكلف');
      onSuccess();
    } catch (e) {
      const status = httpStatus(e);
      const message = apiMessage(e, 'تعذّر اعتماد الإنجاز');
      if (status === 409 && (apiErrorCode(e) === ALREADY_CREDITED_CODE || message === ALREADY_CREDITED_MESSAGE)) {
        // Already done (a replay or another approver): say so, never submit again, and show the real state.
        toast.message(message);
        onSuccess();
      } else if (status === 409) {
        toast.error(message);
        (onStale ?? onSuccess)();
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
      testId="approve-completion-modal"
      busy={submitting}
      dirty={dirty}
      title="اعتماد إنجاز التذكرة"
      subtitle="الاعتماد النهائي هو ما يُضيف النقاط والساعات إلى رصيد المكلف، مرة واحدة فقط."
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
            {submitting ? 'جارٍ الاعتماد...' : 'اعتماد الإنجاز وإضافة الرصيد'}
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
            <dt className="text-slate-500">سيُضاف الرصيد إلى</dt>
            <dd className="font-bold text-slate-800" data-testid="completion-assignee">{assigneeName}</dd>
          </div>
          {missingEstimate ? null : (
            <>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">الحجم</dt>
                <dd className="font-medium text-slate-700" data-testid="completion-scope">{isTaskScope(ticket.task_scope) ? TASK_SCOPE_RULES[ticket.task_scope].label : '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">التقدير الحالي</dt>
                <dd className="font-bold text-emerald-700" data-testid="completion-amounts">{formatEstimate({ task_points: ticket.task_points, estimated_hours: ticket.estimated_hours ?? 0 })}</dd>
              </div>
            </>
          )}
        </dl>

        {missingEstimate ? (
          <p role="note" className="rounded-xl bg-amber-50 p-3 text-[11px] font-bold leading-relaxed text-amber-800" data-testid="completion-legacy-note">
            لا تحمل هذه التذكرة تقديرًا للنقاط. حدّد الحجم والنقاط ليُضافا إلى رصيد المكلف عند الاعتماد. لا يُضاف رصيد بأثر رجعي للتذاكر التي أُغلقت قبل هذه الميزة.
          </p>
        ) : (
          <p role="note" className="rounded-xl bg-sky-50 p-3 text-[11px] font-bold leading-relaxed text-sky-800" data-testid="completion-correct-note">
            يمكنك تصحيح التقدير قبل الاعتماد؛ تُضاف القيم النهائية.
          </p>
        )}
        <TaskEstimateFields value={estimate.draft} onChange={estimate.setDraft} errors={estimate.errors} idPrefix={`${formId}-est`} disabled={submitting} />

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

export default ApproveCompletionModal;
