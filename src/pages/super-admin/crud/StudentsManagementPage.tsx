import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import axios from 'axios'
import {
  Activity,
  Award,
  BadgeCheck,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  GraduationCap,
  Lock,
  Mail,
  MapPin,
  Mic,
  Phone,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import toast from '@/lib/toast'
import { ADMIN_USER_FORBIDDEN_AR, fetchAdminUsersPage, fetchStudentCourses, type AdminManagedUser, type StudentCourseRow } from '@/api/adminUsersApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { normalizeRole } from '@/utils/dashboardAccess'
import { SaGlassCard, SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import { DropdownPortal } from '@/components/ui/DropdownPortal'
import {
  AnimatedTabular,
  EnterpriseCrudHero,
  EnterpriseMetricTile,
} from '@/pages/super-admin/crud/shared/enterprise/EnterpriseMetrics'
import { EMC_CHART_PALETTE } from '@/pages/super-admin/crud/shared/enterprise/chartPrimitives'
import {
  EnterpriseColumnChart,
  EnterprisePieRadial,
} from '@/pages/super-admin/crud/shared/enterprise/charts'
import { ErrorPanel } from '@/pages/super-admin/crud/shared/States'

/* ─── helpers ─────────────────────────────────────────────────────────── */

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?'
}

function toDMY(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso.slice(0, 10)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
}

function genderAr(g: string | null | undefined): string | null {
  if (!g) return null
  const l = g.toLowerCase()
  if (l === 'male' || l === 'ذكر' || l === 'm') return 'ذكر'
  if (l === 'female' || l === 'أنثى' || l === 'f') return 'أنثى'
  return g
}

/* ─── types ───────────────────────────────────────────────────────────── */

type TabId = 'overview' | 'courses' | 'placement' | 'oral' | 'activity'

interface JourneyStep {
  id: string
  label: string
  done: boolean
  current?: boolean
  date?: string
  icon: ReactNode
}

/* ─── StudentCard ─────────────────────────────────────────────────────── */

function StudentCard({ u, idx, onSelect }: { u: AdminManagedUser; idx: number; onSelect: () => void }) {
  const active = u.is_active !== false
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.025, 0.4) }}
      className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#0077B6]/30 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        {u.avatar_url ? (
          <img src={u.avatar_url} alt={u.name} className="h-11 w-11 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-bl from-[#0C2A4B] to-[#0077B6] text-[13px] font-black text-white">
            {initials(u.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-black text-[#0C2A4B]">{u.name}</p>
          <p className="truncate text-[10px] font-semibold text-[#0C2A4B]/40">{u.email}</p>
        </div>
        <span className={`shrink-0 rounded-xl px-2 py-0.5 text-[9px] font-black ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
          {active ? 'نشط' : 'موقوف'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {u.city && (
          <span className="flex items-center gap-1 rounded-xl bg-slate-50 px-2 py-1 text-[9px] font-semibold text-slate-600">
            <MapPin className="h-3 w-3" />{u.city}
          </span>
        )}
        {u.phone && (
          <span className="flex items-center gap-1 rounded-xl bg-slate-50 px-2 py-1 text-[9px] font-semibold text-slate-600" dir="ltr">
            <Phone className="h-3 w-3" />{u.phone}
          </span>
        )}
        {u.gender && (
          <span className="rounded-xl bg-sky-50 px-2 py-1 text-[9px] font-semibold text-sky-600">
            {genderAr(u.gender) ?? u.gender}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] font-semibold tabular-nums text-slate-400">{toDMY(u.created_at)}</span>
        <button
          type="button"
          onClick={onSelect}
          className="rounded-xl border border-[#0077B6]/25 bg-[#0077B6]/[0.07] px-3 py-1.5 text-[10px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/[0.14]"
        >
          عرض الملف
        </button>
      </div>
    </motion.div>
  )
}

/* ─── StudentSearchDropdown ───────────────────────────────────────────── */

function StudentSearchDropdown({
  students, selected, onChange,
}: {
  students: AdminManagedUser[]
  selected: AdminManagedUser | null
  onChange: (s: AdminManagedUser | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const anchorRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const hits = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (t ? students.filter((s) => `${s.name} ${s.email} ${s.phone ?? ''}`.toLowerCase().includes(t)) : students).slice(0, 50)
  }, [students, q])

  // Collapse the dropdown during render when the route changes — react.dev
  // "adjusting state when a prop changes" (it already starts closed on mount).
  const [seenPath, setSeenPath] = useState(location.pathname)
  if (seenPath !== location.pathname) {
    setSeenPath(location.pathname)
    setOpen(false)
  }

  return (
    <div ref={anchorRef} className="relative w-full max-w-xl" dir="rtl">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setQ('') }}
        className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm transition hover:border-[#0077B6]/40 focus:outline-none"
      >
        {selected ? (
          <>
            {selected.avatar_url ? (
              <img src={selected.avatar_url} alt="" className="h-7 w-7 rounded-xl object-cover" />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-bl from-[#0C2A4B] to-[#0077B6] text-[10px] font-black text-white">
                {initials(selected.name)}
              </div>
            )}
            <div className="min-w-0 flex-1 text-right">
              <p className="truncate text-[12px] font-black text-[#0C2A4B]">{selected.name}</p>
              <p className="truncate text-[10px] font-semibold text-[#0C2A4B]/40">{selected.email}</p>
            </div>
            <X
              className="h-4 w-4 shrink-0 text-slate-400 hover:text-red-500"
              onClick={(e) => { e.stopPropagation(); onChange(null) }}
            />
          </>
        ) : (
          <>
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="flex-1 text-right text-[12px] font-semibold text-slate-400">اختر طالبًا لعرض التفاصيل</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? '-rotate-180' : ''}`} />
          </>
        )}
      </button>

      <DropdownPortal
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        align="stretch"
        offset={6}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.12 }}
        >
          <div className="p-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث بالاسم أو البريد..."
                dir="rtl"
                className="flex-1 bg-transparent text-[12px] font-semibold text-[#0C2A4B] outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto pb-2">
            {hits.length === 0 ? (
              <p className="py-6 text-center text-[12px] font-semibold text-slate-400">لا نتائج</p>
            ) : hits.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { onChange(s); setOpen(false) }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-right transition hover:bg-slate-50"
              >
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt="" className="h-8 w-8 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-bl from-[#0C2A4B]/80 to-[#0077B6]/80 text-[10px] font-black text-white">
                    {initials(s.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-black text-[#0C2A4B]">{s.name}</p>
                  <p className="truncate text-[10px] font-semibold text-[#0C2A4B]/45" dir="ltr">{s.email}</p>
                </div>
                <span className={`shrink-0 rounded-lg px-1.5 py-0.5 text-[9px] font-black ${s.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {s.is_active !== false ? 'نشط' : 'موقوف'}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </DropdownPortal>
    </div>
  )
}

/* ─── JourneyTimeline ─────────────────────────────────────────────────── */

function JourneyTimeline({ steps }: { steps: JourneyStep[] }) {
  return (
    <div className="relative">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <div key={step.id} className="relative flex gap-3">
            {!isLast && (
              <div
                className={`absolute right-[17px] top-9 z-0 w-0.5 ${step.done ? 'bg-[#0077B6]' : 'bg-slate-200'}`}
                style={{ height: 'calc(100% - 4px)' }}
              />
            )}
            <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
              step.done
                ? 'bg-[#0077B6] text-white shadow-sm'
                : step.current
                ? 'border-2 border-[#0077B6] bg-white text-[#0077B6]'
                : 'border border-slate-200 bg-slate-50 text-slate-400'
            }`}>
              {step.done ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
            </div>
            <div className="flex flex-1 flex-col justify-center pb-5">
              <p className={`text-[12px] font-black ${step.done ? 'text-[#0C2A4B]' : step.current ? 'text-[#0077B6]' : 'text-slate-400'}`}>
                {step.label}
              </p>
              {step.date && (
                <p className="mt-0.5 font-mono text-[10px] tabular-nums text-slate-400">{step.date}</p>
              )}
              {!step.done && !step.current && (
                <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-slate-300">
                  <Lock className="h-2.5 w-2.5" />
                  بانتظار إكمال المرحلة السابقة
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── InfoField ───────────────────────────────────────────────────────── */

function InfoField({ label, value, ltr }: { label: string; value: string | null | undefined; ltr?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <p className="mb-0.5 text-[10px] font-black text-[#0C2A4B]/45">{label}</p>
      <p className={`text-[13px] font-bold text-[#0C2A4B] ${ltr ? 'text-left' : ''}`} dir={ltr ? 'ltr' : undefined}>
        {value?.trim() ? value : '—'}
      </p>
    </div>
  )
}

/* ─── PlaceholderTab ──────────────────────────────────────────────────── */

function PlaceholderTab({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-100 bg-slate-50 text-slate-300">
        {icon}
      </div>
      <p className="text-[13px] font-black text-[#0C2A4B]/60">{title}</p>
      <p className="mt-1.5 max-w-xs text-[11px] font-semibold text-[#0C2A4B]/35">{description}</p>
      <span className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-600">
        قيد التطوير · يتطلب نقطة API مخصّصة
      </span>
    </div>
  )
}

/* ─── ActivityTab ─────────────────────────────────────────────────────── */

interface ActivityEvent { date: string; label: string; icon: ReactNode; color: string }

function ActivityTab({ u }: { u: AdminManagedUser }) {
  const colorCls: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    sky:     'bg-sky-100 text-sky-700',
    violet:  'bg-violet-100 text-violet-700',
    orange:  'bg-orange-100 text-orange-700',
  }

  const events: ActivityEvent[] = [
    ...(u.created_at           ? [{ date: u.created_at,           label: 'إنشاء الحساب',                     icon: <Users className="h-3.5 w-3.5" />,    color: 'emerald' }] : []),
    ...(u.email_verified_at    ? [{ date: u.email_verified_at,    label: 'التحقق من البريد الإلكتروني',       icon: <BadgeCheck className="h-3.5 w-3.5" />, color: 'sky' }]     : []),
    ...(u.updated_at && u.updated_at !== u.created_at
                               ? [{ date: u.updated_at,           label: 'تحديث بيانات الحساب',              icon: <Activity className="h-3.5 w-3.5" />, color: 'violet' }]   : []),
    ...(u.last_login_at        ? [{ date: u.last_login_at,        label: 'آخر تسجيل دخول',                   icon: <UserCheck className="h-3.5 w-3.5" />, color: 'orange' }]  : []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (!events.length)
    return <PlaceholderTab icon={<Activity className="h-6 w-6" />} title="لا سجلات نشاط" description="لم تُرجع نقطة API أي طوابع زمنية لهذا الحساب" />

  return (
    <div className="space-y-3">
      {events.map((ev, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
        >
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${colorCls[ev.color] ?? 'bg-slate-100 text-slate-500'}`}>
            {ev.icon}
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-black text-[#0C2A4B]">{ev.label}</p>
            <p className="font-mono text-[10px] tabular-nums text-slate-400">{toDMY(ev.date)}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/* ─── StudentCoursesTab ───────────────────────────────────────────────── */

function courseStatusClass(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('confirm') || s.includes('register') || s.includes('attend')) return 'bg-emerald-100 text-emerald-700'
  if (s.includes('cancel')) return 'bg-rose-100 text-rose-700'
  if (s.includes('pending')) return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

function StudentCoursesTab({ userId }: { userId: number }) {
  const [courses, setCourses] = useState<StudentCourseRow[]>([])
  const [loading, setLoading] = useState(true)

  // Re-arm the loading state during render when the student changes, so the previous
  // student's rows are never shown as settled under the new id.
  const [seenUserId, setSeenUserId] = useState(userId)
  if (seenUserId !== userId) {
    setSeenUserId(userId)
    setLoading(true)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const rows = await fetchStudentCourses(userId)
        if (alive) setCourses(rows)
      } catch {
        if (alive) setCourses([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [userId])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <PlaceholderTab
        icon={<BookOpen className="h-6 w-6" />}
        title="لا دورات مسجَّلة"
        description="لم يتم التسجيل في أي دورة حتى الآن، أو جميع التسجيلات ملغاة"
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <table className="w-full text-right text-[12px]">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-4 py-2.5 font-black text-slate-600">الدورة</th>
            <th className="px-4 py-2.5 font-black text-slate-600">الحالة</th>
            <th className="px-4 py-2.5 font-black text-slate-600">التقدم</th>
            <th className="px-4 py-2.5 font-black text-slate-600">تاريخ التسجيل</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {courses.map((c) => (
            <tr key={c.course_id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-2.5">
                <span className="font-bold text-[#0C2A4B]">{c.course_title}</span>
                <span className="mr-2 font-mono text-[10px] text-slate-400">#{c.course_id}</span>
              </td>
              <td className="px-4 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${courseStatusClass(c.status)}`}>
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#0077B6] transition-all"
                      style={{ width: `${c.progress_pct}%` }}
                    />
                  </div>
                  <span className="font-bold text-slate-600">{c.progress_pct}%</span>
                </div>
              </td>
              <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">
                {c.registered_at ? c.registered_at.slice(0, 10) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─── StudentProfile ──────────────────────────────────────────────────── */

function StudentProfile({ u, onBack }: { u: AdminManagedUser; onBack: () => void }) {
  const [tab, setTab] = useState<TabId>('overview')
  const active = u.is_active !== false

  const journeySteps: JourneyStep[] = [
    { id: 'signup',    label: 'إنشاء الحساب',                      done: true,                        date: toDMY(u.created_at),         icon: <Users className="h-3.5 w-3.5" /> },
    { id: 'email',     label: 'التحقق من البريد الإلكتروني',        done: Boolean(u.email_verified_at), date: u.email_verified_at ? toDMY(u.email_verified_at) : undefined, icon: <Mail className="h-3.5 w-3.5" /> },
    { id: 'enroll',    label: 'التسجيل في دورة',                    done: false, current: Boolean(u.email_verified_at), icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: 'placement', label: 'اختبار تحديد المستوى الكتابي',       done: false, icon: <Award className="h-3.5 w-3.5" /> },
    { id: 'oral',      label: 'المقابلة الشفوية',                   done: false, icon: <Mic className="h-3.5 w-3.5" /> },
    { id: 'learn',     label: 'بدء التعلم',                         done: false, icon: <GraduationCap className="h-3.5 w-3.5" /> },
  ]

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview',   label: 'نظرة عامة' },
    { id: 'courses',    label: 'الدورات' },
    { id: 'placement',  label: 'اختبارات تحديد المستوى' },
    { id: 'oral',       label: 'المقابلات الشفوية' },
    { id: 'activity',   label: 'النشاطات' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-5"
    >
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-black text-[#0C2A4B] shadow-sm transition hover:bg-slate-50"
      >
        <ChevronDown className="h-4 w-4 rotate-90" />
        العودة إلى قائمة الطلاب
      </button>

      {/* Profile header */}
      <SaGlassCard glow="blue" className="overflow-hidden p-0">
        <div className="bg-gradient-to-l from-[#0C2A4B] to-[#0077B6] px-6 py-7">
          <div className="flex items-start gap-4" dir="rtl">
            {u.avatar_url ? (
              <img src={u.avatar_url} alt={u.name} className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white/25" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl font-black text-white ring-4 ring-white/20">
                {initials(u.name)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-start gap-2">
                <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${active ? 'bg-emerald-500/30 text-emerald-200' : 'bg-red-500/30 text-red-200'}`}>
                  {active ? 'نشط' : 'موقوف'}
                </span>
                <span className="rounded-xl bg-white/20 px-2.5 py-1 text-[10px] font-black text-white/80">طالب</span>
                {u.email_verified_at && (
                  <span className="flex items-center gap-1 rounded-xl bg-sky-500/25 px-2.5 py-1 text-[10px] font-black text-sky-200">
                    <BadgeCheck className="h-3 w-3" />بريد مُحقَّق
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-[18px] font-black text-white">{u.name}</h2>
              <p className="mt-0.5 text-[12px] font-semibold text-white/65" dir="ltr">{u.email}</p>
              {(u.city || u.country) && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-white/60">
                  <MapPin className="h-3 w-3" />
                  {[u.city, u.country].filter(Boolean).join('، ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-100 border-t border-slate-100 sm:grid-cols-4" dir="rtl">
          {[
            { label: 'تاريخ التسجيل', value: toDMY(u.created_at),    icon: <Calendar className="h-3.5 w-3.5" /> },
            { label: 'آخر تسجيل دخول', value: toDMY(u.last_login_at), icon: <Clock className="h-3.5 w-3.5" /> },
            { label: 'الجنس',          value: genderAr(u.gender) ?? '—', icon: null },
            { label: 'الهاتف',         value: u.phone ?? '—',          icon: <Phone className="h-3.5 w-3.5" />, ltr: true },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1 py-4 text-center">
              {item.icon && <span className="text-[#0077B6]/70">{item.icon}</span>}
              <p className="text-[10px] font-black text-[#0C2A4B]/40">{item.label}</p>
              <p className="font-mono text-[11px] font-black tabular-nums text-[#0C2A4B]" dir={item.ltr ? 'ltr' : undefined}>{item.value}</p>
            </div>
          ))}
        </div>
      </SaGlassCard>

      {/* Tabs */}
      <div className="overflow-x-auto" dir="rtl">
        <div className="flex gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" style={{ minWidth: 'max-content' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-2 text-[11px] font-black transition ${
                tab === t.id ? 'bg-[#0077B6] text-white shadow-sm' : 'text-[#0C2A4B]/55 hover:bg-slate-50 hover:text-[#0C2A4B]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.13 }}>
          {tab === 'overview' && (
            <div className="grid gap-5 lg:grid-cols-[1fr_300px]" dir="rtl">
              <SaGlassCard glow="blue" className="space-y-4 p-5">
                <p className="text-[11px] font-black text-[#0C2A4B]/45">معلومات الحساب</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoField label="الاسم الكامل"         value={u.name} />
                  <InfoField label="البريد الإلكتروني"    value={u.email} ltr />
                  <InfoField label="رقم الهاتف"           value={u.phone} ltr />
                  <InfoField label="المدينة"              value={u.city} />
                  <InfoField label="الدولة"               value={u.country} />
                  <InfoField label="الجنس"                value={genderAr(u.gender)} />
                  <InfoField label="القسم / الجهة"        value={u.department} />
                  <InfoField label="كيف عرفتنا؟"         value={u.how_did_you_hear_about_us} />
                  <InfoField label="تاريخ الإنشاء"        value={toDMY(u.created_at)} />
                  <InfoField label="آخر تحديث"            value={toDMY(u.updated_at)} />
                  <InfoField label="EMC ID"               value={`#${u.id}`} ltr />
                  <InfoField label="الدور"                value="طالب" />
                </div>
              </SaGlassCard>

              <SaGlassCard glow="blue" className="p-5">
                <p className="mb-4 text-[11px] font-black text-[#0C2A4B]/45">رحلة الطالب</p>
                <JourneyTimeline steps={journeySteps} />
              </SaGlassCard>
            </div>
          )}

          {tab === 'courses' && (
            <SaGlassCard glow="blue" className="p-5">
              <StudentCoursesTab userId={u.id} />
            </SaGlassCard>
          )}

          {tab === 'placement' && (
            <SaGlassCard glow="blue" className="p-5">
              <PlaceholderTab
                icon={<Award className="h-6 w-6" />}
                title="بيانات اختبارات تحديد المستوى غير متاحة حالياً"
                description="يتطلب هذا القسم نقطة API مخصّصة GET /admin/students/{id}/placement-tests لعرض النتائج والإجابات والمستويات"
              />
            </SaGlassCard>
          )}

          {tab === 'oral' && (
            <SaGlassCard glow="blue" className="p-5">
              <PlaceholderTab
                icon={<Mic className="h-6 w-6" />}
                title="بيانات المقابلات الشفوية غير متاحة حالياً"
                description="يتطلب هذا القسم نقطة API مخصّصة GET /admin/students/{id}/oral-assessments لعرض المقابلات المجدولة ودرجاتها"
              />
            </SaGlassCard>
          )}

          {tab === 'activity' && (
            <SaGlassCard glow="blue" className="p-5">
              <ActivityTab u={u} />
            </SaGlassCard>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Skeletons ───────────────────────────────────────────────────────── */

function SkeletonCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-3xl bg-slate-100" />
      ))}
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function StudentsManagementPage({ pageTitle }: { pageTitle?: string } = {}) {
  const [loading,    setLoading]    = useState(true)
  const [users,      setUsers]      = useState<AdminManagedUser[]>([])
  const [serverTotal, setServerTotal] = useState<number | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [forbidden,  setForbidden]  = useState(false)
  const [q,          setQ]          = useState('')
  const [status,     setStatus]     = useState<'all' | 'active' | 'inactive'>('all')
  const [selected,   setSelected]   = useState<AdminManagedUser | null>(null)

  // Bumped by `load()` so an imperative refresh re-runs the fetch effect below — the
  // effect stays the single owner of the request.
  const [reloadToken, setReloadToken] = useState(0)

  /** Imperative refresh from the toolbar button. */
  const load = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  // Re-arm the request state during render on refresh — react.dev "adjusting state when
  // a prop changes". The initial `loading: true` / `error: null` / `forbidden: false`
  // already carry the first pass.
  const [seenToken, setSeenToken] = useState(reloadToken)
  if (seenToken !== reloadToken) {
    setSeenToken(reloadToken)
    setLoading(true)
    setError(null)
    setForbidden(false)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        // Fetch all students server-side (role filter + all pages)
        const first = await fetchAdminUsersPage({ role: 'student', status: 'all', per_page: 100, page: 1 })
        let allUsers = [...first.users]
        if (first.serverPaginated && first.lastPage > 1) {
          const rest = await Promise.all(
            Array.from({ length: first.lastPage - 1 }, (_, i) =>
              fetchAdminUsersPage({ role: 'student', status: 'all', per_page: 100, page: i + 2 })
            )
          )
          for (const p of rest) allUsers = allUsers.concat(p.users)
        }
        if (!alive) return
        // Use server total for KPI accuracy; fall back to loaded count
        setServerTotal(first.serverPaginated ? first.total : null)
        setUsers(allUsers.filter((u) => normalizeRole(u.role) === 'student'))
      } catch (e) {
        if (!alive) return
        setUsers([])
        setServerTotal(null)
        if (axios.isAxiosError(e) && e.response?.status === 403) { setForbidden(true); toast.warning(ADMIN_USER_FORBIDDEN_AR) }
        else setError(getApiErrorMessage(e))
      } finally { if (alive) setLoading(false) }
    })()
    return () => {
      alive = false
    }
  }, [reloadToken])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return users.filter((u) => {
      if (status === 'active'   && u.is_active === false) return false
      if (status === 'inactive' && u.is_active !== false) return false
      return !t || `${u.name} ${u.email} ${u.phone ?? ''} ${u.city ?? ''}`.toLowerCase().includes(t)
    })
  }, [users, q, status])

  // Use server-reported total for KPI tiles (accurate even when client-side filters are applied)
  const total       = serverTotal ?? users.length
  const activeCount = users.filter((u) => u.is_active !== false).length
  const inactiveCount = users.filter((u) => u.is_active === false).length
  const thisMonth   = useMemo(() => {
    const now = new Date()
    return users.filter((u) => {
      if (!u.created_at) return false
      const d = new Date(u.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
  }, [users])

  const statusPie = useMemo(() =>
    filtered.length ? [
      { name: 'نشط',    value: filtered.filter((u) => u.is_active !== false).length, fill: EMC_CHART_PALETTE[0] },
      { name: 'موقوف',  value: filtered.filter((u) => u.is_active === false).length, fill: EMC_CHART_PALETTE[4] },
    ].filter((s) => s.value > 0) : []
  , [filtered])

  const cityData = useMemo(() => {
    const map = new Map<string, number>()
    for (const u of filtered) { const c = u.city?.trim() || 'غير محدد'; map.set(c, (map.get(c) ?? 0) + 1) }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([city, cnt]) => ({ nameAr: city.length > 10 ? city.slice(0, 9) + '…' : city, طلاب: cnt }))
  }, [filtered])

  const monthlyData = useMemo(() => {
    const map = new Map<string, number>()
    for (const u of users) { if (u.created_at) { const m = u.created_at.slice(0, 7); map.set(m, (map.get(m) ?? 0) + 1) } }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-8)
      .map(([mo, cnt]) => ({ nameAr: mo.slice(2).replace('-', '/'), تسجيل: cnt }))
  }, [users])

  const showDashboard = !forbidden && !error

  return (
    <SaPageRoot className="space-y-8 pb-14">

      {/* Hero */}
      <EnterpriseCrudHero
        eyebrow="Student Intelligence · admin/users directory"
        title={pageTitle ?? "الطلاب — لوحة الذكاء الطلابي"}
        subtitle="عرض شامل لجميع الطلاب المسجلين مع بياناتهم الكاملة ورحلة التعلم"
        variant="blue"
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-[18px] border border-white/25 bg-white/95 px-4 py-2.5 text-[12px] font-black text-deepBlue shadow backdrop-blur-md"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        }
      />

      {forbidden && <ErrorPanel title={ADMIN_USER_FORBIDDEN_AR} />}
      {error && !forbidden && <ErrorPanel title="خطأ في تحميل البيانات" hint={error} />}

      {/* Student selector */}
      {showDashboard && (
        <SaGlassCard glow="blue" className="overflow-visible p-4">
          <div dir="rtl">
            <p className="mb-2 text-[10px] font-black text-[#0C2A4B]/45">اختيار الطالب</p>
            <StudentSearchDropdown students={users} selected={selected} onChange={setSelected} />
          </div>
        </SaGlassCard>
      )}

      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div key={`profile-${selected.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StudentProfile u={selected} onBack={() => setSelected(null)} />
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">

            {/* KPI tiles */}
            {showDashboard && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <EnterpriseMetricTile accent="blue"   icon={GraduationCap} label="إجمالي الطلاب"      value={<AnimatedTabular value={loading ? 0 : total} />} />
                <EnterpriseMetricTile accent="mint"   icon={UserCheck}     label="الطلاب النشطون"     value={<AnimatedTabular value={loading ? 0 : activeCount} />}   hint={total > 0 ? `${Math.round((activeCount / total) * 100)}٪ من الإجمالي` : undefined} />
                <EnterpriseMetricTile accent="orange" icon={Users}         label="الحسابات الموقوفة"  value={<AnimatedTabular value={loading ? 0 : inactiveCount} />} />
                <EnterpriseMetricTile accent="navy"   icon={Calendar}      label="انضموا هذا الشهر"   value={<AnimatedTabular value={loading ? 0 : thisMonth} />} />
              </div>
            )}

            {/* Search + filters */}
            {showDashboard && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" dir="rtl">
                <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="بحث بالاسم أو البريد أو الجوال..."
                    dir="rtl"
                    className="flex-1 bg-transparent text-[12px] font-semibold text-[#0C2A4B] outline-none placeholder:text-slate-400"
                  />
                  {q && <button type="button" onClick={() => setQ('')} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>}
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1">
                  {(['all', 'active', 'inactive'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setStatus(v)}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition ${status === v ? 'bg-[#0077B6] text-white shadow-sm' : 'text-[#0C2A4B]/50 hover:text-[#0C2A4B]'}`}
                    >
                      {v === 'all' ? 'الكل' : v === 'active' ? 'نشط' : 'موقوف'}
                    </button>
                  ))}
                </div>
                <p className="mr-auto text-[11px] font-bold text-slate-400">{filtered.length} طالب</p>
              </div>
            )}

            {/* Student grid */}
            {loading ? (
              <SkeletonCards />
            ) : forbidden || error ? null : !filtered.length ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center" dir="rtl">
                <GraduationCap className="mx-auto h-12 w-12 text-slate-200" />
                <p className="mt-4 text-[14px] font-black text-[#0C2A4B]/50">لا طلاب مطابقون</p>
                <p className="mt-1 text-[12px] font-semibold text-[#0C2A4B]/30">جرّب تغيير فلتر الحالة أو كلمة البحث</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" dir="rtl">
                {filtered.map((u, i) => (
                  <StudentCard key={u.id} u={u} idx={i} onSelect={() => setSelected(u)} />
                ))}
              </div>
            )}

            {/* Analytics */}
            {showDashboard && !loading && filtered.length > 0 && (
              <div className="grid gap-5 lg:grid-cols-3">
                <SaGlassCard glow="blue" className="p-5">
                  <p className="mb-3 text-[11px] font-black text-[#0C2A4B]/45">توزيع حالة الحسابات</p>
                  {statusPie.length > 0
                    ? <EnterprisePieRadial data={statusPie} height={160} />
                    : <p className="py-8 text-center text-[12px] text-slate-400">لا بيانات كافية</p>}
                </SaGlassCard>

                <SaGlassCard glow="orange" className="p-5">
                  <p className="mb-3 text-[11px] font-black text-[#0C2A4B]/45">توزيع الطلاب حسب المدينة</p>
                  {cityData.length > 0
                    ? <EnterpriseColumnChart data={cityData} bars={[{ key: 'طلاب', color: EMC_CHART_PALETTE[1], label: 'طلاب' }]} height={140} />
                    : <p className="py-8 text-center text-[12px] text-slate-400">لا بيانات مدن متاحة</p>}
                </SaGlassCard>

                <SaGlassCard glow="blue" className="p-5">
                  <p className="mb-3 text-[11px] font-black text-[#0C2A4B]/45">التسجيلات الشهرية</p>
                  {monthlyData.length > 0
                    ? <EnterpriseColumnChart data={monthlyData} bars={[{ key: 'تسجيل', color: EMC_CHART_PALETTE[0], label: 'تسجيل' }]} height={140} />
                    : <p className="py-8 text-center text-[12px] text-slate-400">لا بيانات تسجيلات</p>}
                </SaGlassCard>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </SaPageRoot>
  )
}
