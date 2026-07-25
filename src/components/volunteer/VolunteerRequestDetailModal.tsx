import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  FileText,
  HeartHandshake,
  Loader2,
  Phone,
  Sparkles,
  User,
  UserCheck,
  Video,
  X,
  XCircle,
} from 'lucide-react'
import { promiseToast } from '@/lib/toast'
import {
  updateVolunteerRequestStatus,
  type VolunteerRequest,
  type VolunteerRequestStatus,
} from '@/api/volunteerApplicationApi'
import { formatDate } from '@/utils/dateTime'
import { STATUS_CFG } from './volunteerRequestStatus'

/* ── Design tokens ─────────────────────────────────────────────────── */

const SCROLL =
  '[scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400'


const ALL_STATUSES: VolunteerRequestStatus[] = [
  'pending',
  'reviewing',
  'reviewed',
  'accepted',
  'rejected',
  'contacted',
  'converted_to_member',
]

function StatusBadge({ status }: { status: VolunteerRequestStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${cfg.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden />
      {cfg.label}
    </span>
  )
}

function parseSkills(raw?: string | null): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[,،\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function genderLabel(g?: string | null): string {
  if (!g) return '—'
  if (g === 'male') return 'ذكر'
  if (g === 'female') return 'أنثى'
  return g
}

function displayValue(value?: string | null): string {
  const s = String(value ?? '').trim()
  return s || '—'
}

function buildWhatsAppUrl(phone?: string | null): string | null {
  if (!phone?.trim()) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  return `https://wa.me/${digits}`
}

/* ── Primitives ────────────────────────────────────────────────────── */

function SectionCard({
  title,
  icon,
  children,
  className = '',
}: {
  title: string
  icon: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-[#0C2A4B]/[0.06] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${className}`}
    >
      <div className="flex items-center gap-2.5 border-b border-[#0C2A4B]/[0.05] bg-[#F8FAFC] px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0C2A4B]/[0.06] text-[#0C2A4B]/70">
          {icon}
        </span>
        <h3 className="text-[12px] font-bold tracking-tight text-[#0C2A4B]">{title}</h3>
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  )
}

function FieldRow({
  label,
  value,
  dir,
}: {
  label: string
  value?: string | null
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div className="grid grid-cols-[minmax(88px,38%)_1fr] items-start gap-x-3 gap-y-0.5 border-b border-slate-100 py-2.5 last:border-0 last:pb-0">
      <span className="text-[10px] font-semibold leading-relaxed text-slate-400">{label}</span>
      <span
        dir={dir}
        className="text-[13px] font-bold leading-snug text-[#0F172A]"
      >
        {displayValue(value)}
      </span>
    </div>
  )
}

function ProseBlock({ text }: { text?: string | null }) {
  const content = text?.trim()
  if (!content) {
    return <p className="text-[13px] font-medium text-slate-400">—</p>
  }
  return (
    <p className="whitespace-pre-wrap text-[13px] font-medium leading-[1.75] text-[#0F172A]/90">
      {content}
    </p>
  )
}

function ActionBtn({
  children,
  onClick,
  disabled,
  variant = 'neutral',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'neutral' | 'primary' | 'danger' | 'accent'
}) {
  const styles = {
    neutral:
      'border-[#0C2A4B]/10 bg-white text-[#0C2A4B] hover:border-[#0C2A4B]/20 hover:bg-[#F8FAFC]',
    primary:
      'border-[#0C2A4B] bg-[#0C2A4B] text-white hover:bg-[#0077B6] hover:border-[#0077B6]',
    danger:
      'border-red-200/80 bg-white text-red-700 hover:bg-red-50',
    accent:
      'border-[#0077B6]/25 bg-[#0077B6]/[0.06] text-[#0C2A4B] hover:bg-[#0077B6]/10',
  }[variant]

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

/* ── Main modal ────────────────────────────────────────────────────── */

export type VolunteerRequestDetailModalProps = {
  req: VolunteerRequest
  onClose: () => void
  onUpdated: (updated: VolunteerRequest) => void
  onOpenConvert?: (req: VolunteerRequest) => void
}

export default function VolunteerRequestDetailModal({
  req,
  onClose,
  onUpdated,
}: VolunteerRequestDetailModalProps) {
  const [adminNotes, setAdminNotes] = useState(req.admin_notes ?? '')
  const [selectedStatus, setSelectedStatus] = useState<VolunteerRequestStatus>(req.status)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(panelRef, { active: true, onEscape: onClose })

  // Re-hydrate the form during render when a different request is shown (react.dev
  // "adjusting state when a prop changes"). On mount the effect only re-set the initial
  // values, so seeding `seen` with the current request keeps behaviour identical.
  const [seenReq, setSeenReq] = useState(req)
  if (seenReq !== req) {
    setSeenReq(req)
    setAdminNotes(req.admin_notes ?? '')
    setSelectedStatus(req.status)
    setDirty(false)
  }

  const skills = useMemo(() => parseSkills(req.skills), [req.skills])
  const cvViewUrl = req.cv_view_url ?? req.cv_file_url ?? null
  const cvDownloadUrl = req.cv_download_url ?? req.cv_file_url ?? null
  const hasCv = Boolean(cvDownloadUrl)
  const whatsappUrl = buildWhatsAppUrl(req.phone)

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [handleEscape])

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await promiseToast(
        updateVolunteerRequestStatus(req.id, selectedStatus, adminNotes || undefined),
        {
          loading: 'جاري الحفظ...',
          success: 'تم حفظ التغييرات',
          error: 'تعذّر الحفظ.',
        },
      )
      onUpdated(updated)
      setDirty(false)
    } catch {
      /* toast handles */
    } finally {
      setSaving(false)
    }
  }

  async function quickStatus(status: VolunteerRequestStatus) {
    setSaving(true)
    try {
      const updated = await promiseToast(
        updateVolunteerRequestStatus(req.id, status, adminNotes || undefined),
        { loading: 'جاري التحديث...', success: 'تم التحديث', error: 'تعذّر التحديث.' },
      )
      onUpdated(updated)
      setSelectedStatus(status)
      setDirty(false)
      if (status === 'rejected') onClose()
    } catch {
      /* toast */
    } finally {
      setSaving(false)
    }
  }

  function openWhatsApp() {
    if (!whatsappUrl) return
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="volunteer-detail-title"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-[#0F172A]/55 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden
      />

      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, scale: 0.97, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 24 }}
        transition={{ type: 'spring', damping: 30, stiffness: 380 }}
        className="relative z-10 flex max-h-[92vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-t-3xl bg-[#F8FAFC] font-[Cairo,sans-serif] shadow-[0_40px_100px_-24px_rgba(15,23,42,0.55)] ring-1 ring-[#0C2A4B]/10 sm:max-h-[90vh] sm:rounded-3xl"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent bar */}
        <div className="h-1 shrink-0 bg-gradient-to-l from-[#0077B6] via-[#0C2A4B] to-[#F28C00]" />

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="shrink-0 border-b border-[#0C2A4B]/[0.06] bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0C2A4B] text-[17px] font-bold text-white shadow-sm sm:h-14 sm:w-14 sm:text-[19px]">
              {req.full_name.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="volunteer-detail-title"
                  className="text-[17px] font-bold leading-tight text-[#0F172A] sm:text-[19px]"
                >
                  {req.full_name}
                </h2>
                <StatusBadge status={req.status} />
              </div>
              <p className="mt-1 truncate text-[12px] font-medium text-slate-500" dir="ltr">
                {req.email}
              </p>
              {req.created_at && (
                <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] font-medium text-slate-400">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-[#0077B6]/70" />
                  <span>تاريخ التقديم:</span>
                  <span className="font-bold text-[#0C2A4B]/80">{formatDate(req.created_at)}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#0C2A4B]/10 bg-[#F8FAFC] text-slate-500 transition hover:border-[#0C2A4B]/20 hover:text-[#0C2A4B]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Action bar */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#0C2A4B]/[0.05] pt-4">
            <ActionBtn
              variant="primary"
              disabled={saving || req.status === 'accepted'}
              onClick={() => void quickStatus('accepted')}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              قبول
            </ActionBtn>
            <ActionBtn
              variant="danger"
              disabled={saving || req.status === 'rejected'}
              onClick={() => void quickStatus('rejected')}
            >
              <XCircle className="h-3.5 w-3.5" />
              رفض
            </ActionBtn>
            <ActionBtn
              variant="neutral"
              disabled={saving}
              onClick={() => void quickStatus('reviewed')}
            >
              <Video className="h-3.5 w-3.5 text-[#0077B6]" />
              جدولة مقابلة
            </ActionBtn>
            {whatsappUrl && (
              <ActionBtn variant="neutral" disabled={saving} onClick={openWhatsApp}>
                <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600" />
                واتساب
              </ActionBtn>
            )}
          </div>
        </header>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 ${SCROLL}`}>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {/* 1. Applicant */}
            <SectionCard title="بيانات المتقدم" icon={<User className="h-3.5 w-3.5" />}>
              <FieldRow label="الاسم" value={req.full_name} />
              <FieldRow label="الجنس" value={genderLabel(req.gender)} />
            </SectionCard>

            {/* 2. Contact */}
            <SectionCard title="معلومات التواصل" icon={<Phone className="h-3.5 w-3.5" />}>
              <FieldRow label="البريد الإلكتروني" value={req.email} dir="ltr" />
              <FieldRow label="الجوال" value={req.phone} dir="ltr" />
              <FieldRow label="الدولة" value={req.country} />
              <FieldRow label="المدينة" value={req.city} />
            </SectionCard>

            {/* 3. Department & availability */}
            <SectionCard title="القسم والتوفر" icon={<Briefcase className="h-3.5 w-3.5" />}>
              <FieldRow label="القسم المطلوب" value={req.desired_department} />
              <FieldRow label="مستوى الخبرة" value={req.experience_level} />
              <FieldRow label="التوفر" value={req.availability} />
            </SectionCard>

            {/* 4. Experience & skills */}
            <SectionCard title="الخبرة والمهارات" icon={<Sparkles className="h-3.5 w-3.5" />}>
              <p className="mb-2 text-[10px] font-semibold text-slate-400">الخبرة السابقة</p>
              <ProseBlock text={req.previous_experience} />
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="mb-2 text-[10px] font-semibold text-slate-400">المهارات</p>
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg bg-[#0C2A4B]/[0.05] px-2.5 py-1 text-[11px] font-bold text-[#0C2A4B]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] font-medium text-slate-400">—</p>
                )}
              </div>
            </SectionCard>

            {/* 5. Motivation — full width on md when paired with empty slot, span 2 if alone */}
            <SectionCard
              title="الدافع للتطوع"
              icon={<HeartHandshake className="h-3.5 w-3.5" />}
              className="md:col-span-2"
            >
              <ProseBlock text={req.motivation} />
            </SectionCard>

            {/* 6. CV */}
            <SectionCard
              title="السيرة الذاتية"
              icon={<FileText className="h-3.5 w-3.5" />}
              className="md:col-span-2"
            >
              {hasCv ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <a
                    href={cvViewUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#0C2A4B] bg-[#0C2A4B] px-4 py-3 text-[12px] font-bold text-white transition hover:bg-[#0077B6] hover:border-[#0077B6]"
                  >
                    <Eye className="h-4 w-4" />
                    عرض السيرة الذاتية
                  </a>
                  <a
                    href={cvDownloadUrl ?? '#'}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#0C2A4B]/15 bg-white px-4 py-3 text-[12px] font-bold text-[#0C2A4B] transition hover:border-[#0077B6]/40 hover:bg-[#0077B6]/[0.04]"
                  >
                    <Download className="h-4 w-4 text-[#0077B6]" />
                    تحميل السيرة الذاتية
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-[#F8FAFC] px-4 py-6 text-center">
                  <FileText className="mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-[12px] font-bold text-slate-500">لا توجد سيرة ذاتية مرفوعة</p>
                </div>
              )}
            </SectionCard>

            {/* Accepted status notice — link to accepted volunteers page */}
            {req.status === 'accepted' && (
              <div className="md:col-span-2 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <p className="flex-1 text-[12px] font-bold text-emerald-800">
                  تم قبول الطلب — يمكن تحويل المتطوع إلى عضو من قائمة المتطوعين المقبولين.
                </p>
                <Link
                  to="/dashboard/volunteer"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50"
                >
                  <ExternalLink className="h-3 w-3" />
                  عرض المتطوعين المقبولين
                </Link>
              </div>
            )}

            {/* 7. Admin actions — in scroll on mobile, also sticky footer below */}
            <SectionCard
              title="إجراءات الإدارة"
              icon={<UserCheck className="h-3.5 w-3.5" />}
              className="md:col-span-2"
            >
              <div className="flex flex-col gap-3">
                <div>
                  <label
                    htmlFor="volunteer-status-select"
                    className="mb-1.5 block text-[10px] font-semibold text-slate-400"
                  >
                    حالة الطلب
                  </label>
                  <div className="relative">
                    <select
                      id="volunteer-status-select"
                      value={selectedStatus}
                      onChange={(e) => {
                        setSelectedStatus(e.target.value as VolunteerRequestStatus)
                        setDirty(true)
                      }}
                      dir="rtl"
                      className="h-11 w-full appearance-none rounded-xl border border-[#0C2A4B]/10 bg-white pl-9 pr-3.5 text-[13px] font-bold text-[#0F172A] outline-none transition focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_CFG[s].label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${STATUS_CFG[selectedStatus].dot}`}
                      />
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="volunteer-admin-notes"
                    className="mb-1.5 block text-[10px] font-semibold text-slate-400"
                  >
                    ملاحظات الإدارة
                  </label>
                  <textarea
                    id="volunteer-admin-notes"
                    value={adminNotes}
                    onChange={(e) => {
                      setAdminNotes(e.target.value)
                      setDirty(true)
                    }}
                    placeholder="ملاحظات داخلية للفريق..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-[#0C2A4B]/10 bg-white px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={!dirty || saving}
                    className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl bg-[#F28C00] px-5 py-2.5 text-[12px] font-bold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    حفظ التغييرات
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Sticky save hint when dirty — compact footer */}
        {dirty && (
          <footer className="shrink-0 border-t border-[#F28C00]/20 bg-[#F28C00]/[0.06] px-4 py-2.5 sm:px-6">
            <p className="text-center text-[11px] font-medium text-[#0C2A4B]">
              لديك تغييرات غير محفوظة — اضغط «حفظ التغييرات» قبل الإغلاق
            </p>
          </footer>
        )}
      </motion.div>
    </div>
  )
}
