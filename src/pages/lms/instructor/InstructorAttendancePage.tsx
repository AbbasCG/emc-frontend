import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  RefreshCw,
  Route,
  Save,
  UserCheck,
  Users,
} from 'lucide-react'
import {
  fetchInstructorAttendanceSession,
  fetchInstructorSessions,
  fetchInstructorStudents,
  mergeAttendanceRows,
  putInstructorAttendance,
  usersToAttendanceRows,
} from '@/api/instructorApi'
import { fetchClassGroupStudents, fetchInstructorClasses, type ClassGroup } from '@/api/placementApi'
import { fetchInstructorLearningPaths, type LearningPath } from '@/api/learningPathsApi'
import type { AttendanceRow, LmsSession } from '@/types/lms'
import { AttendanceTable } from '@/components/lms'
import { InstructorHero } from '@/components/instructor'
import { formatSessionPickerLabel } from '@/utils/lmsSession'

/* ── Helpers ───────────────────────────────────────────────────────────── */

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n)

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('ar', {
      numberingSystem: 'latn',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

/* ── Attendance status summary ────────────────────────────────────────── */

const STAT_COLORS = {
  present: { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-200', label: 'حاضر' },
  absent:  { bg: 'bg-rose-500',    text: 'text-rose-700',    light: 'bg-rose-50',    border: 'border-rose-200',    label: 'غائب'  },
  late:    { bg: 'bg-amber-500',   text: 'text-amber-700',   light: 'bg-amber-50',   border: 'border-amber-200',   label: 'متأخر' },
  excused: { bg: 'bg-sky-500',     text: 'text-sky-700',     light: 'bg-sky-50',     border: 'border-sky-200',     label: 'معذور' },
}

/* ── Select field ─────────────────────────────────────────────────────── */

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
    <label className="grid gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-black text-[#22334A]">
        <Icon className="h-3.5 w-3.5 text-[#2691C2]" />
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          dir="rtl"
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pl-9 text-[13px] font-semibold text-[#22334A] outline-none focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100 disabled:opacity-50"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function InstructorAttendancePage() {
  const [classes,     setClasses]     = useState<ClassGroup[]>([])
  const [sessions,    setSessions]    = useState<LmsSession[]>([])
  const [lpPaths,     setLpPaths]     = useState<LearningPath[]>([])
  const [classId,     setClassId]     = useState<number | ''>('')
  const [sessionId,   setSessionId]   = useState<number | ''>('')
  const [rows,        setRows]        = useState<AttendanceRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadingRows, setLoadingRows] = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [apiMissing,  setApiMissing]  = useState(false)
  const [savedOnce,   setSavedOnce]   = useState(false)
  const [notice,      setNotice]      = useState<{ ok?: boolean; text: string } | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetchInstructorClasses(),
      fetchInstructorSessions(),
      fetchInstructorLearningPaths().then((r) => r.paths).catch(() => [] as LearningPath[]),
    ])
      .then(([cls, sess, paths]) => {
        if (!alive) return
        setClasses(cls)
        setSessions(sess)
        setLpPaths(paths)
      })
      .catch((err) => {
        if (!alive || axios.isCancel(err)) return
        setApiMissing(true)
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  /** Map course_id → LP title for showing LP context */
  const lpMap = useMemo(() => {
    const m = new Map<number, string>()
    lpPaths.forEach((lp) => {
      ;(lp.courses ?? []).forEach((c) => {
        if (!m.has(c.id)) m.set(c.id, lp.title)
      })
    })
    return m
  }, [lpPaths])

  const filteredSessions = useMemo(() => {
    if (classId === '') return sessions
    const cls = classes.find((c) => c.id === classId)
    if (!cls) return sessions
    return sessions.filter((s) => !s.course_id || s.course_id === cls.course_id)
  }, [sessions, classes, classId])

  /** The currently selected session object */
  const selectedSession = useMemo(
    () => (sessionId !== '' ? sessions.find((s) => s.id === Number(sessionId)) ?? null : null),
    [sessions, sessionId],
  )

  /** LP name for the selected session's course */
  const sessionLpName = useMemo(
    () => (selectedSession?.course_id != null ? lpMap.get(selectedSession.course_id) : null),
    [selectedSession, lpMap],
  )

  const loadRoster = useCallback(async (sid: number, gid: number | ''): Promise<AttendanceRow[]> => {
    if (gid !== '') {
      try {
        const classStudents = await fetchClassGroupStudents(Number(gid))
        if (classStudents.length > 0) {
          return classStudents.map((s) => ({
            student_id:   s.student_id,
            student_name: s.student_name,
            email:        s.student_email,
            avatar_url:   s.avatar_url ?? null,
            status:       null,
            notes:        null,
          }))
        }
      } catch {
        /* fallback below */
      }
    }

    const users = await fetchInstructorStudents({
      session_id:     sid,
      class_group_id: gid === '' ? undefined : Number(gid),
      course_id:      gid !== '' ? classes.find((c) => c.id === gid)?.course_id : undefined,
    })
    return usersToAttendanceRows(users)
  }, [classes])

  const loadAttendanceRows = useCallback(async (sid: number, gid: number | '') => {
    setLoadingRows(true)
    setNotice(null)
    setSavedOnce(false)
    try {
      const [saved, roster] = await Promise.all([
        fetchInstructorAttendanceSession(sid),
        loadRoster(sid, gid),
      ])
      if (saved.length > 0) {
        setRows(mergeAttendanceRows(saved, roster))
        setSavedOnce(saved.some((r) => r.status))
        return
      }
      setRows(roster)
    } catch (err) {
      if (import.meta.env.DEV) console.error('[attendance] rows load failed:', err)
      setRows([])
    } finally {
      setLoadingRows(false)
    }
  }, [loadRoster])

  useEffect(() => {
    if (sessionId === '') { setRows([]); setSavedOnce(false); return }
    void loadAttendanceRows(Number(sessionId), classId)
  }, [sessionId, classId, loadAttendanceRows])

  function updateRow(studentId: number, patch: { status?: AttendanceRow['status']; notes?: string | null }) {
    setRows((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, ...patch } : r)))
  }

  async function save() {
    if (sessionId === '') return
    if (rows.some((r) => !r.status)) {
      setNotice({ ok: false, text: 'يرجى تحديد حالة الحضور لكل طالب قبل الحفظ.' })
      return
    }
    setSaving(true)
    setNotice(null)
    try {
      await putInstructorAttendance(
        Number(sessionId),
        rows.map((r) => ({
          student_id: r.student_id,
          status:     r.status!,
          notes:      r.notes?.trim() || null,
        })),
      )
      setNotice({ ok: true, text: 'تم حفظ الحضور بنجاح.' })
      setSavedOnce(true)
      await loadAttendanceRows(Number(sessionId), classId)
    } catch (err) {
      if (import.meta.env.DEV) console.error('[attendance] save failed:', err)
      setNotice({ ok: false, text: 'تعذر الحفظ — تحقق من صلاحياتك أو نقطة النهاية على الخادم.' })
    } finally {
      setSaving(false)
    }
  }

  /* ── Stats ─── */
  const attendanceSummary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 }
    rows.forEach((r) => { if (r.status && r.status in counts) counts[r.status as keyof typeof counts]++ })
    return counts
  }, [rows])

  const markedCount = rows.filter((r) => r.status).length

  return (
    <div className="space-y-5 pb-16" dir="rtl">

      <InstructorHero
        title="تسجيل الحضور"
        subtitle="اختر الجلسة، سجّل حضور الطلاب، ثم احفظ"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        refreshing={loading}
        pills={loading ? [] : [
          { label: 'صف', value: fmt(classes.length) },
          { label: 'جلسة', value: fmt(sessions.length) },
        ]}
      />

      {apiMissing && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
          تحقق من نقاط نهاية الحضور على الخادم.
        </div>
      )}

      {/* ── Selector card ──────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#22334A]/8">
            <UserCheck className="h-4 w-4 text-[#22334A]" />
          </div>
          <div>
            <p className="text-[13px] font-black text-[#22334A]">اختر الجلسة</p>
            <p className="text-[11px] text-slate-400">يمكنك تصفية الجلسات حسب الصف أولاً</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="الصف / المجموعة"
            icon={GraduationCap}
            value={classId}
            onChange={(v) => { setClassId(v === '' ? '' : Number(v)); setSessionId('') }}
            disabled={loading}
          >
            <option value="">— كل الصفوف —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.course_title ? ` · ${c.course_title}` : ''}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="الجلسة"
            icon={BookOpen}
            value={sessionId}
            onChange={(v) => setSessionId(v === '' ? '' : Number(v))}
            disabled={loading}
          >
            <option value="">— اختر جلسة —</option>
            {filteredSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {formatSessionPickerLabel(s)}
              </option>
            ))}
          </SelectField>

          <div className="flex items-end">
            <button
              type="button"
              disabled={sessionId === '' || saving || loadingRows || rows.length === 0}
              onClick={() => void save()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#EC943C] px-6 py-3 text-[13px] font-black text-white shadow-[0_8px_20px_rgba(236,148,60,0.3)] transition hover:brightness-105 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'جارٍ الحفظ...' : 'حفظ الحضور'}
            </button>
          </div>
        </div>

        {/* Session context (course + LP) */}
        {selectedSession && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
            {selectedSession.course_name && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#2691C2]">
                <BookOpen className="h-3 w-3" />
                {selectedSession.course_name}
              </span>
            )}
            {sessionLpName && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#EC943C]">
                <Route className="h-3 w-3" />
                {sessionLpName}
              </span>
            )}
            {selectedSession.starts_at && (
              <span className="text-[11px] text-slate-400">
                {fmtDate(selectedSession.starts_at)}
              </span>
            )}
          </div>
        )}

        {/* Summary stats */}
        {sessionId !== '' && rows.length > 0 && !loadingRows && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-[#22334A]/70">
              <Users className="h-3.5 w-3.5" />
              {fmt(rows.length)} طالب
            </span>
            <span className="rounded-xl bg-[#2691C2]/10 px-3 py-1.5 text-[11px] font-semibold text-[#2691C2]">
              {fmt(markedCount)} محدّد
            </span>
            {savedOnce && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5" />
                سجل محفوظ
              </span>
            )}
            {/* Status breakdown */}
            {markedCount > 0 && Object.entries(attendanceSummary).map(([status, count]) => {
              if (count === 0) return null
              const cfg = STAT_COLORS[status as keyof typeof STAT_COLORS]
              return (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1 rounded-xl border ${cfg.border} ${cfg.light} px-2.5 py-1 text-[10px] font-black ${cfg.text}`}
                >
                  <span className={`h-2 w-2 rounded-full ${cfg.bg}`} />
                  {cfg.label}: {fmt(count)}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Notice ──────────────────────────────────────────────────────── */}
      {notice && (
        <div className={notice.ok
          ? 'flex items-center gap-3 rounded-2xl bg-emerald-50 px-5 py-3.5 text-[13px] font-bold text-emerald-800 ring-1 ring-emerald-100'
          : 'rounded-2xl bg-red-50 px-5 py-3.5 text-right text-[13px] font-bold text-red-700 ring-1 ring-red-100'
        }>
          {notice.ok && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
          {notice.text}
        </div>
      )}

      {/* ── Roster ──────────────────────────────────────────────────────── */}
      {sessionId === '' ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
            <UserCheck className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-base font-black text-[#22334A]">اختر جلسة للبدء</p>
          <p className="mx-auto mt-2 max-w-xs text-[13px] text-slate-400">
            يمكنك تصفية الجلسات حسب الصف أولاً، ثم اختيار الجلسة
          </p>
        </div>
      ) : loadingRows ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-slate-200" />
          <p className="font-black text-[#22334A]">لا يوجد طلاب لهذه الجلسة</p>
          <p className="mt-1 text-[12px] text-slate-400">
            تأكد من اختيار الصف الصحيح أو من ربط الطلاب بالجلسة على الخادم
          </p>
        </div>
      ) : (
        <AttendanceTable rows={rows} onChange={updateRow} disabled={saving} />
      )}
    </div>
  )
}
