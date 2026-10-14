import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Check, Eye, Loader2, Lock, Play, RefreshCw, ShieldAlert, UserRound, X } from 'lucide-react'
import toast from '@/lib/toast'
import { cn } from '@/lib/utils'
import { classifyIncomingError, incomingErrorMessage } from '@/api/hrIncomingRequestsApi'
import { setApplicantStatus, type Applicant, type ApplicantsResult } from '@/api/volunteerOpportunitiesAdminApi'
import { formatDate } from './hrIncomingUi'

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-customOrange/10 text-customOrange ring-customOrange/30',
  reviewing: 'bg-customBlue/10 text-customBlue ring-customBlue/25',
  reviewed: 'bg-customBlue/10 text-customBlue ring-customBlue/25',
  accepted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  contacted: 'bg-violet-50 text-violet-700 ring-violet-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  converted_to_member: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

const ACTIONS = [
  { status: 'reviewing' as const, label: 'بدء المراجعة', icon: Play, tone: 'border-customBlue/30 text-customBlue hover:bg-customBlue/[0.06]' },
  { status: 'accepted' as const, label: 'قبول', icon: Check, tone: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
  { status: 'rejected' as const, label: 'رفض', icon: X, tone: 'border-red-300 text-red-700 hover:bg-red-50' },
]

type Phase = 'loading' | 'ready' | 'forbidden' | 'error'

/**
 * Applicants who applied directly to an opportunity (and, through it, to the incoming request it was
 * made from). Review uses the EXISTING volunteer-application workflow and endpoint: a status change
 * here never touches the incoming request, and nothing is assigned or accepted automatically.
 *
 * Shows triage information only; contact details, CV and notes stay on the application page.
 */
export function ApplicantsPanel({
  load,
  canReview,
  emptyText = 'لم يتقدم أحد بعد.',
  onChanged,
}: {
  /** Fetches the applicants (of a request or of an opportunity). */
  load: () => Promise<ApplicantsResult>
  canReview: boolean
  emptyText?: string
  onChanged?: () => void
}) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [data, setData] = useState<ApplicantsResult | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const run = useCallback(async () => {
    setPhase('loading')
    try {
      setData(await load())
      setPhase('ready')
    } catch (e) {
      setPhase(classifyIncomingError(e) === 'forbidden' ? 'forbidden' : 'error')
    }
  }, [load])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount / when the source changes; the loading state must reset before the request
    void run()
  }, [run])

  async function review(a: Applicant, status: 'reviewing' | 'accepted' | 'rejected') {
    setBusyId(a.id)
    try {
      await setApplicantStatus(a.id, status)
      toast.success('تم تحديث حالة المتقدم.')
      await run()
      onChanged?.()
    } catch (e) {
      toast.error(incomingErrorMessage(e, 'تعذّر تحديث حالة المتقدم.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section aria-label="المتقدمون" className="space-y-3 rounded-3xl border border-deepBlue/[0.07] bg-white p-4" data-testid="applicants-panel">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black text-deepBlue">
          <UserRound size={15} className="text-customBlue" aria-hidden="true" /> المتقدمون
          {data ? <span className="rounded-full bg-deepBlue/[0.06] px-2 py-0.5 text-[11px] font-black" data-testid="applicants-total">{data.total}</span> : null}
        </h3>
        <button type="button" onClick={() => void run()} disabled={phase === 'loading'} className="inline-flex items-center gap-1 text-[11px] font-black text-customBlue disabled:opacity-50" aria-label="تحديث المتقدمين">
          <RefreshCw size={12} className={cn(phase === 'loading' && 'animate-spin')} aria-hidden="true" /> تحديث
        </button>
      </header>

      {phase === 'loading' && !data ?
        <p role="status" className="flex items-center gap-2 text-xs font-bold text-deepBlue/55"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> جاري تحميل المتقدمين…</p>
      : phase === 'forbidden' ?
        <p role="alert" className="flex items-center gap-2 text-xs font-bold text-deepBlue/55"><Lock size={13} aria-hidden="true" /> لا تملك صلاحية عرض بيانات المتقدمين.</p>
      : phase === 'error' ?
        <p role="alert" className="flex items-center gap-2 text-xs font-bold text-red-700"><ShieldAlert size={13} aria-hidden="true" /> تعذّر تحميل المتقدمين.</p>
      : data ?
        <>
          {data.opportunity ?
            <p className="text-[11px] font-bold text-deepBlue/55">الفرصة: <span className="font-black text-deepBlue">{data.opportunity.title}</span> · {data.opportunity.statusLabel}{data.opportunity.acceptsApplications ? '' : ' · التقديم مغلق'}</p>
          : null}

          {data.total > 0 ?
            <p className="flex flex-wrap gap-1.5 text-[11px] font-bold" data-testid="applicant-counts">
              {Object.entries(data.counts).filter(([, n]) => n > 0).map(([k, n]) => (
                <span key={k} className={cn('rounded-full px-2.5 py-0.5 ring-1', STATUS_TONE[k] ?? 'bg-slate-100 text-slate-600 ring-slate-200')}>
                  {data.items.find((i) => i.status === k)?.statusLabel ?? k}: {n}
                </span>
              ))}
            </p>
          : null}

          {data.items.length === 0 ?
            <p className="text-xs font-semibold text-deepBlue/55">{emptyText}</p>
          : <ul className="space-y-2.5">
              {data.items.map((a) => (
                <li key={a.id} data-testid="applicant" className="space-y-2 rounded-2xl border border-deepBlue/[0.07] bg-slate-50/60 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-black text-deepBlue">{a.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-customOrange/10 px-2.5 py-0.5 text-[10px] font-black text-customOrange" data-testid="applicant-source">{a.sourceLabel}</span>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1', STATUS_TONE[a.status] ?? 'bg-slate-100 text-slate-600 ring-slate-200')}>{a.statusLabel}</span>
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-deepBlue/50">
                    قدّم في {formatDate(a.appliedAt)}{a.experienceLevel ? ` · ${a.experienceLevel}` : ''}{a.availability ? ` · ${a.availability}` : ''}
                  </p>
                  {a.opportunity ? <p className="text-[11px] font-bold text-deepBlue/50">عبر الفرصة: {a.opportunity.title}</p> : null}
                  {a.skills ? <p className="text-xs font-semibold leading-relaxed text-deepBlue/70">{a.skills}</p> : null}

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <Link to={a.url} className="inline-flex items-center gap-1.5 rounded-xl border border-customBlue/30 bg-white px-3 py-1.5 text-[11px] font-black text-customBlue transition hover:bg-customBlue/[0.06]">
                      <Eye size={12} aria-hidden="true" /> عرض الطلب
                    </Link>
                    {canReview ?
                      ACTIONS.filter((x) => x.status !== a.status).map((x) => (
                        <button key={x.status} type="button" disabled={busyId === a.id} onClick={() => void review(a, x.status)} className={cn('inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-1.5 text-[11px] font-black transition disabled:opacity-60', x.tone)}>
                          {busyId === a.id ? <Loader2 size={11} className="animate-spin" aria-hidden="true" /> : <x.icon size={11} aria-hidden="true" />}
                          {x.label}
                        </button>
                      ))
                    : null}
                  </div>
                </li>
              ))}
            </ul>}
        </>
      : null}
    </section>
  )
}
