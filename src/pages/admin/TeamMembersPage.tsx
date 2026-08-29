import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, UserRoundCog, X } from 'lucide-react';
import { ticketService } from '@/services/ticketService';
import { unitMembersApi, type DepartmentalUnitRow, type TeamMemberRow } from '@/api/unitMembersApi';
import type { Department } from '@/types/ticket';
import UserSearchSelect from '@/components/admin/UserSearchSelect';
import toast from '@/lib/toast';

const STATUS_LABEL: Record<TeamMemberRow['status'], string> = {
  active: 'نشط',
  inactive: 'غير نشط',
  on_leave: 'في إجازة',
};

type FormState = {
  editingId: number | null;
  user: { id: number; name: string } | null;
  departmentId: number | null;
  unitId: string;
  roleTitle: string;
  status: TeamMemberRow['status'];
  joinedAt: string;
};

const EMPTY_FORM: FormState = {
  editingId: null,
  user: null,
  departmentId: null,
  unitId: '',
  roleTitle: '',
  status: 'active',
  joinedAt: '',
};

/**
 * Creates and manages team_members rows — the missing piece between having a
 * user account and that person being usable anywhere department-scoped
 * (Unit Management, Ticket assignment, Meeting/Weekly Report leadership).
 * Every write here is re-validated server-side; this page only shapes
 * requests and reflects results.
 */
