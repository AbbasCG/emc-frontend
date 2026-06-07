import { useEffect, useMemo, useState, type ReactNode } from 'react'
import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BadgeCheck,
  Loader2,
  Lock,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  XCircle,
} from 'lucide-react'
import toast, { loadingToast, successToast, errorToast } from '@/lib/toast'
import {
  deleteOwnProfile,
  deleteProfileAvatar,
  fetchProfileUser,
  updateProfile,
  uploadProfileAvatar,
} from '@/api/profileApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { useAuth } from '@/contexts/AuthContext'
import { UserAvatar } from '@/components/UserAvatar'
import type { User } from '@/types'
import { AR_UNSPECIFIED, dispAr } from '@/utils/dispAr'
import { normalizeRole } from '@/utils/dashboardAccess'
import { getUserDisplayEmail, getUserDisplayName, getUserInitials } from '@/utils/userIdentity'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function mergeFromSession(apiU: User | null, authU: User | null): User {
  const idFromApi = apiU && apiU.id > 0 ? apiU.id : null
  const idFromAuth = authU && authU.id > 0 ? authU.id : null
  const resolvedIdRaw = idFromApi ?? idFromAuth ?? 0
  const resolvedId = Number.isFinite(Number(resolvedIdRaw)) ? Math.trunc(Number(resolvedIdRaw)) : 0

  const pickName = apiU && apiU.name && apiU.name !== '—' ? apiU.name : authU?.name
  const pickEmail = apiU && apiU.email && apiU.email !== '—' ? apiU.email : authU?.email

  const mergedRole =
    [apiU?.role, authU?.role].map((r) => (r == null ? '' : String(r).trim())).find((s) => s !== '') ??
    undefined

  return {
    id: resolvedId > 0 ? resolvedId : 0,
    name: pickName ?? '—',
    email: pickEmail ?? '—',
    phone: apiU?.phone ?? authU?.phone,
    city: apiU?.city ?? authU?.city,
    country: apiU?.country ?? authU?.country,
    gender: apiU?.gender ?? authU?.gender,
    department: apiU?.department ?? authU?.department,
    how_did_you_hear_about_us: apiU?.how_did_you_hear_about_us ?? authU?.how_did_you_hear_about_us,
    avatar_url: apiU?.avatar_url ?? authU?.avatar_url,
    email_verified_at: apiU?.email_verified_at ?? authU?.email_verified_at,
    role: mergedRole,
  }
}

