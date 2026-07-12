import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Megaphone, Edit2, Trash2, Send, Eye, RefreshCw,
  ExternalLink, AlertTriangle, Shield, Wrench, Zap, Bug,
  Palette, Info, Bell, CheckCircle, ArrowRight,
} from 'lucide-react'
import toast from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchProductUpdates,
  fetchProductUpdateStats,
  createProductUpdate,
  updateProductUpdate,
  publishProductUpdate,
  deleteProductUpdate,
  type ProductUpdate,
  type ProductUpdateCategory,
  type ProductUpdateStatus,
  type ProductUpdatePayload,
  type UpdateType,
  type MaintenanceSeverity,
  type Priority,
} from '@/api/productUpdatesApi'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'
import { CrudDrawer } from '@/pages/super-admin/crud/shared/CrudDrawer'
import { KpiCards } from '@/pages/super-admin/crud/shared/KpiStrip'

// ─── Update type metadata ─────────────────────────────────────────────────────

type TypeMeta = {
  label: string
  color: string
  bg: string
  dot: string
  icon: React.ElementType
}

const UPDATE_TYPE_META: Record<UpdateType, TypeMeta> = {
  information:     { label: 'معلومات فقط',    color: 'text-slate-700',   bg: 'bg-slate-100 ring-1 ring-slate-300',    dot: 'bg-slate-500',   icon: Info          },
  new_feature:     { label: 'ميزة جديدة',     color: 'text-blue-700',    bg: 'bg-blue-50 ring-1 ring-blue-200',       dot: 'bg-blue-500',    icon: Zap           },
  improvement:     { label: 'تحسين',          color: 'text-emerald-700', bg: 'bg-emerald-50 ring-1 ring-emerald-200', dot: 'bg-emerald-500', icon: ArrowRight     },
  redesign:        { label: 'إعادة تصميم',    color: 'text-purple-700',  bg: 'bg-purple-50 ring-1 ring-purple-200',   dot: 'bg-purple-500',  icon: Palette        },
  bug_fix:         { label: 'إصلاح خطأ',      color: 'text-orange-700',  bg: 'bg-orange-50 ring-1 ring-orange-200',   dot: 'bg-orange-500',  icon: Bug            },
  announcement:    { label: 'إعلان عام',       color: 'text-gray-700',    bg: 'bg-gray-100 ring-1 ring-gray-300',      dot: 'bg-gray-500',    icon: Bell           },
  maintenance:     { label: 'صيانة',           color: 'text-amber-700',   bg: 'bg-amber-50 ring-1 ring-amber-200',     dot: 'bg-amber-500',   icon: Wrench         },
  security_update: { label: 'تحديث أمني',     color: 'text-red-700',     bg: 'bg-red-50 ring-1 ring-red-200',         dot: 'bg-red-500',     icon: Shield         },
  action_required: { label: 'يتطلب إجراء',    color: 'text-rose-700',    bg: 'bg-rose-50 ring-1 ring-rose-200',       dot: 'bg-rose-500',    icon: AlertTriangle  },
  mandatory_update:{ label: 'تحديث إلزامي',   color: 'text-indigo-700',  bg: 'bg-indigo-50 ring-1 ring-indigo-200',   dot: 'bg-indigo-500',  icon: CheckCircle    },
}

const ALL_UPDATE_TYPES = Object.keys(UPDATE_TYPE_META) as UpdateType[]

// Legacy category meta (kept for backward compat display)
const CATEGORY_META: Record<ProductUpdateCategory, { label: string; color: string; bg: string }> = {
  feature:      { label: 'ميزة جديدة',  color: 'text-blue-700',    bg: 'bg-blue-50 ring-1 ring-blue-200'    },
  improvement:  { label: 'تحسين',       color: 'text-emerald-700', bg: 'bg-emerald-50 ring-1 ring-emerald-200' },
  fix:          { label: 'إصلاح',       color: 'text-orange-700',  bg: 'bg-orange-50 ring-1 ring-orange-200' },
  security:     { label: 'أمان',        color: 'text-red-700',     bg: 'bg-red-50 ring-1 ring-red-200'      },
  announcement: { label: 'إعلان',       color: 'text-purple-700',  bg: 'bg-purple-50 ring-1 ring-purple-200'},
}

function getTypeMeta(item: ProductUpdate): TypeMeta {
  if (item.update_type && UPDATE_TYPE_META[item.update_type]) {
    return UPDATE_TYPE_META[item.update_type]
  }
  const cat = CATEGORY_META[item.category]
  return { label: cat.label, color: cat.color, bg: cat.bg, dot: 'bg-gray-400', icon: Bell }
}

const STATUS_META: Record<ProductUpdateStatus, { label: string; color: string; dot: string }> = {
  draft:     { label: 'مسودة',  color: 'text-slate-600',   dot: 'bg-slate-400'   },
  published: { label: 'منشور', color: 'text-emerald-700',  dot: 'bg-emerald-500' },
  archived:  { label: 'مؤرشف', color: 'text-rose-600',     dot: 'bg-rose-400'    },
}

