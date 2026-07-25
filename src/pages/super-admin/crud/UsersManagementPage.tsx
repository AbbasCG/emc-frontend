import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import axios from 'axios'
import {
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  UserSquare2,
} from 'lucide-react'
import toast from '@/lib/toast'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { getApiErrorMessage } from '@/api/apiErrors'
import {
  ADMIN_USER_FORBIDDEN_AR,
  createAdminUser,
  deleteAdminUser,
  fetchAdminUser,
  fetchAdminUsersPage,
  getAdminUserMutationMessage,
  restoreAdminUser,
  updateAdminUser,
  type AdminManagedUser,
  type AdminUsersSummary,
  type CreateAdminUserInput,
  type UpdateAdminUserInput,
} from '@/api/adminUsersApi'
import { UserEditDrawer } from '@/components/super-admin/users/UserEditDrawer'
import { UsersDataTable } from '@/components/super-admin/users/UsersDataTable'
import { UsersFilterPanel } from '@/components/super-admin/users/UsersFilterPanel'
import { UsersKpiStrip } from '@/components/super-admin/users/UsersKpiStrip'
import { UsersPaginationBar } from '@/components/super-admin/users/UsersPaginationBar'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'
import { isDeletedUser, userVerifiedKey } from '@/components/super-admin/users/userBadgeStatus'
import { cn } from '@/lib/utils'
import { getDashboardPathByRole, normalizeRole } from '@/utils/dashboardAccess'
import { adminRoleLabelAr, getAssignableRoleOptions } from '@/pages/super-admin/users/assignableRoles'
import {
  canDeleteAdminUserRow,
  canEditAdminUserRow,
  canOfferSuperAdminRoleOption,
} from '@/pages/super-admin/users/superAdminUserPolicy'
import { UsersEnterpriseDetailDrawer } from '@/pages/super-admin/users/UsersEnterpriseDetailDrawer'
import { SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import { ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import type { MenuAction } from '@/pages/super-admin/crud/shared/RowActions'
import {
  FormActions,
  FormChecklist,
  FormHelpCard,
  FormSectionCard,
  FormSuccessState,
  FormSummaryPanel,
  FormWizardShell,
  emcWizardStepAnimation,
  type WizardStepMeta,
} from '@/components/emc-form-wizard'
import { EMC_WIZARD_INPUT_BASE } from '@/components/emc-form-wizard/emcWizardTokens'
import {
  EnterpriseCrudHero,
  EnterpriseTableSkeleton,
} from '@/pages/super-admin/crud/shared/enterprise'
import { generateSecurePassword } from '@/utils/passwordGenerator'

const USER_CREATE_STEP_META: readonly WizardStepMeta[] = [
  { id: 1, title: 'معلومات المستخدم', hint: 'الهوية وبيانات الاتصال' },
  { id: 2, title: 'الدور والصلاحيات', hint: 'الدور المعياري في المنصّة' },
  { id: 3, title: 'الأمان وكلمة المرور', hint: 'كلمة المرور الأولية' },
  { id: 4, title: 'المراجعة والحفظ', hint: 'تأكيد ثم الإنشاء' },
]

function isEffectivelyActive(u: AdminManagedUser): boolean {
  if (isDeletedUser(u)) return false
  return u.is_active !== false
}

export default function UsersManagementPage() {
  const navigate = useNavigate()
  const { user: currentUser, isImpersonating, startImpersonationPreview } = useAuth()

  const [pageUsers, setPageUsers] = useState<AdminManagedUser[]>([])
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)
  const [serverPaginated, setServerPaginated] = useState(true)
  const [summary, setSummary] = useState<AdminUsersSummary | null>(null)
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'deleted'>('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [joinedFilter, setJoinedFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('all')
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [perPage, setPerPage] = useState(15)
  const [page, setPage] = useState(1)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const includeSuperAdminAssignment = canOfferSuperAdminRoleOption(currentUser?.role)
  const roleOptionsForm = useMemo(
    () => getAssignableRoleOptions(includeSuperAdminAssignment),
    [includeSuperAdminAssignment],
  )

  const roleFilterOptions = useMemo(
    () => [{ value: 'all', labelAr: 'كل الأدوار' }, ...roleOptionsForm],
    [roleOptionsForm],
  )

  const [editLoading, setEditLoading] = useState(false)

  // Bumped by `load()` so an imperative refresh re-runs the fetch effect below with the
  // very same query — the effect is the single owner of the request.
  const [reloadToken, setReloadToken] = useState(0)

  /** Imperative refresh from an event handler (toolbar button, post-mutation). */
  const load = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  // Re-arm the request state during render whenever the query (or the refresh token)
  // changes — react.dev "adjusting state when a prop changes". Doing it here instead of
  // at the top of the fetch effect keeps the effect free of synchronous state writes and
  // costs no extra committed render.
  const [seenQuery, setSeenQuery] = useState({
    page,
    perPage,
    debouncedQuery,
    roleFilter,
    statusFilter,
    departmentFilter,
    verifiedFilter,
    reloadToken,
  })
  if (
    seenQuery.page !== page ||
    seenQuery.perPage !== perPage ||
    seenQuery.debouncedQuery !== debouncedQuery ||
    seenQuery.roleFilter !== roleFilter ||
    seenQuery.statusFilter !== statusFilter ||
    seenQuery.departmentFilter !== departmentFilter ||
    seenQuery.verifiedFilter !== verifiedFilter ||
    seenQuery.reloadToken !== reloadToken
  ) {
    setSeenQuery({
      page,
      perPage,
      debouncedQuery,
      roleFilter,
      statusFilter,
      departmentFilter,
      verifiedFilter,
      reloadToken,
    })
    setLoading(true)
    setForbidden(false)
    setLoadErr(null)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const result = await fetchAdminUsersPage({
          page,
          per_page: perPage,
          search: debouncedQuery,
          role: roleFilter,
          status: statusFilter,
          department: departmentFilter,
          verified: verifiedFilter,
        })
        if (!alive) return
        setPageUsers(result.users)
        setTotal(result.total)
        setLastPage(result.lastPage)
        setServerPaginated(result.serverPaginated)
        setSummary(result.summary)
        if (!result.serverPaginated) {
          const depts = new Set<string>()
          result.users.forEach((u) => {
            const d = u.department?.trim()
            if (d) depts.add(d)
          })
          setDepartmentOptions((prev) => [...new Set([...prev, ...depts])].sort((a, b) => a.localeCompare(b, 'ar')))
        }
      } catch (e) {
        if (!alive) return
        setPageUsers([])
        setTotal(0)
        if (axios.isAxiosError(e) && e.response?.status === 403) {
          setForbidden(true)
          toast.warning(ADMIN_USER_FORBIDDEN_AR)
        } else setLoadErr(getApiErrorMessage(e))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [page, perPage, debouncedQuery, roleFilter, statusFilter, departmentFilter, verifiedFilter, reloadToken])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Back to page 1 during render when any filter changes (the initial `page` is already
  // 1, so the first pass needs no adjustment).
  const [seenFilters, setSeenFilters] = useState({
    debouncedQuery,
    roleFilter,
    statusFilter,
    departmentFilter,
    joinedFilter,
    verifiedFilter,
    perPage,
  })
  if (
    seenFilters.debouncedQuery !== debouncedQuery ||
    seenFilters.roleFilter !== roleFilter ||
    seenFilters.statusFilter !== statusFilter ||
    seenFilters.departmentFilter !== departmentFilter ||
    seenFilters.joinedFilter !== joinedFilter ||
    seenFilters.verifiedFilter !== verifiedFilter ||
    seenFilters.perPage !== perPage
  ) {
    setSeenFilters({
      debouncedQuery,
      roleFilter,
      statusFilter,
      departmentFilter,
      joinedFilter,
      verifiedFilter,
      perPage,
    })
    setPage(1)
  }

  const impersonatePreview = useCallback(
    async (target: AdminManagedUser) => {
      try {
        await startImpersonationPreview(target.id)
        navigate(getDashboardPathByRole(normalizeRole(target.role)))
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 403) {
          const msgAr =
            (e.response?.data as { message_ar?: string } | undefined)?.message_ar ??
            'لا تملك صلاحية تسجيل الدخول كمستخدم آخر.'
          toast.warning(msgAr)
        } else if (e instanceof Error) {
          if (e.message === 'already_impersonating' || e.message === 'missing_session') return
          toast.error(getApiErrorMessage(e))
        } else {
          toast.error(getApiErrorMessage(e))
        }
      }
    },
    [navigate, startImpersonationPreview],
  )

  const departments = departmentOptions

  const departmentOpts = useMemo(
    () => [{ value: 'all', labelAr: 'كل الإدارات / الأقسام' }, ...departments.map((d) => ({ value: d, labelAr: d }))],
    [departments],
  )

  const enterpriseKpis = useMemo(() => {
    if (summary) {
      return {
        total: summary.total,
        active: summary.active,
        suspended: summary.suspended,
        verified: summary.verified,
        unverified: summary.unverified,
        admins: 0,
        instructors: 0,
        students: 0,
        newThisMonth: 0,
        growthHint: serverPaginated ? 'إحصائيات من الخادم' : 'إحصائيات محلية للنتائج المفلترة',
        growthShort: serverPaginated ? 'ترقيم من الخادم' : 'ترقيم محلي',
        recent24: 0,
      }
    }
    return {
      total,
      active: pageUsers.filter(isEffectivelyActive).length,
      suspended: pageUsers.filter((u) => u.is_active === false).length,
      verified: pageUsers.filter((u) => userVerifiedKey(u) === 'yes').length,
      unverified: pageUsers.filter((u) => userVerifiedKey(u) !== 'yes').length,
      admins: 0,
      instructors: 0,
      students: 0,
      newThisMonth: 0,
      growthHint: '',
      growthShort: '',
      recent24: 0,
    }
  }, [summary, total, pageUsers, serverPaginated])

  const safePage = Math.min(Math.max(1, page), Math.max(1, lastPage))
  const paginated = pageUsers

  const actorId = currentUser?.id ?? 0

  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  function closeModal() {
    setModal(null)
    setDeleteAck(false)
    setSaving(false)
    setEditAvatarFile(null)
    setRemoveAvatar(false)
    setFormAvatarUrl(null)
    setCreateWizardStep(1)
    setCreateSuccessOpen(false)
  }
  const [focusedId, setFocusedId] = useState<number | null>(null)
  const focusedUser =
    focusedId === null ?
      undefined
    : pageUsers.find((r) => r.id === focusedId)

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState('student')
  const [formPhone, setFormPhone] = useState('')
  const [formDepartment, setFormDepartment] = useState('')
  const [formCity, setFormCity] = useState('')
  const [formCountry, setFormCountry] = useState('')
  const [formHow, setFormHow] = useState('')
  /** Admin account activation — «preserve» omits flag on PATCH for backends without it. */
  const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'preserve'>('preserve')
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [formAvatarUrl, setFormAvatarUrl] = useState<string | null>(null)
  const [pw, setPw] = useState('')
  const [pwConf, setPwConf] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteAck, setDeleteAck] = useState(false)
  const [createWizardStep, setCreateWizardStep] = useState(1)
  const [createSuccessOpen, setCreateSuccessOpen] = useState(false)

  const [editMeta, setEditMeta] = useState<{
    emailVerifiedAt?: string | null
    lastLoginAt?: string | null
    createdAt?: string | null
  }>({})

  const roleOptionsEdit = useMemo(() => {
    const rn = normalizeRole(formRole ?? null)
    const opts = [...roleOptionsForm]
    if (rn && !opts.some((o) => o.value === rn)) opts.unshift({ value: rn, labelAr: adminRoleLabelAr(formRole) })
    return opts
  }, [roleOptionsForm, formRole])

  function openCreate() {
    setFormName('')
    setFormEmail('')
    setFormRole('student')
    setFormPhone('')
    setFormDepartment('')
    setFormCity('')
    setFormCountry('')
    setFormHow('')
    setPw('')
    setPwConf('')
    setFocusedId(null)
    setCreateWizardStep(1)
    setCreateSuccessOpen(false)
    setModal('create')
  }

  async function openEdit(id: number) {
    setFocusedId(id)
    setModal('edit')
    setDrawerOpen(false)
    setSaving(false)
    setEditLoading(true)
    setPw('')
    setPwConf('')
    setEditMeta({})
    try {
      const u = await fetchAdminUser(id)
      setFormName(u.name)
      setFormEmail(u.email)
      setFormRole((u.role && String(u.role)) || 'student')
      setFormPhone(u.phone ?? '')
      setFormDepartment(u.department ?? '')
      setFormCity(u.city ?? '')
      setFormCountry(u.country ?? '')
      setFormHow(u.how_did_you_hear_about_us ?? '')
      setFormStatus(u.is_active === false ? 'inactive' : u.is_active === true ? 'active' : 'preserve')
      setEditAvatarFile(null)
      setRemoveAvatar(false)
      setFormAvatarUrl(u.avatar_url ?? null)
      setEditMeta({
        emailVerifiedAt: u.email_verified_at,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
      })
    } catch (e) {
      toast.warning(getAdminUserMutationMessage(e))
      closeModal()
    } finally {
      setEditLoading(false)
    }
  }

  function openEnterpriseView(u: AdminManagedUser) {
    setFocusedId(u.id)
    setDrawerOpen(true)
    setModal(null)
  }

  function validateCreateWizard(step: number): boolean {
    if (step === 1) {
      if (!formName.trim() || !formEmail.trim()) {
        toast.warning('الاسم والبريد مطلوبان')
        return false
      }
      return true
    }
    if (step === 2) return true
    if (step === 3) {
      if (!pw.trim()) {
        toast.warning('كلمة المرور مطلوبة')
        return false
      }
      if (pw !== pwConf) {
        toast.warning('تأكيد كلمة المرور غير متطابق')
        return false
      }
      return true
    }
    return true
  }

  function goNextCreate() {
    if (!validateCreateWizard(createWizardStep)) return
    setCreateWizardStep((s) => Math.min(4, s + 1))
  }

  function goBackCreate() {
    setCreateWizardStep((s) => Math.max(1, s - 1))
  }

  async function submitCreate() {
    if (!validateCreateWizard(1) || !validateCreateWizard(3)) return
    setSaving(true)
    try {
      const body: CreateAdminUserInput = {
        name: formName,
        email: formEmail,
        role: formRole,
        password: pw,
        password_confirmation: pwConf || pw,
        phone: formPhone.trim() || undefined,
        department: formDepartment.trim() || undefined,
        city: formCity.trim() || undefined,
        country: formCountry.trim() || undefined,
        how_did_you_hear_about_us: formHow.trim() || undefined,
      }
      await createAdminUser(body)
      setCreateSuccessOpen(true)
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
      const patch: UpdateAdminUserInput = {
        name: formName,
        email: formEmail,
        role: formRole,
        phone: formPhone.trim() || undefined,
        department: formDepartment.trim() || undefined,
        city: formCity.trim() || undefined,
        country: formCountry.trim() || undefined,
        how_did_you_hear_about_us: formHow.trim() || undefined,
        is_active: formStatus === 'preserve' ? undefined : formStatus === 'active',
        avatarFile: editAvatarFile,
        remove_avatar: removeAvatar,
      }
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
      setDrawerOpen(false)
      void load()
    } catch (e) {
      toast.warning(getAdminUserMutationMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function executeRestore(u: AdminManagedUser) {
    setSaving(true)
    try {
      await restoreAdminUser(u.id)
      toast.success('تمت استعادة الحساب بنجاح')
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
    : `${enterpriseKpis.total} مستخدم · ${enterpriseKpis.active} نشط · ${enterpriseKpis.verified} موثّق`

  const hasActiveFilters =
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    verifiedFilter !== 'all' ||
    departmentFilter !== 'all' ||
    joinedFilter !== 'all' ||
    query.trim().length > 0

  const clearFilters = useCallback(() => {
    setQuery('')
    setRoleFilter('all')
    setStatusFilter('all')
    setVerifiedFilter('all')
    setDepartmentFilter('all')
    setJoinedFilter('all')
  }, [])

  const getRowActions = useCallback(
    (u: AdminManagedUser): MenuAction[] => {
      const editOk = canEditAdminUserRow(currentUser?.role, u.role)
      const delOk =
        !!currentUser?.role && canDeleteAdminUserRow(actorId, currentUser.role, u.id, u.role)

      return [
        { key: 'view', label: 'عرض الملف', onClick: () => openEnterpriseView(u) },
        {
          key: 'edit',
          label: 'تحرير',
          disabled: !editOk || isDeletedUser(u),
          onClick: () => void openEdit(u.id),
        },
        ...(currentUser?.permissions?.includes('users.impersonate') === true &&
        !isImpersonating &&
        Number(currentUser?.id ?? 0) !== Number(u.id) &&
        !isDeletedUser(u) ?
          [
            {
              key: 'impersonate',
              label: 'الدخول كمستخدم',
              onClick: () => void impersonatePreview(u),
            },
          ]
        : []),
        ...(isDeletedUser(u) && normalizeRole(currentUser?.role ?? '') === 'super_admin' ?
          [
            {
              key: 'restore',
              label: 'استعادة الحساب',
              disabled: saving,
              onClick: () => void executeRestore(u),
            },
          ]
        : []),
        {
          key: 'del',
          label: 'حذف',
          destructive: true,
          disabled: !delOk || isDeletedUser(u),
          onClick: () => {
            setFocusedId(u.id)
            setDeleteAck(false)
            setModal('delete')
          },
        },
      ]
    },
    [actorId, currentUser, impersonatePreview, isImpersonating, saving],
  )

  const handleRowClick = useCallback(
    (u: AdminManagedUser) => {
      if (isDeletedUser(u)) {
        openEnterpriseView(u)
        return
      }
      const editOk = canEditAdminUserRow(currentUser?.role, u.role)
      if (editOk) void openEdit(u.id)
      else openEnterpriseView(u)
    },
    [currentUser?.role],
  )

  return (
    <SaPageRoot className="space-y-8">
      <EnterpriseCrudHero
        eyebrow="Identity & Access · Enterprise CRM"
        title="مركز المستخدمين EMC"
        subtitle={chromeSubtitle}
        variant="navy"
        actions={
          !forbidden ?
            <>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/90 px-4 py-2.5 text-[12px] font-semibold text-[#0C2A4B] shadow-sm transition hover:bg-white"
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
                تحديث
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#F28C00] px-5 py-2.5 text-[12px] font-black text-white shadow-[0_16px_40px_-12px_rgba(242,140,0,0.55)] transition hover:brightness-[1.04]"
              >
                <UserSquare2 className="h-4 w-4" aria-hidden />
                مستخدم جديد
              </button>
            </>
          : null
        }
      />

      {!forbidden ?
        <UsersKpiStrip
          total={enterpriseKpis.total}
          active={enterpriseKpis.active}
          inactive={enterpriseKpis.suspended}
          verified={enterpriseKpis.verified}
          unverified={enterpriseKpis.unverified}
          serverPaginated={serverPaginated}
          loading={loading}
        />
      : null}

      {!forbidden && !serverPaginated && total > perPage && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-[12px] font-semibold text-amber-950">
          الخادم لا يُرجع ترقيمًا (`meta.total` / `current_page`). يُحمَّل الجدول محليًا — لتحسين الأداء أضف دعم{' '}
          <code className="rounded bg-white/80 px-1 font-mono text-[11px]">GET /admin/users?page&amp;per_page&amp;search&amp;role&amp;status</code>.
        </div>
      )}

      {loadErr ?
        <ErrorPanel title="تعذّر تحميل المستخدمين" hint={loadErr} />
      : null}

      {!forbidden && !loadErr ?
        <div className="space-y-4">
          <UsersFilterPanel
            query={query}
            onQueryChange={setQuery}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            roleOptions={roleFilterOptions}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            verifiedFilter={verifiedFilter}
            onVerifiedFilterChange={setVerifiedFilter}
            departmentFilter={departmentFilter}
            onDepartmentFilterChange={setDepartmentFilter}
            departmentOptions={departmentOpts}
            joinedFilter={joinedFilter}
            onJoinedFilterChange={setJoinedFilter}
            serverPaginated={serverPaginated}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {loading ?
            <motion.div
              layout
              className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_10px_42px_rgba(12,42,75,0.08)]"
            >
              <EnterpriseTableSkeleton cols={10} rows={perPage > 8 ? 8 : perPage} />
            </motion.div>
          : (
            <motion.div
              layout
              className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_10px_42px_rgba(12,42,75,0.08)] ring-1 ring-[#0C2A4B]/[0.04]"
            >
              <div className="max-h-[min(70vh,720px)] overflow-auto">
                <UsersDataTable
                  users={paginated}
                  getRowActions={getRowActions}
                  onRowClick={handleRowClick}
                />
              </div>
              {total > 0 ?
                <UsersPaginationBar
                  page={safePage}
                  lastPage={lastPage}
                  perPage={perPage}
                  total={total}
                  onPageChange={setPage}
                  onPerPageChange={setPerPage}
                />
              : null}
            </motion.div>
          )}
        </div>
      : null}

      <UsersEnterpriseDetailDrawer
        open={drawerOpen}
        user={focusedUser ?? null}
        onClose={() => {
          setDrawerOpen(false)
        }}
        onEdit={(id) => void openEdit(id)}
      />

      {/* Create — EMC معالج متعدد الخطوات */}
      <>
        <FormWizardShell
          open={modal === 'create' && !createSuccessOpen}
          onClose={closeModal}
          title="مستخدم جديد"
          subtitle="POST /admin/users — نفس الحقول السابقة مع تجربة إرسال موحّدة."
          eyebrow="Users · IAM"
          stepsMeta={USER_CREATE_STEP_META}
          currentStep={createWizardStep}
          onStepSelect={(id) => {
            if (id < createWizardStep) setCreateWizardStep(id)
          }}
          progressPercent={Math.round(((createWizardStep - 1) / (USER_CREATE_STEP_META.length - 1)) * 100)}
          progressLabel="اكتمال إنشاء المستخدم"
          maxWidthClassName="max-w-6xl"
          mainColumn={
            <div className="space-y-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={createWizardStep}
                  initial={emcWizardStepAnimation.initial}
                  animate={emcWizardStepAnimation.animate}
                  exit={emcWizardStepAnimation.exit}
                  transition={emcWizardStepAnimation.transition}
                  className="min-h-[200px] space-y-4"
                >
                  {createWizardStep === 1 ?
                    <FormSectionCard title="الهوية ووسائل الاتصال" eyebrow="الخطوة 1" icon={UserSquare2}>
                      <Labeled label="الاسم الكامل" children={<Input value={formName} onChange={setFormName} />} />
                      <Labeled label="البريد الإلكتروني" children={<Input type="email" value={formEmail} onChange={setFormEmail} />} />
                      <Labeled label="الجوال" children={<Input value={formPhone} onChange={setFormPhone} />} />
                      <Labeled label="القسم / الإدارة" children={<Input value={formDepartment} onChange={setFormDepartment} />} />
                      <Labeled label="المدينة" children={<Input value={formCity} onChange={setFormCity} />} />
                      <Labeled label="الدولة" children={<Input value={formCountry} onChange={setFormCountry} />} />
                      <Labeled label="كيف عرفتم المنصّة؟" children={<Input value={formHow} onChange={setFormHow} />} />
                    </FormSectionCard>
                  : createWizardStep === 2 ?
                    <FormSectionCard title="الدور المعياري" eyebrow="الخطوة 2" icon={ShieldCheck}>
                      {!includeSuperAdminAssignment ?
                        <p className="rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-[11px] font-black text-amber-950">
                          خيار «سوبر مشرف» مخفي وفق سياسات الإسناد.
                        </p>
                      : null}
                      <Labeled
                        label="الدور"
                        children={
                          <select
                            value={formRole}
                            onChange={(e) => setFormRole(e.target.value)}
                            className={EMC_WIZARD_INPUT_BASE}
                          >
                            {roleOptionsForm.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.labelAr}
                              </option>
                            ))}
                          </select>
                        }
                      />
                    </FormSectionCard>
                  : createWizardStep === 3 ?
                    <FormSectionCard title="البيانات الأمنية الأولية" eyebrow="الخطوة 3" icon={Shield}>
                      <PasswordInlineTools pw={pw} setPw={setPw} setPwConf={setPwConf} />
                      <Labeled label="كلمة المرور" children={<Input type="password" value={pw} onChange={setPw} />} />
                      <Labeled label="التأكيد" children={<Input type="password" value={pwConf} onChange={setPwConf} />} />
                      {pw.trim() ?
                        <p className="rounded-xl border border-[#0077B6]/20 bg-[#0077B6]/6 px-3 py-2 text-[11px] font-mono font-bold leading-relaxed text-[#1a6b96] rtl:text-right break-all">
                          {pw}
                        </p>
                      : null}
                    </FormSectionCard>
                  : <FormSectionCard title="مراجعة قبل الإنشاء" eyebrow="الخطوة 4" icon={Sparkles}>
                      <ul className="space-y-2 text-[13px] font-semibold text-slate-700">
                        <li>الاسم: {formName.trim() || '—'}</li>
                        <li>البريد: {formEmail.trim() || '—'}</li>
                        <li>الدور: {adminRoleLabelAr(formRole)}</li>
                        <li>الجوال: {formPhone.trim() || '—'}</li>
                      </ul>
                    </FormSectionCard>
                  }
                </motion.div>
              </AnimatePresence>
              <FormActions
                showBack={createWizardStep > 1}
                onBack={goBackCreate}
                showNext={createWizardStep < 4}
                onNext={goNextCreate}
                showSubmit={createWizardStep === 4}
                onSubmit={() => void submitCreate()}
                busy={saving}
                disableNext={saving}
                disableSubmit={saving}
                submitLabel="إنشاء المستخدم"
              />
            </div>
          }
          sidebar={
            <>
              <FormSummaryPanel
                rows={[
                  { label: 'الاسم', value: formName.trim() || '—' },
                  { label: 'البريد', value: formEmail.trim() || '—' },
                  { label: 'الدور', value: adminRoleLabelAr(formRole) },
                  { label: 'الجوال', value: formPhone.trim() || '—' },
                  { label: 'القسم', value: formDepartment.trim() || '—' },
                ]}
              />
              <FormHelpCard title="إرشادات">
                {createWizardStep === 1 ?
                  <p>أدخل اسمًا واضحًا وبريدًا فعّالًا؛ بقية الحقول تساعد الفرق الداخلية ولا تُفرض على الخادم.</p>
                : createWizardStep === 2 ?
                  <p>الدور يضبط صلاحيات الوصول الافتراضية وفق سياسة Laravel — اختر ما يملكه المستخدم فعليًا.</p>
                : createWizardStep === 3 ?
                  <p>استخدم أدوات التوليد للحصول على كلمة مرور قوية؛ احفظ التأكيد مطابقًا.</p>
                : <p>بعد الإنشاء يمكن التعديل من الجدول أو بطاقة Enterprise.</p>}
              </FormHelpCard>
              <FormChecklist
                items={[
                  { id: 'n', label: 'الاسم والبريد مكتملان', done: Boolean(formName.trim() && formEmail.trim()) },
                  { id: 'r', label: 'تم اختيار الدور', done: Boolean(formRole) },
                  { id: 'p', label: 'كلمة المرور والتأكيد متطابقان', done: Boolean(pw.trim() && pw === pwConf) },
                ]}
              />
            </>
          }
        />
        <FormSuccessState
          open={createSuccessOpen}
          title="تم إنشاء المستخدم"
          description="تم إرسال بيانات الدخول عبر البريد الإلكتروني"
          continueLabel="تم"
          onContinue={() => {
            closeModal()
          }}
        />
      </>

      <UserEditDrawer
        open={modal === 'edit' && focusedId != null}
        userId={focusedId}
        loading={editLoading}
        saving={saving}
        formName={formName}
        formEmail={formEmail}
        formRole={formRole}
        formPhone={formPhone}
        formDepartment={formDepartment}
        formCity={formCity}
        formCountry={formCountry}
        formHow={formHow}
        formStatus={formStatus}
        pw={pw}
        pwConf={pwConf}
        editAvatarFile={editAvatarFile}
        removeAvatar={removeAvatar}
        avatarUrl={formAvatarUrl}
        emailVerifiedAt={editMeta.emailVerifiedAt}
        lastLoginAt={editMeta.lastLoginAt}
        createdAt={editMeta.createdAt}
        roleOptions={roleOptionsEdit}
        onClose={closeModal}
        onSubmit={submitEdit}
        onFormName={setFormName}
        onFormEmail={setFormEmail}
        onFormRole={setFormRole}
        onFormPhone={setFormPhone}
        onFormDepartment={setFormDepartment}
        onFormCity={setFormCity}
        onFormCountry={setFormCountry}
        onFormHow={setFormHow}
        onFormStatus={setFormStatus}
        onPw={setPw}
        onPwConf={setPwConf}
        onEditAvatarFile={setEditAvatarFile}
        onRemoveAvatar={setRemoveAvatar}
      />

      <CrudModal
        open={modal === 'delete' && focusedId != null}
        onClose={closeModal}
        title="تأكيد الحذف"
        subtitle={focusedUser ? `حذف ${focusedUser.name} — DELETE /admin/users/${focusedId}` : 'DELETE /admin/users/{id}'}
        footerSlot={
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50">
              إلغاء
            </button>
            <button
              type="button"
              className="rounded-xl bg-red-600 px-5 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={saving || !focusedId || !deleteAck}
              onClick={() => {
                const u = pageUsers.find((x) => x.id === focusedId) ?? focusedUser
                if (!u || !focusedId || !deleteAck) return
                void executeDelete(u)
              }}
            >
              حذف نهائياً
            </button>
          </div>
        }
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-right">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-red-300 text-red-600"
            checked={deleteAck}
            onChange={(e) => setDeleteAck(e.target.checked)}
          />
          <span className="text-[13px] font-black leading-relaxed text-red-950">
            أفهم أن الحذف نهائي وفق سياسات الخادم ولن يُطبَّق على حسابي الحالي.
          </span>
        </label>
      </CrudModal>
    </SaPageRoot>
  )
}

function PasswordInlineTools({
  pw,
  setPw,
  setPwConf,
}: {
  pw: string
  setPw: (v: string) => void
  setPwConf: (v: string) => void
}) {
  function gen() {
    const next = generateSecurePassword()
    setPw(next)
    setPwConf(next)
    toast.message('تم توليد كلمة مرور — راجع قبل الحفظ أو النسخ')
  }

  async function copy() {
    const t = pw.trim()
    if (!t) {
      toast.warning('لا توجد كلمة مرور للنسخ')
      return
    }
    try {
      await navigator.clipboard.writeText(t)
      toast.success('تم نسخ كلمة المرور')
    } catch {
      toast.error('لم يتوفر الوصول إلى الحافظة')
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => gen()}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#0077B6]/25 bg-[#0077B6]/8 px-3 py-2 text-[11px] font-black text-[#1a6b96] transition hover:bg-[#0077B6]/14"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        توليد كلمة مرور
      </button>
      <button
        type="button"
        onClick={() => void copy()}
        disabled={!pw.trim()}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-[#0C2A4B] transition hover:bg-slate-50 disabled:opacity-40"
      >
        <Copy className="h-3.5 w-3.5" aria-hidden />
        نسخ
      </button>
    </div>
  )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-right rtl:text-right">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function Input({
  type = 'text',
  value,
  onChange,
}: {
  type?: string
  value: string
  onChange: (v: string) => void
}) {
  const [showPw, setShowPw] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPw ? 'text' : 'password') : type

  return (
    <div className="relative">
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-[#0C2A4B] outline-none transition focus:border-[#0077B6]/40 focus:ring-2 focus:ring-[#0077B6]/12 ${isPassword ? 'pe-10' : ''}`}
      />
      {isPassword && (
        <button
          type="button"
          aria-label={showPw ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          onClick={() => setShowPw((s) => !s)}
          className="absolute end-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-[#0C2A4B]"
          tabIndex={-1}
        >
          {showPw ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      )}
    </div>
  )
}
