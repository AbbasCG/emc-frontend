import {
  AlertCircle,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  MessageSquare,
  Radio,
  UserCheck,
  Users,
  Video,
  Zap,
} from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchInstructorDashboardStats } from '@/api/instructorApi'
import type { InstructorSubmission, LmsSession, TeachingCourseLms } from '@/types/lms'
import { useAuth } from '../contexts/AuthContext'
import { enrichSessionTiming } from '@/utils/lmsSession'

// ─── Number / Date helpers (English numerals) ─────────────────────────────────

function n(v: number): string {
  return v.toLocaleString('en-US')
}

function fmt24(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  } catch { return '' }
}

function fmtDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('ar', {
      numberingSystem: 'latn',
      day: 'numeric', month: 'short',
      ...opts,
    }).format(new Date(iso))
  } catch { return iso.slice(0, 10) }
}

function todayArabicDate(): string {
  return new Intl.DateTimeFormat('ar', {
    numberingSystem: 'latn',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date())
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'للتو'
  if (mins < 60) return `منذ ${mins} د`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `منذ ${hrs} س`
  const days = Math.round(hrs / 24)
  return `منذ ${days} ي`
}

// ─── Session helpers ──────────────────────────────────────────────────────────

type EnrichedSession = LmsSession & { enrichedStatus: string }

function enrich(sessions: LmsSession[]): EnrichedSession[] {
  const now = Date.now()
  return sessions.map((s) => {
    const e = enrichSessionTiming(s, now)
    return { ...e, enrichedStatus: e.status }
  })
}

function sessionDateStr(s: LmsSession): string {
  const raw = s.starts_at ?? s.date
  return raw ? raw.slice(0, 10) : ''
}

const todayKey = new Date().toISOString().slice(0, 10)
const tomorrowKey = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) })()

function isToday(d: string): boolean { return d === todayKey }
function isTomorrow(d: string): boolean { return d === tomorrowKey }
function isFuture(d: string): boolean { return d > todayKey }

function nameInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function hourGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 18) return 'مساء الخير'
  return 'مساء النور'
}

// ─── useCountUp (English output) ─────────────────────────────────────────────

