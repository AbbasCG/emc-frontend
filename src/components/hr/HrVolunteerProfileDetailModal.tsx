import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Globe2,
  GraduationCap,
  History,
  Languages as LanguagesIcon,
  Link2,
  Loader2,
  Pencil,
  Send,
  UserRound,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import toast from '@/lib/toast'
import { getApiErrorMessage } from '@/api/apiErrors'
import { LmsPreviewModal, type LmsPreviewState } from '@/components/lms/management/LmsPreviewModal'
import { triggerBlobDownload } from '@/api/ambassadorApplicationFilesApi'
import {
  approveVolunteerProfile,
  fetchHrVolunteerProfile,
  fetchVolunteerHrProfileCvBlob,
  rejectVolunteerProfile,
  startVolunteerProfileReview,
} from '@/api/hrVolunteerProfilesApi'
import type { VolunteerHrProfile, VolunteerHrProfileStatus } from '@/api/volunteerHrProfileApi'
import { formatCountryDisplay } from '@/lib/countries'
import CountryDisplay from '@/components/ui/CountryDisplay'
import { formatDate, formatDateTime } from '@/utils/dateTime'

/* ── Tokens ─────────────────────────────────────────────────────────── */

const BORDER = 'border-[#DCE6F0]'
const CARD = `rounded-[18px] border ${BORDER} bg-white shadow-[0_1px_2px_rgba(12,42,75,0.04)]`

const STATUS_CFG: Record<VolunteerHrProfileStatus, { label: string; badge: string }> = {
  draft:        { label: 'مسودة',       badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
  submitted:    { label: 'مُرسل',        badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  under_review: { label: 'قيد المراجعة', badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  approved:     { label: 'مقبول',        badge: 'bg-emerald-500 text-white' },
  rejected:     { label: 'مرفوض',        badge: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  archived:     { label: 'مؤرشف',        badge: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'غير متوفر'
  const mb = bytes / 1024 / 1024
  return mb >= 1 ? `${mb.toFixed(1)} ميجابايت` : `${Math.round(bytes / 1024)} كيلوبايت`
}

function formatPhoneDisplay(phone: string, dialCode: string | null): string {
  if (dialCode && phone.startsWith(dialCode)) {
    return `${dialCode} ${phone.slice(dialCode.length)}`.trim()
  }
  return phone
}

function calcAge(dob: string | null): string | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1
  if (age < 0 || age > 120) return null
  return `${age} سنة`
}

function genderLabel(g: string | null): string | null {
  if (!g) return null
  if (g === 'male') return 'ذكر'
  if (g === 'female') return 'أنثى'
  return g
}

function employmentLabel(v: string | null): string | null {
  if (!v) return null
  const map: Record<string, string> = {
    volunteer: 'متطوع منتظم',
    intern: 'متدرب',
    part_time: 'دوام جزئي',
    full_time: 'دوام كامل',
  }
  return map[v] ?? v
}

function splitSkills(skills: string | null): string[] {
  if (!skills?.trim()) return []
  return skills.split(/[,،]/).map((s) => s.trim()).filter(Boolean)
}

function displayOrNull(value: string | number | null | undefined): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s || null
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1)
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`
}

/* ── Primitives ─────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: VolunteerHrProfileStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black ${cfg.badge}`}>
      {cfg.label}
    </span>
  )
}

/**
 * Compact label/value row — controlled columns, never justify-between.
 * Desktop: fixed label column + nearby value. Mobile: stacked.
 * `wide` = volunteer-info spacing (wider label + larger gap).
 */
function InfoRow({
  label,
  value,
  trailing,
  last,
  wide,
}: {
  label: string
  value: React.ReactNode
  trailing?: React.ReactNode
  last?: boolean
  wide?: boolean
}) {
  const empty = value == null || value === ''
  const cols = wide
    ? 'sm:grid-cols-[minmax(150px,190px)_minmax(0,1fr)] sm:gap-x-8'
    : 'sm:grid-cols-[165px_minmax(0,1fr)] sm:gap-x-7'
  return (
    <div
      data-testid="detail-info-row"
      data-wide={wide ? 'true' : undefined}
      className={`detail-row grid min-h-0 grid-cols-1 items-start gap-1 py-2.5 sm:min-h-[38px] sm:items-center ${cols} ${
        last ? '' : `border-b ${BORDER}`
      }`}
    >
      <span className="detail-row__label text-[12px] font-semibold text-slate-400">{label}</span>
      <div className="detail-row__value flex min-w-0 items-start gap-1.5">
        <div
          className="min-w-0 text-[13px] font-bold text-deepBlue [overflow-wrap:anywhere]"
          dir="auto"
        >
          {empty ? <span className="font-semibold text-slate-300">غير متوفر</span> : value}
        </div>
        {trailing}
      </div>
    </div>
  )
}

