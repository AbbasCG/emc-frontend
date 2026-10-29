import { MeetingsWorkspace } from '@/components/operations/meetings/MeetingsWorkspace'

/**
 * /dashboard/department/meeting-lounge: the department-facing lounge. Shows the
 * meetings in the viewer's scope and lets the authorized person file each
 * meeting's single official report.
 */
export default function MeetingLoungePage() {
  return <MeetingsWorkspace mode="lounge" />
}
