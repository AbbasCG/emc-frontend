import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Building2, CalendarDays, Lock, RefreshCw, Star, UserRound, X } from 'lucide-react'
import { fetchMeetingReport, type MeetingReportDetail, type MeetingReportExtras } from '@/api/operationsReportsApi'
import { MEETING_TYPE_AR } from '@/data/operationsLabels'
import { describeReportsError, formatDateTime, formatDay, scoreTone, type ReportsError } from './meetingReportsUi'

type Props = {
  reportId: number
  /** Shown instantly while the full report loads. */
  titleHint?: string
  onClose: () => void
}

const TONE_CLASS = {
  high: 'bg-emerald-100 text-emerald-700',
  mid: 'bg-brand-50 text-brand-700',
  low: 'bg-amber-100 text-amber-700',
} as const

const SECTIONS = [
  ['achieved', 'ماذا أنجزوا'],
  ['planned', 'ماذا سينجزون'],
  ['needs', 'الاحتياجات'],
  ['needs_reason', 'سبب الاحتياج'],
  ['decisions', 'القرارات'],
  ['notes', 'ملاحظات'],
] as const

function extraLines(extras: MeetingReportExtras): Array<[string, string]> {
  const out: Array<[string, string]> = []
  if (extras.team_commitment_score != null) out.push(['التزام الفريق', String(extras.team_commitment_score)])
  if (extras.kpi_percentage != null) out.push(['نسبة KPI', `${extras.kpi_percentage}%`])
  if (extras.top_interactive_member) out.push(['الأكثر تفاعلًا', extras.top_interactive_member])
  if (extras.team_commitment_notes) out.push(['ملاحظات الالتزام', extras.team_commitment_notes])
  if (extras.improvement_suggestions) out.push(['مقترحات التحسين', extras.improvement_suggestions])
  if (extras.absentees && extras.absentees.length > 0) out.push(['الغائبون', extras.absentees.join('، ')])
  return out
}

/**
 * Read-only details of one report in a side panel. Loads on its own, with its
 * own loading / error / retry states, so a failed fetch of one report never
 * affects the list behind it. Reports here have no file attachments (the
 * records are structured minutes), so there is deliberately no download area.
 */
