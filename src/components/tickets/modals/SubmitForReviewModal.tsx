import { useId, useRef, useState } from 'react'
import type { Ticket } from '@/types/ticket'
import { ticketService } from '@/services/ticketService'
import { apiErrorCode, apiMessage, httpStatus } from '@/services/ticketOpsService'
import { getLaravelFieldErrors } from '@/api/apiErrors'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { SUBMIT_DURATION_REQUIRED_MESSAGE, SubmitDurationSection } from '@/components/tickets/modals/SubmitDurationSection'
import { actualDraftFromMinutes, actualDraftToMinutes, actualDurationMessage, type ActualDurationDraft } from '@/lib/taskEstimate'
import toast from '@/lib/toast'

export interface SubmitForReviewModalProps {
  ticket: Pick<Ticket, 'id' | 'task_points' | 'estimated_hours'> & Partial<Pick<Ticket, 'actual_minutes'>>;
  onClose: () => void;
  /** Submitted (or the ticket is no longer in progress): close and re-read the ticket. */
  onSuccess: () => void;
}

/**
 * «إرسال للمراجعة» (a ticket that requires live deployment): a small dialog. The assignee records the ACTUAL duration before
 * the ticket goes to review (hours + minutes, both empty at first, minutes exact, the total must be above 0); it is sent as
 * `actual_minutes` and is then read-only for the reviewer. Nothing else is asked and nothing else is sent.
 * One request at a time, even on a double click.
 */
export function SubmitForReviewModal({ ticket, onClose, onSuccess }: SubmitForReviewModalProps) {
  const formId = useId();
  const inFlight = useRef(false);
  const hoursRef = useRef<HTMLSelectElement>(null);
  const [actual, setActual] = useState<ActualDurationDraft>(() => actualDraftFromMinutes(ticket.actual_minutes));
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showError = (message: string) => {
    setError(message);
    hoursRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (inFlight.current) return;
    setFailure(null);
    setError(null);
    const minutes = actualDraftToMinutes(actual);
    if (!minutes.ok) {
      showError(minutes.reason === 'empty' ? SUBMIT_DURATION_REQUIRED_MESSAGE : actualDurationMessage(minutes.reason));
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('actual_minutes', String(minutes.minutes));
      await ticketService.completeTask(ticket.id, formData);
      toast.success('أُرسلت التذكرة للمراجعة');
      onSuccess();
    } catch (e) {
      const status = httpStatus(e);
      const message = apiMessage(e, 'تعذّر إرسال التذكرة للمراجعة');
      const code = apiErrorCode(e);
      if (status === 422 && (getLaravelFieldErrors(e).actual_minutes || code === 'ACTUAL_DURATION_REQUIRED' || code === 'ACTUAL_DURATION_INVALID')) {
        showError(getLaravelFieldErrors(e).actual_minutes ?? message);
      } else if (status === 409) {
        // e.g. the ticket is no longer in progress: the server says why, and the screen shows what it is now.
        toast.error(message);
        onSuccess();
      } else {
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
      testId="submit-review-modal"
      busy={submitting}
      dirty={JSON.stringify(actual) !== JSON.stringify(actualDraftFromMinutes(ticket.actual_minutes))}
      title="إرسال للمراجعة"
      subtitle="سجّل المدة الفعلية التي استغرقها العمل، ثم أرسل التذكرة للمراجعة. لا تُضاف النقاط والساعات إلا بعد اكتمال المسار."
      footer={(requestClose) => (
        <div className="flex justify-end gap-3">
          <button type="button" onClick={requestClose} disabled={submitting} className="rounded-xl border px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            إلغاء
          </button>
          <button type="submit" form={formId} disabled={submitting} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
            {submitting ? 'جارٍ الإرسال...' : 'إرسال للمراجعة'}
          </button>
        </div>
      )}
    >
      <form
        id={formId}
        noValidate
        dir="rtl"
        className="space-y-4 text-right"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <SubmitDurationSection
          value={actual}
          onChange={(next) => { setActual(next); setError(null); }}
          error={error}
          idPrefix={`${formId}-actual`}
          disabled={submitting}
          hoursRef={hoursRef}
          points={ticket.task_points}
          estimatedHours={ticket.estimated_hours}
        />
        {failure ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">
            {failure}
          </p>
        ) : null}
      </form>
    </CenteredModal>
  );
}

export default SubmitForReviewModal;
