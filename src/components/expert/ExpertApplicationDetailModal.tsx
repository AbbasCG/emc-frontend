import { useEffect, useState, type ReactNode } from 'react'
import { AlertCircle, Briefcase, Calendar, CheckCircle, Clock, Globe2, GraduationCap, Loader2, MessageSquareText, ShieldCheck, Sparkles, UserRound, XCircle } from 'lucide-react'
import toast from '@/lib/toast'
import {
  EXPERT_STATUS_LABELS,
  EXPERT_STATUS_TRANSITIONS,
  fetchExpertApplication,
  updateExpertApplicationStatus,
  type ExpertApplicationDetail,
  type ExpertApplicationStatus,
} from '@/api/expertApplicationsAdminApi'
import { CardShell, Chips, InfoRow } from '@/components/detailModal/detailModalUi'
import { DetailColumns, DetailFooter, DetailHeader, DetailHeaderPlaceholder, DetailModalShell, DetailStateModal, FooterButton, SummaryCards } from '@/components/detailModal/DetailModalParts'
import { classifyDetailError } from '@/hooks/useDetailRecord'

/**
 * The AI expert / trainer application window. Presentation is the shared detail window (the HR volunteer profile
 * design); the data, the allowed status transitions and the confirmation for final decisions are this page's own.
 * Which transition is allowed is decided by the server; the buttons only mirror `EXPERT_STATUS_TRANSITIONS`.
 */

const ACTION_LABELS: Record<ExpertApplicationStatus, string> = { new: '', under_review: 'بدء المراجعة', approved: 'قبول الطلب', rejected: 'رفض الطلب' }

type FieldDef = [key: string, label: string]

/** The submitted fields grouped into the window's cards, in form order. Internal columns are not listed. */
const PERSONAL: FieldDef[] = [['full_name', 'الاسم الكامل'], ['email', 'البريد الإلكتروني'], ['whatsapp_number', 'رقم واتساب'], ['country', 'الدولة'], ['city', 'المدينة'], ['linkedin_url', 'لينكدإن']]
const QUALIFICATIONS: FieldDef[] = [
  ['primary_specialty', 'التخصص الأساسي'], ['academic_qualification', 'المؤهل العلمي'], ['current_employer', 'جهة العمل الحالية'], ['job_title', 'المسمى الوظيفي'],
  ['years_of_experience', 'سنوات الخبرة'], ['expertise_fields', 'مجالات الخبرة'], ['expertise_level', 'مستوى الخبرة'], ['tools_technologies', 'الأدوات والتقنيات'], ['contribution_roles', 'أدوار المساهمة'],
]
const ROLE_SPECIFIC: FieldDef[] = [
  ['trainer_fields', 'مجالات التدريب'], ['trainer_program_types', 'أنواع البرامج'], ['trainer_target_audiences', 'الفئات المستهدفة'], ['trainer_delivery_mode', 'نمط التقديم'],
  ['trainer_has_experience', 'خبرة تدريبية سابقة'], ['trainer_years_experience', 'سنوات التدريب'], ['trainer_previous_courses', 'دورات سابقة'], ['trainer_content_readiness', 'جاهزية المحتوى'],
  ['expert_specialty_areas', 'مجالات التخصص'], ['expert_contribution_types', 'أنواع مساهمة الخبير'], ['expert_achievements', 'الإنجازات'], ['expert_has_certifications', 'لديه شهادات'],
  ['expert_certifications_details', 'تفاصيل الشهادات'], ['consultant_fields', 'مجالات الاستشارة'], ['consultant_types', 'أنواع الاستشارات'], ['consultant_previous_clients', 'عملاء سابقون'],
  ['consultant_target_clients', 'العملاء المستهدفون'], ['events_types', 'أنواع الفعاليات'], ['events_contribution_areas', 'مجالات المساهمة في الفعاليات'], ['events_previous_events', 'فعاليات سابقة'],
  ['mentor_fields', 'مجالات الإرشاد'], ['mentor_target_audiences', 'فئات الإرشاد'], ['mentor_session_types', 'أنواع جلسات الإرشاد'], ['evaluator_fields', 'مجالات التقييم'],
  ['evaluator_types', 'أنواع التقييم'], ['participant_project_types', 'أنواع المشاريع'], ['participant_contribution_method', 'طريقة المشاركة'],
]
const AVAILABILITY: FieldDef[] = [['availability_times', 'أوقات التوفر'], ['availability_level', 'مستوى التوفر'], ['collaboration_preferences', 'تفضيلات التعاون']]
const ABOUT: FieldDef[] = [['bio', 'نبذة'], ['unique_value', 'القيمة المضافة']]
const CONSENTS: FieldDef[] = [['agree_to_contact', 'يوافق على التواصل'], ['agree_to_store_data', 'يوافق على حفظ البيانات']]

function isKnownStatus(s: string): s is ExpertApplicationStatus {
  return s in EXPERT_STATUS_LABELS
}

