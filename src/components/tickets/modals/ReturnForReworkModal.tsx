import { useId, useRef, useState } from 'react';
import { ticketService } from '@/services/ticketService';
import { apiMessage, httpStatus } from '@/services/ticketOpsService';
import { getLaravelFieldErrors } from '@/api/apiErrors';
import { CenteredModal } from '@/components/ui/CenteredModal';
import toast from '@/lib/toast';

export const REWORK_REASON_MIN = 5;
export const REWORK_REASON_MAX = 1000;

export interface ReturnForReworkModalProps {
  ticketId: number;
  onClose: () => void;
  onSuccess: () => void;
  /** The ticket is no longer waiting for review (409): close and re-read it. Defaults to `onSuccess`. */
  onStale?: () => void;
  /** The ticket is already approved for deployment: say that the approval is cancelled. */
  fromDeploy?: boolean;
  /** A manager sends back a ticket waiting for the live test because its assignee is unavailable. */
  assigneeUnavailable?: boolean;
}

/**
 * «إعادة للتنفيذ»: POST /v1/tickets/{id}/return-for-rework. The ticket goes back to its assignee (IN_PROGRESS) and
 * nothing is credited. The reason is required, 5 to 1000 characters; the server checks the same.
 */
export function ReturnForReworkModal({ ticketId, onClose, onSuccess, onStale, fromDeploy = false, assigneeUnavailable = false }: ReturnForReworkModalProps) {
  const formId = useId();
  const inFlight = useRef(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const length = reason.trim().length;

  const handleReturn = async () => {
    if (inFlight.current) return;
    setFailure(null);
    if (length < REWORK_REASON_MIN) {
      setReasonError(length === 0 ? 'اكتب سبب إعادة التذكرة للتنفيذ.' : `سبب الإعادة قصير؛ اكتب ${REWORK_REASON_MIN} أحرف على الأقل.`);
      return;
    }
    if (length > REWORK_REASON_MAX) {
      setReasonError(`سبب الإعادة طويل جدًا؛ الحد الأقصى ${REWORK_REASON_MAX} حرف.`);
      return;
    }
    setReasonError(null);
    inFlight.current = true;
    setSubmitting(true);
    try {
      await ticketService.returnForRework(ticketId, reason.trim());
      toast.success('أُعيدت التذكرة للمكلف لاستكمال العمل');
      onSuccess();
    } catch (e) {
      const status = httpStatus(e);
      const message = apiMessage(e, 'تعذّرت إعادة التذكرة للتنفيذ');
      if (status === 409) {
        toast.error(message);
        (onStale ?? onSuccess)();
      } else if (status === 422 && getLaravelFieldErrors(e).reason) {
        setReasonError(getLaravelFieldErrors(e).reason);
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
      testId="return-for-rework-modal"
      busy={submitting}
      dirty={reason.trim() !== ''}
      title="إعادة للتنفيذ"
      subtitle={assigneeUnavailable ? 'المكلّف غير متاح لإكمال الاختبار الحي، فتعود التذكرة إلى التنفيذ ولا يُضاف أي رصيد.' : fromDeploy ? 'يُلغى الاعتماد للنشر وتعود التذكرة إلى المكلف لاستكمال العمل، ثم تحتاج مراجعة جديدة. لا يُضاف أي رصيد.' : 'تعود التذكرة إلى المكلف لاستكمال العمل، ولا يُضاف أي رصيد.'}
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
            className="rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-60"
          >
            {submitting ? 'جارٍ الإعادة...' : 'إعادة للتنفيذ'}
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
          void handleReturn();
        }}
      >
        <div>
          <label htmlFor={`${formId}-reason`} className="mb-1.5 block text-xs font-bold text-slate-700">
            سبب الإعادة <span className="text-rose-500">*</span>
          </label>
          <textarea
            id={`${formId}-reason`}
            rows={4}
            value={reason}
            disabled={submitting}
            aria-required="true"
            aria-invalid={reasonError ? true : undefined}
            onChange={(e) => {
              setReason(e.target.value);
              setReasonError(null);
            }}
            placeholder="اشرح للمكلف ما يحتاج إلى استكمال أو تصحيح..."
            className={`w-full resize-none rounded-xl border p-3 text-sm outline-none focus:ring-2 ${
              reasonError ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-300 focus:ring-blue-500'
            }`}
          />
          <div className="mt-1 flex items-center justify-between gap-3 text-[11px]">
            {reasonError ? <p className="font-bold text-rose-600">{reasonError}</p> : <span className="text-slate-400">من {REWORK_REASON_MIN} إلى {REWORK_REASON_MAX} حرفًا.</span>}
            <span className="text-slate-400 tabular-nums">{length} / {REWORK_REASON_MAX}</span>
          </div>
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

export default ReturnForReworkModal;
