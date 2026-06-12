import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import axios from 'axios'
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  MailCheck,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  UserSquare2,
  Users,
  X,
} from 'lucide-react'
import toast from '@/lib/toast'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
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
import { UserAvatarCell } from '@/components/super-admin/users/UserAvatarCell'
import { UserEditDrawer } from '@/components/super-admin/users/UserEditDrawer'
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
import { MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudToolbar } from '@/pages/super-admin/crud/shared/CrudToolbar'
import { ErrorPanel, EmptyPanel } from '@/pages/super-admin/crud/shared/States'
import { CrudCardTable, CrudTable, Th, Tr, Td } from '@/pages/super-admin/crud/shared/TableChrome'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'
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
  EnterpriseMetricTile,
  EnterpriseTableSkeleton,
} from '@/pages/super-admin/crud/shared/enterprise'
import { generateSecurePassword } from '@/utils/passwordGenerator'
import { formatDate, formatLastLogin } from '@/utils/dateTime'

const ROLE_PILL: Record<string, string> = {
  super_admin:       'bg-[#22334A] text-white border-[#22334A]/70',
  admin:             'bg-[#1a2940]/90 text-white border-[#1a2940]/60',
  executive_admin:   'bg-[#22334A]/80 text-white border-[#22334A]/50',
  instructor:        'bg-[#2691C2]/10 text-[#1a6b96] border-[#2691C2]/30',
  student:           'bg-emerald-50 text-emerald-800 border-emerald-200',
  finance_manager:   'bg-amber-50 text-amber-800 border-amber-200',
  hr_manager:        'bg-violet-50 text-violet-800 border-violet-200',
  marketing_manager: 'bg-pink-50 text-pink-800 border-pink-200',
  quality_manager:   'bg-teal-50 text-teal-800 border-teal-200',
  support_agent:     'bg-sky-50 text-sky-800 border-sky-200',
  department_manager:'bg-indigo-50 text-indigo-800 border-indigo-200',
}

const STATUS_PILL = {
  active:  'bg-emerald-50 text-emerald-800 border-emerald-200',
  inactive:'bg-amber-50 text-amber-800 border-amber-200',
  deleted: 'bg-red-50 text-red-700 border-red-200',
  unknown: 'bg-slate-50 text-slate-600 border-slate-200',
} as const

const STATUS_LABEL = {
  active: 'نشط', inactive: 'موقوف', deleted: 'محذوف', unknown: 'غير محدد',
} as const

const VERIFIED_PILL = {
  yes:     'bg-emerald-50 text-emerald-800 border-emerald-200',
  no:      'bg-rose-50 text-rose-700 border-rose-200',
  unknown: 'bg-slate-50 text-slate-500 border-slate-200',
} as const

const VERIFIED_LABEL = { yes: 'موثَّق', no: 'غير موثَّق', unknown: 'غير مُرسَل' } as const

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-black', className)}>
      {children}
    </span>
  )
}

const USER_CREATE_STEP_META: readonly WizardStepMeta[] = [
  { id: 1, title: 'معلومات المستخدم', hint: 'الهوية وبيانات الاتصال' },
  { id: 2, title: 'الدور والصلاحيات', hint: 'الدور المعياري في المنصّة' },
  { id: 3, title: 'الأمان وكلمة المرور', hint: 'كلمة المرور الأولية' },
  { id: 4, title: 'المراجعة والحفظ', hint: 'تأكيد ثم الإنشاء' },
]

function isDeleted(u: AdminManagedUser): boolean {
  return !!u.deleted_at
}

function isEffectivelyActive(u: AdminManagedUser): boolean {
  if (isDeleted(u)) return false
  return u.is_active !== false
}

function statusBadge(u: AdminManagedUser): 'active' | 'inactive' | 'deleted' | 'unknown' {
  if (isDeleted(u)) return 'deleted'
  if (u.is_active === false) return 'inactive'
  if (u.is_active === true) return 'active'
  return 'unknown'
}

