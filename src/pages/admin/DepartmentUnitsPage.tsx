import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Layers, Plus, UserMinus, Users, X } from 'lucide-react';
import { ticketService } from '@/services/ticketService';
import { unitMembersApi, type DepartmentalUnitRow, type TeamMemberRow } from '@/api/unitMembersApi';
import type { Department } from '@/types/ticket';
import AssigneeSearchSelect from '@/components/tickets/AssigneeSearchSelect';
import toast from '@/lib/toast';

/**
 * Admin-only page: manage which department a technical unit belongs to, and
 * which team members belong to which unit — the missing UI layer on top of
 * the EMC Tickets unit-assignment backend work. Every write here is
 * re-validated server-side (department-consistency, leadership/global
 * authorization); this page only shapes the requests and reflects results.
 */
export default function DepartmentUnitsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  const [units, setUnits] = useState<DepartmentalUnitRow[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [unassigned, setUnassigned] = useState<TeamMemberRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [manageUnit, setManageUnit] = useState<DepartmentalUnitRow | null>(null);
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);

  const [showCreateUnit, setShowCreateUnit] = useState(false);
  const [createForm, setCreateForm] = useState({ code: '', name_ar: '', name_en: '' });
  const [creatingUnit, setCreatingUnit] = useState(false);

  useEffect(() => {
    ticketService.getMeta()
      .then((meta) => {
        setDepartments(meta.departments ?? []);
        if (meta.departments?.[0]) setDepartmentId(meta.departments[0].id);
      })
      .catch(() => toast.error('تعذر تحميل قائمة الإدارات'))
      .finally(() => setLoadingDepartments(false));
  }, []);

  const loadUnits = useCallback(async () => {
    if (!departmentId) return;
    setLoadingUnits(true);
    try {
      setUnits(await unitMembersApi.listUnits(departmentId));
    } catch {
      toast.error('تعذر تحميل الوحدات التقنية');
    } finally {
      setLoadingUnits(false);
    }
  }, [departmentId]);

  const loadMembers = useCallback(async () => {
    if (!departmentId) return;
    setLoadingMembers(true);
    try {
      const [all, none] = await Promise.all([
        unitMembersApi.listMembers(departmentId),
        unitMembersApi.listMembers(departmentId, { unitId: 'null' }),
      ]);
      setMembers(all);
      setUnassigned(none);
    } catch {
      toast.error('تعذر تحميل أعضاء الإدارة');
    } finally {
      setLoadingMembers(false);
    }
  }, [departmentId]);

  useEffect(() => { loadUnits(); loadMembers(); }, [loadUnits, loadMembers]);

  const membersByUnit = useMemo(() => {
    const map = new Map<number, TeamMemberRow[]>();
    for (const m of members) {
      if (!m.unit) continue;
      const list = map.get(m.unit.id) ?? [];
      list.push(m);
      map.set(m.unit.id, list);
    }
    return map;
  }, [members]);

  const assignableOptions = useMemo(
    () => unassigned
      .filter((m) => m.user)
      .map((m) => ({ id: m.user!.id, name: m.user!.name, email: m.user!.email })),
    [unassigned],
  );

  async function handleCreateUnit() {
    if (!departmentId || !createForm.code.trim() || !createForm.name_ar.trim()) {
      toast.error('الرمز واسم الوحدة بالعربية إلزاميان');
      return;
    }
    setCreatingUnit(true);
    try {
      await unitMembersApi.createUnit({
        department_id: departmentId,
        code: createForm.code.trim(),
        name_ar: createForm.name_ar.trim(),
        name_en: createForm.name_en.trim() || undefined,
      });
      toast.success('تم إنشاء الوحدة التقنية');
      setShowCreateUnit(false);
      setCreateForm({ code: '', name_ar: '', name_en: '' });
      loadUnits();
    } catch {
      toast.error('تعذر إنشاء الوحدة — تحقق من عدم تكرار الرمز');
    } finally {
      setCreatingUnit(false);
    }
  }

  async function handleToggleActive(unit: DepartmentalUnitRow) {
    try {
      await unitMembersApi.updateUnit(unit.id, { is_active: !unit.is_active });
      toast.success(unit.is_active ? 'تم تعطيل الوحدة' : 'تم تفعيل الوحدة');
      loadUnits();
    } catch {
      toast.error('تعذر تحديث حالة الوحدة');
    }
  }

  async function handleAssignToManagedUnit() {
    if (!manageUnit || !newAssigneeId) return;
    // newAssigneeId carries the team_member's own id (see AssigneeSearchSelect
    // usage below — users prop is built from unassigned members, id = user id,
    // so we resolve back to the team_members row id before calling the API).
    const member = unassigned.find((m) => String(m.user?.id) === newAssigneeId);
    if (!member) return;
    setSavingAssignment(true);
    try {
      await unitMembersApi.setMemberUnit(member.id, manageUnit.id);
      toast.success('تم إسناد العضو للوحدة');
      setNewAssigneeId('');
      await Promise.all([loadUnits(), loadMembers()]);
    } catch {
      toast.error('تعذر الإسناد — تحقق من انتماء العضو لنفس الإدارة');
    } finally {
      setSavingAssignment(false);
    }
  }

  async function handleRemoveFromUnit(member: TeamMemberRow) {
    try {
      await unitMembersApi.setMemberUnit(member.id, null);
      toast.success('تمت إزالة العضو من الوحدة (بقيت عضويته في الإدارة)');
      await Promise.all([loadUnits(), loadMembers()]);
    } catch {
      toast.error('تعذر إزالة العضو من الوحدة');
    }
  }

  async function handleMoveMember(member: TeamMemberRow, targetUnitId: number) {
    try {
      await unitMembersApi.setMemberUnit(member.id, targetUnitId);
      toast.success('تم نقل العضو للوحدة الجديدة');
      await Promise.all([loadUnits(), loadMembers()]);
    } catch {
      toast.error('تعذر نقل العضو — تحقق من انتماء الوحدة لنفس الإدارة');
    }
  }

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <header className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
        <h1 className="text-xl font-black text-deepBlue flex items-center gap-2">
          <Building2 size={20} className="text-customBlue" />
          إدارة الوحدات التقنية وأعضائها
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          اختر إدارة لعرض وحداتها التقنية وأعضاء كل وحدة — إسناد، نقل، أو إزالة عضو من وحدة يبقي عضويته في الإدارة نفسها.
        </p>

        <div className="mt-4 max-w-sm">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">الإدارة</label>
          <select
            value={departmentId ?? ''}
            disabled={loadingDepartments}
            onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
          >
            {loadingDepartments && <option value="">جارٍ تحميل الإدارات...</option>}
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name_ar}</option>
            ))}
          </select>
        </div>
      </header>

      {departmentId && (
        <>
          <div className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-deepBlue flex items-center gap-2">
                <Layers size={16} className="text-customBlue" /> الوحدات التقنية
              </h2>
              <button
                onClick={() => setShowCreateUnit(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-customBlue text-white text-xs font-bold hover:bg-deepBlue transition"
              >
                <Plus size={14} /> وحدة جديدة
              </button>
            </div>

            {loadingUnits ? (
              <p className="text-xs text-slate-400 py-6 text-center">جارٍ التحميل...</p>
            ) : units.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">لا توجد وحدات تقنية لهذه الإدارة بعد. أنشئ واحدة للبدء.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {units.map((u) => (
                  <div key={u.id} className={`rounded-xl border p-4 ${u.is_active ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{u.name_ar}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{u.code}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        {u.is_active ? 'مفعّلة' : 'معطّلة'}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                      <Users size={12} /> {u.member_count} عضو نشط
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setManageUnit(u)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-[11px] font-bold transition"
                      >
                        إدارة موظفي الوحدة
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-[11px] font-bold transition"
                      >
                        {u.is_active ? 'تعطيل' : 'تفعيل'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
            <h2 className="text-sm font-black text-amber-800 mb-1">موظفون بدون وحدة</h2>
            <p className="text-[11px] text-amber-700 mb-3">أعضاء نشطون في هذه الإدارة لم يتم إسنادهم لأي وحدة تقنية بعد.</p>
            {loadingMembers ? (
              <p className="text-xs text-amber-600">جارٍ التحميل...</p>
            ) : unassigned.length === 0 ? (
              <p className="text-xs text-amber-600">لا يوجد أعضاء بدون وحدة.</p>
            ) : (
              <ul className="space-y-1.5">
                {unassigned.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 border border-amber-100">
                    <span>{m.user?.name}</span>
                    <span className="text-slate-400">{m.user?.role}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* ── Manage unit members modal ── */}
      {manageUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">إدارة موظفي الوحدة — {manageUnit.name_ar}</h2>
              <button onClick={() => { setManageUnit(null); setNewAssigneeId(''); }} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">إسناد عضو غير مُسند لهذه الوحدة</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <AssigneeSearchSelect
                    instanceId="unit-assign-select"
                    ariaLabel="اختر عضواً للإسناد"
                    users={assignableOptions}
                    value={newAssigneeId}
                    onChange={setNewAssigneeId}
                    placeholder="-- ابحث عن موظف بالاسم --"
                    noOptionsMessage="لا يوجد أعضاء غير مُسندين"
                  />
                </div>
                <button
                  onClick={handleAssignToManagedUnit}
                  disabled={!newAssigneeId || savingAssignment}
                  className="px-4 py-2.5 rounded-xl bg-customBlue hover:bg-deepBlue text-white text-sm font-bold transition disabled:opacity-50"
                >
                  إسناد
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700 mb-1.5">أعضاء الوحدة الحاليون</p>
              {(membersByUnit.get(manageUnit.id) ?? []).length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">لا يوجد أعضاء في هذه الوحدة بعد.</p>
              ) : (
                <ul className="space-y-2">
                  {(membersByUnit.get(manageUnit.id) ?? []).map((m) => (
                    <li key={m.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{m.user?.name}</p>
                        <p className="text-[11px] text-slate-400">{m.user?.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {units.filter((u) => u.id !== manageUnit.id).length > 0 && (
                          <select
                            defaultValue=""
                            onChange={(e) => { if (e.target.value) handleMoveMember(m, Number(e.target.value)); }}
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] font-bold text-slate-600 outline-none"
                          >
                            <option value="">نقل إلى...</option>
                            {units.filter((u) => u.id !== manageUnit.id).map((u) => (
                              <option key={u.id} value={u.id}>{u.name_ar}</option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={() => handleRemoveFromUnit(m)}
                          title="إزالة من الوحدة (تبقى عضويته في الإدارة)"
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                        >
                          <UserMinus size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create unit modal ── */}
      {showCreateUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5">
            <h2 className="text-lg font-extrabold text-slate-900">وحدة تقنية جديدة</h2>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الرمز <span className="text-rose-500">*</span></label>
              <input
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                placeholder="مثال: SW_DEV"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم بالعربية <span className="text-rose-500">*</span></label>
              <input
                value={createForm.name_ar}
                onChange={(e) => setCreateForm({ ...createForm, name_ar: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم بالإنجليزية (اختياري)</label>
              <input
                value={createForm.name_en}
                onChange={(e) => setCreateForm({ ...createForm, name_en: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowCreateUnit(false)} className="px-5 py-2.5 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-50">
                إلغاء
              </button>
              <button
                onClick={handleCreateUnit}
                disabled={creatingUnit}
                className="px-6 py-2.5 rounded-xl bg-customBlue hover:bg-deepBlue text-white text-sm font-bold transition disabled:opacity-60"
              >
                {creatingUnit ? 'جارٍ الإنشاء...' : 'إنشاء الوحدة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