export default function ProfilePage() {
  const { user: authUser, refreshUser, logout } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [howHeard, setHowHeard] = useState('')

  const [saving, setSaving] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePhrase, setDeletePhrase] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    fetchProfileUser()
      .then((u) => {
        if (!alive) return
        setProfile(u)
        setError(false)
      })
      .catch(() => {
        if (!alive) return
        setProfile(null)
        setError(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const merged = useMemo(() => mergeFromSession(profile, authUser ?? null), [profile, authUser])

  useEffect(() => {
    setName((merged.name && merged.name !== '—' ? merged.name : '').trim())
    setEmail(getUserDisplayEmail(merged) || '')
    setEmailTouched(false)
    setPhone((merged.phone ?? '').toString())
    setCity((merged.city ?? '').toString())
    setCountry((merged.country ?? '').toString())
    setHowHeard((merged.how_did_you_hear_about_us ?? '').toString())
  }, [merged.id, merged.name, merged.email, merged.phone, merged.city, merged.country, merged.how_did_you_hear_about_us])

  const roleSlug = normalizeRole(authUser?.role ?? null)
  const hideSelfDeleteSuper = roleSlug === 'super_admin'
  const displayTitle = getUserDisplayName(merged)
  const emailValid = emailPattern.test(email.trim())
  const initials = getUserInitials(merged)

  async function onSaveProfile() {
    const mail = email.trim()
    if (!mail) {
      toast.warning('البريد الإلكتروني مطلوب.')
      return
    }
    if (!emailPattern.test(mail)) {
      toast.warning('صيغة البريد الإلكتروني غير صحيحة.')
      return
    }

    setSaving(true)
    const tid = loadingToast('جاري حفظ الملف الشخصي...')
    try {
      const payload = {
        name: name.trim() || undefined,
        email: mail,
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        how_did_you_hear_about_us: howHeard.trim() || undefined,
      }
      const next = await updateProfile(payload)
      setProfile(next)
      await refreshUser()
      successToast('تم حفظ الملف الشخصي', tid)
      if (emailTouched) {
        toast.message('سيتم طلب تأكيد البريد الإلكتروني الجديد إذا لزم الأمر')
      }
    } catch (e) {
      errorToast(getApiErrorMessage(e), tid)
    } finally {
      setSaving(false)
    }
  }

  async function onPickAvatar(file: File | undefined) {
    if (!file) return
    setAvatarBusy(true)
    const tid = loadingToast('جاري رفع الصورة...')
    try {
      const next = await uploadProfileAvatar(file)
      setProfile(next)
      await refreshUser()
      successToast('تم تحديث صورة الملف', tid)
    } catch (e) {
      errorToast(getApiErrorMessage(e), tid)
    } finally {
      setAvatarBusy(false)
    }
  }

  async function onRemoveAvatar() {
    setAvatarBusy(true)
    const tid = loadingToast('جاري إزالة الصورة...')
    try {
      const next = await deleteProfileAvatar()
      setProfile(next)
      await refreshUser()
      successToast('تمت إزالة الصورة', tid)
    } catch {
      toast.warning('لم يعرّف الخادم مسارًا لإزالة الصورة، أو لا تتوفر هذه الميزة.')
      toast.dismiss(tid)
    } finally {
      setAvatarBusy(false)
    }
  }

  async function onConfirmDelete() {
    if (deletePhrase.trim() !== 'تأكيد الحذف') {
      toast.warning('اكتب عبارة التأكيد بالضبط')
      return
    }
    setDeleteBusy(true)
    try {
      await deleteOwnProfile()
      toast.success('تم حذف الحساب')
      setDeleteOpen(false)
      logout()
    } catch (e) {
      if (axios.isAxiosError(e) && (e.response?.status === 403 || e.response?.status === 405)) {
        toast.error(
          typeof e.response?.data === 'object' &&
          e.response.data &&
          'message' in e.response.data &&
          typeof (e.response.data as { message: unknown }).message === 'string' ?
            (e.response.data as { message: string }).message
          : 'لا يمكن حذف هذا الحساب من الواجهة الحالية وفق سياسة الخادم.',
        )
      } else toast.error(getApiErrorMessage(e))
    } finally {
      setDeleteBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center text-right" dir="rtl">
        <div className="flex flex-col items-center gap-3 rounded-[1.65rem] border border-deepBlue/[0.06] bg-white px-10 py-12 shadow-xl ring-1 ring-white">
          <Loader2 className="h-11 w-11 animate-spin text-customBlue" aria-hidden />
          <p className="text-sm font-black text-deepBlue">جاري تجهيز ملفّك الشخصي…</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div layout className="space-y-8 text-right" dir="rtl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {error ?
        <div className="rounded-[1.25rem] border border-amber-200/90 bg-gradient-to-bl from-amber-50 to-white px-5 py-3 text-sm font-bold text-amber-950 shadow-sm ring-1 ring-amber-100">
          تعذّر قراءة `/profile` — يُكمَل النموذج من الجلسة الحالية حيثما أمكن.
        </div>
      : null}

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-deepBlue/[0.06] pb-6">
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-customBlue/20 bg-customBlue/[0.07] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-deepBlue ring-1 ring-white"
          >
            <Sparkles className="size-3.5 text-customOrange" aria-hidden />
            مركز حساب المتعلّم EMC
          </motion.div>
          <h1 className="mt-4 text-[1.85rem] font-black leading-tight tracking-tight text-deepBlue md:text-[2rem]">
            الملف الشخصي
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
            حدّث بيانات الظهور والتواصل وبريد الدخول. تنعكس الصورة الجديدة مباشرة في الشريط والقائمة دون تحديث كامل للصفحة.
          </p>
        </div>
      </header>

      <div className="grid gap-7 lg:grid-cols-12 lg:gap-10">
        {/* Profile card */}
        <motion.aside
          layout
          className="lg:col-span-4 xl:col-span-3"
          transition={{ duration: 0.35 }}
        >
          <div className="sticky top-6 space-y-5 rounded-[1.85rem] border border-deepBlue/[0.07] bg-gradient-to-bl from-deepBlue/[0.03] via-white to-orange-500/[0.04] p-6 shadow-[0_20px_50px_-24px_rgba(15,42,67,0.18)] ring-1 ring-white">
            <div className="relative mx-auto w-fit">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-customBlue/40 via-customOrange/25 to-deepBlue/30 blur-xl opacity-80" aria-hidden />
              <UserAvatar
                user={merged.id > 0 ? merged : null}
                className="relative mx-auto grid h-[7.75rem] w-[7.75rem] rounded-full bg-deepBlue/[0.9] text-[1.85rem] text-white shadow-xl ring-[6px] ring-white"
                textClassName="text-[1.85rem] font-black text-white"
              />
            </div>

            <div className="text-center">
              <p className="text-lg font-black text-deepBlue">{displayTitle}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500 font-latin" dir="ltr">
                {getUserDisplayEmail(merged) || initials}
              </p>
              {merged.role ?
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-deepBlue/[0.08] bg-white/90 px-3 py-1 text-[11px] font-black text-deepBlue shadow-inner">
                  <Shield className="size-3.5 text-customOrange" aria-hidden />
                  {String(merged.role)}
                </span>
              : null}
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[1.1rem] border border-deepBlue/[0.1] bg-white/90 px-4 py-2.5 text-xs font-black text-deepBlue shadow-sm transition hover:border-customBlue/35">
              <Upload className="size-4 text-customOrange" aria-hidden />
              تغيير الصورة الشخصية
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={avatarBusy}
                onChange={(e) => void onPickAvatar(e.target.files?.[0])}
              />
            </label>

            {(merged.avatar_url && String(merged.avatar_url).trim() !== '') || avatarBusy ?
              <button
                type="button"
                disabled={avatarBusy || !merged.avatar_url}
                onClick={() => void onRemoveAvatar()}
                className="flex w-full items-center justify-center gap-2 rounded-[1.1rem] border border-slate-200/90 bg-white/80 px-4 py-2 text-xs font-black text-slate-600 hover:border-red-200 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40"
              >
                <XCircle className="size-4" aria-hidden />
                إزالة الصورة
              </button>
            : null}

            {avatarBusy ?
              <p className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-500">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                مزامنة مع الخادم…
              </p>
            : null}

            <div className="rounded-[1.15rem] border border-deepBlue/[0.06] bg-white/[0.65] px-4 py-3 text-[11px] font-semibold leading-relaxed text-slate-600">
              معرّف المستخدم:&nbsp;
              <span className="font-black text-deepBlue font-latin">{merged.id > 0 ? merged.id : AR_UNSPECIFIED}</span>
            </div>
          </div>
        </motion.aside>

        {/* Forms & sections */}
        <div className="min-w-0 space-y-6 lg:col-span-8 xl:col-span-9">
          <motion.section
            layout
            className="rounded-[1.65rem] border border-deepBlue/[0.06] bg-white p-6 shadow-[0_16px_40px_-20px_rgba(15,42,67,0.14)] ring-1 ring-deepBlue/[0.03] sm:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-deepBlue/[0.055] pb-5">
              <h2 className="text-[1.05rem] font-black text-deepBlue">البيانات الأساسية</h2>
              <BadgeCheck className="size-[1.15rem] text-customBlue opacity-85" aria-hidden />
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <PremiumInput label="الاسم الكامل" value={name} onChange={setName} hint={dispAr(merged.name)} />
              <PremiumInput
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={(v) => {
                  setEmailTouched(true)
                  setEmail(v)
                }}
                dir="ltr"
              />
              {!email.trim() ? <p className="text-[11px] font-bold text-amber-800 md:col-span-2">البريد مطلوب.</p> : null}
              {email.trim() && !emailValid ?
                <p className="text-[11px] font-bold text-amber-800 md:col-span-2">صيغة البريد غير سليمة.</p>
              : null}

              <PremiumInput label="رقم الجوال" value={phone} onChange={setPhone} dir="ltr" hint={dispAr(merged.phone)} />
              <PremiumInput label="المدينة" value={city} onChange={setCity} hint={dispAr(merged.city)} />
              <PremiumInput label="الدولة" value={country} onChange={setCountry} hint={dispAr(merged.country)} />
              <PremiumInput
                label="كيف عرفت عنا؟"
                value={howHeard}
                onChange={setHowHeard}
                className="md:col-span-2"
                hint={dispAr(merged.how_did_you_hear_about_us)}
              />
            </div>

            <p className="mt-6 rounded-[1.05rem] border border-sky-200/85 bg-sky-50/90 px-4 py-3 text-[12px] font-semibold leading-relaxed text-sky-950">
              عند تغيير عنوان البريد، قد ترسل المنصّة رسالة تأكيد — لن يُفعَّل البريد الجديد وفق بعض السياسات إلا بعد
              الموافقة.
              <span className="mt-2 block font-black text-deepBlue">
                سيتم طلب تأكيد البريد الإلكتروني الجديد إذا لزم الأمر
              </span>
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={saving || !emailValid}
                onClick={() => void onSaveProfile()}
                className="inline-flex items-center gap-2 rounded-[1.05rem] bg-gradient-to-l from-deepBlue to-customBlue px-8 py-3 text-sm font-black text-white shadow-lg shadow-deepBlue/[0.18] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving ?
                  <>
                    <Loader2 className="size-5 animate-spin" aria-hidden /> جاري الحفظ…
                  </>
                : 'حفظ التعديلات'}
              </motion.button>
            </div>
          </motion.section>

          <motion.section
            layout
            className="rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.95] p-6 shadow-md ring-1 ring-white sm:p-8"
          >
            <div className="flex items-center gap-2 border-b border-deepBlue/[0.055] pb-4">
              <Lock className="size-[1.05rem] text-deepBlue/65" aria-hidden />
              <h2 className="text-[1.05rem] font-black text-deepBlue">حالة الحساب والأمان</h2>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.1rem] border border-deepBlue/[0.06] bg-[#FAFCFF] px-4 py-3">
                <dt className="text-[11px] font-black uppercase tracking-wide text-slate-500">البريد</dt>
                <dd className="mt-1 break-all font-mono text-[13px] font-bold text-deepBlue" dir="ltr">
                  {getUserDisplayEmail(merged) || AR_UNSPECIFIED}
                </dd>
              </div>
              <div className="rounded-[1.1rem] border border-deepBlue/[0.06] bg-[#FAFCFF] px-4 py-3">
                <dt className="text-[11px] font-black uppercase tracking-wide text-slate-500">التأكيد</dt>
                <dd className="mt-1 text-[13px] font-bold text-deepBlue">
                  {merged.email_verified_at ? <>موثّق — <span dir="ltr" className="font-mono text-xs">{merged.email_verified_at}</span></> : 'غير موثّق'}
                </dd>
              </div>
              <div className="rounded-[1.1rem] border border-deepBlue/[0.06] bg-[#FAFCFF] px-4 py-3">
                <dt className="text-[11px] font-black uppercase tracking-wide text-slate-500">رقم الحساب</dt>
                <dd className="mt-1 font-mono text-[13px] font-black text-deepBlue">{merged.id > 0 ? merged.id : AR_UNSPECIFIED}</dd>
              </div>
              <div className="rounded-[1.1rem] border border-deepBlue/[0.06] bg-[#FAFCFF] px-4 py-3">
                <dt className="text-[11px] font-black uppercase tracking-wide text-slate-500">الدور</dt>
                <dd className="mt-1 text-[13px] font-bold text-deepBlue">{dispAr(merged.role as string | undefined)}</dd>
              </div>
            </dl>
          </motion.section>

          <motion.section layout className="rounded-[1.65rem] border border-red-400/25 bg-gradient-to-bl from-red-50/[0.9] via-white to-white p-6 shadow-inner ring-1 ring-red-100/90 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="mt-1 grid size-11 shrink-0 place-items-center rounded-2xl border border-red-200/95 bg-white shadow-sm">
                <Trash2 className="size-5 text-red-600/90" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[1.1rem] font-black text-red-950">حذف الحساب وفق سياسات الخصوصية</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-red-950/95">
                  يمكنك طلب حذف حسابك وبياناتك الشخصية وفق سياسات الخصوصية. يتم التحقق من العبارة قبل المتابعة.
                </p>
                {hideSelfDeleteSuper ?
                  <p className="mt-4 rounded-xl border border-red-200/80 bg-white/90 px-4 py-3 text-[12px] font-bold leading-relaxed text-red-900">
                    يُدار حذف الحسابات ذات دور المشرف الأعلى وفق آليات مختلفة خارج هذه الشاشة.
                  </p>
                : (
                  <button
                    type="button"
                    onClick={() => {
                      setDeletePhrase('')
                      setDeleteOpen(true)
                    }}
                    className="mt-5 inline-flex items-center gap-2 rounded-[1.05rem] border border-red-300/95 bg-white px-5 py-2.5 text-sm font-black text-red-900 shadow-md transition hover:bg-red-50"
                  >
                    حذف حسابي
                  </button>
                )}
              </div>
            </div>
          </motion.section>
        </div>
      </div>

      <AnimatePresence>
        {deleteOpen ?
          <motion.div
            role="presentation"
            className="fixed inset-0 z-50 grid place-items-center bg-deepBlue/[0.48] p-4 backdrop-blur-md"
            dir="rtl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setDeleteOpen(false)
            }}
          >
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-[26rem] overflow-hidden rounded-[1.85rem] border border-deepBlue/[0.08] bg-white text-right shadow-2xl"
            >
              <div className="border-b border-deepBlue/[0.06] bg-gradient-to-bl from-deepBlue/[0.04] to-white px-6 py-5">
                <UserRound className="mb-3 size-8 text-deepBlue/70" aria-hidden />
                <h3 className="text-lg font-black text-deepBlue">تأكيد حذف الحساب نهائيًا</h3>
                <p className="mt-3 text-[13px] font-semibold leading-relaxed text-slate-600">
                  قد يكون الإجراء نهائيًا. اكتب حرفًا بحرف:&nbsp;
                  <span className="font-black text-deepBlue">تأكيد الحذف</span>
                </p>
              </div>
              <div className="space-y-4 px-6 py-6">
                <input
                  value={deletePhrase}
                  onChange={(e) => setDeletePhrase(e.target.value)}
                  placeholder="تأكيد الحذف"
                  className="w-full rounded-[1.05rem] border border-deepBlue/[0.1] px-4 py-3 text-sm font-bold outline-none ring-2 ring-transparent transition focus:border-red-400/55 focus:ring-red-400/14"
                  autoComplete="off"
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-[1rem] border border-deepBlue/[0.1] bg-white px-5 py-2.5 text-sm font-black text-deepBlue hover:bg-deepBlue/[0.03]"
                    disabled={deleteBusy}
                    onClick={() => setDeleteOpen(false)}
                  >
                    تراجع
                  </button>
                  <button
                    type="button"
                    disabled={deleteBusy || deletePhrase.trim() !== 'تأكيد الحذف'}
                    onClick={() => void onConfirmDelete()}
                    className="inline-flex items-center gap-2 rounded-[1rem] bg-gradient-to-l from-red-600 to-red-700 px-5 py-2.5 text-sm font-black text-white disabled:opacity-45"
                  >
                    {deleteBusy ?
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden /> جاري تنفيذ…
                      </>
                    : 'إزالة الحساب'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        : null}
      </AnimatePresence>
    </motion.div>
  )
}

function PremiumInput({
  label,
  value,
  onChange,
  hint,
  type = 'text',
  dir,
  className,
  suffix,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
  type?: string
  dir?: 'rtl' | 'ltr'
  className?: string
  suffix?: ReactNode
}) {
  return (
    <label className={`block space-y-1.5 rtl:text-right ${className ?? ''}`}>
      <span className="flex items-center justify-between gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
        {hint ?
          <span className="text-[10px] font-semibold lowercase text-slate-400">{hint}</span>
        : null}
      </span>
      <span className="relative flex rounded-[1.1rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
        <input
          type={type}
          dir={dir}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-13 w-full min-h-[3.125rem] flex-1 rounded-[1.1rem] border border-deepBlue/[0.08] bg-white/[0.92] px-4 py-3 text-[14px] font-semibold outline-none ring-2 ring-transparent transition focus:border-customBlue/45 focus:ring-customBlue/15 ${dir === 'ltr' ? 'text-left placeholder:text-gray-400' : ''}`}
        />
        {suffix ?
          <span className="pointer-events-none absolute start-4 top-1/2 flex -translate-y-1/2">{suffix}</span>
        : null}
      </span>
    </label>
  )
}