function CardShell({
  title,
  icon: Icon,
  children,
  className = '',
}: {
  title: string
  icon: typeof Users
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`${CARD} p-5 sm:p-6 ${className}`}>
      <h3 className="mb-3.5 flex items-center gap-2 text-[13px] font-black text-customBlue">
        <Icon size={16} className="shrink-0" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  )
}

function Chips({ items, tone = 'blue' }: { items: string[]; tone?: 'blue' | 'sky' }) {
  if (items.length === 0) {
    return <p className="text-[12px] font-semibold text-slate-300">غير متوفر</p>
  }
  const cls = tone === 'sky'
    ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'
    : 'bg-customBlue/10 text-customBlue ring-1 ring-customBlue/15'
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`} dir="auto">
          {item}
        </span>
      ))}
    </div>
  )
}

function CvActionButtons({
  onPreview,
  onDownload,
  downloading,
  compact,
}: {
  onPreview: () => void
  onDownload: () => void
  downloading: boolean
  compact?: boolean
}) {
  const btn = compact ? 'px-3 py-2 text-[11px]' : 'px-3.5 py-2.5 text-[12px]'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onPreview}
        className={`inline-flex items-center gap-1.5 rounded-xl bg-customBlue font-black text-white shadow-sm transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40 ${btn}`}
      >
        <Eye size={14} aria-hidden />
        معاينة السيرة الذاتية
      </button>
      <button
        type="button"
        onClick={onDownload}
        disabled={downloading}
        className={`inline-flex items-center gap-1.5 rounded-xl border ${BORDER} bg-white font-black text-deepBlue transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/30 disabled:opacity-50 ${btn}`}
      >
        {downloading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Download size={14} aria-hidden />}
        تحميل
      </button>
    </div>
  )
}

/* ── Subcomponents ──────────────────────────────────────────────────── */

function VolunteerDetailHeader({
  profile,
  onClose,
}: {
  profile: VolunteerHrProfile
  onClose: () => void
}) {
  const meta = [profile.job_title, profile.department?.name].filter(Boolean).join(' · ')
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E8EEF4] bg-white px-4 py-[14px] sm:px-7 sm:py-[18px]">
      <div className="flex min-w-0 items-center gap-3">
        {profile.profile_photo_url ? (
          <img
            src={profile.profile_photo_url}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-[#E8EEF4]"
          />
        ) : (
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-customBlue/10 text-base font-black text-customBlue ring-2 ring-[#E8EEF4]"
            aria-hidden
          >
            {initials(profile.full_name)}
          </div>
        )}
        <div className="min-w-0 leading-snug">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="hr-volunteer-detail-title" className="truncate text-[17px] font-black text-deepBlue sm:text-[18px]">
              {profile.full_name}
            </h2>
            <StatusBadge status={profile.status} />
          </div>
          <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-500">
            {profile.email}
          </p>
          {meta && (
            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">
              {meta}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-deepBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40"
        aria-label="إغلاق"
      >
        <X size={20} />
      </button>
    </header>
  )
}

function VolunteerSummaryCards({
  profile,
  onPreview,
  onDownload,
  downloading,
}: {
  profile: VolunteerHrProfile
  onPreview: () => void
  onDownload: () => void
  downloading: boolean
}) {
  const items = [
    { icon: Briefcase, label: 'المسمى الوظيفي', value: displayOrNull(profile.job_title) ?? 'غير متوفر' },
    { icon: Building2, label: 'القسم', value: displayOrNull(profile.department?.name) ?? 'غير متوفر' },
    {
      icon: Clock,
      label: 'عدد الساعات الأسبوعية',
      value: profile.weekly_hours != null ? `${profile.weekly_hours} ساعة` : 'غير متوفر',
    },
    {
      icon: Calendar,
      label: 'تاريخ الانضمام',
      value: profile.join_date ? formatDate(profile.join_date) : 'غير متوفر',
    },
  ]

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="mx-auto grid w-full max-w-[860px] grid-cols-2 gap-3 sm:grid-cols-4 lg:mx-0 lg:max-w-[860px]">
        {items.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            data-testid="summary-metric-card"
            className={`flex h-[68px] items-center gap-2.5 rounded-[12px] border ${BORDER} bg-white px-4 py-3`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-customBlue/10 text-customBlue">
              <Icon size={15} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold leading-tight text-slate-400">{label}</p>
              <p className="truncate text-[12px] font-black leading-tight text-deepBlue" dir="auto">{value}</p>
            </div>
          </div>
        ))}
      </div>
      {profile.cv.available && (
        <div className="flex shrink-0 items-center justify-center lg:justify-end">
          <CvActionButtons onPreview={onPreview} onDownload={onDownload} downloading={downloading} />
        </div>
      )}
    </div>
  )
}

function PersonalInfoCard({
  profile,
  onCopyPhone,
}: {
  profile: VolunteerHrProfile
  onCopyPhone: (phone: string) => void
}) {
  const age = calcAge(profile.date_of_birth)
  // Nationality is independent of residence country — never infer from phone/country_code.
  const nationalityDisplay = formatCountryDisplay(null, profile.nationality)
  const rows: { label: string; value: React.ReactNode; trailing?: React.ReactNode }[] = [
    { label: 'الاسم الكامل', value: profile.full_name },
    { label: 'البريد الإلكتروني', value: <span dir="ltr">{profile.email}</span> },
    {
      label: 'رقم الهاتف',
      value: (
        <a href={`tel:${profile.phone}`} dir="ltr" className="text-customBlue hover:underline">
          {formatPhoneDisplay(profile.phone, profile.phone_country_code)}
        </a>
      ),
      trailing: (
        <button
          type="button"
          onClick={() => onCopyPhone(profile.phone)}
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-customBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/30"
          aria-label="نسخ الرقم"
        >
          <Copy size={13} />
        </button>
      ),
    },
    {
      label: 'الدولة',
      value: (profile.country || profile.country_code)
        ? <CountryDisplay code={profile.country_code} localizedName={profile.country} />
        : null,
    },
    {
      label: 'الجنسية',
      value: profile.nationality
        ? (
          nationalityDisplay.country
            ? <CountryDisplay code={nationalityDisplay.country.code} localizedName={nationalityDisplay.country.name} />
            : <span dir="auto">{profile.nationality}</span>
        )
        : null,
    },
    { label: 'المدينة', value: profile.city },
    { label: 'تاريخ الميلاد', value: profile.date_of_birth ? formatDate(profile.date_of_birth) : null },
    { label: 'العمر', value: age },
    { label: 'الجنس', value: genderLabel(profile.gender) },
  ]

  return (
    <CardShell title="المعلومات الشخصية" icon={UserRound}>
      {rows.map((row, i) => (
        <InfoRow
          key={row.label}
          label={row.label}
          value={row.value}
          trailing={row.trailing}
          last={i === rows.length - 1}
        />
      ))}
    </CardShell>
  )
}

function VolunteerInfoCard({ profile }: { profile: VolunteerHrProfile }) {
  const rows = [
    { label: 'القسم', value: profile.department?.name },
    { label: 'المسمى الوظيفي', value: profile.job_title },
    { label: 'تاريخ الانضمام', value: profile.join_date ? formatDate(profile.join_date) : null },
    {
      label: 'عدد ساعات العمل الأسبوعية',
      value: profile.weekly_hours != null ? `${profile.weekly_hours} ساعة` : null,
    },
    { label: 'التوفر', value: profile.availability },
    { label: 'نوع التطوع', value: employmentLabel(profile.employment_type) },
  ]

  return (
    <CardShell title="معلومات التطوع" icon={Users}>
      {rows.map((row, i) => (
        <InfoRow
          key={row.label}
          label={row.label}
          value={row.value}
          wide
          last={i === rows.length - 1}
        />
      ))}
    </CardShell>
  )
}

function SkillsLanguagesCard({ profile }: { profile: VolunteerHrProfile }) {
  const skills = splitSkills(profile.skills)
  return (
    <CardShell title="المهارات واللغات" icon={GraduationCap}>
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[11px] font-bold text-slate-400">المهارات</p>
          <Chips items={skills} />
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold text-slate-400">
            <LanguagesIcon size={12} aria-hidden /> اللغات
          </p>
          <Chips items={profile.languages ?? []} tone="sky" />
        </div>
        <InfoRow label="المؤهل العلمي" value={profile.education} />
        <InfoRow label="الخبرات السابقة" value={profile.experience} />
        <InfoRow label="الدافع للتطوع" value={profile.motivation} last />
        {(profile.linkedin_url || profile.portfolio_url) && (
          <div className={`flex flex-wrap gap-2 border-t ${BORDER} pt-3`}>
            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-black text-deepBlue ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                <Link2 size={13} aria-hidden /> LinkedIn <ExternalLink size={11} aria-hidden />
              </a>
            )}
            {profile.portfolio_url && (
              <a
                href={profile.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-black text-deepBlue ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                <Globe2 size={13} aria-hidden /> Portfolio <ExternalLink size={11} aria-hidden />
              </a>
            )}
          </div>
        )}
      </div>
    </CardShell>
  )
}

function DocumentsCard({
  profile,
  onPreview,
  onDownload,
  downloading,
}: {
  profile: VolunteerHrProfile
  onPreview: () => void
  onDownload: () => void
  downloading: boolean
}) {
  return (
    <CardShell title="الوثائق" icon={FileText}>
      {profile.cv.available ? (
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-[14px] border ${BORDER} bg-[#F7FAFC] p-3`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-customBlue ring-1 ring-[#DCE6F0]">
              <FileText size={18} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-black text-deepBlue">
                {profile.cv.file_name ?? 'السيرة الذاتية'}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                {[
                  profile.cv.mime_type?.includes('pdf') ? 'PDF' : profile.cv.mime_type,
                  formatFileSize(profile.cv.size),
                  profile.cv.uploaded_at
                    ? `تاريخ الرفع ${formatDateTime(profile.cv.uploaded_at).replace(' ', ' - ')}`
                    : null,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <CvActionButtons
            onPreview={onPreview}
            onDownload={onDownload}
            downloading={downloading}
            compact
          />
        </div>
      ) : (
        <p className="text-[12px] font-semibold text-slate-300">غير متوفر</p>
      )}
    </CardShell>
  )
}

