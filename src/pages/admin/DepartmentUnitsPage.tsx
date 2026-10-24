import { useMemo, useState } from 'react';
import { Building2, Layers, Pencil, Plus, Power, ShieldAlert, UserX, Users } from 'lucide-react';
import DashboardPageShell from '@/components/ui/DashboardPageShell';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import { AdminBadge, AdminKpiCard, AdminKpiGrid, AdminRowsSkeleton, AdminSearchField, AdminSelectField, AdminStateCard, RowActionsMenu, type MenuItem } from '@/components/admin/AdminUi';
import { UnitFormModal } from '@/components/admin/UnitFormModal';
import { UnitMembersModal } from '@/components/admin/UnitMembersModal';
import { adminCard, adminPrimaryBtn, adminSecondaryBtn } from '@/components/admin/adminStyles';
import { STATUS_LABEL, STATUS_TONE } from '@/components/admin/memberMeta';
import { unitMembersApi, type DepartmentalUnitRow, type TeamMemberRow } from '@/api/unitMembersApi';
import { useAbortableResource } from '@/hooks/useAbortableResource';
import { useDepartmentSelection } from '@/hooks/useDepartmentSelection';
import { apiMessage, httpStatus } from '@/services/ticketOpsService';
import toast from '@/lib/toast';
import { cn } from '@/lib/utils';

/** The members the page reads for one department: at most this many rows, plus the server's exact counts. */
const MEMBER_ROWS = 100;

type UnitStatusFilter = 'all' | 'active' | 'inactive';

const SOURCE_NOTE: Record<string, string> = {
  single: 'إدارتك الوحيدة، اختيرت تلقائيًا.',
  primary: 'إدارتك الرئيسية، اختيرت تلقائيًا.',
  restored: 'آخر إدارة اخترتها.',
};

interface DepartmentData {
  departmentId: number;
  units: DepartmentalUnitRow[];
  canManage: boolean;
  members: TeamMemberRow[];
  /** Members of this department without a unit (all of them, not only the first page). */
  unassigned: TeamMemberRow[];
  totalMembers: number;
  withoutUnit: number;
}

/**
 * Loads everything one department needs, in one go, for exactly that department. The result carries the
 * department it belongs to, so the page can refuse to show it once a different department is selected.
 * Members come as one page plus the server's counts; only when the department is bigger than that page is a
 * second request needed to list who has no unit.
 */
async function loadDepartment(departmentId: number, signal: AbortSignal): Promise<DepartmentData> {
  const [unitList, page] = await Promise.all([
    unitMembersApi.listUnitsScoped(departmentId, signal),
    unitMembersApi.listMembersPage({ departmentId, perPage: MEMBER_ROWS, sort: 'name', dir: 'asc' }, signal),
  ]);
  const complete = page.meta.total <= page.rows.length;
  const unassigned = complete
    ? page.rows.filter((m) => !m.unit)
    : (await unitMembersApi.listMembersPage({ departmentId, unitId: 'null', perPage: MEMBER_ROWS, sort: 'name', dir: 'asc' }, signal)).rows;

  return { departmentId, units: unitList.rows, canManage: unitList.canManage, members: page.rows, unassigned, totalMembers: page.meta.stats.total, withoutUnit: page.meta.stats.without_unit };
}

/**
 * الوحدات التقنية — a department's units and who is in each.
 *
 * The department opens automatically from what the server says the user may see (see
 * `resolveDepartmentSelection`): never "the first one returned", never a fixed id. That is only a
 * convenience; the server decides on every request what may be read or changed, and says whether this user
 * can manage units here (`can_manage`), which is the only thing that shows the create / edit / assign controls.
 */
