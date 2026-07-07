import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  ClipboardList,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import {
  fetchAdminModules,
  fetchAdminLessons,
  fetchAdminQuizzes,
  adminGetModule,
  adminCreateModule,
  adminUpdateModule,
  adminDeleteModule,
  adminCreateLesson,
  adminUpdateLesson,
  adminDeleteLesson,
} from '@/api/advancedLmsApi'
import EmptyState from '@/components/dashboard/EmptyState'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { fmtDate, fmtNum, normCourseTitle } from '@/components/lms/lmsFormatters'
import { CourseSelectField } from '@/components/lms/CourseSelectField'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import toast from '@/lib/toast'
import type { LmsLesson, LmsModule, LmsQuiz } from '@/types/platform'

// ── Types ────────────────────────────────────────────────────────────────────

type ModuleRow = LmsModule & {
  description?: string | null
  status?: string | null
  is_active?: boolean | null
  course?: { id: number; title: string; slug?: string } | null
  course_title?: string | null
  course_name?: string | null
  lessons?: { id: number; title?: string }[]
  lessons_count?: number | null
  sessions?: { id: number; title?: string; session_date?: string }[]
  sessions_count?: number | null
  materials?: { id: number; title?: string; type?: string }[]
  materials_count?: number | null
  assignments?: { id: number; title?: string; due_date?: string }[]
  assignments_count?: number | null
  created_at?: string | null
  updated_at?: string | null
}

type ModuleForm = {
  course_id: number | null
  title: string
  description: string
  sort_order: string
  status: string
}

const EMPTY_FORM: ModuleForm = {
  course_id: null,
  title: '',
  description: '',
  sort_order: '',
  status: 'active',
}