function ReviewHistoryCard({ profile }: { profile: VolunteerHrProfile }) {
  const rows: { label: string; value: string | null }[] = [
    { label: 'تاريخ التقديم', value: profile.submitted_at ? formatDateTime(profile.submitted_at) : null },
    { label: 'تاريخ المراجعة', value: profile.reviewed_at ? formatDateTime(profile.reviewed_at) : null },
    { label: 'تمت المراجعة بواسطة', value: profile.reviewed_by?.name ?? null },
    { label: 'تاريخ القبول', value: profile.approved_at ? formatDateTime(profile.approved_at) : null },
    { label: 'تمت الموافقة بواسطة', value: profile.approved_by?.name ?? null },
    { label: 'آخر تحديث', value: formatDateTime(profile.updated_at) },
  ]

  const visible = rows.filter((r) => {
    if (r.label === 'آخر تحديث') return true
    if (r.label === 'تاريخ التقديم') return Boolean(profile.submitted_at)
    if (r.label.startsWith('تاريخ المراجعة') || r.label.includes('المراجعة بواسطة')) {
      return Boolean(profile.reviewed_at || profile.reviewed_by)
    }
    if (r.label.includes('القبول') || r.label.includes('الموافقة')) {
      return Boolean(profile.approved_at || profile.approved_by)
    }
    return Boolean(r.value)
  })

  return (
    <CardShell title="سجل المراجعة" icon={History}>
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {visible.map((row, i) => (
          <InfoRow
            key={row.label}
            label={row.label}
            value={row.value}
            last={i >= visible.length - (visible.length % 2 === 0 ? 2 : 1)}
          />
        ))}
      </div>
      {profile.status === 'rejected' && profile.rejection_reason && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] font-semibold text-red-600">
          سبب الرفض: {profile.rejection_reason}
        </p>
      )}
    </CardShell>
  )
}