const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  low:      { label: 'منخفضة',  color: 'text-slate-600'   },
  medium:   { label: 'متوسطة',  color: 'text-amber-600'   },
  high:     { label: 'عالية',   color: 'text-orange-600'  },
  critical: { label: 'حرجة',    color: 'text-red-600'     },
}

const SEVERITY_META: Record<MaintenanceSeverity, { label: string; color: string }> = {
  low:      { label: 'منخفضة',  color: 'text-slate-600'  },
  medium:   { label: 'متوسطة',  color: 'text-amber-600'  },
  high:     { label: 'عالية',   color: 'text-orange-600' },
  critical: { label: 'حرجة',    color: 'text-red-600'    },
}

const ALL_ROLES = [
  'super_admin','tech_admin','admin','executive_admin','department_manager',
  'programs_manager','marketing_manager','finance_manager','hr_manager',
  'operations_manager','support_agent','instructor','student','volunteer','partner',
]
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'مدير النظام', tech_admin: 'مدير تقني', admin: 'مدير',
  executive_admin: 'مدير تنفيذي', department_manager: 'مدير قسم',
  programs_manager: 'مدير برامج', marketing_manager: 'مدير تسويق',
  finance_manager: 'مدير مالي', hr_manager: 'مدير الموارد',
  operations_manager: 'مدير عمليات', support_agent: 'دعم فني',
  instructor: 'مدرب', student: 'طالب', volunteer: 'متطوع', partner: 'شريك',
}

// Map update_type → legacy category for backward compat
function typeToCategoryDefault(t: UpdateType): ProductUpdateCategory {
  const map: Partial<Record<UpdateType, ProductUpdateCategory>> = {
    new_feature:     'feature',
    improvement:     'improvement',
    redesign:        'improvement',
    bug_fix:         'fix',
    security_update: 'security',
  }
  return map[t] ?? 'announcement'
}