export default function TeamMembersPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  const [filterDepartmentId, setFilterDepartmentId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [formUnits, setFormUnits] = useState<DepartmentalUnitRow[]>([]);
  const [loadingFormUnits, setLoadingFormUnits] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    ticketService.getMeta()
      .then((meta) => setDepartments(meta.departments ?? []))
      .catch(() => toast.error('تعذر تحميل قائمة الإدارات'))
      .finally(() => setLoadingDepartments(false));
  }, []);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const rows = await unitMembersApi.listMembers(filterDepartmentId ?? undefined, {
        status: filterStatus || undefined,
        search: search.trim() || undefined,
        perPage: 100,
      });
      setMembers(rows);
    } catch {
      toast.error('تعذر تحميل أعضاء الإدارات');
    } finally {
      setLoadingMembers(false);
    }
  }, [filterDepartmentId, filterStatus, search]);

  useEffect(() => {
    const t = setTimeout(loadMembers, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [loadMembers, search]);

  // Load units for whichever department is selected inside the form (not
  // the page-level filter) — clears/reloads whenever that changes.
  useEffect(() => {
    if (!form.departmentId) {
      setFormUnits([]);
      return;
    }
    let cancelled = false;
    setLoadingFormUnits(true);
    unitMembersApi.listUnits(form.departmentId)
      .then((rows) => { if (!cancelled) setFormUnits(rows); })
      .catch(() => { if (!cancelled) toast.error('تعذر تحميل الوحدات التقنية'); })
      .finally(() => { if (!cancelled) setLoadingFormUnits(false); });
    return () => { cancelled = true; };
  }, [form.departmentId]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(m: TeamMemberRow) {
    if (!m.user) return;
    setForm({
      editingId: m.id,
      user: { id: m.user.id, name: m.user.name },
      departmentId: m.department?.id ?? null,
      unitId: m.unit ? String(m.unit.id) : '',
      roleTitle: m.role_title ?? '',
      status: m.status,
      joinedAt: m.joined_at ?? '',
    });
    setFormError(null);
    setModalOpen(true);
  }

  function handleDepartmentChange(id: number | null) {
    // Changing department invalidates any previously selected unit.
    setForm((f) => ({ ...f, departmentId: id, unitId: '' }));
  }

  async function handleSave() {
    setFormError(null);
    if (!form.user) {
      setFormError('يجب اختيار مستخدم');
      return;
    }
    if (!form.departmentId) {
      setFormError('يجب اختيار الإدارة');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        department_id: form.departmentId,
        unit_id: form.unitId ? Number(form.unitId) : null,
        role_title: form.roleTitle.trim() || undefined,
        status: form.status,
        joined_at: form.joinedAt || undefined,
      };
      if (form.editingId) {
        await unitMembersApi.updateMember(form.editingId, payload);
        toast.success('تم تحديث بيانات العضو');
      } else {
        await unitMembersApi.createMember({ user_id: form.user.id, ...payload });
        toast.success('تمت إضافة العضو إلى الإدارة');
      }
      setModalOpen(false);
      loadMembers();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'تعذر حفظ بيانات العضو — تحقق من عدم تكرار العضوية أو توافق الوحدة مع الإدارة';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  const filteredCount = members.length;
  const departmentOptionsForFilter = useMemo(() => departments, [departments]);

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <header className="rounded-2xl border border-deepBlue/[0.06] bg-white p-6 shadow-sm">
        <h1 className="text-xl font-black text-deepBlue flex items-center gap-2">
          <UserRoundCog size={20} className="text-customBlue" />
          أعضاء الإدارات
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          هنا يتحول حساب مستخدم موجود إلى عضو عملياتي في إدارة — الخطوة اللازمة قبل ظهوره في إدارة الوحدات التقنية أو كمكلف محتمل بالتذاكر.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px]">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">تصفية حسب الإدارة</label>
            <select
              value={filterDepartmentId ?? ''}
              disabled={loadingDepartments}
              onChange={(e) => setFilterDepartmentId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
            >
              <option value="">كل الإدارات</option>
              {departmentOptionsForFilter.map((d) => (
                <option key={d.id} value={d.id}>{d.name_ar}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[160px]">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الحالة</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="on_leave">في إجازة</option>
            </select>
          </div>

          <div className="min-w-[240px] flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">بحث</label>
            <div className="relative">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                className="w-full rounded-xl border border-slate-300 pr-9 pl-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-customBlue text-white text-sm font-bold hover:bg-deepBlue transition"
          >
            <Plus size={15} /> إضافة عضو إلى إدارة
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-deepBlue/[0.06] bg-white shadow-sm overflow-hidden">
        {loadingMembers ? (
          <p className="text-xs text-slate-400 py-10 text-center">جارٍ التحميل...</p>
        ) : filteredCount === 0 ? (
          <p className="text-xs text-slate-400 py-10 text-center">
            {search || filterDepartmentId || filterStatus ? 'لا يوجد أعضاء مطابقون للبحث' : 'لا يوجد أعضاء في الإدارات'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-right">الاسم</th>
                  <th className="px-4 py-3 text-right">الإدارة</th>
                  <th className="px-4 py-3 text-right">الوحدة</th>
                  <th className="px-4 py-3 text-right">المسمى الوظيفي</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                  <th className="px-4 py-3 text-right">تاريخ الانضمام</th>
                  <th className="px-4 py-3 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{m.user?.name ?? '—'}</p>
                      <p className="text-[11px] text-slate-400">{m.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.department?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{m.unit?.name_ar ?? <span className="text-slate-300">بدون وحدة</span>}</td>
                    <td className="px-4 py-3 text-slate-600">{m.role_title ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.status === 'active' ? 'bg-emerald-100 text-emerald-700'
                          : m.status === 'on_leave' ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {STATUS_LABEL[m.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{m.joined_at ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(m)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-[11px] font-bold transition"
                      >
                        تعديل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add/Edit modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">
                {form.editingId ? 'تعديل بيانات العضو' : 'إضافة عضو إلى إدارة'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                المستخدم <span className="text-rose-500">*</span>
              </label>
              {form.editingId ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-600">
                  {form.user?.name}
                </p>
              ) : (
                <UserSearchSelect
                  instanceId="team-member-user-select"
                  ariaLabel="اختر المستخدم"
                  value={form.user}
                  onChange={(u) => setForm((f) => ({ ...f, user: u }))}
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الإدارة <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.departmentId ?? ''}
                onChange={(e) => handleDepartmentChange(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- اختر الإدارة --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name_ar}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الوحدة (اختياري)</label>
              <select
                value={form.unitId}
                disabled={!form.departmentId || loadingFormUnits}
                onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
              >
                <option value="">
                  {!form.departmentId ? 'اختر الإدارة أولاً' : loadingFormUnits ? 'جارٍ التحميل...' : '-- بدون وحدة --'}
                </option>
                {formUnits.map((u) => (
                  <option key={u.id} value={u.id}>{u.name_ar}</option>
                ))}
              </select>
              {form.departmentId && !loadingFormUnits && formUnits.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">لا توجد وحدات لهذه الإدارة بعد.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">المسمى الوظيفي</label>
                <input
                  value={form.roleTitle}
                  onChange={(e) => setForm((f) => ({ ...f, roleTitle: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الحالة</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState['status'] }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="on_leave">في إجازة</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ الانضمام</label>
              <input
                type="date"
                value={form.joinedAt}
                onChange={(e) => setForm((f) => ({ ...f, joinedAt: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {formError && (
              <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-50">
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-customBlue hover:bg-deepBlue text-white text-sm font-bold transition disabled:opacity-60"
              >
                {saving ? 'جارٍ الحفظ...' : form.editingId ? 'حفظ التعديلات' : 'إضافة العضو'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
