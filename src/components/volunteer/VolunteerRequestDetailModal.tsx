import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  HeartHandshake,
  Loader2,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Video,
  X,
  XCircle,
} from 'lucide-react'
import { promiseToast } from '@/lib/toast'
import toast from '@/lib/toast'
import {
  convertVolunteerToMember,
  updateVolunteerRequestStatus,
  type VolunteerRequest,
  type VolunteerRequestStatus,
} from '@/api/volunteerApplicationApi'
import { formatDate } from '@/utils/dateTime'

/* ── Status config ─────────────────────────────────────────────────── */

export const STATUS_CFG: Record<
  VolunteerRequestStatus,
  { label: string; badge: string; dot: string }
> = {
  pending: {
    label: 'قيد المراجعة',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  reviewed: {
    label: 'تحت المراجعة',
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
  },
  accepted: {
    label: 'مقبول',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'مرفوض',
    badge: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  contacted: {
    label: 'تم التواصل',
    badge: 'bg-violet-100 text-violet-800 border-violet-200',
    dot: 'bg-violet-500',
  },
}

const ALL_STATUSES: VolunteerRequestStatus[] = [
  'pending',
  'reviewed',
  'accepted',
  'rejected',
  'contacted',
]

function StatusBadge({ status }: { status: VolunteerRequestStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-black ${cfg.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden />
      {cfg.label}
    </span>
  )
}

function isAlreadyConverted(r: VolunteerRequest): boolean {
  return r.can_convert_to_member !== true || r.converted_member_id !== null
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
  if (!digits) return null
  return `https://wa.me/${digits}`
}

/* ── Card primitives ───────────────────────────────────────────────── */

function InfoCard({
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
    <div
      className={`rounded-2xl border border-[#22334A]/[0.07] bg-white shadow-sm ring-1 ring-[#22334A]/[0.03] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-[#22334A]/[0.06] bg-slate-50/70 px-3.5 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#2691C2]/10 text-[#2691C2]">
          {icon}
        </span>
        <h3 className="text-[11px] font-black text-[#22334A]">{title}</h3>
      </div>
      <div className="px-3.5 py-3">{children}</div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  dir,
}: {
  label: string
  value?: string | null
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-slate-50 py-1.5 last:border-0 last:pb-0">
      <span className="shrink-0 text-[10px] font-black text-[#22334A]/45">{label}</span>
      <span className="text-left text-[12px] font-bold text-[#22334A]" dir={dir}>
        {displayValue(value)}
      </span>
    </div>
  )
}

function TextBlock({ text }: { text?: string | null }) {
  const content = text?.trim()
  if (!content) {
    return <p className="text-[12px] font-semibold text-slate-400">—</p>
  }
  return (
    <p className="line-clamp-4 whitespace-pre-wrap text-[12px] font-medium leading-relaxed text-[#22334A]/85">
      {content}
    </p>
  )
}

/* ── WhatsApp icon ─────────────────────────────────────────────────── */

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
  onOpenConvert,
}: VolunteerRequestDetailModalProps) {
  const [adminNotes, setAdminNotes] = useState(req.admin_notes ?? '')
  const [selectedStatus, setSelectedStatus] = useState<VolunteerRequestStatus>(req.status)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)
  const [localConverted, setLocalConverted] = useState(() => isAlreadyConverted(req))
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setAdminNotes(req.admin_notes ?? '')
    setSelectedStatus(req.status)
    setDirty(false)
    setLocalConverted(isAlreadyConverted(req))
  }, [req])

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

  async function handleConvert() {
    if (localConverted) {
      toast.warning('هذا المتطوع مضاف بالفعل إلى الأعضاء')
      return
    }
    setConverting(true)
    try {
      const updated = await convertVolunteerToMember(req.id)
      toast.success('تمت إضافة المتطوع إلى الأعضاء')
      setLocalConverted(true)
      onUpdated(updated)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      if (e?.response?.status === 409 || e?.response?.status === 422) {
        toast.warning(e.response?.data?.message ?? 'هذا المتطوع مضاف بالفعل')
        setLocalConverted(true)
      } else {
        toast.error('تعذّر تحويل المتطوع.')
      }
    } finally {
      setConverting(false)
    }
  }

  function openWhatsApp() {
    if (!whatsappUrl) return
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="volunteer-detail-title"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Centered modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        className="relative z-10 flex max-h-[90vh] w-full max-w-[1024px] flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-slate-50 to-white font-[Cairo,sans-serif] shadow-[0_32px_80px_-20px_rgba(15,23,42,0.45)] ring-1 ring-white/80"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <header className="shrink-0 border-b border-[#22334A]/[0.08] bg-white px-5 py-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-bl from-[#22334A] to-[#2691C2] text-[20px] font-black text-white shadow-lg shadow-[#2691C2]/25">
              {req.full_name.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2
                  id="volunteer-detail-title"
                  className="text-[20px] font-black leading-tight text-[#22334A]"
                >
                  {req.full_name}
                </h2>
                <StatusBadge status={req.status} />
              </div>
              <p className="mt-0.5 text-[13px] font-semibold text-slate-500" dir="ltr">
                {req.email}
              </p>
              {req.created_at && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>تاريخ التقديم:</span>
                  <span className="text-[#22334A]/70">{formatDate(req.created_at)}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-[#22334A]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || req.status === 'accepted'}
              onClick={() => void quickStatus('accepted')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              قبول
            </button>
            <button
              type="button"
              disabled={saving || req.status === 'rejected'}
              onClick={() => void quickStatus('rejected')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[11px] font-black text-red-700 transition hover:bg-red-100 disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5" />
              رفض
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void quickStatus('reviewed')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-[11px] font-black text-violet-700 transition hover:bg-violet-100 disabled:opacity-40"
            >
              <Video className="h-3.5 w-3.5" />
              جدولة مقابلة
            </button>
            {whatsappUrl && (
              <button
                type="button"
                disabled={saving}
                onClick={openWhatsApp}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                واتساب
              </button>
            )}
          </div>
        </header>

        {/* ── Scrollable body ──────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <InfoCard title="بيانات المتقدم" icon={<Users className="h-3.5 w-3.5" />}>
              <InfoRow label="الاسم" value={req.full_name} />
              <InfoRow label="البريد الإلكتروني" value={req.email} dir="ltr" />
              <InfoRow label="الجوال" value={req.phone} dir="ltr" />
              <InfoRow label="الدولة" value={req.country} />
              <InfoRow label="المدينة" value={req.city} />
              <InfoRow label="الجنس" value={genderLabel(req.gender)} />
            </InfoCard>

            <InfoCard title="التطوع" icon={<Briefcase className="h-3.5 w-3.5" />}>
              <InfoRow label="القسم المطلوب" value={req.desired_department} />
              <InfoRow label="مستوى الخبرة" value={req.experience_level} />
              <InfoRow label="التوفر" value={req.availability} />
            </InfoCard>

            <InfoCard title="الخبرة السابقة" icon={<FileText className="h-3.5 w-3.5" />}>
              <TextBlock text={req.previous_experience} />
            </InfoCard>

            <InfoCard title="الدافع للتطوع" icon={<HeartHandshake className="h-3.5 w-3.5" />}>
              <TextBlock text={req.motivation} />
            </InfoCard>

            <InfoCard
              title="المهارات"
              icon={<Sparkles className="h-3.5 w-3.5" />}
              className="md:col-span-2"
            >
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-xl border border-[#2691C2]/15 bg-[#2691C2]/[0.07] px-2.5 py-1 text-[11px] font-black text-[#2691C2]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] font-semibold text-slate-400">—</p>
              )}
            </InfoCard>
          </div>

          {/* CV */}
          <div className="mt-3 rounded-2xl border border-[#22334A]/[0.07] bg-white p-4 shadow-sm ring-1 ring-[#22334A]/[0.03]">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EC943C]/15 text-[#EC943C]">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-[11px] font-black text-[#22334A]">السيرة الذاتية</h3>
            </div>
            {hasCv ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={cvViewUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#22334A] px-5 py-3 text-[13px] font-black text-white transition hover:bg-[#2691C2]"
                >
                  <Eye className="h-4 w-4" />
                  عرض السيرة الذاتية
                </a>
                <a
                  href={cvDownloadUrl ?? '#'}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#2691C2]/30 bg-[#2691C2]/10 px-5 py-3 text-[13px] font-black text-[#2691C2] transition hover:bg-[#2691C2]/18"
                >
                  <Download className="h-4 w-4" />
                  تحميل السيرة الذاتية
                </a>
              </div>
            ) : (
              <p className="py-2 text-center text-[12px] font-semibold text-slate-400">
                لا توجد سيرة ذاتية مرفوعة
              </p>
            )}
          </div>

          {/* Convert to member — compact */}
          {req.status === 'accepted' && (
            <div
              className={`mt-3 rounded-2xl border p-3 ${
                localConverted
                  ? 'border-emerald-200 bg-emerald-50/80'
                  : 'border-emerald-200/60 bg-emerald-50/40'
              }`}
            >
              {localConverted ? (
                <div className="flex flex-wrap items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="flex-1 text-[11px] font-black text-emerald-800">
                    تمت إضافته إلى الأعضاء
                  </p>
                  <Link
                    to="/dashboard/members"
                    onClick={onClose}
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-50"
                  >
                    <ExternalLink className="h-3 w-3" />
                    عرض الأعضاء
                  </Link>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <UserPlus className="h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="min-w-0 flex-1 text-[11px] font-semibold text-emerald-800">
                    إضافة إلى صفحة الأعضاء؟
                  </p>
                  <button
                    type="button"
                    onClick={
                      onOpenConvert
                        ? () => {
                            onClose()
                            onOpenConvert(req)
                          }
                        : () => void handleConvert()
                    }
                    disabled={converting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-[10px] font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {converting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    إضافة إلى الأعضاء
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Admin footer ─────────────────────────────────────────── */}
        <footer className="shrink-0 border-t border-[#22334A]/[0.08] bg-white px-5 py-4">
          <div className="mb-2.5 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-[#EC943C]" />
            <h3 className="text-[12px] font-black text-[#22334A]">إجراءات الإدارة</h3>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
            <div className="relative shrink-0 sm:w-44">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value as VolunteerRequestStatus)
                  setDirty(true)
                }}
                dir="rtl"
                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-7 pr-3 text-[12px] font-black text-[#22334A] outline-none transition focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_CFG[s].label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${STATUS_CFG[selectedStatus].dot}`}
                />
              </span>
            </div>

            <textarea
              value={adminNotes}
              onChange={(e) => {
                setAdminNotes(e.target.value)
                setDirty(true)
              }}
              placeholder="ملاحظات داخلية للفريق..."
              rows={2}
              className="min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-[#22334A] outline-none transition placeholder:text-slate-400 focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
              aria-label="ملاحظات الإدارة"
            />

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!dirty || saving}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#EC943C] px-5 py-2.5 text-[12px] font-black text-white shadow-md transition hover:brightness-105 disabled:opacity-40 sm:self-stretch"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              حفظ
            </button>
          </div>
        </footer>
      </motion.div>
    </div>
  )
}
