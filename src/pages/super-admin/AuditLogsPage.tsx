import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Clock,
  Globe,
  Loader2,
  Monitor,
  RefreshCw,
  Search,
  Shield,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { fetchAdminAuditLogs, type AdminAuditLogQuery } from '@/api/adminAuditLogsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import type { AdminAuditLogEntry } from '@/types/adminAudit'
import { CrudDrawer } from '@/pages/super-admin/crud/shared/CrudDrawer'

/* ─────────────────────────────────────────────────────────────────────────
   Constants — identical to original (preserved for API compatibility)
───────────────────────────────────────────────────────────────────────── */

const ACTION_FILTER = [
  { value: 'all',           labelAr: 'كل العمليات' },
  { value: 'CREATE',        labelAr: 'إنشاء' },
  { value: 'UPDATE',        labelAr: 'تعديل' },
  { value: 'DELETE',        labelAr: 'حذف' },
  { value: 'LOGIN',         labelAr: 'تسجيل دخول' },
  { value: 'LOGOUT',        labelAr: 'تسجيل خروج' },
  { value: 'ENROLL',        labelAr: 'تسجيل طالب' },
  { value: 'APPROVE',       labelAr: 'موافقة' },
  { value: 'REJECT',        labelAr: 'رفض' },
  { value: 'PUBLISH',       labelAr: 'نشر' },
  { value: 'UNPUBLISH',     labelAr: 'إلغاء النشر' },
  { value: 'EXPORT',        labelAr: 'تصدير' },
  { value: 'IMPORT',        labelAr: 'استيراد' },
  { value: 'DOWNLOAD',      labelAr: 'تنزيل' },
  { value: 'status_changed', labelAr: 'تغيير حالة' },
  { value: 'role_changed',   labelAr: 'تغيير دور' },
] as const

/* ── Badge + card accent themes ─────────────────────────────────────── */

type BadgeTheme = keyof typeof BADGE_THEME

const BADGE_THEME = {
  create:   'border-emerald-200 bg-emerald-50 text-emerald-900 ring-emerald-100',
  update:   'border-blue-200 bg-blue-50 text-blue-900 ring-blue-100',
  delete:   'border-red-200 bg-red-50 text-red-900 ring-red-100',
  status:   'border-amber-200 bg-amber-50 text-amber-950 ring-amber-100',
  role:     'border-violet-200 bg-violet-50 text-violet-950 ring-violet-100',
  approve:  'border-teal-200 bg-teal-50 text-teal-950 ring-teal-100',
  reject:   'border-rose-200 bg-rose-50 text-rose-950 ring-rose-100',
  login:    'border-green-200 bg-green-50 text-green-900 ring-green-100',
  logout:   'border-slate-200 bg-slate-50 text-slate-700 ring-slate-100',
  enroll:   'border-cyan-200 bg-cyan-50 text-cyan-900 ring-cyan-100',
  publish:  'border-emerald-200 bg-emerald-50 text-emerald-900 ring-emerald-100',
  unpublish:'border-orange-200 bg-orange-50 text-orange-900 ring-orange-100',
  export:   'border-purple-200 bg-purple-50 text-purple-900 ring-purple-100',
  download: 'border-sky-200 bg-sky-50 text-sky-900 ring-sky-100',
  neutral:  'border-slate-200 bg-slate-50 text-slate-800 ring-slate-100',
} as const

/* Card right-border accent: DELETE=red, UPDATE=blue, CREATE=orange, LOGIN=green */
const CARD_BORDER: Record<BadgeTheme, string> = {
  create:   'border-r-orange-400',
  update:   'border-r-blue-500',
  delete:   'border-r-red-500',
  login:    'border-r-green-500',
  logout:   'border-r-slate-300',
  approve:  'border-r-teal-500',
  reject:   'border-r-rose-500',
  status:   'border-r-amber-400',
  role:     'border-r-violet-500',
  enroll:   'border-r-cyan-500',
  publish:  'border-r-emerald-500',
  unpublish:'border-r-orange-400',
  export:   'border-r-purple-500',
  download: 'border-r-sky-500',
  neutral:  'border-r-slate-300',
}

