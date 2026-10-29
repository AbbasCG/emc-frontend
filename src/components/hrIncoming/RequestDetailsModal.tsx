import { useCallback } from 'react'
import { Link } from 'react-router'
import { Check, ExternalLink, FileText, Loader2, Play, X } from 'lucide-react'
import { CenteredModal } from '@/components/ui/CenteredModal'
import type { HrRequestStatus, IncomingCapabilities, IncomingRequest } from '@/api/hrIncomingRequestsApi'
import { cn } from '@/lib/utils'
import { fetchRequestApplicants } from '@/api/volunteerOpportunitiesAdminApi'
import { ApplicantsPanel } from './ApplicantsPanel'
import { VolunteerMatchPanel } from './VolunteerMatchPanel'
import { STATUS_META, formatDate, formatDateTime } from './hrIncomingUi'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <dt className="shrink-0 font-bold text-deepBlue/50">{label}</dt>
      <dd className="text-end font-black text-deepBlue">{children}</dd>
    </div>
  )
}

/** Status transitions the existing workflow already supports. Hidden unless the server allows managing. */
const ACTIONS: { status: HrRequestStatus; label: string; icon: typeof Check; tone: string }[] = [
  { status: 'in_progress', label: 'قيد المراجعة', icon: Play, tone: 'border-customBlue/30 text-customBlue hover:bg-customBlue/[0.06]' },
  { status: 'approved', label: 'قبول', icon: Check, tone: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
  { status: 'rejected', label: 'رفض', icon: X, tone: 'border-red-300 text-red-700 hover:bg-red-50' },
]

/**
 * The request's details window: a large centered modal over the list (the list, its filters and its page stay
 * exactly as they were). It opens only from a click or Enter on a card, never from hover; Escape and the close
 * button close it unless a status change is being sent; focus is trapped inside and returns to the card.
 */
export function RequestDetailsModal({
  request,
  capabilities,
  onClose,
  onStatus,
  statusBusy,
  onMatchResult,
  onOpenDraft,
  draftBusy,
}: {
  request: IncomingRequest | null
  capabilities: IncomingCapabilities
  onClose: () => void
  onStatus: (status: HrRequestStatus) => void
  statusBusy: boolean
  onMatchResult: (found: number) => void
  onOpenDraft: () => void
  draftBusy: boolean
}) {
  const loadApplicants = useCallback(() => fetchRequestApplicants(request?.id ?? 0), [request?.id])

  return (
    <CenteredModal
      open={request !== null}
      onClose={onClose}
      size="xl"
      testId="request-modal"
      busy={statusBusy || draftBusy}
      title={request?.title ?? 'طلب احتياج'}
      subtitle={request ? `${request.department?.name ?? 'بدون قسم'} · ${formatDate(request.createdAt)}` : undefined}
      footer={
        <div className="flex justify-end">
          <button type="button" onClick={onClose} disabled={statusBusy || draftBusy} className="rounded-xl border border-deepBlue/10 bg-white px-5 py-2.5 text-sm font-black text-deepBlue disabled:opacity-60">إغلاق</button>
        </div>
      }
    >
      {request ?
        <div className="space-y-5" data-testid="request-details">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-3 py-1 text-xs font-black ring-1', STATUS_META[request.status].badge)}>{request.statusLabel}</span>
            {request.draft ?
              <span className="rounded-full bg-customBlue/10 px-3 py-1 text-xs font-black text-customBlue">
                {request.draft.status === 'draft' ? 'تم إنشاء مسودة فرصة' : `الفرصة ${request.draft.statusLabel}`}
              </span>
            : null}
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-2">
          <div className="min-w-0 space-y-5">
          <dl className="space-y-2.5 rounded-2xl border border-deepBlue/[0.07] bg-white p-4">
            <Row label="القسم الطالب">{request.department?.name ?? '—'}</Row>
            <Row label="مقدّم الطلب">{request.requester?.name ?? '—'}</Row>
            <Row label="نوع التوظيف">{request.employmentType ?? '—'}</Row>
            <Row label="المسمى الوظيفي">{request.jobTitle ?? (request.requestType || '—')}</Row>
            <Row label="العدد المطلوب">{request.requiredCount}</Row>
            <Row label="المؤهل">{request.qualification ?? '—'}</Row>
            <Row label="موجّه إلى">{request.targetAudienceLabel ?? '—'}</Row>
            <Row label="تاريخ الطلب">{formatDateTime(request.createdAt)}</Row>
            <Row label="آخر تحديث">{formatDateTime(request.updatedAt)}</Row>
          </dl>

          {request.responsibilities ?
            <section aria-label="المهام والمسؤوليات" className="space-y-2">
              <h3 className="text-sm font-black text-deepBlue">المهام والمسؤوليات</h3>
              <p className="whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-relaxed text-deepBlue/75">{request.responsibilities}</p>
            </section>
          : null}

          <section aria-label="المهارات والمواصفات" className="space-y-2">
            <h3 className="text-sm font-black text-deepBlue">المهارات والمواصفات المطلوبة</h3>
            {request.skills.length > 0 ?
              <div className="flex flex-wrap gap-1.5">{request.skills.map((s) => <span key={s} className="rounded-lg bg-customBlue/[0.07] px-2.5 py-1 text-xs font-bold text-customBlue">{s}</span>)}</div>
            : null}
            <p className="whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-relaxed text-deepBlue/75">{request.skillsAndSpecs || 'لم تُذكر مواصفات.'}</p>
            {request.notes ?
              <div className="space-y-1">
                <h4 className="text-xs font-black text-deepBlue/60">ملاحظات</h4>
                <p className="whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-relaxed text-deepBlue/75">{request.notes}</p>
              </div>
            : null}
            {request.hrFeedback ?
              <div className="space-y-1">
                <h4 className="text-xs font-black text-deepBlue/60">ملاحظة الموارد البشرية</h4>
                <p className="whitespace-pre-line rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-relaxed text-deepBlue/75">{request.hrFeedback}</p>
              </div>
            : null}
          </section>

          {capabilities.canManage ?
            <section aria-label="تحديث الحالة" className="space-y-2">
              <h3 className="text-sm font-black text-deepBlue">تحديث الحالة</h3>
              <div className="flex flex-wrap gap-2">
                {ACTIONS.filter((a) => a.status !== request.status).map((a) => (
                  <button key={a.status} type="button" disabled={statusBusy} onClick={() => onStatus(a.status)} className={cn('inline-flex items-center gap-1.5 rounded-xl border bg-white px-3.5 py-2 text-xs font-black transition disabled:opacity-60', a.tone)}>
                    {statusBusy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <a.icon size={13} aria-hidden="true" />}
                    {a.label}
                  </button>
                ))}
              </div>
            </section>
          : null}

          </div>

          <div className="min-w-0 space-y-5">
          <VolunteerMatchPanel
            key={request.id}
            requestId={request.id}
            canMatch={capabilities.canMatchVolunteers}
            canCreateDraft={capabilities.canCreateDraft}
            hasDraft={request.draft !== null}
            onDraft={onOpenDraft}
            onResult={onMatchResult}
          />

          {request.draft && capabilities.canMatchVolunteers ?
            <ApplicantsPanel key={request.id} load={loadApplicants} canReview={capabilities.canManage} emptyText="لم يتقدم أحد على الفرصة المنشورة من هذا الطلب بعد." />
          : null}

          <section aria-label="مسودة الفرصة" className="space-y-2 rounded-3xl border border-deepBlue/[0.07] bg-white p-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-deepBlue"><FileText size={15} className="text-customBlue" aria-hidden="true" /> مسودة الفرصة</h3>
            {request.draft ?
              <>
                <p className="text-xs font-bold text-deepBlue/70">الفرصة: <span className="font-black text-deepBlue">{request.draft.title}</span> · {request.draft.statusLabel}</p>
                <p className="text-[11px] font-semibold text-deepBlue/45">
                  {request.draft.status === 'draft' ? 'المسودة غير منشورة ولا تظهر للعامة.' : request.draft.status === 'published' ? `منشورة للعامة · ${request.draft.applicantsCount} متقدم.` : `${request.draft.statusLabel} · ${request.draft.applicantsCount} متقدم.`}
                </p>
                {capabilities.canViewAll ?
                  <Link to="/dashboard/hr/opportunities" className="inline-flex items-center gap-1.5 text-xs font-black text-customBlue hover:underline">
                    <ExternalLink size={12} aria-hidden="true" /> إدارة الفرص والنشر
                  </Link>
                : null}
                {capabilities.canCreateDraft && request.draft.status === 'draft' ?
                  <button type="button" onClick={onOpenDraft} disabled={draftBusy} className="inline-flex items-center gap-1.5 rounded-xl border border-customBlue/30 px-3.5 py-2 text-xs font-black text-customBlue transition hover:bg-customBlue/[0.06] disabled:opacity-60">
                    {draftBusy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
                    مراجعة المسودة وتعديلها
                  </button>
                : null}
              </>
            : <>
                <p className="text-xs font-semibold leading-relaxed text-deepBlue/60">لا توجد مسودة بعد. يمكن توليد مسودة فرصة تطوعية من بيانات هذا الطلب ومراجعتها قبل نشرها للعامة.</p>
                {capabilities.canCreateDraft ?
                  <button type="button" onClick={onOpenDraft} disabled={draftBusy} className="inline-flex items-center gap-1.5 rounded-xl bg-customOrange px-4 py-2 text-xs font-black text-white shadow-sm transition hover:brightness-105 disabled:opacity-60">
                    {draftBusy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
                    إنشاء مسودة فرصة
                  </button>
                : null}
              </>}
          </section>
          </div>
          </div>
        </div>
      : null}
    </CenteredModal>
  )
}
