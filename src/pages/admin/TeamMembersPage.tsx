import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CircleSlash, FolderTree, Palmtree, Pencil, Plus, ShieldAlert, UserCheck, UserRoundCog, UserX, Users, X } from 'lucide-react';
import DashboardPageShell from '@/components/ui/DashboardPageShell';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import { AdminBadge, AdminKpiCard, AdminKpiGrid, AdminRowsSkeleton, AdminSearchField, AdminSelectField, AdminStateCard, RowActionsMenu, type MenuItem } from '@/components/admin/AdminUi';
import { MemberFormModal } from '@/components/admin/MemberFormModal';
import { STATUS_LABEL, STATUS_TONE } from '@/components/admin/memberMeta';
import { adminCard, adminPrimaryBtn, adminSecondaryBtn } from '@/components/admin/adminStyles';
import { TicketPagination } from '@/components/tickets/ops/TicketPagination';
import { ALL_ROLES, ROLE_LABELS } from '@/components/product-updates/productUpdateMeta';
import { unitMembersApi, type MemberSortKey, type MemberStatus, type TeamMemberRow } from '@/api/unitMembersApi';
import { useAbortableResource } from '@/hooks/useAbortableResource';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDepartmentAccess } from '@/hooks/useDepartmentAccess';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { activeMemberFilterCount, useMemberFilters } from '@/hooks/useMemberFilters';
import { apiMessage, httpStatus } from '@/services/ticketOpsService';
import toast from '@/lib/toast';
import { cn } from '@/lib/utils';

const SORT_LABEL: Record<MemberSortKey, string> = { name: 'الاسم', department: 'الإدارة', unit: 'الوحدة', status: 'الحالة', created_at: 'تاريخ الإضافة' };

function SortHead({ label, sort, current, dir, onSort }: { label: string; sort: MemberSortKey; current: MemberSortKey; dir: 'asc' | 'desc'; onSort: (k: MemberSortKey) => void }) {
  const on = current === sort;

  return (
    <button type="button" onClick={() => onSort(sort)} className={cn('inline-flex items-center gap-1 text-[11px] font-black', on ? 'text-customBlue' : 'text-deepBlue/60 hover:text-deepBlue')}>
      {label}
      {on ? (dir === 'asc' ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />) : null}
    </button>
  );
}

function Identity({ m }: { m: TeamMemberRow }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[13px] font-black text-deepBlue">{m.user?.name ?? '—'}</p>
      {m.user?.email ? <p className="truncate text-[11px] font-semibold text-deepBlue/50" dir="ltr">{m.user.email}</p> : null}
    </div>
  );
}

/**
 * أعضاء الإدارات — places existing EMC members into a department's unit and sets their status.
 *
 * It does not create people or accounts, and department / job title are never edited here (they come from the
 * member's canonical profile). The list, counts, sorting and paging are all done by the server; the filters
 * live in the URL so a refresh, a shared link and Back keep the same view. Whether anything is allowed is the
 * server's call on every request: this page only presents and sends.
 */
