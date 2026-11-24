import { useId, useRef, useState, type ReactNode } from 'react';
import { ticketService } from '@/services/ticketService';
import { apiErrorCode, apiMessage, httpStatus, reviewRefusalOf } from '@/services/ticketOpsService';
import { getLaravelFieldErrors } from '@/api/apiErrors';
import { CenteredModal } from '@/components/ui/CenteredModal';
import { formatDurationMinutes } from '@/lib/taskEstimate';
import { NOTE_MAX, NOTE_MIN, validateLiveUrl } from '@/lib/ticketLifecycle';
import toast from '@/lib/toast';

/** The server's sentence for a replayed credit; the `code` decides, this is only the fallback. */
const ALREADY_CREDITED_MESSAGE = 'تم اعتماد هذه التذكرة وإضافة رصيدها مسبقًا.';

interface FieldDef {
  key: string;
  label: string;
  kind: 'input' | 'textarea';
  required: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  /** Left-to-right content (a URL). */
  ltr?: boolean;
  requiredMessage?: string;
  /** An extra check on the trimmed value; returns the Arabic message or null. */
  validate?: (value: string) => string | null;
}

interface StepModalProps {
  title: string;
  subtitle?: string;
  testId: string;
  submitLabel: string;
  busyLabel: string;
  submitClass: string;
  intro?: ReactNode;
  fields: FieldDef[];
  successMessage: string;
  request: (values: Record<string, string>) => Promise<unknown>;
  onClose: () => void;
  /** Done, or it had already been done (a replayed credit): close and re-read the ticket. */
  onSuccess: () => void;
  /** The ticket is not at the stage this action needs (409 INVALID_STAGE / NOT_PENDING_REVIEW …): close and re-read it. */
  onStale?: () => void;
}

/**
 * The shared body of the lifecycle step dialogs (deployed, live test passed, live test failed): validated text fields,
 * a pinned footer, one request at a time (double click safe) and one mapping of the server's refusals:
 *  - 409 ALREADY_CREDITED: shown as information, the dialog closes and the ticket is re-read, never resubmitted;
 *  - any other 409 (INVALID_STAGE, NOT_PENDING_REVIEW …): the server's message and a re-read;
 *  - 422: each field's own message under it; 403 and the rest: the server's words in the dialog.
 */
function TicketStepModal({ title, subtitle, testId, submitLabel, busyLabel, submitClass, intro, fields, successMessage, request, onClose, onSuccess, onStale }: StepModalProps) {
  const formId = useId();
  const inFlight = useRef(false);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, ''])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const check = (): Record<string, string> => {
    const found: Record<string, string> = {};
    for (const f of fields) {
      const v = (values[f.key] ?? '').trim();
      if (f.required && v === '') found[f.key] = f.requiredMessage ?? 'هذا الحقل مطلوب.';
      else if (v !== '' && f.min && v.length < f.min) found[f.key] = `النص قصير؛ اكتب ${f.min} أحرف على الأقل.`;
      else if (f.max && v.length > f.max) found[f.key] = `النص طويل جدًا؛ الحد الأقصى ${f.max} حرف.`;
      else if (v !== '' && f.validate) {
        const msg = f.validate(v);
        if (msg) found[f.key] = msg;
      }
    }

    return found;
  };

  const submit = async () => {
    if (inFlight.current) return;
    setFailure(null);
    const found = check();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      await request(Object.fromEntries(fields.map((f) => [f.key, (values[f.key] ?? '').trim()])));
      toast.success(successMessage);
      onSuccess();
    } catch (e) {
      const status = httpStatus(e);
      const message = apiMessage(e, 'تعذّر تنفيذ الإجراء');
      const fieldErrors = getLaravelFieldErrors(e);
      if (reviewRefusalOf(e)) {
        setFailure(reviewRefusalOf(e)!.message);
      } else if (status === 409 && (apiErrorCode(e) === 'ALREADY_CREDITED' || message === ALREADY_CREDITED_MESSAGE)) {
        toast.message(message);
        onSuccess();
      } else if (status === 409) {
        toast.error(message);
        (onStale ?? onSuccess)();
      } else if (status === 422 && fields.some((f) => fieldErrors[f.key])) {
        setErrors(Object.fromEntries(fields.filter((f) => fieldErrors[f.key]).map((f) => [f.key, fieldErrors[f.key]])));
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
      testId={testId}
      busy={submitting}
      dirty={fields.some((f) => (values[f.key] ?? '').trim() !== '')}
      title={title}
      subtitle={subtitle}
      footer={(requestClose) => (
        <div className="flex justify-end gap-3">
          <button type="button" onClick={requestClose} disabled={submitting} className="rounded-xl border px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            إلغاء
          </button>
          <button type="submit" form={formId} disabled={submitting} className={`rounded-xl px-6 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 ${submitClass}`}>
            {submitting ? busyLabel : submitLabel}
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
          void submit();
        }}
      >
        {intro}
        {fields.map((f) => {
          const id = `${formId}-${f.key}`;
          const err = errors[f.key];
          const cls = `w-full rounded-xl border p-3 text-sm outline-none focus:ring-2 ${err ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-300 focus:ring-blue-500'}`;
          const common = {
            id,
            value: values[f.key] ?? '',
            disabled: submitting,
            'aria-required': f.required ? (true as const) : undefined,
            'aria-invalid': err ? (true as const) : undefined,
            placeholder: f.placeholder,
          };
          const set = (v: string) => {
            setValues((s) => ({ ...s, [f.key]: v }));
            setErrors((s) => ({ ...s, [f.key]: '' }));
          };

          return (
            <div key={f.key}>
              <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-slate-700">
                {f.label} {f.required ? <span className="text-rose-500">*</span> : <span className="font-medium text-slate-400">(اختياري)</span>}
              </label>
              {f.kind === 'textarea' ? (
                <textarea {...common} rows={4} onChange={(e) => set(e.target.value)} className={`${cls} resize-none`} />
              ) : (
                <input {...common} type="url" dir={f.ltr ? 'ltr' : undefined} onChange={(e) => set(e.target.value)} className={`${cls} ${f.ltr ? 'text-left' : ''}`} />
              )}
              {err ? <p className="mt-1 text-[11px] font-bold text-rose-600">{err}</p> : null}
            </div>
          );
        })}
        {failure ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">
            {failure}
          </p>
        ) : null}
      </form>
    </CenteredModal>
  );
}

