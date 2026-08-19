import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router'
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
import { getAssignableRoleOptions, adminRoleLabelAr } from '@/pages/super-admin/users/assignableRoles'
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
        const u = await fetchAdminUser(userId)
        if (cancelled) return
        setName(u.name)
        setEmail(u.email)
        setRole((u.role && String(u.role)) || 'student')
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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void (async () => {
      setSaving(true)
      try {
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
            role,
            password,
            password_confirmation: passwordConfirmation || password,
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
          const patch: UpdateAdminUserInput = { name, email, role }
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
            onChange={(x) => setRole(x.target.value)}
            className="rounded-2xl border border-deepBlue/[0.1] px-4 py-2.5 text-[13px] font-semibold outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/20"
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.labelAr}
              </option>
            ))}
          </select>
        </label>

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
