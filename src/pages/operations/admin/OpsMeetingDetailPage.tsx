import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ChevronLeft, ExternalLink, Video, FileText } from 'lucide-react'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import DecisionList from '@/components/operations/DecisionList'
import ActionItemsList from '@/components/operations/ActionItemsList'
import { fetchMeeting } from '@/api/meetingsApi'
import { createTaskFromActionItem } from '@/api/tasksApi'
import { fetchMeetingIntelligence } from '@/api/aiInsightsApi'
import AiSummaryPanel from '@/components/ai/AiSummaryPanel'
import MeetingReportModal from '@/components/operations/MeetingReportModal'
import { MeetingStatusBadge } from '@/components/operations/meetings/MeetingStatusBadge'
import { ReportBlock } from '@/components/operations/meetings/MeetingDetailsDrawer'
import { formatDay, meetingTypeLabel, timeRange } from '@/components/operations/meetings/meetingsUi'
import type { OpsMeetingDetail } from '@/types/operations'
import type { AiMeetingIntelligence } from '@/types/ai'

const LOAD_ERROR = 'تعذّر تحميل تفاصيل الاجتماع. تحقق من الاتصال وأعد المحاولة.'

export default function OpsMeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  // The same page serves the admin schedule and the lounge; "back" goes to whichever the user came from.
  const inLounge = useLocation().pathname.startsWith('/dashboard/department')
  const listPath = inLounge ? '/dashboard/department/meeting-lounge' : '/dashboard/admin/meetings'
  const mid = id ? Number(id) : NaN
  const [detail, setDetail] = useState<OpsMeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [convertMsg, setConvertMsg] = useState('')
  const [aiSummary, setAiSummary] = useState<AiMeetingIntelligence | null>(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  // Re-arm the loading state during render when the route id changes (react.dev
  // "adjusting state when a prop changes"), so the fetch effect below never has to
  // touch state synchronously.
  const [seenMid, setSeenMid] = useState(mid)
  if (!Object.is(seenMid, mid)) {
    setSeenMid(mid)
    setLoading(true)
    setLoadError(null)
  }

  useEffect(() => {
    if (!Number.isFinite(mid)) return
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchMeeting(mid)
        if (!cancelled) setDetail(data)
      } catch {
        if (!cancelled) setLoadError(LOAD_ERROR)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [mid])

  // Retry lives outside the effect, so the synchronous reset here is legitimate.
  const retry = useCallback(async () => {
    if (!Number.isFinite(mid)) return
    setLoadError(null)
    setLoading(true)
    try {
      setDetail(await fetchMeeting(mid))
    } catch {
      setLoadError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [mid])

  useEffect(() => {
    if (!Number.isFinite(mid)) return
    let cancelled = false
    ;(async () => {
      const data = await fetchMeetingIntelligence(mid)
      if (!cancelled) setAiSummary(data)
    })()
    return () => {
      cancelled = true
    }
  }, [mid])

  async function onConvert(actionItemId: number) {
    setConvertMsg('')
    try {
      await createTaskFromActionItem(mid, actionItemId)
      setConvertMsg('تم إنشاء المهمة من بنود العمل.')
      navigate('/dashboard/admin/tasks/kanban')
    } catch {
      setConvertMsg('تعذر التحويل تأكد من مسار الخادم convert-task أو نفّذ الإنشاء يدوياً.')
    }
  }

  if (!Number.isFinite(mid)) {
    return <p className="text-center font-black text-deepBlue">معرف غير صالح</p>
  }
  if (loading) return <OpsPageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void retry()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )
  if (!detail) return <OpsPageSkeleton />

  return (
    <div className="space-y-8">
      <Link
        to={listPath}
        className="inline-flex items-center gap-1 text-xs font-black text-brand-600 hover:text-accent-700"
      >
        <ChevronLeft size={14} />
        {inLounge ? 'صالة الاجتماعات' : 'كل الاجتماعات'}
      </Link>

      <header className="rounded-3xl bg-navy p-8 text-right text-white shadow-xl ring-1 ring-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-black tracking-[0.2em] text-white/60">{meetingTypeLabel(detail.type)}</p>
          <MeetingStatusBadge status={detail.display_status} />
        </div>
        <h1 className="mt-2 text-2xl font-black">{detail.title}</h1>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] font-bold text-white/75">
            <span>
              {formatDay(detail.meeting_date)}
              {timeRange(detail) && <bdi dir="ltr" className="ms-2">{timeRange(detail)}</bdi>}
            </span>
            <span>{detail.department?.name ?? 'غير محدّدة'}</span>
            <span>المنظِّم: {detail.organizer?.name ?? 'غير معروف'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {detail.capabilities.can_upload_report && (
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-navy shadow-sm transition hover:bg-slate-100"
              >
                <FileText size={16} />
                رفع التقرير
              </button>
            )}
            {detail.recording_link && (
              <a
                href={detail.recording_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2 text-xs font-black text-white"
              >
                <Video size={16} />
                التسجيل
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </header>

      <section aria-label="التقرير الرسمي" className="rounded-2xl bg-white p-6 text-right ring-1 ring-deepBlue/[0.06]">
        <h2 className="text-sm font-black text-deepBlue">التقرير الرسمي للاجتماع</h2>
        <div className="mt-4">
          {detail.report ? (
            <ReportBlock report={detail.report} />
          ) : detail.has_report ? (
            <p className="text-sm font-semibold text-slate-500">تم رفع تقرير لهذا الاجتماع، وهو متاح للمخوَّلين بقراءته فقط.</p>
          ) : detail.display_status === 'cancelled' ? (
            <p className="text-sm font-semibold text-slate-500">لا يُرفع تقرير لاجتماع ملغى.</p>
          ) : (
            <p className="text-sm font-semibold text-slate-500">
              لم يُرفع تقرير لهذا الاجتماع بعد. لكل اجتماع تقرير رسمي واحد فقط، يراه فريق إدارة الجودة بعد رفعه.
            </p>
          )}
        </div>
      </section>

      {isReportModalOpen && (
        <MeetingReportModal
          meetingId={mid}
          meetingTitle={detail.title}
          onClose={() => setIsReportModalOpen(false)}
          onDuplicate={() => void retry()}
          onSuccess={() => {
            setIsReportModalOpen(false)
            void retry()
          }}
        />
      )}

      {convertMsg && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-right text-xs font-bold text-amber-900 ring-1 ring-amber-100">
          {convertMsg}
        </p>
      )}

      {aiSummary && <AiSummaryPanel intelligence={aiSummary} toTaskHref="/dashboard/admin/tasks/kanban" />}

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 text-right ring-1 ring-deepBlue/[0.06]">
          <h2 className="text-sm font-black text-deepBlue">جدول الأعمال</h2>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm font-medium leading-relaxed text-slate-700">
            {detail.agenda ?? '—'}
          </pre>
        </section>
        <section className="rounded-2xl bg-white p-6 text-right ring-1 ring-deepBlue/[0.06]">
          <h2 className="text-sm font-black text-deepBlue">الحضور</h2>
          <ul className="mt-4 space-y-2">
            {(detail.attendees ?? []).map((a, i) => (
              <li key={i} className="flex justify-between text-xs font-bold text-slate-600">
                <span className="text-slate-400">{a.role}</span>
                <span className="text-deepBlue">{a.name}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl bg-white p-6 text-right ring-1 ring-deepBlue/[0.06]">
        <h2 className="text-sm font-black text-deepBlue">القرارات</h2>
        <div className="mt-4">
          <DecisionList decisions={detail.decisions ?? []} />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 text-right ring-1 ring-deepBlue/[0.06]">
        <h2 className="text-sm font-black text-deepBlue">بنود العمل</h2>
        <div className="mt-4">
          <ActionItemsList
            items={detail.action_items ?? []}
            onConvert={async (aid) => {
              await onConvert(aid)
            }}
          />
        </div>
      </section>

      <section className="rounded-2xl bg-slate-50 p-6 text-right ring-1 ring-deepBlue/[0.06]">
        <h2 className="text-sm font-black text-deepBlue">محضر الاجتماع</h2>
        <p className="mt-4 text-sm font-medium leading-relaxed text-slate-700">{detail.minutes ?? '—'}</p>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <p className="text-sm font-black text-deepBlue">مرفقات الاجتماع</p>
        <p className="mt-2 text-xs font-semibold text-slate-500">placeholder رفع الملفات عبر واجهة التخزين لاحقاً</p>
      </section>
    </div>
  )
}