const STATUS_OPTIONS = [
  { value: 'active',   label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
  { value: 'draft',    label: 'مسودة' },
]

const fieldCls =
  'w-full rounded-xl border border-[#22334A]/10 bg-[#22334A]/[0.02] px-3 py-2.5 text-sm font-semibold text-[#22334A] outline-none focus:border-[#2691C2]/40 focus:ring-2 focus:ring-[#2691C2]/10'

// ── Module Modal ─────────────────────────────────────────────────────────────

function ModuleModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: ModuleRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState<ModuleForm>(() =>
    initial
      ? {
          course_id: initial.course_id ?? null,
          title: initial.title ?? '',
          description: initial.description ?? '',
          sort_order: initial.sort_order != null ? String(initial.sort_order) : '',
          status: initial.status ?? 'active',
        }
      : EMPTY_FORM,
  )
  const [errors, setErrors] = useState<Partial<Record<keyof ModuleForm, string>>>({})
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof ModuleForm>(k: K, v: ModuleForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!form.title.trim()) errs.title = 'العنوان مطلوب'
    if (!form.course_id) errs.course_id = 'يجب اختيار دورة'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const body = {
        title: form.title.trim(),
        course_id: form.course_id!,
        description: form.description.trim() || undefined,
        sort_order: form.sort_order ? Number(form.sort_order) : undefined,
        status: form.status,
      }
      if (isEdit && initial?.id) {
        await adminUpdateModule(initial.id, body)
      } else {
        await adminCreateModule(body)
      }
      toast.success(isEdit ? 'تم تحديث الوحدة بنجاح' : 'تمت إضافة الوحدة بنجاح')
      onSaved()
      onClose()
    } catch {
      toast.error('تعذّر حفظ الوحدة')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-[#22334A]/[0.08]"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#22334A]/[0.06] px-6 py-4">
          <h2 className="text-[15px] font-black text-[#22334A]">
            {isEdit ? 'تعديل الوحدة' : 'إضافة وحدة تعليمية'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#22334A]/40 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="space-y-4 px-6 py-5">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">
                عنوان الوحدة <span className="text-rose-500">*</span>
              </label>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="أدخل عنوان الوحدة"
                className={[fieldCls, errors.title ? 'border-rose-300 ring-1 ring-rose-200' : ''].join(' ')}
              />
              {errors.title && (
                <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.title}</p>
              )}
            </div>

            {/* Course */}
            <CourseSelectField
              value={form.course_id}
              onChange={(id) => set('course_id', id)}
              label="الدورة"
              required
              error={errors.course_id}
            />

            {/* Status */}
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">الحالة</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className={fieldCls}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort order */}
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">ترتيب العرض</label>
              <input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => set('sort_order', e.target.value)}
                placeholder="1"
                dir="ltr"
                className={`${fieldCls} text-left`}
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">الوصف</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                placeholder="وصف اختياري للوحدة..."
                className={`${fieldCls} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#22334A]/[0.05] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#22334A]/10 px-5 py-2 text-[12px] font-black text-[#22334A] hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#2691C2] px-5 py-2 text-[12px] font-black text-white shadow hover:bg-[#2691C2]/90 disabled:opacity-50"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            {saving ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التغييرات' : 'إضافة الوحدة'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Module Card ──────────────────────────────────────────────────────────────

function statusChip(status: string | null | undefined) {
  if (status === 'inactive')
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">غير نشط</span>
  if (status === 'draft')
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-600 ring-1 ring-amber-200">مسودة</span>
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200">
      نشط
    </span>
  )
}

function ModuleCard({
  m,
  onEdit,
  onDelete,
  onView,
  deleting,
}: {
  m: ModuleRow
  onEdit: (m: ModuleRow) => void
  onDelete: (m: ModuleRow) => void
  onView: (m: ModuleRow) => void
  deleting: number | null
}) {
  const courseLabel = m.course?.title ?? normCourseTitle(m.course_title ?? m.course_name)
  const lessonsCount = m.lessons_count ?? m.lessons?.length ?? 0
  const sessionsCount = m.sessions_count ?? m.sessions?.length ?? 0
  const materialsCount = m.materials_count ?? m.materials?.length ?? 0
  const assignmentsCount = m.assignments_count ?? m.assignments?.length ?? 0

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="group flex flex-col rounded-2xl border border-[#22334A]/6 bg-white shadow-sm transition hover:border-[#2691C2]/20 hover:shadow-md"
    >
      {/* Card header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2691C2]/10 ring-1 ring-[#22334A]/6">
          <Layers size={17} className="text-[#2691C2]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-[13px] font-bold leading-snug text-[#22334A]">{m.title ?? '—'}</p>
            {statusChip(m.status)}
          </div>
          {courseLabel && (
            <div className="mt-1 flex items-center gap-1">
              <GraduationCap size={11} className="shrink-0 text-[#2691C2]" aria-hidden />
              <p className="line-clamp-1 text-[11px] font-bold text-[#2691C2]">{courseLabel}</p>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {m.description && (
        <p className="px-4 pb-2 text-[11px] leading-relaxed text-[#22334A]/45 line-clamp-2">{m.description}</p>
      )}

      {/* Content count pills */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
          <BookOpen size={9} aria-hidden /> {lessonsCount} درس
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
          <Video size={9} aria-hidden /> {sessionsCount} جلسة
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          <FileText size={9} aria-hidden /> {materialsCount} مادة
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          <ClipboardList size={9} aria-hidden /> {assignmentsCount} واجب
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-[#22334A]/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-medium text-[#22334A]/30">{fmtDate(m.created_at ?? m.updated_at)}</p>
          {m.sort_order != null && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">#{m.sort_order}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onView(m)}
            className="rounded-lg p-1.5 text-[#22334A]/40 transition hover:bg-[#2691C2]/10 hover:text-[#2691C2]"
            title="عرض التفاصيل"
          >
            <Eye size={13} />
          </button>
          <button
            type="button"
            onClick={() => onEdit(m)}
            className="rounded-lg p-1.5 text-[#22334A]/40 transition hover:bg-[#2691C2]/10 hover:text-[#2691C2]"
            title="تعديل"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(m)}
            disabled={deleting === m.id}
            className="rounded-lg p-1.5 text-[#22334A]/40 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            title="حذف"
          >
            {deleting === m.id ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Module Drawer ────────────────────────────────────────────────────────────

const DRAWER_TABS = [
  { key: 'overview',     label: 'نظرة عامة',   icon: Layers },
  { key: 'lessons',      label: 'الدروس',       icon: BookOpen },
  { key: 'sessions',     label: 'الجلسات',      icon: Video },
  { key: 'materials',    label: 'المواد',        icon: FileText },
  { key: 'assignments',  label: 'الواجبات',     icon: ClipboardList },
] as const

type DrawerTab = typeof DRAWER_TABS[number]['key']

function ModuleDrawer({
  module: initial,
  onClose,
  onEdit,
}: {
  module: ModuleRow
  onClose: () => void
  onEdit: (m: ModuleRow) => void
}) {
  const [tab, setTab] = useState<DrawerTab>('overview')
  const [detail, setDetail] = useState<ModuleRow>(initial)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setDetail(initial)
    setLoading(true)
    adminGetModule(initial.id)
      .then((d) => setDetail(d as ModuleRow))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [initial.id])

  const courseLabel = detail.course?.title ?? normCourseTitle(detail.course_title ?? detail.course_name)

  return (
    <AnimatePresence>
      <motion.div
        key="drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        key="drawer-panel"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed inset-y-0 left-0 z-[56] flex w-full max-w-lg flex-col bg-white shadow-2xl"
        dir="rtl"
      >
        {/* Drawer header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#22334A]/8 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#2691C2]">وحدة تعليمية</p>
            <h2 className="mt-0.5 line-clamp-2 text-[15px] font-black text-[#22334A]">{detail.title}</h2>
            {courseLabel && (
              <div className="mt-1 flex items-center gap-1">
                <GraduationCap size={11} className="text-[#2691C2]" />
                <span className="text-[11px] font-bold text-[#2691C2]">{courseLabel}</span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => { onEdit(detail); onClose() }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#22334A]/10 px-3 py-1.5 text-[11px] font-black text-[#22334A] transition hover:bg-slate-50"
            >
              <Pencil size={11} /> تعديل
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#22334A]/40 hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 overflow-x-auto border-b border-[#22334A]/8 px-4">
          {DRAWER_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-[11px] font-black transition',
                tab === key
                  ? 'border-[#2691C2] text-[#2691C2]'
                  : 'border-transparent text-[#22334A]/45 hover:text-[#22334A]',
              ].join(' ')}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Drawer body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[#2691C2]" />
            </div>
          )}

          {!loading && tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'الحالة',     value: detail.status === 'active' ? 'نشط' : detail.status === 'draft' ? 'مسودة' : 'غير نشط' },
                  { label: 'الترتيب',    value: detail.sort_order != null ? String(detail.sort_order) : '—' },
                  { label: 'تاريخ الإنشاء', value: fmtDate(detail.created_at) || '—' },
                  { label: 'آخر تحديث',  value: fmtDate(detail.updated_at) || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-[#22334A]/6 bg-slate-50 p-3">
                    <p className="text-[10px] font-black text-[#22334A]/40">{label}</p>
                    <p className="mt-0.5 text-[13px] font-bold text-[#22334A]">{value}</p>
                  </div>
                ))}
              </div>
              {detail.description && (
                <div className="rounded-xl border border-[#22334A]/6 bg-slate-50 p-4">
                  <p className="mb-1 text-[10px] font-black text-[#22334A]/40">الوصف</p>
                  <p className="text-[13px] leading-relaxed text-[#22334A]/70">{detail.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'دروس',   count: detail.lessons_count ?? detail.lessons?.length ?? 0,     color: 'bg-blue-50 text-blue-700' },
                  { label: 'جلسات',  count: detail.sessions_count ?? detail.sessions?.length ?? 0,   color: 'bg-violet-50 text-violet-700' },
                  { label: 'مواد',   count: detail.materials_count ?? detail.materials?.length ?? 0,  color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'واجبات', count: detail.assignments_count ?? detail.assignments?.length ?? 0, color: 'bg-amber-50 text-amber-700' },
                ].map(({ label, count, color }) => (
                  <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
                    <p className="text-xl font-black">{count}</p>
                    <p className="text-[10px] font-bold opacity-70">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && tab === 'lessons' && (
            <DrawerList
              items={detail.lessons ?? []}
              label="درس"
              emptyText="لا توجد دروس في هذه الوحدة"
              renderItem={(l: { id: number; title?: string; sort_order?: number; status?: string }) => (
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <BookOpen size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold text-[#22334A]">{l.title ?? `درس ${l.id}`}</p>
                    {l.sort_order != null && <p className="text-[10px] text-[#22334A]/40">ترتيب {l.sort_order}</p>}
                  </div>
                  {l.status && <span className="text-[10px] font-bold text-slate-400">{l.status}</span>}
                </div>
              )}
            />
          )}

          {!loading && tab === 'sessions' && (
            <DrawerList
              items={detail.sessions ?? []}
              label="جلسة"
              emptyText="لا توجد جلسات في هذه الوحدة"
              renderItem={(s: { id: number; title?: string; session_date?: string; status?: string }) => (
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Video size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold text-[#22334A]">{s.title ?? `جلسة ${s.id}`}</p>
                    {s.session_date && <p className="text-[10px] text-[#22334A]/40">{fmtDate(s.session_date)}</p>}
                  </div>
                  {s.status && <span className="text-[10px] font-bold text-slate-400">{s.status}</span>}
                </div>
              )}
            />
          )}

          {!loading && tab === 'materials' && (
            <DrawerList
              items={detail.materials ?? []}
              label="مادة"
              emptyText="لا توجد مواد في هذه الوحدة"
              renderItem={(mat: { id: number; title?: string; type?: string }) => (
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <FileText size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold text-[#22334A]">{mat.title ?? `مادة ${mat.id}`}</p>
                    {mat.type && <p className="text-[10px] text-[#22334A]/40">{mat.type}</p>}
                  </div>
                </div>
              )}
            />
          )}

          {!loading && tab === 'assignments' && (
            <DrawerList
              items={detail.assignments ?? []}
              label="واجب"
              emptyText="لا توجد واجبات في هذه الوحدة"
              renderItem={(a: { id: number; title?: string; due_date?: string }) => (
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <ClipboardList size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold text-[#22334A]">{a.title ?? `واجب ${a.id}`}</p>
                    {a.due_date && <p className="text-[10px] text-[#22334A]/40">الموعد النهائي: {fmtDate(a.due_date)}</p>}
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function DrawerList<T>({
  items,
  label,
  emptyText,
  renderItem,
}: {
  items: T[]
  label: string
  emptyText: string
  renderItem: (item: T) => React.ReactNode
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-[13px] font-semibold text-[#22334A]/35">{emptyText}</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <p className="mb-3 text-[11px] font-black text-[#22334A]/40">{items.length} {label}</p>
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-[#22334A]/6 bg-white p-3 hover:bg-slate-50">
          {renderItem(item)}
        </div>
      ))}
    </div>
  )
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[#22334A]/6 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wider text-[#22334A]/40">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#22334A]">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] font-semibold text-[#22334A]/30">{sub}</p>}
    </div>
  )
}

// ── AdminModulesPage ─────────────────────────────────────────────────────────

export function AdminModulesPage() {
  const [rows, setRows] = useState<ModuleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCourseId, setFilterCourseId] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<ModuleRow | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<ModuleRow | null>(null)
  const [drawerModule, setDrawerModule] = useState<ModuleRow | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchAdminModules()
      .then((list) => setRows(list as ModuleRow[]))
      .catch(() => setError('تعذّر تحميل الوحدات. تحقق من الاتصال وأعد المحاولة.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(m: ModuleRow) {
    setDeleting(m.id)
    try {
      await adminDeleteModule(m.id)
      toast.success('تم حذف الوحدة بنجاح')
      setRows((prev) => prev.filter((r) => r.id !== m.id))
    } catch {
      toast.error('تعذّر حذف الوحدة')
    } finally {
      setDeleting(null)
      setConfirmDeleteTarget(null)
    }
  }

  const filtered = useMemo(() => {
    let out = rows
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      out = out.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          (r.course_title ?? r.course_name)?.toLowerCase().includes(q),
      )
    }
    if (filterStatus) out = out.filter((r) => (r.status ?? 'active') === filterStatus)
    if (filterCourseId) out = out.filter((r) => String(r.course_id) === filterCourseId)
    out = [...out].sort((a, b) => {
      const diff = (a.sort_order ?? 0) - (b.sort_order ?? 0)
      return sortDir === 'asc' ? diff : -diff
    })
    return out
  }, [rows, search, filterStatus, filterCourseId, sortDir])

  // Stats
  const totalModules = rows.length
  const activeModules = rows.filter((r) => !r.status || r.status === 'active').length
  const uniqueCourses = new Set(rows.map((r) => r.course_id).filter(Boolean)).size

  const activeFilters = [search, filterStatus, filterCourseId].filter(Boolean).length

  return (
    <AdminLmsShell title="إدارة الوحدات" description="مصدر البيانات الموحد مع صفحة محتوى الدورة" breadcrumb="الوحدات">
      <div dir="rtl" className="space-y-6 text-right">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#2691C2]">Admin LMS</p>
            <h1 className="text-2xl font-black text-[#22334A]">إدارة الوحدات</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              إنشاء وتعديل وحذف وحدات الدورات — مصدر البيانات الموحد مع صفحة محتوى الدورة.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#22334A]/10 bg-white px-4 py-2.5 text-[12px] font-bold text-[#22334A] shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden />
              تحديث
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2691C2] px-4 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:bg-[#2691C2]/90"
            >
              <Plus size={14} aria-hidden />
              وحدة جديدة
            </button>
          </div>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="إجمالي الوحدات" value={totalModules} />
          <StatCard label="وحدات نشطة" value={activeModules} sub={`${totalModules > 0 ? Math.round((activeModules / totalModules) * 100) : 0}٪ من الإجمالي`} />
          <StatCard label="دورات مغطاة" value={uniqueCourses} sub="دورة مرتبطة" />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#22334A]/6 bg-white p-4 shadow-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الوحدات..."
            className="min-w-[180px] flex-1 rounded-xl border border-[#22334A]/10 bg-[#22334A]/[0.02] px-3 py-2 text-sm font-semibold text-[#22334A] outline-none focus:border-[#2691C2]/40 focus:ring-2 focus:ring-[#2691C2]/10"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-[#22334A]/10 bg-white px-3 py-2 text-[12px] font-black text-[#22334A] outline-none focus:border-[#2691C2]/40"
          >
            <option value="">كل الحالات</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#22334A]/10 bg-white px-3 py-2 text-[12px] font-black text-[#22334A] transition hover:bg-slate-50"
            title="ترتيب حسب sort_order"
          >
            {sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            الترتيب
          </button>
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={() => { setSearch(''); setFilterStatus(''); setFilterCourseId('') }}
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-black text-rose-600 transition hover:bg-rose-100"
            >
              مسح الفلاتر ({activeFilters})
            </button>
          )}
        </div>

        {/* Content */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center text-sm font-bold text-rose-700">
            {error}
            <button
              type="button"
              onClick={load}
              className="ms-3 underline underline-offset-2"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="flex min-h-[16rem] items-center justify-center rounded-2xl border border-[#22334A]/6 bg-white">
            <Loader2 className="h-10 w-10 animate-spin text-[#2691C2]" aria-hidden />
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#22334A]/12 bg-white p-12 text-center">
            <Layers className="mx-auto mb-3 h-10 w-10 text-[#22334A]/15" aria-hidden />
            <p className="text-[13px] font-semibold text-[#22334A]/50">
              {rows.length === 0 ? 'لا توجد وحدات — أنشئ وحدتك الأولى الآن.' : 'لا نتائج تطابق الفلاتر الحالية.'}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <ModuleCard
                  m={m}
                  onEdit={setEditTarget}
                  onDelete={setConfirmDeleteTarget}
                  onView={setDrawerModule}
                  deleting={deleting}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Results count */}
        {!loading && !error && rows.length > 0 && (
          <p className="text-[11px] font-semibold text-[#22334A]/35">
            عرض {filtered.length} من {rows.length} وحدة
          </p>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <ModuleModal
          onClose={() => setShowCreate(false)}
          onSaved={load}
        />
      )}
      {editTarget && (
        <ModuleModal
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={load}
        />
      )}

      <ConfirmDeleteModal
        open={!!confirmDeleteTarget}
        title="حذف الوحدة"
        description="سيتم حذف الوحدة وجميع محتوياتها من دروس وجلسات ومواد وواجبات. هذا الإجراء لا يمكن التراجع عنه."
        itemLabel={confirmDeleteTarget?.title}
        busy={deleting === confirmDeleteTarget?.id}
        onClose={() => setConfirmDeleteTarget(null)}
        onConfirm={() => { if (confirmDeleteTarget) void handleDelete(confirmDeleteTarget) }}
      />

      {drawerModule && (
        <ModuleDrawer
          module={drawerModule}
          onClose={() => setDrawerModule(null)}
          onEdit={(m) => { setDrawerModule(null); setEditTarget(m) }}
        />
      )}
    </AdminLmsShell>
  )
}

// ── AdminLessonsPage ─────────────────────────────────────────────────────────

type LessonRow = LmsLesson & {
  description?: string | null
  video_url?: string | null
  duration_minutes?: number | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
  course_title?: string | null
  course_name?: string | null
  module_title?: string | null
}

type LessonForm = {
  module_id: number | null
  title: string
  description: string
  video_url: string
  duration_minutes: string
  sort_order: string
  status: string
}

const EMPTY_LESSON_FORM: LessonForm = {
  module_id: null, title: '', description: '',
  video_url: '', duration_minutes: '', sort_order: '', status: 'active',
}

const LESSON_STATUS_OPTIONS = [
  { value: 'active',   label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
  { value: 'draft',    label: 'مسودة' },
]

const LESSON_STATUS_BADGE: Record<string, string> = {
  active:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  inactive: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  draft:    'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
}

const LESSON_STATUS_LABEL: Record<string, string> = {
  active: 'نشط', inactive: 'غير نشط', draft: 'مسودة',
}

const lfieldCls = 'w-full rounded-xl border border-[#22334A]/10 bg-[#22334A]/[0.02] px-3 py-2.5 text-sm font-semibold text-[#22334A] outline-none focus:border-[#2691C2]/40 focus:ring-2 focus:ring-[#2691C2]/10'

function LessonModal({
  initial,
  modules,
  onClose,
  onSaved,
}: {
  initial?: LessonRow | null
  modules: LmsModule[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState<LessonForm>(() =>
    initial
      ? {
          module_id: initial.module_id ?? null,
          title: initial.title ?? '',
          description: (initial as LessonRow).description ?? '',
          video_url: (initial as LessonRow).video_url ?? '',
          duration_minutes: String((initial as LessonRow).duration_minutes ?? ''),
          sort_order: String(initial.sort_order ?? ''),
          status: (initial as LessonRow).status ?? 'active',
        }
      : EMPTY_LESSON_FORM
  )
  const [errors, setErrors] = useState<Partial<Record<keyof LessonForm, string>>>({})
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof LessonForm>(k: K, v: LessonForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof LessonForm, string>> = {}
    if (!form.title.trim()) errs.title = 'العنوان مطلوب'
    if (!form.module_id) errs.module_id = 'يجب اختيار وحدة'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const body = {
        module_id: form.module_id!,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        video_url: form.video_url.trim() || undefined,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
        sort_order: form.sort_order ? Number(form.sort_order) : undefined,
        status: form.status,
      }
      if (isEdit && initial) {
        await adminUpdateLesson(initial.id, body)
        toast.success('تم تحديث الدرس')
      } else {
        await adminCreateLesson(body)
        toast.success('تم إنشاء الدرس')
      }
      onSaved()
    } catch {
      toast.error('تعذّر حفظ الدرس')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-[#22334A]/[0.08]" dir="rtl">
        <div className="flex items-center justify-between border-b border-[#22334A]/[0.06] px-6 py-4">
          <h2 className="text-[15px] font-black text-[#22334A]">
            {isEdit ? 'تعديل الدرس' : 'إنشاء درس جديد'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#22334A]/40 hover:bg-slate-100 hover:text-[#22334A]">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="space-y-4 px-6 py-5">
            {/* Module */}
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">الوحدة <span className="text-rose-500">*</span></label>
              <select
                value={form.module_id ?? ''}
                onChange={(e) => set('module_id', e.target.value ? Number(e.target.value) : null)}
                className={[lfieldCls, errors.module_id ? 'border-rose-300 ring-1 ring-rose-200' : ''].join(' ')}
              >
                <option value="">— اختر وحدة —</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}{(m as ModuleRow).course_title ? ` (${(m as ModuleRow).course_title})` : ''}
                  </option>
                ))}
              </select>
              {errors.module_id && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.module_id}</p>}
            </div>

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">عنوان الدرس <span className="text-rose-500">*</span></label>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="أدخل عنوان الدرس"
                className={[lfieldCls, errors.title ? 'border-rose-300 ring-1 ring-rose-200' : ''].join(' ')}
              />
              {errors.title && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">الوصف</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
                placeholder="وصف اختياري للدرس..."
                className={`${lfieldCls} resize-none`}
              />
            </div>

            {/* Video URL */}
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">رابط الفيديو</label>
              <input
                type="url"
                dir="ltr"
                value={form.video_url}
                onChange={(e) => set('video_url', e.target.value)}
                placeholder="https://..."
                className={`${lfieldCls} text-left`}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">المدة (دقيقة)</label>
                <input
                  type="number"
                  min="0"
                  value={form.duration_minutes}
                  onChange={(e) => set('duration_minutes', e.target.value)}
                  placeholder="0"
                  className={lfieldCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">الترتيب</label>
                <input
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(e) => set('sort_order', e.target.value)}
                  placeholder="0"
                  className={lfieldCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-black text-[#22334A]/60">الحالة</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className={lfieldCls}>
                  {LESSON_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#22334A]/[0.05] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#22334A]/10 px-5 py-2 text-[12px] font-black text-[#22334A] hover:bg-slate-50">
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#2691C2] px-5 py-2 text-[12px] font-black text-white shadow hover:bg-[#2691C2]/90 disabled:opacity-50"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            {saving ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التغييرات' : 'إنشاء الدرس'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LessonCard({
  row,
  onEdit,
  onDelete,
  deleting,
}: {
  row: LessonRow
  onEdit: (r: LessonRow) => void
  onDelete: (r: LessonRow) => void
  deleting: number | null
}) {
  const hasVideo = Boolean(row.video_url)
  const statusCls = LESSON_STATUS_BADGE[row.status ?? ''] ?? 'bg-slate-100 text-slate-500'
  const statusLabel = LESSON_STATUS_LABEL[row.status ?? ''] ?? (row.status ?? '—')

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="group flex items-start gap-4 rounded-2xl border border-[#22334A]/6 bg-white p-4 shadow-sm transition hover:border-[#2691C2]/20 hover:shadow-md"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${hasVideo ? 'bg-violet-50' : 'bg-[#2691C2]/8'} ring-1 ring-[#22334A]/6`}>
        {hasVideo
          ? <Play size={18} className="text-violet-600" />
          : <BookOpen size={18} className="text-[#2691C2]" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-bold text-[#22334A]">{row.title ?? '—'}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${statusCls}`}>
            {statusLabel}
          </span>
        </div>
        {(row.module_title || row.course_title || row.course_name) && (
          <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-[#2691C2]/80">
            {row.module_title ?? '—'}
            {(row.course_title ?? row.course_name) ? ` · ${normCourseTitle(row.course_title ?? row.course_name)}` : ''}
          </p>
        )}
        {row.description && (
          <p className="mt-1 line-clamp-2 text-xs text-[#22334A]/40">{row.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-medium text-[#22334A]/35">{fmtDate(row.created_at ?? row.updated_at)}</p>
            {row.duration_minutes ? (
              <span className="flex items-center gap-1 text-[11px] font-medium text-[#22334A]/35">
                <Clock size={10} />
                {row.duration_minutes} د
              </span>
            ) : null}
            {row.sort_order != null && (
              <span className="text-[11px] font-medium text-[#22334A]/25">#{row.sort_order}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(row)}
              className="rounded-lg p-1.5 text-[#22334A]/40 transition hover:bg-[#2691C2]/10 hover:text-[#2691C2]"
              title="تعديل"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(row)}
              disabled={deleting === row.id}
              className="rounded-lg p-1.5 text-[#22334A]/40 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="حذف"
            >
              {deleting === row.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function AdminLessonsPage() {
  const [rows, setRows] = useState<LessonRow[]>([])
  const [modules, setModules] = useState<LmsModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [modal, setModal] = useState<'create' | LessonRow | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetchAdminLessons(), fetchAdminModules()])
      .then(([lessons, mods]) => {
        setRows(lessons as LessonRow[])
        setModules(mods)
      })
      .catch(() => setError('تعذّر تحميل الدروس'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (q && !r.title?.toLowerCase().includes(q) && !r.description?.toLowerCase().includes(q) && !r.module_title?.toLowerCase().includes(q)) return false
      if (filterStatus && r.status !== filterStatus) return false
      if (filterModule && String(r.module_id) !== filterModule) return false
      return true
    })
  }, [rows, search, filterStatus, filterModule])

  const total    = rows.length
  const active   = rows.filter((r) => r.status === 'active').length
  const draft    = rows.filter((r) => r.status === 'draft').length
  const withVideo = rows.filter((r) => r.video_url).length

  const moduleOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts = [{ value: '', label: 'كل الوحدات' }]
    for (const m of modules) {
      if (!seen.has(String(m.id))) {
        seen.add(String(m.id))
        opts.push({ value: String(m.id), label: m.title })
      }
    }
    return opts
  }, [modules])

  async function handleDelete(row: LessonRow) {
    if (!window.confirm(`هل أنت متأكد من حذف "${row.title ?? 'هذا الدرس'}"؟`)) return
    setDeleting(row.id)
    try {
      await adminDeleteLesson(row.id)
      toast.success('تم حذف الدرس')
      setRows((prev) => prev.filter((r) => r.id !== row.id))
    } catch {
      toast.error('تعذّر حذف الدرس')
    } finally {
      setDeleting(null)
    }
  }

  const selectCls = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 shadow-sm focus:border-[#2691C2] focus:outline-none'

  return (
    <>
    <AdminLmsShell
      title="إدارة الدروس"
      description="كل دروس الدورات — إنشاء، تعديل، ترتيب، وإدارة مرئية الطلاب"
      breadcrumb="الدروس"
      kpis={[
        { label: 'إجمالي الدروس', value: fmtNum(total),     icon: BookOpen, variant: 'brand' },
        { label: 'نشطة',          value: fmtNum(active),    icon: Layers,   variant: 'success' },
        { label: 'مسودات',        value: fmtNum(draft),     icon: Layers,   variant: 'warning' },
        { label: 'بفيديو',        value: fmtNum(withVideo), icon: Play,     variant: 'muted' },
      ]}
      loading={loading}
      error={error}
      onRetry={load}
      onRefresh={load}
      action={
        <button
          type="button"
          onClick={() => setModal('create')}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[12px] font-black text-[#22334A] shadow-sm transition hover:bg-white/90"
        >
          <Plus size={14} />
          درس جديد
        </button>
      }
    >
      {/* Filters */}
      <div className="mb-6 space-y-3" dir="rtl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في الدروس..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-3 text-[12px] font-semibold text-slate-700 shadow-sm focus:border-[#2691C2] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-black shadow-sm transition ${showFilters ? 'border-[#2691C2]/30 bg-[#2691C2]/5 text-[#2691C2]' : 'border-slate-200 bg-white text-slate-700 hover:border-[#2691C2]/20'}`}
          >
            <Filter size={12} />
            فلاتر
          </button>
          <button type="button" onClick={load} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-black text-slate-500 shadow-sm hover:text-[#2691C2]">
            <RefreshCw size={12} />
          </button>
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
              <option value="">كل الحالات</option>
              {LESSON_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className={selectCls}>
              {moduleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {(filterStatus || filterModule || search) && (
              <button
                type="button"
                onClick={() => { setSearch(''); setFilterStatus(''); setFilterModule('') }}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-black text-slate-500 hover:text-red-600"
              >
                <X size={12} /> مسح الكل
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <BookOpen size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="text-base font-black text-slate-400">{rows.length === 0 ? 'لا توجد دروس بعد' : 'لا نتائج للبحث'}</p>
          <p className="mt-1 text-sm text-slate-400">{rows.length === 0 ? 'أضف درسًا جديدًا للبدء' : 'جرّب تغيير معايير البحث'}</p>
          {rows.length === 0 && (
            <button
              type="button"
              onClick={() => setModal('create')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#2691C2] px-5 py-2.5 text-[12px] font-black text-white shadow hover:bg-[#2691C2]/90"
            >
              <Plus size={13} /> درس جديد
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" dir="rtl">
          <AnimatePresence>
            {filtered.map((r) => (
              <LessonCard
                key={r.id}
                row={r}
                onEdit={(row) => setModal(row)}
                onDelete={handleDelete}
                deleting={deleting}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </AdminLmsShell>

    {/* Modal */}
    <AnimatePresence>
      {modal !== null && (
        <LessonModal
          initial={modal === 'create' ? null : modal}
          modules={modules}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </AnimatePresence>
    </>
  )
}

// ── AdminQuizzesPage ─────────────────────────────────────────────────────────

export function AdminQuizzesPage() {
  const [rows, setRows] = useState<LmsQuiz[]>([])
  useEffect(() => {
    let c = false
    ;(async () => {
      const r = await fetchAdminQuizzes()
      if (!c) setRows(r)
    })()
    return () => {
      c = true
    }
  }, [])
  return (
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Admin LMS</p>
        <h1 className="text-2xl font-black text-deepBlue">إدارة الاختبارات</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">أسئلة وبنوك محتوى — ربط التصحيح الآلي.</p>
      </motion.div>
      {rows.length === 0 ? (
        <EmptyState title="لا اختبارات" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-black text-deepBlue">{q.title}</h2>
              <p className="mt-2 text-xs font-bold text-slate-500">
                دورة #{q.course_id} — نجاح {q.passing_score}% — أسئلة {q.questions.length}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