interface StepProps {
  ticketId: number;
  onClose: () => void;
  onSuccess: () => void;
  onStale?: () => void;
}

/** «تم النشر على الموقع الحي»: the deployer records the live address (https, required) and an optional note. */
export function MarkDeployedModal({ ticketId, actorName, ...rest }: StepProps & { actorName?: string | null }) {
  return (
    <TicketStepModal
      {...rest}
      title="تم النشر على الموقع الحي"
      testId="mark-deployed-modal"
      submitLabel="تأكيد النشر"
      busyLabel="جارٍ التسجيل..."
      submitClass="bg-teal-600 hover:bg-teal-700"
      successMessage="سُجّل النشر على الموقع الحي، وبانتظار اختبار المكلّف"
      intro={
        <p className="rounded-xl bg-teal-50 p-3 text-xs font-bold leading-relaxed text-teal-800" data-testid="deploy-record-note">
          سيُسجَّل اسمك{actorName ? ` (${actorName})` : ''} وتاريخ ووقت التأكيد الحاليان، ثم يختبر المكلّف الحل على الموقع الحي.
        </p>
      }
      fields={[
        { key: 'live_url', label: 'رابط الموقع الحي', kind: 'input', required: true, ltr: true, placeholder: 'https://', requiredMessage: 'أدخل رابط الموقع الحي الذي نُشر عليه العمل.', validate: validateLiveUrl },
        { key: 'note', label: 'ملاحظة النشر', kind: 'textarea', required: false, max: NOTE_MAX, placeholder: 'ما الذي نُشر وأين يُختبر؟' },
      ]}
      request={(v) => ticketService.markDeployed(ticketId, { live_url: v.live_url, ...(v.note ? { note: v.note } : {}) })}
    />
  );
}

/** «تم التحقق — وضع كمحلولة»: the assignee confirms the live test passed (a short note is required). This credits. */
export function VerifyResolvedModal({ ticketId, approved, ...rest }: StepProps & { approved?: { points: number | null; minutes: number | null } | null }) {
  const preview = approved && (approved.points != null || approved.minutes != null)
    ? `عند التأكيد تُضاف ${approved.points != null ? `${approved.points} نقطة` : ''}${approved.points != null && approved.minutes != null ? ' ومدة فعلية ' : ''}${approved.minutes != null ? formatDurationMinutes(approved.minutes) : ''} إلى رصيدك ويُغلق الطلب.`
    : 'عند التأكيد تُضاف النقاط والمدة الفعلية المعتمدة إلى رصيدك ويُغلق الطلب.';

  return (
    <TicketStepModal
      {...rest}
      title="تم التحقق — وضع كمحلولة"
      testId="verify-resolved-modal"
      submitLabel="تأكيد الحل"
      busyLabel="جارٍ التأكيد..."
      submitClass="bg-emerald-600 hover:bg-emerald-700"
      successMessage="تم تأكيد الحل وإغلاق التذكرة"
      intro={
        <p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold leading-relaxed text-emerald-800" data-testid="verify-credit-note">
          {preview}
        </p>
      }
      fields={[
        {
          key: 'note',
          label: 'ملاحظة نتيجة الاختبار الحي',
          kind: 'textarea',
          required: true,
          min: NOTE_MIN,
          max: NOTE_MAX,
          placeholder: 'ما الذي اختبرتَه على الموقع الحي وما كانت النتيجة؟',
          requiredMessage: 'اكتب ملاحظة قصيرة عن نتيجة الاختبار الحي.',
        },
      ]}
      request={(v) => ticketService.verifyResolved(ticketId, v.note)}
    />
  );
}

/** The assignee's «إعادة للتنفيذ» after the live test: what he saw (required). A new review, approval and deployment follow. */
export function VerifyFailedModal({ ticketId, ...rest }: StepProps) {
  return (
    <TicketStepModal
      {...rest}
      title="إعادة للتنفيذ بعد الاختبار الحي"
      testId="verify-failed-modal"
      submitLabel="إعادة للتنفيذ"
      busyLabel="جارٍ الإعادة..."
      submitClass="bg-amber-600 hover:bg-amber-700"
      successMessage="أُعيدت التذكرة للتنفيذ"
      intro={
        <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold leading-relaxed text-amber-800" data-testid="verify-failed-note">
          ستعود التذكرة إلى التنفيذ، وتتطلب مراجعة جديدة واعتمادًا ونشرًا جديدًا قبل أن تُختبر من جديد. لا يُضاف أي رصيد.
        </p>
      }
      fields={[
        {
          key: 'description',
          label: 'صف ما رأيته على الموقع الحي',
          kind: 'textarea',
          required: true,
          min: NOTE_MIN,
          max: NOTE_MAX,
          placeholder: 'ما الذي لم يعمل كما هو متوقع؟',
          requiredMessage: 'اكتب وصفًا لما رأيته على الموقع الحي.',
        },
      ]}
      request={(v) => ticketService.verifyFailed(ticketId, v.description)}
    />
  );
}
