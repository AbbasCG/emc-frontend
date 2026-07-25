import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { fetchStudentSessionCalendar, type LmsSessionEvent } from '@/api/placementApi'
import { BackButton } from '@/components/shared/BackButton'
import SessionCalendar from '@/components/sessions/SessionCalendar'

export default function StudentCalendarPage() {
  const navigate = useNavigate()

  const fetchEvents = useCallback((from: string, to: string) => {
    return fetchStudentSessionCalendar({ from, to })
  }, [])

  function openSession(ev: LmsSessionEvent) {
    navigate(`/dashboard/student/sessions/${ev.id}`)
  }

  return (
    <div className="space-y-5 pb-16" dir="rtl">
      <BackButton to="/dashboard/student" />
      <SessionCalendar title="تقويم الجلسات" fetchEvents={fetchEvents} onEventClick={openSession} />
    </div>
  )
}
