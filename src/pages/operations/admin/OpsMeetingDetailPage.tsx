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
              {detail.report ? 'تحديث تقرير الاجتماع' : 'رفع تقرير الاجتماع'}
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

      {detail.report && (
        <section dir="rtl" className="rounded-2xl border border-emerald-500/20 bg-emerald-50/30 p-6 text-right shadow-sm ring-1 ring-emerald-500/10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <FileText size={18} />
              </div>
              <div>
                <h2 className="text-base font-black text-deepBlue">تقرير الاجتماع والمخرجات الموثقة</h2>
                <p className="text-[11px] font-semibold text-slate-500">تم توثيق ومزامنة هذا التقرير بنجاح</p>
              </div>
            </div>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm border border-emerald-200 hover:bg-emerald-50"
            >
              تعديل التقرير
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="rounded-xl bg-white p-4 border border-slate-100 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400">نسبة الأهداف التشغيلية (KPI)</span>
              <p className="mt-1 text-xl font-black text-emerald-600">
                {detail.report.kpi_percentage != null ? `${detail.report.kpi_percentage}%` : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 border border-slate-100 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400">التزام الفريق</span>
              <p className="mt-1 text-xl font-black text-customBlue">
                {detail.report.team_commitment_score != null ? `${detail.report.team_commitment_score} / 5` : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 border border-slate-100 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400">العضو الأكثر تفاعلاً</span>
              <p className="mt-1 text-sm font-black text-deepBlue truncate">
                {detail.report.top_interactive_member || '—'}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 border border-slate-100 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400">الغائبون</span>
              <p className="mt-1 text-sm font-black text-rose-600 truncate">
                {detail.report.absentees && detail.report.absentees.length > 0
                  ? detail.report.absentees.join('، ')
                  : 'لا يوجد'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {(detail.report.completed_tasks_summary || detail.report.achieved) && (
              <div className="rounded-xl bg-white p-4 border border-slate-100">
                <h4 className="text-xs font-black text-deepBlue mb-1">المهام التي أُنجزت</h4>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-line">
                  {detail.report.completed_tasks_summary || detail.report.achieved}
                </p>
              </div>
            )}
            {(detail.report.next_month_goals || detail.report.planned) && (
              <div className="rounded-xl bg-white p-4 border border-slate-100">
                <h4 className="text-xs font-black text-deepBlue mb-1">الأهداف والتطلعات القادمة</h4>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-line">
                  {detail.report.next_month_goals || detail.report.planned}
                </p>
              </div>
            )}
            {(detail.report.challenges || detail.report.needs_reason) && (
              <div className="rounded-xl bg-white p-4 border border-slate-100">
                <h4 className="text-xs font-black text-deepBlue mb-1">التحديات والمشاكل</h4>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-line">
                  {detail.report.challenges || detail.report.needs_reason}
                </p>
              </div>
            )}
            {(detail.report.executive_requests || detail.report.needs) && (
              <div className="rounded-xl bg-white p-4 border border-slate-100">
                <h4 className="text-xs font-black text-deepBlue mb-1">المطلوب من الإدارة العليا</h4>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-line">
                  {detail.report.executive_requests || detail.report.needs}
                </p>
              </div>
            )}
            {(detail.report.improvement_suggestions || detail.report.notes) && (
              <div className="rounded-xl bg-white p-4 border border-slate-100 md:col-span-2">
                <h4 className="text-xs font-black text-deepBlue mb-1">مقترحات التطوير والملاحظات</h4>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-line">
                  {detail.report.improvement_suggestions || detail.report.notes}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {aiSummary && <AiSummaryPanel intelligence={aiSummary} toTaskHref="/dashboard/admin/tasks/kanban" />}

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 text-right ring-1 ring-deepBlue/[0.06]">
          <h2 className="text-sm font-black text-deepBlue">جدول الأعمال</h2>
          {Array.isArray(detail.agenda) && detail.agenda.length > 0 ? (
            <ol className="mt-4 space-y-2 text-sm font-medium leading-relaxed text-slate-700">
              {detail.agenda.map((item, i) => (
                <li key={i}>
                  <span className="font-black text-customOrange">{i + 1}. </span>
                  {item}
                </li>
              ))}
            </ol>
          ) : (
            <pre className="mt-4 whitespace-pre-wrap font-sans text-sm font-medium leading-relaxed text-slate-700">
              {(typeof detail.agenda === 'string' && detail.agenda) || '—'}
            </pre>
          )}
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
