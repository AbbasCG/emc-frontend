import { useId, useState } from 'react';
import { ticketService } from '@/services/ticketService';
import { apiMessage } from '@/services/ticketOpsService';
import { CenteredModal } from '@/components/ui/CenteredModal';
import toast from '@/lib/toast';

/** The server requires at least 5 characters for the reason (TicketController::rejectTask). */
export const ASSIGNEE_DECLINE_MIN = 5;
/** ... and at most 1000. */
export const ASSIGNEE_DECLINE_MAX = 1000;

export interface RejectTaskModalProps {
  ticketId: number;
  onClose: () => void;
  onSuccess: () => void;
  /** The decline did not go through (the ticket changed under us, 404 / 409): the caller re-reads its sources. */
  onFailed?: () => void;
}

/**
 * Assignee declines an ASSIGNED task. Reuses the SAME
 * POST /v1/tickets/{id}/reject-task operation AssigneeWorkspacePage already
 * calls — the mandatory reason (min 5 characters) is a backend rule, mirrored
 * here so the button only enables once the reason is long enough.
 */
export function RejectTaskModal({ ticketId, onClose, onSuccess, onFailed }: RejectTaskModalProps) {
  const formId = useId();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const long = reason.trim().length >= ASSIGNEE_DECLINE_MIN;

  const handleReject = async () => {
    if (submitting) return;
    if (!long) {
      toast.error('مبرر الاعتذار إجباري (5 أحرف على الأقل)');
      return;
    }
    setSubmitting(true);
    setFailure(null);
    try {
      await ticketService.rejectTask(ticketId, reason.trim());
      toast.success('تم تسجيل اعتذارك — أُعيدت التذكرة للقيادة لإعادة التوجيه');
      onSuccess();
    } catch (e) {
      const message = apiMessage(e, 'حدث خطأ أثناء تسجيل الاعتذار');
      setFailure(message);
      toast.error(message);
      onFailed?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CenteredModal
      open
      onClose={onClose}
      size="md"
      testId="reject-task-modal"
      busy={submitting}
      dirty={reason.trim() !== ''}
      title="الاعتذار عن استلام المهمة"
      footer={(requestClose) => (
        <div className="flex justify-end gap-3">
          <button type="button" onClick={requestClose} disabled={submitting} className="px-5 py-2.5 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            إلغاء
          </button>
          <button
            type="submit"
            form={formId}
            disabled={submitting || !long}
            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition disabled:opacity-60"
          >
            {submitting ? 'جاري التسجيل...' : 'تأكيد الاعتذار'}
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
          void handleReject();
        }}
      >
        <p className="text-xs text-slate-500 leading-relaxed">
          سيتم إشعار الإدارة لإعادة توجيه التذكرة لمكلف آخر. <strong className="text-rose-600">ذكر السبب إجباري</strong>.
        </p>
        <div>
          <label htmlFor={`${formId}-reason`} className="block text-xs font-bold text-slate-700 mb-1.5">
            سبب الاعتذار <span className="text-rose-500">*</span>
          </label>
          <textarea
            id={`${formId}-reason`}
            rows={4}
            value={reason}
            maxLength={ASSIGNEE_DECLINE_MAX}
            aria-required="true"
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: تعارض مع مهام أخرى، خارج نطاق تخصصي..."
            className={`w-full rounded-xl border p-3 text-sm focus:ring-2 outline-none resize-none ${
              reason.trim().length === 0
                ? 'border-rose-300 focus:ring-rose-400'
                : 'border-slate-300 focus:ring-blue-500'
            }`}
          />
          <p className="mt-1 text-end text-[11px] font-semibold text-slate-400" data-testid="reason-counter" aria-live="polite">
            {reason.length} / {ASSIGNEE_DECLINE_MAX}
          </p>
          {!long && (
            <p className="text-[11px] text-rose-500 mt-1">
              {reason.trim().length === 0 ? 'لا يمكن الاعتذار بدون ذكر السبب' : `اكتب ${ASSIGNEE_DECLINE_MIN} أحرف على الأقل`}
            </p>
          )}
        </div>
        {failure ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{failure}</p>
        ) : null}
      </form>
    </CenteredModal>
  );
}

export default RejectTaskModal;
