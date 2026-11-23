import { useId, useState } from 'react';
import { ticketService } from '@/services/ticketService';
import { apiMessage } from '@/services/ticketOpsService';
import { getLaravelFieldErrors } from '@/api/apiErrors';
import { AssignmentTargetFields } from '@/components/tickets/modals/AssignmentTargetFields';
import { useAssignmentTargets } from '@/hooks/useAssignmentTargets';
import TaskEstimateFields from '@/components/operations/TaskEstimateFields';
import { CenteredModal } from '@/components/ui/CenteredModal';
import { useEstimateDraft } from '@/hooks/useEstimateDraft';
import { emptyEstimate } from '@/lib/taskEstimate';
import toast from '@/lib/toast';

const SLA_HOUR_OPTIONS = [
  { value: '4',   label: '4 ساعات' },
  { value: '8',   label: '8 ساعات (يوم عمل)' },
  { value: '24',  label: '24 ساعة' },
  { value: '48',  label: '48 ساعة (يومان)' },
  { value: '72',  label: '72 ساعة (3 أيام)' },
  { value: '120', label: '5 أيام عمل' },
  { value: '168', label: 'أسبوع كامل' },
];

export interface ApproveTicketModalProps {
  ticketId: number;
  departmentId: number;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Approve + assign, in one canonical operation.
 *
 * This is the SAME POST /v1/tickets/{id}/approve business operation the Admin
 * table has always used — assignee + SLA are required together, because backend
 * approve() treats them as one atomic decision (PENDING_APPROVAL -> ASSIGNED).
 * The technical unit is required ONLY when the department has units; a department
 * without any assigns straight to its members and sends no `unit_id`
 * (see useAssignmentTargets). There is deliberately no separate "approve without
 * assigning" path in this UI.
 *
 * Because an assignee is always chosen here, the work estimate (size, points,
 * approximate duration) is required too — the same rule the server applies.
 *
 * Shared between TechAdminDashboardPage and TicketDetailPage so the two
 * surfaces can never drift on what approving a ticket requires.
 *
 * Layout: ONE scroll area (the body) between a fixed header and a fixed footer
 * (إلغاء / تأكيد), so the actions are always visible, on a 375px phone too.
 */
export function ApproveTicketModal(props: ApproveTicketModalProps) {
  // A fresh state for every ticket/department: nothing (unit, assignee, lists) carries over.
  return <ApproveTicketModalBody key={`${props.ticketId}:${props.departmentId}`} {...props} />;
}

type ServerFieldErrors = { unit_id?: string; assigned_to_id?: string };

function ApproveTicketModalBody({ ticketId, departmentId, onClose, onSuccess }: ApproveTicketModalProps) {
  const formId = useId();
  const targets = useAssignmentTargets(departmentId);
  const [slaHours, setSlaHours] = useState('24');
  const [notes, setNotes] = useState('');
  const estimate = useEstimateDraft(emptyEstimate);

  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ServerFieldErrors>({});

  const handleApprove = async () => {
    if (submitting) return;
    setFailure(null);
    setFieldErrors({});
    if (!targets.canSubmit || !slaHours) {
      toast.error(targets.hasUnits ? 'يجب تحديد الوحدة التقنية والمكلف ومدة الـ SLA' : 'يجب تحديد المكلف ومدة الـ SLA');
      return;
    }
    // The estimate is required whenever an assignee is chosen (and one always is here).
    if (!estimate.check(true)) {
      toast.error('أكمل حجم المهمة ونقاطها');
      return;
    }
    setSubmitting(true);
    try {
      await ticketService.approveTicket(ticketId, {
        // No unit for a department that has none.
        ...(targets.hasUnits ? { unit_id: Number(targets.unitId) } : {}),
        assigned_to_id: Number(targets.assigneeId),
        sla_hours: Number(slaHours),
        internal_notes: notes,
        ...estimate.payload(),
      });
      toast.success('تم اعتماد التذكرة وإحالتها للمكلف');
      onSuccess();
    } catch (e) {
      if (estimate.fromServer(e)) {
        toast.error('راجع النقاط والمدة');
      } else {
        const server = getLaravelFieldErrors(e);
        const mapped: ServerFieldErrors = { unit_id: server.unit_id, assigned_to_id: server.assigned_to_id };
        if (mapped.unit_id || mapped.assigned_to_id) {
          setFieldErrors(mapped);
          toast.error(mapped.assigned_to_id ?? mapped.unit_id ?? 'تعذر الاعتماد');
        } else {
          const message = apiMessage(e, 'حدث خطأ أثناء الاعتماد');
          setFailure(message);
          toast.error(message);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const dirty = Boolean(targets.unitId || targets.assigneeId || notes.trim() || estimate.draft.scope || estimate.draft.points);

  return (
    <CenteredModal
      open
      onClose={onClose}
      size="md"
      testId="approve-ticket-modal"
      busy={submitting}
      dirty={dirty}
      title="اعتماد التذكرة وتحديد التكليف"
      footer={(requestClose) => (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={requestClose}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form={formId}
            disabled={submitting || !targets.canSubmit || !slaHours}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition disabled:opacity-60"
          >
            {submitting ? 'جاري الاعتماد...' : 'تأكيد الاعتماد والإحالة'}
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
        <AssignmentTargetFields
          formId={formId}
          targets={targets}
          unitLabel="الوحدة التقنية المستهدفة"
          assigneeLabel="الموظف المكلف بالإنجاز"
          assigneeInstanceId="approve-modal-assignee"
          disabled={submitting}
          errors={fieldErrors}
          onUnitChange={() => setFieldErrors((f) => ({ ...f, unit_id: undefined }))}
          onAssigneeChange={() => setFieldErrors((f) => ({ ...f, assigned_to_id: undefined }))}
        />

        <div>
          <label htmlFor={`${formId}-sla`} className="block text-xs font-bold text-slate-700 mb-1.5">
            مدة الـ SLA المسموح بها <span className="text-rose-500">*</span>
          </label>
          <select
            id={`${formId}-sla`}
            value={slaHours}
            onChange={(e) => setSlaHours(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {SLA_HOUR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <TaskEstimateFields
          value={estimate.draft}
          onChange={estimate.setDraft}
          errors={estimate.errors}
          idPrefix={`${formId}-est`}
          disabled={submitting}
        />

        <div>
          <label htmlFor={`${formId}-notes`} className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات داخلية (اختياري)</label>
          <textarea
            id={`${formId}-notes`}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="توجيهات للمكلف أو السياق الإضافي..."
            className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        {failure ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{failure}</p>
        ) : null}
      </form>
    </CenteredModal>
  );
}

export default ApproveTicketModal;
