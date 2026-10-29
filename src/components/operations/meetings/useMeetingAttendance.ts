import { useCallback, useState } from 'react'
import toast from '@/lib/toast'
import { confirmMeetingAttendance, describeMeetingError, joinMeeting } from '@/api/meetingsApi'
import type { OpsMeetingDetail } from '@/types/operations'

/**
 * "انضمام" and "تأكيد الحضور" for one signed-in user, shared by the lounge cards,
 * the details panel and the meeting page.
 *
 * Joining opens the link FIRST (synchronously, inside the click, so a popup
 * blocker lets it through) and records the join after. The server decides who may
 * join; a refusal comes back as an Arabic toast and nothing changes.
 */
export function useMeetingAttendance(onUpdated: (meeting: OpsMeetingDetail) => void) {
  const [busyId, setBusyId] = useState<number | null>(null)

  const run = useCallback(
    async (id: number, action: (id: number) => Promise<OpsMeetingDetail>, success: string) => {
      setBusyId(id)
      try {
        const meeting = await action(id)
        onUpdated(meeting)
        toast.success(success)
      } catch (e) {
        toast.error(describeMeetingError(e, 'الاجتماع').message)
      } finally {
        setBusyId(null)
      }
    },
    [onUpdated],
  )

  const join = useCallback(
    (id: number, url: string | null) => {
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      return run(id, joinMeeting, 'تم تسجيل انضمامك')
    },
    [run],
  )

  const confirm = useCallback((id: number) => run(id, confirmMeetingAttendance, 'تم تأكيد حضورك'), [run])

  return { busyId, join, confirm }
}
