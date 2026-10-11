import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeft, ExternalLink, Video, FileText } from 'lucide-react'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import DecisionList from '@/components/operations/DecisionList'
import ActionItemsList from '@/components/operations/ActionItemsList'
import { fetchMeeting } from '@/api/meetingsApi'
import { createTaskFromActionItem } from '@/api/tasksApi'
import { fetchMeetingIntelligence } from '@/api/aiInsightsApi'
import AiSummaryPanel from '@/components/ai/AiSummaryPanel'
import MeetingReportModal from '@/components/operations/MeetingReportModal'
import { MEETING_TYPE_AR } from '@/data/operationsLabels'
import type { OpsMeetingDetail } from '@/types/operations'
import type { AiMeetingIntelligence } from '@/types/ai'

const LOAD_ERROR = 'تعذّر تحميل تفاصيل الاجتماع. تحقق من الاتصال وأعد المحاولة.'

export default function OpsMeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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
        to="/dashboard/admin/meetings"
        className="inline-flex items-center gap-1 text-xs font-black text-customBlue hover:text-customOrange"
      >
        <ChevronLeft size={14} />
        كل الاجتماعات
      </Link>

      <header className="rounded-[1.35rem] bg-deepBlue p-8 text-right text-white shadow-xl ring-1 ring-white/10">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
          {MEETING_TYPE_AR[detail.type]}
        </p>
        <h1 className="mt-2 text-2xl font-black">{detail.title}</h1>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-6 border-t border-white/10 pt-6">
          <div className="flex gap-4 text-[11px] font-bold text-white/65">
            <span>{detail.starts_at ?? '—'}</span>
            <span>{detail.department_name ?? '—'}</span>
            <span>منظم: {detail.organizer_name ?? '—'}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-deepBlue shadow-sm transition hover:bg-slate-100 hover:shadow-md"
            >
              <FileText size={16} />
              رفع تقرير الاجتماع
            </button>
        {detail.recording_link && (
          <a
            href={detail.recording_link}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-customOrange px-4 py-2 text-xs font-black text-white"
          >
            <Video size={16} />
            التسجيل
            <ExternalLink size={14} />
          </a>
        )}
          </div>
        </div>
      </header>

      <MeetingReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        meetingId={mid}
        onSuccess={() => void retry()}
      />

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
