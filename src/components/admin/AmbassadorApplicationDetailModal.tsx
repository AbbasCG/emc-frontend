import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  FileText,
  GraduationCap,
  HeartHandshake,
  History,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Printer,
  Sparkles,
  Star,
  Trash2,
  User,
  UserCheck,
  Video,
  X,
  XCircle,
} from 'lucide-react'
import { promiseToast } from '@/lib/toast'
import toast from '@/lib/toast'
import { useAuth } from '@/contexts/AuthContext'
import AmbassadorApplicationFiles from '@/components/admin/AmbassadorApplicationFiles'
import {
  addAmbassadorNote,
  deleteAmbassadorNote,
  updateAmbassadorStatus,
  AMBASSADOR_STATUS_LABELS,
  type AmbassadorApplication,
  type AmbassadorNote,
  type AmbassadorStatus,
} from '@/api/ambassadorApplicationApi'
import { formatDate, formatDateTime } from '@/utils/dateTime'
import { AMBASSADOR_STATUS_CFG } from '@/components/admin/ambassadorStatusConfig'

/* ── Design tokens ─────────────────────────────────────────────────── */

const SCROLL =
  '[scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400'

const ALL_STATUSES: AmbassadorStatus[] = [
  'new',
  'under_review',
  'interview_scheduled',
  'approved',
  'rejected',
  'waitlisted',
  'cancelled',
]

const MANAGE_ROLES = new Set(['super_admin', 'admin', 'hr_manager'])

function StatusBadge({ status }: { status: AmbassadorStatus }) {
  const cfg = AMBASSADOR_STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${cfg.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden />
      {cfg.label}
    </span>
  )
}

function displayValue(value?: string | number | boolean | null): string {
  if (value === true) return 'نعم'
  if (value === false) return 'لا'
  if (value == null || value === '') return '—'
  return String(value)
}

function genderLabel(g?: string | null): string {
  if (!g) return '—'
  if (g === 'male') return 'ذكر'
  if (g === 'female') return 'أنثى'
  return g
}

function buildWhatsAppUrl(phone?: string | null): string | null {
  if (!phone?.trim()) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  return `https://wa.me/${digits}`
}

function refNumber(app: AmbassadorApplication): string {
  if (app.reference_number?.trim()) return app.reference_number.trim()
  if (app.uuid?.trim()) return app.uuid.slice(0, 8).toUpperCase()
  return `AMB-${app.id}`
}

function formatTimeOnly(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('ar', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    numberingSystem: 'latn',
  }).format(d)
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
}: {
  label: string
  value?: string | number | boolean | null
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div className="grid grid-cols-[minmax(88px,38%)_1fr] items-start gap-x-3 gap-y-0.5 border-b border-slate-100 py-2.5 last:border-0 last:pb-0">
      <span className="text-[10px] font-semibold leading-relaxed text-slate-400">{label}</span>
      <span className="text-[13px] font-bold leading-snug text-[#0F172A]">
        {displayValue(value)}
      </span>
    </div>
  )
}

function ProseBlock({ text }: { text?: string | null }) {
  const content = text?.trim()
  if (!content) return <p className="text-[13px] font-medium text-slate-400">—</p>
  return (
    <p className="whitespace-pre-wrap text-[13px] font-medium leading-[1.75] text-[#0F172A]/90">
      {content}
    </p>
  )
}

