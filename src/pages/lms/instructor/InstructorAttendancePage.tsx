import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BookOpen,
  GraduationCap,
  Lock,
  RefreshCw,
  Save,
  UserCheck,
  Users,
} from 'lucide-react'
import DashboardBreadcrumbs from '@/components/ui/DashboardBreadcrumbs'
import {
  type AttendanceSessionResult,
  fetchInstructorAttendanceSession,
  fetchInstructorSessions,
  mergeAttendanceRows,
  putInstructorAttendance,
} from '@/api/instructorApi'
import type { AttendanceRow, LmsSession } from '@/types/lms'
import { AttendanceTable } from '@/components/lms'
import { InstructorHero } from '@/components/instructor'
import { formatSessionPickerLabel } from '@/utils/lmsSession'
import toast from '@/lib/toast'

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n)

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('ar', {
      timeZone: 'Europe/Amsterdam',
      numberingSystem: 'latn',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

const STAT_COLORS = {
  present: { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-200', label: 'حاضر' },
  absent:  { bg: 'bg-rose-500',    text: 'text-rose-700',    light: 'bg-rose-50',    border: 'border-rose-200',    label: 'غائب'   },
  late:    { bg: 'bg-amber-500',   text: 'text-amber-700',   light: 'bg-amber-50',   border: 'border-amber-200',   label: 'متأخر'  },
  excused: { bg: 'bg-sky-500',     text: 'text-sky-700',     light: 'bg-sky-50',     border: 'border-sky-200',     label: 'معذور'  },
}

function cloneRows(rows: AttendanceRow[]): AttendanceRow[] {
  return rows.map((r) => ({ ...r }))
}

function SelectField({
  label,
  icon: Icon,
  value,
  onChange,
  children,
  disabled,
}: {
  label: string
  icon: React.ElementType
  value: string | number
  onChange: (v: string) => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <label className="grid min-w-0 gap-1">
      <span className="flex items-center gap-1.5 text-[10px] font-black text-[#0C2A4B]/70">
        <Icon className="h-3.5 w-3.5 text-[#0077B6]" />
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        dir="rtl"
        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-[#0C2A4B] outline-none focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 disabled:opacity-50"
      >
        {children}
      </select>
    </label>
  )
}

export default function InstructorAttendancePage() {
  const [searchParams] = useSearchParams()
  const paramCourseId  = searchParams.get('course_id')  ? Number(searchParams.get('course_id'))  : null
  const paramSessionId = searchParams.get('session_id') ? Number(searchParams.get('session_id')) : null

  const [sessions,    setSessions]    = useState<LmsSession[]>([])
  const [courseId,    setCourseId]    = useState<number | ''>('')
  const [sessionId,   setSessionId]   = useState<number | ''>('')
  const [rows,        setRows]        = useState<AttendanceRow[]>([])
  const [baseline,    setBaseline]    = useState<AttendanceRow[]>([])
  const [lockInfo,    setLockInfo]    = useState<Pick<AttendanceSessionResult, 'is_locked' | 'locked_at' | 'locked_by'>>({
    is_locked: false, locked_at: null, locked_by: null,
  })
  const [loading,     setLoading]     = useState(true)
  const [loadingRows, setLoadingRows] = useState(false)
  const [saving,      setSaving]      = useState(false)

  // Load all sessions on mount (or for specific course if URL param present)
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchInstructorSessions(paramCourseId ? { course_id: paramCourseId } : undefined)
      .then((sess) => {
        if (!alive) return
        setSessions(sess)
        // Apply URL param pre-selections after sessions load
        if (paramSessionId) {
          setSessionId(paramSessionId)
        } else if (paramCourseId) {
          setCourseId(paramCourseId)
        }
      })
      .catch((err) => { if (!alive || axios.isCancel(err)) return })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  // Only run once on mount — URL params are read once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Unique courses derived from loaded sessions
  const courses = useMemo(() => {
    const seen = new Set<number>()
    const list: { id: number; title: string }[] = []
    sessions.forEach((s) => {
      if (s.course_id && !seen.has(s.course_id)) {
        seen.add(s.course_id)
        list.push({ id: s.course_id, title: s.course_name || `دورة #${s.course_id}` })
      }
    })
    return list.sort((a, b) => a.title.localeCompare(b.title, 'ar'))
  }, [sessions])

  // Sessions filtered by selected course
  const filteredSessions = useMemo(() => {
    if (courseId === '') return sessions
    return sessions.filter((s) => s.course_id === courseId)
  }, [sessions, courseId])

  const selectedSession = useMemo(
    () => (sessionId !== '' ? sessions.find((s) => s.id === Number(sessionId)) ?? null : null),
    [sessions, sessionId],
  )

  // Auto-select nearest upcoming session when course changes
  useEffect(() => {
    if (courseId === '' || filteredSessions.length === 0) return
    // Don't auto-select if a session from URL param is already selected for this course
    if (sessionId !== '' && filteredSessions.some((s) => s.id === Number(sessionId))) return

    const now = Date.now()
    const upcoming = filteredSessions
      .filter((s) => s.starts_at && Date.parse(s.starts_at) > now)
      .sort((a, b) => Date.parse(a.starts_at!) - Date.parse(b.starts_at!))
    const nearest = upcoming[0] ?? filteredSessions[filteredSessions.length - 1]
    if (nearest) setSessionId(nearest.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, filteredSessions])

  // Load attendance rows when session changes
  const loadAttendanceRows = useCallback(async (sid: number) => {
    setLoadingRows(true)
    try {
      const sessionResult = await fetchInstructorAttendanceSession(sid)
      setLockInfo({
        is_locked: sessionResult.is_locked,
        locked_at: sessionResult.locked_at,
        locked_by: sessionResult.locked_by,
      })

      // Backend show() returns ALL enrolled students with attendance merged.
      // If rows came back (even with null status), use them as the authoritative roster.
      // Only fall back to mergeAttendanceRows if rows is completely empty (no enrollment data).
      const merged = sessionResult.rows.length > 0
        ? sessionResult.rows
        : mergeAttendanceRows([], [])

      setRows(cloneRows(merged))
      setBaseline(cloneRows(merged))
    } catch (err) {
      if (import.meta.env.DEV) console.error('[attendance] rows load failed:', err)
      setRows([])
      setBaseline([])
    } finally {
      setLoadingRows(false)
    }
  }, [])

  useEffect(() => {
    if (sessionId === '') {
      setRows([])
      setBaseline([])
      return
    }
    void loadAttendanceRows(Number(sessionId))
  }, [sessionId, loadAttendanceRows])

  function updateRow(studentId: number, patch: { status?: AttendanceRow['status']; notes?: string | null }) {
    setRows((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, ...patch } : r)))
  }

  function markAllPresent() {
    setRows((prev) => prev.map((r) => ({ ...r, status: 'present' as const })))
  }

  function clearAll() {
    setRows((prev) => prev.map((r) => ({ ...r, status: null, notes: null })))
  }

  const hasUnsavedChanges = useMemo(() => {
    if (rows.length !== baseline.length) return true
    const base = new Map(baseline.map((r) => [r.student_id, r]))
    return rows.some((r) => {
      const saved = base.get(r.student_id)
      if (!saved) return true
      return (r.status ?? '') !== (saved.status ?? '') || (r.notes ?? '') !== (saved.notes ?? '')
    })
  }, [rows, baseline])

  async function save() {
    if (sessionId === '') return
    if (lockInfo.is_locked) {
      toast.error('تم حفظ الحضور مسبقاً ولا يمكن تعديله.')
      return
    }
    if (rows.some((r) => !r.status)) {
      toast.error('يرجى تحديد حالة الحضور لكل طالب قبل الحفظ.')
      return
    }
    setSaving(true)
    try {
      await putInstructorAttendance(
        Number(sessionId),
        rows.map((r) => ({ student_id: r.student_id, status: r.status!, notes: r.notes?.trim() || null })),
      )
      toast.success('تم حفظ الحضور بنجاح وتم قفله.')
      await loadAttendanceRows(Number(sessionId))
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 423) {
        toast.error('تم حفظ الحضور مسبقاً ولا يمكن تعديله.')
        setLockInfo({ is_locked: true, locked_at: null, locked_by: null })
      } else {
        if (import.meta.env.DEV) console.error('[attendance] save failed:', err)
        toast.error('تعذّر الحفظ — تحقق من صلاحياتك أو نقطة النهاية على الخادم.')
      }
    } finally {
      setSaving(false)
    }
  }

  const attendanceSummary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 }
    rows.forEach((r) => { if (r.status && r.status in counts) counts[r.status as keyof typeof counts]++ })
    return counts
  }, [rows])

  const markedCount = rows.filter((r) => r.status).length
  const showRoster  = sessionId !== '' && !loadingRows && rows.length > 0

  return (
    <div className="space-y-4 pb-24" dir="rtl">
      <DashboardBreadcrumbs items={[
        { label: 'دوراتي', href: '/dashboard/instructor/courses' },
        { label: 'الحضور' },
      ]} />
      <InstructorHero
        title="تسجيل الحضور"
        subtitle="اختر الدورة والجلسة، حدّد حالات الطلاب، ثم احفظ"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        refreshing={loading}
        pills={loading ? [] : [
          { label: 'دورة',  value: fmt(courses.length)  },
          { label: 'جلسة', value: fmt(sessions.length) },
        ]}
      />

      {/* Filters toolbar */}
      <div className="sticky top-16 z-20 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">

          {/* Course filter */}
          <SelectField
            label="الدورة"
            icon={GraduationCap}
            value={courseId}
            onChange={(v) => {
              setCourseId(v === '' ? '' : Number(v))
              setSessionId('')
            }}
            disabled={loading}
          >
            <option value="">— كل الدورات —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </SelectField>

          {/* Session filter */}
          <SelectField
            label="الجلسة"
            icon={BookOpen}
            value={sessionId}
            onChange={(v) => setSessionId(v === '' ? '' : Number(v))}
            disabled={loading || filteredSessions.length === 0}
          >
            <option value="">— اختر جلسة —</option>
            {filteredSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {formatSessionPickerLabel(s)}
              </option>
            ))}
          </SelectField>

          {lockInfo.is_locked ? (
            <div className="flex h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-[12px] font-black text-amber-700">
              <Lock className="h-4 w-4" />
              تم الحفظ — مقفل
            </div>
          ) : (
            <button
              type="button"
              disabled={sessionId === '' || saving || loadingRows || rows.length === 0}
              onClick={() => void save()}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#F28C00] px-5 text-[12px] font-black text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'جارٍ الحفظ…' : 'حفظ الحضور'}
            </button>
          )}
        </div>

        {/* Session context info */}
        {selectedSession && (
          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              {selectedSession.course_name && (
                <span className="flex items-center gap-1 font-semibold text-[#0077B6]">
                  <BookOpen className="h-3 w-3" />
                  {selectedSession.course_name}
                </span>
              )}
              {selectedSession.title && selectedSession.title !== selectedSession.course_name && (
                <span className="font-black text-[#0C2A4B]">{selectedSession.title}</span>
              )}
              {selectedSession.starts_at && (
                <span className="text-slate-400">{fmtDate(selectedSession.starts_at)}</span>
              )}
            </div>
          </div>
        )}

        {/* Attendance stats bar */}
        {sessionId !== '' && rows.length > 0 && !loadingRows && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-[#0C2A4B]/70">
              <Users className="h-3.5 w-3.5" />
              {fmt(rows.length)} طالب
            </span>
            <span className="rounded-lg bg-[#0077B6]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0077B6]">
              {fmt(markedCount)} محدّد
            </span>
            {lockInfo.is_locked ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-200">
                <Lock className="h-3 w-3" />
                تم حفظ الحضور ولا يمكن تعديله
              </span>
            ) : hasUnsavedChanges ? (
              <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-200">
                تغييرات غير محفوظة
              </span>
            ) : null}
            {Object.entries(attendanceSummary).map(([status, count]) => {
              if (count === 0) return null
              const cfg = STAT_COLORS[status as keyof typeof STAT_COLORS]
              return (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1 rounded-lg border ${cfg.border} ${cfg.light} px-2 py-1 text-[10px] font-black ${cfg.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.bg}`} />
                  {cfg.label}: {fmt(count)}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Main content area */}
      {sessionId === '' ? (
        courseId === '' && sessions.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <UserCheck className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-base font-black text-[#0C2A4B]">لا توجد جلسات</p>
            <p className="mx-auto mt-2 max-w-xs text-[13px] text-slate-400">
              لم يتم إنشاء جلسات لدوراتك بعد
            </p>
          </div>
        ) : courseId !== '' && filteredSessions.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-base font-black text-[#0C2A4B]">لا توجد جلسات لهذه الدورة</p>
            <p className="mx-auto mt-2 max-w-xs text-[13px] text-slate-400">
              أنشئ جلسة للدورة أولاً
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <UserCheck className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-base font-black text-[#0C2A4B]">اختر جلسة للبدء</p>
            <p className="mx-auto mt-2 max-w-xs text-[13px] text-slate-400">
              يمكنك تصفية الجلسات حسب الدورة أولاً، ثم اختيار الجلسة
            </p>
          </div>
        )
      ) : loadingRows ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <Users className="mb-3 h-10 w-10 text-slate-200" />
          <p className="font-black text-[#0C2A4B]">لا يوجد طلاب مسجّلون في هذه الدورة</p>
        </div>
      ) : (
        <AttendanceTable
          rows={rows}
          baseline={baseline}
          onChange={updateRow}
          disabled={saving || lockInfo.is_locked}
          onMarkAllPresent={lockInfo.is_locked ? undefined : markAllPresent}
          onClearAll={lockInfo.is_locked ? undefined : clearAll}
        />
      )}

      {/* Mobile fixed save bar */}
      {showRoster && !lockInfo.is_locked && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.15)] backdrop-blur-sm lg:hidden">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F28C00] py-3 text-[13px] font-black text-white disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {hasUnsavedChanges ? 'حفظ التغييرات' : 'حفظ الحضور'}
          </button>
        </div>
      )}

      {/* Desktop fixed save bar (only when unsaved changes) */}
      {showRoster && !lockInfo.is_locked && hasUnsavedChanges && (
        <div className="fixed inset-x-0 bottom-0 z-30 hidden border-t border-slate-200 bg-white/95 px-6 py-3 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.15)] backdrop-blur-sm lg:block">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <p className="text-[13px] font-bold text-amber-700">لديك تغييرات غير محفوظة</p>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0077B6] px-5 py-2.5 text-[12px] font-black text-white disabled:opacity-50"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ الحضور
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
