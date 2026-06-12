import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, GraduationCap, UserCheck } from 'lucide-react'
import {
  fetchInstructorAttendanceSession,
  fetchInstructorSessions,
  fetchInstructorStudents,
  mergeAttendanceRows,
  putInstructorAttendance,
  usersToAttendanceRows,
} from '@/api/instructorApi'
import { fetchClassGroupStudents, fetchInstructorClasses, type ClassGroup } from '@/api/placementApi'
import type { AttendanceRow, LmsSession } from '@/types/lms'
import { AttendanceTable } from '@/components/lms'
import { InstructorEmptyState, InstructorHero } from '@/components/instructor'
import { formatSessionPickerLabel } from '@/utils/lmsSession'

export default function InstructorAttendancePage() {
  const [classes,     setClasses]     = useState<ClassGroup[]>([])
  const [sessions,    setSessions]    = useState<LmsSession[]>([])
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
    Promise.all([fetchInstructorClasses(), fetchInstructorSessions()])
      .then(([cls, sess]) => {
        if (!alive) return
        setClasses(cls)
        setSessions(sess)
      })
      .catch((err) => {
        if (!alive || axios.isCancel(err)) return
        setApiMissing(true)
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const filteredSessions = useMemo(() => {
    if (classId === '') return sessions
    const cls = classes.find((c) => c.id === classId)
    if (!cls) return sessions
    return sessions.filter((s) => !s.course_id || s.course_id === cls.course_id)
  }, [sessions, classes, classId])

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
          status: r.status!,
          notes: r.notes?.trim() || null,
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

  const markedCount = rows.filter((r) => r.status).length

  return (
    <div className="space-y-6 pb-16" dir="rtl">

      <InstructorHero
        title="تسجيل الحضور"
        subtitle="اختر الصف أو الجلسة، حدّث حالة كل طالب، ثم احفظ"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        refreshing={loading}
        pills={loading ? [] : [
          { label: 'صف', value: classes.length },
          { label: 'جلسة', value: sessions.length },
        ]}
      />

      {apiMissing && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
          تحقق من نقاط نهاية الحضور على الخادم.
        </div>
      )}

      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-deepBlue/[0.04]">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label className="grid gap-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-black text-deepBlue">
              <GraduationCap className="h-3.5 w-3.5 text-[#2691C2]" />
              الصف / المجموعة
            </span>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value === '' ? '' : Number(e.target.value))
                setSessionId('')
              }}
              className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
              dir="rtl"
            >
              <option value="">— كل الصفوف —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.course_title ? ` · ${c.course_title}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-black text-deepBlue">
              <UserCheck className="h-3.5 w-3.5 text-[#EC943C]" />
              الجلسة
            </span>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value === '' ? '' : Number(e.target.value))}
              className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
              dir="rtl"
            >
              <option value="">— اختر جلسة —</option>
              {filteredSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatSessionPickerLabel(s)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={sessionId === '' || saving || loadingRows || rows.length === 0}
            onClick={() => void save()}
            className="rounded-2xl bg-[#EC943C] px-6 py-3 text-[13px] font-black text-white shadow-[0_10px_24px_rgba(236,148,60,0.35)] transition hover:brightness-105 disabled:opacity-50"
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ الحضور'}
          </button>
        </div>

        {sessionId !== '' && rows.length > 0 && !loadingRows && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-semibold">
            <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-deepBlue/65">
              {rows.length} طالب
            </span>
            <span className="rounded-xl bg-[#2691C2]/10 px-3 py-1.5 text-[#2691C2]">
              {markedCount} محدّد
            </span>
            {savedOnce && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-emerald-700 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5" />
                سجل محفوظ
              </span>
            )}
          </div>
        )}
      </div>

      {notice && (
        <div className={notice.ok
          ? 'rounded-2xl bg-emerald-50 px-5 py-3.5 text-right text-[13px] font-bold text-emerald-800 ring-1 ring-emerald-100'
          : 'rounded-2xl bg-red-50 px-5 py-3.5 text-right text-[13px] font-bold text-red-700 ring-1 ring-red-100'
        }>
          {notice.text}
        </div>
      )}

      {sessionId === '' ? (
        <InstructorEmptyState
          icon={UserCheck}
          title="اختر جلسة للبدء"
          description="يمكنك تصفية الجلسات حسب الصف أولاً، ثم اختيار الجلسة"
        />
      ) : loadingRows ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-slate-100" />)}
        </div>
      ) : rows.length === 0 ? (
        <InstructorEmptyState
          icon={UserCheck}
          title="لا يوجد طلاب لهذه الجلسة"
          description="تأكد من اختيار الصف الصحيح أو من ربط الطلاب بالجلسة على الخادم"
        />
      ) : (
        <AttendanceTable rows={rows} onChange={updateRow} disabled={saving} />
      )}
    </div>
  )
}
