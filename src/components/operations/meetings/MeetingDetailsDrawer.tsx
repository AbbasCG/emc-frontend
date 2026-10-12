import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, Building2, CalendarDays, ChevronLeft, ExternalLink, FileText, Lock, RefreshCw, UserRound, X } from 'lucide-react'
import { describeMeetingError, fetchMeeting, type MeetingError } from '@/api/meetingsApi'
import type { MeetingReportView, OpsMeetingDetail } from '@/types/operations'
import { MeetingStatusBadge } from './MeetingStatusBadge'
import { DISPLAY_STATUS_META, formatDay, meetingTypeLabel, timeRange } from './meetingsUi'
import { formatDateTime } from '@/components/operations/meetingReports/meetingReportsUi'

type Props = {
  meetingId: number
  /** Shown instantly while the full meeting loads. */
  titleHint?: string
  /** Where the full meeting page lives for this surface. */
  basePath: string
  onClose: () => void
  /** Open the report form for this meeting (offered only when the server allows it). */
  onUploadReport?: (id: number) => void
}

const REPORT_SECTIONS: Array<[keyof MeetingReportView, string]> = [
  ['completed_tasks_summary', 'المهام المُنجزة'],
  ['challenges', 'المشاكل والتحديات'],
  ['executive_requests', 'المطلوب من الإدارة العليا'],
  ['next_month_goals', 'أهداف الشهر القادم'],
  ['improvement_suggestions', 'مقترحات التطوير'],
  ['team_commitment_notes', 'ملاحظات الانضباط'],
]

