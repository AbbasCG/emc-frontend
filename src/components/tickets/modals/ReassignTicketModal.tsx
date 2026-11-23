import { useEffect, useId, useState } from 'react';
import { ticketService } from '@/services/ticketService';
import { apiMessage } from '@/services/ticketOpsService';
import type { DepartmentalUnit, TicketUser } from '@/types/ticket';
import AssigneeSearchSelect from '@/components/tickets/AssigneeSearchSelect';
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
 * Shared between TechAdminDashboardPage and TicketDetailPage.
 */
export function ReassignTicketModal({
  ticketId,
  departmentId,
  currentUnitId,
  currentEstimate,
  previousDeclineReason,
  declinedAssigneeId,
  onClose,
  onSuccess,
}: ReassignTicketModalProps) {
  const formId = useId();
  const [unitId, setUnitId] = useState(currentUnitId ? String(currentUnitId) : '');
  const [assignedToId, setAssignedToId] = useState('');
  const [reason, setReason] = useState('');
  const known = currentEstimate ?? {};
  const estimate = useEstimateDraft(() => estimateFromRecord(known));
  const legacy = isLegacyRecord(known);

  const [units, setUnits] = useState<DepartmentalUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [users, setUsers] = useState<TicketUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the unit and user lists when the modal inputs change
    setUnitsLoading(true);
    ticketService.getMeta({ department_id: departmentId })
      .then((meta) => { if (!cancelled) setUnits(meta.tech_units ?? []); })
      .catch(() => { if (!cancelled) toast.error('تعذر تحميل الوحدات التقنية'); })
      .finally(() => { if (!cancelled) setUnitsLoading(false); });
    return () => { cancelled = true; };
  }, [departmentId]);

  useEffect(() => {
    if (!unitId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the unit and user lists when the modal inputs change
      setUsers([]);
      return;
    }
    let cancelled = false;
    setUsersLoading(true);
    ticketService.getMeta({ department_id: departmentId, unit_id: Number(unitId) })
      .then((meta) => { if (!cancelled) setUsers(meta.users ?? []); })
      .catch(() => { if (!cancelled) toast.error('تعذر تحميل قائمة الموظفين'); })
      .finally(() => { if (!cancelled) setUsersLoading(false); });
    return () => { cancelled = true; };
  }, [departmentId, unitId]);

  const handleReassign = async () => {
    if (submitting) return;
    setFailure(null);
    if (!assignedToId) {
      toast.error('يجب اختيار المكلف الجديد');
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
        assigned_to_id: Number(assignedToId),
        unit_id: unitId ? Number(unitId) : undefined,
        reason,
        ...estimate.payload(),
      });
      toast.success('تمت إعادة التوجيه وتغيير المكلف');
      onSuccess();
    } catch (e) {
      if (!estimate.fromServer(e)) {
        const message = apiMessage(e, 'حدث خطأ أثناء إعادة التوجيه');
        setFailure(message);
        toast.error(message);
      } else {
        toast.error('راجع النقاط والمدة');
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
      dirty={Boolean(assignedToId || reason.trim())}
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
            disabled={submitting || !assignedToId}
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

        <div>
          <label htmlFor={`${formId}-unit`} className="block text-xs font-bold text-slate-700 mb-1.5">الوحدة التقنية</label>
          <select
            id={`${formId}-unit`}
            value={unitId}
            disabled={unitsLoading}
            onChange={(e) => { setUnitId(e.target.value); setAssignedToId(''); }}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
          >
            <option value="">— إبقاء الوحدة الحالية —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name_ar}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            المكلف الجديد <span className="text-rose-500">*</span>
          </label>
          <AssigneeSearchSelect
            instanceId="reassign-modal-assignee"
            ariaLabel="المكلف الجديد"
            users={users}
            value={assignedToId}
            onChange={setAssignedToId}
            disabledUserIds={declinedAssigneeId ? [declinedAssigneeId] : []}
            disabledHint="اعتذر عن هذه التذكرة"
            isDisabled={!unitId || usersLoading}
            isLoading={usersLoading}
            placeholder={!unitId ? 'اختر الوحدة التقنية أولاً' : '-- ابحث عن المكلف بالاسم --'}
            noOptionsMessage={!unitId ? 'اختر الوحدة التقنية أولاً' : 'لا يوجد موظفون مرتبطون بهذه الوحدة'}
          />
        </div>

        <TaskEstimateFields
          value={estimate.draft}
          onChange={estimate.setDraft}
          errors={estimate.errors}
          idPrefix={`${formId}-est`}
          legacy={legacy}
          disabled={submitting}
        />

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