export default function TeamMembersPage() {
  const { filters, update, reset } = useMemberFilters();
  const access = useDepartmentAccess();
  const wide = useMediaQuery('(min-width: 768px)');

  // The search box is typed into freely and reaches the URL (and the server) once typing pauses.
  const [searchText, setSearchText] = useState(filters.search);
  const debounced = useDebouncedValue(searchText, 350);
  useEffect(() => {
    if (debounced.trim() !== filters.search) update({ search: debounced.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a settled search term should write to the URL
  }, [debounced]);
  // Back/forward or "clear filters" changes the URL: the box follows it.
  const lastUrlSearch = useRef(filters.search);
  useEffect(() => {
    if (filters.search !== lastUrlSearch.current) {
      lastUrlSearch.current = filters.search;
      setSearchText(filters.search);
    }
  }, [filters.search]);

  const query = useMemo(
    () => ({
      departmentId: filters.departmentId ?? undefined,
      status: filters.status || undefined,
      unitId: filters.unit === null ? undefined : filters.unit === 'none' ? ('null' as const) : filters.unit,
      role: filters.role || undefined,
      search: filters.search || undefined,
      sort: filters.sort,
      dir: filters.dir,
      page: filters.page,
      perPage: filters.perPage,
    }),
    [filters],
  );
  const list = useAbortableResource((signal) => unitMembersApi.listMembersPage(query, signal), JSON.stringify(query));
  const units = useAbortableResource((signal) => unitMembersApi.listUnits(filters.departmentId ?? 0, signal), `units:${filters.departmentId}`, filters.departmentId !== null);

  const rows = list.data?.rows ?? [];
  const meta = list.data?.meta ?? null;
  const stats = meta?.stats ?? null;
  const lastPage = meta?.last_page ?? 1;

  // A page past the end (a link from before the list shrank) lands on the last page instead of an empty one.
  useEffect(() => {
    if (list.data && !list.loading && filters.page > lastPage) update({ page: lastPage });
  }, [list.data, list.loading, filters.page, lastPage, update]);

  const [form, setForm] = useState<{ member: TeamMemberRow | null } | null>(null);
  const [confirm, setConfirm] = useState<{ member: TeamMemberRow; status: MemberStatus } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function changeStatus(member: TeamMemberRow, status: MemberStatus) {
    if (busyId !== null) return;
    setBusyId(member.id);
    try {
      await unitMembersApi.updateMember(member.id, { status });
      toast.success(`تم تغيير حالة ${member.user?.name ?? 'العضو'} إلى «${STATUS_LABEL[status]}».`);
      list.reload();
    } catch (e) {
      toast.error(apiMessage(e, 'تعذّر تغيير حالة العضو.'));
    } finally {
      setBusyId(null);
    }
  }

  const menuFor = (m: TeamMemberRow): MenuItem[] => {
    const items: MenuItem[] = [{ key: 'edit', label: 'تعديل الوحدة والحالة', icon: Pencil, onSelect: () => setForm({ member: m }) }];
    if (m.status !== 'active') items.push({ key: 'activate', label: 'تفعيل العضو', icon: UserCheck, onSelect: () => void changeStatus(m, 'active') });
    if (m.status !== 'on_leave') items.push({ key: 'leave', label: 'وضعه في إجازة', icon: Palmtree, onSelect: () => void changeStatus(m, 'on_leave') });
    if (m.status !== 'inactive') items.push({ key: 'deactivate', label: 'تعطيل العضو', icon: UserX, danger: true, onSelect: () => setConfirm({ member: m, status: 'inactive' }) });

    return items;
  };

  const activeCount = activeMemberFilterCount(filters);
  const forbidden = httpStatus(list.error) === 403;
  const noScope = filters.status === '' && filters.unit === null;
  const departments = access.readableDepartments;
  const deptName = (id: number) => { const d = departments.find((x) => x.id === id); return d ? d.name_ar || d.name : `#${id}`; };
  const unitName = (id: number) => units.data?.find((u) => u.id === id)?.name_ar ?? `#${id}`;

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.departmentId) chips.push({ key: 'dept', label: `الإدارة: ${deptName(filters.departmentId)}`, clear: () => update({ departmentId: null }) });
  if (filters.unit !== null) chips.push({ key: 'unit', label: filters.unit === 'none' ? 'بدون وحدة' : `الوحدة: ${unitName(filters.unit)}`, clear: () => update({ unit: null }) });
  if (filters.role) chips.push({ key: 'role', label: `الدور: ${ROLE_LABELS[filters.role] ?? filters.role}`, clear: () => update({ role: '' }) });
  if (filters.status) chips.push({ key: 'status', label: `الحالة: ${STATUS_LABEL[filters.status]}`, clear: () => update({ status: '' }) });
  if (filters.search) chips.push({ key: 'q', label: `بحث: ${filters.search}`, clear: () => { setSearchText(''); update({ search: '' }); } });

  const onSort = (k: MemberSortKey) => update(filters.sort === k ? { dir: filters.dir === 'asc' ? 'desc' : 'asc' } : { sort: k, dir: k === 'created_at' ? 'desc' : 'asc' });
  const toggleStatus = (s: MemberStatus) => update({ status: filters.status === s ? '' : s });
  const clearAll = () => { setSearchText(''); reset(); };

  return (
    <div dir="rtl" className="mx-auto w-full max-w-[1400px] px-1">
      <DashboardPageShell
        eyebrow="لوحة التحكم التقنية"
        title="أعضاء الإدارات"
        description="اربط أعضاء EMC الحاليين بوحدات الإدارات وتابع حالتهم. الإدارة والمسمى الوظيفي يأتيان من الملف الأساسي للعضو."
        breadcrumbs={[{ label: 'الإدارة', href: '/dashboard' }, { label: 'أعضاء الإدارات' }]}
        density="compact"
        actions={
          <button type="button" onClick={() => setForm({ member: null })} className={adminPrimaryBtn}>
            <Plus size={14} aria-hidden="true" /> إضافة عضو إلى إدارة
          </button>
        }
      >
        {forbidden ? (
          <AdminStateCard icon={ShieldAlert} danger title="لا تملك صلاحية عرض أعضاء الإدارات" body="تواصل مع مسؤول النظام إن كنت تحتاج هذه الصفحة." />
        ) : (
          <div className="space-y-5">
            <AdminKpiGrid label="مؤشرات الأعضاء" cols={5}>
              <AdminKpiCard testId="kpi-total" label="الإجمالي" hint="كل الأعضاء في النطاق" icon={Users} active={noScope} onClick={() => update({ status: '', unit: null })} value={stats?.total ?? null} loading={list.loading && !stats} />
              <AdminKpiCard testId="kpi-active" label="نشطون" tone="good" icon={UserCheck} active={filters.status === 'active'} onClick={() => toggleStatus('active')} value={stats?.active ?? null} loading={list.loading && !stats} />
              <AdminKpiCard testId="kpi-on-leave" label="في إجازة" tone="warn" icon={Palmtree} active={filters.status === 'on_leave'} onClick={() => toggleStatus('on_leave')} value={stats?.on_leave ?? null} loading={list.loading && !stats} />
              <AdminKpiCard testId="kpi-inactive" label="غير نشطين" icon={CircleSlash} active={filters.status === 'inactive'} onClick={() => toggleStatus('inactive')} value={stats?.inactive ?? null} loading={list.loading && !stats} />
              <AdminKpiCard testId="kpi-without-unit" label="بدون وحدة" hint="لم يُسندوا لوحدة" tone="info" icon={FolderTree} active={filters.unit === 'none'} onClick={() => update({ unit: filters.unit === 'none' ? null : 'none' })} value={stats?.without_unit ?? null} loading={list.loading && !stats} />
            </AdminKpiGrid>

            <section aria-label="البحث والتصفية" className={cn(adminCard, 'p-4')}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <AdminSearchField className="sm:col-span-2 lg:col-span-2" label="بحث" placeholder="الاسم أو البريد الإلكتروني" value={searchText} onChange={setSearchText} />
                <AdminSelectField label="الإدارة" value={filters.departmentId ? String(filters.departmentId) : ''} onChange={(v) => update({ departmentId: v ? Number(v) : null })}>
                  <option value="">كل الإدارات</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name_ar || d.name}</option>)}
                </AdminSelectField>
                <AdminSelectField label="الوحدة" value={filters.unit === null ? '' : String(filters.unit)} onChange={(v) => update({ unit: v === '' ? null : v === 'none' ? 'none' : Number(v) })}>
                  <option value="">كل الوحدات</option>
                  <option value="none">بدون وحدة</option>
                  {(filters.departmentId !== null ? (units.data ?? []) : []).map((u) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                </AdminSelectField>
                <AdminSelectField label="الدور" value={filters.role} onChange={(v) => update({ role: v })}>
                  <option value="">كل الأدوار</option>
                  {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>)}
                </AdminSelectField>
                <AdminSelectField label="الحالة" value={filters.status} onChange={(v) => update({ status: v as MemberStatus | '' })}>
                  <option value="">كل الحالات</option>
                  {(Object.keys(STATUS_LABEL) as MemberStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </AdminSelectField>
              </div>
              {!wide ? (
                <div className="mt-3 flex items-end gap-2">
                  <AdminSelectField className="flex-1" label="ترتيب حسب" value={filters.sort} onChange={(v) => update({ sort: v as MemberSortKey })}>
                    {(Object.keys(SORT_LABEL) as MemberSortKey[]).map((k) => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}
                  </AdminSelectField>
                  <button type="button" onClick={() => update({ dir: filters.dir === 'asc' ? 'desc' : 'asc' })} className={adminSecondaryBtn} aria-label={filters.dir === 'asc' ? 'ترتيب تصاعدي' : 'ترتيب تنازلي'}>
                    {filters.dir === 'asc' ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />}
                  </button>
                </div>
              ) : null}
            </section>

            <div className="flex flex-wrap items-center gap-2" aria-live="polite">
              <p className="text-[12px] font-black text-deepBlue/70" data-testid="result-count">
                {meta ? `${meta.total.toLocaleString('en-US')} عضو` : 'جارٍ التحميل…'}
              </p>
              {chips.map((c) => (
                <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-customBlue/[0.08] py-1 ps-3 pe-1.5 text-[11px] font-black text-customBlue">
                  {c.label}
                  <button type="button" onClick={c.clear} aria-label={`إزالة ${c.label}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-customBlue/15">
                    <X size={11} aria-hidden="true" />
                  </button>
                </span>
              ))}
              {activeCount > 0 ? <button type="button" onClick={clearAll} className="text-[11px] font-black text-deepBlue/60 underline-offset-2 hover:underline">مسح الفلاتر</button> : null}
            </div>

            {list.loading && !list.data ? (
              <AdminRowsSkeleton label="جارٍ تحميل الأعضاء" />
            ) : list.error && !list.data ? (
              <AdminStateCard icon={ShieldAlert} danger title="تعذّر تحميل الأعضاء" body="حدث خطأ أثناء جلب البيانات. حاول مرة أخرى." action={<button type="button" onClick={list.reload} className={adminPrimaryBtn}>إعادة المحاولة</button>} />
            ) : list.data && rows.length === 0 ? (
              <AdminStateCard
                icon={UserRoundCog}
                title={activeCount > 0 ? 'لا يوجد أعضاء مطابقون' : 'لا يوجد أعضاء في الإدارات بعد'}
                body={activeCount > 0 ? 'جرّب تغيير الفلاتر أو مسحها.' : 'أضف عضوًا من EMC إلى إدارة ليظهر هنا.'}
                action={activeCount > 0 ? <button type="button" onClick={clearAll} className={adminPrimaryBtn}>مسح الفلاتر</button> : <button type="button" onClick={() => setForm({ member: null })} className={adminPrimaryBtn}>إضافة عضو إلى إدارة</button>}
              />
            ) : (
              <div className={cn('space-y-4 transition-opacity', list.loading && 'opacity-60')} aria-busy={list.loading}>
                {wide ? (
                  <div className={cn(adminCard, 'overflow-x-auto')}>
                    <table className="w-full text-start text-sm" aria-label="أعضاء الإدارات">
                      <thead>
                        <tr className="border-b border-deepBlue/[0.07] bg-slate-50/80">
                          {([['name', 'العضو'], ['department', 'الإدارة'], ['unit', 'الوحدة']] as const).map(([k, l]) => (
                            <th key={k} scope="col" className="px-4 py-3 text-start" aria-sort={filters.sort === k ? (filters.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                              <SortHead label={l} sort={k} current={filters.sort} dir={filters.dir} onSort={onSort} />
                            </th>
                          ))}
                          <th scope="col" className="px-4 py-3 text-start text-[11px] font-black text-deepBlue/60">المسمى الوظيفي</th>
                          <th scope="col" className="px-4 py-3 text-start" aria-sort={filters.sort === 'status' ? (filters.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                            <SortHead label="الحالة" sort="status" current={filters.sort} dir={filters.dir} onSort={onSort} />
                          </th>
                          <th scope="col" className="w-14 px-4 py-3 text-start text-[11px] font-black text-deepBlue/60"><span className="sr-only">إجراءات</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-deepBlue/[0.05]">
                        {rows.map((m) => (
                          <tr key={m.id} data-testid="member-row" className="align-middle transition hover:bg-customBlue/[0.03]">
                            <td className="max-w-[300px] px-4 py-3"><Identity m={m} />{m.user?.role ? <span className="mt-1 inline-block"><AdminBadge tone="info">{ROLE_LABELS[m.user.role] ?? m.user.role}</AdminBadge></span> : null}</td>
                            <td className="px-4 py-3 text-[13px] font-bold text-deepBlue/80">{m.department?.name ?? '—'}</td>
                            <td className="px-4 py-3 text-[13px] font-bold text-deepBlue/80">{m.unit?.name_ar ?? <span className="text-deepBlue/35">بدون وحدة</span>}</td>
                            <td className="px-4 py-3 text-[13px] font-semibold text-deepBlue/70">{m.role_title ?? '—'}</td>
                            <td className="px-4 py-3"><AdminBadge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</AdminBadge></td>
                            <td className="px-4 py-3"><RowActionsMenu label={`إجراءات ${m.user?.name ?? 'العضو'}`} items={busyId === m.id ? [] : menuFor(m)} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <ul className="space-y-3" aria-label="أعضاء الإدارات">
                    {rows.map((m) => (
                      <li key={m.id} data-testid="member-card" className={cn(adminCard, 'p-4')}>
                        <div className="flex items-start justify-between gap-3">
                          <Identity m={m} />
                          <RowActionsMenu label={`إجراءات ${m.user?.name ?? 'العضو'}`} items={busyId === m.id ? [] : menuFor(m)} />
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
                          <div><dt className="font-bold text-deepBlue/50">الإدارة</dt><dd className="font-black text-deepBlue">{m.department?.name ?? '—'}</dd></div>
                          <div><dt className="font-bold text-deepBlue/50">الوحدة</dt><dd className="font-black text-deepBlue">{m.unit?.name_ar ?? 'بدون وحدة'}</dd></div>
                          <div><dt className="font-bold text-deepBlue/50">المسمى</dt><dd className="font-black text-deepBlue">{m.role_title ?? '—'}</dd></div>
                          <div><dt className="font-bold text-deepBlue/50">الحالة</dt><dd><AdminBadge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</AdminBadge></dd></div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                )}
                <TicketPagination
                  page={meta?.current_page ?? filters.page}
                  lastPage={lastPage}
                  total={meta?.total ?? 0}
                  perPage={filters.perPage}
                  loading={list.loading}
                  onPage={(p) => update({ page: Math.min(Math.max(1, p), lastPage) })}
                  onPerPage={(n) => update({ perPage: n })}
                />
              </div>
            )}
          </div>
        )}
      </DashboardPageShell>

      {form ? (
        <MemberFormModal
          member={form.member}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            list.reload();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={confirm !== null}
        title="تعطيل العضو"
        description={confirm ? `سيصبح ${confirm.member.user?.name ?? 'العضو'} غير نشط ولن يظهر ضمن المؤهلين للتكليف. يمكنك إعادة تفعيله لاحقًا.` : ''}
        confirmLabel="تعطيل"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={() => {
          const c = confirm;
          setConfirm(null);
          if (c) void changeStatus(c.member, c.status);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
