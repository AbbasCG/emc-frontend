import { useEffect, useState } from 'react';
import { ticketService } from '@/services/ticketService';
import type { DepartmentalUnit, TicketUser } from '@/types/ticket';
import AssigneeSearchSelect from '@/components/tickets/AssigneeSearchSelect';
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
 * Shared between TechAdminDashboardPage and TicketDetailPage so the two
 * surfaces can never drift on what approving a ticket requires.
 */
export function ApproveTicketModal({ ticketId, departmentId, onClose, onSuccess }: ApproveTicketModalProps) {
  const [unitId, setUnitId] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [slaHours, setSlaHours] = useState('24');
  const [notes, setNotes] = useState('');

  const [units, setUnits] = useState<DepartmentalUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [users, setUsers] = useState<TicketUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUnitsLoading(true);
    ticketService.getMeta({ department_id: departmentId })
      .then((meta) => { if (!cancelled) setUnits(meta.tech_units ?? []); })
      .catch(() => { if (!cancelled) toast.error('تعذر تحميل الوحدات التقنية'); })
      .finally(() => { if (!cancelled) setUnitsLoading(false); });
    return () => { cancelled = true; };
  }, [departmentId]);

  useEffect(() => {
    if (!unitId) {
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
    if (!assignedToId || !unitId || !slaHours) {
      toast.error('يجب تحديد الوحدة التقنية والمكلف ومدة الـ SLA');
      return;
    }
    setSubmitting(true);
    try {
      await ticketService.approveTicket(ticketId, {
        unit_id: Number(unitId),
        assigned_to_id: Number(assignedToId),
        sla_hours: Number(slaHours),
        internal_notes: notes,
      });
      toast.success('تم اعتماد التذكرة وإحالتها للمكلف');
      onSuccess();
    } catch {
      toast.error('حدث خطأ أثناء الاعتماد');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-5" dir="rtl">
        <h2 className="text-lg font-extrabold text-slate-900">✅ اعتماد التذكرة وتحديد التكليف</h2>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            الوحدة التقنية المستهدفة <span className="text-rose-500">*</span>
          </label>
          <select
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
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            مدة الـ SLA المسموح بها <span className="text-rose-500">*</span>
          </label>
          <select
            value={slaHours}
            onChange={(e) => setSlaHours(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {SLA_HOUR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات داخلية (اختياري)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="توجيهات للمكلف أو السياق الإضافي..."
            className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition disabled:opacity-60"
          >
            {submitting ? 'جاري الاعتماد...' : '✅ تأكيد الاعتماد والإحالة'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApproveTicketModal;