// ─── Shared form field ────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-deepBlue">
        {label}{required && <span className="mr-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm font-semibold text-right text-deepBlue placeholder-muted-400 focus:border-customBlue focus:outline-none focus:ring-2 focus:ring-customBlue/20'
const textareaCls = `${inputCls} resize-none`
const selectCls = inputCls

// ─── Dynamic type-specific fields ────────────────────────────────────────────

function TypeSpecificFields({
  type,
  state,
  set,
}: {
  type: UpdateType
  state: Partial<ProductUpdatePayload>
  set: (patch: Partial<ProductUpdatePayload>) => void
}) {
  switch (type) {
    // ── NEW FEATURE ───────────────────────────────────────────────────────────
    case 'new_feature':
      return (
        <div className="space-y-4">
          <Field label="رابط لقطة الشاشة">
            <input value={state.image_url ?? ''} onChange={e => set({ image_url: e.target.value || null })}
              className={inputCls} placeholder="https://…/screenshot.png" dir="ltr" />
          </Field>
          <Field label="الصفحة المرتبطة (URL)">
            <input value={state.related_page_url ?? ''} onChange={e => set({ related_page_url: e.target.value || null })}
              className={inputCls} placeholder="/dashboard/…" dir="ltr" />
          </Field>
        </div>
      )

    // ── IMPROVEMENT ───────────────────────────────────────────────────────────
    case 'improvement':
      return (
        <div className="space-y-4">
          <Field label="رابط لقطة الشاشة">
            <input value={state.image_url ?? ''} onChange={e => set({ image_url: e.target.value || null })}
              className={inputCls} placeholder="https://…/screenshot.png" dir="ltr" />
          </Field>
          <Field label="رابط الصفحة المحسّنة">
            <input value={state.related_page_url ?? ''} onChange={e => set({ related_page_url: e.target.value || null })}
              className={inputCls} placeholder="/dashboard/…" dir="ltr" />
          </Field>
        </div>
      )

    // ── REDESIGN ──────────────────────────────────────────────────────────────
    case 'redesign':
      return (
        <div className="space-y-4">
          <Field label="صورة قبل التصميم">
            <input value={state.image_before_url ?? ''} onChange={e => set({ image_before_url: e.target.value || null })}
              className={inputCls} placeholder="https://…/before.png" dir="ltr" />
          </Field>
          <Field label="صورة بعد التصميم">
            <input value={state.image_after_url ?? ''} onChange={e => set({ image_after_url: e.target.value || null })}
              className={inputCls} placeholder="https://…/after.png" dir="ltr" />
          </Field>
          <Field label="رابط الصفحة">
            <input value={state.related_page_url ?? ''} onChange={e => set({ related_page_url: e.target.value || null })}
              className={inputCls} placeholder="/dashboard/…" dir="ltr" />
          </Field>
        </div>
      )

    // ── BUG FIX ───────────────────────────────────────────────────────────────
    case 'bug_fix':
      return (
        <div className="space-y-4">
          <Field label="وصف المشكلة">
            <textarea value={state.problem_description ?? ''} onChange={e => set({ problem_description: e.target.value || null })}
              className={textareaCls} rows={3} placeholder="ما كانت المشكلة؟" />
          </Field>
          <Field label="وصف الإصلاح">
            <textarea value={state.fix_description ?? ''} onChange={e => set({ fix_description: e.target.value || null })}
              className={textareaCls} rows={3} placeholder="كيف تم الإصلاح؟" />
          </Field>
          <Field label="المستخدمون المتأثرون">
            <input value={state.affected_users ?? ''} onChange={e => set({ affected_users: e.target.value || null })}
              className={inputCls} placeholder="مثال: جميع المدراء" />
          </Field>
        </div>
      )

    // ── MAINTENANCE ───────────────────────────────────────────────────────────
    case 'maintenance':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="وقت البدء">
              <input type="datetime-local" value={state.maintenance_start?.slice(0, 16) ?? ''}
                onChange={e => set({ maintenance_start: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className={inputCls} dir="ltr" />
            </Field>
            <Field label="وقت الانتهاء">
              <input type="datetime-local" value={state.maintenance_end?.slice(0, 16) ?? ''}
                onChange={e => set({ maintenance_end: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className={inputCls} dir="ltr" />
            </Field>
          </div>
          <Field label="الخدمات المتأثرة (مفصولة بفاصلة)">
            <input value={(state.affected_services ?? []).join(', ')}
              onChange={e => set({ affected_services: e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : [] })}
              className={inputCls} placeholder="مثال: لوحة الإدارة، نظام الدورات" />
          </Field>
          <Field label="مستوى الخطورة">
            <select value={state.maintenance_severity ?? ''} onChange={e => set({ maintenance_severity: (e.target.value as MaintenanceSeverity) || null })}
              className={selectCls}>
              <option value="">اختر</option>
              {(Object.entries(SEVERITY_META) as [MaintenanceSeverity, { label: string }][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </Field>
        </div>
      )

    // ── SECURITY UPDATE ───────────────────────────────────────────────────────
    case 'security_update':
      return (
        <div className="space-y-4">
          <Field label="الأولوية">
            <select value={state.priority ?? ''} onChange={e => set({ priority: (e.target.value as Priority) || null })}
              className={selectCls}>
              <option value="">اختر</option>
              {(Object.entries(PRIORITY_META) as [Priority, { label: string }][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </Field>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" checked={!!state.requires_acknowledgement}
              onChange={e => set({ requires_acknowledgement: e.target.checked })}
              className="h-4 w-4 rounded accent-customBlue" />
            <span className="text-xs font-bold text-deepBlue">يتطلب تأكيد القراءة</span>
          </label>
        </div>
      )

    // ── ACTION REQUIRED ───────────────────────────────────────────────────────
    case 'action_required':
      return (
        <div className="space-y-4">
          <Field label="الموعد النهائي">
            <input type="datetime-local" value={state.due_date?.slice(0, 16) ?? ''}
              onChange={e => set({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className={inputCls} dir="ltr" />
          </Field>
          <Field label="الصفحة المستهدفة">
            <input value={state.related_page_url ?? ''} onChange={e => set({ related_page_url: e.target.value || null })}
              className={inputCls} placeholder="/dashboard/…" dir="ltr" />
          </Field>
          <Field label="الأولوية">
            <select value={state.priority ?? ''} onChange={e => set({ priority: (e.target.value as Priority) || null })}
              className={selectCls}>
              <option value="">اختر</option>
              {(Object.entries(PRIORITY_META) as [Priority, { label: string }][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </Field>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" checked={!!state.requires_acknowledgement}
              onChange={e => set({ requires_acknowledgement: e.target.checked })}
              className="h-4 w-4 rounded accent-customBlue" />
            <span className="text-xs font-bold text-deepBlue">يتطلب تأكيد الإتمام</span>
          </label>
        </div>
      )

    // ── MANDATORY UPDATE ──────────────────────────────────────────────────────
    case 'mandatory_update':
      return (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-xs font-bold text-indigo-700">
          لا يمكن إغلاق هذا التحديث — المستخدم ملزم بالضغط على "فهمت" قبل الاستمرار.
        </div>
      )

    default:
      return null
  }
}

// ─── CTA section (shared) ─────────────────────────────────────────────────────

function CtaFields({ state, set }: { state: Partial<ProductUpdatePayload>; set: (p: Partial<ProductUpdatePayload>) => void }) {
  const [showCta, setShowCta] = useState(!!(state.cta_label || state.cta_url))

  return (
    <div>
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={showCta} onChange={e => { setShowCta(e.target.checked); if (!e.target.checked) set({ cta_label: null, cta_url: null, cta_external: false }) }}
          className="h-4 w-4 rounded accent-customBlue" />
        <span className="text-xs font-bold text-deepBlue">إضافة زر إجراء (CTA)</span>
      </label>
      <AnimatePresence>
        {showCta && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-3 overflow-hidden">
            <div className="grid grid-cols-2 gap-3">
              <Field label="نص الزر">
                <input value={state.cta_label ?? ''} onChange={e => set({ cta_label: e.target.value || null })}
                  className={inputCls} placeholder="استكشف الميزة" />
              </Field>
              <Field label="رابط الزر">
                <input value={state.cta_url ?? ''} onChange={e => set({ cta_url: e.target.value || null })}
                  className={inputCls} placeholder="/dashboard/… أو https://…" dir="ltr" />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={!!state.cta_external} onChange={e => set({ cta_external: e.target.checked })}
                className="h-4 w-4 rounded accent-customBlue" />
              <span className="text-xs font-bold text-deepBlue">فتح في نافذة جديدة</span>
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Full form ────────────────────────────────────────────────────────────────

function UpdateForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: Partial<ProductUpdatePayload & { update_type: UpdateType }>
  onSubmit: (d: ProductUpdatePayload) => void
  onCancel: () => void
  loading: boolean
}) {
  const [title,       setTitle]       = useState(initial?.title ?? '')
  const [body,        setBody]         = useState(initial?.body ?? '')
  const [updateType,  setUpdateType]  = useState<UpdateType>(initial?.update_type ?? 'announcement')
  const [targetRoles, setTargetRoles] = useState<string[]>(initial?.target_roles ?? [])
  const [notifyApp,   setNotifyApp]   = useState(initial?.notify_in_app ?? true)
  const [notifyEmail, setNotifyEmail] = useState(initial?.notify_email ?? false)
  const [extra, setExtra] = useState<Partial<ProductUpdatePayload>>({
    cta_label: initial?.cta_label ?? null,
    cta_url: initial?.cta_url ?? null,
    cta_external: initial?.cta_external ?? false,
    image_url: initial?.image_url ?? null,
    image_before_url: initial?.image_before_url ?? null,
    image_after_url: initial?.image_after_url ?? null,
    maintenance_start: initial?.maintenance_start ?? null,
    maintenance_end: initial?.maintenance_end ?? null,
    affected_services: initial?.affected_services ?? null,
    maintenance_severity: initial?.maintenance_severity ?? null,
    due_date: initial?.due_date ?? null,
    assigned_to_roles: initial?.assigned_to_roles ?? null,
    priority: initial?.priority ?? null,
    requires_acknowledgement: initial?.requires_acknowledgement ?? false,
    problem_description: initial?.problem_description ?? null,
    fix_description: initial?.fix_description ?? null,
    affected_users: initial?.affected_users ?? null,
    related_page_url: initial?.related_page_url ?? null,
  })

  const allRoles = targetRoles.length === 0
  const toggleRole = (r: string) =>
    setTargetRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])

  const patchExtra = (patch: Partial<ProductUpdatePayload>) => setExtra(prev => ({ ...prev, ...patch }))

  const handleTypeChange = (t: UpdateType) => {
    setUpdateType(t)
    // Reset type-specific fields when switching type
    setExtra(prev => ({
      ...prev,
      image_url: null, image_before_url: null, image_after_url: null,
      maintenance_start: null, maintenance_end: null, affected_services: null, maintenance_severity: null,
      due_date: null, assigned_to_roles: null, priority: null, requires_acknowledgement: false,
      problem_description: null, fix_description: null, affected_users: null, related_page_url: null,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) { toast.error('العنوان والمحتوى مطلوبان'); return }
    onSubmit({
      title: title.trim(),
      body: body.trim(),
      category: typeToCategoryDefault(updateType),
      update_type: updateType,
      target_roles: allRoles ? null : targetRoles,
      notify_in_app: notifyApp,
      notify_email: notifyEmail,
      ...extra,
    })
  }

  const tm = UPDATE_TYPE_META[updateType]
  const TypeIcon = tm.icon

  return (
    <form onSubmit={handleSubmit} dir="rtl" className="space-y-5">
      {/* Type selector */}
      <Field label="نوع التحديث" required>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ALL_UPDATE_TYPES.map(t => {
            const m = UPDATE_TYPE_META[t]
            const Icon = m.icon
            const active = updateType === t
            return (
              <button key={t} type="button" onClick={() => handleTypeChange(t)}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-right text-xs font-bold transition',
                  active
                    ? `border-transparent ${m.bg} ${m.color} shadow-sm`
                    : 'border-ink-200 bg-white text-slate-600 hover:bg-slate-50',
                )}>
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{m.label}</span>
              </button>
            )
          })}
        </div>
        {/* Active type badge */}
        <div className={cn('mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black', tm.bg, tm.color)}>
          <TypeIcon className="h-3 w-3" />
          {tm.label}
        </div>
      </Field>

      {/* Title */}
      <Field label="العنوان" required>
        <input value={title} onChange={e => setTitle(e.target.value)} required
          className={inputCls} placeholder="عنوان التحديث…" />
      </Field>

      {/* Body */}
      <Field label="المحتوى / الوصف" required>
        <textarea value={body} onChange={e => setBody(e.target.value)} required rows={5}
          className={textareaCls} placeholder="اكتب تفاصيل التحديث هنا…" />
      </Field>

      {/* Type-specific fields */}
      <TypeSpecificFields type={updateType} state={extra} set={patchExtra} />

      {/* CTA button */}
      <div className="rounded-xl border border-ink-100 bg-slate-50/60 p-4">
        <CtaFields state={extra} set={patchExtra} />
      </div>

      {/* Audience */}
      <div>
        <label className="mb-2 block text-xs font-bold text-deepBlue">الجمهور المستهدف</label>
        <div className="mb-2 flex items-center gap-2">
          <button type="button" onClick={() => setTargetRoles([])}
            className={cn('rounded-lg px-3 py-1.5 text-xs font-bold transition',
              allRoles ? 'bg-customBlue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            الكل
          </button>
          <span className="text-xs text-muted-500">أو اختر أدواراً محددة:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_ROLES.map(r => (
            <button key={r} type="button" onClick={() => toggleRole(r)}
              className={cn('rounded-lg px-3 py-1.5 text-xs font-bold transition',
                targetRoles.includes(r) ? 'bg-deepBlue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {ROLE_LABELS[r] ?? r}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="flex gap-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={notifyApp} onChange={e => setNotifyApp(e.target.checked)}
            className="h-4 w-4 rounded accent-customBlue" />
          <span className="text-xs font-bold text-deepBlue">إشعار داخل المنصة</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)}
            className="h-4 w-4 rounded accent-customBlue" />
          <span className="text-xs font-bold text-deepBlue">بريد إلكتروني</span>
        </label>
      </div>

      {/* Mandatory update notice */}
      {updateType === 'mandatory_update' && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs font-bold text-indigo-700">
          ⚡ هذا التحديث إلزامي — لا يمكن للمستخدم تجاهله. يجب الضغط على "فهمت".
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="rounded-xl border border-ink-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
          إلغاء
        </button>
        <button type="submit" disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-customBlue px-5 py-2.5 text-sm font-bold text-white transition hover:bg-deepBlue disabled:opacity-60">
          {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
          {loading ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
      </div>
    </form>
  )
}

// ─── Type Badge ───────────────────────────────────────────────────────────────

function TypeBadge({ item }: { item: ProductUpdate }) {
  const m = getTypeMeta(item)
  const Icon = m.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold', m.bg, m.color)}>
      <Icon className="h-3 w-3" />
      {m.label}
    </span>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function UpdateDetailDrawer({ item, onClose, onEdit, onPublish, onDelete }: {
  item: ProductUpdate | null
  onClose: () => void
  onEdit: (item: ProductUpdate) => void
  onPublish: (item: ProductUpdate) => void
  onDelete: (item: ProductUpdate) => void
}) {
  if (!item) return null
  const tm = getTypeMeta(item)
  const st = STATUS_META[item.status]

  return (
    <CrudDrawer
      open={!!item}
      title={item.title}
      subtitle={`${tm.label} · ${st.label}`}
      onClose={onClose}
      widthClassName="max-w-xl"
      footerSlot={
        <div className="flex gap-2" dir="rtl">
          {item.status === 'draft' && (
            <button onClick={() => onPublish(item)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700">
              <Send className="h-3.5 w-3.5" /> نشر
            </button>
          )}
          <button onClick={() => onEdit(item)}
            className="flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-deepBlue transition hover:bg-brand-50">
            <Edit2 className="h-3.5 w-3.5" /> تعديل
          </button>
          <button onClick={() => onDelete(item)}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" /> حذف
          </button>
        </div>
      }
    >
      <div className="space-y-5" dir="rtl">
        {/* Badges row */}
        <div className="flex flex-wrap gap-2">
          <TypeBadge item={item} />
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold', st.color)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
            {st.label}
          </span>
          {item.reads_count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              <Eye className="h-3 w-3" /> {item.reads_count} قراءة
            </span>
          )}
          {item.requires_acknowledgement && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              <CheckCircle className="h-3 w-3" /> يتطلب تأكيد
            </span>
          )}
          {item.priority && (
            <span className={cn('inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold', PRIORITY_META[item.priority].color)}>
              أولوية: {PRIORITY_META[item.priority].label}
            </span>
          )}
        </div>

        {/* Dates */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-500">
          {item.published_at && (
            <span>نُشر: {new Date(item.published_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          )}
          {item.due_date && (
            <span className="font-bold text-rose-600">الموعد النهائي: {new Date(item.due_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          )}
          {item.maintenance_start && item.maintenance_end && (
            <span className="font-bold text-amber-600">
              صيانة: {new Date(item.maintenance_start).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} – {new Date(item.maintenance_end).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Target audience */}
        {item.target_roles && item.target_roles.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-bold text-deepBlue">الجمهور المستهدف:</p>
            <div className="flex flex-wrap gap-1.5">
              {item.target_roles.map(r => (
                <span key={r} className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {ROLE_LABELS[r] ?? r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Main body */}
        <div className="rounded-2xl border border-ink-100 bg-slate-50/60 p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-deepBlue/90">{item.body}</p>
        </div>

        {/* Images */}
        {item.image_url && (
          <div>
            <p className="mb-1.5 text-xs font-bold text-deepBlue">لقطة الشاشة:</p>
            <img src={item.image_url} alt="screenshot" className="rounded-xl border border-ink-100 object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
          </div>
        )}
        {(item.image_before_url || item.image_after_url) && (
          <div className="grid grid-cols-2 gap-3">
            {item.image_before_url && (
              <div>
                <p className="mb-1 text-xs font-bold text-slate-500">قبل</p>
                <img src={item.image_before_url} alt="before" className="rounded-xl border border-ink-100 object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
            {item.image_after_url && (
              <div>
                <p className="mb-1 text-xs font-bold text-emerald-600">بعد</p>
                <img src={item.image_after_url} alt="after" className="rounded-xl border border-ink-100 object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>
        )}

        {/* Bug fix details */}
        {(item.problem_description || item.fix_description) && (
          <div className="space-y-2">
            {item.problem_description && (
              <div className="rounded-xl border border-red-100 bg-red-50/60 p-3">
                <p className="mb-1 text-xs font-black text-red-700">المشكلة</p>
                <p className="text-xs text-red-700/80 leading-relaxed">{item.problem_description}</p>
              </div>
            )}
            {item.fix_description && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                <p className="mb-1 text-xs font-black text-emerald-700">الإصلاح</p>
                <p className="text-xs text-emerald-700/80 leading-relaxed">{item.fix_description}</p>
              </div>
            )}
            {item.affected_users && (
              <p className="text-xs text-muted-500">المتأثرون: <span className="font-bold text-deepBlue">{item.affected_users}</span></p>
            )}
          </div>
        )}

        {/* Maintenance details */}
        {item.affected_services && item.affected_services.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-bold text-deepBlue">الخدمات المتأثرة:</p>
            <div className="flex flex-wrap gap-1.5">
              {item.affected_services.map(s => (
                <span key={s} className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{s}</span>
              ))}
            </div>
            {item.maintenance_severity && (
              <p className={cn('mt-1.5 text-xs font-bold', SEVERITY_META[item.maintenance_severity].color)}>
                خطورة: {SEVERITY_META[item.maintenance_severity].label}
              </p>
            )}
          </div>
        )}

        {/* CTA button */}
        {item.cta_url && item.cta_label && (
          <a
            href={item.cta_url}
            target={item.cta_external ? '_blank' : '_self'}
            rel={item.cta_external ? 'noopener noreferrer' : undefined}
            className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-4 py-2.5 text-sm font-bold text-white transition hover:bg-deepBlue"
          >
            {item.cta_label}
            {item.cta_external && <ExternalLink className="h-3.5 w-3.5" />}
          </a>
        )}

        {/* Mandatory banner */}
        {item.update_type === 'mandatory_update' && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs font-bold text-indigo-700">
            ⚡ هذا التحديث إلزامي — يجب على المستخدم الضغط على "فهمت".
          </div>
        )}

        {item.created_by && (
          <p className="text-xs text-muted-400">أنشأه: {item.created_by.name}</p>
        )}
      </div>
    </CrudDrawer>
  )
}

// ─── Table Row ────────────────────────────────────────────────────────────────

function UpdateRow({ item, onView, onEdit, onPublish, onDelete }: {
  item: ProductUpdate
  onView: () => void
  onEdit: () => void
  onPublish: () => void
  onDelete: () => void
}) {
  const st = STATUS_META[item.status]

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group border-b border-ink-100/60 transition hover:bg-brand-50/40"
    >
      <td className="px-4 py-3 text-right">
        <button onClick={onView} className="text-sm font-bold text-deepBlue hover:text-customBlue hover:underline">
          {item.title}
        </button>
        {item.target_roles && item.target_roles.length > 0 && (
          <p className="mt-0.5 text-[11px] text-muted-400">{item.target_roles.map(r => ROLE_LABELS[r] ?? r).join('، ')}</p>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <TypeBadge item={item} />
      </td>
      <td className="px-4 py-3 text-right">
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold', st.color)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
          {st.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-xs text-muted-500">
        {item.published_at
          ? new Date(item.published_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
          <button onClick={onView}    title="عرض"  className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-customBlue"><Eye     className="h-4 w-4" /></button>
          <button onClick={onEdit}    title="تعديل" className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-customBlue"><Edit2   className="h-4 w-4" /></button>
          {item.status === 'draft' && (
            <button onClick={onPublish} title="نشر" className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"><Send className="h-4 w-4" /></button>
          )}
          <button onClick={onDelete}  title="حذف"  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2  className="h-4 w-4" /></button>
        </div>
      </td>
    </motion.tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductUpdatesPage() {
  const { user } = useAuth()

  const [items,        setItems]        = useState<ProductUpdate[]>([])
  const [stats,        setStats]        = useState<{ total: number; published: number; draft: number; archived: number } | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [page,         setPage]         = useState(1)
  const [total,        setTotal]        = useState(0)
  const [lastPage,     setLastPage]     = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter,   setTypeFilter]   = useState<UpdateType | ''>('')
  const [q,            setQ]            = useState('')
  const [savingId,     setSavingId]     = useState<number | null>(null)

  const [createOpen,  setCreateOpen]  = useState(false)
  const [editItem,    setEditItem]    = useState<ProductUpdate | null>(null)
  const [detailItem,  setDetailItem]  = useState<ProductUpdate | null>(null)
  const [confirmItem, setConfirmItem] = useState<{ item: ProductUpdate; action: 'publish' | 'delete' } | null>(null)

  const canManage = user?.role === 'super_admin' || user?.role === 'tech_admin'
    || user?.role === 'admin' || user?.role === 'marketing_manager'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [listRes, statsRes] = await Promise.allSettled([
        fetchProductUpdates({ page, per_page: 20, status: statusFilter as any || undefined, q: q || undefined }),
        canManage ? fetchProductUpdateStats() : Promise.resolve(null),
      ])
      if (listRes.status === 'fulfilled') {
        setItems(listRes.value.data)
        setTotal(listRes.value.meta.total)
        setLastPage(listRes.value.meta.last_page)
      }
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value)
      }
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, q, canManage])

  useEffect(() => { load() }, [load])

  const handleCreate = async (payload: ProductUpdatePayload) => {
    setSavingId(-1)
    try {
      await createProductUpdate(payload)
      toast.success('تم إنشاء التحديث')
      setCreateOpen(false)
      load()
    } catch { toast.error('فشل في الإنشاء') }
    finally { setSavingId(null) }
  }

  const handleEdit = async (payload: ProductUpdatePayload) => {
    if (!editItem) return
    setSavingId(editItem.id)
    try {
      await updateProductUpdate(editItem.id, payload)
      toast.success('تم التعديل')
      setEditItem(null)
      load()
    } catch { toast.error('فشل في التعديل') }
    finally { setSavingId(null) }
  }

  const handlePublish = async (item: ProductUpdate) => {
    setSavingId(item.id)
    try {
      await publishProductUpdate(item.id)
      toast.success('تم نشر التحديث')
      setConfirmItem(null)
      setDetailItem(null)
      load()
    } catch { toast.error('فشل في النشر') }
    finally { setSavingId(null) }
  }

  const handleDelete = async (item: ProductUpdate) => {
    setSavingId(item.id)
    try {
      await deleteProductUpdate(item.id)
      toast.success('تم الحذف')
      setConfirmItem(null)
      setDetailItem(null)
      load()
    } catch { toast.error('فشل في الحذف') }
    finally { setSavingId(null) }
  }

  // Client-side type filter (server doesn't support update_type filter yet)
  const displayItems = typeFilter
    ? items.filter(i => i.update_type === typeFilter)
    : items

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/30 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-deepBlue">تحديثات المنصة</h1>
          <p className="mt-1 text-sm font-semibold text-muted-500">أعلن عن الميزات الجديدة والتحسينات لمستخدمي المنصة</p>
        </div>
        {canManage && (
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-customBlue px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-customBlue/25 transition hover:bg-deepBlue">
            <Plus className="h-4 w-4" /> تحديث جديد
          </button>
        )}
      </div>

      {/* KPI Strip */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCards items={[
            { label: 'إجمالي التحديثات', value: stats.total,     tone: 'blue'    },
            { label: 'منشور',            value: stats.published,  tone: 'success' },
            { label: 'مسودة',            value: stats.draft,      tone: 'slate'   },
            { label: 'مؤرشف',            value: stats.archived,   tone: 'danger'  },
          ]} />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={q} onChange={e => { setQ(e.target.value); setPage(1) }}
            placeholder="ابحث عن تحديث…"
            className="w-full max-w-xs rounded-xl border border-ink-200 px-3 py-2 text-sm text-right text-deepBlue placeholder-muted-400 focus:border-customBlue focus:outline-none focus:ring-2 focus:ring-customBlue/20 sm:w-64"
          />
          <div className="flex flex-wrap gap-1.5">
            {(['', 'draft', 'published', 'archived'] as const).map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                className={cn('rounded-xl px-3 py-1.5 text-xs font-bold transition',
                  statusFilter === s ? 'bg-customBlue text-white' : 'bg-white border border-ink-200 text-slate-600 hover:bg-slate-50')}>
                {s === '' ? 'الكل' : STATUS_META[s as ProductUpdateStatus].label}
              </button>
            ))}
          </div>
          <button onClick={load} className="rounded-xl border border-ink-200 bg-white p-2 text-slate-500 transition hover:bg-brand-50 hover:text-customBlue">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Type filter pills */}
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setTypeFilter('')}
            className={cn('rounded-xl px-3 py-1.5 text-xs font-bold transition',
              typeFilter === '' ? 'bg-deepBlue text-white' : 'bg-white border border-ink-200 text-slate-600 hover:bg-slate-50')}>
            كل الأنواع
          </button>
          {ALL_UPDATE_TYPES.map(t => {
            const m = UPDATE_TYPE_META[t]
            const Icon = m.icon
            return (
              <button key={t} onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                className={cn('inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition',
                  typeFilter === t ? `${m.bg} ${m.color}` : 'bg-white border border-ink-200 text-slate-600 hover:bg-slate-50')}>
                <Icon className="h-3 w-3" />
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_2px_16px_rgba(15,23,42,0.06)]">
        {loading && items.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-customBlue" />
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-400">
            <Megaphone className="h-10 w-10 opacity-30" />
            <p className="text-sm font-bold">لا توجد تحديثات</p>
            {canManage && (
              <button onClick={() => setCreateOpen(true)} className="text-sm font-bold text-customBlue hover:underline">
                أنشئ أول تحديث
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-100 bg-slate-50/60">
                  {['العنوان', 'النوع', 'الحالة', 'تاريخ النشر', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-black text-muted-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {displayItems.map(item => (
                    <UpdateRow
                      key={item.id}
                      item={item}
                      onView={() => setDetailItem(item)}
                      onEdit={() => setEditItem(item)}
                      onPublish={() => setConfirmItem({ item, action: 'publish' })}
                      onDelete={() => setConfirmItem({ item, action: 'delete' })}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm" dir="rtl">
          <span className="text-muted-500">{total} تحديث إجمالاً</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 font-bold text-deepBlue disabled:opacity-40 hover:bg-brand-50">
              السابق
            </button>
            <span className="flex items-center px-2 text-muted-500">{page} / {lastPage}</span>
            <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}
              className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 font-bold text-deepBlue disabled:opacity-40 hover:bg-brand-50">
              التالي
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CrudModal open={createOpen} title="تحديث جديد" subtitle="اختر نوع التحديث وأضف تفاصيله" onClose={() => setCreateOpen(false)}>
        <UpdateForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} loading={savingId === -1} />
      </CrudModal>

      {/* Edit Modal */}
      <CrudModal open={!!editItem} title="تعديل التحديث" onClose={() => setEditItem(null)}>
        {editItem && (
          <UpdateForm
            initial={editItem}
            onSubmit={handleEdit}
            onCancel={() => setEditItem(null)}
            loading={savingId === editItem.id}
          />
        )}
      </CrudModal>

      {/* Detail Drawer */}
      <UpdateDetailDrawer
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onEdit={item => { setDetailItem(null); setEditItem(item) }}
        onPublish={item => setConfirmItem({ item, action: 'publish' })}
        onDelete={item => setConfirmItem({ item, action: 'delete' })}
      />

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmItem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm" onClick={() => setConfirmItem(null)} />
            <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                dir="rtl" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
                <p className="text-base font-black text-deepBlue">
                  {confirmItem.action === 'publish' ? 'نشر التحديث؟' : 'حذف التحديث؟'}
                </p>
                <p className="mt-2 text-sm text-muted-500">
                  {confirmItem.action === 'publish'
                    ? `سيتم نشر "${confirmItem.item.title}" وإرسال إشعارات للمستخدمين المستهدفين.`
                    : `سيتم حذف "${confirmItem.item.title}" نهائياً.`}
                </p>
                <div className="mt-5 flex justify-end gap-3">
                  <button onClick={() => setConfirmItem(null)}
                    className="rounded-xl border border-ink-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                    إلغاء
                  </button>
                  <button
                    onClick={() => confirmItem.action === 'publish' ? handlePublish(confirmItem.item) : handleDelete(confirmItem.item)}
                    disabled={savingId === confirmItem.item.id}
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60',
                      confirmItem.action === 'publish' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700',
                    )}>
                    {savingId === confirmItem.item.id && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    {confirmItem.action === 'publish' ? 'نشر' : 'حذف'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
