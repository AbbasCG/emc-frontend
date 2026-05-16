import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { RefreshCw, UserCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { getApiErrorMessage } from '@/api/apiErrors'
import {
  ADMIN_USER_FORBIDDEN_AR,
  createAdminUser,
  deleteAdminUser,
  fetchAdminUser,
  fetchAdminUsers,
  getAdminUserMutationMessage,
  updateAdminUser,
  type AdminManagedUser,
  type CreateAdminUserInput,
  type UpdateAdminUserInput,
} from '@/api/adminUsersApi'
import { cn } from '@/lib/utils'
import { normalizeRole } from '@/utils/dashboardAccess'
import { adminRoleLabelAr, getAssignableRoleOptions } from '@/pages/super-admin/users/assignableRoles'
import {
  canDeleteAdminUserRow,
  canEditAdminUserRow,
  canOfferSuperAdminRoleOption,
} from '@/pages/super-admin/users/superAdminUserPolicy'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { SaBackLink, SaGlassCard, SaPageRoot, SaStatChip } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import { CrudFilterBar, MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { LoadingPanel, ErrorPanel, EmptyPanel } from '@/pages/super-admin/crud/shared/States'
import { CrudCardTable, CrudTable, Th, Tr, Td } from '@/pages/super-admin/crud/shared/TableChrome'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'

const MANAGER_ROLE_SET = new Set([
  'admin',
  'super_admin',
  'executive_admin',
  'finance_manager',
  'quality_manager',
  'hr_manager',
  'marketing_manager',
  'support_agent',
  'department_manager',
])

function isEffectivelyActive(u: AdminManagedUser): boolean {
  return u.is_active !== false
}

function statusBadge(u: AdminManagedUser): 'active' | 'inactive' | 'unknown' {
  if (u.is_active === false) return 'inactive'
  if (u.is_active === true) return 'active'
  return 'unknown'
}

export default function UsersManagementPage() {
  const { user: currentUser } = useAuth()

  const [rows, setRows] = useState<AdminManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const includeSuperAdminAssignment = canOfferSuperAdminRoleOption(currentUser?.role)
  const roleOptionsForm = useMemo(
    () => getAssignableRoleOptions(includeSuperAdminAssignment),
    [includeSuperAdminAssignment],
  )

  const roleFilterOptions = useMemo(
    () => [{ value: 'all', labelAr: 'كل الأدوار' }, ...roleOptionsForm],
    [roleOptionsForm],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setForbidden(false)
    setLoadErr(null)
    try {
      const list = await fetchAdminUsers()
      setRows(list)
    } catch (e) {
      setRows([])
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        setForbidden(true)
        toast.warning(ADMIN_USER_FORBIDDEN_AR)
      } else setLoadErr(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const kpis = useMemo(() => {
    const total = rows.length
    const active = rows.filter(isEffectivelyActive).length
    const managers = rows.filter((u) =>
      MANAGER_ROLE_SET.has(String(normalizeRole(u.role))),
    ).length
    const students = rows.filter((u) => normalizeRole(u.role) === 'student').length

    return [
      { label: 'إجمالي المستخدمين', value: total, tone: 'blue' as const, hint: 'من نقطة الإدارة' },
      {
        label: 'النشطون',
        value: active,
        tone: 'ink' as const,
        hint: 'حالة الحساب ليست «موقوفة» وفق ما يعرضه الـ API',
      },
      { label: 'المدراء', value: managers, tone: 'orange' as const, hint: 'أدوار إدارية وفق التصنيف' },
      { label: 'الطلاب', value: students, tone: 'slate' as const, hint: 'دور الطالب ضمن المصدر المرجعي' },
    ]
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((u) => {
      if (roleFilter !== 'all' && normalizeRole(u.role) !== roleFilter) return false
      if (statusFilter === 'active' && !isEffectivelyActive(u)) return false
      if (statusFilter === 'inactive' && u.is_active !== false) return false
      if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, query, roleFilter, statusFilter])

  const actorId = currentUser?.id ?? 0

  const [modal, setModal] = useState<'create' | 'edit' | 'view' | 'delete' | null>(null)

  function closeModal() {
    setModal(null)
    setDeleteAck(false)
    setSaving(false)
  }
  const [focusedId, setFocusedId] = useState<number | null>(null)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState('student')
  const [pw, setPw] = useState('')
  const [pwConf, setPwConf] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteAck, setDeleteAck] = useState(false)

  const roleOptionsEdit = useMemo(() => {
    const rn = normalizeRole(formRole ?? null)
    const opts = [...roleOptionsForm]
    if (rn && !opts.some((o) => o.value === rn))
      opts.unshift({ value: rn, labelAr: adminRoleLabelAr(formRole) })
    return opts
  }, [roleOptionsForm, formRole])

  function openCreate() {
    setFormName('')
    setFormEmail('')
    setFormRole('student')
    setPw('')
    setPwConf('')
    setFocusedId(null)
    setModal('create')
  }

  async function openEdit(id: number) {
    setFocusedId(id)
    setModal('edit')
    setSaving(false)
    setPw('')
    setPwConf('')
    try {
      const u = await fetchAdminUser(id)
      setFormName(u.name)
      setFormEmail(u.email)
      setFormRole((u.role && String(u.role)) || 'student')
    } catch (e) {
      toast.warning(getAdminUserMutationMessage(e))
      closeModal()
    }
  }

  async function submitCreate() {
    if (!formName.trim() || !formEmail.trim()) {
      toast.warning('الاسم والبريد مطلوبان')
      return
    }
    if (!pw.trim()) {
      toast.warning('كلمة المرور مطلوبة')
      return
    }
    if (pw !== pwConf) {
      toast.warning('تأكيد كلمة المرور غير متطابق')
      return
    }
    setSaving(true)
    try {
      const body: CreateAdminUserInput = {
        name: formName,
        email: formEmail,
        role: formRole,
        password: pw,
        password_confirmation: pwConf || pw,
      }
      await createAdminUser(body)
      toast.success('تم الإنشاء')
      closeModal()
      void load()
    } catch (e) {
      toast.warning(getAdminUserMutationMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function submitEdit() {
    if (focusedId == null) return
    const pwTrim = pw.trim()
    const pwcTrim = pwConf.trim()
    if (pwTrim !== pwcTrim) {
      toast.warning('تأكيد كلمة المرور غير متطابق')
      return
    }
    setSaving(true)
    try {
      const patch: UpdateAdminUserInput = { name: formName, email: formEmail, role: formRole }
      if (pwTrim) {
        patch.password = pwTrim
        patch.password_confirmation = pwcTrim || pwTrim
      }
      await updateAdminUser(focusedId, patch)
      toast.success('تم الحفظ')
      closeModal()
      void load()
    } catch (e) {
      toast.warning(getAdminUserMutationMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function executeDelete(u: AdminManagedUser) {
    setSaving(true)
    try {
      await deleteAdminUser(u.id)
      toast.success('تم الحذف')
      closeModal()
      void load()
    } catch (e) {
      toast.warning(getAdminUserMutationMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const chromeSubtitle =
    forbidden ?
      ADMIN_USER_FORBIDDEN_AR
    : 'إدارة المستخدمين وفق سياسات AdminUserController — الواجهة مرآة وليست مصدر حقيقة وحده.'

  function chipTone(t?: string): 'blue' | 'orange' | 'ink' | 'success' {
    if (t === 'orange' || t === 'danger') return 'orange'
    if (t === 'success') return 'success'
    if (t === 'ink' || t === 'slate') return 'ink'
    return 'blue'
  }

  return (
    <SaPageRoot>
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-[28px] border border-ink-100 bg-gradient-to-bl from-white via-white to-brand-50/35 p-6 shadow-[0_16px_48px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="pointer-events-none absolute -left-24 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-[#2691C2]/[0.07] blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#EC943C]/[0.11] blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 text-right">
              <SaBackLink className="mb-3 inline-flex" />
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-800">دليل الهويات</p>
              <h1 className="mt-2 text-2xl font-black leading-tight text-[#22334A] sm:text-3xl">المستخدمون</h1>
              <p className="mt-3 max-w-2xl text-[13px] font-semibold leading-relaxed text-muted-600">{chromeSubtitle}</p>
            </div>
            {!forbidden ?
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-[12px] font-black text-deepBlue shadow-sm transition hover:border-customBlue/35 hover:bg-brand-50 disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
                  تحديث
                </button>
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-[#2691C2] to-[#22334A] px-5 py-2.5 text-[12px] font-black text-white shadow-[0_14px_36px_rgba(38,145,194,0.35)] transition hover:brightness-[1.03]"
                >
                  <UserCircle2 className="h-4 w-4" aria-hidden />
                  مستخدم جديد
                </button>
              </div>
            : null}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <SaGlassCard glow="blue" className="p-5">
              <p className="text-[11px] font-black text-deepBlue">ملخص نشاط الدليل</p>
              <p className="mt-1 text-[12px] font-semibold text-muted-600">
                مرشحات الدور والحالة تطبَّق على القائمة المحمّلة من الخادم.
              </p>
              <div className="mt-4 grid gap-3">
                {kpis.map((k) => (
                  <SaStatChip key={k.label} label={k.label} value={k.value} tone={chipTone(k.tone ?? 'blue')} />
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-brand-200/40 bg-brand-500/5 px-3 py-2.5 text-[11px] font-bold leading-relaxed text-brand-950">
                استخدم «مستخدم جديد» أو قائمة الإجراءات لإدارة الهويات وفق سياسات الخادم.
              </div>
            </SaGlassCard>
          </aside>

          <div className="min-w-0 space-y-4">
            {loadErr ?
              <ErrorPanel title="تعذّر تحميل المستخدمين" hint={loadErr} />
            : null}

            {!forbidden && !loadErr ?
              <>
                <CrudFilterBar
                  searchValue={query}
                  onSearchChange={setQuery}
                  searchPlaceholder="بحث بالاسم أو البريد…"
                >
                  <MiniSelect
                    label="الدور"
                    value={roleFilter}
                    onChange={setRoleFilter}
                    options={roleFilterOptions}
                  />
                  <MiniSelect
                    label="الحالة"
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}
                    options={[
                      { value: 'all', labelAr: 'كل الحالات' },
                      { value: 'active', labelAr: 'نشط' },
                      { value: 'inactive', labelAr: 'موقوف' },
                    ]}
                  />
                </CrudFilterBar>

                {loading ?
                  <LoadingPanel />
                :
                  <SaGlassCard className="overflow-hidden shadow-[0_12px_48px_rgba(34,51,74,0.09)]" glow="orange">
                    <CrudCardTable>
                      <CrudTable>
                <thead>
                  <tr>
                    <Th>المستخدم</Th>
                    <Th>البريد</Th>
                    <Th>الدور</Th>
                    <Th>الحالة</Th>
                    <Th>تحديث</Th>
                    <Th className="text-end">إجراءات</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ?
                    <tr>
                      <td colSpan={6} className="p-0">
                        <EmptyPanel
                          title="لا توجد نتائج مطابقة"
                          subtitle="جرّب تغيير الفلاتر أو البحث. إن كانت القائمة فارغة بالكامل فربما لا تزال نقطة الـ API تُهيّأ."
                        />
                      </td>
                    </tr>
                  : filtered.map((u) => {
                      const st = statusBadge(u)
                      const editOk = canEditAdminUserRow(currentUser?.role, u.role)
                      const delOk =
                        !!currentUser?.role && canDeleteAdminUserRow(actorId, currentUser.role, u.id, u.role)

                      return (
                        <Tr key={u.id}>
                          <Td>
                            <div dir="rtl" className="flex min-w-0 items-center gap-3">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-white text-[12px] font-black text-customBlue ring-1 ring-brand-200/70">
                                {initialsFromName(u.name)}
                              </div>
                              <div className="min-w-0 flex-1 text-right rtl:text-right">
                                <p className="truncate font-black text-deepBlue">{u.name}</p>
                                <p className="truncate text-[11px] font-bold text-muted-500">#{u.id}</p>
                              </div>
                            </div>
                          </Td>
                          <Td className="max-w-[14rem] text-right rtl:text-right">
                            <span className="break-all text-[12px] font-semibold text-muted-700">{u.email}</span>
                          </Td>
                          <Td>
                            <CrudBadge variant="brand">{adminRoleLabelAr(u.role)}</CrudBadge>
                          </Td>
                          <Td>
                            {st === 'inactive' ?
                              <CrudBadge variant="danger">موقوف</CrudBadge>
                            : st === 'active' ?
                              <CrudBadge variant="success">نشط</CrudBadge>
                            : <CrudBadge variant="default">غير محدد</CrudBadge>}
                          </Td>
                          <Td className="text-[12px] font-bold text-muted-600">
                            {(u.updated_at ?? u.created_at ?? '—').toString().slice(0, 10)}
                          </Td>
                          <Td className="text-end">
                            <RowActionsMenu
                              ariaLabel={`إجراءات ${u.name}`}
                              actions={[
                                {
                                  key: 'view',
                                  label: 'عرض',
                                  onClick: () => {
                                    setFocusedId(u.id)
                                    setModal('view')
                                  },
                                },
                                {
                                  key: 'edit',
                                  label: 'تحرير',
                                  disabled: !editOk,
                                  onClick: () => void openEdit(u.id),
                                },
                                {
                                  key: 'del',
                                  label: 'حذف',
                                  destructive: true,
                                  disabled: !delOk,
                                  onClick: () => {
                                    setFocusedId(u.id)
                                    setDeleteAck(false)
                                    setModal('delete')
                                  },
                                },
                              ]}
                            />
                          </Td>
                        </Tr>
                      )
                    })
                  }
                </tbody>
                      </CrudTable>
                    </CrudCardTable>
                  </SaGlassCard>
                }
              </>
            : null}
          </div>
        </div>
      </div>

      <CrudModal
        open={modal === 'create'}
        onClose={closeModal}
        title="مستخدم جديد"
        subtitle="POST /admin/users — التحقق النهائي على الخادم."
        widthClassName="max-w-lg"
        footerSlot={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-2xl border border-ink-100 px-4 py-2 text-[12px] font-black text-deepBlue"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void submitCreate()}
              className="rounded-2xl bg-customBlue px-5 py-2 text-[12px] font-black text-white disabled:opacity-50"
            >
              إنشاء
            </button>
          </div>
        }
      >
        {!includeSuperAdminAssignment ?
          <p className="mb-3 rounded-2xl border border-ink-100 bg-slate-50 px-3 py-2 text-[11px] font-bold text-muted-700">
            خيار «سوبر مشرف» مخفي — السياسات المطبَّقة بالخلفية لا تسمح بتعيين الدور بدون حساب مخوَّل.
          </p>
        : null}
        <div className="space-y-3 text-right">
          <label className="block">
            <span className="mb-1 block text-[11px] font-black text-muted-600">الاسم</span>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded-2xl border border-ink-100 px-3 py-2.5 text-[13px] font-semibold"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black text-muted-600">البريد</span>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="w-full rounded-2xl border border-ink-100 px-3 py-2.5 text-[13px] font-semibold"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black text-muted-600">الدور</span>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              className="w-full rounded-2xl border border-ink-100 px-3 py-2.5 text-[13px] font-semibold"
            >
              {roleOptionsForm.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.labelAr}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black text-muted-600">كلمة المرور</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full rounded-2xl border border-ink-100 px-3 py-2.5 text-[13px] font-semibold" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black text-muted-600">تأكيد</span>
            <input type="password" value={pwConf} onChange={(e) => setPwConf(e.target.value)} className="w-full rounded-2xl border border-ink-100 px-3 py-2.5 text-[13px] font-semibold" />
          </label>
        </div>
      </CrudModal>

      <CrudModal
        open={modal === 'edit' && focusedId != null}
        onClose={closeModal}
        title="تحرير المستخدم"
        subtitle="PUT /admin/users/{id}"
        widthClassName="max-w-lg"
        footerSlot={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-2xl border border-ink-100 px-4 py-2 text-[12px] font-black text-deepBlue"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={saving || focusedId == null}
              onClick={() => void submitEdit()}
              className="rounded-2xl bg-customBlue px-5 py-2 text-[12px] font-black text-white disabled:opacity-50"
            >
              حفظ
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-right">
          <label className="block">
            <span className="mb-1 block text-[11px] font-black text-muted-600">الاسم</span>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded-2xl border border-ink-100 px-3 py-2.5 text-[13px] font-semibold"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black text-muted-600">البريد</span>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="w-full rounded-2xl border border-ink-100 px-3 py-2.5 text-[13px] font-semibold"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black text-muted-600">الدور</span>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              className="w-full rounded-2xl border border-ink-100 px-3 py-2.5 text-[13px] font-semibold"
            >
              {roleOptionsEdit.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.labelAr}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black text-muted-600">كلمة مرور جديدة (اختياري)</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full rounded-2xl border border-ink-100 px-3 py-2.5 text-[13px] font-semibold" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black text-muted-600">تأكيد</span>
            <input type="password" value={pwConf} onChange={(e) => setPwConf(e.target.value)} className="w-full rounded-2xl border border-ink-100 px-3 py-2.5 text-[13px] font-semibold" />
          </label>
        </div>
      </CrudModal>

      <CrudModal
        open={modal === 'view' && focusedId != null}
        onClose={closeModal}
        title="تفاصيل المستخدم"
        subtitle="قراءة فقط من آخر قائمة تم تحميلها"
      >
        {(() => {
          const r = filtered.find((x) => x.id === focusedId) ?? rows.find((x) => x.id === focusedId)
          return r ?
              <dl className="space-y-2 text-right text-[13px] font-semibold">
                <div className="flex justify-between gap-3 border-b border-ink-100 pb-2">
                  <dt className="text-muted-600">المعرّف</dt>
                  <dd className="font-mono text-deepBlue">{r.id}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-ink-100 pb-2">
                  <dt className="text-muted-600">الاسم</dt>
                  <dd>{r.name}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-ink-100 pb-2">
                  <dt className="text-muted-600">البريد</dt>
                  <dd className="break-all">{r.email}</dd>
                </div>
                <div className="flex justify-between gap-3 pb-2">
                  <dt className="text-muted-600">الدور</dt>
                  <dd>{adminRoleLabelAr(r.role)}</dd>
                </div>
              </dl>
            : <LoadingPanel />
        })()}
      </CrudModal>

      <CrudModal
        open={modal === 'delete' && focusedId != null}
        onClose={closeModal}
        title="تأكيد الحذف"
        subtitle={ADMIN_USER_FORBIDDEN_AR}
        footerSlot={
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-ink-100 px-4 py-2 text-[12px] font-black text-deepBlue">
              إلغاء
            </button>
            <button
              type="button"
              className="rounded-2xl bg-red-600 px-5 py-2 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
              disabled={saving || !focusedId || !deleteAck}
              onClick={() => {
                const u =
                  filtered.find((x) => x.id === focusedId) ?? rows.find((x) => x.id === focusedId)
                if (!u || !focusedId || !deleteAck) return
                void executeDelete(u)
              }}
            >
              حذف نهائياً
            </button>
          </div>
        }
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3 text-right">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-red-300 text-red-600"
            checked={deleteAck}
            onChange={(e) => setDeleteAck(e.target.checked)}
          />
          <span className="text-[13px] font-black leading-relaxed text-red-950">
            أفهم أن الحذف نهائي من واجهة المنصّة وفق سياسات الخادم ولن يُطبَّق على حسابي الشخصي.
          </span>
        </label>
      </CrudModal>
    </SaPageRoot>
  )
}
