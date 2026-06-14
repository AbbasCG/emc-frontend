import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
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
import toast from '@/lib/toast'

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

const STAT_COLORS = {
  present: { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-200', label: 'حاضر' },
  absent: { bg: 'bg-rose-500', text: 'text-rose-700', light: 'bg-rose-50', border: 'border-rose-200', label: 'غائب' },
  late: { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', border: 'border-amber-200', label: 'متأخر' },
  excused: { bg: 'bg-sky-500', text: 'text-sky-700', light: 'bg-sky-50', border: 'border-sky-200', label: 'معذور' },
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
      <span className="flex items-center gap-1.5 text-[10px] font-black text-[#22334A]/70">
        <Icon className="h-3.5 w-3.5 text-[#2691C2]" />
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        dir="rtl"
        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-[#22334A] outline-none focus:border-[#2691C2] focus:ring-4 focus:ring-[#2691C2]/10 disabled:opacity-50"
      >
        {children}
      </select>
    </label>
  )
}

export default function InstructorAttendancePage() {
  const [classes, setClasses] = useState<ClassGroup[]>([])
  const [sessions, setSessions] = useState<LmsSession[]>([])
  const [lpPaths, setLpPaths] = useState<LearningPath[]>([])
  const [classId, setClassId] = useState<number | ''>('')
  const [sessionId, setSessionId] = useState<number | ''>('')
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [baseline, setBaseline] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRows, setLoadingRows] = useState(false)
  const [saving, setSaving] = useState(false)

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
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

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

  const selectedSession = useMemo(
    () => (sessionId !== '' ? sessions.find((s) => s.id === Number(sessionId)) ?? null : null),
    [sessions, sessionId],
  )

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
            student_id: s.student_id,
            student_name: s.student_name,
            email: s.student_email,
            avatar_url: s.avatar_url ?? null,
            status: null,
            notes: null,
          }))
        }
      } catch {
        /* fallback below */
      }
    }

    const users = await fetchInstructorStudents({
      session_id: sid,
      class_group_id: gid === '' ? undefined : Number(gid),
      course_id: gid !== '' ? classes.find((c) => c.id === gid)?.course_id : undefined,
    })
    return usersToAttendanceRows(users)
  }, [classes])

  const loadAttendanceRows = useCallback(async (sid: number, gid: number | '') => {
    setLoadingRows(true)
    try {
      const [saved, roster] = await Promise.all([
        fetchInstructorAttendanceSession(sid),
        loadRoster(sid, gid),
      ])
      const merged = saved.length > 0 ? mergeAttendanceRows(saved, roster) : roster
      setRows(cloneRows(merged))
      setBaseline(cloneRows(merged))
    } catch (err) {
      if (import.meta.env.DEV) console.error('[attendance] rows load failed:', err)
      setRows([])
      setBaseline([])
    } finally {
      setLoadingRows(false)
    }
  }, [loadRoster])

  useEffect(() => {
    if (sessionId === '') {
      setRows([])
      setBaseline([])
      return
    }
    void loadAttendanceRows(Number(sessionId), classId)
  }, [sessionId, classId, loadAttendanceRows])

  function updateRow(
    studentId: number,
    patch: { status?: AttendanceRow['status']; notes?: string | null },
  ) {
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
    if (rows.some((r) => !r.status)) {
      toast.error('يرجى تحديد حالة الحضور لكل طالب قبل الحفظ.')
      return
    }
    setSaving(true)
    try {
      await putInstructorAttendance(
        Number(sessionId),
        rows.map((r) => ({
          student_id: r.student_id,
          status: r.status!,
          notes: r.notes?.trim() || null,
        })),
      )
      toast.success('تم حفظ الحضور بنجاح.')
      await loadAttendanceRows(Number(sessionId), classId)
    } catch (err) {
      if (import.meta.env.DEV) console.error('[attendance] save failed:', err)
      toast.error('تعذّر الحفظ — تحقق من صلاحياتك أو نقطة النهاية على الخادم.')
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
  const showRoster = sessionId !== '' && !loadingRows && rows.length > 0

  return (
    <div className="space-y-4 pb-24" dir="rtl">
      <InstructorHero
        title="تسجيل الحضور"
        subtitle="اختر الجلسة، حدّد حالات الطلاب بسرعة، ثم احفظ"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        refreshing={loading}
        pills={loading ? [] : [
          { label: 'صف', value: fmt(classes.length) },
          { label: 'جلسة', value: fmt(sessions.length) },
        ]}
      />

      {/* Compact toolbar */}
      <div className="sticky top-16 z-20 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
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

          <button
            type="button"
            disabled={sessionId === '' || saving || loadingRows || rows.length === 0}
            onClick={() => void save()}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#EC943C] px-5 text-[12px] font-black text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'جارٍ الحفظ…' : 'حفظ الحضور'}
          </button>
        </div>

        {selectedSession && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
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
              <span className="text-[11px] text-slate-400">{fmtDate(selectedSession.starts_at)}</span>
            )}
          </div>
        )}

        {sessionId !== '' && rows.length > 0 && !loadingRows && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-[#22334A]/70">
              <Users className="h-3.5 w-3.5" />
              {fmt(rows.length)} طالب
            </span>
            <span className="rounded-lg bg-[#2691C2]/10 px-2.5 py-1 text-[11px] font-semibold text-[#2691C2]">
              {fmt(markedCount)} محدّد
            </span>
            {hasUnsavedChanges && (
              <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-200">
                تغييرات غير محفوظة
              </span>
            )}
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

      {sessionId === '' ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <UserCheck className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-base font-black text-[#22334A]">اختر جلسة للبدء</p>
          <p className="mx-auto mt-2 max-w-xs text-[13px] text-slate-400">
            يمكنك تصفية الجلسات حسب الصف أولاً، ثم اختيار الجلسة
          </p>
        </div>
      ) : loadingRows ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <Users className="mb-3 h-10 w-10 text-slate-200" />
          <p className="font-black text-[#22334A]">لا يوجد طلاب لهذه الجلسة</p>
        </div>
      ) : (
        <AttendanceTable
          rows={rows}
          baseline={baseline}
          onChange={updateRow}
          disabled={saving}
          onMarkAllPresent={markAllPresent}
          onClearAll={clearAll}
        />
      )}

      {showRoster && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.15)] backdrop-blur-sm lg:hidden">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#EC943C] py-3 text-[13px] font-black text-white disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {hasUnsavedChanges ? 'حفظ التغييرات' : 'حفظ الحضور'}
          </button>
        </div>
      )}

      {showRoster && hasUnsavedChanges && (
        <div className="fixed inset-x-0 bottom-0 z-30 hidden border-t border-slate-200 bg-white/95 px-6 py-3 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.15)] backdrop-blur-sm lg:block">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <p className="text-[13px] font-bold text-amber-700">لديك تغييرات غير محفوظة</p>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2691C2] px-5 py-2.5 text-[12px] font-black text-white disabled:opacity-50"
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
