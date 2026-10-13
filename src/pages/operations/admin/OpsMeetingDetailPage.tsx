import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import {
  AlertTriangle, CalendarDays, ChevronLeft, ExternalLink, FileText, Gavel, ListChecks, ListOrdered, Lock, RefreshCw, SearchX, Video,
} from 'lucide-react'
import {
  describeMeetingError, fetchMeeting, type MeetingError,
} from '@/api/meetingsApi'
import { fetchMeetingIntelligence } from '@/api/aiInsightsApi'
import AiSummaryPanel from '@/components/ai/AiSummaryPanel'
import MeetingReportModal from '@/components/operations/MeetingReportModal'
import { MeetingStatusBadge } from '@/components/operations/meetings/MeetingStatusBadge'
import { JoinActions, ParticipantsSection } from '@/components/operations/meetings/AttendanceSections'
import { ReportBlock } from '@/components/operations/meetings/MeetingDetailsDrawer'
import { useMeetingAttendance } from '@/components/operations/meetings/useMeetingAttendance'
import { formatMeetingWhen, meetingTypeLabel } from '@/components/operations/meetings/meetingsUi'
import { formatDateTime, formatDay } from '@/components/operations/meetingReports/meetingReportsUi'
import type { AiMeetingIntelligence } from '@/types/ai'
import type { OpsMeetingDetail } from '@/types/operations'

const AUDIENCE_TEXT = {
  explicit: 'مدعوّون بأسمائهم فقط',
  department: 'كل أعضاء الإدارة',
  general: 'اجتماع عام بلا إدارة محددة',
} as const

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold text-muted-400">{label}</p>
      <div className="mt-1 text-sm font-black text-navy">{children}</div>
    </div>
  )
}

/**
 * /dashboard/department/meeting-lounge/:id and /dashboard/admin/meetings/:id.
 *
 * Everything the signed-in user may know about ONE meeting, as the server decided:
 * schedule, department, organizer, join link, agenda, audience; their own
 * attendance (or everyone's, for the meeting's manager and quality); and the
 * official report with its decisions and action items only for who may read it.
 * Sections the user may not see are explained, never left as blank boxes.
 */