export function ExpertStatusBadge({ status }: { status: string }) {
  const styles: Record<ExpertApplicationStatus, { cls: string; Icon: typeof Clock }> = {
    new: { cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', Icon: Clock },
    under_review: { cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', Icon: AlertCircle },
    approved: { cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', Icon: CheckCircle },
    rejected: { cls: 'bg-red-50 text-red-700 ring-1 ring-red-200', Icon: XCircle },
  }
  if (!isKnownStatus(status)) return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-black text-slate-600">{status}</span>
  const { cls, Icon } = styles[status]

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ${cls}`}>
      <Icon size={12} aria-hidden /> {EXPERT_STATUS_LABELS[status]}
    </span>
  )
}

/** A submitted value as a row value: lists as chips, booleans as yes/no, empty as nothing (the row shows "غير متوفر"). */
function present(value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا'
  if (Array.isArray(value)) return value.length === 0 ? null : <Chips items={value.map(String)} />

  return String(value)
}

const hasAny = (app: ExpertApplicationDetail, defs: FieldDef[]) => defs.some(([k]) => present(app[k]) !== null)

function Rows({ app, defs, hideEmpty = false }: { app: ExpertApplicationDetail; defs: FieldDef[]; hideEmpty?: boolean }) {
  const list = hideEmpty ? defs.filter(([k]) => present(app[k]) !== null) : defs

  return (
    <>
      {list.map(([key, label], i) => {
        const v = present(app[key])
        const text = key === 'email' || key === 'whatsapp_number' || key === 'linkedin_url' ? (v === null ? null : <span dir="ltr">{v}</span>) : v

        return <InfoRow key={key} label={label} value={text} last={i === list.length - 1} preserveLineBreaks={key === 'bio' || key === 'unique_value'} />
      })}
    </>
  )
}

export default function ExpertApplicationDetailModal({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const [app, setApp] = useState<ExpertApplicationDetail | null>(null)
  const [failure, setFailure] = useState<'forbidden' | 'not_found' | 'error' | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState<ExpertApplicationStatus | null>(null)

  useEffect(() => {
    let alive = true
    // This window always asks for its own record by id (the server authorizes it), so it never depends on the list
    // behind it: a filter, another page or a direct link all work.
    fetchExpertApplication(id)
      .then((a) => { if (alive) setApp(a) })
      .catch((e) => { if (alive) setFailure(classifyDetailError(e)) })

    return () => { alive = false }
  }, [id, attempt])

  async function move(to: ExpertApplicationStatus) {
    if ((to === 'approved' || to === 'rejected') && !window.confirm(`${ACTION_LABELS[to]}؟ هذا القرار نهائي.`)) return
    setBusy(to)
    try {
      const updated = await updateExpertApplicationStatus(id, to)
      setApp((prev) => (prev ? { ...prev, ...updated } : updated))
      toast.success('تم تحديث حالة الطلب')
      onChanged()
    } catch {
      toast.error('تعذر تحديث حالة الطلب')
    } finally {
      setBusy(null)
    }
  }

  const status = app?.status ?? ''
  const nextStates = isKnownStatus(status) ? EXPERT_STATUS_TRANSITIONS[status] : []
  const titleId = 'expert-application-title'
  if (failure && !app) {
    return <DetailStateModal state={failure} onClose={onClose} onRetry={() => { setFailure(null); setAttempt((n) => n + 1) }} />
  }
  const created = app?.created_at ? new Date(app.created_at).toLocaleDateString('en-GB') : null

  return (
    <DetailModalShell
      onClose={onClose}
      busy={busy !== null}
      labelledBy={titleId}
      testId="expert-application-modal"
      header={(close) =>
        app ?
          <DetailHeader name={app.full_name} titleId={titleId} badge={<ExpertStatusBadge status={app.status} />} email={app.email} subtitle={created ? `تاريخ التقديم: ${created}` : undefined} onClose={close} closeDisabled={busy !== null} />
        : <DetailHeaderPlaceholder titleId={titleId} label="تفاصيل الطلب" onClose={close} />
      }
      footer={
        app ?
          nextStates.length > 0 ?
            <DetailFooter
              start={<span className="text-[11px] font-bold text-slate-500">الاعتماد والرفض قراران نهائيان.</span>}
              end={nextStates.map((to) => (
                <FooterButton key={to} tone={to === 'approved' ? 'success' : to === 'rejected' ? 'danger' : 'neutral'} disabled={busy !== null} loading={busy === to} onClick={() => void move(to)}>
                  {busy === to ? 'جارٍ الحفظ…' : ACTION_LABELS[to]}
                </FooterButton>
              ))}
            />
          : <p className="text-[12px] font-bold text-slate-500">تم البت في هذا الطلب — القرار نهائي.</p>
        : undefined
      }
    >
      {!app ?
        <div className="flex justify-center py-16" aria-busy="true"><Loader2 className="h-7 w-7 animate-spin text-customBlue" aria-label="جاري التحميل" /></div>
      : <>
          <SummaryCards
            items={[
              { icon: Sparkles, label: 'التخصص الأساسي', value: present(app.primary_specialty) as string | null },
              { icon: Globe2, label: 'الدولة', value: [app.country, app.city].filter(Boolean).join('، ') || null },
              { icon: Briefcase, label: 'سنوات الخبرة', value: app.years_of_experience != null && app.years_of_experience !== '' ? String(app.years_of_experience) : null },
              { icon: Calendar, label: 'تاريخ التقديم', value: created },
            ]}
          />
          <DetailColumns
            side={
              <>
                <CardShell title="المعلومات الشخصية" icon={UserRound}><Rows app={app} defs={PERSONAL} /></CardShell>
                <CardShell title="التوفر والتعاون" icon={Clock}><Rows app={app} defs={AVAILABILITY} /></CardShell>
                <CardShell title="الموافقات" icon={ShieldCheck}><Rows app={app} defs={CONSENTS} /></CardShell>
              </>
            }
            main={
              <>
                <CardShell title="المؤهلات والخبرة" icon={GraduationCap}><Rows app={app} defs={QUALIFICATIONS} /></CardShell>
                {hasAny(app, ROLE_SPECIFIC) ? <CardShell title="تفاصيل أدوار المساهمة" icon={Briefcase}><Rows app={app} defs={ROLE_SPECIFIC} hideEmpty /></CardShell> : null}
                <CardShell title="نبذة عن المتقدم" icon={MessageSquareText}><Rows app={app} defs={ABOUT} /></CardShell>
              </>
            }
          />
        </>}
    </DetailModalShell>
  )
}
