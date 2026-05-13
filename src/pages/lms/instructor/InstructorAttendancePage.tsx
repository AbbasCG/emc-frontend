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
import { DashboardSection } from '@/components/dashboard'
import { AttendanceTable, LmsEmptyState, LmsPageSkeleton } from '@/components/lms'

export default function InstructorAttendancePage() {
  const [sessions, setSessions] = useState<LmsSession[]>([])
  const [sessionId, setSessionId] = useState<number | ''>('')
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRows, setLoadingRows] = useState(false)
  const [saving, setSaving] = useState(false)
  const [apiMissing, setApiMissing] = useState(false)
  const [notice, setNotice] = useState<{ ok?: boolean; text: string } | null>(null)

  useEffect(() => {
    let alive = true
    fetchInstructorSessions()
      .then((list) => {
        if (alive) setSessions(list)
      })
      .catch((err) => {
        if (!alive || axios.isCancel(err)) return
        setApiMissing(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (sessionId === '') {
      setRows([])
      return
    }
    let alive = true
    setLoadingRows(true)
    setNotice(null)
    fetchInstructorAttendanceSession(Number(sessionId))
      .then((existing) => {
        if (!alive) return
        if (existing.length > 0) {
          setRows(existing)
          return
        }
        return fetchInstructorStudents({ session_id: Number(sessionId) }).then((users) => {
          if (!alive) return
          setRows(
            users.map((u) => ({
              student_id: u.id,
              student_name: u.name,
              email: u.email ?? null,
              status: null,
            })),
          )
        })
      })
      .catch(() => {
        if (!alive) return
        fetchInstructorStudents({ session_id: Number(sessionId) })
          .then((users) => {
            if (!alive) return
            setRows(
              users.map((u) => ({
                student_id: u.id,
                student_name: u.name,
                email: u.email ?? null,
                status: null,
              })),
            )
          })
          .catch(() => setRows([]))
      })
      .finally(() => {
        if (alive) setLoadingRows(false)
      })

    return () => {
      alive = false
    }
  }, [sessionId])

  function updateRow(studentId: number, status: AttendanceStatus) {
    setRows((prev) =>
      prev.map((r) => (r.student_id === studentId ? { ...r, status } : r)),
    )
  }

  async function save() {
    if (sessionId === '') return
    const incomplete = rows.some((r) => !r.status)
    if (incomplete) {
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
    } catch {
      setNotice({ ok: false, text: 'تعذر الحفظ — تحقق من صلاحياتك أو نقطة النهاية على الخادم.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LmsPageSkeleton />

  return (
    <div className="space-y-8">
      {apiMissing && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
          تحقق من مسارات الحضور على الخادم:{' '}
          <code className="rounded bg-white/80 px-1">PUT /api/instructor/attendance/{'{session}'}</code>.
        </div>
      )}

      <DashboardSection title="تسجيل الحضور" subtitle="اختر الجلسة، حدّث الحالة، ثم احفظ دفعة واحدة.">
        <div className="mb-6 flex flex-col gap-4 text-right sm:flex-row sm:items-end sm:justify-between">
          <label className="grid gap-2">
            <span className="text-xs font-black text-deepBlue">الجلسة</span>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value === '' ? '' : Number(e.target.value))}
              className="min-w-[240px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-deepBlue outline-none focus:border-customBlue"
            >
              <option value="">— اختر جلسة —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title ?? s.course_name} · {s.date ?? s.starts_at ?? s.id}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={sessionId === '' || saving || loadingRows || rows.length === 0}
            onClick={save}
            className="rounded-xl bg-customOrange px-6 py-3 text-sm font-black text-white shadow-md disabled:opacity-50"
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ الحضور'}
          </button>
        </div>

        {notice && (
          <div
            className={
              notice.ok
                ? 'mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-right text-sm font-bold text-emerald-800'
                : 'mb-4 rounded-xl bg-red-50 px-4 py-3 text-right text-sm font-bold text-red-700'
            }
          >
            {notice.text}
          </div>
        )}

        {sessionId === '' ? (
          <LmsEmptyState icon={UserCheck} title="اختر جلسة للبدء" description="" />
        ) : loadingRows ? (
          <LmsPageSkeleton />
        ) : rows.length === 0 ? (
          <LmsEmptyState
            icon={UserCheck}
            title="لا يوجد طلاب لهذه الجلسة"
            description="قد تحتاج نقطة نهاية قائمة الطلاب على الخادم."
          />
        ) : (
          <AttendanceTable rows={rows} onChange={updateRow} disabled={saving} />
        )}
      </DashboardSection>
    </div>
  )
}