function VolunteerDetailActions({
  profile,
  busy,
  rejecting,
  confirmingApprove,
  reason,
  setReason,
  setRejecting,
  setConfirmingApprove,
  onReview,
  onApprove,
  onReject,
  onMessage,
  onEdit,
}: {
  profile: VolunteerHrProfile
  busy: boolean
  rejecting: boolean
  confirmingApprove: boolean
  reason: string
  setReason: (v: string) => void
  setRejecting: (v: boolean) => void
  setConfirmingApprove: (v: boolean) => void
  onReview: () => void
  onApprove: () => void
  onReject: () => void
  onMessage: () => void
  onEdit: () => void
}) {
  const canDecide = profile.status === 'submitted' || profile.status === 'under_review'

  if (confirmingApprove) {
    return (
      <div className="space-y-2">
        <p className="text-[12px] font-bold text-deepBlue">
          هل أنت متأكد من قبول <span className="text-customBlue">{profile.full_name}</span> وإضافته إلى الفريق؟
        </p>
        <p className="text-[11px] font-semibold text-slate-500">
          القسم: {profile.department?.name ?? '—'} · المسمى الوظيفي: {profile.job_title} · تاريخ الانضمام:{' '}
          {profile.join_date ? formatDate(profile.join_date) : '—'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-[12px] font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />} تأكيد القبول
          </button>
          <button
            type="button"
            onClick={() => setConfirmingApprove(false)}
            disabled={busy}
            className={`rounded-xl border ${BORDER} px-4 py-2.5 text-[12px] font-black text-slate-500`}
          >
            إلغاء
          </button>
        </div>
      </div>
    )
  }

  if (rejecting) {
    return (
      <div className="space-y-2">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="سبب الرفض (مطلوب)"
          className={`w-full rounded-xl border ${BORDER} p-2.5 text-[12px] font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/20`}
          rows={2}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReject}
            disabled={busy || !reason.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-[12px] font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />} تأكيد الرفض
          </button>
          <button
            type="button"
            onClick={() => setRejecting(false)}
            disabled={busy}
            className={`rounded-xl border ${BORDER} px-4 py-2.5 text-[12px] font-black text-slate-500`}
          >
            إلغاء
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <Pencil size={14} aria-hidden />
          تعديل معلومات التطوع
        </button>
        <button
          type="button"
          onClick={onMessage}
          className={`inline-flex items-center gap-1.5 rounded-xl border ${BORDER} bg-white px-4 py-2.5 text-[12px] font-black text-deepBlue transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/30`}
        >
          <Send size={14} aria-hidden />
          إرسال رسالة
        </button>
        {profile.status === 'submitted' && (
          <button
            type="button"
            onClick={onReview}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-xl border ${BORDER} px-4 py-2.5 text-[12px] font-black text-slate-600 disabled:opacity-50`}
          >
            <CheckCircle2 size={14} aria-hidden />
            بدء المراجعة
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {canDecide && (
          <>
            <button
              type="button"
              onClick={() => setConfirmingApprove(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-[12px] font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50"
            >
              قبول
            </button>
            <button
              type="button"
              onClick={() => setRejecting(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-[12px] font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50"
            >
              <XCircle size={14} aria-hidden />
              رفض
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Main modal ─────────────────────────────────────────────────────── */

export default function HrVolunteerProfileDetailModal({
  id,
  onClose,
  onChanged,
}: {
  id: number
  onClose: () => void
  onChanged: () => void
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  const [profile, setProfile] = useState<VolunteerHrProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [confirmingApprove, setConfirmingApprove] = useState(false)
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState<LmsPreviewState>({ kind: 'idle' })
  const [downloadingCv, setDownloadingCv] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  // Route param changed while the modal is open → show the loader again before
  // the refetch. Render-adjust pattern (docs/04-references/effect-patterns.md, P2).
  const [seenId, setSeenId] = useState(id)
  if (seenId !== id) {
    setSeenId(id)
    setLoading(true)
  }

  // Fetch inside the effect body via async IIFE — every setState happens after
  // the await (effect-patterns.md, P1); initial loading state is already true.
  useEffect(() => {
    void (async () => {
      try {
        setProfile(await fetchHrVolunteerProfile(id))
      } catch (err) {
        toast.error(getApiErrorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button[aria-label="إغلاق"]')?.focus()
    }, 0)
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = prev
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      previouslyFocused.current?.focus?.()
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleReview() {
    if (!profile) return
    setBusy(true)
    try {
      setProfile(await startVolunteerProfileReview(profile.id))
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleApprove() {
    if (!profile) return
    setBusy(true)
    try {
      setProfile(await approveVolunteerProfile(profile.id))
      setConfirmingApprove(false)
      toast.success('تم قبول المتطوع وإضافته إلى الفريق')
      onChanged()
    } catch (err) {
      toast.error(getApiErrorMessage(err) || 'تعذر إكمال عملية القبول، لم يتم إجراء أي تغيير')
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    if (!profile || !reason.trim()) return
    setBusy(true)
    try {
      setProfile(await rejectVolunteerProfile(profile.id, reason.trim()))
      setRejecting(false)
      toast.success('تم رفض الطلب')
      onChanged()
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handlePreviewCv() {
    if (!profile) return
    setPreview({ kind: 'loading', label: 'جاري تحميل الملف…' })
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    const supportedMime = (m: string | null) => m === 'application/pdf' || m?.startsWith('image/')
    if (profile.cv.mime_type && !supportedMime(profile.cv.mime_type)) {
      setPreview({ kind: 'error', message: 'المعاينة غير متاحة لهذا النوع من الملفات، يمكنك تحميل الملف' })
      return
    }
    try {
      const { blob, mime, filename } = await fetchVolunteerHrProfileCvBlob(profile.id, 'preview')
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      setPreview({ kind: 'open', objectUrl: url, fileName: filename || profile.cv.file_name || 'CV', mime })
    } catch {
      setPreview({ kind: 'error', message: 'تعذّر تحميل الملف للمعاينة.' })
    }
  }

  async function handleDownloadCv() {
    if (!profile) return
    setDownloadingCv(true)
    try {
      const { blob, filename } = await fetchVolunteerHrProfileCvBlob(profile.id, 'download')
      triggerBlobDownload(blob, filename || profile.cv.file_name || 'cv')
    } catch {
      toast.error('تعذّر تحميل الملف. حاول مرة أخرى.')
    } finally {
      setDownloadingCv(false)
    }
  }

  async function copyPhone(phone: string) {
    try {
      await navigator.clipboard.writeText(phone)
      toast.success('تم نسخ الرقم')
    } catch {
      toast.error('تعذر نسخ الرقم')
    }
  }

  const ageLabel = useMemo(() => (profile ? calcAge(profile.date_of_birth) : null), [profile])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0F172A]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={profile ? 'hr-volunteer-detail-title' : titleId}
      data-testid="hr-volunteer-detail-overlay"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:my-0 sm:h-auto sm:max-h-[92vh] sm:w-[min(92vw,1450px)] sm:rounded-[20px]"
        data-testid="hr-volunteer-detail-modal"
      >
        {loading || !profile ? (
          <div className="flex flex-1 items-center justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-customBlue" aria-label="جاري التحميل" />
            <span id={titleId} className="sr-only">جاري تحميل ملف المتطوع</span>
          </div>
        ) : (
          <>
            <VolunteerDetailHeader profile={profile} onClose={onClose} />

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#F4F7FB]">
              <div className="space-y-4 p-4 sm:p-5">
                <VolunteerSummaryCards
                  profile={profile}
                  onPreview={() => void handlePreviewCv()}
                  onDownload={() => void handleDownloadCv()}
                  downloading={downloadingCv}
                />

                {/*
                  Visual layout (screen L→R): Personal (narrow) | Volunteer (wide)
                  Implemented with LTR grid + RTL text so proportions match the reference.
                */}
                <div
                  className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.45fr)]"
                  dir="ltr"
                >
                  <div className="space-y-4" dir="rtl">
                    <PersonalInfoCard profile={profile} onCopyPhone={(p) => void copyPhone(p)} />
                    <SkillsLanguagesCard profile={profile} />
                  </div>
                  <div className="space-y-4" dir="rtl">
                    <VolunteerInfoCard profile={profile} />
                    <DocumentsCard
                      profile={profile}
                      onPreview={() => void handlePreviewCv()}
                      onDownload={() => void handleDownloadCv()}
                      downloading={downloadingCv}
                    />
                    <ReviewHistoryCard profile={profile} />
                  </div>
                </div>

                {/* Keep age discoverable for tests / a11y when rendered in personal card */}
                {ageLabel && <span className="sr-only">العمر {ageLabel}</span>}
              </div>
            </div>

            <footer className={`shrink-0 border-t ${BORDER} bg-white px-4 py-3 sm:px-7`}>
              <VolunteerDetailActions
                profile={profile}
                busy={busy}
                rejecting={rejecting}
                confirmingApprove={confirmingApprove}
                reason={reason}
                setReason={setReason}
                setRejecting={setRejecting}
                setConfirmingApprove={setConfirmingApprove}
                onReview={() => void handleReview()}
                onApprove={() => void handleApprove()}
                onReject={() => void handleReject()}
                onMessage={() => window.open(`mailto:${profile.email}`, '_self')}
                onEdit={() => toast.message('تعديل معلومات التطوع يتم من ملف الفريق بعد القبول، أو عبر تحديث بيانات المتطوع.')}
              />
            </footer>
          </>
        )}
      </div>

      <LmsPreviewModal
        state={preview}
        onClose={() => {
          setPreview({ kind: 'idle' })
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current)
            objectUrlRef.current = null
          }
        }}
      />
    </div>,
    document.body,
  )
}