/* ── Action resolution — identical to original ───────────────────── */

function resolveActionBadge(entry: AdminAuditLogEntry): { labelAr: string; theme: BadgeTheme } {
  if (entry.action_label) {
    const colorToTheme: Record<string, BadgeTheme> = {
      blue: 'create', amber: 'update', red: 'delete',
      green: 'login', gray: 'logout', cyan: 'enroll',
      teal: 'approve', rose: 'reject', emerald: 'publish',
      orange: 'unpublish', purple: 'export', indigo: 'export',
      sky: 'download',
    }
    const theme = entry.action_color ? (colorToTheme[entry.action_color] ?? 'neutral') : 'neutral'
    return { labelAr: entry.action_label, theme }
  }

  const raw = `${entry.action}`.toUpperCase()
  const ACTION_MAP: Record<string, { label: string; theme: BadgeTheme }> = {
    CREATE:              { label: 'إنشاء',          theme: 'create'    },
    CREATED:             { label: 'إنشاء',          theme: 'create'    },
    UPDATE:              { label: 'تعديل',           theme: 'update'    },
    UPDATED:             { label: 'تعديل',           theme: 'update'    },
    DELETE:              { label: 'حذف',             theme: 'delete'    },
    DELETED:             { label: 'حذف',             theme: 'delete'    },
    LOGIN:               { label: 'تسجيل دخول',     theme: 'login'     },
    LOGIN_FAILED:        { label: 'فشل الدخول',     theme: 'reject'    },
    LOGOUT:              { label: 'تسجيل خروج',     theme: 'logout'    },
    ENROLL:              { label: 'تسجيل',           theme: 'enroll'    },
    APPROVE:             { label: 'موافقة',           theme: 'approve'   },
    APPROVED:            { label: 'موافقة',           theme: 'approve'   },
    REJECT:              { label: 'رفض',             theme: 'reject'    },
    REJECTED:            { label: 'رفض',             theme: 'reject'    },
    PUBLISH:             { label: 'نشر',              theme: 'publish'   },
    UNPUBLISH:           { label: 'إلغاء النشر',     theme: 'unpublish' },
    EXPORT:              { label: 'تصدير',            theme: 'export'    },
    IMPORT:              { label: 'استيراد',          theme: 'export'    },
    DOWNLOAD:            { label: 'تنزيل',            theme: 'download'  },
    STATUS_CHANGED:      { label: 'تغيير الحالة',   theme: 'status'    },
    ROLE_CHANGED:        { label: 'تغيير الدور',    theme: 'role'      },
    RESTORED:            { label: 'استعادة',         theme: 'create'    },
    STUDENT_ENROLLED:    { label: 'تسجيل طالب',    theme: 'enroll'    },
    STUDENT_UNENROLLED:  { label: 'إلغاء تسجيل',   theme: 'unpublish' },
  }
  const found = ACTION_MAP[raw]
  if (found) return { labelAr: found.label, theme: found.theme }
  const pretty = `${entry.action}`.replace(/[_-]+/g, ' ')
  return { labelAr: pretty || 'حدث غير مصنَّف', theme: 'neutral' }
}

/* ── Field labels — identical to original ──────────────────────────── */

