import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import axios from 'axios'
import {
  Ban,
  ChevronDown,
  Clock3,
  Copy,
  Mail,
  Radio,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCircle2,
  Users,
  UserSquare2,
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
  fetchAdminUsers,
  getAdminUserMutationMessage,
  restoreAdminUser,
  updateAdminUser,
  type AdminManagedUser,
  type CreateAdminUserInput,
  type UpdateAdminUserInput,
} from '@/api/adminUsersApi'
import { cn } from '@/lib/utils'
import { getDashboardPathByRole, normalizeRole } from '@/utils/dashboardAccess'
import { adminRoleLabelAr, getAssignableRoleOptions } from '@/pages/super-admin/users/assignableRoles'
import {
  canDeleteAdminUserRow,
  canEditAdminUserRow,
  canOfferSuperAdminRoleOption,
} from '@/pages/super-admin/users/superAdminUserPolicy'
import { UsersEnterpriseDetailDrawer } from '@/pages/super-admin/users/UsersEnterpriseDetailDrawer'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
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
import { AR_UNSPECIFIED } from '@/utils/dispAr'

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

const MS_DAY = 86_400_000

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

function parseMs(s?: string | null): number | null {
  const t = Date.parse(s ?? '')
  return Number.isFinite(t) ? t : null
}

function startOfCalendarMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function startOfPrevCalendarMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth() - 1, 1)
}

function joinedInRange(u: AdminManagedUser, from: number, to: number): boolean {
  const t = parseMs(u.created_at)
  return t !== null && t >= from && t < to
}

function verifiedDot(u: AdminManagedUser): 'yes' | 'no' | 'unknown' {
  const raw = u.email_verified_at
  if (raw == null || String(raw).trim() === '') return 'no'
  return Number.isFinite(Date.parse(raw)) ? 'yes' : 'unknown'
}

