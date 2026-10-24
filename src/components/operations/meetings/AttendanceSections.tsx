import { Loader2, UserCheck, UsersRound, Video } from 'lucide-react'
import type { OpsMeetingDetail, ParticipantStatus } from '@/types/operations'
import { PARTICIPANT_STATUS_META, TONE_CLASS } from './meetingsUi'
import { formatDateTime } from '@/components/operations/meetingReports/meetingReportsUi'

export function ParticipantStatusPill({ status }: { status: ParticipantStatus }) {
  const meta = PARTICIPANT_STATUS_META[status]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${TONE_CLASS[meta.tone]}`}>{meta.label}</span>
}

type JoinProps = {
  meeting: OpsMeetingDetail
  busy: boolean
  onJoin: (id: number, url: string | null) => void
  onConfirm: (id: number) => void
}

/**
 * The attendance actions for the signed-in user. Offered only while the server says
 * this person may join (assigned, not cancelled); a meeting with a link gets "انضمام",
 * one without gets "تأكيد الحضور". Once recorded, their own state is shown instead.
 */
export function JoinActions({ meeting, busy, onJoin, onConfirm }: JoinProps) {
  const caps = meeting.capabilities
  const mine = meeting.my_attendance

  if (!caps.can_join) return null

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="join-actions">
      {meeting.meeting_url && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onJoin(meeting.id, meeting.meeting_url)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Video size={15} aria-hidden="true" />}
          انضمام إلى الاجتماع
        </button>
      )}
      {caps.can_confirm_attendance && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onConfirm(meeting.id)}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-black text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <UserCheck size={15} aria-hidden="true" />}
          تأكيد الحضور
        </button>
      )}
      {mine && mine.status !== 'invited' && (
        <span className="text-xs font-bold text-emerald-700" data-testid="my-attendance-line">
          {mine.confirmed_at ? `أكّدت حضورك · ${formatDateTime(mine.confirmed_at)}` : `سُجّل انضمامك · ${formatDateTime(mine.joined_at)}`}
        </span>
      )}
    </div>
  )
}

/**
 * Who is expected and who attended. Names and counts only for someone who may see
 * attendance (the meeting's manager, or quality); everyone else assigned sees just
 * their own state, so nobody's attendance leaks to colleagues.
 */
export function ParticipantsSection({ meeting }: { meeting: OpsMeetingDetail }) {
  const summary = meeting.attendance_summary

  return (
    <section aria-label="المشاركون والحضور" className="rounded-3xl border border-line bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-navy">
        <UsersRound size={16} className="text-brand-500" aria-hidden="true" />
        المشاركون والحضور
      </h3>

      {meeting.participants_visible ? (
        <>
          {summary && (
            <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="attendance-summary">
              {([
                ['المدعوون', summary.invited],
                ['انضموا', summary.joined],
                ['حضروا', summary.attended],
                ['لم يحضروا', summary.absent],
              ] as const).map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-paper px-3 py-2.5 text-center">
                  <dd className="text-lg font-black tabular-nums text-navy">{v}</dd>
                  <dt className="text-[11px] font-bold text-muted-500">{k}</dt>
                </div>
              ))}
            </dl>
          )}
          {meeting.participants.length === 0 ? (
            <p className="text-sm font-semibold text-muted-500">
              {meeting.audience === 'general' ? 'اجتماع عام: يظهر هنا من ينضم إليه فقط.' : 'لا يوجد مشاركون مسجَّلون بعد.'}
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {meeting.participants.map((p) => (
                <li key={p.user.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-navy">{p.user.name}</span>
                    {p.user.department && <span className="block truncate text-[11px] font-semibold text-muted-500">{p.user.department}</span>}
                  </span>
                  <ParticipantStatusPill status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="space-y-2 text-sm font-semibold text-muted-500">
          <p>
            حالتك:{' '}
            {meeting.my_attendance ? <ParticipantStatusPill status={meeting.my_attendance.status} /> : <ParticipantStatusPill status="invited" />}
          </p>
          <p className="text-[12px]">قائمة المشاركين وحضورهم متاحة لمنظّم الاجتماع وفريق الجودة فقط.</p>
        </div>
      )}
    </section>
  )
}
