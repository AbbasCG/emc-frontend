import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BadgeCheck,
  BookOpen,
  Camera,
  Loader2,
  Lock,
  Shield,
  Trash2,
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

const ROLE_LABELS: Record<string, string> = {
  student: 'طالب',
  teacher: 'مدرب',
  instructor: 'مدرب',
  admin: 'مشرف',
  super_admin: 'مشرف أعلى',
  partner: 'شريك',
  volunteer: 'متطوع',
}

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
    instructor_bio: apiU?.instructor_bio ?? authU?.instructor_bio,
    avatar_url: apiU?.avatar_url ?? authU?.avatar_url,
    email_verified_at: apiU?.email_verified_at ?? authU?.email_verified_at,
    role: mergedRole,
  }
}

function isInstructor(role: string | null | undefined): boolean {
  return role === 'teacher' || role === 'instructor'
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
  const [instructorBio, setInstructorBio] = useState('')

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
    setInstructorBio((merged.instructor_bio ?? '').toString())
  }, [merged.id, merged.name, merged.email, merged.phone, merged.city, merged.country, merged.instructor_bio])

  const roleSlug = normalizeRole(authUser?.role ?? null)
  const isInstructorUser = isInstructor(authUser?.role ?? merged.role)
  const hideSelfDeleteSuper = roleSlug === 'super_admin'
  const displayTitle = getUserDisplayName(merged)
  const emailValid = emailPattern.test(email.trim())
  const initials = getUserInitials(merged)
  const roleLabel = ROLE_LABELS[String(merged.role ?? '')] ?? String(merged.role ?? '')

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
      const payload: Parameters<typeof updateProfile>[0] = {
        name: name.trim() || undefined,
        email: mail,
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
      }
      if (isInstructorUser) {
        payload.instructor_bio = instructorBio.trim() || null
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
      <div className="flex min-h-[20rem] items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#0C2A4B]/[0.06] bg-white px-12 py-14 shadow-xl">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-4 border-[#0077B6]/20 border-t-[#0077B6] animate-spin" />
          </div>
          <p className="text-sm font-bold text-[#0C2A4B]/70">جاري تجهيز ملفّك الشخصي…</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      layout
      className="space-y-6 text-right"
      dir="rtl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {error ?
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900">
          تعذّر قراءة بيانات الملف الشخصي — يُكمَل النموذج من الجلسة الحالية.
        </div>
      : null}

      {/* Page header */}
      <div className="border-b border-[#0C2A4B]/[0.07] pb-5">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0077B6]">EMC — مركز التعلم</p>
        <h1 className="mt-2 text-[1.75rem] font-black leading-tight tracking-tight text-[#0C2A4B]">
          الملف الشخصي
        </h1>
        <p className="mt-1.5 text-sm font-medium text-slate-500">
          حدّث بياناتك الشخصية وإعدادات حسابك
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr]">
        {/* ── Sidebar: Avatar card ── */}
        <aside>
          <div className="sticky top-6 overflow-hidden rounded-2xl border border-[#0C2A4B]/[0.07] bg-white shadow-[0_8px_32px_-8px_rgba(12, 42, 75,0.12)]">
            {/* Header strip */}
            <div className="h-20 bg-gradient-to-l from-[#0C2A4B] to-[#0077B6]" />

            {/* Avatar */}
            <div className="-mt-10 flex flex-col items-center px-6 pb-6">
              <div className="relative">
                <UserAvatar
                  user={merged.id > 0 ? merged : null}
                  className="relative h-20 w-20 rounded-full border-[3px] border-white bg-[#0C2A4B] shadow-lg text-white"
                  textClassName="text-xl font-black text-white"
                />
                <label className="absolute -bottom-1 -left-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#0077B6] shadow-md transition hover:bg-[#0C2A4B] disabled:pointer-events-none">
                  <Camera className="h-3.5 w-3.5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={avatarBusy}
                    onChange={(e) => void onPickAvatar(e.target.files?.[0])}
                  />
                </label>
              </div>

              <div className="mt-4 text-center">
                <p className="text-base font-black text-[#0C2A4B]">{displayTitle}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-500 font-latin" dir="ltr">
                  {getUserDisplayEmail(merged) || initials}
                </p>
                {merged.role ?
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#0C2A4B]/[0.06] px-3 py-1 text-[11px] font-black text-[#0C2A4B]">
                    <Shield className="h-3 w-3 text-[#F28C00]" />
                    {roleLabel || String(merged.role)}
                  </span>
                : null}
              </div>

              <div className="mt-5 w-full space-y-2">
                {merged.avatar_url && String(merged.avatar_url).trim() !== '' ?
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => void onRemoveAvatar()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    إزالة الصورة
                  </button>
                : null}

                {avatarBusy ?
                  <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    مزامنة…
                  </p>
                : null}
              </div>

              <div className="mt-5 w-full rounded-xl border border-[#0C2A4B]/[0.06] bg-slate-50/80 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">معرّف الحساب</p>
                <p className="mt-0.5 font-mono text-sm font-black text-[#0C2A4B]">
                  {merged.id > 0 ? `#${merged.id}` : AR_UNSPECIFIED}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="min-w-0 space-y-5">

          {/* البيانات الأساسية */}
          <motion.section
            layout
            className="rounded-2xl border border-[#0C2A4B]/[0.07] bg-white shadow-[0_4px_24px_-6px_rgba(12, 42, 75,0.10)]"
          >
            <div className="flex items-center gap-3 border-b border-[#0C2A4B]/[0.06] px-6 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0077B6]/10">
                <BadgeCheck className="h-4 w-4 text-[#0077B6]" />
              </span>
              <h2 className="text-sm font-black text-[#0C2A4B]">البيانات الأساسية</h2>
            </div>

            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileInput
                  label="الاسم الكامل"
                  value={name}
                  onChange={setName}
                  placeholder="الاسم كما سيظهر في المنصة"
                />
                <ProfileInput
                  label="البريد الإلكتروني"
                  type="email"
                  value={email}
                  onChange={(v) => {
                    setEmailTouched(true)
                    setEmail(v)
                  }}
                  dir="ltr"
                  placeholder="example@domain.com"
                />

                {!email.trim() ?
                  <p className="text-xs font-semibold text-amber-700 sm:col-span-2">البريد الإلكتروني مطلوب.</p>
                : email.trim() && !emailValid ?
                  <p className="text-xs font-semibold text-amber-700 sm:col-span-2">صيغة البريد الإلكتروني غير سليمة.</p>
                : null}

                <ProfileInput label="رقم الجوال" value={phone} onChange={setPhone} dir="ltr" placeholder="+966 5X XXX XXXX" />
                <ProfileInput label="المدينة" value={city} onChange={setCity} placeholder={dispAr(merged.city) || 'الرياض'} />
                <ProfileInput
                  label="الدولة"
                  value={country}
                  onChange={setCountry}
                  placeholder={dispAr(merged.country) || 'المملكة العربية السعودية'}
                  className="sm:col-span-2"
                />
              </div>

              {emailTouched ?
                <p className="mt-4 rounded-xl border border-sky-200/80 bg-sky-50 px-4 py-2.5 text-xs font-semibold text-sky-900">
                  عند تغيير البريد الإلكتروني، قد تُرسَل رسالة تأكيد إلى العنوان الجديد.
                </p>
              : null}

              <div className="mt-6 flex gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={saving || !emailValid}
                  onClick={() => void onSaveProfile()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0C2A4B] px-6 py-2.5 text-sm font-black text-white shadow-md shadow-[#0C2A4B]/20 transition hover:bg-[#0077B6] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ?
                    <><Loader2 className="h-4 w-4 animate-spin" /> جاري الحفظ…</>
                  : 'حفظ التعديلات'}
                </motion.button>
              </div>
            </div>
          </motion.section>

          {/* نبذة عني — for instructors only */}
          {isInstructorUser ?
            <motion.section
              layout
              className="rounded-2xl border border-[#0C2A4B]/[0.07] bg-white shadow-[0_4px_24px_-6px_rgba(12, 42, 75,0.10)]"
            >
              <div className="flex items-center gap-3 border-b border-[#0C2A4B]/[0.06] px-6 py-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F28C00]/10">
                  <BookOpen className="h-4 w-4 text-[#F28C00]" />
                </span>
                <div>
                  <h2 className="text-sm font-black text-[#0C2A4B]">نبذة عني</h2>
                  <p className="text-[11px] font-medium text-slate-400">تظهر هذه النبذة للطلاب في صفحة تفاصيل الدورة.</p>
                </div>
              </div>

              <div className="p-6">
                <label className="block space-y-2">
                  <textarea
                    value={instructorBio}
                    onChange={(e) => setInstructorBio(e.target.value)}
                    rows={5}
                    maxLength={2000}
                    placeholder="اكتب نبذة قصيرة عن خبرتك ومجالاتك التعليمية..."
                    className="w-full resize-y rounded-xl border border-[#0C2A4B]/[0.08] bg-slate-50/80 px-4 py-3 text-sm font-semibold text-[#0C2A4B] outline-none ring-2 ring-transparent transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#0077B6]/40 focus:bg-white focus:ring-[#0077B6]/10"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">
                      {instructorBio.length} / 2000 حرف
                    </span>
                    {instructorBio.trim() ?
                      <span className="text-[11px] font-semibold text-emerald-700">
                        ✓ ستظهر هذه النبذة على صفحات الدورات التي تدرّسها
                      </span>
                    : null}
                  </div>
                </label>
              </div>
            </motion.section>
          : null}

          {/* حالة الحساب والأمان */}
          <motion.section
            layout
            className="rounded-2xl border border-[#0C2A4B]/[0.07] bg-white shadow-[0_4px_24px_-6px_rgba(12, 42, 75,0.10)]"
          >
            <div className="flex items-center gap-3 border-b border-[#0C2A4B]/[0.06] px-6 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0C2A4B]/[0.06]">
                <Lock className="h-4 w-4 text-[#0C2A4B]/60" />
              </span>
              <h2 className="text-sm font-black text-[#0C2A4B]">حالة الحساب والأمان</h2>
            </div>

            <div className="p-6">
              <dl className="grid gap-3 sm:grid-cols-2">
                <InfoCell label="البريد الإلكتروني" value={getUserDisplayEmail(merged) || AR_UNSPECIFIED} mono dir="ltr" />
                <InfoCell
                  label="حالة التأكيد"
                  value={merged.email_verified_at ? 'موثّق' : 'غير موثّق'}
                  accent={merged.email_verified_at ? 'green' : 'amber'}
                />
                <InfoCell label="رقم الحساب" value={merged.id > 0 ? `#${merged.id}` : AR_UNSPECIFIED} mono />
                <InfoCell label="نوع الحساب" value={roleLabel || dispAr(merged.role as string | undefined)} />
              </dl>
            </div>
          </motion.section>

          {/* حذف الحساب */}
          <motion.section
            layout
            className="rounded-2xl border border-red-200/60 bg-white shadow-[0_4px_24px_-6px_rgba(12, 42, 75,0.08)]"
          >
            <div className="flex items-center gap-3 border-b border-red-100/80 px-6 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50">
                <Trash2 className="h-4 w-4 text-red-600" />
              </span>
              <h2 className="text-sm font-black text-red-900">حذف الحساب</h2>
            </div>

            <div className="p-6">
              <p className="text-sm font-medium leading-relaxed text-red-900/80">
                يمكنك طلب حذف حسابك وبياناتك الشخصية. هذا الإجراء قد يكون نهائيًا وفق سياسة الخصوصية.
              </p>

              {hideSelfDeleteSuper ?
                <p className="mt-4 rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-xs font-semibold text-red-900">
                  يُدار حذف الحسابات ذات دور المشرف الأعلى وفق آليات مختلفة خارج هذه الشاشة.
                </p>
              :
                <button
                  type="button"
                  onClick={() => {
                    setDeletePhrase('')
                    setDeleteOpen(true)
                  }}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-black text-red-800 transition hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف حسابي
                </button>
              }
            </div>
          </motion.section>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteOpen ?
          <motion.div
            role="presentation"
            className="fixed inset-0 z-50 grid place-items-center bg-[#0F172A]/60 p-4 backdrop-blur-sm"
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
              transition={{ duration: 0.22 }}
              className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#0C2A4B]/[0.08] bg-white shadow-2xl"
            >
              <div className="border-b border-[#0C2A4B]/[0.06] px-6 py-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50">
                  <UserRound className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="mt-3 text-base font-black text-[#0C2A4B]">تأكيد حذف الحساب</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                  اكتب حرفًا بحرف للتأكيد:&nbsp;
                  <span className="font-black text-[#0C2A4B]">تأكيد الحذف</span>
                </p>
              </div>

              <div className="space-y-4 px-6 py-5">
                <input
                  value={deletePhrase}
                  onChange={(e) => setDeletePhrase(e.target.value)}
                  placeholder="تأكيد الحذف"
                  className="w-full rounded-xl border border-[#0C2A4B]/[0.08] bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
                  autoComplete="off"
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-[#0C2A4B]/10 bg-slate-50 px-5 py-2.5 text-sm font-black text-[#0C2A4B] transition hover:bg-slate-100"
                    disabled={deleteBusy}
                    onClick={() => setDeleteOpen(false)}
                  >
                    تراجع
                  </button>
                  <button
                    type="button"
                    disabled={deleteBusy || deletePhrase.trim() !== 'تأكيد الحذف'}
                    onClick={() => void onConfirmDelete()}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-40"
                  >
                    {deleteBusy ?
                      <><Loader2 className="h-4 w-4 animate-spin" /> جاري التنفيذ…</>
                    : 'حذف الحساب'}
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

function ProfileInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  dir,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  dir?: 'rtl' | 'ltr'
  className?: string
}) {
  return (
    <label className={`block space-y-1.5 ${className ?? ''}`}>
      <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type={type}
        dir={dir}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`h-11 w-full rounded-xl border border-[#0C2A4B]/[0.08] bg-slate-50/80 px-4 text-sm font-semibold text-[#0C2A4B] outline-none ring-2 ring-transparent transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#0077B6]/40 focus:bg-white focus:ring-[#0077B6]/10 ${dir === 'ltr' ? 'text-right' : ''}`}
      />
    </label>
  )
}

function InfoCell({
  label,
  value,
  mono,
  dir,
  accent,
}: {
  label: string
  value: string
  mono?: boolean
  dir?: 'ltr'
  accent?: 'green' | 'amber'
}) {
  const textColor =
    accent === 'green' ? 'text-emerald-700'
    : accent === 'amber' ? 'text-amber-700'
    : 'text-[#0C2A4B]'

  return (
    <div className="rounded-xl border border-[#0C2A4B]/[0.05] bg-slate-50/70 px-4 py-3">
      <dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`mt-1 break-all text-sm font-bold ${mono ? 'font-mono' : ''} ${textColor}`} dir={dir}>
        {value}
      </dd>
    </div>
  )
}

