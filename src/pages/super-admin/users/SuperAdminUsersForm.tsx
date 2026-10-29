import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router'
import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'
import toast from '@/lib/toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  ADMIN_USER_FORBIDDEN_AR,
  createAdminUser,
  fetchAdminUser,
  getAdminUserMutationMessage,
  updateAdminUser,
  type UpdateAdminUserInput,
} from '@/api/adminUsersApi'
import { ShieldCheck, Sparkles } from 'lucide-react'
import {
  getAssignableRoleOptions,
  adminRoleLabelAr,
  DEFAULT_EMC_DEPARTMENTS,
  getSpecializedRoleForDepartment,
  isSpecializedManagerRole,
  type DepartmentOption,
} from '@/pages/super-admin/users/assignableRoles'
import { canOfferSuperAdminRoleOption } from '@/pages/super-admin/users/superAdminUserPolicy'
import { normalizeRole } from '@/utils/dashboardAccess'
import { SuperAdminCrudHeader } from '@/pages/super-admin/SuperAdminCrudHeader'
import { SUPER_ADMIN_CRUD } from '@/pages/super-admin/superAdminEntities'

type Props = { variant: 'create' | 'edit'; userId?: number }

export default function SuperAdminUsersForm({ variant, userId }: Props) {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const meta = SUPER_ADMIN_CRUD.users

  const includeSuperAdmin = canOfferSuperAdminRoleOption(currentUser?.role)

  const [loading, setLoading] = useState(variant === 'edit')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('student')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [department, setDepartment] = useState<string>('')
  const [departments, setDepartments] = useState<DepartmentOption[]>(DEFAULT_EMC_DEPARTMENTS)
  const [saving, setSaving] = useState(false)

  const baseOptions = useMemo(() => getAssignableRoleOptions(includeSuperAdmin), [includeSuperAdmin])
  const roleOptions = useMemo(() => {
    const r = normalizeRole(role) ?? role
    if (!r || baseOptions.some((o) => o.value === r)) return baseOptions
    return [{ value: r, labelAr: adminRoleLabelAr(r) }, ...baseOptions]
  }, [baseOptions, role])

  useEffect(() => {
    if (variant !== 'edit' || userId == null || !Number.isFinite(userId)) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [u, depsRes] = await Promise.all([
          fetchAdminUser(userId),
          apiClient.get('/departments/options')
        ])
        
        if (cancelled) return
        
        const deps = unwrapData<unknown>(depsRes.data)
        if (Array.isArray(deps)) {
          setDepartments(deps as DepartmentOption[])
        }
        
        setName(u.name)
        setEmail(u.email)
        setRole((u.role && String(u.role)) || 'student')
        if (u.department_id) setDepartment(String(u.department_id))
        else if (u.department) setDepartment(String(u.department))
      } catch (e) {
        if (cancelled) return
        if (axios.isAxiosError(e) && e.response?.status === 403) {
          toast.warning(ADMIN_USER_FORBIDDEN_AR)
          navigate('/dashboard/super-admin/crud/users')
        } else toast.error(getAdminUserMutationMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [variant, userId, navigate])

  useEffect(() => {
    if (variant === 'create') {
      let cancelled = false
      apiClient.get('/departments/options').then(res => {
        if (cancelled) return
        const deps = unwrapData<unknown>(res.data)
        if (Array.isArray(deps)) setDepartments(deps as DepartmentOption[])
      }).catch(() => {})
      return () => { cancelled = true }
    }
  }, [variant])

  const isManagerRole = isSpecializedManagerRole(role)
  const isMemberRole = role === 'department_member'
  const isDeptRole = isManagerRole || isMemberRole

  const currentSelectedDept = useMemo(() => {
    return departments.find((d) => String(d.id) === String(department))
  }, [departments, department])

  const specializedInfo = useMemo(() => {
    if (!isManagerRole || !currentSelectedDept) return null
    return getSpecializedRoleForDepartment(currentSelectedDept)
  }, [isManagerRole, currentSelectedDept])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void (async () => {
      setSaving(true)
      try {
        if (isDeptRole && !department) {
          toast.warning(isManagerRole ? 'يرجى اختيار الإدارة التي يديرها المستخدم' : 'يرجى اختيار الإدارة التابع لها العضو')
          setSaving(false)
          return
        }

        const matchedDept = departments.find((d) => String(d.id) === department)
        const deptName = matchedDept ? matchedDept.name_ar || matchedDept.name || null : null
        const targetRole = isManagerRole && matchedDept ? (getSpecializedRoleForDepartment(matchedDept)?.role || role) : role

        if (variant === 'create') {
          if (!password.trim()) {
            toast.warning('كلمة المرور مطلوبة عند الإنشاء')
            return
          }
          if (password.trim() !== passwordConfirmation.trim()) {
            toast.warning('تأكيد كلمة المرور غير متطابق')
            return
          }
          const created = await createAdminUser({
            name,
            email,
            role: targetRole,
            password,
            password_confirmation: passwordConfirmation || password,
            department: deptName,
            department_id: department ? Number(department) : null,
          })
          toast.success('تم إنشاء المستخدم')
          navigate(`/dashboard/super-admin/crud/users/${created.id}`)
        } else if (userId != null) {
          const pw = password.trim()
          const pwc = passwordConfirmation.trim()
          if (pw !== pwc) {
            toast.warning('تأكيد كلمة المرور غير متطابق')
            return
          }
          const patch: UpdateAdminUserInput = {
            name,
            email,
            role: targetRole,
            department: deptName,
            department_id: department ? Number(department) : null,
          }
          if (pw) {
            patch.password = pw
            patch.password_confirmation = pwc || pw
          }
          await updateAdminUser(userId, patch)
          toast.success('تم حفظ التعديلات')
          navigate(`/dashboard/super-admin/crud/users/${userId}`)
        }
      } catch (err) {
        toast.warning(getAdminUserMutationMessage(err))
      } finally {
        setSaving(false)
      }
    })()
  }

  if (loading) {
    return (
      <div dir="rtl" className="flex min-h-[30vh] items-center justify-center text-[13px] font-bold text-slate-500">
        جارٍ تحميل بيانات المستخدم…
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-6">
      <SuperAdminCrudHeader
        meta={{
          ...meta,
          subtitleAr:
            variant === 'create'
              ? 'إنشاء مستخدم عبر POST /admin/users الخادم يتحكم في إسناد دور سوبر مشرف.'
              : 'تحديث مستخدم عبر PUT /admin/users/{id}',
        }}
        actionSlot={
          <Link to="/dashboard/super-admin/crud/users" className="text-[12px] font-black text-customBlue hover:underline">
            قائمة المستخدمين
          </Link>
        }
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-[24px] border border-deepBlue/[0.06] bg-white p-6 shadow-sm sm:p-8"
      >
        {!includeSuperAdmin ?
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-bold leading-relaxed text-slate-700">
            خيار «سوبر مشرف» مخفي وفق حسابك الحالي؛ المنع يُكمَّل أيضاً بالخلفية بحيث لا يُمنح سوبر مشرف إلا لفريق التشغيل المخوَّل فقط.
          </p>
        : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-right text-[12px] font-black text-deepBlue">
            الاسم الكامل
            <input
              required
              value={name}
              onChange={(x) => setName(x.target.value)}
              className="rounded-2xl border border-deepBlue/[0.1] px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/20"
            />
          </label>
          <label className="flex flex-col gap-2 text-right text-[12px] font-black text-deepBlue">
            البريد الإلكتروني
            <input
              type="email"
              required
              value={email}
              onChange={(x) => setEmail(x.target.value)}
              className="rounded-2xl border border-deepBlue/[0.1] px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/20"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-right text-[12px] font-black text-deepBlue">
          الدور
          <select
            value={role}
            onChange={(x) => {
              const nextRole = x.target.value
              setRole(nextRole)
              if (nextRole === 'department_manager' && currentSelectedDept) {
                const spec = getSpecializedRoleForDepartment(currentSelectedDept)
                if (spec) setRole(spec.role)
              }
            }}
            className="rounded-2xl border border-deepBlue/[0.1] px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/20"
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.labelAr}
              </option>
            ))}
            {!roleOptions.some((o) => o.value === role) && (
              <option value={role}>
                {adminRoleLabelAr(role)}
              </option>
            )}
          </select>
        </label>

        {isDeptRole && (
          <div className="space-y-2">
            <label className={`flex flex-col gap-2 text-right text-[12px] font-black ${isDeptRole ? 'text-customBlue' : 'text-deepBlue'}`}>
              <div className="flex items-center justify-between">
                <span>
                  {isManagerRole ? 'الإدارة التي يديرها *' : 'الإدارة التابع لها *'}
                </span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  مطلوبة للتسكين ولوحة التحكم
                </span>
              </div>
              <select
                value={department}
                required={isDeptRole}
                onChange={(x) => {
                  const id = x.target.value
                  setDepartment(id)
                  const matched = departments.find((d) => String(d.id) === id)
                  if (isManagerRole && matched) {
                    const spec = getSpecializedRoleForDepartment(matched)
                    if (spec) setRole(spec.role)
                  }
                }}
                className={`rounded-2xl border px-4 py-2.5 text-[13px] font-semibold outline-none focus:ring-2 ${
                  isDeptRole && !department
                    ? 'border-amber-400 bg-amber-50/30 focus:border-amber-500 focus:ring-amber-200'
                    : 'border-deepBlue/[0.1] focus:border-customBlue focus:ring-customBlue/20'
                }`}
              >
                <option value="">{isDeptRole ? '-- اختر الإدارة المعنية --' : '-- بدون إدارة --'}</option>
                {departments.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name_ar || d.name}
                  </option>
                ))}
              </select>
            </label>

            {isManagerRole && specializedInfo && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-[12px] text-emerald-900 shadow-sm text-right">
                <div className="flex items-center gap-2 font-black text-emerald-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>تم الربط التلقائي بالدور التخصصي الفعلي: {specializedInfo.labelAr} ({specializedInfo.role})</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                  سيتم توجيه هذا المدير إلى لوحة التحكم التخصصية وتفعيل شاشات وصلاحيات {currentSelectedDept?.name_ar || currentSelectedDept?.name} بالكامل.
                </p>
              </div>
            )}

            {isMemberRole && currentSelectedDept && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/90 p-3 text-[12px] text-sky-900 shadow-sm text-right">
                <div className="flex items-center gap-2 font-black text-sky-800">
                  <Sparkles className="h-4 w-4 text-sky-600 shrink-0" />
                  <span>تم تحديد الإدارة: {currentSelectedDept.name_ar || currentSelectedDept.name}</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-sky-700">
                  سيتم تسكين العضو في هذه الإدارة وإتاحة صالة الاجتماعات والتقارير الخاصة بها.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-right text-[12px] font-black text-deepBlue">
            {variant === 'create' ? 'كلمة المرور' : 'كلمة مرور جديدة (اختياري)'}
            <input
              type="password"
              autoComplete={variant === 'create' ? 'new-password' : 'new-password'}
              required={variant === 'create'}
              value={password}
              onChange={(x) => setPassword(x.target.value)}
              className="rounded-2xl border border-deepBlue/[0.1] px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/20"
            />
          </label>
          <label className="flex flex-col gap-2 text-right text-[12px] font-black text-deepBlue">
            تأكيد كلمة المرور
            <input
              type="password"
              autoComplete="new-password"
              required={variant === 'create'}
              value={passwordConfirmation}
              onChange={(x) => setPasswordConfirmation(x.target.value)}
              className="rounded-2xl border border-deepBlue/[0.1] px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/20"
            />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            className="rounded-2xl border border-deepBlue/[0.12] px-5 py-2.5 text-[12px] font-black text-deepBlue hover:bg-slate-50"
            onClick={() => navigate(-1)}
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-customBlue px-6 py-2.5 text-[12px] font-black text-white shadow-[0_10px_22px_rgba(15,61,146,0.2)] hover:bg-deepBlue disabled:opacity-60"
          >
            {saving ? 'جارٍ الإرسال…' : variant === 'create' ? 'إنشاء' : 'حفظ'}
          </button>
        </div>
      </form>
    </div>
  )
}