const FIELD_LABELS: Record<string, string> = {
  title:               'العنوان',
  name:                'الاسم',
  name_ar:             'الاسم (عربي)',
  name_en:             'الاسم (إنجليزي)',
  status:              'الحالة',
  price:               'السعر',
  email:               'البريد الإلكتروني',
  role:                'الدور',
  description:         'الوصف',
  short_description:   'الوصف المختصر',
  start_date:          'تاريخ البداية',
  end_date:            'تاريخ النهاية',
  start_time:          'وقت البداية',
  end_time:            'وقت النهاية',
  is_active:           'نشط',
  is_free:             'مجاني',
  is_online:           'أونلاين',
  instructor_id:       'المدرب',
  department_id:       'القسم',
  phone:               'الهاتف',
  type:                'النوع',
  level:               'المستوى',
  language:            'اللغة',
  capacity:            'السعة',
  location:            'الموقع',
  slug:                'الرابط',
  duration:            'المدة',
  training_hours:      'الساعات التدريبية',
  registration_open:   'التسجيل مفتوح',
  registration_status: 'حالة التسجيل',
  certificate:         'شهادة',
  program_type:        'نوع البرنامج',
  session_format:      'صيغة الجلسة',
  track_id:            'المسار',
  workflow_status:     'حالة سير العمل',
  current_step:        'الخطوة الحالية',
  current_department:  'القسم الحالي',
  selected_date_option:'الخيار الزمني',
  score:               'الدرجة',
  passed:              'ناجح',
  admin_notes:         'ملاحظات المشرف',
  notes:               'الملاحظات',
  reviewed_by:         'راجعه',
  reviewed_at:         'تاريخ المراجعة',
}

const TIMESTAMP_SKIP = new Set(['updated_at', 'created_at', 'deleted_at', 'remember_token'])

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ')
}

function renderValue(v: unknown): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا'
  if (typeof v === 'object') {
    try { return JSON.stringify(v, null, 2) } catch { return String(v) }
  }
  return String(v)
}

/* ─────────────────────────────────────────────────────────────────────────
   Date / time — FIXED: English digits, 24 h, no AM/PM
───────────────────────────────────────────────────────────────────────── */

function fmtDate(iso: string): string {
  if (!iso || iso === '—') return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  // → "30 Jun 2026"
}

function fmtTime24(iso: string): string {
  if (!iso || iso === '—') return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  // → "15:47:30"
}

function actorDisplay(name: string): string {
  return !name || name.trim() === '—' ? 'غير معروف' : name
}

/* ─────────────────────────────────────────────────────────────────────────
   Changes diff table — identical logic to original
───────────────────────────────────────────────────────────────────────── */

