import { useId, useRef, useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import type { Ticket } from '@/types/ticket';
import { ticketService } from '@/services/ticketService';
import { apiErrorCode, apiMessage, httpStatus } from '@/services/ticketOpsService';
import { getLaravelFieldErrors } from '@/api/apiErrors';
import { CenteredModal } from '@/components/ui/CenteredModal';
import { SUBMIT_DURATION_REQUIRED_MESSAGE, SubmitDurationSection } from '@/components/tickets/modals/SubmitDurationSection';
import { actualDraftFromMinutes, actualDraftToMinutes, actualDurationMessage, type ActualDurationDraft } from '@/lib/taskEstimate';
import toast from '@/lib/toast';

export interface CompleteTaskModalProps {
  ticketId: number;
  onClose: () => void;
  onSuccess: () => void;
  /** A deployment ticket submits for review through its own small dialog (SubmitForReviewModal); this one is then only for «تعذر الحل». */
  unresolvedOnly?: boolean;
  /** The ticket's approved size/points/duration, only for the preview under «المدة الفعلية». */
  estimate?: Partial<Pick<Ticket, 'task_points' | 'estimated_hours' | 'actual_minutes'>>;
}

/**
 * Assignee hands an IN_PROGRESS task over: «تقديم للمراجعة» (the work is done; the ticket then waits for the final
 * approval, and ONLY that approval credits points and hours) or «تعذر الحل» (escalation). Reuses the SAME
 * POST /v1/tickets/{id}/complete-task operation.
 *
 * The proof-file picker's accept="image/*,video/*" is preserved EXACTLY as it
 * already exists elsewhere in the product (AssigneeWorkspacePage) — video is
 * still accepted here by backend validation. This is a pre-existing gap in
 * the ticket attachment hardening work (which only covers the INITIAL
 * submission's attachments.* field, not this endpoint's separate proof_files.*
 * field) and is out of scope for this change; it is not silently widened or
 * narrowed here.
 *
 * The request field is `resolution_type` — matching TicketController::
 * completeTask()'s actual validator exactly.
 */
export function CompleteTaskModal({ ticketId, onClose, onSuccess, unresolvedOnly = false, estimate }: CompleteTaskModalProps) {
  const formId = useId();
  const submitInFlight = useRef(false);
  const hoursRef = useRef<HTMLSelectElement>(null);
  const [actual, setActual] = useState<ActualDurationDraft>(() => actualDraftFromMinutes(estimate?.actual_minutes));
  const [actualError, setActualError] = useState<string | null>(null);
  const [status, setStatus] = useState<'RESOLVED' | 'UNRESOLVED'>(unresolvedOnly ? 'UNRESOLVED' : 'RESOLVED');
  const [summary, setSummary] = useState('');
  const [unresolvedReason, setUnresolvedReason] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async () => {
    if (submitInFlight.current) return;
    setActualError(null);
    if (status === 'RESOLVED' && !summary.trim()) {
      toast.error('يجب توضيح ما تم بالتفصيل لتقديم التذكرة للمراجعة');
      return;
    }
    // The ACTUAL duration is recorded now, by the assignee, before the review (hours + minutes, exact, above 0).
    const minutes = actualDraftToMinutes(actual);
    if (status === 'RESOLVED' && !minutes.ok) {
      setActualError(minutes.reason === 'empty' ? SUBMIT_DURATION_REQUIRED_MESSAGE : actualDurationMessage(minutes.reason));
      hoursRef.current?.focus();
      return;
    }
    if (status === 'UNRESOLVED' && !unresolvedReason.trim()) {
      toast.error('يجب توضيح أسباب تعذر الحل والعوائق الفنية');
      return;
    }

    submitInFlight.current = true;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('resolution_type', status);
      if (status === 'RESOLVED') {
        formData.append('resolution_summary', summary.trim());
        if (minutes.ok) formData.append('actual_minutes', String(minutes.minutes));
        files.forEach((f) => formData.append('proof_files[]', f));
      } else {
        formData.append('unresolved_reason', unresolvedReason.trim());
      }
      await ticketService.completeTask(ticketId, formData);
      toast.success(status === 'RESOLVED' ? 'تم تقديم التذكرة للمراجعة والاعتماد' : 'تم رفع تقرير تعذر الحل للإدارة العليا');
      onSuccess();
    } catch (e) {
      const code = apiErrorCode(e);
      if (httpStatus(e) === 422 && (getLaravelFieldErrors(e).actual_minutes || code === 'ACTUAL_DURATION_REQUIRED' || code === 'ACTUAL_DURATION_INVALID')) {
        setActualError(getLaravelFieldErrors(e).actual_minutes ?? apiMessage(e, SUBMIT_DURATION_REQUIRED_MESSAGE));
        hoursRef.current?.focus();
      } else {
        toast.error(apiMessage(e, 'حدث خطأ أثناء حفظ نتيجة المهمة'));
      }
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
  };

  const confirmCls = status === 'RESOLVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700';

  return (
    <CenteredModal
      open
      onClose={onClose}
      size="md"
      testId="complete-task-modal"
      busy={submitting}
      dirty={summary.trim() !== '' || unresolvedReason.trim() !== '' || files.length > 0 || JSON.stringify(actual) !== JSON.stringify(actualDraftFromMinutes(estimate?.actual_minutes))}
      title={unresolvedOnly ? 'تعذر الحل' : 'تقديم للمراجعة'}
      footer={(requestClose) => (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={requestClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={submitting}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition disabled:opacity-60 ${confirmCls}`}
          >
            {submitting ? 'جارٍ الحفظ...' : status === 'RESOLVED' ? 'تأكيد التقديم للمراجعة' : '⚠️ تأكيد تعذر الحل'}
          </button>
        </div>
      )}
    >
      <div className="space-y-5 text-right" dir="rtl">
        {unresolvedOnly ? null : <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStatus('RESOLVED')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition ${
              status === 'RESOLVED'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            تقديم للمراجعة
          </button>
          <button
            type="button"
            onClick={() => setStatus('UNRESOLVED')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition ${
              status === 'UNRESOLVED'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            ⚠️ تعذر الحل
          </button>
        </div>}

        {status === 'RESOLVED' ? (
          <>
            <p className="rounded-xl bg-indigo-50 p-3 text-xs font-bold leading-relaxed text-indigo-800" data-testid="submit-review-note">
              لن تُضاف النقاط والساعات إلا بعد الاعتماد النهائي، والوقت المُضاف هو المدة الفعلية التي تسجّلها الآن.
            </p>
            <SubmitDurationSection
              value={actual}
              onChange={(next) => { setActual(next); setActualError(null); }}
              error={actualError}
              idPrefix={`${formId}-actual`}
              disabled={submitting}
              hoursRef={hoursRef}
              points={estimate?.task_points}
              estimatedHours={estimate?.estimated_hours}
            />
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ما الذي تم بالتفصيل لحل المشكلة؟ <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="اشرح الإجراءات التقنية المتخذة والنتيجة التي تحققت..."
                className={`w-full rounded-xl border p-3 text-sm focus:ring-2 outline-none resize-none ${
                  summary.trim().length === 0 ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              {summary.trim().length === 0 && (
                <p className="text-[11px] text-rose-500 mt-1">يجب ملء هذا الحقل لتقديم التذكرة للمراجعة</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رفع إثبات الحل (صورة / فيديو — اختياري)
              </label>
              <div
                className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-5 text-center cursor-pointer transition"
                onClick={() => document.getElementById('complete-task-proof-input')?.click()}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  id="complete-task-proof-input"
                  onChange={(e) => {
                    if (e.target.files) {
                      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                    }
                  }}
                />
                <UploadCloud className="w-7 h-7 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500">اضغط لرفع صورة أو فيديو إثبات</p>
              </div>
              {files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg p-2 border border-slate-200">
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, fi) => fi !== i))}
                        className="text-rose-500 hover:text-rose-700 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              أسباب تعذر الحل والعوائق الفنية <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={unresolvedReason}
              onChange={(e) => setUnresolvedReason(e.target.value)}
              placeholder="وضح العوائق الفنية أو الصلاحيات اللازمة أو الجهة الأعلى التي يجب إحالتها..."
              className={`w-full rounded-xl border p-3 text-sm focus:ring-2 outline-none resize-none ${
                unresolvedReason.trim().length === 0 ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
            {unresolvedReason.trim().length === 0 && (
              <p className="text-[11px] text-rose-500 mt-1">⚠️ يجب توثيق أسباب تعذر الحل قبل التصعيد</p>
            )}
          </div>
        )}
      </div>
    </CenteredModal>
  );
}

export default CompleteTaskModal;
