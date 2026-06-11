import axios from 'axios'
import { useEffect, useState } from 'react'
import { UserCheck } from 'lucide-react'
import {
  fetchInstructorAttendanceSession,
  fetchInstructorSessions,
  fetchInstructorStudents,
  putInstructorAttendance,
} from '@/api/instructorApi'
import type { AttendanceRow, AttendanceStatus, LmsSession } from '@/types/lms'
import { AttendanceTable } from '@/components/lms'
import { InstructorEmptyState, InstructorHero } from '@/components/instructor'

export default function InstructorAttendancePage() {
  const [sessions,    setSessions]    = useState<LmsSession[]>([])
  const [sessionId,   setSessionId]   = useState<number | ''>('')
  const [rows,        setRows]        = useState<AttendanceRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadingRows, setLoadingRows] = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [apiMissing,  setApiMissing]  = useState(false)
  const [notice,      setNotice]      = useState<{ ok?: boolean; text: string } | null>(null)

  useEffect(() => {
    let alive = true
    fetchInstructorSessions()
      .then((list) => { if (alive) setSessions(list) })
      .catch((err) => {
        if (!alive || axios.isCancel(err)) return
        setApiMissing(true)
        if (import.meta.env.DEV) console.error('[attendance] sessions load failed:', err)
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (sessionId === '') { setRows([]); return }
    let alive = true
    setLoadingRows(true)
    setNotice(null)
    fetchInstructorAttendanceSession(Number(sessionId))
      .then((existing) => {
        if (!alive) return
        if (existing.length > 0) { setRows(existing); return }
        return fetchInstructorStudents({ session_id: Number(sessionId) }).then((users) => {
          if (!alive) return
          setRows(users.map((u) => ({ student_id: u.id, student_name: u.name, email: u.email ?? null, status: null })))
        })
      })
      .catch(() => {
        if (!alive) return
        fetchInstructorStudents({ session_id: Number(sessionId) })
          .then((users) => {
            if (!alive) return
            setRows(users.map((u) => ({ student_id: u.id, student_name: u.name, email: u.email ?? null, status: null })))
          })
          .catch((err) => {
            if (import.meta.env.DEV) console.error('[attendance] students load failed:', err)
            setRows([])
          })
      })
      .finally(() => { if (alive) setLoadingRows(false) })
    return () => { alive = false }
  }, [sessionId])

  function updateRow(studentId: number, status: AttendanceStatus) {
    setRows((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, status } : r)))
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
        rows.map((r) => ({ student_id: r.student_id, status: r.status! })),
      )
      setNotice({ ok: true, text: 'تم حفظ الحضور بنجاح.' })
    } catch (err) {
      if (import.meta.env.DEV) console.error('[attendance] save failed:', err)
      setNotice({ ok: false, text: 'تعذر الحفظ — تحقق من صلاحياتك أو نقطة النهاية على الخادم.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-16" dir="rtl">

      <InstructorHero
        title="تسجيل الحضور"
        subtitle="اختر الجلسة، حدّث الحالة، ثم احفظ دفعة واحدة"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        refreshing={loading}
        pills={loading ? [] : [{ label: 'جلسة متاحة', value: sessions.length }]}
      />

      {apiMissing && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
          تحقق من{' '}
          <code className="rounded bg-white/80 px-1">PUT /api/instructor/attendance/{'{session}'}</code>.
        </div>
      )}

      {/* Session picker + save */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="grid gap-1.5">
            <span className="text-[11px] font-black text-deepBlue">الجلسة</span>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value === '' ? '' : Number(e.target.value))}
              className="min-w-[260px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
              dir="rtl"
            >
              <option value="">— اختر جلسة —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title ?? s.course_name} · {(s as Record<string, unknown>).date as string ?? s.starts_at ?? s.id}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={sessionId === '' || saving || loadingRows || rows.length === 0}
            onClick={save}
            className="rounded-xl bg-[#EC943C] px-6 py-3 text-[13px] font-black text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ الحضور'}
          </button>
        </div>

        {sessionId !== '' && rows.length > 0 && !loadingRows && (
          <p className="mt-3 text-[11px] font-semibold text-deepBlue/40">
            {rows.length} طالب في هذه الجلسة
          </p>
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
          description="بعد اختيار الجلسة ستظهر قائمة الطلاب هنا"
        />
      ) : loadingRows ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : rows.length === 0 ? (
        <InstructorEmptyState
          icon={UserCheck}
          title="لا يوجد طلاب لهذه الجلسة"
          description="لا توجد بيانات متاحة لهذه الجلسة حالياً"
        />
      ) : (
        <AttendanceTable rows={rows} onChange={updateRow} disabled={saving} />
      )}
    </div>
  )
}
