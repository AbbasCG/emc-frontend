import { Building2, Calendar, CheckCircle2, Globe2, Handshake, MessageSquareText, ShieldCheck, UserPlus, UserRound } from 'lucide-react'
import type { PartnershipRequest } from '@/types/operations'
import { BORDER } from '@/components/detailModal/detailModalTokens'
import { CardShell, InfoRow } from '@/components/detailModal/detailModalUi'
import { DetailColumns, DetailFooter, DetailHeader, DetailModalShell, FooterButton, SummaryCards } from '@/components/detailModal/DetailModalParts'
import { formatDate, formatDateTime } from '@/utils/dateTime'

/**
 * The partnership request window. Shared detail-window presentation; the data, the status choices and the
 * "approve and prepare the portal account" decision are the page's own and arrive as props: this component
 * decides nothing, and the server checks every change.
 */

const PARTNERSHIP_STATUS_LABELS: Record<string, string> = { new: 'جديد', under_review: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض', archived: 'مؤرشف' }
const STATUS_CHOICES = ['new', 'under_review', 'rejected', 'archived'] as const

const BADGE: Record<string, string> = {
  new: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  under_review: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  archived: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
}

const ltr = (v?: string | null) => (v?.trim() ? <span dir="ltr">{v}</span> : null)
const orNull = (v?: string | null) => v?.trim() || null

function typeLabel(main?: string | null, other?: string | null): string | null {
  const m = orNull(main)
  const o = orNull(other)

  return m && o ? `${m} — ${o}` : (m ?? o)
}

export default function PartnershipRequestDetailModal({
  item,
  updating,
  onClose,
  onChangeStatus,
  onApprove,
}: {
  item: PartnershipRequest
  updating: boolean
  onClose: () => void
  onChangeStatus: (status: string) => void
  onApprove: () => void
}) {
  const approved = item.status === 'approved'
  const created = item.created_at ? formatDate(item.created_at) : null

  return (
    <DetailModalShell
      onClose={onClose}
      busy={updating}
      labelledBy="partnership-request-title"
      testId="partnership-request-modal"
      header={(close) => (
        <DetailHeader
          name={item.partner_name}
          titleId="partnership-request-title"
          badge={<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black ${BADGE[item.status] ?? BADGE.archived}`}>{PARTNERSHIP_STATUS_LABELS[item.status] ?? item.status}</span>}
          email={item.email}
          subtitle={[item.contact_name ? `ممثل الجهة: ${item.contact_name}` : '', created ? `تاريخ الطلب: ${created}` : ''].filter(Boolean).join(' · ')}
          onClose={close}
          closeDisabled={updating}
        />
      )}
      footer={
        <DetailFooter
          start={
            approved ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-700"><CheckCircle2 size={14} aria-hidden /> الشراكة معتمدة وملف الشريك جاهز</span>
            ) : (
              <label className="flex items-center gap-2 text-[12px] font-black text-deepBlue">
                تحديث الحالة
                <select
                  aria-label="تحديث الحالة"
                  value={item.status}
                  disabled={updating}
                  onChange={(e) => onChangeStatus(e.target.value)}
                  className={`h-10 min-w-44 rounded-xl border ${BORDER} bg-white px-3 text-[12px] font-bold text-deepBlue outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/20 disabled:opacity-60`}
                >
                  {STATUS_CHOICES.map((s) => <option key={s} value={s}>{PARTNERSHIP_STATUS_LABELS[s]}</option>)}
                </select>
              </label>
            )
          }
          end={approved ? undefined : <FooterButton tone="primary" icon={UserPlus} disabled={updating} loading={updating} onClick={onApprove}>اعتماد وتجهيز البوابة</FooterButton>}
        />
      }
    >
      <SummaryCards
        items={[
          { icon: Building2, label: 'نوع الجهة', value: typeLabel(item.type, item.type_other) },
          { icon: Handshake, label: 'نوع الشراكة', value: typeLabel(item.partnership_type, item.partnership_type_other) },
          { icon: Globe2, label: 'الدولة', value: [item.country, item.city].filter(Boolean).join('، ') || null },
          { icon: Calendar, label: 'تاريخ الطلب', value: created },
        ]}
      />
      <DetailColumns
        side={
          <>
            <CardShell title="معلومات الجهة" icon={Building2}>
              <InfoRow label="اسم الجهة" value={orNull(item.partner_name)} />
              <InfoRow label="نوع الجهة" value={typeLabel(item.type, item.type_other)} />
              <InfoRow label="الدولة" value={orNull(item.country)} />
              <InfoRow label="المدينة" value={orNull(item.city)} />
              <InfoRow label="الموقع الإلكتروني" value={item.website?.trim() ? <a href={item.website} target="_blank" rel="noopener noreferrer" dir="ltr" className="text-customBlue hover:underline">{item.website}</a> : null} last />
            </CardShell>
            <CardShell title="بيانات التواصل" icon={UserRound}>
              <InfoRow label="ممثل الجهة" value={orNull(item.contact_name)} />
              <InfoRow label="البريد الإلكتروني" value={ltr(item.email)} />
              <InfoRow label="الهاتف" value={item.phone?.trim() ? <a href={`tel:${item.phone}`} dir="ltr" className="text-customBlue hover:underline">{item.phone}</a> : null} last />
            </CardShell>
          </>
        }
        main={
          <>
            <CardShell title="مقترح الشراكة" icon={MessageSquareText}>
              <InfoRow label="نوع الشراكة" value={typeLabel(item.partnership_type, item.partnership_type_other)} wide />
              <InfoRow label="الرسالة" value={orNull(item.message)} preserveLineBreaks wide last />
            </CardShell>
            <CardShell title="المراجعة والقرار" icon={ShieldCheck}>
              <InfoRow label="الحالة الحالية" value={PARTNERSHIP_STATUS_LABELS[item.status] ?? item.status} wide />
              <InfoRow label="المراجع" value={orNull(item.reviewed_by?.name)} wide />
              <InfoRow label="تاريخ المراجعة" value={item.reviewed_at ? formatDateTime(item.reviewed_at) : null} wide />
              <InfoRow label="ملاحظات المراجعة" value={orNull(item.review_notes)} preserveLineBreaks wide />
              <InfoRow label="الموافقة على الخصوصية" value={item.privacy_accepted === undefined ? null : item.privacy_accepted ? 'نعم' : 'لا'} wide last />
              {approved ?
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-[12px] font-bold text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    ملف الشريك جاهز
                    {item.converted_partner?.name ? <span className="mt-1 block font-semibold">{item.converted_partner.name}</span> : null}
                    {item.converted_user?.email ? <span className="mt-1 block font-semibold" dir="ltr">{item.converted_user.email}</span> : null}
                  </span>
                </div>
              : null}
            </CardShell>
          </>
        }
      />
    </DetailModalShell>
  )
}