function useCountUp(target: number, duration = 800): number {
  const [val, setVal] = useState(0)
  const cur = useRef(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 2
      const next = Math.round(eased * target)
      if (next !== cur.current) { cur.current = next; setVal(next) }
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return val
}

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  }),
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ h = 'h-4', w = 'w-full', rounded = 'rounded-lg' }: { h?: string; w?: string; rounded?: string }) {
  return <div className={`animate-pulse bg-slate-100 ${h} ${w} ${rounded}`} />
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title, href, hrefLabel, children, className = '',
}: {
  title: string; href?: string; hrefLabel?: string
  children: React.ReactNode; className?: string
}) {
  return (
    <section className={`rounded-2xl border border-slate-100 bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">{title}</h2>
        {href && (
          <Link to={href} className="flex items-center gap-1 text-xs font-bold text-[#0077B6] hover:text-[#1A6CA8]">
            {hrefLabel ?? 'عرض الكل'}
            <ChevronLeft size={12} />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({
  name, avatarUrl, greeting, date,
  courses, students, todaySessions, pending, isLoading,
}: {
  name: string; avatarUrl: string | null | undefined; greeting: string; date: string
  courses: number; students: number; todaySessions: number; pending: number; isLoading: boolean
}) {
  const aC = useCountUp(isLoading ? 0 : courses)
  const aS = useCountUp(isLoading ? 0 : students)
  const aSe = useCountUp(isLoading ? 0 : todaySessions)
  const aP = useCountUp(isLoading ? 0 : pending)

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative overflow-hidden rounded-2xl bg-[#0B1E38] shadow-xl"
    >
      {/* Glow orbs */}
      <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 -translate-y-1/3 translate-x-1/4 rounded-full bg-[#0077B6]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-32 w-32 translate-y-1/2 rounded-full bg-[#0077B6]/10 blur-2xl" />

      <div className="relative flex flex-col justify-between gap-5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:px-8">
        {/* Identity */}
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0077B6] to-[#1A6CA8] shadow-lg ring-2 ring-white/10">
            {avatarUrl
              ? <img src={avatarUrl} alt={name} className="h-full w-full rounded-2xl object-cover" />
              : <span className="text-lg font-black text-white">{nameInitials(name)}</span>}
            <span className="absolute -bottom-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-[#0B1E38]">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-slate-500">{date}</p>
            <h1 className="mt-0.5 text-xl font-black text-white">
              {greeting}، <span className="text-sky-300">{name}</span>
            </h1>
            <p className="mt-0.5 text-[12px] text-slate-400">
              {isLoading ? '…' : todaySessions > 0
                ? `لديك ${todaySessions} ${todaySessions === 1 ? 'جلسة' : 'جلسات'} اليوم`
                : 'لا توجد جلسات اليوم'}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden h-12 w-px bg-white/10 sm:block" />

        {/* Stat chips */}
        <div className="grid grid-cols-2 gap-4 sm:flex sm:gap-8">
          {[
            { label: 'دوراتي', v: aC, color: 'text-sky-300' },
            { label: 'الطلاب', v: aS, color: 'text-emerald-300' },
            { label: 'اليوم', v: aSe, color: 'text-amber-300' },
            { label: 'بانتظار التصحيح', v: aP, color: pending > 0 ? 'text-orange-300' : 'text-slate-500' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className={`text-3xl font-black tabular-nums leading-none ${s.color}`}>
                {isLoading ? '—' : n(s.v)}
              </span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, iconBg, iconColor, hint, urgent, i,
}: {
  label: string; value: number; icon: React.ElementType
  iconBg: string; iconColor: string; hint?: string; urgent?: boolean; i: number
}) {
  const v = useCountUp(value)
  return (
    <motion.div
      variants={fadeUp} custom={i} initial="hidden" animate="show"
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={`flex items-center gap-4 rounded-2xl border bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md ${urgent && value > 0 ? 'border-orange-200' : 'border-slate-100'}`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black tabular-nums leading-tight text-[#0B1E38]">{n(v)}</p>
        <p className="truncate text-[11px] font-semibold text-slate-500">{label}</p>
        {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
      </div>
      {urgent && value > 0 && (
        <span className="mr-auto shrink-0 rounded-full bg-[#F28C00] px-2 py-0.5 text-[10px] font-black text-white">{n(value)}</span>
      )}
    </motion.div>
  )
}

// ─── Today Session Item ───────────────────────────────────────────────────────

function TodaySessionRow({ session, i }: { session: EnrichedSession; i: number }) {
  const isLive = session.enrichedStatus === 'live'
  const isDone = session.enrichedStatus === 'completed' || session.enrichedStatus === 'ended'
  const isOnline = session.type !== 'offline'

  return (
    <motion.div
      variants={fadeUp} custom={i} initial="hidden" animate="show"
      className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition ${
        isLive ? 'border-emerald-200 bg-emerald-50/60' :
        isDone ? 'border-slate-100 bg-slate-50/60 opacity-60' :
        'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
      }`}
    >
      {/* Status dot */}
      <div className={`flex h-2.5 w-2.5 shrink-0 rounded-full ${
        isLive ? 'bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.25)] animate-pulse' :
        isDone ? 'bg-slate-300' : 'bg-[#0077B6]'
      }`} />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-black text-[#0B1E38]">
          {session.course_name ?? session.title ?? 'جلسة'}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
          {session.starts_at && <span><Clock size={10} className="mr-0.5 inline text-[#0077B6]" />{fmt24(session.starts_at)}{session.ends_at && `–${fmt24(session.ends_at)}`}</span>}
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ring-1 ${isOnline ? 'bg-sky-50 text-sky-600 ring-sky-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>
            {isOnline ? 'أونلاين' : 'حضوري'}
          </span>
          {isLive && <span className="flex items-center gap-0.5 font-black text-emerald-600"><Radio size={9} />مباشر</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        {isLive && session.meeting_link
          ? <a href={session.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-black text-white hover:brightness-105"><Video size={10} />انضم</a>
          : !isDone && session.meeting_link
            ? <a href={session.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg border border-[#0077B6]/20 bg-[#0077B6]/[0.07] px-2.5 py-1.5 text-[11px] font-black text-[#0077B6] hover:bg-[#0077B6]/[0.12]"><Video size={10} />فتح</a>
            : null}
        <Link to={`/dashboard/instructor/attendance?session_id=${session.id}`} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50">
          <UserCheck size={10} />حضور
        </Link>
      </div>
    </motion.div>
  )
}

// ─── Upcoming Session Row ─────────────────────────────────────────────────────

function UpcomingRow({ session, i }: { session: EnrichedSession; i: number }) {
  const isOnline = session.type !== 'offline'
  const dateStr = sessionDateStr(session)
  const dateLabel = isToday(dateStr) ? 'اليوم' : isTomorrow(dateStr) ? 'غداً' : fmtDate(session.starts_at ?? session.date)

  return (
    <motion.div
      variants={fadeUp} custom={i} initial="hidden" animate="show"
      className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3 transition hover:border-slate-200 hover:shadow-sm"
    >
      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-[#0077B6]/[0.08] text-center">
        <span className="text-[10px] font-black text-[#0077B6]">{dateLabel}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-black text-[#0B1E38]">
          {session.course_name ?? session.title ?? 'جلسة'}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
          {session.starts_at && <span>{fmt24(session.starts_at)}</span>}
          {session.location && <span className="truncate">{session.location}</span>}
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ring-1 ${isOnline ? 'bg-sky-50 text-sky-600 ring-sky-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>
            {isOnline ? 'أونلاين' : 'حضوري'}
          </span>
        </div>
      </div>
      {session.meeting_link
        ? <a href={session.meeting_link} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 rounded-lg border border-[#0077B6]/20 bg-[#0077B6]/[0.07] px-3 py-1.5 text-[11px] font-black text-[#0077B6] hover:bg-[#0077B6]/[0.12]"><Video size={10} />فتح</a>
        : <Link to="/dashboard/instructor/sessions" className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:border-slate-300"><Calendar size={10} />عرض</Link>}
    </motion.div>
  )
}

// ─── Assignment Waiting Row (per-student) ────────────────────────────────────

function AssignmentWaitingRow({ sub, i }: { sub: InstructorSubmission; i: number }) {
  const isResubmit = sub.status === 'resubmitted'
  return (
    <motion.div
      variants={fadeUp} custom={i} initial="hidden" animate="show"
      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 transition hover:border-slate-200 hover:shadow-sm"
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B1E38]/[0.06] text-[11px] font-black text-[#0B1E38]">
        {nameInitials(sub.student_name)}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-black text-[#0B1E38]">{sub.student_name}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="truncate">{sub.assignment_title ?? 'واجب'}</span>
          {sub.course_name && <><span>·</span><span className="truncate text-[#0077B6]">{sub.course_name}</span></>}
        </div>
      </div>

      {/* Submitted */}
      <div className="flex shrink-0 items-center gap-2">
        {sub.submitted_at && (
          <span className="text-[10px] text-slate-400">{timeAgo(sub.submitted_at)}</span>
        )}
        {isResubmit && (
          <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white">إعادة</span>
        )}
        <Link
          to={`/dashboard/instructor/submissions${sub.course_id ? `?course_id=${sub.course_id}` : ''}`}
          className="flex items-center gap-1 rounded-lg bg-[#F28C00] px-3 py-1.5 text-[11px] font-black text-white hover:brightness-105"
        >
          <FileText size={10} />تصحيح
        </Link>
      </div>
    </motion.div>
  )
}

// ─── Compact Course Card (max 6) ──────────────────────────────────────────────

type CoursePriority = {
  course: TeachingCourseLms
  hasLive: boolean
  hasToday: boolean
  hasTomorrow: boolean
  pendingCount: number
  nextSession: EnrichedSession | null
}

function ActiveCourseCard({ cp, i }: { cp: CoursePriority; i: number }) {
  const { course, hasLive, hasToday, pendingCount, nextSession } = cp
  const studentCount = course.student_count ?? course.enrolled_students_count ?? course.students_count ?? 0
  const imageUrl = course.thumbnail ?? course.image ?? null

  return (
    <motion.div
      variants={fadeUp} custom={i} initial="hidden" animate="show"
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Cover */}
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-[#0B1E38] to-[#0077B6]">
        {imageUrl
          ? <img src={imageUrl} alt={course.title} className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center"><BookOpen size={28} className="text-white/20" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1E38]/70 to-transparent" />
        {hasLive && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-white">
            <Radio size={8} />مباشر
          </span>
        )}
        {!hasLive && hasToday && (
          <span className="absolute left-3 top-3 rounded-full bg-[#0077B6] px-2 py-0.5 text-[9px] font-black text-white">اليوم</span>
        )}
        {pendingCount > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-[#F28C00] px-2 py-0.5 text-[9px] font-black text-white">{n(pendingCount)} تسليم</span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-sm font-black leading-snug text-[#0B1E38]">{course.title}</h3>

        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
          <span className="flex items-center gap-1"><Users size={11} className="text-[#0077B6]" />{n(studentCount)}</span>
          {nextSession?.starts_at && (
            <span className="flex items-center gap-1 truncate"><Clock size={11} className="shrink-0 text-[#0077B6]" />{fmt24(nextSession.starts_at)}</span>
          )}
        </div>

        <Link
          to={`/dashboard/instructor/courses/${course.id}/students`}
          className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-[#0B1E38]/[0.05] py-2 text-[11px] font-black text-[#0B1E38] transition hover:bg-[#0077B6]/[0.10] hover:text-[#0077B6]"
        >
          <ChevronRight size={13} />فتح الدورة
        </Link>
      </div>
    </motion.div>
  )
}

// ─── Recent Activity ──────────────────────────────────────────────────────────

type ActivityItem = { id: string; icon: React.ElementType; iconColor: string; iconBg: string; text: string; sub: string; time: string }

function ActivityRow({ item, i }: { item: ActivityItem; i: number }) {
  const Icon = item.icon
  return (
    <motion.div variants={fadeUp} custom={i} initial="hidden" animate="show" className="flex items-start gap-3 py-2.5">
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}>
        <Icon size={13} className={item.iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-[#0B1E38]">{item.text}</p>
        <p className="text-[10px] text-slate-400">{item.sub}</p>
      </div>
      <span className="shrink-0 text-[10px] text-slate-400">{item.time}</span>
    </motion.div>
  )
}

// ─── Bar Chart (SVG-free, CSS-only) ──────────────────────────────────────────

function BarChart({ data, label }: { data: { label: string; value: number; highlight?: boolean }[]; label: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div>
      <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <div className="flex items-end gap-2" style={{ height: 72 }}>
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.06, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ height: `${Math.max(4, Math.round((d.value / max) * 60))}px`, transformOrigin: 'bottom' }}
              className={`w-full rounded-t-lg ${d.highlight ? 'bg-[#0077B6]' : 'bg-slate-200'}`}
            />
            <p className="text-[9px] font-bold text-slate-400">{d.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Empty States ─────────────────────────────────────────────────────────────

function EmptyWork() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
        <CheckCircle2 size={24} className="text-emerald-500" />
      </div>
      <p className="font-black text-[#0B1E38]">يوم هادئ</p>
      <p className="mt-1 text-[12px] text-slate-400">لا توجد جلسات مجدولة اليوم</p>
    </div>
  )
}

function EmptyAssignments() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
        <CheckCircle2 size={24} className="text-emerald-500" />
      </div>
      <p className="font-black text-[#0B1E38]">لا توجد واجبات معلّقة</p>
      <p className="mt-1 text-[12px] text-slate-400">جميع الواجبات تمت مراجعتها</p>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

type LoadState = 'loading' | 'ok' | 'error'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [dashStats, setDashStats] = useState<Awaited<ReturnType<typeof fetchInstructorDashboardStats>> | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')

  useEffect(() => {
    let alive = true
    void fetchInstructorDashboardStats()
      .then((s) => { if (alive) { setDashStats(s); setLoadState('ok') } })
      .catch(() => { if (alive) setLoadState('error') })
    return () => { alive = false }
  }, [])

  const isLoading = loadState === 'loading'
  const displayName = user?.name?.trim() || 'مدرّب EMC'
  const avatarUrl = (user as unknown as Record<string, unknown>)?.avatar_url as string | null | undefined

  // ── All enriched sessions ─────────────────────────────────────────────────
  const allSessions = useMemo(() => enrich(dashStats?.sessions ?? []), [dashStats?.sessions])

  const todaySessions = useMemo(
    () => allSessions.filter((s) => isToday(sessionDateStr(s))).sort((a, b) => (a.starts_at ?? '') < (b.starts_at ?? '') ? -1 : 1),
    [allSessions],
  )

  const upcomingSessions = useMemo(
    () => allSessions
      .filter((s) => {
        const d = sessionDateStr(s)
        return isFuture(d) && s.enrichedStatus !== 'completed'
      })
      .sort((a, b) => (a.starts_at ?? a.date ?? '') < (b.starts_at ?? b.date ?? '') ? -1 : 1)
      .slice(0, 8),
    [allSessions],
  )

  // ── Courses (prioritized, max 6) ─────────────────────────────────────────
  const courses = dashStats?.courses ?? []

  const prioritizedCourses = useMemo<CoursePriority[]>(() => {
    const submissions = dashStats?.submissions ?? []
    const pendingPerCourse = new Map<number, number>()
    for (const s of submissions) {
      if ((s.status === 'pending_review' || s.status === 'resubmitted') && s.course_id) {
        pendingPerCourse.set(s.course_id, (pendingPerCourse.get(s.course_id) ?? 0) + 1)
      }
    }

    return courses
      .map((c) => {
        const courseSessions = allSessions.filter((s) => s.course_id === c.id)
        const hasLive = courseSessions.some((s) => s.enrichedStatus === 'live')
        const hasToday = courseSessions.some((s) => isToday(sessionDateStr(s)))
        const hasTomorrow = courseSessions.some((s) => isTomorrow(sessionDateStr(s)))
        const pendingCount = pendingPerCourse.get(c.id) ?? 0
        const nextSession = courseSessions
          .filter((s) => isFuture(sessionDateStr(s)) || isToday(sessionDateStr(s)))
          .sort((a, b) => (a.starts_at ?? '') < (b.starts_at ?? '') ? -1 : 1)[0] ?? null

        const st = String(c.status ?? '').toLowerCase()
        const isCompleted = st.includes('complet') || c.is_ended === true

        return { course: c, hasLive, hasToday, hasTomorrow, pendingCount, nextSession, isCompleted }
      })
      .filter((cp) => !cp.isCompleted)
      .sort((a, b) => {
        if (a.hasLive !== b.hasLive) return a.hasLive ? -1 : 1
        if (a.hasToday !== b.hasToday) return a.hasToday ? -1 : 1
        if (a.hasTomorrow !== b.hasTomorrow) return a.hasTomorrow ? -1 : 1
        if (a.pendingCount !== b.pendingCount) return b.pendingCount - a.pendingCount
        return 0
      })
      .slice(0, 6)
  }, [courses, allSessions, dashStats?.submissions])

  // ── Pending submissions (per student) ───────────────────────────────────
  const pendingSubmissions = useMemo(
    () => (dashStats?.submissions ?? [])
      .filter((s) => s.status === 'pending_review' || s.status === 'resubmitted')
      .sort((a, b) => (b.submitted_at ?? '') < (a.submitted_at ?? '') ? -1 : 1)
      .slice(0, 10),
    [dashStats?.submissions],
  )

  // ── Derived KPI values ──────────────────────────────────────────────────
  const activeCourseCount = courses.filter((c) => {
    const st = String(c.status ?? '').toLowerCase()
    return !st.includes('complet') && !c.is_ended
  }).length
  const studentsCount = dashStats?.studentsCount ?? 0
  const submissionsPending = dashStats?.submissionsPending ?? 0
  const attendancePending = dashStats?.attendancePending ?? 0
  const oralPending = dashStats?.oralPending ?? 0

  // ── Recent activity derived from submissions ─────────────────────────────
  const recentActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = []
    for (const s of (dashStats?.submissions ?? []).slice(0, 5)) {
      if (!s.submitted_at) continue
      items.push({
        id: `sub-${s.id}`,
        icon: ClipboardList,
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        text: `${s.student_name} سلّم واجباً`,
        sub: s.assignment_title ?? s.course_name ?? '',
        time: timeAgo(s.submitted_at),
      })
    }
    // Completed today sessions
    for (const s of todaySessions.filter((s) => s.enrichedStatus === 'completed' || s.enrichedStatus === 'ended')) {
      items.push({
        id: `sess-${s.id}`,
        icon: CalendarDays,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        text: 'جلسة مكتملة',
        sub: s.course_name ?? s.title ?? '',
        time: fmt24(s.ends_at ?? s.starts_at),
      })
    }
    return items.slice(0, 8)
  }, [dashStats?.submissions, todaySessions])

  // ── Charts data ──────────────────────────────────────────────────────────
  const weeklySessionsData = useMemo(() => {
    const today = new Date()
    const dayNames = ['أح', 'اث', 'ثل', 'أر', 'خم', 'جم', 'سب']
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - 6 + i)
      const key = d.toISOString().slice(0, 10)
      return {
        label: dayNames[d.getDay()],
        value: allSessions.filter((s) => sessionDateStr(s) === key).length,
        highlight: key === todayKey,
      }
    })
  }, [allSessions])

  const submissionsWeekData = useMemo(() => {
    const today = new Date()
    const dayNames = ['أح', 'اث', 'ثل', 'أر', 'خم', 'جم', 'سب']
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - 6 + i)
      const key = d.toISOString().slice(0, 10)
      return {
        label: dayNames[d.getDay()],
        value: (dashStats?.submissions ?? []).filter((s) => s.submitted_at?.slice(0, 10) === key).length,
        highlight: key === todayKey,
      }
    })
  }, [dashStats?.submissions])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-16 text-right" dir="rtl">

      {/* ── Hero ── */}
      <Hero
        name={displayName}
        avatarUrl={avatarUrl}
        greeting={hourGreeting()}
        date={todayArabicDate()}
        courses={activeCourseCount}
        students={studentsCount}
        todaySessions={todaySessions.length}
        pending={submissionsPending}
        isLoading={isLoading}
      />

      {/* ── KPI Row ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-4">
              <Sk h="h-10" w="w-10" rounded="rounded-xl" />
              <div className="flex-1 space-y-2"><Sk h="h-6" w="w-10" /><Sk h="h-3" w="w-24" /></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <KpiCard i={0} label="الدورات النشطة"      value={activeCourseCount}   icon={BookOpen}     iconBg="bg-sky-50"     iconColor="text-sky-600" />
          <KpiCard i={1} label="الطلاب الملتحقون"    value={studentsCount}       icon={Users}        iconBg="bg-emerald-50" iconColor="text-emerald-600" hint="مدفوعون فقط" />
          <KpiCard i={2} label="جلسات اليوم"         value={todaySessions.length} icon={Calendar}    iconBg="bg-violet-50"  iconColor="text-violet-600" />
          <KpiCard i={3} label="تسليمات بانتظار التصحيح" value={submissionsPending} icon={ClipboardList} iconBg="bg-orange-50" iconColor="text-orange-500" urgent={submissionsPending > 0} />
          <KpiCard i={4} label="جلسات بلا حضور"     value={attendancePending}   icon={UserCheck}    iconBg="bg-red-50"     iconColor="text-red-500"   urgent={attendancePending > 0} />
          <KpiCard i={5} label="مقابلات شفوية"       value={oralPending}         icon={MessageSquare} iconBg="bg-sky-50"   iconColor="text-sky-500" />
        </div>
      )}

      {/* ── Today's Work ── */}
      <Section title="عمل اليوم">
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Sk key={i} h="h-16" />)}
            </div>
          ) : todaySessions.length === 0 ? (
            <EmptyWork />
          ) : (
            <div className="space-y-2">
              {todaySessions.map((s, i) => <TodaySessionRow key={s.id} session={s} i={i} />)}
            </div>
          )}

          {/* Attention reminders */}
          {!isLoading && (attendancePending > 0 || oralPending > 0) && (
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">يحتاج انتباهك</p>
              {attendancePending > 0 && (
                <Link to="/dashboard/instructor/attendance" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 transition hover:bg-red-50">
                  <AlertCircle size={16} className="shrink-0 text-red-500" />
                  <p className="flex-1 text-[13px] font-bold text-[#0B1E38]">{n(attendancePending)} جلسة بلا سجل حضور</p>
                  <ChevronLeft size={14} className="text-slate-400" />
                </Link>
              )}
              {oralPending > 0 && (
                <Link to="/dashboard/instructor/oral-assessments" className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3 transition hover:bg-sky-50">
                  <MessageSquare size={16} className="shrink-0 text-sky-500" />
                  <p className="flex-1 text-[13px] font-bold text-[#0B1E38]">{n(oralPending)} مقابلة شفوية معلّقة</p>
                  <ChevronLeft size={14} className="text-slate-400" />
                </Link>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* ── Upcoming Sessions ── */}
      {!isLoading && upcomingSessions.length > 0 && (
        <Section title="الجلسات القادمة" href="/dashboard/instructor/sessions" hrefLabel="كل الجلسات">
          <div className="p-6 space-y-2">
            {upcomingSessions.map((s, i) => <UpcomingRow key={s.id} session={s} i={i} />)}
          </div>
        </Section>
      )}

      {/* ── Assignments Waiting ── */}
      <Section title="واجبات تنتظر التصحيح" href="/dashboard/instructor/submissions" hrefLabel="كل التسليمات">
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Sk key={i} h="h-14" />)}
            </div>
          ) : pendingSubmissions.length === 0 ? (
            <EmptyAssignments />
          ) : (
            <>
              <div className="space-y-2">
                {pendingSubmissions.map((s, i) => <AssignmentWaitingRow key={s.id} sub={s} i={i} />)}
              </div>
              {submissionsPending > pendingSubmissions.length && (
                <div className="mt-3 border-t border-slate-100 pt-3 text-center">
                  <Link to="/dashboard/instructor/submissions" className="text-[12px] font-bold text-[#0077B6] hover:underline">
                    + {n(submissionsPending - pendingSubmissions.length)} تسليمات أخرى
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </Section>

      {/* ── My Active Courses (max 6, prioritized) ── */}
      <Section title="دوراتي النشطة" href="/dashboard/instructor/courses" hrefLabel="كل الدورات">
        <div className="p-6">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-100">
                  <Sk h="h-28" rounded="rounded-none" />
                  <div className="space-y-3 p-4"><Sk h="h-4" w="w-3/4" /><Sk h="h-3" w="w-1/2" /><Sk h="h-8" /></div>
                </div>
              ))}
            </div>
          ) : prioritizedCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <GraduationCap size={22} className="text-slate-300" />
              </div>
              <p className="font-black text-[#0B1E38]">لا توجد دورات نشطة</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {prioritizedCourses.map((cp, i) => <ActiveCourseCard key={cp.course.id} cp={cp} i={i} />)}
              </div>
              {activeCourseCount > 6 && (
                <div className="mt-4 text-center">
                  <Link
                    to="/dashboard/instructor/courses"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#0077B6]/20 bg-[#0077B6]/[0.06] px-5 py-2.5 text-[12px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/[0.10]"
                  >
                    <BookOpen size={13} />
                    عرض كل الدورات ({n(activeCourseCount)})
                    <ChevronLeft size={13} />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </Section>

      {/* ── Recent Activity ── */}
      {!isLoading && recentActivity.length > 0 && (
        <Section title="النشاط الأخير">
          <div className="divide-y divide-slate-50 px-6">
            {recentActivity.map((item, i) => <ActivityRow key={item.id} item={item} i={i} />)}
          </div>
          <div className="px-6 pb-4" />
        </Section>
      )}

      {/* ── Charts row ── */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="grid gap-5 lg:grid-cols-2"
        >
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                <Zap size={13} className="text-violet-600" />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">جلسات الأسبوع</h3>
            </div>
            <BarChart data={weeklySessionsData} label="عدد الجلسات لكل يوم" />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50">
                <ClipboardList size={13} className="text-orange-500" />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">تسليمات الأسبوع</h3>
            </div>
            <BarChart data={submissionsWeekData} label="عدد التسليمات لكل يوم" />
          </div>
        </motion.div>
      )}
    </div>
  )
}
