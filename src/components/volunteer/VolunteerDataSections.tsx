import { Briefcase, CheckCircle2, Clock, FileText, GraduationCap, HeartHandshake, History, Link2, UserRound, Users } from 'lucide-react'
import type { VolunteerRequest } from '@/api/volunteerApplicationApi'
import { CardShell } from '@/components/detailModal/detailModalUi'
import { DetailColumns, DocumentCard } from '@/components/detailModal/DetailModalParts'
import {
  ageFromBirthDate,
  codeLabel,
  commitmentAnswers,
  consentLabel,
  educationLabel,
  genderLabel,
  motivationAnswers,
  nationalityLabel,
  situationalAnswers,
  skillRatingLabel,
  textOrNull,
  yesNoLabel,
} from '@/lib/volunteerRequestLabels'
import { formatDate, formatDateTime } from '@/utils/dateTime'
import { ChipBlock, DataRows, EmptyValue, ExternalLinkValue, QuestionAnswerList } from './detailPrimitives'
import { requestCvUrl, STATUS_CFG } from './volunteerRequestStatus'

/**
 * EVERY field of a volunteer request, grouped and in Arabic. One presentational component, used by the
 * accepted-volunteers popup and by the personal tab of the operations drawer, so both always show the same data.
 *
 * It only displays: no fetching, no actions. Missing values are a dash; unknown codes are shown as they are.
 */

type Props = {
  request: VolunteerRequest
  /** `columns` for a wide window (two columns on desktop); `stack` for a narrow drawer. */
  layout?: 'columns' | 'stack'
}

const PHONE_LIKE = /^[+\d\s().-]{5,}$/

function PhoneValue({ phone }: { phone: string | null }) {
  if (!phone) return null
  if (!PHONE_LIKE.test(phone)) return <span dir="auto">{phone}</span>

  return (
    <a href={`tel:${phone.replace(/[\s().-]/g, '')}`} dir="ltr" className="text-customBlue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40">
      {phone}
    </a>
  )
}

const dateOrNull = (value: string | null | undefined) => (value ? formatDate(value) : null)
const dateTimeOrNull = (value: string | null | undefined) => (value ? formatDateTime(value) : null)

function PersonalCard({ r }: { r: VolunteerRequest }) {
  const age = ageFromBirthDate(r.birth_date)

  return (
    <CardShell title="المعلومات الشخصية" icon={UserRound}>
      <DataRows
        rows={[
          { label: 'الاسم الكامل', value: textOrNull(r.full_name) },
          { label: 'البريد الإلكتروني', value: r.email ? <span dir="ltr">{r.email}</span> : null },
          { label: 'رقم الهاتف', value: textOrNull(r.phone) ? <PhoneValue phone={textOrNull(r.phone)} /> : null },
          { label: 'الجنس', value: genderLabel(r.gender) },
          { label: 'تاريخ الميلاد', value: dateOrNull(r.birth_date) },
          { label: 'العمر', value: age != null ? `${age} سنة` : null },
          { label: 'الجنسية', value: nationalityLabel(r.nationality) },
          { label: 'بلد الإقامة', value: textOrNull(r.country) },
          { label: 'المدينة', value: textOrNull(r.city) },
        ]}
      />
    </CardShell>
  )
}

function EducationCard({ r }: { r: VolunteerRequest }) {
  return (
    <CardShell title="التعليم والعمل" icon={GraduationCap}>
      <DataRows
        rows={[
          { label: 'أعلى مؤهل علمي', value: educationLabel(r.education_level) },
          { label: 'الوضع الحالي', value: textOrNull(r.current_status) },
          { label: 'المسمى الوظيفي', value: textOrNull(r.job_title) },
          { label: 'التخصص', value: textOrNull(r.specialization) },
        ]}
      />
    </CardShell>
  )
}

