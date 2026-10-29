import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Briefcase, Building2, Calendar, CheckCircle2, Clock, Copy, ExternalLink, Eye, FileText, GraduationCap, History, Target, UserRound, Users, Video, XCircle } from 'lucide-react'
import toast, { promiseToast } from '@/lib/toast'
import { updateVolunteerRequestStatus, type VolunteerRequest, type VolunteerRequestStatus } from '@/api/volunteerApplicationApi'
import { formatDate, formatDateTime } from '@/utils/dateTime'
import { STATUS_CFG } from './volunteerRequestStatus'
import { BORDER, FOOTER_LINK_CLASS } from '@/components/detailModal/detailModalTokens'
import { CardShell, Chips, InfoRow } from '@/components/detailModal/detailModalUi'
import { DetailColumns, DetailFooter, DetailHeader, DetailModalShell, DocumentCard, FooterButton, SummaryCards } from '@/components/detailModal/DetailModalParts'

/**
 * The volunteer APPLICATION window (/dashboard/super-admin/volunteer-requests and the accepted-volunteers list).
 *
 * Built on the shared detail-window parts, so it matches the HR volunteer profile window exactly. Only the
 * presentation is shared: this is still an application, with its own data, actions (accept, reject, schedule an
 * interview, WhatsApp, status and notes) and status rules, all enforced by the server.
 */

const ALL_STATUSES: VolunteerRequestStatus[] = ['pending', 'reviewing', 'reviewed', 'accepted', 'rejected', 'contacted', 'converted_to_member']

function StatusBadge({ status }: { status: VolunteerRequestStatus }) {
  const cfg = STATUS_CFG[status]

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black ${cfg.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden />
      {cfg.label}
    </span>
  )
}

const splitSkills = (raw?: string | null): string[] => (raw?.trim() ? raw.split(/[,،\n]+/).map((s) => s.trim()).filter(Boolean) : [])
const genderLabel = (g?: string | null): string | null => (g === 'male' ? 'ذكر' : g === 'female' ? 'أنثى' : g || null)
const orNull = (value?: string | null): string | null => String(value ?? '').trim() || null

