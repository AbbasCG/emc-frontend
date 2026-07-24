import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Archive,
  Download,
  Eye,
  ExternalLink,
  FolderOpen,
  FileText,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Video,
  BookOpen,
  X,
} from 'lucide-react'
import { adminListMaterials, adminFetchMaterialBlob, adminStoreMaterial, adminUpdateMaterial, adminDeleteMaterial } from '@/api/adminLmsApi'
import { LmsEmptyState } from '@/components/lms'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { LmsFilterBar, LmsDataPanel, LmsPreviewModal, countActiveFilters, lmsSelectClass, type LmsPreviewState } from '@/components/lms/management'
import { fmtDate, normCourseTitle, fmtNum } from '@/components/lms/lmsFormatters'
import { CourseSelectField } from '@/components/lms/CourseSelectField'
import toast from '@/lib/toast'
import type { LucideIcon } from 'lucide-react'
import EmcDatePicker from '@/components/ui/EmcDatePicker'

// ── Create Material Modal ────────────────────────────────────────────────────

type MaterialSource = 'file' | 'url'

type MaterialForm = {
  title: string
  course_id: number | null
  type: string
  source: MaterialSource
  file: File | null
  external_url: string
  description: string
  is_visible: boolean
}

const EMPTY_MAT_FORM: MaterialForm = {
  title: '', course_id: null, type: 'pdf', source: 'file',
  file: null, external_url: '', description: '', is_visible: true,
}

const MATERIAL_TYPES = [
  { value: 'pdf',                 label: 'PDF' },
  { value: 'video',               label: 'فيديو' },
  { value: 'link',                label: 'رابط خارجي' },
  { value: 'document',            label: 'مستند' },
  { value: 'image',               label: 'صورة' },
  { value: 'slide',               label: 'شرائح' },
  { value: 'programming_project', label: 'ملف ZIP' },
  { value: 'other',               label: 'أخرى' },
]

const ZIP_ACCEPT = '.zip,application/zip,application/x-zip-compressed'
const DEFAULT_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.mp4,.mov,.avi'

function getAcceptAttr(type: string): string {
  return type === 'programming_project' ? ZIP_ACCEPT : DEFAULT_ACCEPT
}

const fieldCls = 'w-full rounded-xl border border-[#0C2A4B]/10 bg-[#0C2A4B]/[0.02] px-3 py-2.5 text-sm font-semibold text-[#0C2A4B] outline-none focus:border-[#0077B6]/40 focus:ring-2 focus:ring-[#0077B6]/10'