export default function OpsMeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  // The same page serves the admin schedule and the lounge; "back" goes to whichever the user came from.
  const inLounge = useLocation().pathname.startsWith('/dashboard/department')
  const listPath = inLounge ? '/dashboard/department/meeting-lounge' : '/dashboard/admin/meetings'
  const mid = id ? Number(id) : NaN

  const [detail, setDetail] = useState<OpsMeetingDetail | null>(null)
  const [error, setError] = useState<MeetingError | null>(null)
  const [nonce, setNonce] = useState(0)
  const [aiSummary, setAiSummary] = useState<AiMeetingIntelligence | null>(null)
  const [reportOpen, setReportOpen] = useState(false)

  // Re-arm the page during render when the route id changes (react.dev "adjusting state
  // when a prop changes"), so the fetch effect below never has to touch state synchronously.
  const [seenMid, setSeenMid] = useState(mid)
  if (!Object.is(seenMid, mid)) {
    setSeenMid(mid)
    setDetail(null)
    setError(null)
  }

  useEffect(() => {
    if (!Number.isFinite(mid)) return
    let alive = true
    void fetchMeeting(mid)
      .then((d) => {
        if (!alive) return
        setDetail(d)
        setError(null)
      })
      .catch((e: unknown) => {
        if (alive) setError(describeMeetingError(e, 'الاجتماع'))
      })
    return () => {
      alive = false
    }
  }, [mid, nonce])

  // AI summaries are an internal tool: only for who manages the meeting or has quality oversight.
  const aiAllowed = !!detail && (detail.capabilities.can_manage || detail.capabilities.can_view_quality_data)
  useEffect(() => {
    if (!Number.isFinite(mid) || !aiAllowed) return
    let alive = true
    void fetchMeetingIntelligence(mid).then((data) => {
      if (alive) setAiSummary(data)
    })
    return () => {
      alive = false
    }
  }, [mid, aiAllowed])

  const retry = useCallback(() => {
    setError(null)
    setNonce((n) => n + 1)
  }, [])

  const attendance = useMeetingAttendance(setDetail)

  if (!Number.isFinite(mid)) {
    return <p className="p-10 text-center font-black text-navy">معرّف الاجتماع غير صالح.</p>
  }

  const back = (
    <Link to={listPath} className="inline-flex items-center gap-1 text-xs font-black text-brand-600 hover:text-accent-700">
      <ChevronLeft size={14} aria-hidden="true" />
      {inLounge ? 'صالة الاجتماعات' : 'كل الاجتماعات'}
    </Link>
  )

  if (error) {
    const Icon = error.kind === 'forbidden' ? Lock : error.kind === 'not_found' ? SearchX : AlertTriangle
    return (
      <div dir="rtl" className="mx-auto max-w-3xl space-y-6">
        {back}
        <section role="alert" className="rounded-3xl border border-rose-100 bg-white p-10 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500" aria-hidden="true">
            <Icon size={26} />
          </span>
          <h1 className="mt-4 text-base font-black text-navy">{error.kind === 'server' || error.kind === 'network' ? 'تعذّر تحميل الاجتماع' : error.title}</h1>
          <p className="mx-auto mt-1.5 max-w-md text-sm font-medium leading-7 text-muted-500">{error.message}</p>
          {error.retryable && (
            <button type="button" onClick={retry} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600">
              <RefreshCw size={15} aria-hidden="true" />
              إعادة المحاولة
            </button>
          )}
        </section>
      </div>
    )
  }

  if (!detail) {
    return (
      <div dir="rtl" className="mx-auto max-w-5xl space-y-5" aria-busy="true" aria-label="جارٍ تحميل الاجتماع">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
        <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    )
  }

  const caps = detail.capabilities
  const showRecords = detail.has_report ? caps.can_view_report : caps.can_manage

  return (
    <div dir="rtl" className="mx-auto max-w-5xl space-y-6">
      {back}

      {/* ── Hero ── */}
      <header className="rounded-3xl bg-navy p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-black tracking-[0.2em] text-white/60">{meetingTypeLabel(detail.type)}</p>
          <MeetingStatusBadge status={detail.display_status} />
        </div>
        <h1 className="mt-2 text-2xl font-black leading-snug sm:text-3xl">{detail.title}</h1>
        {detail.description && <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-white/75">{detail.description}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px] font-bold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5" data-testid="meeting-when">
            <CalendarDays size={13} aria-hidden="true" />
            {formatMeetingWhen(detail)}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1.5">{detail.department?.name ?? 'غير محدّدة'}</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5">المنظِّم: {detail.organizer?.name ?? 'غير معروف'}</span>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
          <JoinActions meeting={detail} busy={attendance.busyId === detail.id} onJoin={attendance.join} onConfirm={attendance.confirm} />
          {caps.can_upload_report && !detail.has_report && (
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-navy shadow-sm transition hover:bg-slate-100"
            >
              <FileText size={15} aria-hidden="true" />
              رفع التقرير
            </button>
          )}
          {detail.has_report && caps.can_view_report && (
            <a href="#official-report" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-black text-white transition hover:bg-white/20">
              <FileText size={15} aria-hidden="true" />
              عرض التقرير
            </a>
          )}
          {detail.recording_link && (
            <a href={detail.recording_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-black text-white">
              <Video size={15} aria-hidden="true" />
              التسجيل
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          )}
        </div>
      </header>

      {/* ── Information ── */}
      <section aria-label="معلومات الاجتماع" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="الإدارة">{detail.department?.name ?? 'غير محدّدة'}</InfoCard>
        <InfoCard label="المنظِّم والمُنشئ">{detail.organizer?.name ?? 'غير معروف'}</InfoCard>
        <InfoCard label="الجمهور المستهدف">{AUDIENCE_TEXT[detail.audience]}</InfoCard>
        <InfoCard label="رابط الاجتماع">
          {detail.meeting_url ? (
            <a href={detail.meeting_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
              فتح الرابط
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          ) : (
            <span className="font-bold text-muted-500">{caps.can_join ? 'لا يوجد رابط (اجتماع حضوري أو لم يُحدَّد)' : 'متاح للمدعوّين فقط'}</span>
          )}
        </InfoCard>
        <InfoCard label="أُنشئ في">{formatDateTime(detail.created_at)}</InfoCard>
        <InfoCard label="آخر تحديث">{formatDateTime(detail.updated_at)}</InfoCard>
      </section>

      {/* ── Agenda ── */}
      <section aria-label="جدول الأعمال" className="rounded-3xl border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-navy">
          <ListOrdered size={16} className="text-brand-500" aria-hidden="true" />
          جدول الأعمال
        </h2>
        {detail.agenda.length > 0 ? (
          <ol className="list-decimal space-y-1.5 ps-6 text-sm font-semibold leading-7 text-ink-500" data-testid="agenda-list">
            {detail.agenda.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        ) : (
          <p className="text-sm font-semibold text-muted-500">لم يُحدَّد جدول أعمال لهذا الاجتماع.</p>
        )}
      </section>

      <ParticipantsSection meeting={detail} />

      {/* ── Official report ── */}
      <section id="official-report" aria-label="التقرير الرسمي" className="rounded-3xl border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-navy">
          <FileText size={16} className="text-brand-500" aria-hidden="true" />
          التقرير الرسمي للاجتماع
        </h2>
        {detail.report ? (
          <ReportBlock report={detail.report} />
        ) : detail.has_report ? (
          <p className="text-sm font-semibold text-muted-500">تم رفع التقرير الرسمي لهذا الاجتماع. محتواه متاح لمنظّم الاجتماع وفريق الجودة فقط.</p>
        ) : detail.display_status === 'cancelled' ? (
          <p className="text-sm font-semibold text-muted-500">لا يُرفع تقرير لاجتماع ملغى.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold leading-7 text-muted-500">
              لم يتم رفع التقرير الرسمي بعد. لكل اجتماع تقرير رسمي واحد فقط، يراه فريق إدارة الجودة بعد رفعه.
            </p>
            {caps.can_upload_report && (
              <button type="button" onClick={() => setReportOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-brand-600">
                <FileText size={15} aria-hidden="true" />
                رفع التقرير
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Decisions and action items: only with the report, only for who may read it ── */}
      {showRecords && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-label="القرارات" className="rounded-3xl border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-navy">
              <Gavel size={16} className="text-brand-500" aria-hidden="true" />
              القرارات
            </h2>
            {detail.decisions.length === 0 ? (
              <p className="text-sm font-semibold text-muted-500">لا قرارات مسجلة.</p>
            ) : (
              <ol className="space-y-2" data-testid="decisions-list">
                {detail.decisions.map((d, i) => (
                  <li key={d.id} className="rounded-xl bg-paper px-4 py-3 text-sm font-semibold leading-7 text-ink-500">
                    <span className="font-black text-accent-700">{i + 1}. </span>
                    {d.text}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-label="بنود العمل" className="rounded-3xl border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-navy">
              <ListChecks size={16} className="text-brand-500" aria-hidden="true" />
              بنود العمل
            </h2>
            {detail.action_items.length === 0 ? (
              <p className="text-sm font-semibold text-muted-500">لا بنود عمل مسجلة.</p>
            ) : (
              <ul className="space-y-2" data-testid="action-items-list">
                {detail.action_items.map((a) => (
                  <li key={a.id} className="rounded-xl bg-paper px-4 py-3">
                    <p className="text-sm font-black text-navy">{a.text}</p>
                    <p className="mt-1 text-[11px] font-bold text-muted-500">
                      المسؤول: {a.owner ?? 'غير محدد'} · الاستحقاق: {a.due_at ? formatDay(a.due_at) : 'غير محدد'}
                      {a.done ? ' · منجَز' : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {aiSummary && <AiSummaryPanel intelligence={aiSummary} toTaskHref="/dashboard/admin/tasks/kanban" />}

      {reportOpen && (
        <MeetingReportModal
          meetingId={mid}
          meetingTitle={detail.title}
          agenda={detail.agenda}
          onClose={() => setReportOpen(false)}
          onDuplicate={retry}
          onSuccess={(meeting) => {
            setReportOpen(false)
            setDetail(meeting)
          }}
        />
      )}
    </div>
  )
}
