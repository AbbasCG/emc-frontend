import { useEffect, useState } from 'react';
import { ticketService } from '@/services/ticketService';
import type { DepartmentalUnit, TicketUser } from '@/types/ticket';
import AssigneeSearchSelect from '@/components/tickets/AssigneeSearchSelect';
import toast from '@/lib/toast';

export interface ReassignTicketModalProps {
  ticketId: number;
  departmentId: number;
  currentUnitId?: number;
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
 * Shared between TechAdminDashboardPage and TicketDetailPage.
 */
export function ReassignTicketModal({
  ticketId,
  departmentId,
  currentUnitId,
  onClose,
  onSuccess,
}: ReassignTicketModalProps) {
  const [unitId, setUnitId] = useState(currentUnitId ? String(currentUnitId) : '');
  const [assignedToId, setAssignedToId] = useState('');
  const [reason, setReason] = useState('');

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

  const handleReassign = async () => {
    if (!assignedToId) {
      toast.error('يجب اختيار المكلف الجديد');
      return;
    }
    setSubmitting(true);
    try {
      await ticketService.reassign(ticketId, {
        assigned_to_id: Number(assignedToId),
        unit_id: unitId ? Number(unitId) : undefined,
        reason,
      });
      toast.success('تمت إعادة التوجيه وتغيير المكلف');
      onSuccess();
    } catch {
      toast.error('حدث خطأ أثناء إعادة التوجيه');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5" dir="rtl">
        <h2 className="text-lg font-extrabold text-slate-900">🔄 إعادة التوجيه وتغيير المكلف</h2>
        <p className="text-xs text-slate-500">ستُعاد التذكرة لحالة (معتمدة) وتُحال للمكلف الجديد.</p>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">الوحدة التقنية</label>
          <select
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
            isDisabled={!unitId || usersLoading}
            isLoading={usersLoading}
            placeholder={!unitId ? 'اختر الوحدة التقنية أولاً' : '-- ابحث عن المكلف بالاسم --'}
            noOptionsMessage={!unitId ? 'اختر الوحدة التقنية أولاً' : 'لا يوجد موظفون مرتبطون بهذه الوحدة'}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">سبب إعادة التوجيه (اختياري)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: اعتذار المكلف الأول، تغيير في النطاق..."
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
            onClick={handleReassign}
            disabled={submitting || !assignedToId}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition disabled:opacity-60"
          >
            {submitting ? 'جاري الحفظ...' : '🔄 تأكيد إعادة التوجيه'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReassignTicketModal;
