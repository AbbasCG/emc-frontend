import { useEffect, useMemo, useState } from 'react'
import { Download, Eye, FileText, Loader2, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import {
  ApiFieldError,
  MATERIAL_SCOPE_LABELS,
  MATERIAL_TYPE_LABELS,
  createCourseMaterial,
  deleteCourseMaterial,
  downloadCourseMaterial,
  fetchAuthenticatedPreviewBlobUrl,
  fetchCourseMaterials,
  fetchCourseModules,
  filterLessonsForModule,
  resolveLessonAfterModuleChange,
  resolveMaterialScopePayload,
  scopeChoiceFromMaterial,
  updateCourseMaterial,
  type CourseMaterialPayload,
  type CourseMaterialRow,
  type CourseModuleRow,
  type MaterialScopeChoice,
  type ValidationErrors,
} from '@/api/courseContentApi'
import toast from '@/lib/toast'

function FieldError({ errors, field }: { errors: ValidationErrors | null; field: string }) {
  if (!errors?.[field]?.[0]) return null
  return <p className="mt-1 text-[10px] font-bold text-red-500">{errors[field][0]}</p>
}

function ScopeBadge({ scope }: { scope: CourseMaterialRow['scope'] }) {
  const cls: Record<string, string> = {
    course: 'bg-slate-100 text-slate-600', module: 'bg-blue-50 text-blue-700',
    lesson: 'bg-indigo-50 text-indigo-700', session: 'bg-purple-50 text-purple-700', class: 'bg-emerald-50 text-emerald-700',
  }
  return <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black ${cls[scope] ?? cls.course}`}>{MATERIAL_SCOPE_LABELS[scope]}</span>
}

export function InstructorMaterialsTab({ courseId, classGroupId, canManage }: { courseId: number; classGroupId: number; canManage: boolean }) {
  const [materials, setMaterials] = useState<CourseMaterialRow[] | null>(null)
  const [modules, setModules] = useState<CourseModuleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Filters
  const [filterModule, setFilterModule] = useState<number | ''>('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterScope, setFilterScope] = useState<string>('')

  // Form
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CourseMaterialRow | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('link')
  const [externalUrl, setExternalUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [scopeChoice, setScopeChoice] = useState<MaterialScopeChoice>('course')
  const [moduleId, setModuleId] = useState<number | ''>('')
  const [lessonId, setLessonId] = useState<number | ''>('')
  const [isVisible, setIsVisible] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors | null>(null)

  function load() {
    setLoading(true)
    setError(false)
    Promise.all([fetchCourseMaterials(courseId), fetchCourseModules(courseId)])
      .then(([m, mods]) => { setMaterials(m); setModules(mods) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [courseId])

  const filtered = useMemo(() => {
    return (materials ?? []).filter((m) => {
      if (filterModule && m.module_id !== filterModule) return false
      if (filterType && m.type !== filterType) return false
      if (filterScope && m.scope !== filterScope) return false
      return true
    })
  }, [materials, filterModule, filterType, filterScope])

  const lessonsForSelectedModule = useMemo(() => filterLessonsForModule(modules, moduleId), [modules, moduleId])

  function openCreate() {
    setEditing(null); setTitle(''); setDescription(''); setType('link'); setExternalUrl(''); setFile(null)
    setScopeChoice('course'); setModuleId(''); setLessonId(''); setIsVisible(true); setErrors(null); setShowForm(true)
  }

  function openEdit(m: CourseMaterialRow) {
    setEditing(m)
    setTitle(m.title); setDescription(m.description ?? ''); setType(m.type); setExternalUrl(m.external_url ?? '')
    setFile(null)
    setScopeChoice(scopeChoiceFromMaterial(m))
    setModuleId(m.module_id ?? ''); setLessonId(m.lesson_id ?? '')
    setIsVisible(m.is_visible); setErrors(null); setShowForm(true)
  }

  function handleModuleChange(newModuleId: number | '') {
    setModuleId(newModuleId)
    // Changing module invalidates any lesson selection from a different module.
    setLessonId(resolveLessonAfterModuleChange(modules, newModuleId, lessonId))
  }

  async function handleSave() {
    setSaving(true)
    setErrors(null)
    try {
      const payload: CourseMaterialPayload = {
        title, description, type, is_visible: isVisible,
        external_url: type === 'link' ? externalUrl : undefined,
        file: file ?? undefined,
        ...resolveMaterialScopePayload(scopeChoice, moduleId, lessonId, classGroupId),
      }
      if (editing) {
        await updateCourseMaterial(editing.id, payload)
        toast.success('تم تحديث المادة بنجاح.')
      } else {
        await createCourseMaterial(courseId, payload)
        toast.success('تمت إضافة المادة بنجاح.')
      }
      setShowForm(false)
      load()
    } catch (err) {
      if (err instanceof ApiFieldError) setErrors(err.errors)
      else toast.error('تعذّر حفظ المادة.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(m: CourseMaterialRow) {
    if (!window.confirm(`هل أنت متأكد من حذف المادة "${m.title}"؟`)) return
    try {
      await deleteCourseMaterial(m.id)
      toast.success('تم حذف المادة.')
      load()
    } catch {
      toast.error('تعذّر حذف المادة — تحقق من صلاحياتك.')
    }
  }

  async function handleDownload(m: CourseMaterialRow) {
    try {
      await downloadCourseMaterial(m)
    } catch {
      toast.error('تعذّر تحميل الملف.')
    }
  }

  async function handlePreview(m: CourseMaterialRow) {
    try {
      const kind = m.mime_type?.startsWith('video/') ? 'stream' : 'preview'
      const blobUrl = await fetchAuthenticatedPreviewBlobUrl(m.id, kind)
      window.open(blobUrl, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    } catch {
      toast.error('تعذّرت معاينة الملف.')
    }
  }

  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}</div>
  }
  if (error) {
    return (
      <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 py-14 text-center">
        <p className="text-[13px] font-semibold text-red-500">تعذّر تحميل المواد</p>
        <button type="button" onClick={load} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-deepBlue px-4 py-2 text-[11px] font-black text-white">
          <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
        </button>
      </div>
    )
  }

  return (
    <div dir="rtl">
      <div className="mb-4 rounded-2xl border border-[#2691C2]/15 bg-[#2691C2]/[0.04] px-4 py-3 text-[11px] font-bold text-deepBlue/60">
        المواد على مستوى الدورة تظهر لجميع الصفوف؛ المواد الخاصة بصف معين تظهر فقط لطلاب هذا الصف.
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={filterModule} onChange={(e) => setFilterModule(e.target.value ? Number(e.target.value) : '')}
          className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#2691C2]">
          <option value="">كل الوحدات</option>
          {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#2691C2]">
          <option value="">كل الأنواع</option>
          {Object.entries(MATERIAL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterScope} onChange={(e) => setFilterScope(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#2691C2]">
          <option value="">كل النطاقات</option>
          {Object.entries(MATERIAL_SCOPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(filterModule || filterType || filterScope) && (
          <button type="button" onClick={() => { setFilterModule(''); setFilterType(''); setFilterScope('') }}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-deepBlue/50">
            <X className="h-3.5 w-3.5" /> مسح الفلاتر
          </button>
        )}
        {canManage && (
          <button type="button" onClick={openCreate}
            className="mr-auto inline-flex items-center gap-1.5 rounded-xl bg-deepBlue px-3 py-2 text-[11px] font-black text-white">
            <Plus className="h-3.5 w-3.5" /> إضافة مادة
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <FileText className="mx-auto h-8 w-8 text-deepBlue/20" />
          <p className="mt-3 text-[13px] font-semibold text-deepBlue/40">لا توجد مواد مطابقة</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-[13px] font-bold text-deepBlue">{m.title}</p>
                  <ScopeBadge scope={m.scope} />
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-600">{MATERIAL_TYPE_LABELS[m.type] ?? m.type}</span>
                  {!m.is_visible && <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700">مخفي</span>}
                </div>
                <p className="mt-0.5 truncate text-[10px] font-bold text-deepBlue/35">{m.original_filename ?? m.external_url ?? ''} {m.size_human ? `· ${m.size_human}` : ''}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {m.preview_url && (
                  <button type="button" onClick={() => handlePreview(m)} className="rounded-lg border border-deepBlue/10 p-2 text-deepBlue/60 hover:border-[#2691C2]/30"><Eye className="h-3.5 w-3.5" /></button>
                )}
                {m.download_url && (
                  <button type="button" onClick={() => handleDownload(m)} className="rounded-lg border border-deepBlue/10 p-2 text-deepBlue/60 hover:border-[#2691C2]/30"><Download className="h-3.5 w-3.5" /></button>
                )}
                {canManage && (
                  <>
                    <button type="button" onClick={() => openEdit(m)} className="rounded-lg border border-deepBlue/10 p-2 text-deepBlue/60 hover:border-[#2691C2]/30"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => handleDelete(m)} className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div dir="rtl" className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[14px] font-black text-deepBlue">{editing ? 'تعديل المادة' : 'إضافة مادة'}</h3>
              <button type="button" onClick={() => setShowForm(false)}><X className="h-4 w-4 text-deepBlue/40" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-deepBlue/40">العنوان</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#2691C2]" />
                <FieldError errors={errors} field="title" />
              </div>
              <div>
                <label className="text-[10px] font-black text-deepBlue/40">الوصف</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#2691C2]" />
              </div>
              <div>
                <label className="text-[10px] font-black text-deepBlue/40">النوع</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#2691C2]">
                  {Object.entries(MATERIAL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {type === 'link' ? (
                <div>
                  <label className="text-[10px] font-black text-deepBlue/40">الرابط</label>
                  <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} dir="ltr" className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#2691C2]" />
                  <FieldError errors={errors} field="external_url" />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-black text-deepBlue/40">الملف {editing ? '(اتركه فارغًا للإبقاء على الملف الحالي)' : ''}</label>
                  <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-[11px] font-bold text-deepBlue" />
                  {file && <p className="mt-1 text-[10px] font-bold text-deepBlue/50">{file.name}</p>}
                  <FieldError errors={errors} field="file" />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-deepBlue/40">النطاق</label>
                <select value={scopeChoice} onChange={(e) => setScopeChoice(e.target.value as typeof scopeChoice)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#2691C2]">
                  <option value="course">الدورة كاملة</option>
                  <option value="module">وحدة محددة</option>
                  <option value="lesson">درس محدد</option>
                  <option value="class">هذا الصف فقط</option>
                </select>
                {scopeChoice === 'course' && (
                  <p className="mt-1 text-[10px] text-deepBlue/40">ستكون هذه المادة متاحة لجميع الصفوف المؤهلة في هذه الدورة.</p>
                )}
              </div>

              {(scopeChoice === 'module' || scopeChoice === 'lesson') && (
                <div>
                  <label className="text-[10px] font-black text-deepBlue/40">الوحدة</label>
                  <select value={moduleId} onChange={(e) => handleModuleChange(e.target.value ? Number(e.target.value) : '')}
                    className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#2691C2]">
                    <option value="">اختر وحدة</option>
                    {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                  </select>
                  <FieldError errors={errors} field="module_id" />
                </div>
              )}
              {scopeChoice === 'lesson' && (
                <div>
                  <label className="text-[10px] font-black text-deepBlue/40">الدرس</label>
                  <select value={lessonId} onChange={(e) => setLessonId(e.target.value ? Number(e.target.value) : '')}
                    disabled={!moduleId}
                    className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#2691C2] disabled:opacity-50">
                    <option value="">اختر درسًا</option>
                    {lessonsForSelectedModule.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                  <FieldError errors={errors} field="lesson_id" />
                </div>
              )}

              <label className="flex items-center gap-2 text-[11px] font-bold text-deepBlue/60">
                <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
                مرئي للطلاب
              </label>
            </div>
            <button type="button" disabled={saving || !title} onClick={handleSave}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-deepBlue px-4 py-2.5 text-[12px] font-black text-white disabled:opacity-50">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} حفظ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
