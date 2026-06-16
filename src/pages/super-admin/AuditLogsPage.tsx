import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  ClipboardList,
  Clock3,
  Filter,
  History,
  Network,
  RefreshCw,
  Search,
  UserCircle2,
} from 'lucide-react'
import { fetchAdminAuditLogs, type AdminAuditLogQuery } from '@/api/adminAuditLogsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import type { AdminAuditLogEntry } from '@/types/adminAudit'
import { EnterpriseCrudHero } from '@/pages/super-admin/crud/shared/enterprise/EnterpriseMetrics'
import {
  SaGlassCard,
  SaPageRoot,
  SaStatChip,
} from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { CrudDrawer } from '@/pages/super-admin/crud/shared/CrudDrawer'
import { LoadingPanel, EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { CrudFilterBar, MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'

// ── Action filter options (all known actions) ─────────────────────────────────
const ACTION_FILTER = [
  { value: 'all',          labelAr: 'كل العمليات' },
  { value: 'CREATE',       labelAr: 'إنشاء' },
  { value: 'UPDATE',       labelAr: 'تعديل' },
  { value: 'DELETE',       labelAr: 'حذف' },
  { value: 'LOGIN',        labelAr: 'تسجيل دخول' },
  { value: 'LOGOUT',       labelAr: 'تسجيل خروج' },
  { value: 'ENROLL',       labelAr: 'تسجيل طالب' },
  { value: 'APPROVE',      labelAr: 'موافقة' },
  { value: 'REJECT',       labelAr: 'رفض' },
  { value: 'PUBLISH',      labelAr: 'نشر' },
  { value: 'UNPUBLISH',    labelAr: 'إلغاء النشر' },
  { value: 'EXPORT',       labelAr: 'تصدير' },
  { value: 'IMPORT',       labelAr: 'استيراد' },
  { value: 'DOWNLOAD',     labelAr: 'تنزيل' },
  { value: 'status_changed', labelAr: 'تغيير حالة' },
  { value: 'role_changed',   labelAr: 'تغيير دور' },
] as const

// ── Badge themes ──────────────────────────────────────────────────────────────
type BadgeTheme = keyof typeof BADGE_THEME
const BADGE_THEME = {
  create:   'border-emerald-200 bg-emerald-50 text-emerald-900 ring-emerald-100',
  update:   'border-customBlue/30 bg-brand-50 text-deepBlue ring-brand-100',
  delete:   'border-red-200 bg-red-50 text-red-900 ring-red-100',
  status:   'border-amber-200 bg-amber-50 text-amber-950 ring-amber-100',
  role:     'border-violet-200 bg-violet-50 text-violet-950 ring-violet-100',
  approve:  'border-teal-200 bg-teal-50 text-teal-950 ring-teal-50',
  reject:   'border-rose-200 bg-rose-50 text-rose-950 ring-rose-100',
  login:    'border-green-200 bg-green-50 text-green-900 ring-green-100',
  logout:   'border-slate-200 bg-slate-50 text-slate-700 ring-slate-100',
  enroll:   'border-cyan-200 bg-cyan-50 text-cyan-900 ring-cyan-100',
  publish:  'border-emerald-200 bg-emerald-50 text-emerald-900 ring-emerald-100',
  unpublish:'border-orange-200 bg-orange-50 text-orange-900 ring-orange-100',
  export:   'border-purple-200 bg-purple-50 text-purple-900 ring-purple-100',
  download: 'border-sky-200 bg-sky-50 text-sky-900 ring-sky-100',
  neutral:  'border-slate-200 bg-slate-50 text-slate-800 ring-slate-100',
}
const RAIL_ACCENT: Record<BadgeTheme, string> = {
  create:   'bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.42)]',
  update:   'bg-[#2691C2] shadow-[0_0_18px_rgba(38,145,194,0.38)]',
  delete:   'bg-red-600 shadow-[0_0_18px_rgba(220,38,38,0.35)]',
  status:   'bg-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.4)]',
  role:     'bg-violet-500 shadow-[0_0_18px_rgba(139,92,246,0.4)]',
  approve:  'bg-teal-500 shadow-[0_0_18px_rgba(20,184,166,0.35)]',
  reject:   'bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.35)]',
  login:    'bg-green-500 shadow-[0_0_18px_rgba(34,197,94,0.35)]',
  logout:   'bg-slate-400 shadow-[0_0_18px_rgba(148,163,184,0.3)]',
  enroll:   'bg-cyan-500 shadow-[0_0_18px_rgba(6,182,212,0.38)]',
  publish:  'bg-emerald-600 shadow-[0_0_18px_rgba(5,150,105,0.42)]',
  unpublish:'bg-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.38)]',
  export:   'bg-purple-500 shadow-[0_0_18px_rgba(168,85,247,0.38)]',
  download: 'bg-sky-500 shadow-[0_0_18px_rgba(14,165,233,0.38)]',
  neutral:  'bg-slate-600 shadow-[0_0_18px_rgba(71,85,105,0.25)]',
}

// ── Action resolution ─────────────────────────────────────────────────────────
function resolveActionBadge(entry: AdminAuditLogEntry): { labelAr: string; theme: BadgeTheme } {
  // Prefer backend-provided label + color
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
    CREATE:        { label: 'إنشاء',         theme: 'create' },
    CREATED:       { label: 'إنشاء',         theme: 'create' },
    UPDATE:        { label: 'تعديل',          theme: 'update' },
    UPDATED:       { label: 'تعديل',          theme: 'update' },
    DELETE:        { label: 'حذف',            theme: 'delete' },
    DELETED:       { label: 'حذف',            theme: 'delete' },
    LOGIN:         { label: 'تسجيل دخول',    theme: 'login' },
    LOGIN_FAILED:  { label: 'فشل الدخول',    theme: 'reject' },
    LOGOUT:        { label: 'تسجيل خروج',    theme: 'logout' },
    ENROLL:        { label: 'تسجيل',          theme: 'enroll' },
    APPROVE:       { label: 'موافقة',          theme: 'approve' },
    APPROVED:      { label: 'موافقة',          theme: 'approve' },
    REJECT:        { label: 'رفض',            theme: 'reject' },
    REJECTED:      { label: 'رفض',            theme: 'reject' },
    PUBLISH:       { label: 'نشر',             theme: 'publish' },
    UNPUBLISH:     { label: 'إلغاء النشر',    theme: 'unpublish' },
    EXPORT:        { label: 'تصدير',           theme: 'export' },
    IMPORT:        { label: 'استيراد',         theme: 'export' },
    DOWNLOAD:      { label: 'تنزيل',           theme: 'download' },
    STATUS_CHANGED:{ label: 'تغيير الحالة',  theme: 'status' },
    ROLE_CHANGED:  { label: 'تغيير الدور',   theme: 'role' },
    RESTORED:      { label: 'استعادة',        theme: 'create' },
    STUDENT_ENROLLED:   { label: 'تسجيل طالب', theme: 'enroll' },
    STUDENT_UNENROLLED: { label: 'إلغاء تسجيل', theme: 'unpublish' },
  }
  const found = ACTION_MAP[raw]
  if (found) return { labelAr: found.label, theme: found.theme }

  const pretty = `${entry.action}`.replace(/[_-]+/g, ' ')
  return { labelAr: pretty || 'حدث غير مصنَّف', theme: 'neutral' }
}

// ── Arabic field labels map ───────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  title:              'العنوان',
  name:               'الاسم',
  name_ar:            'الاسم (عربي)',
  name_en:            'الاسم (إنجليزي)',
  status:             'الحالة',
  price:              'السعر',
  email:              'البريد الإلكتروني',
  role:               'الدور',
  description:        'الوصف',
  short_description:  'الوصف المختصر',
  start_date:         'تاريخ البداية',
  end_date:           'تاريخ النهاية',
  start_time:         'وقت البداية',
  end_time:           'وقت النهاية',
  is_active:          'نشط',
  is_free:            'مجاني',
  is_online:          'أونلاين',
  instructor_id:      'المدرب',
  department_id:      'القسم',
  phone:              'الهاتف',
  type:               'النوع',
  level:              'المستوى',
  language:           'اللغة',
  capacity:           'السعة',
  location:           'الموقع',
  slug:               'الرابط',
  duration:           'المدة',
  training_hours:     'الساعات التدريبية',
  registration_open:  'التسجيل مفتوح',
  registration_status:'حالة التسجيل',
  certificate:        'شهادة',
  program_type:       'نوع البرنامج',
  session_format:     'صيغة الجلسة',
  track_id:           'المسار',
  workflow_status:    'حالة سير العمل',
  current_step:       'الخطوة الحالية',
  current_department: 'القسم الحالي',
  selected_date_option: 'الخيار الزمني',
  score:              'الدرجة',
  passed:             'ناجح',
  admin_notes:        'ملاحظات المشرف',
  notes:              'الملاحظات',
  reviewed_by:        'راجعه',
  reviewed_at:        'تاريخ المراجعة',
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

// ── Changes Diff Table ────────────────────────────────────────────────────────
function ChangesDiffTable({ entry }: { entry: AdminAuditLogEntry }) {
  const { action, changed_fields, old_values, new_values } = entry
  const upper = action.toUpperCase()
  const isCreate = upper === 'CREATE' || upper === 'CREATED'
  const isDelete = upper === 'DELETE' || upper === 'DELETED'

  // CREATE: show new_values as initial record
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
        <p className="text-[11px] font-black text-emerald-700 mb-2">✦ تم إنشاء السجل بالقيم التالية</p>
        <table className="w-full text-right text-[11px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-1.5 pe-3 font-black text-muted-600 w-1/3">الحقل</th>
              <th className="py-1.5 font-black text-emerald-700">القيمة</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([k, v]) => (
              <tr key={k} className="border-b border-slate-50">
                <td className="py-1.5 pe-3 font-bold text-muted-700">{fieldLabel(k)}</td>
                <td className="py-1.5">
                  <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[11px] text-emerald-900">
                    {renderValue(v)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // DELETE: show old_values as final snapshot
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
        <p className="text-[11px] font-black text-red-700 mb-2">✕ تم حذف السجل — بيانات ما قبل الحذف</p>
        <table className="w-full text-right text-[11px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-1.5 pe-3 font-black text-muted-600 w-1/3">الحقل</th>
              <th className="py-1.5 font-black text-red-700">القيمة المحذوفة</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([k, v]) => (
              <tr key={k} className="border-b border-slate-50">
                <td className="py-1.5 pe-3 font-bold text-muted-700">{fieldLabel(k)}</td>
                <td className="py-1.5">
                  <span className="inline-block rounded-md bg-red-100 px-2 py-0.5 font-mono text-[11px] text-red-900">
                    {renderValue(v)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // UPDATE: show per-field diff using changed_fields
  const oldObj = old_values as Record<string, unknown> | null
  const newObj = new_values as Record<string, unknown> | null

  // Build the list of fields to show
  let fields: string[] = []
  if (changed_fields && changed_fields.length > 0) {
    fields = changed_fields.filter((k) => !TIMESTAMP_SKIP.has(k))
  } else if (oldObj || newObj) {
    // Fallback: derive from old/new keys
    const allKeys = new Set([
      ...Object.keys(oldObj ?? {}),
      ...Object.keys(newObj ?? {}),
    ])
    fields = [...allKeys].filter((k) => !TIMESTAMP_SKIP.has(k))
  }

  if (fields.length === 0) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[12px] font-semibold text-muted-600">
        لا توجد تفاصيل تغييرات محفوظة
      </div>
    )
  }

  return (
    <table className="w-full text-right text-[11px]">
      <thead>
        <tr className="border-b border-slate-100">
          <th className="py-1.5 pe-3 font-black text-muted-600 w-1/4">الحقل</th>
          <th className="py-1.5 pe-3 font-black text-red-700 w-[37.5%">قبل</th>
          <th className="py-1.5 font-black text-emerald-700 w-[37.5%">بعد</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((key) => {
          const oldVal = oldObj?.[key]
          const newVal = newObj?.[key]
          return (
            <tr key={key} className="border-b border-slate-50 last:border-0">
              <td className="py-2 pe-3 font-bold text-muted-800">{fieldLabel(key)}</td>
              <td className="py-2 pe-3">
                <span className="inline-block max-w-[160px] truncate rounded-md bg-red-50 px-2 py-0.5 font-mono text-[11px] text-red-800 ring-1 ring-red-200">
                  {renderValue(oldVal)}
                </span>
              </td>
              <td className="py-2">
                <span className="inline-block max-w-[160px] truncate rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[11px] text-emerald-800 ring-1 ring-emerald-200">
                  {renderValue(newVal)}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Changes Accordion ─────────────────────────────────────────────────────────
function ChangesAccordion({ entry }: { entry: AdminAuditLogEntry }) {
  const [open, setOpen] = useState(false)
  const hasData =
    (entry.changed_fields && entry.changed_fields.length > 0) ||
    entry.old_values != null ||
    entry.new_values != null

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-right transition hover:bg-white"
      >
        <span className="flex items-center gap-2 text-[12px] font-black text-deepBlue">
          <ClipboardList className="h-4 w-4 text-customBlue" aria-hidden />
          تفاصيل التغييرات
          {hasData && (
            <span className="rounded-full bg-customBlue/10 px-2 py-0.5 text-[10px] font-black text-customBlue">
              {entry.changed_fields?.length ?? '—'}
            </span>
          )}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-muted-500">
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

// ── Utilities ─────────────────────────────────────────────────────────────────
function fmtWhen(iso: string) {
  if (!iso || iso === '—') return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(d)
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SuperAdminAuditLogsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<AdminAuditLogEntry[]>([])
  const [action, setAction] = useState<string>('all')
  const [actor, setActor] = useState('')
  const [actorRole, setActorRole] = useState('')
  const [entityType, setEntityType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [q, setQ] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drawerEntry, setDrawerEntry] = useState<AdminAuditLogEntry | null>(null)

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

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fuzzyFiltered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return entries
    return entries.filter((e) => {
      const blob =
        `${e.actor_name} ${e.actor_role} ${e.action} ${e.entity_type} ${e.entity_label} ${e.description ?? ''}`.toLowerCase()
      return blob.includes(t)
    })
  }, [entries, q])

  const badgePatternCount = useMemo(
    () => new Set(fuzzyFiltered.map((e) => resolveActionBadge(e).labelAr)).size,
    [fuzzyFiltered],
  )

  return (
    <SaPageRoot className="space-y-8 pb-16">
      <EnterpriseCrudHero
        eyebrow="Operational audit · GET /admin/audit-logs"
        title="سجل التغييرات"
        subtitle="تتبع من قام بإنشاء أو تعديل أو حذف البيانات داخل منصة EMC، مع حقول شبكة، وتفاصيل IP، وحِزم قبل/بعد."
        variant="navy"
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-[18px] border border-white/25 bg-white/95 px-4 py-2.5 text-[12px] font-black text-deepBlue shadow backdrop-blur-md"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            تحديث
          </button>
        }
      />

      <SaGlassCard className="relative overflow-hidden border border-white/70 p-6 text-right" glow="blue">
        <div className="absolute -start-20 top-10 h-32 w-32 rounded-full bg-customBlue/10 blur-[80px]" aria-hidden />
        <div className="relative grid gap-4 sm:grid-cols-4">
          <SaStatChip label="أحداث مُحمّلة"            value={entries.length}         tone="blue" />
          <SaStatChip label="بعد البحث"                 value={fuzzyFiltered.length}   tone="orange" />
          <SaStatChip label="أنماط عمليات مرئية"        value={badgePatternCount}       tone="success" />
          <SaStatChip label="مزامنة"                    value={loading ? '…' : 'جاهزة'} tone="ink" />
        </div>
      </SaGlassCard>

      <motion.div layout className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-right rtl:text-right">
          <Filter className="h-4 w-4 text-customBlue" aria-hidden />
          <span className="text-[11px] font-black uppercase tracking-wide text-muted-600 font-latin">Filters</span>
        </div>

        <CrudFilterBar
          searchValue={q}
          onSearchChange={(v) => setQ(v)}
          searchPlaceholder="بحث في الفاعل، الدور، الحدث، الكيان، أو الوصف…"
        />

        <div className="grid gap-4 rounded-[22px] border border-ink-100 bg-white p-5 shadow-inner sm:grid-cols-2 xl:grid-cols-6">
          <MiniSelect label="نوع العملية" value={action} onChange={(v) => setAction(v)} options={[...ACTION_FILTER]} />

          <label className="flex flex-col gap-2 text-right">
            <span className="text-[10px] font-black uppercase tracking-wide text-muted-500 font-latin">
              اسم المستخدم
            </span>
            <span className="relative">
              <UserCircle2 className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-400" aria-hidden />
              <input
                dir="rtl"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="مثال — أحد أعضاء العمليات"
                className="w-full rounded-2xl border border-ink-100 bg-slate-50/70 py-2.5 ps-10 pe-3 text-[12px] font-bold text-deepBlue outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-400/20"
              />
            </span>
          </label>

          <label className="flex flex-col gap-2 text-right">
            <span className="text-[10px] font-black uppercase tracking-wide text-muted-500 font-latin">
              دور المستخدم
            </span>
            <input
              dir="rtl"
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value)}
              placeholder="مثال — admin أو super_admin"
              className="w-full rounded-2xl border border-ink-100 bg-slate-50/70 py-2.5 px-3 text-[12px] font-bold text-deepBlue outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-400/20"
            />
          </label>

          <label className="flex flex-col gap-2 text-right xl:col-span-2">
            <span className="text-[10px] font-black uppercase tracking-wide text-muted-500 font-latin">
              نوع الكيان
            </span>
            <input
              dir="rtl"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="مثال — User أو Course"
              className="w-full rounded-2xl border border-ink-100 bg-slate-50/70 py-2.5 px-3 text-[12px] font-bold text-deepBlue outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-400/20"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2 xl:col-span-1">
            <label className="flex flex-col gap-2 text-right">
              <span className="text-[10px] font-black uppercase tracking-wide text-muted-500 font-latin">من تاريخ</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-2xl border border-ink-100 bg-white py-2.5 px-2 text-[12px] font-bold text-deepBlue"
              />
            </label>
            <label className="flex flex-col gap-2 text-right">
              <span className="text-[10px] font-black uppercase tracking-wide text-muted-500 font-latin">إلى تاريخ</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-2xl border border-ink-100 bg-white py-2.5 px-2 text-[12px] font-bold text-deepBlue"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#2691C2] px-5 py-2.5 text-[12px] font-black text-white shadow-md transition hover:bg-[#1e7eab]"
          >
            <Search className="h-4 w-4" aria-hidden />
            تطبيق الفلاتر
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setActor('')
              setActorRole('')
              setEntityType('')
              setAction('all')
              setFromDate('')
              setToDate('')
              setQ('')
            }}
            className="rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-[12px] font-black text-muted-700 shadow-sm"
          >
            إعادة تهيئة
          </button>
        </div>
      </motion.div>

      {error ?
        <ErrorPanel title="تعذر تحميل سجل التغييرات" hint={error} />
      : loading && !entries.length ?
        <LoadingPanel />
      : !loading && fuzzyFiltered.length === 0 ?
        <EmptyPanel
          title="لا توجد تغييرات مسجلة حاليًا"
          subtitle="لم نجد أي سجلات تطابق التصفية — خفِّف المرشّحات أو تأكّد أنّ الخلفية تعيد بيانات GET /admin/audit-logs."
        />
      :
        <div dir="rtl" className="relative isolate space-y-4">
          <div aria-hidden className="pointer-events-none absolute end-[15px] top-10 bottom-0 w-px bg-gradient-to-b from-customBlue/55 via-accent-400/55 to-transparent" />

          <AnimatePresence mode="popLayout">
            {fuzzyFiltered.map((e, idx) => {
              const badge = resolveActionBadge(e)
              const expanded = expandedId === `${e.id}`
              const pill = BADGE_THEME[badge.theme] ?? BADGE_THEME.neutral
              const rail = RAIL_ACCENT[badge.theme] ?? RAIL_ACCENT.neutral

              return (
                <Fragment key={`${String(e.id)}-${String(idx)}`}>
                  <motion.article
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
                    className="relative mr-11 rounded-[24px] border border-white bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.45)]"
                  >
                    <span
                      aria-hidden
                      className={`absolute top-10 -end-[5px] z-[1] h-11 w-1 rounded-full ring-4 ring-white/95 ${rail}`}
                    />
                    <div className="flex w-full flex-col gap-4 p-6 text-right sm:flex-row sm:items-stretch">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 flex-col gap-2 text-end transition hover:bg-brand-50/[0.35]"
                        onClick={() => setExpandedId(expanded ? null : `${e.id}`)}
                      >
                        {/* Badge + date */}
                        <div className="flex flex-wrap items-center gap-2">
                          <History className="h-5 w-5 text-customBlue" aria-hidden />
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide shadow-sm ring-1 ${pill}`}>
                            {badge.labelAr}
                          </span>
                          <span className="text-[13px] font-black text-deepBlue">{fmtWhen(e.created_at)}</span>
                        </div>
                        {/* Actor + entity */}
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-black text-deepBlue">{e.actor_name}</p>
                          <CrudBadge variant="brand">{e.actor_role || 'دور غير مُصدَر'}</CrudBadge>
                          <ClipboardList className="h-4 w-4 text-muted-400 sm:ms-auto" aria-hidden />
                          <CrudBadge variant="accent">{e.entity_type}</CrudBadge>
                        </div>
                        {/* Description or entity label */}
                        {e.description ?
                          <p className="text-[12px] font-semibold leading-relaxed text-muted-700 rtl:text-right">
                            {e.description}
                          </p>
                        :
                          <p className="truncate text-[12px] font-semibold leading-relaxed text-muted-700 rtl:text-right">
                            {e.entity_label}
                          </p>
                        }
                        {/* IP + user agent */}
                        <div className="flex flex-wrap gap-4 text-[11px] font-bold text-muted-500">
                          <span className="inline-flex items-center gap-2">
                            <Network className="h-4 w-4 opacity-65" aria-hidden />
                            IP:{' '}
                            <span dir="ltr" className="font-mono font-black text-muted-900">
                              {e.ip_address ?? '—'}
                            </span>
                          </span>
                          {e.method && (
                            <span dir="ltr" className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-black text-[10px] text-slate-700">
                              {e.method}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-2 truncate">
                            <Clock3 className="h-4 w-4 shrink-0 opacity-65" aria-hidden />
                            <span dir="ltr" className="truncate">
                              {e.user_agent_summary}
                            </span>
                          </span>
                        </div>
                      </button>

                      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-40">
                        <button
                          type="button"
                          className="rounded-2xl border border-ink-100 bg-deepBlue/[0.02] px-4 py-2 text-[11px] font-black text-deepBlue transition hover:border-customBlue hover:bg-brand-50"
                          onClick={() => setDrawerEntry(e)}
                        >
                          تفاصيل كاملة
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : `${e.id}`)}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-ink-100 py-2 text-[11px] font-black text-muted-600 transition hover:border-customBlue/40 hover:bg-white"
                        >
                          <motion.span animate={{ rotate: expanded ? 180 : 0 }} aria-hidden transition={{ duration: 0.22 }}>
                            ↓
                          </motion.span>
                          {expanded ? 'طي التغييرات' : 'عرض التغييرات'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded diff section */}
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-ink-50 bg-gradient-to-bl from-deepBlue/[0.02] to-white"
                        >
                          <div className="p-5">
                            <ChangesDiffTable entry={e} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                </Fragment>
              )
            })}
          </AnimatePresence>
        </div>
      }

      <SaGlassCard className="border-dashed border-accent-400/40 bg-accent-400/[0.04] p-5 text-[12px] font-semibold text-muted-800" glow="orange">
        <p className="text-right rtl:text-right">
          يتم إخفاء أحداث <strong className="text-deepBlue">محاكاة الدخول (impersonation)</strong> آلياً من هذا السجل التشغيلي.
        </p>
      </SaGlassCard>

      {/* ── Detail drawer ──────────────────────────────────────────────────── */}
      <CrudDrawer
        open={drawerEntry != null}
        onClose={() => setDrawerEntry(null)}
        title="تفاصيل الحدث"
        subtitle={drawerEntry ? fmtWhen(drawerEntry.created_at) : ''}
        widthClassName="max-w-lg sm:max-w-2xl"
      >
        {drawerEntry && (
          <div dir="rtl" className="space-y-6 text-[12px] font-semibold text-muted-900">
            {/* Actor + Action row */}
            <div className="grid gap-3 sm:grid-cols-2">
              <SaGlassCard className="p-4 shadow-none ring-1 ring-deepBlue/[0.05]" glow="blue">
                <p className="text-[11px] font-black uppercase text-muted-600 font-latin">Actor</p>
                <p className="mt-1 text-lg font-black text-deepBlue">{drawerEntry.actor_name}</p>
                <p className="text-[12px] text-muted-700">{drawerEntry.actor_role || '— دور غير ظاهر'}</p>
                {drawerEntry.user?.email && (
                  <p className="mt-1 text-[11px] text-muted-500 font-mono">{drawerEntry.user.email}</p>
                )}
              </SaGlassCard>
              <SaGlassCard className="p-4 shadow-none ring-1 ring-accent-400/12" glow="orange">
                <p className="text-[11px] font-black uppercase text-muted-600 font-latin">Action</p>
                <p className="mt-2 text-xl font-black text-accent-950">{drawerEntry.action}</p>
                {drawerEntry.action_label && (
                  <p className="text-[12px] font-semibold text-muted-700">{drawerEntry.action_label}</p>
                )}
              </SaGlassCard>
            </div>

            {/* Entity + Description */}
            <SaGlassCard className="space-y-2 p-5 shadow-inner" glow="blue">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-[11px] font-black ${BADGE_THEME[resolveActionBadge(drawerEntry).theme] ?? BADGE_THEME.neutral}`}>
                  {resolveActionBadge(drawerEntry).labelAr}
                </span>
                {drawerEntry.method && (
                  <span dir="ltr" className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-black text-slate-700">
                    {drawerEntry.method}
                  </span>
                )}
              </div>
              <p className="text-[13px] font-black text-deepBlue">
                نوع الكيان: <span className="font-mono">{drawerEntry.entity_type}</span>
                {drawerEntry.entity_id && (
                  <span className="ms-2 text-muted-500">#{drawerEntry.entity_id}</span>
                )}
              </p>
              <p className="text-[12px] text-muted-800">
                {drawerEntry.description || drawerEntry.entity_label}
              </p>
              {drawerEntry.route && (
                <p className="text-[11px] font-mono text-muted-500">{drawerEntry.route}</p>
              )}
            </SaGlassCard>

            {/* Field diff accordion */}
            <ChangesAccordion entry={drawerEntry} />

            {/* Network info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <SaGlassCard className="space-y-1 p-4 shadow-inner" glow="orange">
                <p className="text-[11px] font-black text-deepBlue">IPv4/v6</p>
                <code dir="ltr" className="block text-[13px] font-bold text-muted-950">
                  {drawerEntry.ip_address ?? '—'}
                </code>
              </SaGlassCard>
              <SaGlassCard className="space-y-1 p-4 shadow-inner" glow="orange">
                <p className="text-[11px] font-black text-deepBlue">وكيل المستخدم</p>
                <p dir="ltr" className="text-[11px] font-semibold leading-relaxed">
                  {drawerEntry.user_agent_summary}
                </p>
              </SaGlassCard>
            </div>
          </div>
        )}
      </CrudDrawer>
    </SaPageRoot>
  )
}
