import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Users,
} from 'lucide-react'
import toast from '@/lib/toast'
import type { UpdateAdminUserInput } from '@/api/adminUsersApi'
import { adminRoleLabelAr } from '@/pages/super-admin/users/assignableRoles'
import { CrudDrawer } from '@/pages/super-admin/crud/shared/CrudDrawer'
import { formatDate, formatRelativeDate } from '@/utils/dateTime'
import { generateSecurePassword } from '@/utils/passwordGenerator'
import { cn } from '@/lib/utils'

type RoleOption = { value: string; labelAr: string }

type Props = {
  open: boolean
  userId: number | null
  loading: boolean
  saving: boolean
  formName: string
  formEmail: string
  formRole: string
  formPhone: string
  formDepartment: string
  formCity: string
  formCountry: string
  formHow: string
  formStatus: 'active' | 'inactive' | 'preserve'
  pw: string
  pwConf: string
  editAvatarFile: File | null
  removeAvatar: boolean
  emailVerifiedAt?: string | null
  lastLoginAt?: string | null
  createdAt?: string | null
  roleOptions: RoleOption[]
  onClose: () => void
  onSubmit: () => void | Promise<void>
  onFormName: (v: string) => void
  onFormEmail: (v: string) => void
  onFormRole: (v: string) => void
  onFormPhone: (v: string) => void
  onFormDepartment: (v: string) => void
  onFormCity: (v: string) => void
  onFormCountry: (v: string) => void
  onFormHow: (v: string) => void
  onFormStatus: (v: 'active' | 'inactive' | 'preserve') => void
  onPw: (v: string) => void
  onPwConf: (v: string) => void
  onEditAvatarFile: (f: File | null) => void
  onRemoveAvatar: (v: boolean) => void
}

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-[#22334A] outline-none transition focus:border-[#2691C2]/45 focus:ring-4 focus:ring-[#2691C2]/10'

export function UserEditDrawer({
  open,
  userId,
  loading,
  saving,
  formName,
  formEmail,
  formRole,
  formPhone,
  formDepartment,
  formCity,
  formCountry,
  formHow,
  formStatus,
  pw,
  pwConf,
  editAvatarFile,
  removeAvatar,
  emailVerifiedAt,
  lastLoginAt,
  createdAt,
  roleOptions,
  onClose,
  onSubmit,
  onFormName,
  onFormEmail,
  onFormRole,
  onFormPhone,
  onFormDepartment,
  onFormCity,
  onFormCountry,
  onFormHow,
  onFormStatus,
  onPw,
  onPwConf,
  onEditAvatarFile,
  onRemoveAvatar,
}: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPw, setShowPw] = useState(false)
  const [showPwConf, setShowPwConf] = useState(false)

  useEffect(() => {
    if (!open) {
      setErrors({})
      setShowPw(false)
      setShowPwConf(false)
    }
  }, [open, userId])

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!formName.trim()) next.name = 'الاسم مطلوب'
    if (!formEmail.trim()) next.email = 'البريد مطلوب'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.trim())) next.email = 'صيغة البريد غير صحيحة'
    const pwTrim = pw.trim()
    const pwcTrim = pwConf.trim()
    if (pwTrim && pwTrim.length < 8) next.password = 'كلمة المرور 8 أحرف على الأقل'
    if (pwTrim && pwTrim !== pwcTrim) next.password_confirmation = 'التأكيد غير متطابق'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    void onSubmit()
  }

  function genPassword() {
    const next = generateSecurePassword()
    onPw(next)
    onPwConf(next)
    toast.message('تم توليد كلمة مرور — راجع قبل الحفظ')
  }

  const metaLine = useMemo(() => {
    const bits: string[] = []
    if (createdAt) bits.push(`انضم ${formatDate(createdAt)}`)
    if (lastLoginAt) bits.push(`آخر دخول ${formatRelativeDate(lastLoginAt)}`)
    if (emailVerifiedAt) bits.push(`موثّق ${formatRelativeDate(emailVerifiedAt)}`)
    return bits.join(' · ')
  }, [createdAt, lastLoginAt, emailVerifiedAt])

  return (
    <CrudDrawer
      open={open}
      title="تحرير المستخدم"
      subtitle={userId ? `معرّف #${userId}` : undefined}
      onClose={onClose}
      widthClassName="max-w-xl sm:max-w-2xl"
      footerSlot={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold text-slate-400">PUT /admin/users/{'{id}'}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              form="user-edit-form"
              disabled={saving || loading}
              className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl bg-[#22334A] px-5 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {saving ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
            </button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#2691C2]" aria-hidden />
          <p className="text-[13px] font-semibold text-slate-500">جارٍ تحميل بيانات المستخدم…</p>
        </div>
      ) : (
        <form id="user-edit-form" onSubmit={handleSubmit} className="space-y-5">
          {metaLine ? (
            <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] font-semibold text-slate-500">
              {metaLine}
            </p>
          ) : null}

          <Section title="البيانات التعريفية" icon={UserCircle2}>
            <Field label="الاسم الكامل" error={errors.name}>
              <input value={formName} onChange={(e) => onFormName(e.target.value)} className={INPUT} />
            </Field>
            <Field label="البريد الإلكتروني" error={errors.email}>
              <input type="email" value={formEmail} onChange={(e) => onFormEmail(e.target.value)} className={INPUT} dir="ltr" />
            </Field>
          </Section>

          <Section title="الاتصال والتنظيم" icon={Users}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الجوال">
                <input value={formPhone} onChange={(e) => onFormPhone(e.target.value)} className={INPUT} dir="ltr" />
              </Field>
              <Field label="القسم / الإدارة">
                <input value={formDepartment} onChange={(e) => onFormDepartment(e.target.value)} className={INPUT} />
              </Field>
              <Field label="المدينة">
                <input value={formCity} onChange={(e) => onFormCity(e.target.value)} className={INPUT} />
              </Field>
              <Field label="الدولة">
                <input value={formCountry} onChange={(e) => onFormCountry(e.target.value)} className={INPUT} />
              </Field>
            </div>
            <Field label="كيف عرفتم المنصّة؟">
              <input value={formHow} onChange={(e) => onFormHow(e.target.value)} className={INPUT} />
            </Field>
          </Section>

          <Section title="الدور والصلاحيات" icon={ShieldCheck}>
            <Field label="الدور">
              <select value={formRole} onChange={(e) => onFormRole(e.target.value)} className={INPUT}>
                {roleOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.labelAr}</option>
                ))}
              </select>
            </Field>
            <p className="text-[11px] font-semibold text-slate-400">
              الدور الحالي: {adminRoleLabelAr(formRole)}
            </p>
          </Section>

          <Section title="حالة الحساب والأمان" icon={Shield}>
            <Field label="حالة الحساب">
              <select
                value={formStatus}
                onChange={(e) => onFormStatus(e.target.value as typeof formStatus)}
                className={INPUT}
              >
                <option value="preserve">بدون تغيير</option>
                <option value="active">نشط</option>
                <option value="inactive">موقوف</option>
              </select>
            </Field>

            <Field label="صورة الملف (اختياري)">
              <input
                type="file"
                accept="image/*"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] file:me-3 file:rounded-lg file:border-0 file:bg-[#2691C2] file:px-3 file:py-2 file:text-[11px] file:font-black file:text-white"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  onEditAvatarFile(f)
                  if (f) onRemoveAvatar(false)
                }}
              />
              <label className="mt-2 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={removeAvatar}
                  disabled={Boolean(editAvatarFile)}
                  onChange={(e) => onRemoveAvatar(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-[12px] font-medium text-slate-600">إزالة الصورة الحالية</span>
              </label>
            </Field>

            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[12px] font-black text-[#22334A]">كلمة مرور جديدة (اختياري)</p>
                <button
                  type="button"
                  onClick={genPassword}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2691C2]/10 px-2.5 py-1 text-[10px] font-black text-[#1a6b96]"
                >
                  <Sparkles className="h-3 w-3" aria-hidden />
                  توليد
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="كلمة المرور" error={errors.password}>
                  <PasswordInput value={pw} onChange={onPw} show={showPw} onToggle={() => setShowPw((s) => !s)} />
                </Field>
                <Field label="تأكيد كلمة المرور" error={errors.password_confirmation}>
                  <PasswordInput value={pwConf} onChange={onPwConf} show={showPwConf} onToggle={() => setShowPwConf((s) => !s)} />
                </Field>
              </div>
            </div>
          </Section>
        </form>
      )}
    </CrudDrawer>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Mail; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-black/[0.03]">
      <div className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-l from-[#22334A]/[0.04] to-transparent px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#2691C2]/10 text-[#2691C2]">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <h3 className="text-[13px] font-black text-[#22334A]">{title}</h3>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-right">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</span>
      {children}
      {error ? <p className="mt-1.5 text-[11px] font-bold text-rose-600">{error}</p> : null}
    </label>
  )
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(INPUT, 'pe-10')}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:text-[#22334A]"
        aria-label={show ? 'إخفاء' : 'إظهار'}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export type { UpdateAdminUserInput }