function whatsAppUrl(phone?: string | null): string | null {
  if (!phone?.trim()) return null
  const digits = phone.replace(/\D/g, '')

  return digits.length < 8 ? null : `https://wa.me/${digits}`
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export type VolunteerRequestDetailModalProps = {
  req: VolunteerRequest
  onClose: () => void
  onUpdated: (updated: VolunteerRequest) => void
  onOpenConvert?: (req: VolunteerRequest) => void
}

export default function VolunteerRequestDetailModal({ req, onClose, onUpdated }: VolunteerRequestDetailModalProps) {
  const [adminNotes, setAdminNotes] = useState(req.admin_notes ?? '')
  const [selectedStatus, setSelectedStatus] = useState<VolunteerRequestStatus>(req.status)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // A different request shown in the same window starts from its own values (adjusting state when a prop changes).
  const [seenReq, setSeenReq] = useState(req)
  if (seenReq !== req) {
    setSeenReq(req)
    setAdminNotes(req.admin_notes ?? '')
    setSelectedStatus(req.status)
    setDirty(false)
  }

  const skills = useMemo(() => splitSkills(req.skills), [req.skills])
  const cvViewUrl = req.cv_view_url ?? req.cv_file_url ?? null
  const wa = whatsAppUrl(req.phone)

  async function save() {
    setSaving(true)
    try {
      const updated = await promiseToast(updateVolunteerRequestStatus(req.id, selectedStatus, adminNotes || undefined), { loading: 'جاري الحفظ...', success: 'تم حفظ التغييرات', error: 'تعذّر الحفظ.' })
      onUpdated(updated)
      setDirty(false)
    } catch {
      /* the toast reports it */
    } finally {
      setSaving(false)
    }
  }

  async function quickStatus(status: VolunteerRequestStatus) {
    setSaving(true)
    try {
      const updated = await promiseToast(updateVolunteerRequestStatus(req.id, status, adminNotes || undefined), { loading: 'جاري التحديث...', success: 'تم التحديث', error: 'تعذّر التحديث.' })
      onUpdated(updated)
      setSelectedStatus(status)
      setDirty(false)
      if (status === 'rejected') onClose()
    } catch {
      /* the toast reports it */
    } finally {
      setSaving(false)
    }
  }

  async function copyPhone() {
    if (!req.phone) return
    try {
      await navigator.clipboard.writeText(req.phone)
      toast.success('تم نسخ الرقم')
    } catch {
      toast.error('تعذر نسخ الرقم')
    }
  }

  return (
    <DetailModalShell
      onClose={onClose}
      dirty={dirty}
      busy={saving}
      labelledBy="volunteer-request-title"
      testId="volunteer-request-modal"
      dirtyMessage="لديك ملاحظات أو حالة لم تُحفظ. إن أغلقت النافذة الآن ستضيع."
      header={(close) => (
        <DetailHeader
          name={req.full_name}
          titleId="volunteer-request-title"
          badge={<StatusBadge status={req.status} />}
          email={req.email}
          subtitle={`${req.created_at ? `تاريخ التقديم: ${formatDate(req.created_at)}` : ''}${req.opportunity_title ? ` · الفرصة: ${req.opportunity_title}` : ''}`}
          onClose={close}
          closeDisabled={saving}
        />
      )}
      footer={
        <DetailFooter
          start={
            <>
              <FooterButton tone="primary" onClick={() => void save()} disabled={!dirty || saving} loading={saving}>حفظ التغييرات</FooterButton>
              {wa ?
                <a href={wa} target="_blank" rel="noopener noreferrer" className={FOOTER_LINK_CLASS}>
                  <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600" /> واتساب
                </a>
              : null}
              <FooterButton icon={Video} disabled={saving} onClick={() => void quickStatus('reviewed')}>جدولة مقابلة</FooterButton>
              {dirty ? <span className="text-[11px] font-bold text-slate-500" role="status">لديك تغييرات غير محفوظة</span> : null}
            </>
          }
          end={
            <>
              <FooterButton tone="success" icon={CheckCircle2} disabled={saving || req.status === 'accepted'} onClick={() => void quickStatus('accepted')}>قبول</FooterButton>
              <FooterButton tone="danger" icon={XCircle} disabled={saving || req.status === 'rejected'} onClick={() => void quickStatus('rejected')}>رفض</FooterButton>
            </>
          }
        />
      }
    >
      <SummaryCards
        items={[
          { icon: Building2, label: 'القسم المطلوب', value: orNull(req.desired_department) },
          { icon: Clock, label: 'التوفر', value: orNull(req.availability) },
          { icon: Briefcase, label: 'مستوى الخبرة', value: orNull(req.experience_level) },
          { icon: Calendar, label: 'تاريخ التقديم', value: req.created_at ? formatDate(req.created_at) : null },
        ]}
        trailing={
          cvViewUrl ?
            <a href={cvViewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-customBlue px-3.5 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40">
              <Eye size={14} aria-hidden /> معاينة السيرة الذاتية
            </a>
          : null
        }
      />

      <DetailColumns
        side={
          <>
            <CardShell title="المعلومات الشخصية" icon={UserRound}>
              <InfoRow label="الاسم الكامل" value={req.full_name} />
              <InfoRow label="الجنس" value={genderLabel(req.gender)} />
              <InfoRow label="البريد الإلكتروني" value={<span dir="ltr">{req.email}</span>} />
              <InfoRow
                label="رقم الهاتف"
                value={req.phone ? <a href={`tel:${req.phone}`} dir="ltr" className="text-customBlue hover:underline">{req.phone}</a> : null}
                trailing={req.phone ?
                  <button type="button" onClick={() => void copyPhone()} className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-customBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/30" aria-label="نسخ الرقم"><Copy size={13} /></button>
                : undefined}
              />
              <InfoRow label="الدولة" value={orNull(req.country)} />
              <InfoRow label="المدينة" value={orNull(req.city)} last />
            </CardShell>

            <CardShell title="المهارات والخبرات" icon={GraduationCap}>
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-[11px] font-bold text-slate-400">المهارات</p>
                  <Chips items={skills} />
                </div>
                <InfoRow label="الخبرات السابقة" value={orNull(req.previous_experience)} preserveLineBreaks />
                <InfoRow label="الدافع للتطوع" value={orNull(req.motivation)} preserveLineBreaks />
                <InfoRow label="ملاحظات المتقدم" value={orNull(req.notes)} preserveLineBreaks last />
              </div>
            </CardShell>
          </>
        }
        main={
          <>
            <CardShell title="معلومات التطوع" icon={Users}>
              <InfoRow label="القسم المطلوب" value={orNull(req.desired_department)} wide />
              <InfoRow label="التوفر" value={orNull(req.availability)} wide />
              <InfoRow label="مستوى الخبرة" value={orNull(req.experience_level)} wide />
              {req.opportunity_title ? <InfoRow label="الفرصة المتقدَّم عليها" value={req.opportunity_title} wide /> : null}
              <InfoRow label="تاريخ التقديم" value={req.created_at ? formatDateTime(req.created_at) : null} wide last />
            </CardShell>

            <CardShell title="الوثائق" icon={FileText}>
              {cvViewUrl ? <DocumentCard name="السيرة الذاتية" meta="ملف مرفوع من المتقدم · رابط معاينة مؤقت" href={cvViewUrl} /> : <p className="text-[12px] font-semibold text-slate-300">غير متوفر</p>}
            </CardShell>

            <CardShell title="مراجعة الطلب" icon={Target}>
              <div className="space-y-3">
                <div>
                  <label htmlFor="volunteer-status-select" className="mb-1.5 block text-[11px] font-bold text-slate-400">حالة الطلب</label>
                  <select
                    id="volunteer-status-select"
                    value={selectedStatus}
                    disabled={saving}
                    onChange={(e) => { setSelectedStatus(e.target.value as VolunteerRequestStatus); setDirty(true) }}
                    dir="rtl"
                    className={`h-11 w-full rounded-xl border ${BORDER} bg-white px-3.5 text-[13px] font-bold text-deepBlue outline-none transition focus:border-customBlue focus:ring-2 focus:ring-customBlue/20`}
                  >
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="volunteer-admin-notes" className="mb-1.5 block text-[11px] font-bold text-slate-400">ملاحظات الإدارة</label>
                  <textarea
                    id="volunteer-admin-notes"
                    value={adminNotes}
                    disabled={saving}
                    onChange={(e) => { setAdminNotes(e.target.value); setDirty(true) }}
                    placeholder="ملاحظات داخلية للفريق..."
                    rows={3}
                    className={`w-full resize-none rounded-xl border ${BORDER} bg-white px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-deepBlue outline-none transition placeholder:text-slate-400 focus:border-customBlue focus:ring-2 focus:ring-customBlue/20`}
                  />
                </div>
              </div>
            </CardShell>

            <CardShell title="سجل الطلب" icon={History}>
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <InfoRow label="تاريخ التقديم" value={req.created_at ? formatDateTime(req.created_at) : null} />
                <InfoRow label="تاريخ المراجعة" value={req.reviewed_at ? formatDateTime(req.reviewed_at) : null} />
                <InfoRow label="تاريخ القبول" value={req.accepted_at ? formatDateTime(req.accepted_at) : null} last />
                <InfoRow label="آخر تحديث" value={req.updated_at ? formatDateTime(req.updated_at) : null} last />
              </div>
              {req.status === 'accepted' ?
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <p className="flex-1 text-[12px] font-bold text-emerald-800">تم قبول الطلب. يمكن تحويل المتطوع إلى عضو من قائمة المتطوعين المقبولين.</p>
                  <Link to="/dashboard/volunteer" onClick={onClose} className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50">
                    <ExternalLink className="h-3 w-3" aria-hidden /> عرض المتطوعين المقبولين
                  </Link>
                </div>
              : null}
            </CardShell>
          </>
        }
      />
    </DetailModalShell>
  )
}
