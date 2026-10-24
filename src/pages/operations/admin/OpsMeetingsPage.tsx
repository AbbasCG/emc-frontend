import { MeetingsWorkspace } from '@/components/operations/meetings/MeetingsWorkspace'

/**
 * /dashboard/admin/meetings: the meeting schedule. Create and follow meetings;
 * each meeting's official report is filed from the lounge and read by quality.
 */
export default function OpsMeetingsPage() {
  return <MeetingsWorkspace mode="admin" />
}