function ChipList({ items, accent = 'slate' }: { items?: string[]; accent?: 'slate' | 'blue' | 'emerald' }) {
  const styles = {
    slate: 'bg-[#0C2A4B]/[0.05] text-[#0C2A4B]',
    blue: 'bg-[#0077B6]/[0.08] text-[#0C2A4B]',
    emerald: 'bg-emerald-50 text-emerald-800',
  }[accent]

  if (!items?.length) return <p className="text-[13px] font-medium text-slate-400">—</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${styles}`}>
          {item}
        </span>
      ))}
    </div>
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
    danger: 'border-red-200/80 bg-white text-red-700 hover:bg-red-50',
    accent: 'border-[#0077B6]/25 bg-[#0077B6]/[0.06] text-[#0C2A4B] hover:bg-[#0077B6]/10',
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

type TimelineItem = {
  id: string
  icon: ReactNode
  title: string
  description?: string
  user?: string
  date?: string
  time?: string
}

function buildTimeline(app: AmbassadorApplication): TimelineItem[] {
  const items: TimelineItem[] = []

  if (app.created_at || app.submitted_at) {
    const at = app.submitted_at ?? app.created_at
    items.push({
      id: 'submitted',
      icon: <Star className="h-3.5 w-3.5 text-[#0077B6]" />,
      title: 'تقديم الطلب',
      description: 'تم استلام طلب الانضمام لبرنامج السفراء',
      date: at ? formatDate(at) : undefined,
      time: formatTimeOnly(at),
    })
  }

  for (const h of app.status_history ?? []) {
    const from = h.from_status
      ? (AMBASSADOR_STATUS_LABELS[h.from_status as AmbassadorStatus] ?? h.from_status)
      : null
    const to = AMBASSADOR_STATUS_LABELS[h.to_status as AmbassadorStatus] ?? h.to_status
    items.push({
      id: `status-${h.id}`,
      icon: <History className="h-3.5 w-3.5 text-[#0C2A4B]/60" />,
      title: from ? `تغيير الحالة: ${from} → ${to}` : `الحالة: ${to}`,
      description: h.reason ?? undefined,
      user: h.changed_by,
      date: h.changed_at ? formatDate(h.changed_at) : undefined,
      time: formatTimeOnly(h.changed_at),
    })
  }

  for (const n of app.notes ?? []) {
    items.push({
      id: `note-${n.id}`,
      icon: <MessageSquare className="h-3.5 w-3.5 text-[#F28C00]" />,
      title: 'ملاحظة داخلية',
      description: n.content,
      user: n.author,
      date: n.created_at ? formatDate(n.created_at) : undefined,
      time: formatTimeOnly(n.created_at),
    })
  }

  if (app.interview_scheduled_at) {
    items.push({
      id: 'interview',
      icon: <Video className="h-3.5 w-3.5 text-indigo-500" />,
      title: 'مقابلة مجدولة',
      description: formatDateTime(app.interview_scheduled_at),
    })
  }

  return items
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" dir="rtl">
        <h3 className="mb-2 text-sm font-bold text-[#0F172A]">{title}</h3>
        <p className="mb-5 text-xs font-medium text-slate-500">{message}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0C2A4B] hover:bg-[#0077B6]'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-[#0C2A4B]"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main modal ────────────────────────────────────────────────────── */

export type AmbassadorApplicationDetailModalProps = {
  app: AmbassadorApplication
  onClose: () => void
  onUpdated: (updated: AmbassadorApplication) => void
}

export default function AmbassadorApplicationDetailModal({
  app,
  onClose,
  onUpdated,
}: AmbassadorApplicationDetailModalProps) {
  const { user } = useAuth()
  const role = String(user?.role ?? '').toLowerCase()
  const canManage = MANAGE_ROLES.has(role)

  const [selectedStatus, setSelectedStatus] = useState<AmbassadorStatus>(app.status)
  const [statusReason, setStatusReason] = useState('')
  const [interviewAt, setInterviewAt] = useState(app.interview_scheduled_at?.slice(0, 16) ?? '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const [noteContent, setNoteContent] = useState('')
  const [notePrivate, setNotePrivate] = useState(true)
  const [addingNote, setAddingNote] = useState(false)

  const [confirmAction, setConfirmAction] = useState<'reject' | 'approve' | null>(null)

  // Re-seed the editing form whenever a different application object arrives
  // (adjust state during render — react.dev's "adjusting state when a prop changes").
  const [seenApp, setSeenApp] = useState(app)
  if (seenApp !== app) {
    setSeenApp(app)
    setSelectedStatus(app.status)
    setInterviewAt(app.interview_scheduled_at?.slice(0, 16) ?? '')
    setStatusReason('')
    setDirty(false)
  }

  const whatsappUrl = buildWhatsAppUrl(app.mobile_phone)
  const timeline = useMemo(() => buildTimeline(app), [app])
  const initials = app.full_name.trim().charAt(0) || '؟'

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

  async function persistStatus(
    status: AmbassadorStatus,
    reason?: string,
    interview?: string,
  ) {
    setSaving(true)
    try {
      const updated = await promiseToast(
        updateAmbassadorStatus(
          app.id,
          status,
          reason || undefined,
          undefined,
          interview || undefined,
        ),
        {
          loading: 'جاري الحفظ...',
          success: 'تم حفظ التغييرات',
          error: 'تعذّر حفظ التغييرات.',
        },
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

  async function handleSave() {
    await persistStatus(
      selectedStatus,
      statusReason || undefined,
      selectedStatus === 'interview_scheduled' ? interviewAt || undefined : undefined,
    )
  }

  async function quickStatus(status: AmbassadorStatus) {
    await persistStatus(
      status,
      statusReason || undefined,
      status === 'interview_scheduled' ? interviewAt || undefined : undefined,
    )
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteContent.trim()) return
    setAddingNote(true)
    try {
      await promiseToast(addAmbassadorNote(app.id, noteContent.trim(), notePrivate), {
        loading: 'جاري الحفظ...',
        success: 'تمت إضافة الملاحظة',
        error: 'تعذّر إضافة الملاحظة.',
      })
      setNoteContent('')
      const { fetchAmbassadorApplication } = await import('@/api/ambassadorApplicationApi')
      const fresh = await fetchAmbassadorApplication(app.id)
      onUpdated(fresh)
    } catch {
      /* toast */
    } finally {
      setAddingNote(false)
    }
  }

  async function handleDeleteNote(noteId: number) {
    try {
      await deleteAmbassadorNote(app.id, noteId)
      toast.success('تم حذف الملاحظة')
      const { fetchAmbassadorApplication } = await import('@/api/ambassadorApplicationApi')
      const fresh = await fetchAmbassadorApplication(app.id)
      onUpdated(fresh)
    } catch {
      toast.error('تعذّر حذف الملاحظة')
    }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(app.email)
      toast.success('تم نسخ البريد الإلكتروني')
    } catch {
      toast.error('تعذّر النسخ')
    }
  }

  const socialLinks = [
    { label: 'إنستغرام', value: app.social_instagram },
    { label: 'لينكدإن', value: app.social_linkedin },
    { label: 'فيسبوك', value: app.social_facebook },
    { label: 'تيك توك', value: app.social_tiktok },
    { label: 'GitHub', value: app.social_github },
  ].filter((s) => s.value?.trim())

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ambassador-detail-title"
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
        initial={{ opacity: 0, scale: 0.97, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 24 }}
        transition={{ type: 'spring', damping: 30, stiffness: 380 }}
        className="relative z-10 flex max-h-[92vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-t-3xl bg-[#F8FAFC] font-[Cairo,sans-serif] shadow-[0_40px_100px_-24px_rgba(15,23,42,0.55)] ring-1 ring-[#0C2A4B]/10 sm:max-h-[90vh] sm:rounded-3xl"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 shrink-0 bg-gradient-to-l from-[#0077B6] via-[#0C2A4B] to-[#F28C00]" />

        {/* Header */}
        <header className="shrink-0 border-b border-[#0C2A4B]/[0.06] bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0C2A4B] text-[17px] font-bold text-white shadow-sm sm:h-14 sm:w-14 sm:text-[19px]">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="ambassador-detail-title"
                  className="text-[17px] font-bold leading-tight text-[#0F172A] sm:text-[19px]"
                >
                  {app.full_name}
                </h2>
                <StatusBadge status={app.status} />
              </div>
              <p className="mt-1 truncate text-[12px] font-medium text-slate-500" dir="ltr">
                {app.email}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-[#0077B6]/70" />
                  مرجع: <span className="font-bold text-[#0C2A4B]/80" dir="ltr">{refNumber(app)}</span>
                </span>
                {app.created_at && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-[#0077B6]/70" />
                    تاريخ التقديم:
                    <span className="font-bold text-[#0C2A4B]/80">{formatDate(app.created_at)}</span>
                  </span>
                )}
              </div>
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

          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#0C2A4B]/[0.05] pt-4">
            <ActionBtn variant="neutral" onClick={() => window.open(`mailto:${app.email}`, '_self')}>
              <Mail className="h-3.5 w-3.5 text-[#0077B6]" />
              إرسال بريد
            </ActionBtn>
            <ActionBtn variant="neutral" onClick={() => void copyEmail()}>
              <Copy className="h-3.5 w-3.5" />
              نسخ البريد
            </ActionBtn>
            {app.mobile_phone && (
              <ActionBtn
                variant="neutral"
                onClick={() => window.open(`tel:${app.mobile_phone}`, '_self')}
              >
                <Phone className="h-3.5 w-3.5" />
                اتصال
              </ActionBtn>
            )}
            {whatsappUrl && (
              <ActionBtn
                variant="neutral"
                onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
              >
                <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600" />
                واتساب
              </ActionBtn>
            )}
            <ActionBtn variant="neutral" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              طباعة
            </ActionBtn>
            {canManage && (
              <>
                <ActionBtn
                  variant="primary"
                  disabled={saving || app.status === 'approved'}
                  onClick={() => setConfirmAction('approve')}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  قبول
                </ActionBtn>
                <ActionBtn
                  variant="danger"
                  disabled={saving || app.status === 'rejected'}
                  onClick={() => setConfirmAction('reject')}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  رفض
                </ActionBtn>
                <ActionBtn
                  variant="neutral"
                  disabled={saving}
                  onClick={() => void quickStatus('interview_scheduled')}
                >
                  <Video className="h-3.5 w-3.5 text-[#0077B6]" />
                  جدولة مقابلة
                </ActionBtn>
              </>
            )}
          </div>
        </header>

        {/* Body */}
        <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 ${SCROLL}`}>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <SectionCard title="بيانات المتقدم" icon={<User className="h-3.5 w-3.5" />}>
              <FieldRow label="الاسم الكامل" value={app.full_name} />
              <FieldRow label="الجنس" value={genderLabel(app.gender)} />
              <FieldRow
                label="تاريخ الميلاد"
                value={app.date_of_birth ? formatDate(app.date_of_birth) : null}
              />
              <FieldRow label="الجنسية" value={app.nationality} />
              <FieldRow label="الدولة" value={app.country} />
              <FieldRow label="المدينة" value={app.city} />
            </SectionCard>

            <SectionCard title="معلومات التواصل" icon={<Phone className="h-3.5 w-3.5" />}>
              <FieldRow label="البريد الإلكتروني" value={app.email} dir="ltr" />
              <FieldRow label="الجوال" value={app.mobile_phone} dir="ltr" />
              {socialLinks.map((s) => (
                <FieldRow key={s.label} label={s.label} value={s.value} dir="ltr" />
              ))}
              <FieldRow label="الموقع الإلكتروني" value={app.website_url} dir="ltr" />
            </SectionCard>

            <SectionCard title="بيانات الجامعة" icon={<GraduationCap className="h-3.5 w-3.5" />}>
              <FieldRow label="الجامعة" value={app.university_name} />
              <FieldRow label="نوع الجامعة" value={app.university_type} />
              <FieldRow label="الكلية" value={app.faculty} />
              <FieldRow label="التخصص" value={app.major} />
              <FieldRow label="السنة الدراسية" value={app.study_year} />
              <FieldRow label="الرقم الجامعي" value={app.student_number} dir="ltr" />
              <FieldRow label="حالة الطالب" value={app.student_status} />
              <FieldRow
                label="التخرج المتوقع"
                value={
                  app.expected_graduation_date ? formatDate(app.expected_graduation_date) : null
                }
              />
            </SectionCard>

            <SectionCard title="التوفر والإمكانات" icon={<Briefcase className="h-3.5 w-3.5" />}>
              <FieldRow label="ساعات أسبوعية" value={app.weekly_hours_available} />
              <FieldRow label="حضور فعاليات الجامعة" value={app.can_attend_university_events} />
              <FieldRow label="تمثيل EMC خارجياً" value={app.can_represent_emc_outside} />
              <FieldRow label="السفر" value={app.can_travel} />
              <FieldRow label="حاسب محمول" value={app.owns_laptop} />
              <FieldRow label="إنترنت مستقر" value={app.has_stable_internet} />
              <FieldRow label="الاجتماعات الأسبوعية" value={app.can_attend_weekly_meetings} />
            </SectionCard>

            <SectionCard
              title="دوافع الانضمام"
              icon={<HeartHandshake className="h-3.5 w-3.5" />}
              className="md:col-span-2"
            >
              <p className="mb-2 text-[10px] font-semibold text-slate-400">لماذا يريد الانضمام؟</p>
              <ProseBlock text={app.motivation_why} />
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="mb-2 text-[10px] font-semibold text-slate-400">ما الذي سيضيفه؟</p>
                <ProseBlock text={app.contribution_what} />
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="mb-2 text-[10px] font-semibold text-slate-400">ماذا يتوقع اكتسابه؟</p>
                <ProseBlock text={app.expected_gain} />
              </div>
              <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] font-semibold text-slate-400">أكبر إنجاز</p>
                  <ProseBlock text={app.biggest_achievement} />
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-semibold text-slate-400">أكبر تحدٍ</p>
                  <ProseBlock text={app.biggest_challenge} />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="المهارات والاهتمامات" icon={<Sparkles className="h-3.5 w-3.5" />}>
              <p className="mb-2 text-[10px] font-semibold text-slate-400">المهارات</p>
              <ChipList items={app.skills} accent="blue" />
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="mb-2 text-[10px] font-semibold text-slate-400">الاهتمامات</p>
                <ChipList items={app.interests} />
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="mb-2 text-[10px] font-semibold text-slate-400">الشهادات</p>
                <ChipList items={app.certifications} accent="emerald" />
              </div>
            </SectionCard>

            <SectionCard title="القيادة والخبرة" icon={<UserCheck className="h-3.5 w-3.5" />}>
              <FieldRow label="قيادة فريق" value={app.has_led_team} />
              <FieldRow label="تنظيم فعاليات" value={app.has_organized_events} />
              <FieldRow label="أكبر حضور" value={app.events_attendees_count} />
              <FieldRow label="تمثيل الجامعة" value={app.has_represented_university} />
              <FieldRow label="خبرة تطوعية" value={app.has_volunteer_experience} />
              <FieldRow label="خبرة ورش عمل" value={app.has_teaching_experience} />
              <FieldRow label="أندية طلابية" value={app.has_student_club_involvement} />
              {app.volunteer_experience_types?.length ? (
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <p className="mb-2 text-[10px] font-semibold text-slate-400">أنواع التطوع</p>
                  <ChipList items={app.volunteer_experience_types} />
                </div>
              ) : null}
            </SectionCard>

            <SectionCard title="بيانات الطلب" icon={<FileText className="h-3.5 w-3.5" />} className="md:col-span-2">
              <div className="grid gap-0 sm:grid-cols-2 sm:gap-x-6">
                <FieldRow label="معرّف الطلب" value={app.id} dir="ltr" />
                <FieldRow label="رقم المرجع" value={refNumber(app)} dir="ltr" />
                <FieldRow
                  label="تاريخ الإنشاء"
                  value={app.created_at ? formatDateTime(app.created_at) : null}
                />
                <FieldRow
                  label="تاريخ التقديم"
                  value={app.submitted_at ? formatDateTime(app.submitted_at) : null}
                />
                <FieldRow
                  label="آخر تحديث"
                  value={app.updated_at ? formatDateTime(app.updated_at) : null}
                />
                <FieldRow label="المصدر" value={app.source} />
                <FieldRow label="الحالة الحالية" value={AMBASSADOR_STATUS_LABELS[app.status]} />
                <FieldRow label="المراجع" value={app.reviewed_by?.name} />
              </div>
            </SectionCard>

            <SectionCard
              title="المرفقات والملفات"
              icon={<FileText className="h-3.5 w-3.5" />}
              className="md:col-span-2"
            >
              <AmbassadorApplicationFiles
                applicationId={app.id}
                embedded
                canDelete={canManage}
              />
            </SectionCard>

            {canManage && (
              <SectionCard
                title="إجراءات الإدارة"
                icon={<UserCheck className="h-3.5 w-3.5" />}
                className="md:col-span-2"
              >
                <div className="flex flex-col gap-3">
                  <div>
                    <label
                      htmlFor="ambassador-status-select"
                      className="mb-1.5 block text-[10px] font-semibold text-slate-400"
                    >
                      حالة الطلب
                    </label>
                    <div className="relative">
                      <select
                        id="ambassador-status-select"
                        value={selectedStatus}
                        onChange={(e) => {
                          setSelectedStatus(e.target.value as AmbassadorStatus)
                          setDirty(true)
                        }}
                        dir="rtl"
                        className="h-11 w-full appearance-none rounded-xl border border-[#0C2A4B]/10 bg-white pl-9 pr-3.5 text-[13px] font-bold text-[#0F172A] outline-none transition focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {AMBASSADOR_STATUS_CFG[s].label}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${AMBASSADOR_STATUS_CFG[selectedStatus].dot}`}
                        />
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </span>
                    </div>
                  </div>

                  {selectedStatus === 'interview_scheduled' && (
                    <div>
                      <label
                        htmlFor="ambassador-interview-at"
                        className="mb-1.5 block text-[10px] font-semibold text-slate-400"
                      >
                        موعد المقابلة
                      </label>
                      <input
                        id="ambassador-interview-at"
                        type="datetime-local"
                        value={interviewAt}
                        onChange={(e) => {
                          setInterviewAt(e.target.value)
                          setDirty(true)
                        }}
                        className="h-11 w-full rounded-xl border border-[#0C2A4B]/10 bg-white px-3.5 text-[13px] font-bold text-[#0F172A] outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="ambassador-status-reason"
                      className="mb-1.5 block text-[10px] font-semibold text-slate-400"
                    >
                      ملاحظة القرار (اختياري)
                    </label>
                    <textarea
                      id="ambassador-status-reason"
                      value={statusReason}
                      onChange={(e) => {
                        setStatusReason(e.target.value)
                        setDirty(true)
                      }}
                      placeholder="سبب تغيير الحالة أو طلب معلومات إضافية..."
                      rows={2}
                      className="w-full resize-none rounded-xl border border-[#0C2A4B]/10 bg-white px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <ActionBtn
                      variant="accent"
                      disabled={saving}
                      onClick={() => void quickStatus('waitlisted')}
                    >
                      قائمة انتظار
                    </ActionBtn>
                    <ActionBtn
                      variant="accent"
                      disabled={saving}
                      onClick={() => void quickStatus('under_review')}
                    >
                      قيد المراجعة
                    </ActionBtn>
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
            )}

            <SectionCard
              title="ملاحظات داخلية"
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              className="md:col-span-2"
            >
              {canManage ? (
                <form onSubmit={(e) => void handleAddNote(e)} className="mb-4 space-y-3">
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={3}
                    placeholder="أضف ملاحظة داخلية للفريق..."
                    className="w-full resize-none rounded-xl border border-[#0C2A4B]/10 bg-white px-3.5 py-2.5 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setNotePrivate((p) => !p)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${
                        notePrivate
                          ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Lock className="h-3 w-3" />
                      {notePrivate ? 'خاصة' : 'عامة للفريق'}
                    </button>
                    <button
                      type="submit"
                      disabled={addingNote || !noteContent.trim()}
                      className="rounded-xl bg-[#0C2A4B] px-4 py-2 text-[11px] font-bold text-white disabled:opacity-40"
                    >
                      {addingNote ? 'جارٍ الحفظ...' : 'حفظ الملاحظة'}
                    </button>
                  </div>
                </form>
              ) : null}

              {app.notes?.length ? (
                <div className="space-y-3">
                  {app.notes.map((note: AmbassadorNote) => (
                    <div
                      key={note.id}
                      className="group rounded-xl border border-slate-100 bg-[#F8FAFC] p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-500">{note.author}</span>
                          {note.is_private && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-200/80">
                              <Lock className="h-2.5 w-2.5" />
                              داخلي
                            </span>
                          )}
                        </div>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteNote(note.id)}
                            className="opacity-0 transition group-hover:opacity-100"
                            aria-label="حذف الملاحظة"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400 hover:text-red-600" />
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#0F172A]/90">
                        {note.content}
                      </p>
                      {note.created_at && (
                        <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                          {formatDateTime(note.created_at)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-8 text-center">
                  <MessageSquare className="h-7 w-7 text-slate-300" />
                  <p className="text-xs font-bold text-slate-400">لا توجد ملاحظات بعد</p>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="سجل النشاط"
              icon={<Clock className="h-3.5 w-3.5" />}
              className="md:col-span-2"
            >
              {timeline.length ? (
                <ol className="space-y-0">
                  {timeline.map((item, idx) => (
                    <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {idx < timeline.length - 1 && (
                        <span
                          className="absolute right-[13px] top-7 bottom-0 w-px bg-slate-200"
                          aria-hidden
                        />
                      )}
                      <span className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
                        {item.icon}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-[12px] font-bold text-[#0F172A]">{item.title}</p>
                        {item.description && (
                          <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-medium text-slate-400">
                          {item.user && <span>{item.user}</span>}
                          {item.date && (
                            <span>
                              {item.date}
                              {item.time ? ` · ${item.time}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-8 text-center">
                  <History className="h-7 w-7 text-slate-300" />
                  <p className="text-xs font-bold text-slate-400">لا يوجد سجل نشاط بعد</p>
                </div>
              )}
            </SectionCard>
          </div>
        </div>

        {dirty && canManage && (
          <footer className="shrink-0 border-t border-[#F28C00]/20 bg-[#F28C00]/[0.06] px-4 py-2.5 sm:px-6">
            <p className="text-center text-[11px] font-medium text-[#0C2A4B]">
              لديك تغييرات غير محفوظة — اضغط «حفظ التغييرات» قبل الإغلاق
            </p>
          </footer>
        )}
      </motion.div>

      {confirmAction === 'reject' && (
        <ConfirmDialog
          title="رفض الطلب"
          message="هل أنت متأكد من رفض هذا الطلب؟ سيتم إغلاق نافذة التفاصيل بعد التأكيد."
          confirmLabel="رفض الطلب"
          danger
          onConfirm={() => {
            setConfirmAction(null)
            void quickStatus('rejected')
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction === 'approve' && (
        <ConfirmDialog
          title="قبول الطلب"
          message="هل تريد قبول هذا المتقدم كسفير تحول رقمي؟"
          confirmLabel="قبول"
          onConfirm={() => {
            setConfirmAction(null)
            void quickStatus('approved')
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
