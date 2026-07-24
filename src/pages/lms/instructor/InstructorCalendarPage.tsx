import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchInstructorSessionCalendar, fetchInstructorClasses, type LmsSessionEvent, type ClassGroup } from '@/api/placementApi'
import { fetchInstructorCourses } from '@/api/instructorApi'
import type { TeachingCourseLms } from '@/types/lms'
import { BackButton } from '@/components/shared/BackButton'
import SessionCalendar from '@/components/sessions/SessionCalendar'

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'مجدولة', live: 'مباشرة', completed: 'منتهية', cancelled: 'ملغاة', missed: 'فائتة', archived: 'مؤرشفة',
}

export default function InstructorCalendarPage() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<TeachingCourseLms[]>([])
  const [classes, setClasses] = useState<ClassGroup[]>([])
  const [courseId, setCourseId] = useState<string>('')
  const [classGroupId, setClassGroupId] = useState<string>('')
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    fetchInstructorCourses().then(setCourses).catch(() => {})
    fetchInstructorClasses().then(setClasses).catch(() => {})
  }, [])

  const fetchEvents = useCallback((from: string, to: string) => {
    return fetchInstructorSessionCalendar({
      from, to,
      course_id: courseId ? Number(courseId) : undefined,
      class_group_id: classGroupId ? Number(classGroupId) : undefined,
      status: status || undefined,
    })
  }, [courseId, classGroupId, status])

  function openSession(ev: LmsSessionEvent) {
    if (!ev.class_group) return
    navigate(`/dashboard/instructor/classes/${ev.class_group.id}/sessions/${ev.id}`)
  }

  return (
    <div className="space-y-5 pb-16" dir="rtl">
      <BackButton to="/dashboard/instructor/courses" />

      <SessionCalendar
        title="تقويم الجلسات"
        fetchEvents={fetchEvents}
        onEventClick={openSession}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#0077B6]">
              <option value="">كل الدورات</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#0077B6]">
              <option value="">كل الصفوف</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#0077B6]">
              <option value="">كل الحالات</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        }
      />
    </div>
  )
}
