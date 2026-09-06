import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import toast from '@/lib/toast'
import { patchCourseSchedule } from '@/api/adminCoursesApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import type { Course } from '@/types'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'
import EmcDatePicker from '@/components/ui/EmcDatePicker'
import EmcTimePicker from '@/components/ui/EmcTimePicker'

type Props = {
  open: boolean
  course: Course | null
  onClose: () => void
  onSaved: () => void
}

export function ScheduleCourseModal({ open, course, onClose, onSaved }: Props) {
  const [busy, setBusy] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [meetingLink, setMeetingLink] = useState('')

  // Hydrate the form from the course during render whenever the target changes
  // (react.dev "adjusting state when a prop changes"). `seenTarget` starts at the
  // closed/empty pair so a component mounted already open still hydrates on the
  // first pass, matching the effect this replaces.
  const [seenTarget, setSeenTarget] = useState<{ open: boolean; course: Course | null }>({
    open: false,
    course: null,
  })
  if (seenTarget.open !== open || seenTarget.course !== course) {
    setSeenTarget({ open, course })
    if (open && course) {
      setStartDate(course.start_date ? String(course.start_date).slice(0, 10) : '')
      setStartTime(course.start_time ? String(course.start_time).slice(0, 8) : '')
      setEndDate(course.end_date ? String(course.end_date).slice(0, 10) : '')
      setMeetingLink(course.meeting_link ?? '')
    }
  }

  async function save() {
    if (!course) return
    setBusy(true)
    try {
      await patchCourseSchedule(course.id, {
        start_date: startDate.trim() || null,
        end_date: endDate.trim() || null,
        study_time: startTime.trim() || null,
        meeting_link: meetingLink.trim() || null,
      })
      toast.success('تم تحديث جدولة الدورة')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <CrudModal open={open} onClose={onClose} title="تحديد موعد الدورة" subtitle={course?.title} widthClassName="max-w-md">
      <div className="space-y-4 text-right" dir="rtl">
        <EmcDatePicker label="تاريخ البداية" layout="stacked" value={startDate} onChange={setStartDate} />
        <EmcTimePicker label="وقت البداية" value={startTime} onChange={setStartTime} />
        <EmcDatePicker label="تاريخ الانتهاء" layout="stacked" value={endDate} onChange={setEndDate} />
        <label className="block text-xs font-black text-deepBlue">
          رابط الجلسة
          <input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} dir="ltr" className="mt-1 w-full rounded-xl border px-3 py-2 font-mono text-sm" />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-deepBlue py-2.5 text-sm font-black text-white disabled:opacity-50"
        >
          {busy ?
            <Loader2 className="size-4 animate-spin" />
          : null}
          حفظ الجدولة
        </button>
      </div>
    </CrudModal>
  )
}