export function ReportBlock({ report }: { report: MeetingReportView }) {
  const sections = REPORT_SECTIONS.filter(([key]) => report[key])
  const facts: Array<[string, string]> = []
  if (report.team_commitment_score !== null) facts.push(['التزام الفريق', `${report.team_commitment_score} / 5`])
  if (report.kpi_percentage !== null) facts.push(['تحقيق الأهداف', `${report.kpi_percentage}%`])
  if (report.top_interactive_member) facts.push(['الأكثر تفاعلًا', report.top_interactive_member])
  if (report.absentees.length > 0) facts.push(['الغائبون', report.absentees.join('، ')])

  return (
    <div className="space-y-3" data-testid="report-block">
      <p className="text-[11px] font-bold text-muted-500">
        رفعه {report.uploaded_by?.name ?? 'مستخدم غير معروف'} · {formatDateTime(report.uploaded_at)}
      </p>
      {facts.length > 0 && (
        <dl className="grid gap-3 rounded-2xl bg-paper p-4 sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] font-bold text-muted-400">{k}</dt>
              <dd className="mt-0.5 text-sm font-bold text-navy">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {sections.map(([key, label]) => (
        <div key={key}>
          <h4 className="mb-1 text-[11px] font-black text-muted-500">{label}</h4>
          <p className="whitespace-pre-line text-sm leading-7 text-ink-500">{report[key] as string}</p>
        </div>
      ))}
    </div>
  )
}

/**
 * Details of one meeting in a side panel: when/where/who, its single official
 * report (or the next step when there is none), and a link to the full page.
 * Loads on its own so a failed fetch never disturbs the list behind it.
 */
export function MeetingDetailsDrawer({ meetingId, titleHint, basePath, onClose, onUploadReport }: Props) {
  const [detail, setDetail] = useState<OpsMeetingDetail | null>(null)
  const [error, setError] = useState<MeetingError | null>(null)
  const [nonce, setNonce] = useState(0)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let alive = true
    void fetchMeeting(meetingId)
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
  }, [meetingId, nonce])

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [onClose])

  const loading = !detail && !error
  const caps = detail?.capabilities

  return (
    <div className="fixed inset-0 z-50 flex bg-navy/50 backdrop-blur-sm" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="تفاصيل الاجتماع"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="ms-auto flex h-full w-full max-w-2xl flex-col bg-paper shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line bg-white p-5">
          <div className="min-w-0">
            {detail && <p className="text-[11px] font-black text-accent-700">{meetingTypeLabel(detail.type)}</p>}
            <h2 className="mt-1 text-lg font-black leading-snug text-navy">{detail?.title ?? titleHint ?? 'جارٍ التحميل…'}</h2>
            {detail && (
              <div className="mt-2">
                <MeetingStatusBadge status={detail.display_status} />
              </div>
            )}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="إغلاق" className="rounded-xl p-2 text-muted-500 transition hover:bg-slate-100">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {loading ? (
            <div aria-busy="true" aria-label="جارٍ تحميل الاجتماع" className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-center">
              {error.kind === 'forbidden' ? (
                <Lock className="mx-auto text-rose-400" size={26} aria-hidden="true" />
              ) : (
                <AlertTriangle className="mx-auto text-rose-400" size={26} aria-hidden="true" />
              )}
              <p className="mt-3 text-sm font-black text-rose-700">{error.title}</p>
              <p className="mt-1 text-xs font-semibold leading-6 text-rose-600">{error.message}</p>
              {error.retryable && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setNonce((n) => n + 1)
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-navy ring-1 ring-rose-200"
                >
                  <RefreshCw size={14} aria-hidden="true" /> إعادة المحاولة
                </button>
              )}
            </div>
          ) : detail ? (
            <>
              <section className="rounded-3xl border border-line bg-white p-5 shadow-sm">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-2.5">
                    <CalendarDays size={16} className="mt-0.5 text-muted-400" aria-hidden="true" />
                    <div>
                      <dt className="text-[11px] font-bold text-muted-400">الموعد</dt>
                      <dd className="text-sm font-bold text-navy">
                        {formatDay(detail.meeting_date)}
                        {timeRange(detail) && <span className="ms-2 text-muted-500" dir="ltr">{timeRange(detail)}</span>}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Building2 size={16} className="mt-0.5 text-muted-400" aria-hidden="true" />
                    <div>
                      <dt className="text-[11px] font-bold text-muted-400">الإدارة</dt>
                      <dd className="text-sm font-bold text-navy">{detail.department?.name ?? 'غير محدّدة'}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <UserRound size={16} className="mt-0.5 text-muted-400" aria-hidden="true" />
                    <div>
                      <dt className="text-[11px] font-bold text-muted-400">المنظِّم</dt>
                      <dd className="text-sm font-bold text-navy">{detail.organizer?.name ?? 'غير معروف'}</dd>
                    </div>
                  </div>
                  {detail.meeting_url && (
                    <div className="flex items-start gap-2.5">
                      <ExternalLink size={16} className="mt-0.5 text-muted-400" aria-hidden="true" />
                      <div>
                        <dt className="text-[11px] font-bold text-muted-400">رابط الاجتماع</dt>
                        <dd>
                          <a href={detail.meeting_url} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-brand-600 hover:underline">
                            فتح الرابط
                          </a>
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>
              </section>

              <section aria-label="تقرير الاجتماع" className="rounded-3xl border border-line bg-white p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-navy">
                  <FileText size={16} className="text-brand-500" aria-hidden="true" />
                  التقرير الرسمي للاجتماع
                </h3>
                {detail.report ? (
                  <ReportBlock report={detail.report} />
                ) : detail.has_report ? (
                  <p className="text-sm font-semibold text-muted-500">تم رفع تقرير لهذا الاجتماع، وهو متاح للمخوَّلين بقراءته فقط.</p>
                ) : detail.display_status === 'cancelled' ? (
                  <p className="text-sm font-semibold text-muted-500">{DISPLAY_STATUS_META.cancelled.hint}.</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold leading-7 text-muted-500">
                      {detail.display_status === 'scheduled'
                        ? 'لم يحن موعد الاجتماع بعد. يُرفع التقرير بعد انعقاده، ولكل اجتماع تقرير رسمي واحد فقط.'
                        : 'لم يُرفع تقرير لهذا الاجتماع بعد. لكل اجتماع تقرير رسمي واحد فقط، يراه فريق إدارة الجودة بعد رفعه.'}
                    </p>
                    {caps?.can_upload_report && onUploadReport && (
                      <button
                        type="button"
                        onClick={() => onUploadReport(detail.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-brand-600"
                      >
                        <FileText size={15} aria-hidden="true" />
                        رفع التقرير
                      </button>
                    )}
                  </div>
                )}
              </section>

              <Link
                to={`${basePath}/${detail.id}`}
                className="inline-flex items-center gap-1 text-xs font-black text-brand-600 hover:text-accent-700"
              >
                فتح صفحة الاجتماع كاملة
                <ChevronLeft size={14} aria-hidden="true" />
              </Link>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
