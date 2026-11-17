import { AlertTriangle, Info, Lock, ShieldCheck, UserRound } from 'lucide-react'
import type { VolunteerHubItem, VolunteerProfile, VolunteerProfileSource } from '@/api/volunteersHubApi'
import { CardShell } from '@/components/detailModal/detailModalUi'
import { DataRows, type DataRowSpec } from '@/components/volunteer/detailPrimitives'
import VolunteerDataSections from '@/components/volunteer/VolunteerDataSections'
import { codeLabel, genderLabel, textOrNull } from '@/lib/volunteerRequestLabels'
import { formatDate } from '@/utils/dateTime'

/**
 * The «البيانات الشخصية» tab of the operations drawer: the volunteer card, the login account, and everything the
 * volunteer told us. When an application is linked it is the same data window the accepted-volunteers page opens
 * (one shared component); when none is, the tab says so plainly and shows whatever the server does know.
 *
 * Nothing is invented: a flag the server did not send is «غير معروف», a missing number is a dash.
 */

const SOURCE_LABEL: Record<VolunteerProfileSource, string> = {
  volunteer_request: 'طلب التطوع',
  team_profile: 'ملف الفريق',
  account_only: 'الحساب فقط',
}

const NO_REQUEST_MESSAGE = 'لا يوجد طلب تطوع مرتبط بهذا المتطوع — أُضيف يدويًا أو من مصدر قديم'
const FORBIDDEN_MESSAGE = 'لا تملك صلاحية عرض البيانات الشخصية الكاملة للمتطوع'
const EMAIL_MATCH_NOTE = 'رُبط هذا الطلب بالمتطوع عبر البريد الإلكتروني فقط — تحقق من أنه يخصه'

const dateOrNull = (value: string | null | undefined) => (value ? formatDate(value) : null)
const bidi = (value: string | null | undefined) => (textOrNull(value) ? <bdi>{value}</bdi> : null)
const ltr = (value: string | null | undefined) => (textOrNull(value) ? <span dir="ltr">{value}</span> : null)

/** «نعم» / «لا» / «غير معروف»: a flag the server did not send is never shown as «no». */
function flag(value: boolean | null | undefined, yes = 'نعم', no = 'لا'): string {
  return value === true ? yes : value === false ? no : 'غير معروف'
}

function VolunteerCard({ volunteer, profile }: { volunteer: VolunteerHubItem; profile?: VolunteerProfile }) {
  const v = profile?.volunteer
  const hours = v?.hours_logged ?? volunteer.hours_logged
  const email = textOrNull(v?.email) ?? textOrNull(volunteer.email)
  const rows: DataRowSpec[] = [
    { label: 'الاسم', value: bidi(v?.name) ?? bidi(volunteer.name) },
    { label: 'الإدارة الحالية', value: bidi(v?.department_name) ?? bidi(volunteer.department_name) },
    { label: 'البريد الإلكتروني', value: ltr(email) },
    { label: 'رقم الهاتف', value: ltr(v?.phone) },
    { label: 'الساعات التراكمية المعتمدة', value: hours == null ? null : `${hours} ساعة` },
  ]

  return (
    <CardShell title="بطاقة المتطوع" icon={UserRound}>
      <DataRows rows={rows} />
    </CardShell>
  )
}

function AccountCard({ profile }: { profile: VolunteerProfile }) {
  const { account } = profile.volunteer
  const joined = dateOrNull(account.created_at ?? profile.volunteer.created_at)
  const rows: DataRowSpec[] =
    account.has_account === false
      ? [
          { label: 'حساب الدخول', value: 'لا يوجد حساب دخول لهذا المتطوع' },
          { label: 'تاريخ التسجيل', value: joined },
        ]
      : [
          { label: 'حساب الدخول', value: account.has_account === true ? 'موجود' : 'غير معروف' },
          { label: 'البريد موثّق', value: flag(account.email_verified) },
          {
            label: 'يجب تغيير كلمة المرور',
            value: account.must_change_password === true ? 'نعم — لم يختر كلمة مرور خاصة به بعد' : flag(account.must_change_password),
          },
          { label: 'تاريخ الانضمام', value: joined },
        ]

  return (
    <CardShell title="الحساب" icon={ShieldCheck}>
      <DataRows rows={rows} />
    </CardShell>
  )
}

function NoRequestCard({ profile }: { profile: VolunteerProfile }) {
  const t = profile.team_profile
  const rows: DataRowSpec[] = t
    ? [
        { label: 'المسمى', value: bidi(t.position_ar) },
        { label: 'نوع العضوية', value: codeLabel(t.member_type) },
        { label: 'تاريخ الانضمام', value: dateOrNull(t.joined_at) },
        { label: 'الحالة', value: t.is_active ? 'نشط' : 'غير نشط' },
        { label: 'البريد الإلكتروني', value: ltr(t.email) },
        { label: 'رقم الهاتف', value: ltr(t.phone) },
        { label: 'الدولة', value: bidi(t.country) },
        { label: 'المدينة', value: bidi(t.city) },
        { label: 'الجنس', value: genderLabel(t.gender) },
      ]
    : []

  return (
    <section className="rounded-[18px] border border-customBlue/20 bg-customBlue/5 p-5" aria-label="مصدر بيانات المتطوع" data-testid="no-request-card">
      <div className="flex items-start gap-2 text-sm font-black text-navy">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-customBlue" aria-hidden="true" />
        <p>{NO_REQUEST_MESSAGE}</p>
      </div>
      {t ? (
        <div className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
          <p className="mb-1 text-[11px] font-black text-slate-500">ما هو مسجّل في ملف الفريق</p>
          <DataRows rows={rows} />
        </div>
      ) : (
        <p className="mt-2 text-xs font-semibold text-slate-600">لا تتوفر بيانات إضافية عن هذا المتطوع غير بطاقته وحسابه.</p>
      )}
    </section>
  )
}

export default function VolunteerPersonalTab({ volunteer, profile }: { volunteer: VolunteerHubItem; profile: VolunteerProfile }) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-bold text-slate-500">
        مصدر البيانات: <span className="font-black text-navy">{SOURCE_LABEL[profile.source]}</span>
      </p>
      <VolunteerCard volunteer={volunteer} profile={profile} />
      <AccountCard profile={profile} />
      {profile.request ? (
        <>
          {profile.match === 'email' && (
            <div role="note" data-testid="email-match-note" className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-6 text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <p>{EMAIL_MATCH_NOTE}</p>
            </div>
          )}
          <VolunteerDataSections request={profile.request} layout="stack" />
        </>
      ) : (
        <NoRequestCard profile={profile} />
      )}
    </div>
  )
}

/**
 * What a role without the permission to read the full profile (HTTP 403) still sees: the card built from the list
 * row, and a plain notice. Not an error: there is nothing to retry.
 */
export function VolunteerPersonalTabLimited({ volunteer }: { volunteer: VolunteerHubItem }) {
  return (
    <div className="space-y-4">
      <section className="flex items-start gap-2 rounded-[18px] border border-slate-200 bg-slate-50 p-5 text-sm font-black text-slate-700" data-testid="profile-forbidden-card" role="note">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <p>{FORBIDDEN_MESSAGE}</p>
      </section>
      <VolunteerCard volunteer={volunteer} />
    </div>
  )
}
