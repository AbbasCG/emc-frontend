/**
 * Full-page ambassador application detail view.
 * Route: /dashboard/super-admin/ambassador-applications/:id
 *        /dashboard/hr/ambassador-applications/:id
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
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
  RefreshCw,
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
  fetchAmbassadorApplication,
  updateAmbassadorStatus,
  AMBASSADOR_STATUS_LABELS,
  type AmbassadorApplication,
  type AmbassadorNote,
  type AmbassadorStatus,
  type AmbassadorStatusHistory,
} from '@/api/ambassadorApplicationApi'
import {
  fetchAmbassadorFileBlob,
  getApplicationFiles,
  triggerBlobDownload,
} from '@/api/ambassadorApplicationFilesApi'
import { formatDate, formatDateTime } from '@/utils/dateTime'

// ── Design tokens ──────────────────────────────────────────────────────────────

const SCROLL =
  '[scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400'

const MANAGE_ROLES = new Set(['super_admin', 'tech_admin', 'admin', 'hr_manager'])

// ── Status config ──────────────────────────────────────────────────────────────

export const AMBASSADOR_STATUS_CFG: Record<
  AmbassadorStatus,
  { label: string; badge: string; dot: string }
> = {
  new:                  { label: 'جديد',              badge: 'bg-blue-50 text-blue-800 ring-1 ring-blue-200/80',       dot: 'bg-blue-500' },
  under_review:         { label: 'قيد المراجعة',      badge: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80',   dot: 'bg-amber-500' },
  interview_scheduled:  { label: 'مقابلة مجدولة',    badge: 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200/80', dot: 'bg-indigo-500' },
  approved:             { label: 'مقبول',             badge: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80', dot: 'bg-emerald-500' },
  rejected:             { label: 'مرفوض',             badge: 'bg-red-50 text-red-700 ring-1 ring-red-200/80',         dot: 'bg-red-500' },
  waitlisted:           { label: 'قائمة انتظار',     badge: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',  dot: 'bg-slate-500' },
  cancelled:            { label: 'ملغى',              badge: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200/80',  dot: 'bg-slate-400' },
}

const ALL_STATUSES: AmbassadorStatus[] = [
  'new', 'under_review', 'interview_scheduled', 'approved', 'rejected', 'waitlisted', 'cancelled',
]

// ── Helpers ────────────────────────────────────────────────────────────────────

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
    hour: '2-digit', minute: '2-digit', hour12: false, numberingSystem: 'latn',
  }).format(d)
}

function nameToColor(name: string): string {
  const colors = [
    'from-[#0C2A4B] to-[#0077B6]',
    'from-[#0077B6] to-[#1a7aad]',
    'from-[#F28C00] to-[#d4782e]',
    'from-emerald-600 to-teal-600',
    'from-violet-600 to-indigo-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

// ── Primitive components ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AmbassadorStatus }) {
  const cfg = AMBASSADOR_STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${cfg.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden />
      {cfg.label}
    </span>
  )
}

// Prominent, editable status control for the page header — changing the value
// immediately persists via the status-update API and reflects loading state.
function EditableStatusBadge({
  status,
  saving,
  onChange,
  variant = 'light',
}: {
  status: AmbassadorStatus
  saving: boolean
  onChange: (status: AmbassadorStatus) => void
  variant?: 'light' | 'solid'
}) {
  const cfg = AMBASSADOR_STATUS_CFG[status]
  return (
    <div className="relative inline-flex items-center">
      <select
        value={status}
        disabled={saving}
        onChange={(e) => onChange(e.target.value as AmbassadorStatus)}
        dir="rtl"
        aria-label="تغيير حالة الطلب"
        className={`appearance-none rounded-full py-1.5 pl-8 pr-3.5 text-[12px] font-bold outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
          variant === 'light'
            ? 'border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15'
            : `${cfg.badge} hover:brightness-95`
        }`}
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s} className="text-[#0F172A]">
            {AMBASSADOR_STATUS_CFG[s].label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute left-2.5 flex items-center">
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden />
        )}
      </span>
    </div>
  )
}

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
      <div className="flex items-center gap-2.5 border-b border-[#0C2A4B]/[0.05] bg-[#F8FAFC] px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0C2A4B]/[0.06] text-[#0C2A4B]/70">
          {icon}
        </span>
        <h3 className="text-[15px] font-bold tracking-tight text-[#0C2A4B] sm:text-[18px]">{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  )
}

// Reusable yes/no badge for boolean-ish fields — green check for نعم, gray dash for لا.
function YesNoBadge({ value }: { value?: boolean | null }) {
  if (value == null) return <span className="text-[13px] font-medium text-slate-300">—</span>
  return value ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200/70">
      <Check className="h-3 w-3" strokeWidth={3} />
      نعم
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200/70">
      <X className="h-3 w-3" strokeWidth={3} />
      لا
    </span>
  )
}

function FieldRow({
  label,
  value,
  dir: dirProp,
}: {
  label: string
  value?: string | number | boolean | null
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div className="grid grid-cols-[minmax(96px,42%)_1fr] items-center gap-x-3 border-b border-slate-50 py-2 last:border-0 last:pb-0">
      <span className="text-[11px] font-semibold leading-relaxed text-slate-400">{label}</span>
      {typeof value === 'boolean' ? (
        <span dir={dirProp}><YesNoBadge value={value} /></span>
      ) : (
        <span className="text-[14px] font-bold leading-snug text-[#0F172A]">
          {displayValue(value)}
        </span>
      )}
    </div>
  )
}

function ProseBlock({ label, text }: { label?: string; text?: string | null }) {
  return (
    <div>
      {label && <p className="mb-2 text-[10px] font-semibold text-slate-400">{label}</p>}
      {text?.trim() ? (
        <p className="whitespace-pre-wrap text-[13px] font-medium leading-[1.8] text-[#0F172A]/90">
          {text.trim()}
        </p>
      ) : (
        <p className="text-[13px] font-medium text-slate-300">—</p>
      )}
    </div>
  )
}

// Long free-text block with a "عرض المزيد / عرض أقل" toggle once the text is long enough to warrant it.
function ExpandableProse({ label, text }: { label?: string; text?: string | null }) {
  const [expanded, setExpanded] = useState(false)
  if (!text?.trim()) return <ProseBlock label={label} text={text} />
  const trimmed = text.trim()
  const isLong = trimmed.length > 220
  return (
    <div>
      {label && <p className="mb-2 text-[10px] font-semibold text-slate-400">{label}</p>}
      <p
        className={`whitespace-pre-wrap text-[13px] font-medium leading-[1.8] text-[#0F172A]/90 ${
          !expanded && isLong ? 'line-clamp-3' : ''
        }`}
      >
        {trimmed}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-[11px] font-bold text-[#0077B6] transition hover:underline"
        >
          {expanded ? 'عرض أقل' : 'عرض المزيد'}
        </button>
      )}
    </div>
  )
}

function ChipList({
  items,
  accent = 'slate',
}: {
  items?: string[]
  accent?: 'slate' | 'blue' | 'emerald'
}) {
  const styles = {
    slate:   'bg-[#0C2A4B]/[0.05] text-[#0C2A4B]',
    blue:    'bg-[#0077B6]/[0.08] text-[#0C2A4B]',
    emerald: 'bg-emerald-50 text-emerald-800',
  }[accent]

  if (!items?.length) return <p className="text-[13px] font-medium text-slate-300">—</p>
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
  size = 'md',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'neutral' | 'primary' | 'danger' | 'accent' | 'success'
  size?: 'sm' | 'md'
}) {
  const variantStyles = {
    neutral: 'border-[#0C2A4B]/10 bg-white text-[#0C2A4B] hover:border-[#0C2A4B]/20 hover:bg-[#F8FAFC]',
    primary: 'border-[#0C2A4B] bg-[#0C2A4B] text-white hover:bg-[#0077B6] hover:border-[#0077B6]',
    danger:  'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    accent:  'border-[#0077B6]/25 bg-[#0077B6]/[0.06] text-[#0C2A4B] hover:bg-[#0077B6]/10',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  }[variant]

  const sizeStyles = size === 'sm'
    ? 'px-3 py-1.5 text-[10px]'
    : 'px-3.5 py-2 text-[11px]'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${variantStyles} ${sizeStyles}`}
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

// ── Confirm dialog ─────────────────────────────────────────────────────────────

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
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0C2A4B] hover:bg-[#0077B6]'}`}
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

// ── Timeline ───────────────────────────────────────────────────────────────────

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

  if (app.created_at ?? app.submitted_at) {
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

  for (const h of (app.status_history as AmbassadorStatusHistory[] | undefined) ?? []) {
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

  for (const n of (app.notes as AmbassadorNote[] | undefined) ?? []) {
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

function Timeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) {
    return <p className="text-[13px] font-medium text-slate-300">لا توجد أحداث بعد</p>
  }
  return (
    <ol className="space-y-0">
      {items.map((item, idx) => (
        <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
          {idx < items.length - 1 && (
            <div className="absolute right-[13px] top-7 bottom-0 w-px bg-slate-100" aria-hidden />
          )}
          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F8FAFC] ring-1 ring-[#0C2A4B]/[0.08]">
            {item.icon}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[12px] font-bold text-[#0F172A]">{item.title}</p>
            {item.description && (
              <p className="mt-0.5 whitespace-pre-wrap text-[11px] font-medium leading-relaxed text-slate-500">
                {item.description}
              </p>
            )}
            <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-400">
              {item.user && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {item.user}
                </span>
              )}
              {item.date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {item.date}
                  {item.time && ` · ${item.time}`}
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

// ── Notes section ──────────────────────────────────────────────────────────────

function NotesList({
  notes,
  appId,
  onDeleted,
  canDelete,
}: {
  notes: AmbassadorNote[]
  appId: number
  onDeleted: (noteId: number) => void
  canDelete: boolean
}) {
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function handleDelete(noteId: number) {
    setDeletingId(noteId)
    try {
      await deleteAmbassadorNote(appId, noteId)
      toast.success('تم حذف الملاحظة')
      onDeleted(noteId)
    } catch {
      toast.error('تعذّر حذف الملاحظة')
    } finally {
      setDeletingId(null)
    }
  }

  if (!notes.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-8 text-center">
        <MessageSquare className="h-7 w-7 text-slate-200" />
        <p className="text-[12px] font-semibold text-slate-400">لا توجد ملاحظات بعد</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {notes.map((note) => (
        <div
          key={note.id}
          className="rounded-xl border border-[#0C2A4B]/[0.06] bg-[#F8FAFC] p-4"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {note.is_private && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">
                  <Lock className="h-2.5 w-2.5" />
                  خاص
                </span>
              )}
              <span className="text-[10px] font-semibold text-[#0C2A4B]">{note.author}</span>
              {note.created_at && (
                <span className="text-[10px] text-slate-400">
                  · {formatDateTime(note.created_at)}
                </span>
              )}
            </div>
            {canDelete && (
              <button
                type="button"
                onClick={() => void handleDelete(note.id)}
                disabled={deletingId === note.id}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                aria-label="حذف الملاحظة"
              >
                {deletingId === note.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
          <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-[#0F172A]/80">
            {note.content}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AmbassadorApplicationDetailPage() {
  const { id: rawId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const role = String(user?.role ?? '').toLowerCase()
  const canManage = MANAGE_ROLES.has(role)

  const appId = Number(rawId)

  // ── Data state
  const [app, setApp] = useState<AmbassadorApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // ── Admin state
  const [selectedStatus, setSelectedStatus] = useState<AmbassadorStatus>('new')
  const [statusReason, setStatusReason] = useState('')
  const [interviewAt, setInterviewAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const [noteContent, setNoteContent] = useState('')
  const [notePrivate, setNotePrivate] = useState(true)
  const [addingNote, setAddingNote] = useState(false)

  const [downloadingAll, setDownloadingAll] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'reject' | 'approve' | null>(null)

  // ── Load
  // Re-arm the loading state during render when the route id changes (react.dev
  // "adjusting state when a prop changes"), so the effect below never sets state on
  // its synchronous path. `loading` already starts as `true` for the first pass.
  const [seenAppId, setSeenAppId] = useState(appId)
  if (seenAppId !== appId) {
    setSeenAppId(appId)
    if (appId && !isNaN(appId)) {
      setLoading(true)
      setLoadError(null)
    }
  }

  useEffect(() => {
    if (!appId || isNaN(appId)) return
    let alive = true
    void (async () => {
      try {
        const data = await fetchAmbassadorApplication(appId)
        if (!alive) return
        setApp(data)
        setSelectedStatus(data.status)
        setInterviewAt(data.interview_scheduled_at?.slice(0, 16) ?? '')
        setDirty(false)
      } catch {
        if (alive) setLoadError('تعذّر تحميل بيانات الطلب. يرجى المحاولة مرة أخرى.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [appId])

  /** Retry from a button — outside any effect, so flipping to the loading state
   *  synchronously is both allowed and required here. */
  const loadApp = useCallback(async () => {
    if (!appId || isNaN(appId)) return
    setLoading(true)
    setLoadError(null)
    try {
      const data = await fetchAmbassadorApplication(appId)
      setApp(data)
      setSelectedStatus(data.status)
      setInterviewAt(data.interview_scheduled_at?.slice(0, 16) ?? '')
      setDirty(false)
    } catch {
      setLoadError('تعذّر تحميل بيانات الطلب. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }, [appId])

  // ── Derived
  const timeline = useMemo(() => (app ? buildTimeline(app) : []), [app])
  const initials = app?.full_name.trim().charAt(0) ?? '؟'
  const avatarGradient = app ? nameToColor(app.full_name) : 'from-[#0C2A4B] to-[#0077B6]'
  const whatsappUrl = buildWhatsAppUrl(app?.mobile_phone)

  const socialLinks = useMemo(() => [
    { label: 'إنستغرام',     value: app?.social_instagram },
    { label: 'لينكدإن',     value: app?.social_linkedin },
    { label: 'فيسبوك',      value: app?.social_facebook },
    { label: 'تيك توك',     value: app?.social_tiktok },
    { label: 'GitHub',       value: app?.social_github },
    { label: 'الموقع',       value: app?.website_url },
  ].filter((s) => s.value?.trim()), [app])

  // ── Admin actions
  async function persistStatus(
    status: AmbassadorStatus,
    reason?: string,
    interview?: string,
  ) {
    if (!app) return
    setSaving(true)
    try {
      const updated = await promiseToast(
        updateAmbassadorStatus(app.id, status, reason, undefined, interview),
        { loading: 'جاري الحفظ...', success: 'تم حفظ التغييرات', error: 'تعذّر الحفظ.' },
      )
      setApp(updated)
      setSelectedStatus(status)
      setDirty(false)
    } catch { /* toast */ } finally {
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
    await persistStatus(status, statusReason || undefined,
      status === 'interview_scheduled' ? interviewAt || undefined : undefined)
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!app || !noteContent.trim()) return
    setAddingNote(true)
    try {
      await promiseToast(addAmbassadorNote(app.id, noteContent.trim(), notePrivate), {
        loading: 'جاري الحفظ...', success: 'تمت إضافة الملاحظة', error: 'تعذّر إضافة الملاحظة.',
      })
      setNoteContent('')
      const fresh = await fetchAmbassadorApplication(app.id)
      setApp(fresh)
    } catch { /* toast */ } finally {
      setAddingNote(false)
    }
  }

  function handleNoteDeleted(noteId: number) {
    if (!app) return
    setApp({ ...app, notes: (app.notes ?? []).filter((n) => n.id !== noteId) })
  }

  async function copyEmail() {
    if (!app) return
    try {
      await navigator.clipboard.writeText(app.email)
      toast.success('تم نسخ البريد الإلكتروني')
    } catch {
      toast.error('تعذّر النسخ')
    }
  }

  async function downloadAllFiles() {
    if (!app) return
    setDownloadingAll(true)
    try {
      const files = await getApplicationFiles(app.id)
      if (!files.length) { toast.error('لا توجد ملفات للتحميل'); return }
      for (const file of files) {
        try {
          const { blob, filename } = await fetchAmbassadorFileBlob(app.id, file.id, 'download')
          triggerBlobDownload(blob, filename || file.original_name)
        } catch { toast.error(`تعذّر تحميل: ${file.original_name}`) }
      }
      toast.success('تم بدء تحميل الملفات')
    } catch {
      toast.error('تعذّر تحميل الملفات')
    } finally {
      setDownloadingAll(false)
    }
  }

  function goBack() {
    navigate(-1)
  }

  // ── Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4 pb-16" dir="rtl">
        <div className="h-36 animate-pulse rounded-3xl bg-slate-100" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={String(i)} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error state
  if (loadError ?? !app) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-rose-100 bg-white py-24 text-center" dir="rtl">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50">
          <FileText className="h-8 w-8 text-rose-300" />
        </div>
        <p className="font-bold text-[#0C2A4B]">{loadError ?? 'الطلب غير موجود'}</p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => void loadApp()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0C2A4B] px-5 py-2.5 text-[12px] font-bold text-white"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-[12px] font-bold text-[#0C2A4B]"
          >
            <ArrowRight className="h-4 w-4" />
            عودة
          </button>
        </div>
      </div>
    )
  }

  // ── Main render
  return (
    <div className="pb-16 font-[Cairo,sans-serif]" dir="rtl">

      {/* ── Sticky page header ────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 mb-5 -mx-4 border-b border-[#0C2A4B]/[0.06] bg-white/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#0C2A4B]/10 text-slate-500 transition hover:border-[#0C2A4B]/20 hover:text-[#0C2A4B]"
            aria-label="رجوع"
          >
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-bl ${avatarGradient} text-[14px] font-bold text-white`}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[15px] font-bold text-[#0F172A]">{app.full_name}</h1>
                {canManage ? (
                  <EditableStatusBadge
                    status={app.status}
                    saving={saving}
                    onChange={(s) => void persistStatus(s)}
                    variant="solid"
                  />
                ) : (
                  <StatusBadge status={app.status} />
                )}
              </div>
              <p className="text-[11px] font-medium text-slate-400" dir="ltr">{app.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <ActionBtn size="sm" variant="neutral" onClick={() => void copyEmail()}>
              <Copy className="h-3.5 w-3.5" />
              نسخ البريد
            </ActionBtn>
            <ActionBtn
              size="sm"
              variant="neutral"
              disabled={downloadingAll}
              onClick={() => void downloadAllFiles()}
            >
              {downloadingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 text-[#0077B6]" />
              )}
              تحميل الملفات
            </ActionBtn>
            <ActionBtn size="sm" variant="neutral" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              طباعة
            </ActionBtn>
            <button
              type="button"
              onClick={() => void loadApp()}
              disabled={loading}
              className="flex h-7 w-7 items-center justify-center rounded-xl border border-[#0C2A4B]/10 text-slate-400 transition hover:border-[#0C2A4B]/20 hover:text-[#0C2A4B] disabled:opacity-40"
              aria-label="تحديث"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Hero card ────────────────────────────────────────────────── */}
      <div className="relative mb-6 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#0C2A4B] via-[#1a2a3a] to-[#0077B6] p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-12 right-24 h-48 w-48 rounded-full bg-[#F28C00]/[0.10]" />
        <div className="pointer-events-none absolute -left-8 top-8 h-32 w-32 rounded-full bg-[#0077B6]/20" />

        <div className="relative flex flex-wrap items-start gap-5">
          {/* Avatar */}
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-bl ${avatarGradient} text-[22px] font-bold text-white shadow-lg ring-2 ring-white/20 sm:h-20 sm:w-20 sm:text-[26px]`}
          >
            {initials}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2.5">
              <h2 className="text-[20px] font-black text-white sm:text-[24px]">{app.full_name}</h2>
              {canManage ? (
                <EditableStatusBadge
                  status={app.status}
                  saving={saving}
                  onChange={(s) => void persistStatus(s)}
                  variant="light"
                />
              ) : (
                <StatusBadge status={app.status} />
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-semibold text-white/70">
              <span dir="ltr" className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 opacity-60" />
                {app.email}
              </span>
              {app.mobile_phone && (
                <span dir="ltr" className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 opacity-60" />
                  {app.mobile_phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 opacity-60" />
                <span dir="ltr">{refNumber(app)}</span>
              </span>
              {app.created_at && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 opacity-60" />
                  {formatDate(app.created_at)}
                </span>
              )}
            </div>

            {/* Quick actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.open(`mailto:${app.email}`, '_self')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-[11px] font-bold text-white/90 backdrop-blur-sm transition hover:bg-white/20"
              >
                <Mail className="h-3.5 w-3.5" />
                إرسال بريد
              </button>
              {app.mobile_phone && (
                <button
                  type="button"
                  onClick={() => window.open(`tel:${app.mobile_phone}`, '_self')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-[11px] font-bold text-white/90 backdrop-blur-sm transition hover:bg-white/20"
                >
                  <Phone className="h-3.5 w-3.5" />
                  اتصال
                </button>
              )}
              {whatsappUrl && (
                <button
                  type="button"
                  onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-[11px] font-bold text-white/90 backdrop-blur-sm transition hover:bg-white/20"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-300" />
                  واتساب
                </button>
              )}
              {canManage && (
                <>
                  <button
                    type="button"
                    disabled={saving || app.status === 'approved'}
                    onClick={() => setConfirmAction('approve')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-3.5 py-2 text-[11px] font-bold text-emerald-200 backdrop-blur-sm transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    قبول
                  </button>
                  <button
                    type="button"
                    disabled={saving || app.status === 'rejected'}
                    onClick={() => setConfirmAction('reject')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-400/50 bg-red-500/20 px-3.5 py-2 text-[11px] font-bold text-red-200 backdrop-blur-sm transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    رفض
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content grid: packed two-column, full-width only for long content ── */}
      <div className="grid gap-3.5 md:grid-cols-2">

        {/* A. المعلومات الشخصية */}
        <SectionCard title="المعلومات الشخصية" icon={<User className="h-3.5 w-3.5" />}>
          <div className="grid gap-0 sm:grid-cols-2 sm:gap-x-6">
            <FieldRow label="الاسم الكامل" value={app.full_name} />
            <FieldRow label="الجنس" value={genderLabel(app.gender)} />
            <FieldRow label="تاريخ الميلاد" value={app.date_of_birth ? formatDate(app.date_of_birth) : null} />
            <FieldRow label="الجنسية" value={app.nationality} />
            <FieldRow label="الدولة" value={app.country} />
            <FieldRow label="المدينة" value={app.city} />
          </div>
        </SectionCard>

        {/* C. المعلومات الأكاديمية */}
        <SectionCard title="المعلومات الأكاديمية" icon={<GraduationCap className="h-3.5 w-3.5" />}>
          <div className="grid gap-0 sm:grid-cols-2 sm:gap-x-6">
            <FieldRow label="الجامعة" value={app.university_name} />
            <FieldRow label="نوع الجامعة" value={app.university_type} />
            <FieldRow label="الكلية" value={app.faculty} />
            <FieldRow label="التخصص" value={app.major} />
            <FieldRow label="السنة الدراسية" value={app.study_year} />
            <FieldRow label="الرقم الجامعي" value={app.student_number} dir="ltr" />
            <FieldRow label="حالة الطالب" value={app.student_status} />
            <FieldRow label="التخرج المتوقع" value={app.expected_graduation_date ? formatDate(app.expected_graduation_date) : null} />
          </div>
        </SectionCard>

        {/* B. معلومات التواصل */}
        <SectionCard title="معلومات التواصل" icon={<Phone className="h-3.5 w-3.5" />}>
          <div className="grid gap-0 sm:grid-cols-2 sm:gap-x-6">
            <FieldRow label="البريد الإلكتروني" value={app.email} dir="ltr" />
            <FieldRow label="الجوال" value={app.mobile_phone} dir="ltr" />
            {socialLinks.map((s) => (
              <FieldRow key={s.label} label={s.label} value={s.value} dir="ltr" />
            ))}
            {app.followers_count != null && (
              <FieldRow label="عدد المتابعين" value={app.followers_count} />
            )}
          </div>
        </SectionCard>

        {/* G. الاستعداد والتوافر */}
        <SectionCard title="الاستعداد والتوافر" icon={<Briefcase className="h-3.5 w-3.5" />}>
          <div className="grid gap-0 sm:grid-cols-2 sm:gap-x-6">
            <FieldRow label="ساعات أسبوعية" value={app.weekly_hours_available ?? null} />
            <FieldRow label="حضور فعاليات الجامعة" value={app.can_attend_university_events} />
            <FieldRow label="تمثيل EMC خارجياً" value={app.can_represent_emc_outside} />
            <FieldRow label="إمكانية السفر" value={app.can_travel} />
            <FieldRow label="حاسب محمول" value={app.owns_laptop} />
            <FieldRow label="إنترنت مستقر" value={app.has_stable_internet} />
            <FieldRow label="الاجتماعات الأسبوعية" value={app.can_attend_weekly_meetings} />
          </div>
        </SectionCard>

        {/* F. القيادة والخبرة */}
        <SectionCard title="القيادة والخبرة" icon={<UserCheck className="h-3.5 w-3.5" />}>
          <div className="grid gap-0 sm:grid-cols-2 sm:gap-x-6">
            <FieldRow label="قيادة فريق" value={app.has_led_team} />
            <FieldRow label="تنظيم فعاليات" value={app.has_organized_events} />
            <FieldRow label="أكبر حضور" value={app.events_attendees_count} />
            <FieldRow label="تمثيل الجامعة" value={app.has_represented_university} />
            <FieldRow label="خبرة تطوعية" value={app.has_volunteer_experience} />
            <FieldRow label="خبرة ورش عمل / تدريس" value={app.has_teaching_experience} />
            <FieldRow label="أندية طلابية" value={app.has_student_club_involvement} />
            <FieldRow label="تنظيم فعاليات خارجية" value={app.has_event_organization_experience} />
          </div>
          {app.volunteer_experience_types?.length ? (
            <div className="mt-3 border-t border-slate-50 pt-3">
              <p className="mb-2 text-[10px] font-semibold text-slate-400">أنواع التطوع</p>
              <ChipList items={app.volunteer_experience_types} />
            </div>
          ) : null}
        </SectionCard>

        {/* E. المهارات والاهتمامات */}
        <SectionCard title="المهارات والاهتمامات" icon={<Sparkles className="h-3.5 w-3.5" />}>
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-[10px] font-semibold text-slate-400">المهارات</p>
              <ChipList items={app.skills} accent="blue" />
            </div>
            <div className="border-t border-slate-50 pt-3">
              <p className="mb-2 text-[10px] font-semibold text-slate-400">الاهتمامات</p>
              <ChipList items={app.interests} />
            </div>
            <div className="border-t border-slate-50 pt-3">
              <p className="mb-2 text-[10px] font-semibold text-slate-400">الشهادات</p>
              <ChipList items={app.certifications} accent="emerald" />
            </div>
          </div>
        </SectionCard>

        {/* بيانات الطلب */}
        <SectionCard title="بيانات الطلب" icon={<FileText className="h-3.5 w-3.5" />}>
          <div className="grid gap-0 sm:grid-cols-2 sm:gap-x-6">
            <FieldRow label="معرّف الطلب" value={app.id} dir="ltr" />
            <FieldRow label="رقم المرجع" value={refNumber(app)} dir="ltr" />
            <FieldRow label="الحالة" value={AMBASSADOR_STATUS_LABELS[app.status]} />
            <FieldRow label="تاريخ التقديم" value={app.submitted_at ? formatDate(app.submitted_at) : null} />
            <FieldRow label="تاريخ الإنشاء" value={app.created_at ? formatDate(app.created_at) : null} />
            <FieldRow label="آخر تحديث" value={app.updated_at ? formatDate(app.updated_at) : null} />
            <FieldRow label="المصدر" value={app.source} />
            <FieldRow label="المراجع" value={app.reviewed_by?.name} />
            <FieldRow label="مسودة" value={app.is_draft} />
          </div>
        </SectionCard>

        {/* K. إجراءات المشرف */}
        {canManage && (
          <SectionCard title="إجراءات المشرف" icon={<UserCheck className="h-3.5 w-3.5" />}>
            <div className="space-y-3">
              <div>
                <label htmlFor="amb-status-select" className="mb-1.5 block text-[10px] font-semibold text-slate-400">
                  حالة الطلب
                </label>
                <div className="relative">
                  <select
                    id="amb-status-select"
                    value={selectedStatus}
                    onChange={(e) => { setSelectedStatus(e.target.value as AmbassadorStatus); setDirty(true) }}
                    dir="rtl"
                    className="h-11 w-full appearance-none rounded-xl border border-[#0C2A4B]/10 bg-white pl-9 pr-3.5 text-[13px] font-bold text-[#0F172A] outline-none transition focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{AMBASSADOR_STATUS_CFG[s].label}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                    <span className={`inline-block h-2 w-2 rounded-full ${AMBASSADOR_STATUS_CFG[selectedStatus].dot}`} />
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </span>
                </div>
              </div>

              {selectedStatus === 'interview_scheduled' && (
                <div>
                  <label htmlFor="amb-interview-at" className="mb-1.5 block text-[10px] font-semibold text-slate-400">
                    موعد المقابلة
                  </label>
                  <input
                    id="amb-interview-at"
                    type="datetime-local"
                    value={interviewAt}
                    onChange={(e) => { setInterviewAt(e.target.value); setDirty(true) }}
                    className="h-11 w-full rounded-xl border border-[#0C2A4B]/10 bg-white px-3.5 text-[13px] font-bold text-[#0F172A] outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
                  />
                </div>
              )}

              <div>
                <label htmlFor="amb-reason" className="mb-1.5 block text-[10px] font-semibold text-slate-400">
                  ملاحظة القرار (اختياري)
                </label>
                <textarea
                  id="amb-reason"
                  value={statusReason}
                  onChange={(e) => { setStatusReason(e.target.value); setDirty(true) }}
                  placeholder="سبب تغيير الحالة..."
                  rows={2}
                  className="w-full resize-none rounded-xl border border-[#0C2A4B]/10 bg-white px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <ActionBtn size="sm" variant="accent" disabled={saving} onClick={() => void quickStatus('waitlisted')}>
                  قائمة انتظار
                </ActionBtn>
                <ActionBtn size="sm" variant="accent" disabled={saving} onClick={() => void quickStatus('under_review')}>
                  قيد المراجعة
                </ActionBtn>
                <ActionBtn size="sm" variant="neutral" disabled={saving} onClick={() => void quickStatus('interview_scheduled')}>
                  <Video className="h-3.5 w-3.5 text-[#0077B6]" />
                  جدولة مقابلة
                </ActionBtn>
              </div>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!dirty || saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F28C00] px-5 py-2.5 text-[12px] font-bold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                حفظ التغييرات
              </button>
            </div>
          </SectionCard>
        )}

        {/* D. دوافع الترشح — long free-text, full width, collapsible */}
        <SectionCard title="دوافع الترشح" icon={<HeartHandshake className="h-3.5 w-3.5" />} className="md:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <ExpandableProse label="لماذا يريد الانضمام؟" text={app.motivation_why} />
            <ExpandableProse label="ما الذي سيضيفه؟" text={app.contribution_what} />
            <ExpandableProse label="ماذا يتوقع اكتسابه؟" text={app.expected_gain} />
            <ExpandableProse label="أكبر إنجاز" text={app.biggest_achievement} />
            <ExpandableProse label="أكبر تحدٍ" text={app.biggest_challenge} />
          </div>
        </SectionCard>

        {/* H. المرفقات والملفات — full width */}
        <SectionCard title="المرفقات والملفات" icon={<FileText className="h-3.5 w-3.5" />} className="md:col-span-2">
          <AmbassadorApplicationFiles
            applicationId={app.id}
            embedded
            canDelete={canManage}
          />
        </SectionCard>

        {/* I. ملاحظات داخلية — full width */}
        <SectionCard title="ملاحظات داخلية" icon={<MessageSquare className="h-3.5 w-3.5" />} className="md:col-span-2">
          <div className="space-y-4">
            {canManage && (
              <form onSubmit={(e) => void handleAddNote(e)} className="space-y-3">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="اكتب ملاحظة داخلية..."
                  rows={3}
                  className={`w-full resize-none rounded-xl border bg-white px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-[#0077B6]/15 border-[#0C2A4B]/10 focus:border-[#0077B6] ${SCROLL}`}
                />
                <div className="flex items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <input
                      type="checkbox"
                      checked={notePrivate}
                      onChange={(e) => setNotePrivate(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0077B6]"
                    />
                    <Lock className="h-3 w-3" />
                    ملاحظة خاصة
                  </label>
                  <button
                    type="submit"
                    disabled={!noteContent.trim() || addingNote}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#F28C00] px-4 py-2 text-[11px] font-bold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {addingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    إضافة ملاحظة
                  </button>
                </div>
              </form>
            )}
            <NotesList
              notes={app.notes ?? []}
              appId={app.id}
              onDeleted={handleNoteDeleted}
              canDelete={canManage}
            />
          </div>
        </SectionCard>

        {/* J. سجل الأحداث — full width */}
        <SectionCard title="سجل الأحداث" icon={<Clock className="h-3.5 w-3.5" />} className="md:col-span-2">
          <Timeline items={timeline} />
        </SectionCard>
      </div>

      {/* ── Confirm dialogs ───────────────────────────────────────────── */}
      {confirmAction === 'approve' && (
        <ConfirmDialog
          title="قبول الطلب"
          message={`هل أنت متأكد من قبول طلب ${app.full_name}؟`}
          confirmLabel="قبول"
          onConfirm={() => { setConfirmAction(null); void quickStatus('approved') }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'reject' && (
        <ConfirmDialog
          title="رفض الطلب"
          message={`هل أنت متأكد من رفض طلب ${app.full_name}؟`}
          confirmLabel="رفض"
          danger
          onConfirm={() => { setConfirmAction(null); void quickStatus('rejected') }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
