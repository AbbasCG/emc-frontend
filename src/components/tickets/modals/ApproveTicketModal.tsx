import { useEffect, useId, useState } from 'react';
import { ticketService } from '@/services/ticketService';
import { apiMessage } from '@/services/ticketOpsService';
import type { DepartmentalUnit, TicketUser } from '@/types/ticket';
import AssigneeSearchSelect from '@/components/tickets/AssigneeSearchSelect';
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
 * table has always used — unit + assignee + SLA are all required together
 * here exactly as they were there, because backend approve() treats them as
 * one atomic decision (PENDING_APPROVAL -> ASSIGNED). There is deliberately no
 * separate "approve without assigning" path in this UI, matching the existing
 * product behaviour rather than loosening it.
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
export function ApproveTicketModal({ ticketId, departmentId, onClose, onSuccess }: ApproveTicketModalProps) {
  const formId = useId();
  const [unitId, setUnitId] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [slaHours, setSlaHours] = useState('24');
  const [notes, setNotes] = useState('');
  const estimate = useEstimateDraft(emptyEstimate);

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

  const handleApprove = async () => {
    if (submitting) return;
    setFailure(null);
    if (!assignedToId || !unitId || !slaHours) {
      toast.error('يجب تحديد الوحدة التقنية والمكلف ومدة الـ SLA');
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
        unit_id: Number(unitId),
        assigned_to_id: Number(assignedToId),
        sla_hours: Number(slaHours),
        internal_notes: notes,
        ...estimate.payload(),
      });
      toast.success('تم اعتماد التذكرة وإحالتها للمكلف');
      onSuccess();
    } catch (e) {
      if (!estimate.fromServer(e)) {
        const message = apiMessage(e, 'حدث خطأ أثناء الاعتماد');
        setFailure(message);
        toast.error(message);
      } else {
        toast.error('راجع النقاط والمدة');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const dirty = Boolean(unitId || assignedToId || notes.trim() || estimate.draft.scope || estimate.draft.points);

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
            disabled={submitting}
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
        <div>
          <label htmlFor={`${formId}-unit`} className="block text-xs font-bold text-slate-700 mb-1.5">
            الوحدة التقنية المستهدفة <span className="text-rose-500">*</span>
          </label>
          <select
            id={`${formId}-unit`}
            value={unitId}
            disabled={unitsLoading}
            onChange={(e) => { setUnitId(e.target.value); setAssignedToId(''); }}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
          >
            <option value="">
              {unitsLoading ? 'جارٍ تحميل الوحدات...' : '-- اختر الوحدة التقنية (من الوحدات المتاحة) --'}
            </option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name_ar}</option>
            ))}
          </select>
          {!unitsLoading && units.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1">لا توجد وحدات تقنية مُعرّفة لإدارة هذه التذكرة بعد.</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            الموظف المكلف بالإنجاز <span className="text-rose-500">*</span>
          </label>
          <AssigneeSearchSelect
            instanceId="approve-modal-assignee"
            ariaLabel="الموظف المكلف بالإنجاز"
            users={users}
            value={assignedToId}
            onChange={setAssignedToId}
            isDisabled={!unitId || usersLoading}
            isLoading={usersLoading}
            placeholder={!unitId ? 'اختر الوحدة التقنية أولاً' : '-- ابحث عن المكلف بالاسم --'}
            noOptionsMessage={!unitId ? 'اختر الوحدة التقنية أولاً' : 'لا يوجد موظفون مرتبطون بهذه الوحدة'}
          />
        </div>

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