export default function DepartmentUnitsPage() {
  const sel = useDepartmentSelection();
  const { departmentId } = sel;

  const res = useAbortableResource((signal) => loadDepartment(departmentId!, signal), `dept:${departmentId}`, departmentId !== null);
  // Whatever arrives is shown only if it is for the department on screen now: no other department's rows, ever.
  const data = res.data && res.data.departmentId === departmentId ? res.data : null;
  const loading = departmentId !== null && !data && res.loading;
  const failed = departmentId !== null && !data && !!res.error;
  const forbidden = httpStatus(res.error) === 403;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<UnitStatusFilter>('all');
  const [form, setForm] = useState<{ unit: DepartmentalUnitRow | null } | null>(null);
  const [managing, setManaging] = useState<number | null>(null);
  const [toggle, setToggle] = useState<DepartmentalUnitRow | null>(null);
  const [busyUnit, setBusyUnit] = useState<number | null>(null);

  const units = data?.units;
  const visibleUnits = useMemo(() => {
    const term = search.trim().toLowerCase();

    return (units ?? []).filter((u) => (statusFilter === 'all' || (statusFilter === 'active') === u.is_active) && (!term || `${u.name_ar} ${u.name_en ?? ''} ${u.code}`.toLowerCase().includes(term)));
  }, [units, search, statusFilter]);

  const managingUnit = data && managing !== null ? (data.units.find((u) => u.id === managing) ?? null) : null;
  const canManage = data?.canManage === true;
  const activeUnits = data?.units.filter((u) => u.is_active).length ?? 0;
  const chooseDepartment = (v: string) => {
    sel.select(v ? Number(v) : null);
    setSearch('');
    setStatusFilter('all');
    setManaging(null);
    setForm(null);
    setToggle(null);
  };

  async function setActive(unit: DepartmentalUnitRow, active: boolean) {
    if (busyUnit !== null) return;
    setBusyUnit(unit.id);
    try {
      await unitMembersApi.updateUnit(unit.id, { is_active: active });
      toast.success(active ? 'تم تفعيل الوحدة.' : 'تم تعطيل الوحدة.');
      res.reload();
    } catch (e) {
      toast.error(apiMessage(e, 'تعذّر تحديث حالة الوحدة.'));
    } finally {
      setBusyUnit(null);
    }
  }

  const menuFor = (u: DepartmentalUnitRow): MenuItem[] => [
    { key: 'edit', label: 'تعديل الاسم والوصف', icon: Pencil, onSelect: () => setForm({ unit: u }) },
    u.is_active ? { key: 'off', label: 'تعطيل الوحدة', icon: Power, danger: true, onSelect: () => setToggle(u) } : { key: 'on', label: 'تفعيل الوحدة', icon: Power, onSelect: () => void setActive(u, true) },
  ];

  const selector = (
    <section aria-label="اختيار الإدارة" className={cn(adminCard, 'p-4')}>
      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,22rem)_1fr]">
        <AdminSelectField label="الإدارة" value={departmentId ? String(departmentId) : ''} onChange={chooseDepartment} disabled={sel.loading || sel.departments.length <= 1}>
          {sel.loading ? <option value="">جارٍ تحميل الإدارات…</option> : null}
          {!sel.loading && departmentId === null ? <option value="">اختر إدارة…</option> : null}
          {sel.departments.map((d) => <option key={d.id} value={d.id}>{d.name_ar || d.name}</option>)}
        </AdminSelectField>
        <p className="text-[12px] font-semibold text-deepBlue/55" data-testid="department-note">
          {SOURCE_NOTE[sel.source] ?? (sel.source === 'choose' ? 'اختر الإدارة التي تريد عرض وحداتها.' : '')}
        </p>
      </div>
    </section>
  );

  let body: React.ReactNode;
  if (sel.loading) {
    body = <AdminRowsSkeleton rows={3} label="جارٍ تحميل الإدارات" />;
  } else if (sel.error) {
    body = <AdminStateCard icon={ShieldAlert} danger title="تعذّر تحميل إداراتك" body="حدث خطأ أثناء جلب الإدارات المتاحة لك." action={<button type="button" onClick={() => window.location.reload()} className={adminPrimaryBtn}>إعادة المحاولة</button>} />;
  } else if (sel.departments.length === 0) {
    body = <AdminStateCard icon={Building2} title="لا توجد إدارات متاحة لك" body="لا ترتبط حاليًا بأي إدارة. تواصل مع مسؤول النظام إن كنت تحتاج هذه الصفحة." />;
  } else if (departmentId === null) {
    body = <AdminStateCard icon={Building2} title="اختر إدارة" body="لديك أكثر من إدارة. اختر واحدة من القائمة أعلاه لعرض وحداتها وأعضائها." />;
  } else if (forbidden) {
    body = <AdminStateCard icon={ShieldAlert} danger title="لا تملك صلاحية عرض وحدات هذه الإدارة" body="اختر إدارة أخرى أو تواصل مع المسؤول." />;
  } else if (failed) {
    body = <AdminStateCard icon={ShieldAlert} danger title="تعذّر تحميل الوحدات" body="حدث خطأ أثناء جلب البيانات. حاول مرة أخرى." action={<button type="button" onClick={res.reload} className={adminPrimaryBtn}>إعادة المحاولة</button>} />;
  } else if (loading || !data) {
    body = <AdminRowsSkeleton rows={4} label="جارٍ تحميل الوحدات" />;
  } else {
    body = (
      <div className={cn('space-y-5 transition-opacity', res.loading && 'opacity-60')} aria-busy={res.loading}>
        <AdminKpiGrid label="مؤشرات الإدارة" cols={4}>
          <AdminKpiCard testId="kpi-units" label="الوحدات" hint={`${activeUnits.toLocaleString('en-US')} مفعّلة`} icon={Layers} value={data.units.length} />
          <AdminKpiCard testId="kpi-members" label="أعضاء الإدارة" icon={Users} tone="info" value={data.totalMembers} />
          <AdminKpiCard testId="kpi-unassigned" label="بدون وحدة" hint="لم يُسندوا لوحدة" icon={UserX} tone="warn" value={data.withoutUnit} />
          <AdminKpiCard testId="kpi-inactive-units" label="وحدات معطّلة" icon={Power} value={data.units.length - activeUnits} />
        </AdminKpiGrid>

        <section aria-label="تصفية الوحدات" className={cn(adminCard, 'p-4')}>
          <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
            <AdminSearchField label="بحث في الوحدات" placeholder="الاسم أو الرمز" value={search} onChange={setSearch} />
            <AdminSelectField label="الحالة" value={statusFilter} onChange={(v) => setStatusFilter(v as UnitStatusFilter)}>
              <option value="all">كل الوحدات</option>
              <option value="active">مفعّلة</option>
              <option value="inactive">معطّلة</option>
            </AdminSelectField>
          </div>
        </section>

        {data.units.length === 0 ? (
          <AdminStateCard
            icon={Layers}
            title="لا توجد وحدات تقنية لهذه الإدارة بعد"
            body={canManage ? 'أنشئ أول وحدة لتبدأ بتنظيم أعضاء الإدارة.' : 'ستظهر هنا الوحدات عندما تنشئها قيادة الإدارة.'}
            action={canManage ? <button type="button" onClick={() => setForm({ unit: null })} className={adminPrimaryBtn}><Plus size={14} aria-hidden="true" /> وحدة جديدة</button> : undefined}
          />
        ) : visibleUnits.length === 0 ? (
          <AdminStateCard icon={Layers} title="لا توجد وحدات مطابقة" body="جرّب تغيير البحث أو الحالة." action={<button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); }} className={adminSecondaryBtn}>مسح التصفية</button>} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="الوحدات التقنية">
            {visibleUnits.map((u) => (
              <li key={u.id} data-testid="unit-card" className={cn(adminCard, 'flex flex-col p-4', !u.is_active && 'bg-slate-50 opacity-80')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-deepBlue">{u.name_ar}</p>
                    <p className="font-mono text-[11px] font-semibold text-deepBlue/45" dir="ltr">{u.code}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <AdminBadge tone={u.is_active ? 'good' : 'neutral'}>{u.is_active ? 'مفعّلة' : 'معطّلة'}</AdminBadge>
                    {canManage ? <RowActionsMenu label={`إجراءات الوحدة ${u.name_ar}`} items={busyUnit === u.id ? [] : menuFor(u)} /> : null}
                  </div>
                </div>
                {u.description ? <p className="mt-2 line-clamp-2 text-[12px] font-semibold text-deepBlue/60">{u.description}</p> : null}
                <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-deepBlue/60"><Users size={13} aria-hidden="true" /> {u.member_count.toLocaleString('en-US')} عضو نشط</p>
                <div className="mt-auto pt-3">
                  <button type="button" onClick={() => setManaging(u.id)} className={cn(adminSecondaryBtn, 'w-full')}>{canManage ? 'إدارة موظفي الوحدة' : 'عرض موظفي الوحدة'}</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <section aria-label="أعضاء بدون وحدة" className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <h2 className="text-sm font-black text-amber-900">أعضاء بدون وحدة</h2>
          <p className="mb-3 mt-0.5 text-[12px] font-semibold text-amber-900/70">أعضاء في هذه الإدارة لم يُسندوا إلى أي وحدة تقنية بعد.</p>
          {data.unassigned.length === 0 ? (
            <p className="text-xs font-bold text-amber-900/70">كل أعضاء الإدارة مُسندون إلى وحدات.</p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {data.unassigned.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white px-3 py-2 text-xs font-bold text-deepBlue" data-testid="unassigned-member">
                  <span className="truncate">{m.user?.name}</span>
                  <AdminBadge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</AdminBadge>
                </li>
              ))}
            </ul>
          )}
          {data.withoutUnit > data.unassigned.length ? <p className="mt-2 text-[11px] font-bold text-amber-900/70">تُعرض أول {data.unassigned.length.toLocaleString('en-US')} من {data.withoutUnit.toLocaleString('en-US')}.</p> : null}
        </section>
      </div>
    );
  }

  return (
    <div dir="rtl" className="mx-auto w-full max-w-[1400px] px-1">
      <DashboardPageShell
        eyebrow="لوحة التحكم التقنية"
        title="الوحدات التقنية"
        description="تابع وحدات الإدارة وأعضاء كل وحدة. نقل عضو أو إزالته من وحدة لا يُخرجه من الإدارة نفسها."
        breadcrumbs={[{ label: 'الإدارة', href: '/dashboard' }, { label: 'الوحدات التقنية' }]}
        density="compact"
        actions={
          canManage && departmentId !== null ? (
            <button type="button" onClick={() => setForm({ unit: null })} className={adminPrimaryBtn}>
              <Plus size={14} aria-hidden="true" /> وحدة جديدة
            </button>
          ) : undefined
        }
      >
        <div className="space-y-5">
          {selector}
          {body}
        </div>
      </DashboardPageShell>

      {form && departmentId !== null ? (
        <UnitFormModal
          departmentId={departmentId}
          unit={form.unit}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            res.reload();
          }}
        />
      ) : null}

      {managingUnit && data ? (
        <UnitMembersModal
          unit={managingUnit}
          units={data.units}
          members={data.members}
          unassigned={data.unassigned}
          canManage={canManage}
          onClose={() => setManaging(null)}
          onChanged={res.reload}
        />
      ) : null}

      <ConfirmDialog
        open={toggle !== null}
        title="تعطيل الوحدة"
        description={toggle ? `ستُعطَّل الوحدة «${toggle.name_ar}». يبقى أعضاؤها في الإدارة، ويمكنك تفعيلها لاحقًا.` : ''}
        confirmLabel="تعطيل"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={() => {
          const u = toggle;
          setToggle(null);
          if (u) void setActive(u, false);
        }}
        onCancel={() => setToggle(null)}
      />
    </div>
  );
}