function AvailabilityCard({ r }: { r: VolunteerRequest }) {
  // `availability` is the older single field; the form's own question wins when both exist.
  const availability = codeLabel(r.volunteer_days_availability) ?? codeLabel(r.availability)

  return (
    <CardShell title="معلومات التطوع والتوافر" icon={Clock}>
      <DataRows
        wide
        rows={[
          { label: 'القسم المطلوب', value: textOrNull(r.desired_department) },
          { label: 'الفرصة المتقدَّم عليها', value: textOrNull(r.opportunity_title) },
          { label: 'مدى التوافر', value: availability },
          { label: 'الفترة المناسبة', value: codeLabel(r.preferred_time_slot) },
          { label: 'الساعات اليومية', value: textOrNull(r.daily_hours) },
          { label: 'المشاركة الحضورية', value: codeLabel(r.in_person_capable) },
          { label: 'المشاركة عن بُعد', value: codeLabel(r.remote_capable) },
        ]}
      />
      <ChipBlock label="الأيام المتاحة" items={r.volunteer_days} />
    </CardShell>
  )
}

function ExperienceCard({ r }: { r: VolunteerRequest }) {
  return (
    <CardShell title="الخبرة التطوعية" icon={Briefcase}>
      <DataRows
        wide
        rows={[
          { label: 'سبق له التطوع', value: r.has_previous_volunteering == null ? null : yesNoLabel(r.has_previous_volunteering) },
          { label: 'الجهات التي تطوع معها', value: textOrNull(r.volunteering_organizations), preserveLineBreaks: true },
          { label: 'مدة الخبرة التطوعية', value: textOrNull(r.volunteering_duration) },
          { label: 'مستوى الخبرة', value: textOrNull(r.experience_level) },
          { label: 'الخبرات السابقة', value: textOrNull(r.previous_experience), preserveLineBreaks: true },
        ]}
      />
      <ChipBlock label="المهام السابقة" items={r.past_volunteer_tasks} />
    </CardShell>
  )
}

function SkillsCard({ r }: { r: VolunteerRequest }) {
  return (
    <CardShell title="المهارات واللغات" icon={GraduationCap}>
      <ChipBlock label="المهارات الشخصية" items={r.personal_skills} />
      <DataRows rows={[{ label: 'مستوى المهارات', value: skillRatingLabel(r.skill_level_rating) }]} />
      <ChipBlock label="الأدوات التقنية" items={r.technical_tools} />
      <ChipBlock label="اللغات" items={r.languages} tone="sky" />
      <DataRows
        rows={[
          { label: 'ما يقدمه للمؤسسة', value: textOrNull(r.value_add_contributions), preserveLineBreaks: true },
          { label: 'المهارات (نص)', value: textOrNull(r.skills), preserveLineBreaks: true },
        ]}
      />
    </CardShell>
  )
}

function DepartmentsCard({ r }: { r: VolunteerRequest }) {
  return (
    <CardShell title="الإدارات" icon={Users}>
      <DataRows
        wide
        rows={[
          { label: 'الإدارة الأنسب لمهاراته', value: textOrNull(r.primary_value_department) },
          { label: 'بيئة العمل المفضلة', value: textOrNull(r.preferred_work_environment) },
        ]}
      />
      <ChipBlock label="الإدارات الثانوية" items={r.secondary_departments} />
      <ChipBlock label="مهاراته في الإدارة" items={r.department_skills} />
    </CardShell>
  )
}

function MotivationCard({ r }: { r: VolunteerRequest }) {
  return (
    <CardShell title="الدافع والالتزام" icon={HeartHandshake}>
      <ChipBlock label="أسباب التقديم" items={r.reasons_for_applying} />
      <ChipBlock label="ما يتوقع الحصول عليه" items={r.expected_gains} />
      <DataRows rows={[{ label: 'الدافع للتطوع', value: textOrNull(r.motivation), preserveLineBreaks: true }]} />
      <QuestionAnswerList label="مقياس الدافعية" items={motivationAnswers(r.motivation_ratings)} />
      <QuestionAnswerList label="مقياس الجدية والالتزام" items={commitmentAnswers(r.commitment_ratings)} />
      <QuestionAnswerList label="أسئلة المواقف العملية" items={situationalAnswers(r.situational_responses)} />
      <DataRows
        wide
        rows={[
          { label: 'مدة الاستمرار المتوقعة', value: textOrNull(r.expected_duration) },
          { label: 'الالتزام لثلاثة أشهر', value: textOrNull(r.commitment_three_months) },
        ]}
      />
      <ChipBlock label="ما قد يدفعه للتوقف" items={r.quit_reasons} />
      <DataRows
        rows={[
          { label: 'اقتراحاته', value: textOrNull(r.suggestions), preserveLineBreaks: true },
          { label: 'ملاحظات المتقدم', value: textOrNull(r.notes), preserveLineBreaks: true },
        ]}
      />
    </CardShell>
  )
}

