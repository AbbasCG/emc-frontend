import { useId } from 'react'
import { Building2, Calendar, CheckCircle2, Clock, Eye, MapPin } from 'lucide-react'
import type { VolunteerRequest } from '@/api/volunteerApplicationApi'
import { DetailFooter, DetailHeader, DetailModalShell, FooterButton, SummaryCards } from '@/components/detailModal/DetailModalParts'
import { codeLabel, textOrNull } from '@/lib/volunteerRequestLabels'
import { formatDate } from '@/utils/dateTime'
import ResendCredentialsButton from './ResendCredentialsButton'
import VolunteerDataSections from './VolunteerDataSections'
import { isConvertedRequest, requestCvUrl } from './volunteerRequestStatus'

/**
 * The window that opens from a volunteer's NAME on the accepted-volunteers page: all of that volunteer's data, read
 * only. It cannot convert anyone (conversion lives on the volunteer-requests page); for an already converted
 * volunteer it keeps «إعادة إرسال بيانات الدخول».
 *
 * Built on the shared detail window, so it is a modal dialog with a labelled title, focus moved in and returned to
 * the opener, Escape to close (unless another layer is open) and a scrollable body on a phone.
 */

/** «تم التحويل» / «بانتظار التحويل»: the one status the accepted-volunteers page is about. */
export function ConversionBadge({ converted, pendingLabel = 'بانتظار التحويل' }: { converted: boolean; pendingLabel?: string }) {
  return converted ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200/80">
      <CheckCircle2 size={12} aria-hidden="true" />
      تم التحويل
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-black text-amber-800 ring-1 ring-amber-200/80">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      {pendingLabel}
    </span>
  )
}

export default function AcceptedVolunteerDialog({ request, onClose }: { request: VolunteerRequest; onClose: () => void }) {
  const titleId = useId()
  const converted = isConvertedRequest(request)
  const cvUrl = requestCvUrl(request)

  return (
    <DetailModalShell
      onClose={onClose}
      labelledBy={titleId}
      testId="accepted-volunteer-dialog"
      header={(close) => (
        <DetailHeader
          name={request.full_name}
          titleId={titleId}
          badge={<ConversionBadge converted={converted} />}
          email={request.email}
          subtitle={[request.desired_department, request.city].filter(Boolean).join(' · ') || undefined}
          onClose={close}
        />
      )}
      footer={
        <DetailFooter
          end={
            <>
              {converted ? (
                <ResendCredentialsButton
                  requestId={request.id}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-black text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40 disabled:cursor-not-allowed disabled:opacity-50"
                />
              ) : null}
              <FooterButton onClick={onClose}>إغلاق</FooterButton>
            </>
          }
        />
      }
    >
      <SummaryCards
        items={[
          { icon: Building2, label: 'القسم المطلوب', value: textOrNull(request.desired_department) },
          { icon: Clock, label: 'التوافر', value: codeLabel(request.volunteer_days_availability) ?? codeLabel(request.availability) },
          { icon: MapPin, label: 'المدينة', value: textOrNull(request.city) },
          { icon: Calendar, label: 'تاريخ القبول', value: request.accepted_at ? formatDate(request.accepted_at) : null },
        ]}
        trailing={
          cvUrl ? (
            <a
              href={cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-customBlue px-3.5 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40"
            >
              <Eye size={14} aria-hidden="true" /> معاينة السيرة الذاتية
            </a>
          ) : null
        }
      />
      <VolunteerDataSections request={request} />
    </DetailModalShell>
  )
}