function MaterialModal({ initial, onClose, onSaved }: { initial?: MaterialRow | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState<MaterialForm>(() =>
    initial
      ? {
          title: initial.title ?? '',
          course_id: initial.course_id ?? null,
          type: initial.type ?? 'pdf',
          source: initial.external_url && !initial.has_file ? 'url' : 'file',
          file: null,
          external_url: initial.external_url ?? '',
          description: initial.description ?? '',
          is_visible: initial.is_visible !== false,
        }
      : EMPTY_MAT_FORM
  )
  const [errors, setErrors] = useState<Partial<Record<keyof MaterialForm | 'source_field' | 'file', string>>>({})
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof MaterialForm>(k: K, v: MaterialForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined, source_field: undefined }))
  }

  function setType(t: string) {
    set('type', t)
    set('file', null)
    if (t === 'link') set('source', 'url')
    else if (t === 'programming_project') set('source', 'file')
  }

  function handleFileChange(picked: File | null) {
    if (!picked) { set('file', null); return }
    const ext = picked.name.split('.').pop()?.toLowerCase() ?? ''
    if (ext === 'zip' && form.type !== 'programming_project') {
      // Auto-switch: user picked a ZIP file while a non-ZIP type was selected.
      setForm((f) => ({ ...f, type: 'programming_project', source: 'file', file: picked }))
      setErrors({})
      return
    }
    set('file', picked)
  }

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!form.title.trim()) errs.title = 'العنوان مطلوب'
    if (!form.course_id) errs.course_id = 'يجب اختيار دورة'
    if (!isEdit && form.source === 'file' && !form.file) errs.source_field = 'يجب رفع ملف'
    if (form.source === 'url' && !form.external_url.trim()) errs.source_field = 'يجب إدخال رابط'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      if (form.source === 'file' && form.file) {
        const fd = new FormData()
        fd.append('title', form.title.trim())
        if (form.course_id) fd.append('course_id', String(form.course_id))
        fd.append('type', form.type)
        fd.append('file', form.file)
        if (form.description.trim()) fd.append('description', form.description.trim())
        fd.append('is_visible', form.is_visible ? '1' : '0')
        if (isEdit && initial?.id) {
          await adminUpdateMaterial(initial.id, fd)
        } else {
          await adminStoreMaterial(fd)
        }
      } else {
        const body = {
          title: form.title.trim(),
          course_id: form.course_id,
          type: form.type,
          external_url: form.external_url.trim() || undefined,
          description: form.description.trim() || undefined,
          is_visible: form.is_visible,
        }
        if (isEdit && initial?.id) {
          await adminUpdateMaterial(initial.id, body)
        } else {
          await adminStoreMaterial(body)
        }
      }
      toast.success(isEdit ? 'تم تحديث المادة بنجاح' : 'تمت إضافة المادة بنجاح')
      onSaved()
      onClose()
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data
      const apiErrors = res?.errors
      if (apiErrors && Object.keys(apiErrors).length > 0) {
        const mapped: typeof errors = {}
        for (const [field, msgs] of Object.entries(apiErrors)) {
          const key = field as keyof typeof errors
          mapped[key] = msgs[0]
        }
        setErrors(mapped)
        toast.error('يرجى مراجعة الأخطاء أدناه')
      } else {
        toast.error('تعذّر حفظ المادة')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-[#0C2A4B]/[0.08]" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0C2A4B]/[0.06] px-6 py-4">
          <h2 className="text-[15px] font-black text-[#0C2A4B]">{isEdit ? 'تعديل المادة' : 'إضافة مادة تعليمية'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#0C2A4B]/40 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="space-y-4 px-6 py-5">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#0C2A4B]/60">عنوان المادة <span className="text-rose-500">*</span></label>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="أدخل عنوان المادة"
                className={[fieldCls, errors.title ? 'border-rose-300 ring-1 ring-rose-200' : ''].join(' ')}
              />
              {errors.title && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.title}</p>}
            </div>

            {/* Course */}
            <CourseSelectField
              value={form.course_id}
              onChange={(id) => set('course_id', id)}
              label="الدورة"
              required
              error={errors.course_id}
            />

            {/* Type */}
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#0C2A4B]/60">نوع المادة</label>
              <select value={form.type} onChange={(e) => setType(e.target.value)} className={fieldCls}>
                {MATERIAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Source toggle — hidden for ZIP (always file) and link (always url) */}
            {form.type !== 'link' && form.type !== 'programming_project' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set('source', 'file')}
                  className={`flex-1 rounded-xl border py-2 text-[12px] font-black transition ${form.source === 'file' ? 'border-[#0077B6] bg-[#0077B6]/10 text-[#0077B6]' : 'border-[#0C2A4B]/10 text-[#0C2A4B]/50 hover:border-[#0C2A4B]/20'}`}
                >
                  رفع ملف
                </button>
                <button
                  type="button"
                  onClick={() => set('source', 'url')}
                  className={`flex-1 rounded-xl border py-2 text-[12px] font-black transition ${form.source === 'url' ? 'border-[#0077B6] bg-[#0077B6]/10 text-[#0077B6]' : 'border-[#0C2A4B]/10 text-[#0C2A4B]/50 hover:border-[#0C2A4B]/20'}`}
                >
                  رابط خارجي
                </button>
              </div>
            )}

            {/* ZIP helper */}
            {form.type === 'programming_project' && (
              <div className="flex items-start gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2.5">
                <Archive size={14} className="mt-0.5 shrink-0 text-purple-600" />
                <p className="text-[11px] font-bold text-purple-700">
                  ملف مضغوط للتحميل فقط، ولن يتم فك ضغطه على الخادم. الحد الأقصى: 512 MB.
                </p>
              </div>
            )}

            {/* File upload */}
            {form.source === 'file' && form.type !== 'link' && (
              <div>
                <label className="mb-1.5 block text-[12px] font-black text-[#0C2A4B]/60">الملف <span className="text-rose-500">*</span></label>
                <input
                  ref={fileRef}
                  type="file"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  className="hidden"
                  accept={getAcceptAttr(form.type)}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={[
                    'w-full rounded-xl border-2 border-dashed py-6 text-center text-[12px] font-bold transition',
                    form.file ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-[#0C2A4B]/15 text-[#0C2A4B]/40 hover:border-[#0077B6]/30 hover:text-[#0077B6]',
                  ].join(' ')}
                >
                  {form.file ? (
                    <span>📎 {form.file.name}</span>
                  ) : form.type === 'programming_project' ? (
                    <span>اضغط لاختيار ملف ZIP</span>
                  ) : (
                    <span>اضغط لاختيار ملف</span>
                  )}
                </button>
                {errors.source_field && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.source_field}</p>}
                {errors.file && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.file}</p>}
              </div>
            )}

            {/* URL input */}
            {(form.source === 'url' || form.type === 'link') && (
              <div>
                <label className="mb-1.5 block text-[12px] font-black text-[#0C2A4B]/60">الرابط <span className="text-rose-500">*</span></label>
                <input
                  value={form.external_url}
                  onChange={(e) => set('external_url', e.target.value)}
                  placeholder="https://..."
                  type="url"
                  dir="ltr"
                  className={[fieldCls, 'text-left', errors.source_field ? 'border-rose-300 ring-1 ring-rose-200' : ''].join(' ')}
                />
                {errors.source_field && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.source_field}</p>}
              </div>
            )}

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#0C2A4B]/60">الوصف</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
                placeholder="وصف اختياري للمادة..."
                className={`${fieldCls} resize-none`}
              />
            </div>

            {/* Visibility */}
            <label className="flex cursor-pointer items-center gap-3">
              <div
                role="checkbox"
                tabIndex={0}
                aria-checked={form.is_visible}
                onClick={() => set('is_visible', !form.is_visible)}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') set('is_visible', !form.is_visible) }}
                className={`relative h-5 w-9 rounded-full transition-colors ${form.is_visible ? 'bg-[#0077B6]' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${form.is_visible ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className="text-[12px] font-black text-[#0C2A4B]/70">ظاهرة للطلاب</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#0C2A4B]/[0.05] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#0C2A4B]/10 px-5 py-2 text-[12px] font-black text-[#0C2A4B] hover:bg-slate-50">
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#0077B6] px-5 py-2 text-[12px] font-black text-white shadow hover:bg-[#0077B6]/90 disabled:opacity-50"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            {saving ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التغييرات' : 'إضافة المادة'}
          </button>
        </div>
      </div>
    </div>
  )
}

type MaterialRow = {
  id: number
  title?: string | null
  description?: string | null
  type?: string | null
  kind?: string | null
  has_file?: boolean
  file_name?: string | null
  file_type?: string | null
  can_preview?: boolean
  file_size?: number | null
  is_visible?: boolean | null
  external_url?: string | null
  file_path?: string | null
  course_id?: number | null
  course_title?: string | null
  course_name?: string | null
  created_at?: string | null
  updated_at?: string | null
}

const NON_PREVIEWABLE_TYPES = new Set(['video', 'link', 'programming_project'])

function normMaterial(r: MaterialRow): MaterialRow {
  const type = r.type ?? r.kind ?? 'other'
  const hasFile = r.has_file ?? Boolean(r.file_path)
  // Default can_preview to true for files — backend value wins when present;
  // fall back to permissive: anything with a file that isn't video/link can try inline preview.
  const canPreview = r.can_preview ?? (hasFile && !NON_PREVIEWABLE_TYPES.has(type))
  return {
    ...r,
    course_title: normCourseTitle(r.course_title ?? r.course_name),
    type,
    has_file: hasFile,
    can_preview: canPreview,
  }
}

type FileTypeDef = { icon: LucideIcon; label: string; bg: string; text: string }

const typeMap: Record<string, FileTypeDef> = {
  pdf:                 { icon: FileText,   label: 'PDF',      bg: 'bg-rose-50',     text: 'text-rose-600'     },
  video:               { icon: Video,      label: 'فيديو',    bg: 'bg-purple-50',   text: 'text-purple-600'   },
  link:                { icon: Link2,      label: 'رابط',     bg: 'bg-sky-50',      text: 'text-sky-600'      },
  slide:               { icon: BookOpen,   label: 'شرائح',    bg: 'bg-amber-50',    text: 'text-amber-600'    },
  document:            { icon: FileText,   label: 'مستند',    bg: 'bg-slate-50',    text: 'text-slate-600'    },
  programming_project: { icon: Archive,    label: 'ملف ZIP',  bg: 'bg-purple-50',   text: 'text-purple-700'   },
  other:               { icon: FolderOpen, label: 'ملف',      bg: 'bg-[#0C2A4B]/5', text: 'text-[#0C2A4B]/60' },
}

function fmtSize(bytes: number | null | undefined): string | null {
  if (bytes == null || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function MaterialCard({
  m,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  busyId,
  deleting,
}: {
  m: MaterialRow
  onPreview: (m: MaterialRow) => void
  onDownload: (m: MaterialRow) => void
  onEdit: (m: MaterialRow) => void
  onDelete: (m: MaterialRow) => void
  busyId: { id: number; action: 'preview' | 'download' } | null
  deleting: number | null
}) {
  const t = typeMap[m.type ?? 'other'] ?? typeMap.other
  const TypeIcon = t.icon
  const isPreviewBusy = busyId?.id === m.id && busyId.action === 'preview'
  const isDownloadBusy = busyId?.id === m.id && busyId.action === 'download'
  const isBusy = isPreviewBusy || isDownloadBusy
  const size = fmtSize(m.file_size)

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="group flex items-start gap-4 rounded-2xl border border-[#0C2A4B]/6 bg-white p-4 shadow-sm transition hover:border-[#0077B6]/20 hover:shadow-md"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.bg} ring-1 ring-[#0C2A4B]/6`}>
        <TypeIcon size={18} className={t.text} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-bold text-[#0C2A4B]">{m.title ?? '—'}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ring-[#0C2A4B]/10 ${t.bg} ${t.text}`}>
            {t.label}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-[#0077B6]/80">{m.course_title}</p>
        {m.description ?
          <p className="mt-1 line-clamp-2 text-xs text-[#0C2A4B]/40">{m.description}</p>
        : null}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-medium text-[#0C2A4B]/35">{fmtDate(m.created_at ?? m.updated_at)}</p>
            {size ? <span className="font-latin text-[11px] font-medium text-[#0C2A4B]/25">{size}</span> : null}
            {m.is_visible === false ?
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">مخفي</span>
            : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(m)}
              className="rounded-lg p-1.5 text-[#0C2A4B]/40 transition hover:bg-[#0077B6]/10 hover:text-[#0077B6]"
              title="تعديل"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(m)}
              disabled={deleting === m.id}
              className="rounded-lg p-1.5 text-[#0C2A4B]/40 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="حذف"
            >
              {deleting === m.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
            {m.external_url && !m.has_file ?
              <a
                href={m.external_url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-600 transition hover:bg-sky-100"
              >
                <ExternalLink size={11} aria-hidden /> فتح
              </a>
            : null}
            {m.has_file ?
              <>
                {m.can_preview ?
                  <button
                    type="button"
                    onClick={() => onPreview(m)}
                    disabled={isBusy}
                    className="flex items-center gap-1 rounded-lg bg-[#0077B6]/10 px-2.5 py-1 text-[11px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/20 disabled:opacity-50"
                  >
                    {isPreviewBusy ?
                      <span className="inline-flex items-center gap-1">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#0077B6]/30 border-t-[#0077B6]" />
                        جاري الفتح…
                      </span>
                    : <><Eye size={11} aria-hidden /> معاينة</>}
                  </button>
                : (
                  <span className="rounded-lg bg-[#0C2A4B]/4 px-2.5 py-1 text-[10px] font-bold text-[#0C2A4B]/35">
                    لا يمكن معاينة هذا النوع
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onDownload(m)}
                  disabled={isBusy}
                  className="flex items-center gap-1 rounded-lg bg-[#0C2A4B]/6 px-2.5 py-1 text-[11px] font-black text-[#0C2A4B] transition hover:bg-[#0C2A4B]/10 disabled:opacity-50"
                >
                  {isDownloadBusy ?
                    <span className="inline-flex items-center gap-1">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#0C2A4B]/20 border-t-[#0C2A4B]" />
                      جاري التحميل…
                    </span>
                  : <><Download size={11} aria-hidden /> تحميل</>}
                </button>
              </>
            : !m.external_url ?
              <span className="text-[10px] text-[#0C2A4B]/30">لا يوجد ملف مرفق</span>
            : null}
          </div>
        </div>
    </motion.div>
  )
}

const LOAD_ERROR = 'تعذّر تحميل المواد. تحقق من الاتصال وأعد المحاولة.'

/** Pure I/O — kept outside the component so the mount effect and the imperative reload
 *  share it without either having to call a state-mutating callback. */
async function fetchMaterialRows(): Promise<MaterialRow[]> {
  const list = await adminListMaterials()
  return (list as MaterialRow[]).map(normMaterial)
}

export default function AdminLmsMaterialsPage() {
  const [rows, setRows] = useState<MaterialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterFile, setFilterFile] = useState<'' | 'has' | 'missing'>('')
  const [filterVisibility, setFilterVisibility] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<MaterialRow | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [preview, setPreview] = useState<LmsPreviewState>({ kind: 'idle' })
  const [busyId, setBusyId] = useState<{ id: number; action: 'preview' | 'download' } | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const closePreview = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setPreview({ kind: 'idle' })
  }, [])

  /** Imperative refresh/retry from a button — outside any effect, so flipping to the
   *  loading state synchronously is fine here. */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchMaterialRows())
    } catch {
      setError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const list = await fetchMaterialRows()
        if (alive) setRows(list)
      } catch {
        if (alive) setError(LOAD_ERROR)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])
  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current) }, [])

  const handlePreview = useCallback(async (m: MaterialRow) => {
    if (!m.has_file) {
      toast.warning('لا يوجد ملف مرفق.')
      return
    }
    if (!m.can_preview) {
      toast.warning('لا يمكن معاينة هذا النوع من الملفات. يمكنك تحميله فقط.')
      return
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setPreview({ kind: 'loading', label: 'جاري فتح الملف…' })
    setBusyId({ id: m.id, action: 'preview' })
    try {
      const { blob, mime } = await adminFetchMaterialBlob(m.id, 'file')
      const typed = blob.type ? blob : new Blob([blob], { type: mime })
      const url = URL.createObjectURL(typed)
      objectUrlRef.current = url
      setPreview({ kind: 'open', objectUrl: url, fileName: m.file_name ?? m.title ?? 'ملف', mime })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const msg = (err as Error)?.message
        || (status === 404 || status === 403
          ? 'الملف غير موجود أو لا تملك صلاحية الوصول إليه.'
          : 'تعذر فتح الملف. يرجى المحاولة مرة أخرى.')
      setPreview({ kind: 'error', message: msg })
    } finally {
      setBusyId(null)
    }
  }, [])

  const handleDownload = useCallback(async (m: MaterialRow) => {
    if (!m.has_file) {
      toast.warning('لا يوجد ملف مرفق.')
      return
    }
    setBusyId({ id: m.id, action: 'download' })
    try {
      const { blob } = await adminFetchMaterialBlob(m.id, 'download')
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = m.file_name ?? m.title ?? 'material'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      toast.error(
        (err as Error)?.message
          || (status === 404 || status === 403
            ? 'الملف غير موجود أو لا تملك صلاحية الوصول إليه.'
            : 'تعذر تحميل الملف. يرجى المحاولة مرة أخرى.'),
      )
    } finally {
      setBusyId(null)
    }
  }, [])

  async function handleDelete(m: MaterialRow) {
    if (!window.confirm(`هل أنت متأكد من حذف "${m.title ?? 'هذه المادة'}"؟`)) return
    setDeleting(m.id)
    try {
      await adminDeleteMaterial(m.id)
      toast.success('تم حذف المادة')
      setRows((prev) => prev.filter((r) => r.id !== m.id))
    } catch {
      toast.error('تعذّر حذف المادة')
    } finally {
      setDeleting(null)
    }
  }

  const courseOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = [{ value: '', label: 'كل الدورات' }]
    for (const r of rows) {
      const key = String(r.course_id ?? '')
      const label = r.course_title ?? ''
      if (key && label && label !== 'دورة غير مرتبطة' && !seen.has(key)) {
        seen.add(key)
        opts.push({ value: key, label })
      }
    }
    return opts
  }, [rows])

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q || (r.title ?? '').toLowerCase().includes(q) || (r.course_title ?? '').toLowerCase().includes(q)
    const matchType = !filterType || r.type === filterType
    const matchCourse = !filterCourse || String(r.course_id ?? '') === filterCourse
    const matchFile = filterFile === 'has' ? Boolean(r.has_file) : filterFile === 'missing' ? !r.has_file : true
    const matchVis = !filterVisibility || (filterVisibility === 'visible' ? r.is_visible !== false : r.is_visible === false)
    const created = (r.created_at ?? '').slice(0, 10)
    const matchFrom = !dateFrom || created >= dateFrom
    const matchTo = !dateTo || created <= dateTo
    return matchSearch && matchType && matchCourse && matchFile && matchVis && matchFrom && matchTo
  })

  const total = rows.length
  const pdfs = rows.filter((r) => r.type === 'pdf').length
  const videos = rows.filter((r) => r.type === 'video').length
  const withFile = rows.filter((r) => r.has_file).length

  const activeCount = countActiveFilters([search, filterType, filterCourse, filterFile, filterVisibility, dateFrom, dateTo])

  function clearFilters() {
    setSearch('')
    setFilterType('')
    setFilterCourse('')
    setFilterFile('')
    setFilterVisibility('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <>
      <LmsPreviewModal state={preview} onClose={closePreview} />
      {showCreate && (
        <MaterialModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { load() }}
        />
      )}
      {editTarget && (
        <MaterialModal
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { load(); setEditTarget(null) }}
        />
      )}
      <AdminLmsShell
        title="إدارة المواد التعليمية"
        description="معاينة وتحميل المواد المنشورة عبر الدورات — بدون روابط تخزين مباشرة"
        breadcrumb="المواد"
        kpis={[
          { label: 'إجمالي المواد', value: fmtNum(total), icon: FolderOpen, variant: 'brand' },
          { label: 'ملفات PDF', value: fmtNum(pdfs), icon: FileText, variant: 'accent' },
          { label: 'فيديوهات', value: fmtNum(videos), icon: Video, variant: 'muted' },
          { label: 'بملف مرفق', value: fmtNum(withFile), icon: Download, variant: 'success' },
        ]}
        loading={loading}
        error={error}
        onRetry={load}
        onRefresh={load}
        action={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-[#0077B6] px-4 py-2 text-[12px] font-black text-white shadow hover:bg-[#0077B6]/90"
          >
            <Plus size={14} />
            إضافة مادة
          </button>
        }
      >
        <LmsFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث عن مادة أو دورة…"
          activeFilterCount={activeCount}
          resultCount={filtered.length}
          totalCount={total}
          onReset={clearFilters}
          primary={
            <>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={lmsSelectClass()}>
                <option value="">كل الأنواع</option>
                <option value="pdf">PDF</option>
                <option value="video">فيديو</option>
                <option value="link">رابط</option>
                <option value="slide">شرائح</option>
                <option value="document">مستند</option>
                <option value="programming_project">ملف ZIP</option>
                <option value="other">أخرى</option>
              </select>
              <select value={filterFile} onChange={(e) => setFilterFile(e.target.value as '' | 'has' | 'missing')} className={lmsSelectClass()}>
                <option value="">الملف: الكل</option>
                <option value="has">بملف</option>
                <option value="missing">بدون ملف</option>
              </select>
            </>
          }
          secondary={
            <>
              {courseOptions.length > 1 ?
                <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className={lmsSelectClass()}>
                  {courseOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              : null}
              <select value={filterVisibility} onChange={(e) => setFilterVisibility(e.target.value)} className={lmsSelectClass()}>
                <option value="">كل الحالات</option>
                <option value="visible">ظاهر</option>
                <option value="hidden">مخفي</option>
              </select>
              <EmcDatePicker label="من تاريخ" value={dateFrom} onChange={(v) => setDateFrom(v)} />
              <EmcDatePicker label="إلى تاريخ" value={dateTo} onChange={(v) => setDateTo(v)} />
            </>
          }
        />

        {!loading && (
          filtered.length === 0 ?
            <LmsEmptyState
              icon={FolderOpen}
              title="لا توجد مواد"
              description={activeCount > 0 ? 'جرّب تغيير معايير البحث.' : 'لم يتم إضافة أي مواد تعليمية بعد.'}
            />
          : (
            <LmsDataPanel footer={`عرض ${fmtNum(filtered.length)} من ${fmtNum(total)} مادة`}>
              <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((m) => (
                  <MaterialCard key={m.id} m={m} onPreview={handlePreview} onDownload={handleDownload} onEdit={setEditTarget} onDelete={(m) => void handleDelete(m)} busyId={busyId} deleting={deleting} />
                ))}
              </div>
            </LmsDataPanel>
          )
        )}
      </AdminLmsShell>
    </>
  )
}
