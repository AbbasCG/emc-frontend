import { useState } from 'react'
import { Briefcase, Calendar, Clock, FileText, Globe2, MessageSquareText, Sparkles, UserRound } from 'lucide-react'
import toast from '@/lib/toast'
import { updateConsultantApplicationStatus, type ConsultantApplication } from '@/api/consultantApi'
import { BORDER } from '@/components/detailModal/detailModalTokens'
import { CardShell, InfoRow } from '@/components/detailModal/detailModalUi'
import { DetailColumns, DetailFooter, DetailHeader, DetailModalShell, DocumentCard, FooterButton, SummaryCards } from '@/components/detailModal/DetailModalParts'
import { formatDate, formatDateTime } from '@/utils/dateTime'

/**
 * The consultant application window. Shared detail-window presentation; the data, the status workflow
 * (under review → interview → accepted / rejected) and the reviewer note are this page's own, and the server
 * decides what a reviewer may do.
 */

const CONSULTANT_STATUS_LABELS: Record<ConsultantApplication['status'], string> = {
  new: 'جديد',
  under_review: 'قيد المراجعة',
  interview: 'مقابلة',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  archived: 'مؤرشف',
}

const BADGE: Record<ConsultantApplication['status'], string> = {
  new: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  under_review: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  interview: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  accepted: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  archived: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
}

const ACTIONS = ['under_review', 'interview', 'accepted', 'rejected'] as const
const TONE = { under_review: 'neutral', interview: 'neutral', accepted: 'success', rejected: 'danger' } as const

const ltr = (v?: string | null) => (v?.trim() ? <span dir="ltr">{v}</span> : null)

export default function ConsultantApplicationDetailModal({ app, onClose, onUpdated }: { app: ConsultantApplication; onClose: () => void; onUpdated: (next: ConsultantApplication) => void }) {
  const [note, setNote] = useState(app.reviewer_note ?? '')
  const [busy, setBusy] = useState<ConsultantApplication['status'] | null>(null)
  const dirty = note !== (app.reviewer_note ?? '')

  async function move(status: ConsultantApplication['status']) {
    setBusy(status)
    try {
      const updated = await updateConsultantApplicationStatus(app.id, status, note.trim() || undefined)
      onUpdated({ ...app, ...updated })
      toast.success(`الحالة الآن: ${CONSULTANT_STATUS_LABELS[status]}`)
    } catch {
      toast.error('تعذر تحديث الحالة')
    } finally {
      setBusy(null)
    }
  }

  const created = app.created_at ? formatDate(app.created_at) : null

  return (
    <DetailModalShell
      onClose={onClose}
      dirty={dirty}
      busy={busy !== null}
      labelledBy="consultant-application-title"
      testId="consultant-application-modal"
      dirtyMessage="كتبت ملاحظة مراجعة لم تُحفظ. إن أغلقت النافذة الآن ستضيع."
      header={(close) => (
        <DetailHeader
          name={app.full_name}
          titleId="consultant-application-title"
          badge={<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black ${BADGE[app.status]}`}>{CONSULTANT_STATUS_LABELS[app.status]}</span>}
          email={app.email}
          subtitle={created ? `تاريخ التقديم: ${created}` : undefined}
          onClose={close}
          closeDisabled={busy !== null}
        />
      )}
      footer={
        <DetailFooter
          start={<>{dirty ? <span className="text-[11px] font-bold text-slate-500" role="status">ملاحظة المراجعة تُحفظ مع أي قرار تختاره</span> : null}</>}
          end={ACTIONS.filter((s) => s !== app.status).map((s) => (
            <FooterButton key={s} tone={TONE[s]} disabled={busy !== null} loading={busy === s} onClick={() => void move(s)}>
              {CONSULTANT_STATUS_LABELS[s]}
            </FooterButton>
          ))}
        />
      }
    >
      <SummaryCards
        items={[
          { icon: Sparkles, label: 'التخصص', value: app.specialty },
          { icon: Briefcase, label: 'الإدارة المرغوبة', value: app.desired_department },
          { icon: Clock, label: 'سنوات الخبرة', value: app.years_experience != null ? `${app.years_experience} سنة` : null },
          { icon: Calendar, label: 'تاريخ التقديم', value: created },
        ]}
      />
      <DetailColumns
        side={
          <>
            <CardShell title="المعلومات الشخصية" icon={UserRound}>
              <InfoRow label="الاسم الكامل" value={app.full_name} />
              <InfoRow label="البريد الإلكتروني" value={ltr(app.email)} />
              <InfoRow label="رقم الجوال" value={app.phone ? <a href={`tel:${app.phone}`} dir="ltr" className="text-customBlue hover:underline">{app.phone}</a> : null} />
              <InfoRow label="الدولة" value={app.country} />
              <InfoRow label="المدينة" value={app.city} />
              <InfoRow label="لينكدإن" value={app.linkedin_url ? <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer" dir="ltr" className="text-customBlue hover:underline">{app.linkedin_url}</a> : null} last />
            </CardShell>
            <CardShell title="الوثائق" icon={FileText}>
              {app.cv_view_url ? <DocumentCard name="السيرة الذاتية" meta="ملف مرفوع من المتقدم · رابط معاينة مؤقت" href={app.cv_view_url} /> : <p className="text-[12px] font-semibold text-slate-300">غير متوفر</p>}
            </CardShell>
          </>
        }
        main={
          <>
            <CardShell title="الخبرة والتخصص" icon={Globe2}>
              <InfoRow label="التخصص" value={app.specialty} wide />
              <InfoRow label="الإدارة المرغوبة" value={app.desired_department} wide />
              <InfoRow label="سنوات الخبرة" value={app.years_experience != null ? `${app.years_experience} سنة` : null} wide />
              <InfoRow label="التوفر" value={app.availability} wide last />
            </CardShell>
            <CardShell title="الدافع والمبررات" icon={MessageSquareText}>
              <InfoRow label="دافع الانضمام" value={app.motivation?.trim() || null} preserveLineBreaks last />
            </CardShell>
            <CardShell title="مراجعة الطلب" icon={UserRound}>
              <label htmlFor="consultant-review-note" className="mb-1.5 block text-[11px] font-bold text-slate-400">ملاحظة المراجعة (اختياري)</label>
              <textarea
                id="consultant-review-note"
                value={note}
                disabled={busy !== null}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="سبب القرار أو ما يلزم من المتقدم..."
                className={`w-full resize-none rounded-xl border ${BORDER} bg-white px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-deepBlue outline-none transition placeholder:text-slate-400 focus:border-customBlue focus:ring-2 focus:ring-customBlue/20`}
              />
              {app.reviewer ? <p className="mt-2 text-[11px] font-semibold text-slate-400">آخر مراجع: {app.reviewer.name}</p> : null}
              {app.created_at ? <p className="mt-1 text-[11px] font-semibold text-slate-400">وصل الطلب: {formatDateTime(app.created_at)}</p> : null}
            </CardShell>
          </>
        }
      />
    </DetailModalShell>
  )
}