function ChangesDiffTable({ entry }: { entry: AdminAuditLogEntry }) {
  const { action, changed_fields, old_values, new_values } = entry
  const upper = action.toUpperCase()
  const isCreate = upper === 'CREATE' || upper === 'CREATED'
  const isDelete = upper === 'DELETE' || upper === 'DELETED'

  if (isCreate) {
    const vals = new_values as Record<string, unknown> | null
    if (!vals || Object.keys(vals).length === 0) {
      return (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-[12px] font-semibold text-emerald-800">
          تم إنشاء السجل
        </div>
      )
    }
    const entries = Object.entries(vals).filter(([k]) => !TIMESTAMP_SKIP.has(k))
    return (
      <div className="space-y-1">
        <p className="mb-2 text-[11px] font-black text-emerald-700">✦ تم إنشاء السجل بالقيم التالية</p>
        <table className="w-full text-right text-[11px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="w-1/3 py-1.5 pe-3 font-black text-slate-500">الحقل</th>
              <th className="py-1.5 font-black text-emerald-700">القيمة</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([k, v]) => (
              <tr key={k} className="border-b border-slate-50">
                <td className="py-1.5 pe-3 font-bold text-slate-600">{fieldLabel(k)}</td>
                <td className="py-1.5">
                  <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[11px] text-emerald-900">{renderValue(v)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (isDelete) {
    const vals = old_values as Record<string, unknown> | null
    if (!vals || Object.keys(vals).length === 0) {
      return (
        <div className="rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 text-[12px] font-semibold text-red-800">
          تم حذف السجل
        </div>
      )
    }
    const entries = Object.entries(vals).filter(([k]) => !TIMESTAMP_SKIP.has(k))
    return (
      <div className="space-y-1">
        <p className="mb-2 text-[11px] font-black text-red-700">✕ تم حذف السجل — بيانات ما قبل الحذف</p>
        <table className="w-full text-right text-[11px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="w-1/3 py-1.5 pe-3 font-black text-slate-500">الحقل</th>
              <th className="py-1.5 font-black text-red-700">القيمة المحذوفة</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([k, v]) => (
              <tr key={k} className="border-b border-slate-50">
                <td className="py-1.5 pe-3 font-bold text-slate-600">{fieldLabel(k)}</td>
                <td className="py-1.5">
                  <span className="inline-block rounded-md bg-red-100 px-2 py-0.5 font-mono text-[11px] text-red-900">{renderValue(v)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const oldObj = old_values as Record<string, unknown> | null
  const newObj = new_values as Record<string, unknown> | null
  let fields: string[] = []
  if (changed_fields && changed_fields.length > 0) {
    fields = changed_fields.filter((k) => !TIMESTAMP_SKIP.has(k))
  } else if (oldObj || newObj) {
    const allKeys = new Set([...Object.keys(oldObj ?? {}), ...Object.keys(newObj ?? {})])
    fields = [...allKeys].filter((k) => !TIMESTAMP_SKIP.has(k))
  }

  if (fields.length === 0) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[12px] font-semibold text-slate-600">
        لا توجد تفاصيل تغييرات محفوظة
      </div>
    )
  }

  return (
    <table className="w-full text-right text-[11px]">
      <thead>
        <tr className="border-b border-slate-100">
          <th className="w-1/4 py-1.5 pe-3 font-black text-slate-500">الحقل</th>
          <th className="w-[37.5%] py-1.5 pe-3 font-black text-red-700">قبل</th>
          <th className="w-[37.5%] py-1.5 font-black text-emerald-700">بعد</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((key) => (
          <tr key={key} className="border-b border-slate-50 last:border-0">
            <td className="py-2 pe-3 font-bold text-slate-700">{fieldLabel(key)}</td>
            <td className="py-2 pe-3">
              <span className="inline-block max-w-[140px] truncate rounded-md bg-red-50 px-2 py-0.5 font-mono text-[11px] text-red-800 ring-1 ring-red-200">
                {renderValue((oldObj as Record<string, unknown> | null)?.[key])}
              </span>
            </td>
            <td className="py-2">
              <span className="inline-block max-w-[140px] truncate rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[11px] text-emerald-800 ring-1 ring-emerald-200">
                {renderValue((newObj as Record<string, unknown> | null)?.[key])}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ── Changes accordion ───────────────────────────────────────────────── */

function ChangesAccordion({ entry }: { entry: AdminAuditLogEntry }) {
  const [open, setOpen] = useState(false)
  const hasData =
    (entry.changed_fields && entry.changed_fields.length > 0) ||
    entry.old_values != null ||
    entry.new_values != null

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-right transition hover:bg-slate-50"
      >
        <span className="flex items-center gap-2 text-[12px] font-black text-ink-500">
          <ClipboardList className="h-4 w-4 text-brand-500" aria-hidden />
          تفاصيل التغييرات
          {hasData && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-black text-brand-600">
              {entry.changed_fields?.length ?? '—'}
            </span>
          )}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-slate-400">
          <ChevronDown className="h-4 w-4" aria-hidden />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-slate-100"
          >
            <div className="p-4">
              <ChangesDiffTable entry={entry} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   KPI Card
───────────────────────────────────────────────────────────────────────── */

function KpiCard({
  label, value, icon: Icon, iconBg, iconColor,
}: {
  label: string; value: number; icon: ElementType; iconBg: string; iconColor: string
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-emc-xs ring-1 ring-slate-200/80 transition-shadow duration-200 hover:shadow-emc-sm">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={17} className={iconColor} />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-500">{label}</p>
      <p className="mt-1.5 font-latin text-[28px] font-black leading-none text-ink-500">
        {value.toLocaleString('en-US')}
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Shimmer skeleton
───────────────────────────────────────────────────────────────────────── */

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-100 ${className ?? ''}`}>
      <div className="absolute inset-0 animate-shimmer bg-emc-shimmer bg-[length:200%_100%]" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────────────────── */

export default function SuperAdminAuditLogsPage() {
  /* ── State ─────────────────────────────────────────────────────────── */
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<AdminAuditLogEntry[]>([])

  /* filters */
  const [action, setAction] = useState<string>('all')
  const [actor, setActor] = useState('')
  const [actorRole, setActorRole] = useState('')
  const [entityType, setEntityType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [q, setQ] = useState('')

  /* UI state */
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drawerEntry, setDrawerEntry] = useState<AdminAuditLogEntry | null>(null)

  /* ── Load — unchanged ──────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const query: AdminAuditLogQuery = {
      action:      action === 'all' ? undefined : action,
      search:      actor.trim() || undefined,
      role:        actorRole.trim() || undefined,
      entity_type: entityType.trim() || undefined,
      date_from:   fromDate.trim() || undefined,
      date_to:     toDate.trim() || undefined,
    }
    try {
      const rows = await fetchAdminAuditLogs(query)
      setEntries(rows)
    } catch (e) {
      setEntries([])
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [action, actor, actorRole, entityType, fromDate, toDate])

  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Client-side search — unchanged ──────────────────────────────── */
  const fuzzyFiltered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return entries
    return entries.filter((e) => {
      const blob =
        `${e.actor_name} ${e.actor_role} ${e.action} ${e.entity_type} ${e.entity_label} ${e.description ?? ''}`.toLowerCase()
      return blob.includes(t)
    })
  }, [entries, q])

  /* ── KPI stats derived from loaded data ───────────────────────────── */
  const stats = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7))
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const actors = new Set(entries.map((e) => e.actor_name).filter((n) => n && n !== '—'))
    return {
      total:     entries.length,
      users:     actors.size,
      thisMonth: entries.filter((e) => new Date(e.created_at) >= monthStart).length,
      thisWeek:  entries.filter((e) => new Date(e.created_at) >= weekStart).length,
      today:     entries.filter((e) => new Date(e.created_at) >= todayStart).length,
    }
  }, [entries])

  function resetFilters() {
    setActor('')
    setActorRole('')
    setEntityType('')
    setAction('all')
    setFromDate('')
    setToDate('')
    setQ('')
  }

  const hasActiveFilters = !!(actor || actorRole || entityType || action !== 'all' || fromDate || toDate || q)

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div dir="rtl" className="min-h-screen bg-[#F8FAFC]">

      {/* ══ Hero Header ═══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden border-b border-slate-200/80 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-emc-hero opacity-50" />
        <div className="relative mx-auto max-w-[1400px] px-6 py-7">
          <div className="flex items-center justify-between gap-6">

            {/* RTL start (visual right): icon */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient shadow-emc-glow"
            >
              <Shield size={24} className="text-white" />
            </motion.div>

            {/* Center: title + subtitle */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex-1 text-center"
            >
              <h1 className="text-2xl font-black text-ink-500 sm:text-[26px]">سجلات التدقيق</h1>
              <p className="mt-1 text-sm font-medium text-muted-500">
                تتبع جميع العمليات والإجراءات داخل النظام
              </p>
            </motion.div>

            {/* RTL end (visual left): refresh */}
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              type="button"
              onClick={() => void load()}
              disabled={loading}
              aria-label="تحديث السجلات"
              className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-emc-xs transition-all duration-150 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              تحديث
            </motion.button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-5 px-6 py-6">

        {/* ══ KPI Cards ════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
        >
          <KpiCard label="إجمالي العمليات" value={stats.total}     icon={Activity}  iconBg="bg-brand-50"  iconColor="text-brand-600" />
          <KpiCard label="المستخدمون"       value={stats.users}     icon={Users}     iconBg="bg-violet-50" iconColor="text-violet-600" />
          <KpiCard label="هذا الشهر"        value={stats.thisMonth} icon={Calendar}  iconBg="bg-sky-50"    iconColor="text-sky-600" />
          <KpiCard label="هذا الأسبوع"     value={stats.thisWeek}  icon={Clock}     iconBg="bg-amber-50"  iconColor="text-amber-600" />
          <KpiCard label="اليوم"            value={stats.today}     icon={Zap}       iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        </motion.div>

        {/* ══ Filter Toolbar ═══════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl bg-white p-4 shadow-emc-xs ring-1 ring-slate-200"
        >
          {/* ── Single flat row — all h-10, no nested grids ─────────── */}
          <div className="flex flex-wrap items-center gap-2.5">

            {/* Search — grows */}
            <div className="relative min-w-[160px] flex-1">
              <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-400" />
              <input
                type="text"
                dir="rtl"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="بحث في الفاعل، الدور، الحدث، الكيان..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pr-9 pl-3 text-sm font-medium text-ink-500 placeholder:text-muted-400 transition-all duration-150 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15"
              />
            </div>

            {/* Action type */}
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-10 min-w-[130px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-all duration-150 focus:border-brand-400 focus:outline-none"
            >
              {ACTION_FILTER.map((o) => <option key={o.value} value={o.value}>{o.labelAr}</option>)}
            </select>

            {/* Role */}
            <input
              dir="rtl"
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value)}
              placeholder="الدور"
              className="h-10 w-28 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm font-medium text-ink-500 placeholder:text-muted-400 transition-all duration-150 focus:border-brand-400 focus:bg-white focus:outline-none"
            />

            {/* User / actor name */}
            <input
              dir="rtl"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="المستخدم"
              className="h-10 w-32 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm font-medium text-ink-500 placeholder:text-muted-400 transition-all duration-150 focus:border-brand-400 focus:bg-white focus:outline-none"
            />

            {/* Entity type */}
            <input
              dir="rtl"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="الكيان"
              className="h-10 w-28 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm font-medium text-ink-500 placeholder:text-muted-400 transition-all duration-150 focus:border-brand-400 focus:bg-white focus:outline-none"
            />

            {/* From date */}
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 focus:border-brand-400 focus:outline-none"
            />

            {/* To date */}
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 focus:border-brand-400 focus:outline-none"
            />

            {/* Apply */}
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="flex h-10 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-bold text-white transition-all duration-150 hover:bg-brand-600 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              تطبيق
            </button>

            {/* Reset */}
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  type="button"
                  onClick={resetFilters}
                  className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 transition-all duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <X size={13} />
                  إعادة تعيين
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ══ Result bar ════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-bold text-muted-500">
            {loading
              ? <span className="flex items-center gap-2 text-muted-400"><Loader2 size={13} className="animate-spin" />جارٍ التحميل...</span>
              : <><span className="font-black text-ink-500">{fuzzyFiltered.length}</span> سجل مُحمَّل</>
            }
          </p>
        </div>

        {/* ══ Error ════════════════════════════════════════════════════ */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4"
          >
            <p className="flex-1 text-sm font-bold text-red-600">{error}</p>
            <button type="button" onClick={() => void load()}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-50">
              إعادة المحاولة
            </button>
          </motion.div>
        )}

        {/* ══ Loading skeleton ═════════════════════════════════════════ */}
        {loading && entries.length === 0 && (
          <div className="space-y-3">
            {[44, 56, 36, 60, 44].map((h, i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100" style={{ height: `${h * 2}px` }}>
                <Shimmer className="h-full w-full rounded-none" />
              </div>
            ))}
          </div>
        )}

        {/* ══ Empty state ═══════════════════════════════════════════════ */}
        {!loading && !error && fuzzyFiltered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-20 text-center ring-1 ring-slate-100">
            <motion.div
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100"
            >
              <Shield size={30} className="text-slate-300" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <p className="font-black text-slate-400">لا توجد سجلات تطابق البحث الحالي</p>
              <p className="mt-1 text-sm text-slate-400">خفِّف المرشّحات أو اضغط تحديث لتحميل أحدث البيانات</p>
              {hasActiveFilters && (
                <button type="button" onClick={resetFilters}
                  className="mt-4 rounded-xl bg-brand-50 px-5 py-2 text-sm font-bold text-brand-600 transition hover:bg-brand-100">
                  إعادة تعيين الفلاتر
                </button>
              )}
            </motion.div>
          </div>
        )}

        {/* ══ Audit log cards ══════════════════════════════════════════ */}
        {!loading && fuzzyFiltered.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {fuzzyFiltered.map((e, idx) => {
                const badge = resolveActionBadge(e)
                const pill = BADGE_THEME[badge.theme] ?? BADGE_THEME.neutral
                const cardBorder = CARD_BORDER[badge.theme] ?? CARD_BORDER.neutral
                const expanded = expandedId === `${e.id}`
                const hasChanges =
                  (e.changed_fields && e.changed_fields.length > 0) ||
                  e.old_values != null ||
                  e.new_values != null

                return (
                  <motion.article
                    key={`${String(e.id)}-${idx}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.26, delay: Math.min(idx * 0.03, 0.4), ease: [0.22, 0.61, 0.36, 1] }}
                    className={`overflow-hidden rounded-2xl border border-slate-100 border-r-4 ${cardBorder} bg-white shadow-emc-xs transition-shadow duration-150 hover:shadow-emc-sm`}
                  >
                    {/* Main row */}
                    <div className="flex items-start gap-4 p-5">

                      {/* ── Content (visual right in RTL) ────────────── */}
                      <div className="min-w-0 flex-1 space-y-2 text-right">

                        {/* Row 1: badge + actor + role + entity */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-black ring-1 ${pill}`}>
                            {badge.labelAr}
                          </span>
                          <span className="text-[14px] font-black text-ink-500">
                            {actorDisplay(e.actor_name)}
                          </span>
                          {e.actor_role && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                              {e.actor_role}
                            </span>
                          )}
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                            {e.entity_type}
                          </span>
                        </div>

                        {/* Row 2: description */}
                        {(e.description || e.entity_label) && (
                          <p className="text-[13px] font-medium leading-relaxed text-slate-600">
                            {e.description || e.entity_label}
                          </p>
                        )}

                        {/* Row 3: date · time · IP · method · device */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-400">
                          <span dir="ltr" className="flex items-center gap-1 font-medium">
                            <Calendar size={11} className="shrink-0" />
                            {fmtDate(e.created_at)}
                          </span>
                          <span dir="ltr" className="flex items-center gap-1 font-mono font-bold text-slate-600">
                            <Clock size={11} className="shrink-0" />
                            {fmtTime24(e.created_at)}
                          </span>
                          {e.ip_address && (
                            <span dir="ltr" className="flex items-center gap-1 font-mono">
                              <Globe size={11} className="shrink-0" />
                              {e.ip_address}
                            </span>
                          )}
                          {e.method && (
                            <span dir="ltr" className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                              {e.method}
                            </span>
                          )}
                          {e.user_agent_summary && e.user_agent_summary !== '—' && (
                            <span className="flex max-w-[180px] items-center gap-1 truncate">
                              <Monitor size={11} className="shrink-0" />
                              {e.user_agent_summary}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── Actions (visual left in RTL) ─────────────── */}
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => setDrawerEntry(e)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-[12px] font-bold text-ink-500 transition-all duration-150 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                        >
                          تفاصيل
                          <ChevronLeft size={13} />
                        </button>
                        {hasChanges && (
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : `${e.id}`)}
                            className="flex items-center gap-1 rounded-xl border border-slate-100 px-3.5 py-2 text-[11px] font-bold text-muted-500 transition-all duration-150 hover:border-slate-200 hover:bg-slate-50"
                          >
                            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown size={12} />
                            </motion.span>
                            التغييرات
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline diff */}
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden border-t border-slate-100 bg-slate-50/60"
                        >
                          <div className="p-5">
                            <ChangesDiffTable entry={e} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ══ Detail drawer ════════════════════════════════════════════════ */}
      <CrudDrawer
        open={drawerEntry != null}
        onClose={() => setDrawerEntry(null)}
        title="تفاصيل الحدث"
        subtitle={drawerEntry ? `${fmtDate(drawerEntry.created_at)} · ${fmtTime24(drawerEntry.created_at)}` : ''}
        widthClassName="max-w-lg sm:max-w-2xl"
      >
        {drawerEntry && (() => {
          const dBadge = resolveActionBadge(drawerEntry)
          const dPill = BADGE_THEME[dBadge.theme] ?? BADGE_THEME.neutral
          return (
            <div dir="rtl" className="space-y-5 text-right">

              {/* Actor */}
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-400">المستخدم</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-black text-white shadow-emc-sm">
                    {actorDisplay(drawerEntry.actor_name).charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-ink-500">{actorDisplay(drawerEntry.actor_name)}</p>
                    <p className="text-[12px] font-medium text-muted-500">{drawerEntry.actor_role || 'غير محدد'}</p>
                    {drawerEntry.user?.email && (
                      <p dir="ltr" className="mt-0.5 font-mono text-[11px] text-muted-400">{drawerEntry.user.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Event info */}
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-400">تفاصيل الحدث</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-[10px] text-muted-400">الإجراء</p>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ring-1 ${dPill}`}>
                      {dBadge.labelAr}
                    </span>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] text-muted-400">نوع الكيان</p>
                    <p className="font-bold text-ink-500">{drawerEntry.entity_type}</p>
                    {drawerEntry.entity_id && <p className="text-[11px] text-muted-400">#{drawerEntry.entity_id}</p>}
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] text-muted-400">التاريخ</p>
                    <p dir="ltr" className="font-latin font-bold text-ink-500">{fmtDate(drawerEntry.created_at)}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] text-muted-400">الوقت</p>
                    <p dir="ltr" className="font-mono font-bold text-ink-500">{fmtTime24(drawerEntry.created_at)}</p>
                  </div>
                </div>
                {(drawerEntry.description || drawerEntry.entity_label) && (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="mb-1 text-[10px] text-muted-400">الوصف</p>
                    <p className="text-[13px] font-medium leading-relaxed text-slate-700">
                      {drawerEntry.description || drawerEntry.entity_label}
                    </p>
                  </div>
                )}
                {drawerEntry.route && (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="mb-1.5 text-[10px] text-muted-400">المسار</p>
                    <code dir="ltr" className="block rounded-xl bg-slate-900 px-3 py-2.5 text-[11px] font-mono text-slate-200">
                      {drawerEntry.method && (
                        <span className="mr-2 font-bold text-brand-400">{drawerEntry.method}</span>
                      )}
                      {drawerEntry.route}
                    </code>
                  </div>
                )}
              </div>

              {/* Network */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-400">عنوان IP</p>
                  <code dir="ltr" className="block font-latin text-[13px] font-bold text-ink-500">
                    {drawerEntry.ip_address ?? '—'}
                  </code>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-400">المتصفح / الجهاز</p>
                  <p dir="ltr" className="text-[11px] font-medium leading-relaxed text-slate-700 break-all">
                    {drawerEntry.user_agent_summary || '—'}
                  </p>
                </div>
              </div>

              {/* Changes accordion */}
              <ChangesAccordion entry={drawerEntry} />
            </div>
          )
        })()}
      </CrudDrawer>
    </div>
  )
}
