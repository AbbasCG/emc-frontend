import { useEffect, useMemo, useState } from 'react'
import { Shield, UserRound } from 'lucide-react'
import { fetchProfileUser } from '@/api/profileApi'
import { useAuth } from '@/contexts/AuthContext'
import type { User } from '@/types'

function fieldStr(v: string | null | undefined): string {
  if (v == null) return '—'
  const s = String(v).trim()
  return s === '' ? '—' : s
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
    name: fieldStr(pickName),
    email: fieldStr(pickEmail),
    phone: trimOpt(apiU?.phone ?? authU?.phone),
    city: trimOpt(apiU?.city ?? authU?.city),
    gender: trimOpt(apiU?.gender ?? authU?.gender),
    role: mergedRole,
  }
}

function trimOpt(v: string | null | undefined): string | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  return s === '' ? undefined : s
}

function Detail({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-deepBlue/[0.06] bg-white/[0.65] px-4 py-3 text-right shadow-sm ring-1 ring-white">
      <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm font-bold text-deepBlue">{value}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { user: authUser } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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

  const roleDisplay = merged.role ? String(merged.role) : '—'

  if (loading) {
    return (
      <div className="space-y-6 text-right" dir="rtl">
        <p className="text-sm font-bold text-slate-500">جاري تحميل الملف الشخصي...</p>
        <div className="flex min-h-[12rem] items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-deepBlue/[0.06]">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-customBlue border-t-transparent"
            aria-hidden
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {error && (
        <div className="rounded-2xl border border-amber-200/95 bg-amber-50 px-5 py-3 text-sm font-black leading-relaxed text-amber-900 ring-1 ring-amber-100">
          تعذر تحميل بيانات الملف الشخصي
          {authUser ? '؛ يُعرض أدناه ما هو متاح من جلستك الحالية.' : '.'}
        </div>
      )}

      <h1 className="text-xl font-black text-deepBlue sm:text-2xl">
        {error && authUser ? 'الملف الشخصي — عرض من الجلسة' : 'الملف الشخصي'}
      </h1>

      <div className="flex flex-col gap-8 rounded-[1.35rem] border border-deepBlue/[0.06] bg-gradient-to-bl from-customBlue/[0.06] via-white to-orange-50/40 p-6 shadow-md ring-1 ring-white md:flex-row-reverse md:items-start md:p-10">
        <div className="mx-auto flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-deepBlue/[0.88] text-4xl font-black text-white shadow-lg ring-[6px] ring-white md:mx-0">
          {merged.name && merged.name !== '—' ?
            merged.name.charAt(0)
          : <UserRound className="size-14 opacity-95" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-2xl font-black tracking-tight text-deepBlue">{merged.name}</p>
          <p className="text-sm font-semibold leading-relaxed text-slate-600">{merged.email}</p>
          {merged.role ?
            <p className="inline-flex items-center gap-2 rounded-full border border-customBlue/[0.2] bg-white/80 px-3 py-1 text-xs font-black text-deepBlue ring-1 ring-white">
              <Shield className="size-3.5 text-customOrange" aria-hidden />
              الدور: {roleDisplay}
            </p>
          : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Detail label="الاسم" value={merged.name} />
        <Detail label="البريد" value={merged.email} />
        <Detail label="الدور" value={roleDisplay} />
        <Detail label="رقم المعرف" value={merged.id > 0 ? String(merged.id) : '—'} />
        <Detail label="الهاتف" value={fieldStr(merged.phone)} />
        <Detail label="المدينة" value={fieldStr(merged.city)} />
        <Detail label="النوع" value={fieldStr(merged.gender)} />
      </div>
    </div>
  )
}