export function MeetingReportDetails({ reportId, titleHint, onClose }: Props) {
  const [detail, setDetail] = useState<MeetingReportDetail | null>(null)
  const [error, setError] = useState<ReportsError | null>(null)
  const [nonce, setNonce] = useState(0)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let alive = true
    void fetchMeetingReport(reportId)
      .then((d) => {
        if (!alive) return
        setDetail(d)
        setError(null)
      })
      .catch((e: unknown) => {
        if (alive) setError(describeReportsError(e))
      })
    return () => {
      alive = false
    }
  }, [reportId, nonce])

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
  const sections = detail ? SECTIONS.filter(([key]) => detail[key]) : []
  const extras = detail ? extraLines(detail.extras) : []

  function retry() {
    setError(null)
    setNonce((n) => n + 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-navy/50 backdrop-blur-sm" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="تفاصيل تقرير الاجتماع"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="ms-auto flex h-full w-full max-w-2xl flex-col bg-paper shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line bg-white p-5">
          <div className="min-w-0">
            <p className="text-[11px] font-black tracking-wide text-accent-700">تقرير اجتماع</p>
            <h2 className="mt-1 truncate text-lg font-black text-navy">{detail?.title ?? titleHint ?? 'جارٍ التحميل…'}</h2>
            {detail && (
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted-500">
                <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} aria-hidden="true" />{formatDay(detail.meeting_date)}</span>
                <span className="inline-flex items-center gap-1.5"><Building2 size={13} aria-hidden="true" />{detail.department?.name ?? 'غير محدّدة'}</span>
                <span className="inline-flex items-center gap-1.5"><UserRound size={13} aria-hidden="true" />{detail.author?.name ?? 'غير معروف'}</span>
              </p>
            )}
            {detail?.meeting && (
              <p className="mt-2 text-xs font-bold text-muted-500" data-testid="report-source-meeting">
                الاجتماع المرتبط: <span className="text-navy">{detail.meeting.title}</span> · {MEETING_TYPE_AR[detail.meeting.type]}
              </p>
            )}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="إغلاق" className="rounded-xl p-2 text-muted-500 transition hover:bg-slate-100">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {loading ? (
            <div aria-busy="true" aria-label="جارٍ تحميل التقرير" className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
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
                <button type="button" onClick={retry} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-navy ring-1 ring-rose-200">
                  <RefreshCw size={14} aria-hidden="true" /> إعادة المحاولة
                </button>
              )}
            </div>
          ) : detail ? (
            <>
              {sections.length === 0 && extras.length === 0 && (
                <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-sm font-bold text-muted-500">
                  لم يُدوَّن محضر نصي لهذا الاجتماع.
                </p>
              )}

              {sections.map(([key, label]) => (
                <section key={key} className="rounded-3xl border border-line bg-white p-5 shadow-sm">
                  <h3 className="mb-2 text-xs font-black text-muted-500">{label}</h3>
                  <p className="whitespace-pre-line text-sm leading-7 text-ink-500">{detail[key]}</p>
                </section>
              ))}

              {extras.length > 0 && (
                <section className="rounded-3xl border border-line bg-white p-5 shadow-sm">
                  <h3 className="mb-3 text-xs font-black text-muted-500">مؤشرات الاجتماع</h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {extras.map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-[11px] font-bold text-muted-400">{k}</dt>
                        <dd className="mt-0.5 text-sm font-bold text-navy">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              <section className="rounded-3xl border border-line bg-white p-5 shadow-sm">
                <h3 className="mb-3 flex items-center justify-between text-xs font-black text-muted-500">
                  <span>الحضور والتقييم</span>
                  {detail.ratings.length > 0 && (
                    <span className="tabular-nums text-muted-400" dir="ltr">{detail.attended_count}/{detail.ratings_count}</span>
                  )}
                </h3>
                {detail.ratings.length === 0 && detail.attendance ? (
                  <div className="space-y-3" data-testid="report-attendance">
                    <dl className="grid grid-cols-3 gap-3 text-center">
                      {([['المدعوون', detail.attendance.invited], ['حضروا', detail.attendance.attended], ['لم يحضروا', detail.attendance.absent]] as const).map(([k, v]) => (
                        <div key={k} className="rounded-2xl bg-paper px-3 py-2.5">
                          <dd className="text-lg font-black tabular-nums text-navy">{v}</dd>
                          <dt className="text-[11px] font-bold text-muted-500">{k}</dt>
                        </div>
                      ))}
                    </dl>
                    {detail.attendance.attendees.length > 0 && (
                      <p className="text-sm font-semibold leading-7 text-ink-500"><span className="font-black text-emerald-700">الحاضرون: </span>{detail.attendance.attendees.join('، ')}</p>
                    )}
                    {detail.attendance.absent_names.length > 0 && (
                      <p className="text-sm font-semibold leading-7 text-ink-500"><span className="font-black text-accent-700">الغائبون: </span>{detail.attendance.absent_names.join('، ')}</p>
                    )}
                  </div>
                ) : detail.ratings.length === 0 ? (
                  <p className="text-sm font-semibold text-muted-500">لم يُسجَّل حضور لهذا الاجتماع.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {detail.ratings.map((row) => (
                      <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-2 text-sm">
                        <span className={`min-w-0 truncate font-bold ${row.attended ? 'text-navy' : 'text-muted-400 line-through'}`}>
                          {row.user?.name ?? 'عضو غير معروف'}
                        </span>
                        {row.attended ? (
                          row.avg_score != null ? (
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-black tabular-nums ${TONE_CLASS[scoreTone(row.avg_score)]}`}>
                              <Star size={11} aria-hidden="true" />
                              {row.avg_score}/10
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-muted-500">حضر</span>
                          )
                        ) : (
                          <span className="text-[11px] font-bold text-muted-400">غائب</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <p className="text-center text-[11px] font-semibold text-muted-400">أُضيف في {formatDateTime(detail.created_at)}</p>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
