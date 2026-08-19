import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Layers, Loader2, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import {
  ApiFieldError,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_VALUES,
  createCourseModule,
  createLesson,
  deleteCourseModule,
  deleteLesson,
  fetchCourseModules,
  reorderCourseModules,
  reorderLessons,
  updateCourseModule,
  updateLesson,
  type ContentStatus,
  type CourseModuleRow,
  type LessonRow,
  type ValidationErrors,
} from '@/api/courseContentApi'
import toast from '@/lib/toast'

function StatusBadge({ status }: { status: ContentStatus }) {
  const cls: Record<ContentStatus, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-slate-200 text-slate-600',
    draft: 'bg-amber-100 text-amber-700',
  }
  return <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black ${cls[status]}`}>{CONTENT_STATUS_LABELS[status]}</span>
}

function FieldError({ errors, field }: { errors: ValidationErrors | null; field: string }) {
  if (!errors?.[field]?.[0]) return null
  return <p className="mt-1 text-[10px] font-bold text-red-500">{errors[field][0]}</p>
}

/* ── Shared: course-scope notice ─────────────────────────────────────── */
function CourseScopeNotice() {
  return (
    <div className="mb-4 rounded-2xl border border-[#0077B6]/15 bg-[#0077B6]/[0.04] px-4 py-3 text-[11px] font-bold text-deepBlue/60">
      المنهج (الوحدات والدروس) مشترك على مستوى الدورة بالكامل، وليس خاصًا بهذا الصف فقط أي تعديل هنا سيظهر في جميع صفوف هذه الدورة.
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   UNITS (Modules) TAB
══════════════════════════════════════════════════════════════════ */
export function UnitsTab({ courseId, canManage }: { courseId: number; canManage: boolean }) {
  const [modules, setModules] = useState<CourseModuleRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CourseModuleRow | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ContentStatus>('active')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors | null>(null)
  const [reordering, setReordering] = useState(false)

  /** Imperative reload from an event handler — outside any effect, so it may flip to the
   *  loading state synchronously. */
  const load = () => {
    setLoading(true)
    setError(false)
    fetchCourseModules(courseId)
      .then((rows) => setModules(rows.sort((a, b) => a.sort_order - b.sort_order)))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  // Re-arm the loading state during render when the course changes (react.dev
  // "adjusting state when a prop changes"); mount is covered by the initial values.
  const [seenCourseId, setSeenCourseId] = useState(courseId)
  if (seenCourseId !== courseId) {
    setSeenCourseId(courseId)
    setLoading(true)
    setError(false)
  }

  useEffect(() => {
    let alive = true
    fetchCourseModules(courseId)
      .then((rows) => { if (alive) setModules(rows.sort((a, b) => a.sort_order - b.sort_order)) })
      .catch(() => { if (alive) setError(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [courseId])

  function openCreate() {
    setEditing(null); setTitle(''); setDescription(''); setStatus('active'); setErrors(null); setShowForm(true)
  }
  function openEdit(m: CourseModuleRow) {
    setEditing(m); setTitle(m.title); setDescription(m.description ?? ''); setStatus(m.status); setErrors(null); setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    setErrors(null)
    try {
      if (editing) {
        await updateCourseModule(editing.id, { title, description, status })
        toast.success('تم تحديث الوحدة بنجاح.')
      } else {
        await createCourseModule(courseId, { title, description, status })
        toast.success('تمت إضافة الوحدة بنجاح.')
      }
      setShowForm(false)
      load()
    } catch (err) {
      if (err instanceof ApiFieldError) setErrors(err.errors)
      else toast.error('تعذّر حفظ الوحدة.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(m: CourseModuleRow) {
    if (!window.confirm(`هل أنت متأكد من حذف الوحدة "${m.title}"؟ سيتم حذف جميع الدروس التابعة لها.`)) return
    try {
      await deleteCourseModule(m.id)
      toast.success('تم حذف الوحدة.')
      load()
    } catch {
      toast.error('تعذّر حذف الوحدة.')
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!modules) return
    const target = index + direction
    if (target < 0 || target >= modules.length) return
    const next = [...modules]
    ;[next[index], next[target]] = [next[target], next[index]]
    setModules(next)
    setReordering(true)
    try {
      await reorderCourseModules(courseId, next.map((m) => m.id))
      load()
    } catch {
      toast.error('تعذّر حفظ الترتيب.')
      load()
    } finally {
      setReordering(false)
    }
  }

  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}</div>
  }
  if (error) {
    return (
      <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 py-14 text-center">
        <p className="text-[13px] font-semibold text-red-500">تعذّر تحميل الوحدات</p>
        <button type="button" onClick={load} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-deepBlue px-4 py-2 text-[11px] font-black text-white">
          <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
        </button>
      </div>
    )
  }

  return (
    <div dir="rtl">
      <CourseScopeNotice />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] font-black text-deepBlue/60">{modules?.length ?? 0} وحدة</p>
        {canManage && (
          <button type="button" onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-deepBlue px-3 py-2 text-[11px] font-black text-white">
            <Plus className="h-3.5 w-3.5" /> إضافة وحدة
          </button>
        )}
      </div>

      {!modules || modules.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <Layers className="mx-auto h-8 w-8 text-deepBlue/20" />
          <p className="mt-3 text-[13px] font-semibold text-deepBlue/40">لا توجد وحدات بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {modules.map((m, i) => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-0.5">
                <button type="button" disabled={i === 0 || reordering} onClick={() => move(i, -1)} className="rounded-md p-0.5 text-deepBlue/40 hover:bg-slate-100 disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" disabled={i === modules.length - 1 || reordering} onClick={() => move(i, 1)} className="rounded-md p-0.5 text-deepBlue/40 hover:bg-slate-100 disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-bold text-deepBlue">{m.title}</p>
                  <StatusBadge status={m.status} />
                </div>
                {m.description && <p className="mt-0.5 truncate text-[11px] text-deepBlue/45">{m.description}</p>}
                <p className="mt-1 text-[10px] font-bold text-deepBlue/35">{m.lessons_count ?? m.lessons?.length ?? 0} درس</p>
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button type="button" onClick={() => openEdit(m)} className="rounded-lg border border-deepBlue/10 p-2 text-deepBlue/60 hover:border-[#0077B6]/30"><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => handleDelete(m)} className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div dir="rtl" className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[14px] font-black text-deepBlue">{editing ? 'تعديل الوحدة' : 'إضافة وحدة'}</h3>
              <button type="button" onClick={() => setShowForm(false)}><X className="h-4 w-4 text-deepBlue/40" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-deepBlue/40">العنوان</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#0077B6]" />
                <FieldError errors={errors} field="title" />
              </div>
              <div>
                <label className="text-[10px] font-black text-deepBlue/40">الوصف</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#0077B6]" />
                <FieldError errors={errors} field="description" />
              </div>
              <div>
                <label className="text-[10px] font-black text-deepBlue/40">الحالة</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#0077B6]">
                  {CONTENT_STATUS_VALUES.map((s) => <option key={s} value={s}>{CONTENT_STATUS_LABELS[s]}</option>)}
                </select>
                <FieldError errors={errors} field="status" />
              </div>
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

/* ══════════════════════════════════════════════════════════════════
   LESSONS TAB
══════════════════════════════════════════════════════════════════ */
export function LessonsTab({ courseId, canManage }: { courseId: number; canManage: boolean }) {
  const [modules, setModules] = useState<CourseModuleRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<LessonRow | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [duration, setDuration] = useState('')
  const [status, setStatus] = useState<ContentStatus>('active')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors | null>(null)
  const [reordering, setReordering] = useState(false)

  /** Imperative reload from an event handler — outside any effect, so it may flip to the
   *  loading state synchronously. */
  const load = () => {
    setLoading(true)
    setError(false)
    fetchCourseModules(courseId)
      .then((rows) => {
        setModules(rows)
        if (selectedModuleId === null && rows.length > 0) setSelectedModuleId(rows[0].id)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  // Re-arm the loading state during render when the course changes (react.dev
  // "adjusting state when a prop changes"); mount is covered by the initial values.
  const [seenCourseId, setSeenCourseId] = useState(courseId)
  if (seenCourseId !== courseId) {
    setSeenCourseId(courseId)
    setLoading(true)
    setError(false)
  }

  useEffect(() => {
    let alive = true
    fetchCourseModules(courseId)
      .then((rows) => {
        if (!alive) return
        setModules(rows)
        // Updater form so the effect does not have to close over `selectedModuleId`.
        if (rows.length > 0) setSelectedModuleId((prev) => prev ?? rows[0].id)
      })
      .catch(() => { if (alive) setError(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [courseId])

  const activeModule = modules?.find((m) => m.id === selectedModuleId) ?? null
  const lessons = (activeModule?.lessons ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)

  function openCreate() {
    if (!selectedModuleId) return
    setEditing(null); setTitle(''); setDescription(''); setVideoUrl(''); setDuration(''); setStatus('active'); setErrors(null); setShowForm(true)
  }
  function openEdit(l: LessonRow) {
    setEditing(l); setTitle(l.title); setDescription(l.description ?? ''); setVideoUrl(l.video_url ?? '')
    setDuration(l.duration_minutes ? String(l.duration_minutes) : ''); setStatus(l.status); setErrors(null); setShowForm(true)
  }

  async function handleSave() {
    if (!selectedModuleId) return
    setSaving(true)
    setErrors(null)
    try {
      const payload = {
        title, description, video_url: videoUrl || undefined,
        duration_minutes: duration ? Number(duration) : undefined, status,
      }
      if (editing) {
        await updateLesson(editing.id, payload)
        toast.success('تم تحديث الدرس بنجاح.')
      } else {
        await createLesson(courseId, { ...payload, module_id: selectedModuleId })
        toast.success('تمت إضافة الدرس بنجاح.')
      }
      setShowForm(false)
      load()
    } catch (err) {
      if (err instanceof ApiFieldError) setErrors(err.errors)
      else toast.error('تعذّر حفظ الدرس.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(l: LessonRow) {
    if (!window.confirm(`هل أنت متأكد من حذف الدرس "${l.title}"؟`)) return
    try {
      await deleteLesson(l.id)
      toast.success('تم حذف الدرس.')
      load()
    } catch {
      toast.error('تعذّر حذف الدرس.')
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!selectedModuleId) return
    const target = index + direction
    if (target < 0 || target >= lessons.length) return
    const next = [...lessons]
    ;[next[index], next[target]] = [next[target], next[index]]
    setReordering(true)
    try {
      await reorderLessons(courseId, selectedModuleId, next.map((l) => l.id))
      load()
    } catch {
      toast.error('تعذّر حفظ ترتيب الدروس.')
      load()
    } finally {
      setReordering(false)
    }
  }

  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}</div>
  }
  if (error) {
    return (
      <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 py-14 text-center">
        <p className="text-[13px] font-semibold text-red-500">تعذّر تحميل الدروس</p>
        <button type="button" onClick={load} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-deepBlue px-4 py-2 text-[11px] font-black text-white">
          <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
        </button>
      </div>
    )
  }
  if (!modules || modules.length === 0) {
    return (
      <div dir="rtl">
        <CourseScopeNotice />
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <p className="text-[13px] font-semibold text-deepBlue/40">أضف وحدة أولاً من تبويب "الوحدات" قبل إضافة الدروس</p>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl">
      <CourseScopeNotice />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <select value={selectedModuleId ?? ''} onChange={(e) => setSelectedModuleId(Number(e.target.value))}
          className="rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#0077B6]">
          {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        {canManage && (
          <button type="button" onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-deepBlue px-3 py-2 text-[11px] font-black text-white">
            <Plus className="h-3.5 w-3.5" /> إضافة درس
          </button>
        )}
      </div>

      {lessons.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <p className="text-[13px] font-semibold text-deepBlue/40">لا توجد دروس في هذه الوحدة بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map((l, i) => (
            <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-0.5">
                <button type="button" disabled={i === 0 || reordering} onClick={() => move(i, -1)} className="rounded-md p-0.5 text-deepBlue/40 hover:bg-slate-100 disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" disabled={i === lessons.length - 1 || reordering} onClick={() => move(i, 1)} className="rounded-md p-0.5 text-deepBlue/40 hover:bg-slate-100 disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-bold text-deepBlue">{l.title}</p>
                  <StatusBadge status={l.status} />
                </div>
                {l.duration_minutes && <p className="mt-0.5 text-[10px] font-bold text-deepBlue/35">{l.duration_minutes} دقيقة</p>}
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button type="button" onClick={() => openEdit(l)} className="rounded-lg border border-deepBlue/10 p-2 text-deepBlue/60 hover:border-[#0077B6]/30"><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => handleDelete(l)} className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div dir="rtl" className="w-full max-w-md rounded-2xl bg-white p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[14px] font-black text-deepBlue">{editing ? 'تعديل الدرس' : 'إضافة درس'}</h3>
              <button type="button" onClick={() => setShowForm(false)}><X className="h-4 w-4 text-deepBlue/40" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-deepBlue/40">العنوان</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#0077B6]" />
                <FieldError errors={errors} field="title" />
              </div>
              <div>
                <label className="text-[10px] font-black text-deepBlue/40">الوصف</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#0077B6]" />
              </div>
              <div>
                <label className="text-[10px] font-black text-deepBlue/40">رابط الفيديو</label>
                <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} dir="ltr" className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#0077B6]" />
                <FieldError errors={errors} field="video_url" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-deepBlue/40">المدة (دقيقة)</label>
                  <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#0077B6]" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-deepBlue/40">الحالة</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#0077B6]">
                    {CONTENT_STATUS_VALUES.map((s) => <option key={s} value={s}>{CONTENT_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>
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

/* ══════════════════════════════════════════════════════════════════
   CURRICULUM OVERVIEW TAB (read-only tree)
══════════════════════════════════════════════════════════════════ */
export function CurriculumOverviewTab({ courseId }: { courseId: number }) {
  const [modules, setModules] = useState<CourseModuleRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  /** Retry from the error state — outside any effect, so it may flip to the loading
   *  state synchronously. */
  const load = () => {
    setLoading(true)
    setError(false)
    fetchCourseModules(courseId).then(setModules).catch(() => setError(true)).finally(() => setLoading(false))
  }

  // Re-arm the loading state during render when the course changes (react.dev
  // "adjusting state when a prop changes"); mount is covered by the initial values.
  const [seenCourseId, setSeenCourseId] = useState(courseId)
  if (seenCourseId !== courseId) {
    setSeenCourseId(courseId)
    setLoading(true)
    setError(false)
  }

  useEffect(() => {
    let alive = true
    fetchCourseModules(courseId)
      .then((rows) => { if (alive) setModules(rows) })
      .catch(() => { if (alive) setError(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [courseId])

  if (loading) return <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}</div>
  if (error) {
    return (
      <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 py-14 text-center">
        <p className="text-[13px] font-semibold text-red-500">تعذّر تحميل المنهج</p>
        <button type="button" onClick={load} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-deepBlue px-4 py-2 text-[11px] font-black text-white">
          <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
        </button>
      </div>
    )
  }

  return (
    <div dir="rtl">
      <CourseScopeNotice />
      {!modules || modules.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <p className="text-[13px] font-semibold text-deepBlue/40">لا يوجد منهج بعد أضف وحدات من تبويب "الوحدات"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.sort((a, b) => a.sort_order - b.sort_order).map((m) => (
            <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#0077B6]" />
                <p className="text-[13px] font-black text-deepBlue">{m.title}</p>
                <StatusBadge status={m.status} />
              </div>
              {(m.lessons ?? []).length > 0 && (
                <ul className="mt-2 mr-6 space-y-1 border-r border-slate-100 pr-3">
                  {(m.lessons ?? []).slice().sort((a, b) => a.sort_order - b.sort_order).map((l) => (
                    <li key={l.id} className="flex items-center gap-2 text-[11px] font-semibold text-deepBlue/60">
                      <span>{l.title}</span>
                      <StatusBadge status={l.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