function verifiedDot(u: AdminManagedUser): 'yes' | 'no' | 'unknown' {
  const raw = u.email_verified_at
  if (raw == null || String(raw).trim() === '') return 'no'
  return Number.isFinite(Date.parse(raw)) ? 'yes' : 'unknown'
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

  const load = useCallback(async () => {
    setLoading(true)
    setForbidden(false)
    setLoadErr(null)
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
      setPageUsers([])
      setTotal(0)
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        setForbidden(true)
        toast.warning(ADMIN_USER_FORBIDDEN_AR)
      } else setLoadErr(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [page, perPage, debouncedQuery, roleFilter, statusFilter, departmentFilter, verifiedFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, roleFilter, statusFilter, departmentFilter, joinedFilter, verifiedFilter, perPage])

  const impersonatePreview = useCallback(
    async (target: AdminManagedUser) => {
      try {
        await startImpersonationPreview(target.id)
        navigate(getDashboardPathByRole(normalizeRole(target.role)))
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 403) {
          toast.warning('لا تملك صلاحية تنفيذ هذا الإجراء')
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
      verified: pageUsers.filter((u) => verifiedDot(u) === 'yes').length,
      unverified: pageUsers.filter((u) => verifiedDot(u) !== 'yes').length,
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
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/90 px-4 py-2.5 text-[12px] font-semibold text-[#22334A] shadow-sm transition hover:bg-white"
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
                تحديث
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#EC943C] px-5 py-2.5 text-[12px] font-black text-white shadow-[0_16px_40px_-12px_rgba(236,148,60,0.55)] transition hover:brightness-[1.04]"
              >
                <UserSquare2 className="h-4 w-4" aria-hidden />
                مستخدم جديد
              </button>
            </>
          : null
        }
      />

      {!forbidden ?
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <EnterpriseMetricTile accent="blue"   icon={Users}      label="إجمالي المستخدمين" value={enterpriseKpis.total}       hint={serverPaginated ? 'من الخادم' : 'ترقيم محلي'} />
          <EnterpriseMetricTile accent="mint"   icon={ShieldCheck} label="حسابات نشطة"       value={enterpriseKpis.active}      deltaLabel={enterpriseKpis.suspended > 0 ? `${enterpriseKpis.suspended} موقوف` : undefined} />
          <EnterpriseMetricTile accent="navy"   icon={MailCheck}   label="بريد موثَّق"       value={enterpriseKpis.verified}    hint={`${enterpriseKpis.unverified} غير موثَّق`} />
          <EnterpriseMetricTile accent="orange" icon={Shield}      label="الصفحة الحالية"    value={paginated.length}           hint={`${(safePage - 1) * perPage + 1}–${Math.min(safePage * perPage, total)} من ${total}`} />
        </div>
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
          <CrudToolbar
            sticky
            searchValue={query}
            onSearchChange={setQuery}
            searchPlaceholder="بحث بالاسم، البريد، الجوال، المعرّف، الدور، الإدارة…"
          >
            <MiniSelect label="الدور" value={roleFilter} onChange={setRoleFilter} options={roleFilterOptions} />
            <MiniSelect
              label="الحالة"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive' | 'deleted')}
              options={[
                { value: 'all', labelAr: 'كل الحالات' },
                { value: 'active', labelAr: 'نشط' },
                { value: 'inactive', labelAr: 'موقوف' },
                { value: 'deleted', labelAr: 'محذوف' },
              ]}
            />
            <MiniSelect
              label="توثيق البريد"
              value={verifiedFilter}
              onChange={(v) => setVerifiedFilter(v as 'all' | 'verified' | 'unverified')}
              options={[
                { value: 'all', labelAr: 'الكل' },
                { value: 'verified', labelAr: 'موثَّق' },
                { value: 'unverified', labelAr: 'غير موثَّق' },
              ]}
            />
            <MiniSelect
              label="الإدارة"
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={departmentOpts}
            />
            <MiniSelect
              label="تاريخ الانضمام"
              value={joinedFilter}
              onChange={(v) => setJoinedFilter(v as 'all' | 'month' | 'quarter' | 'year')}
              disabled={serverPaginated}
              options={[
                { value: 'all', labelAr: 'الكل' },
                { value: 'month', labelAr: 'هذا الشهر' },
                { value: 'quarter', labelAr: '+90 يوماً' },
                { value: 'year', labelAr: 'هذا العام' },
              ]}
            />
            {(roleFilter !== 'all' || statusFilter !== 'all' || verifiedFilter !== 'all' || departmentFilter !== 'all' || joinedFilter !== 'all' || query.trim()) ?
              <button
                type="button"
                onClick={() => { setQuery(''); setRoleFilter('all'); setStatusFilter('all'); setVerifiedFilter('all'); setDepartmentFilter('all'); setJoinedFilter('all') }}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-700 hover:bg-rose-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                مسح التصفية
              </button>
            : null}
          </CrudToolbar>

          {loading ?
            <motion.div layout className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <EnterpriseTableSkeleton cols={10} rows={perPage > 8 ? 8 : perPage} />
            </motion.div>
          :
            <motion.div layout className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="max-h-[min(70vh,720px)] overflow-auto">
              <CrudCardTable className="min-w-[1020px] rounded-none border-0 shadow-none">
                <CrudTable>
                  <thead>
                    <tr>
                      <Th className="min-w-[15rem]">المستخدم</Th>
                      <Th className="w-14">#</Th>
                      <Th className="w-28">الجوال</Th>
                      <Th className="w-32">الدور</Th>
                      <Th className="w-28">الإدارة</Th>
                      <Th className="w-24">الحساب</Th>
                      <Th className="w-28">توثيق البريد</Th>
                      <Th className="w-36">آخر دخول</Th>
                      <Th className="w-32">تاريخ الإنشاء</Th>
                      <Th className="w-20 text-end">إجراءات</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ?
                      <tr>
                        <Td colSpan={10} className="p-0">
                          <EmptyPanel
                            title="لا توجد نتائج مطابقة"
                            subtitle="جرّب تعديل البحث أو المرشّحات — النتائج تُحمَّل من الخادم عند توفر الترقيم."
                          />
                        </Td>
                      </tr>
                    : paginated.map((u) => {
                        const st = statusBadge(u)
                        const editOk = canEditAdminUserRow(currentUser?.role, u.role)
                        const delOk =
                          !!currentUser?.role &&
                          canDeleteAdminUserRow(actorId, currentUser.role, u.id, u.role)
                        const vz = verifiedDot(u)
                        const roleKey = normalizeRole(u.role ?? '') ?? ''

                        return (
                          <Tr key={u.id} muted={isDeleted(u)}>
                            <Td>
                              <button
                                type="button"
                                onClick={() => openEnterpriseView(u)}
                                className="w-full min-w-0 text-right transition hover:opacity-90"
                              >
                                <UserAvatarCell
                                  name={u.name}
                                  email={u.email}
                                  avatarUrl={u.avatar_url}
                                />
                              </button>
                            </Td>
                            <Td>
                              <span className="font-mono text-[11px] font-black text-slate-500">#{u.id}</span>
                            </Td>
                            <Td className="text-[12px] text-slate-600">{u.phone?.trim() ? u.phone : <span className="text-slate-300">—</span>}</Td>
                            <Td>
                              <Pill className={ROLE_PILL[roleKey] ?? 'bg-slate-50 text-slate-700 border-slate-200'}>{adminRoleLabelAr(u.role)}</Pill>
                            </Td>
                            <Td className="max-w-[8rem] truncate text-[12px] text-slate-500">{u.department?.trim() || '—'}</Td>
                            <Td>
                              <Pill className={STATUS_PILL[st]}>{STATUS_LABEL[st]}</Pill>
                            </Td>
                            <Td>
                              <Pill className={VERIFIED_PILL[vz]}>{VERIFIED_LABEL[vz]}</Pill>
                            </Td>
                            <Td>
                              <p className="text-[12px] font-semibold text-[#22334A]">{formatLastLogin(u.last_login_at)}</p>
                            </Td>
                            <Td>
                              <p className="text-[12px] text-slate-500">{formatDate(u.created_at)}</p>
                            </Td>
                            <Td className="text-end">
                              <RowActionsMenu
                                ariaLabel={`إجراءات ${u.name}`}
                                actions={[
                                  { key: 'view', label: 'عرض الملف', onClick: () => openEnterpriseView(u) },
                                  { key: 'edit', label: 'تحرير', disabled: !editOk || isDeleted(u), onClick: () => void openEdit(u.id) },
                                  ...(normalizeRole(currentUser?.role ?? '') === 'super_admin' &&
                                  !isImpersonating &&
                                  Number(currentUser?.id ?? 0) !== Number(u.id) &&
                                  !isDeleted(u) ?
                                    [
                                      {
                                        key: 'impersonate',
                                        label: 'الدخول كمستخدم',
                                        onClick: () => void impersonatePreview(u),
                                      },
                                    ]
                                  : []),
                                  ...(isDeleted(u) && normalizeRole(currentUser?.role ?? '') === 'super_admin' ?
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
                                    disabled: !delOk || isDeleted(u),
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
              </div>

              {total > 0 && (
                <div dir="rtl" className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/40 px-5 py-3">
                  <div className="flex items-center gap-2.5 text-[12px] text-slate-500">
                    <span>عرض</span>
                    <select
                      value={perPage}
                      onChange={(e) => setPerPage(Number(e.target.value))}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-bold text-[#22334A] outline-none focus:border-[#2691C2]/50 focus:ring-2 focus:ring-[#2691C2]/12"
                    >
                      {[15, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <span className="font-semibold">
                      {`${(safePage - 1) * perPage + 1}–${Math.min(safePage * perPage, total)} من ${total} مستخدم`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage(safePage - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-[#2691C2]/40 hover:text-[#2691C2] disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="الصفحة السابقة"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>

                    {Array.from({ length: lastPage }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === lastPage || Math.abs(p - safePage) <= 1)
                      .reduce<(number | '…')[]>((acc, p, i, arr) => {
                        if (i > 0 && (arr[i - 1] as number) !== p - 1) acc.push('…')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, i) =>
                        p === '…' ? (
                          <span key={`ellipsis-${i}`} className="w-6 text-center text-[12px] text-slate-300">…</span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p as number)}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[12px] font-bold transition ${
                              safePage === p
                                ? 'border-[#2691C2] bg-[#2691C2] text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-[#2691C2]/40 hover:text-[#2691C2]'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )
                    }

                    <button
                      type="button"
                      disabled={safePage >= lastPage}
                      onClick={() => setPage(safePage + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-[#2691C2]/40 hover:text-[#2691C2] disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="الصفحة التالية"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          }
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
                        <p className="rounded-xl border border-[#2691C2]/20 bg-[#2691C2]/6 px-3 py-2 text-[11px] font-mono font-bold leading-relaxed text-[#1a6b96] rtl:text-right break-all">
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
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#2691C2]/25 bg-[#2691C2]/8 px-3 py-2 text-[11px] font-black text-[#1a6b96] transition hover:bg-[#2691C2]/14"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        توليد كلمة مرور
      </button>
      <button
        type="button"
        onClick={() => void copy()}
        disabled={!pw.trim()}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-[#22334A] transition hover:bg-slate-50 disabled:opacity-40"
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
        className={`w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-[#22334A] outline-none transition focus:border-[#2691C2]/40 focus:ring-2 focus:ring-[#2691C2]/12 ${isPassword ? 'pe-10' : ''}`}
      />
      {isPassword && (
        <button
          type="button"
          aria-label={showPw ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          onClick={() => setShowPw((s) => !s)}
          className="absolute end-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-[#22334A]"
          tabIndex={-1}
        >
          {showPw ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      )}
    </div>
  )
}
