import { useId, useState } from 'react';
import { ticketService } from '@/services/ticketService';
import { apiErrorCode, apiMessage } from '@/services/ticketOpsService';
import { DEPLOYMENT_FLAG_LOCKED_MESSAGE } from '@/lib/ticketLifecycle';
import { getLaravelFieldErrors } from '@/api/apiErrors';
import { AssignmentTargetFields } from '@/components/tickets/modals/AssignmentTargetFields';
import { useAssignmentTargets } from '@/hooks/useAssignmentTargets';
import { RequiresDeploymentSwitch } from '@/components/tickets/modals/RequiresDeploymentSwitch';
import TaskEstimateFields from '@/components/operations/TaskEstimateFields';
import { CenteredModal } from '@/components/ui/CenteredModal';
import { useEstimateDraft } from '@/hooks/useEstimateDraft';
import { estimateFromRecord, isLegacyRecord } from '@/lib/taskEstimate';
import toast from '@/lib/toast';

export interface ReassignTicketModalProps {
  ticketId: number;
  departmentId: number;
  currentUnitId?: number;
  /**
   * The ticket's current estimate. A ticket assigned before the estimate existed has none: the fields then open
   * EMPTY with an explanatory note, never prefilled with invented values.
   */
  currentEstimate?: { task_scope?: string | null; task_points?: number | null; estimated_hours?: number | null };
  /** Whether the ticket goes through review, deployment and a live test (the switch starts here). */
  currentRequiresDeployment?: boolean;
  /** The server's `can_edit_estimate` is false (the ticket is in review / deployment): the switch is disabled and nothing is sent for it. */
  deploymentFrozen?: boolean;
  /** Why: the stage, or the manager being the assignee. */
  deploymentFrozenMessage?: string;
  /** The ticket was already submitted for review: the flag cannot be switched off any more. */
  deploymentLocked?: boolean;
  /**
   * Rerouting a DECLINED ticket: the one who declined (the ticket's current assignee) cannot be picked again, so
   * the option is disabled with a hint; the server's 422 stays as the backstop.
   */
  declinedAssigneeId?: number | null;
  /** The previous assignee's reason for declining, shown read-only (a declined ticket can be rerouted). */
  previousDeclineReason?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Reassign / route to a different assignee. Reuses the SAME
 * POST /v1/tickets/{id}/reassign operation the Admin table has always used.
 *
 * This is also the ONLY endpoint that sets an assignee after approval — it
 * serves both "assign for the first time" (when the ticket was approved
 * without one) and "true reassignment", since reassign() itself guards on
 * status only (ASSIGNED/IN_PROGRESS), never on whether an assignee already
 * exists. The caller decides the modal's heading/label based on whether the
 * ticket currently has an assignee; the backend call is identical either way.
 *
 * A new assignee takes the work on with a size, points and an approximate
 * duration, so those are collected here (points required, duration optional).
 *
 * The technical unit is required only when the department has units (the ticket's current unit is
 * preselected); a department without units reassigns straight to its members and sends no `unit_id`.
 *
 * Shared between TechAdminDashboardPage and TicketDetailPage.
 */
export function ReassignTicketModal(props: ReassignTicketModalProps) {
  // A fresh state for every ticket/department: nothing (unit, assignee, lists) carries over.
  return <ReassignTicketModalBody key={`${props.ticketId}:${props.departmentId}`} {...props} />;
}

type ServerFieldErrors = { unit_id?: string; assigned_to_id?: string };

function ReassignTicketModalBody({
  ticketId,
  departmentId,
  currentUnitId,
  currentEstimate,
  currentRequiresDeployment = false,
  deploymentFrozen = false,
  deploymentFrozenMessage,
  deploymentLocked = false,
  previousDeclineReason,
  declinedAssigneeId,
  onClose,
  onSuccess,
}: ReassignTicketModalProps) {
  const formId = useId();
  const targets = useAssignmentTargets(departmentId, currentUnitId);
  const [reason, setReason] = useState('');
  const known = currentEstimate ?? {};
  const estimate = useEstimateDraft(() => estimateFromRecord(known));
  const legacy = isLegacyRecord(known);
  const [requiresDeployment, setRequiresDeployment] = useState(currentRequiresDeployment);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const storedScope = known.task_scope && ['simple', 'medium', 'large', 'strategic'].includes(known.task_scope) ? (known.task_scope as 'simple' | 'medium' | 'large' | 'strategic') : '';

  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ServerFieldErrors>({});

  const handleReassign = async () => {
    if (submitting) return;
    setFailure(null);
    setFieldErrors({});
    setDeploymentError(null);
    if (!targets.canSubmit) {
      toast.error(targets.hasUnits ? 'يجب اختيار الوحدة التقنية والمكلف الجديد' : 'يجب اختيار المكلف الجديد');
      return;
    }
    // An assignee is being chosen: size and points are required (duration stays optional).
    if (!estimate.check(true)) {
      toast.error('أكمل حجم المهمة ونقاطها');
      return;
    }
    setSubmitting(true);
    try {
      await ticketService.reassign(ticketId, {
        assigned_to_id: Number(targets.assigneeId),
        // No unit for a department that has none.
        ...(targets.hasUnits ? { unit_id: Number(targets.unitId) } : {}),
        reason,
        ...(deploymentFrozen ? {} : { requires_deployment: requiresDeployment }),
        ...estimate.payload(),
      });
      toast.success('تمت إعادة التوجيه وتغيير المكلف');
      onSuccess();
    } catch (e) {
      if (apiErrorCode(e) === 'DEPLOYMENT_FLAG_LOCKED') {
        // The server refused to switch the flag off: say so right at the switch, and keep it on.
        setDeploymentError(apiMessage(e, DEPLOYMENT_FLAG_LOCKED_MESSAGE));
        setRequiresDeployment(true);
      } else if (estimate.fromServer(e)) {
        toast.error('راجع النقاط والمدة');
      } else {
        const server = getLaravelFieldErrors(e);
        const mapped: ServerFieldErrors = { unit_id: server.unit_id, assigned_to_id: server.assigned_to_id };
        if (mapped.unit_id || mapped.assigned_to_id) {
          setFieldErrors(mapped);
          toast.error(mapped.assigned_to_id ?? mapped.unit_id ?? 'تعذرت إعادة التوجيه');
        } else {
          const message = apiMessage(e, 'حدث خطأ أثناء إعادة التوجيه');
          setFailure(message);
          toast.error(message);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CenteredModal
      open
      onClose={onClose}
      size="md"
      testId="reassign-ticket-modal"
      busy={submitting}
      dirty={Boolean(targets.assigneeId || reason.trim() || requiresDeployment !== currentRequiresDeployment)}
      title="إعادة التوجيه وتغيير المكلف"
      subtitle="ستُعاد التذكرة لحالة (معتمدة) وتُحال للمكلف الجديد."
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
            disabled={submitting || !targets.canSubmit}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition disabled:opacity-60"
          >
            {submitting ? 'جاري الحفظ...' : 'تأكيد إعادة التوجيه'}
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
          void handleReassign();
        }}
      >
        {previousDeclineReason ? (
          <section aria-label="سبب اعتذار المكلف السابق" className="rounded-xl border border-rose-200 bg-rose-50/70 p-3" data-testid="previous-decline-reason">
            <h3 className="mb-1 text-[11px] font-black text-rose-700">سبب اعتذار المكلف السابق</h3>
            <p className="whitespace-pre-wrap break-words text-xs font-semibold leading-relaxed text-slate-700">{previousDeclineReason}</p>
          </section>
        ) : null}

        <AssignmentTargetFields
          formId={formId}
          targets={targets}
          unitLabel="الوحدة التقنية"
          assigneeLabel="المكلف الجديد"
          assigneeInstanceId="reassign-modal-assignee"
          disabled={submitting}
          disabledUserIds={declinedAssigneeId ? [declinedAssigneeId] : []}
          disabledHint="اعتذر عن هذه التذكرة"
          errors={fieldErrors}
          onUnitChange={() => setFieldErrors((f) => ({ ...f, unit_id: undefined }))}
          onAssigneeChange={() => setFieldErrors((f) => ({ ...f, assigned_to_id: undefined }))}
        />

        <TaskEstimateFields
          value={estimate.draft}
          onChange={estimate.setDraft}
          errors={estimate.errors}
          idPrefix={`${formId}-est`}
          legacy={legacy}
          disabled={submitting}
          ticketMode={{ requiresDeployment, pointsOptions: targets.pointsOptions, pointsLoading: targets.phase === 'loading', stored: { scope: storedScope, points: known.task_points == null ? '' : String(known.task_points) } }}
        />

        <RequiresDeploymentSwitch checked={requiresDeployment} onChange={(v) => { setRequiresDeployment(v); setDeploymentError(null); }} disabled={submitting} frozen={deploymentFrozen} frozenMessage={deploymentFrozenMessage} locked={deploymentLocked} error={deploymentError} />

        <div>
          <label htmlFor={`${formId}-reason`} className="block text-xs font-bold text-slate-700 mb-1.5">سبب إعادة التوجيه (اختياري)</label>
          <input
            id={`${formId}-reason`}
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: اعتذار المكلف الأول، تغيير في النطاق..."
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {failure ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{failure}</p>
        ) : null}
      </form>
    </CenteredModal>
  );
}

export default ReassignTicketModal;