export default function UsersManagementPage() {
  const navigate = useNavigate()
  const { user: currentUser, isImpersonating, startImpersonationPreview } = useAuth()

  const [rows, setRows] = useState<AdminManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'deleted'>('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [joinedFilter, setJoinedFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('all')

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

  const departments = useMemo(() => {
    const s = new Set<string>()
    for (const u of rows) {
      const d = u.department?.trim()
      if (d) s.add(d)
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'ar'))
  }, [rows])

  const departmentOpts = useMemo(
    () => [{ value: 'all', labelAr: 'كل الإدارات / الأقسام' }, ...departments.map((d) => ({ value: d, labelAr: d }))],
    [departments],
  )

  const now = useMemo(() => new Date(), [rows])

  const enterpriseKpis = useMemo(() => {
    const total = rows.length
    const active = rows.filter(isEffectivelyActive).length
    const suspended = rows.filter((u) => u.is_active === false).length
    const admins = rows.filter((u) => MANAGER_ROLE_SET.has(String(normalizeRole(u.role))))
    const instructors = rows.filter((u) => normalizeRole(u.role) === 'instructor').length
    const students = rows.filter((u) => normalizeRole(u.role) === 'student').length

    const monthStart = startOfCalendarMonth(now).getTime()
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
    const newThisMonth = rows.filter((u) => joinedInRange(u, monthStart, nextMonthStart)).length

    const prevStart = startOfPrevCalendarMonth(now).getTime()
    const prevMonthCount = rows.filter((u) => joinedInRange(u, prevStart, monthStart)).length
    let growthHint = 'لا يمكن تقييم الزخم قبل توفر اشتراكات شهرية حقيقية.'

    let growthShort = 'لم يتوفر اشتراك في الشهر السابق'
    if (prevMonthCount === 0) {
      if (newThisMonth > 0) {
        growthShort = `${newThisMonth} هذا الشهر (لا مقارنة بالشهر السابق)`
        growthHint = 'الشهر السابق لم يضف مستخدمًا حسب حقول الانضمام.'
      }
    } else {
      growthHint =
        newThisMonth !== prevMonthCount ?
          `${newThisMonth} مقابل ${prevMonthCount} في الشهر الماضي — طوابع created_at الخام`
        : 'الزخم في المستويين المتتاليين مطابق وفق المصدر المرجعي.'
      const deltaPct = Math.round(((newThisMonth - prevMonthCount) / prevMonthCount) * 100)
      growthShort =
        deltaPct === 0 ? 'مساوٍ للشهر السابق' : `${deltaPct > 0 ? '+' : ''}${deltaPct}% أمام الشهر السابق`
    }

    const recent24 = rows.filter((u) => {
      const mx = parseMs(u.updated_at) ?? parseMs(u.last_login_at)
      return mx !== null && Date.now() - mx < MS_DAY
    }).length

    return {
      total,
      active,
      suspended,
      admins: admins.length,
      instructors,
      students,
      newThisMonth,
      growthHint,
      growthShort,
      recent24,
    }
  }, [rows, now])

  const filtered = useMemo(() => {
    const nowMs = Date.now()
    const monthStartMs = startOfCalendarMonth(now).getTime()
    const quarterMs = monthStartMs - MS_DAY * 90
    const yearStartMs = new Date(now.getFullYear(), 0, 1).getTime()
    const q = query.trim().toLowerCase()
    return rows.filter((u) => {
      if (roleFilter !== 'all' && normalizeRole(u.role) !== roleFilter) return false
      if (statusFilter === 'active' && (u.is_active === false || isDeleted(u))) return false
      if (statusFilter === 'inactive' && (u.is_active !== false || isDeleted(u))) return false
      if (statusFilter === 'deleted' && !isDeleted(u)) return false

      const deptNorm = u.department?.trim() ?? ''
      if (departmentFilter !== 'all' && deptNorm !== departmentFilter) return false

      if (joinedFilter !== 'all') {
        const t = parseMs(u.created_at)
        if (joinedFilter === 'month' && !(t !== null && t >= monthStartMs && t <= nowMs)) return false
        if (joinedFilter === 'quarter' && !(t !== null && t >= quarterMs && t <= nowMs)) return false
        if (joinedFilter === 'year' && !(t !== null && t >= yearStartMs && t <= nowMs)) return false
      }

      if (!q) return true
      const haystack = `${u.name} ${u.email} ${u.phone ?? ''} ${u.id} ${u.department ?? ''} ${normalizeRole(u.role ?? null)}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [
    rows,
    query,
    roleFilter,
    statusFilter,
    departmentFilter,
    joinedFilter,
    now,
  ])

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
    : rows.find((r) => r.id === focusedId) ?? filtered.find((r) => r.id === focusedId)

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

  const [expandedId, setExpandedId] = useState<number | null>(null)

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
    setPw('')
    setPwConf('')
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
    } catch (e) {
      toast.warning(getAdminUserMutationMessage(e))
      closeModal()
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
    : 'منصّة تشغيل مؤسسية — القائمة المُحمّلة من GET /admin/users؛ الأرقام التحليلية تُشتق من هذه البيانات فقط بدون تهيئة وهمية.'

  function activityPulse(u: AdminManagedUser): { label: string; tone: string } {
    const login = parseMs(u.last_login_at)
    const upd = parseMs(u.updated_at)
    const best = login !== null || upd !== null ? Math.max(login ?? -1, upd ?? -1) : null
    if (best !== null && best !== -1 && Date.now() - best < MS_DAY)
      return { label: 'تفاعل خلال يوم', tone: 'text-emerald-700' }
    if (best !== null && best !== -1 && Date.now() - best < MS_DAY * 7)
      return { label: 'في الأسبوع', tone: 'text-amber-800' }
    return { label: 'بلا طابع محدّث قريب', tone: 'text-muted-600' }
  }

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
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/95 px-4 py-2.5 text-[12px] font-black text-deepBlue shadow-md backdrop-blur-sm transition hover:bg-white"
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
                تحديث
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#EC943C] px-5 py-2.5 text-[12px] font-black text-white shadow-[0_16px_40px_-12px_rgba(236,148,60,0.55)] transition hover:brightness-[1.04]"
              >
                <UserCircle2 className="h-4 w-4" aria-hidden />
                مستخدم جديد
              </button>
            </>
          : null
        }
      />

      {!forbidden ?
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
          <EnterpriseMetricTile
            accent="blue"
            icon={Users}
            label="إجمالي المستخدمين"
            value={enterpriseKpis.total}
            hint="جميع الهويات المُرسلة ضمن مجموعة الإدارة"
          />
          <EnterpriseMetricTile
            accent="mint"
            icon={ShieldCheck}
            label="نشطون"
            value={enterpriseKpis.active}
            deltaLabel={`موقوف: ${enterpriseKpis.suspended}`}
            hint={enterpriseKpis.suspended === 0 ? undefined : `${enterpriseKpis.suspended} موقوف واضحة من حقل الخادم`}
          />
          <EnterpriseMetricTile
            accent="navy"
            icon={Shield}
            label="فريق الإداريين"
            value={enterpriseKpis.admins}
            hint="أعضاء بتصنيف أدوار حوكمية وفق مجموعة المنصّة"
          />
          <EnterpriseMetricTile
            accent="orange"
            icon={UserSquare2}
            label="مدربون / طلاب"
            value={`${enterpriseKpis.instructors} / ${enterpriseKpis.students}`}
            hint="حسب اسم الدور المُطبَّق"
          />
          <EnterpriseMetricTile
            accent="blue"
            icon={TrendingUp}
            label="انضموا هذا الشهر"
            value={enterpriseKpis.newThisMonth}
            deltaLabel={<span>{enterpriseKpis.growthShort}</span>}
            hint={enterpriseKpis.growthHint}
          />
          <EnterpriseMetricTile
            accent="mint"
            icon={Radio}
            label="نشاط ظاهر خلال 24 ساعة"
            value={enterpriseKpis.recent24}
            hint="بناءً على أحدث قيم بين آخر ظهور/تحديث عند وجود الطابع الزمني"
          />
          <EnterpriseMetricTile
            accent="navy"
            icon={Ban}
            label="موقوفون"
            value={enterpriseKpis.suspended}
            hint="عند ضبط الخادم is_active إلى false فقط"
          />
          <EnterpriseMetricTile
            accent="orange"
            icon={Clock3}
            label="مزامنة مباشرة مع API الإداري"
            value={loading ? '…' : 'جاهزة'}
            loading={loading}
            hint="جميع المرشّحات تقيِّد القائمة المحمّلة محلّيًا لتفادي التخمينات"
          />
        </div>
      : null}

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
              label="الإدارة"
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={departmentOpts}
            />
            <MiniSelect
              label="تاريخ الانضمام"
              value={joinedFilter}
              onChange={(v) => setJoinedFilter(v as 'all' | 'month' | 'quarter' | 'year')}
              options={[
                { value: 'all', labelAr: 'الكل' },
                { value: 'month', labelAr: 'هذا الشهر' },
                { value: 'quarter', labelAr: '+90 يومًا' },
                { value: 'year', labelAr: 'هذا العام' },
              ]}
            />
          </CrudToolbar>

          {loading ?
            <motion.div layout className="overflow-hidden rounded-[22px] border border-white/70 bg-white/70 shadow-lg ring-1 ring-ink-100/60 backdrop-blur-md">
              <EnterpriseTableSkeleton cols={13} rows={9} />
            </motion.div>
          :
            <motion.div
              layout
              className="overflow-hidden rounded-[22px] border border-white/70 bg-white/75 shadow-[0_16px_48px_-18px_rgba(34,51,74,0.15)] ring-1 ring-ink-100/70 backdrop-blur-md"
            >
              <CrudCardTable className="min-w-[1100px]">
                <CrudTable>
                  <thead>
                    <tr>
                      <Th className="w-10">{'\u2060'}</Th>
                      <Th>المستخدم</Th>
                      <Th>#EMC</Th>
                      <Th>البريد</Th>
                      <Th>جوال</Th>
                      <Th>الدور</Th>
                      <Th>إدارة</Th>
                      <Th>حساب</Th>
                      <Th>تأكيد البريد</Th>
                      <Th>آخر ظهور</Th>
                      <Th>تاريخ الإنشاء</Th>
                      <Th>نشاط ظاهر</Th>
                      <Th className="text-end">إجراءات</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ?
                      <tr>
                        <Td colSpan={13} className="p-0">
                          <EmptyPanel
                            title="لا توجد نتائج مطابقة"
                            subtitle="امسح البحث أو غيّر مرشّح الانضمام والإدارات — القائمة تبقى مرتبطة بما استرجعته نقطة الخادم."
                          />
                        </Td>
                      </tr>
                    : filtered.map((u) => {
                        const st = statusBadge(u)
                        const editOk = canEditAdminUserRow(currentUser?.role, u.role)
                        const delOk =
                          !!currentUser?.role &&
                          canDeleteAdminUserRow(actorId, currentUser.role, u.id, u.role)
                        const vz = verifiedDot(u)
                        const pulse = activityPulse(u)
                        const expanded = expandedId === u.id

                        return (
                          <Fragment key={u.id}>
                            <Tr className={cn(expanded ? 'bg-brand-400/[0.04]' : undefined)}>
                              <Td>
                                <button
                                  type="button"
                                  aria-expanded={expanded}
                                  onClick={() => setExpandedId(expanded ? null : u.id)}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-100 bg-white shadow-sm hover:border-customBlue/35"
                                >
                                  <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                    <ChevronDown className="h-4 w-4 text-deepBlue" aria-hidden />
                                  </motion.span>
                                </button>
                              </Td>
                              <Td>
                                <div dir="rtl" className="flex min-w-0 items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => openEnterpriseView(u)}
                                    className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-[18px] bg-gradient-to-br from-[#2691C2]/20 to-white text-[12px] font-black text-deepBlue shadow-inner ring-1 ring-[#2691C2]/30 transition hover:-translate-y-0.5"
                                  >
                                    {initialsFromName(u.name)}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEnterpriseView(u)}
                                    className="min-w-0 flex-1 text-right rtl:text-right"
                                  >
                                    <p className="truncate font-black text-deepBlue hover:text-customBlue">{u.name}</p>
                                    <code className="mt-1 block truncate text-[10px] text-muted-500">
                                      @{normalizeRole(u.role ?? '') || '—'}
                                    </code>
                                  </button>
                                </div>
                              </Td>
                              <Td>
                                <code className="text-[11px] font-black text-accent-950">#{u.id}</code>
                              </Td>
                              <Td className="max-w-[12rem] break-all text-[11px] font-semibold">{u.email}</Td>
                              <Td className="text-[11px] font-semibold">{u.phone?.trim() ? u.phone : AR_UNSPECIFIED}</Td>
                              <Td>
                                <CrudBadge variant="brand">{adminRoleLabelAr(u.role)}</CrudBadge>
                              </Td>
                              <Td className="max-w-[8rem] text-[11px] font-semibold">{u.department ?? '—'}</Td>
                              <Td>
                                {st === 'deleted' ?
                                  <CrudBadge variant="danger">محذوف</CrudBadge>
                                : st === 'inactive' ?
                                  <CrudBadge variant="danger">موقوف</CrudBadge>
                                : st === 'active' ?
                                  <CrudBadge variant="success">نشط</CrudBadge>
                                : <CrudBadge variant="default">غير مُصرّح</CrudBadge>}
                              </Td>
                              <Td>
                                {vz === 'yes' ?
                                  <CrudBadge variant="success">موثّق</CrudBadge>
                                : vz === 'no' ?
                                  <CrudBadge variant="danger">غير موثَّق</CrudBadge>
                                : <CrudBadge variant="default">غير مُرسل</CrudBadge>}
                              </Td>
                              <Td className="max-w-[6.5rem] text-[11px] font-semibold">{u.last_login_at ? `${u.last_login_at.slice(0, 16)}…` : '—'}</Td>
                              <Td className="max-w-[6.5rem] text-[11px] font-bold text-muted-600">
                                {(u.created_at ?? '—').toString().slice(0, 10)}
                              </Td>
                              <Td className={`text-[10px] font-black ${pulse.tone}`}>{pulse.label}</Td>
                              <Td className="text-end">
                                <RowActionsMenu
                                  ariaLabel={`إجراءات ${u.name}`}
                                  actions={[
                                    { key: 'view', label: 'لوحة تنفيذية', onClick: () => openEnterpriseView(u) },
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
                            {expanded ?
                              <tr key={`${String(u.id)}-detail`}>
                                <Td colSpan={13} className="p-0">
                                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
                                    <div className="bg-gradient-to-bl from-brand-400/[0.07] via-white to-white px-6 py-5">
                                      <div className="grid gap-4 text-right text-[12px] font-semibold leading-relaxed text-muted-700 sm:grid-cols-3 rtl:text-right">
                                        <MiniPanel title="تفاصيل التواصل" icon={Mail} lines={[u.phone ?? 'لم يتوفر الجوال']} />
                                        <MiniPanel title="الحالة التشغيلية" icon={Shield} lines={[pulse.label]} />
                                        <MiniPanel
                                          title="زمن تحديث السجل"
                                          icon={TrendingUp}
                                          lines={[u.updated_at?.slice(0, 16) ?? '—']}
                                        />
                                      </div>
                                    </div>
                                  </motion.div>
                                </Td>
                              </tr>
                            : null}
                          </Fragment>
                        )
                      })
                    }
                  </tbody>
                </CrudTable>
              </CrudCardTable>
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
                        <p className="rounded-[14px] border border-[#2691C2]/25 bg-brand-400/10 px-3 py-2 text-[11px] font-mono font-bold leading-relaxed text-deepBlue rtl:text-right break-all">
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

      {/* Edit */}
      <CrudModal
        open={modal === 'edit' && focusedId != null}
        onClose={closeModal}
        title="تحرير المستخدم · Enterprise"
        subtitle="PUT /admin/users/{id}"
        widthClassName="max-w-2xl"
        footerSlot={
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100/80 pt-3">
            <p className="text-[11px] font-semibold text-muted-600 rtl:text-right">حفظك يعتمد اعتماد السياسة على Laravel.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={closeModal} className="rounded-[18px] border border-ink-100 px-4 py-2 text-[12px] font-black text-deepBlue">
                إلغاء
              </button>
              <button
                type="button"
                disabled={saving || focusedId == null}
                onClick={() => void submitEdit()}
                className="inline-flex items-center gap-2 rounded-[18px] bg-gradient-to-l from-[#2691C2] to-[#22334A] px-5 py-2 text-[12px] font-black text-white disabled:opacity-50"
              >
                <TrendingUp className="h-4 w-4" aria-hidden />
                حفظ التغييرات
              </button>
            </div>
          </div>
        }
      >
        <GroupedFormSections
          sections={[
            {
              title: 'البيانات التعريفية',
              icon: UserSquare2,
              body: (
                <>
                  <Labeled label="الاسم" children={<Input value={formName} onChange={setFormName} />} />
                  <Labeled label="البريد" children={<Input type="email" value={formEmail} onChange={setFormEmail} />} />
                </>
              ),
            },
            {
              title: 'الاتصال والتنظيم',
              icon: Users,
              body: (
                <>
                  <Labeled label="الجوال" children={<Input value={formPhone} onChange={setFormPhone} />} />
                  <Labeled label="القسم / الإدارة" children={<Input value={formDepartment} onChange={setFormDepartment} />} />
                  <Labeled label="المدينة" children={<Input value={formCity} onChange={setFormCity} />} />
                  <Labeled label="الدولة" children={<Input value={formCountry} onChange={setFormCountry} />} />
                  <Labeled label="كيف عرفتم المنصّة؟" children={<Input value={formHow} onChange={setFormHow} />} />
                  <Labeled
                    label="حالة الحساب"
                    children={
                      <select
                        value={formStatus}
                        onChange={(e) =>
                          setFormStatus(e.target.value as typeof formStatus)
                        }
                        className="w-full rounded-[18px] border border-ink-100 px-3 py-2.5 text-[13px] font-semibold outline-none ring-2 ring-transparent focus:border-customBlue/35 focus:ring-customBlue/15"
                      >
                        <option value="preserve">بدون تغيير الصلاحية الافتراضية</option>
                        <option value="active">نشط</option>
                        <option value="inactive">موقوف</option>
                      </select>
                    }
                  />
                </>
              ),
            },
            {
              title: 'الصلاحيات',
              icon: ShieldCheck,
              body: (
                <Labeled
                  label="الدور"
                  children={
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full rounded-[18px] border border-ink-100 px-3 py-2.5 text-[13px] font-semibold outline-none ring-2 ring-transparent focus:border-customBlue/35 focus:ring-customBlue/15"
                    >
                      {roleOptionsEdit.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.labelAr}
                        </option>
                      ))}
                    </select>
                  }
                />
              ),
            },
            {
              title: 'صورة الملف (اختياري)',
              icon: UserCircle2,
              body: (
                <>
                  <label className="block text-right rtl:text-right">
                    <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-muted-600">
                      رفع صورة
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full rounded-[18px] border border-ink-100 px-3 py-2 text-[12px] font-semibold file:me-3 file:rounded-lg file:border-0 file:bg-customBlue file:px-3 file:py-2 file:text-[11px] file:font-black file:text-white"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        setEditAvatarFile(f ?? null)
                        if (f) setRemoveAvatar(false)
                      }}
                    />
                  </label>
                  <label className="mt-3 flex cursor-pointer items-center gap-2 text-right rtl:text-right">
                    <input
                      type="checkbox"
                      checked={removeAvatar}
                      disabled={Boolean(editAvatarFile)}
                      onChange={(e) => setRemoveAvatar(e.target.checked)}
                      className="h-4 w-4 rounded border-ink-200"
                    />
                    <span className="text-[12px] font-bold text-muted-700">إزالة الصورة الحالية إن وُجدت</span>
                  </label>
                </>
              ),
            },
            {
              title: 'التدوير الاختياري لكلمة المرور',
              icon: Shield,
              body: (
                <>
                  <PasswordInlineTools pw={pw} setPw={setPw} setPwConf={setPwConf} />
                  <Labeled label="كلمة مرور جديدة (اختياري)" children={<Input type="password" value={pw} onChange={setPw} />} />
                  <Labeled label="التأكيد" children={<Input type="password" value={pwConf} onChange={setPwConf} />} />
                  {pw.trim() ?
                    <p className="rounded-[14px] border border-[#2691C2]/25 bg-brand-400/10 px-3 py-2 text-[11px] font-mono font-bold leading-relaxed text-deepBlue rtl:text-right break-all">
                      {pw}
                    </p>
                  : null}
                </>
              ),
            },
          ]}
        />
      </CrudModal>

      <CrudModal
        open={modal === 'delete' && focusedId != null}
        onClose={closeModal}
        title="تأكيد الحذف"
        subtitle={ADMIN_USER_FORBIDDEN_AR}
        footerSlot={
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={closeModal} className="rounded-[18px] border border-ink-100 px-4 py-2 text-[12px] font-black text-deepBlue">
              إلغاء
            </button>
            <button
              type="button"
              className="rounded-[18px] bg-red-600 px-5 py-2 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
              disabled={saving || !focusedId || !deleteAck}
              onClick={() => {
                const u = filtered.find((x) => x.id === focusedId) ?? rows.find((x) => x.id === focusedId)
                if (!u || !focusedId || !deleteAck) return
                void executeDelete(u)
              }}
            >
              حذف نهائياً
            </button>
          </div>
        }
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-red-100 bg-red-50/60 px-4 py-3 text-right rtl:text-right">
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
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-brand-400/35 bg-brand-400/10 px-3 py-2 text-[11px] font-black text-deepBlue shadow-sm hover:bg-brand-400/18"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        توليد كلمة مرور
      </button>
      <button
        type="button"
        onClick={() => void copy()}
        disabled={!pw.trim()}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-ink-100 bg-white px-3 py-2 text-[11px] font-black text-deepBlue disabled:opacity-40"
      >
        <Copy className="h-3.5 w-3.5" aria-hidden />
        نسخ
      </button>
    </div>
  )
}

function MiniPanel({ title, lines, icon: Icon }: { title: string; lines: string[]; icon: typeof Mail }) {
  return (
    <div className="rounded-[18px] border border-ink-100/70 bg-white/90 p-3 shadow-inner">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-black text-deepBlue">{title}</p>
        <Icon className="h-4 w-4 text-customBlue" aria-hidden />
      </div>
      <ul className="mt-2 space-y-1 text-[11px] font-semibold leading-relaxed text-muted-700">
        {lines.map((l, i) => (
          <li key={`${title}-${String(i)}`}>{l}</li>
        ))}
      </ul>
    </div>
  )
}

function GroupedFormSections({
  sections,
}: {
  sections: { title: string; icon: typeof Users; body: ReactNode }[]
}) {
  return (
    <div className="space-y-5">
      {sections.map((s) => (
        <div key={s.title} className="rounded-[22px] border border-ink-100/70 bg-white/95 p-4 shadow-sm ring-1 ring-ink-100/55">
          <div className="mb-4 flex items-center gap-3 border-b border-ink-100/60 pb-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#2691C2]/12 to-accent-400/10 text-deepBlue shadow-inner ring-1 ring-brand-200/50">
              <s.icon className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-[13px] font-black text-deepBlue">{s.title}</p>
          </div>
          <div className="space-y-4">{s.body}</div>
        </div>
      ))}
    </div>
  )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-right rtl:text-right">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-muted-600">{label}</span>
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
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[18px] border border-ink-100 px-4 py-2.5 text-[13px] font-semibold outline-none ring-2 ring-transparent transition focus:border-customBlue/35 focus:ring-customBlue/15"
    />
  )
}