function BioCard({ r }: { r: VolunteerRequest }) {
  return (
    <CardShell title="النبذة والروابط" icon={Link2}>
      <DataRows
        rows={[
          { label: 'النبذة التعريفية', value: textOrNull(r.professional_bio), preserveLineBreaks: true },
          { label: 'رابط LinkedIn', value: <ExternalLinkValue url={r.linkedin_url} /> },
          { label: 'رابط الأعمال / Portfolio', value: <ExternalLinkValue url={r.portfolio_url} /> },
          { label: 'نماذج الأعمال', value: textOrNull(r.portfolio_link_status) },
        ]}
      />
    </CardShell>
  )
}

function ConsentsCard({ r }: { r: VolunteerRequest }) {
  return (
    <CardShell title="الموافقات والخصوصية" icon={CheckCircle2}>
      <DataRows rows={[{ label: 'عرض البيانات المهنية', value: consentLabel(r.professional_profile_consent) }]} />
    </CardShell>
  )
}

function DocumentsCard({ r }: { r: VolunteerRequest }) {
  const cvUrl = requestCvUrl(r)

  return (
    <CardShell title="الوثائق" icon={FileText}>
      {cvUrl ? (
        textOrNull(r.cv_view_url) ? (
          <DocumentCard name="السيرة الذاتية" meta="ملف مرفوع من المتقدم · رابط معاينة مؤقت" href={cvUrl} />
        ) : (
          <DocumentCard name="السيرة الذاتية" meta="ملف مرفوع من المتقدم" href={cvUrl} actionLabel="تنزيل السيرة الذاتية" />
        )
      ) : (
        <EmptyValue />
      )}
    </CardShell>
  )
}

function ReviewHistoryCard({ r }: { r: VolunteerRequest }) {
  const converted = Boolean(r.is_converted) || r.status === 'converted_to_member'
  // A status this build does not know still gets the neutral badge instead of crashing.
  const cfg = STATUS_CFG[converted ? 'converted_to_member' : r.status] ?? STATUS_CFG.pending

  return (
    <CardShell title="سجل المراجعة" icon={History}>
      <DataRows
        rows={[
          {
            label: 'حالة الطلب',
            value: (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black ${cfg.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
                {cfg.label}
              </span>
            ),
          },
          { label: 'تاريخ التقديم', value: dateTimeOrNull(r.created_at) },
          { label: 'تاريخ المراجعة', value: dateTimeOrNull(r.reviewed_at) },
          { label: 'تاريخ القبول', value: dateTimeOrNull(r.accepted_at) },
          { label: 'قُبل بواسطة', value: textOrNull(r.accepted_by_name) ?? textOrNull(r.accepted_by?.name) },
          { label: 'تاريخ التحويل إلى عضو', value: dateTimeOrNull(r.converted_to_member_at) },
          { label: 'العضو المُحوَّل إليه', value: textOrNull(r.converted_member?.name) },
          { label: 'ملاحظات الإدارة', value: textOrNull(r.admin_notes), preserveLineBreaks: true },
          { label: 'آخر تحديث', value: dateTimeOrNull(r.updated_at) },
        ]}
      />
    </CardShell>
  )
}

export default function VolunteerDataSections({ request: r, layout = 'columns' }: Props) {
  const side = (
    <>
      <PersonalCard r={r} />
      <EducationCard r={r} />
      <SkillsCard r={r} />
      <BioCard r={r} />
      <ConsentsCard r={r} />
    </>
  )
  const main = (
    <>
      <AvailabilityCard r={r} />
      <ExperienceCard r={r} />
      <DepartmentsCard r={r} />
      <MotivationCard r={r} />
      <DocumentsCard r={r} />
      <ReviewHistoryCard r={r} />
    </>
  )

  if (layout === 'stack') {
    return (
      <div className="space-y-4" data-testid="volunteer-data-sections">
        {side}
        {main}
      </div>
    )
  }

  return (
    <div data-testid="volunteer-data-sections">
      <DetailColumns side={side} main={main} />
    </div>
  )
}
