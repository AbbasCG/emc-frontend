import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, ChevronUp, ChevronDown, Loader2, BookOpen,
  Pencil, AlertCircle, Trash2, Save, Check,
} from 'lucide-react'
import { fetchAdminCoursesStrict } from '@/api/superAdminCatalogApi'
import { updateCourse } from '@/api/adminCoursesApi'
import type { Course } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(s?: string | null) {
  if (s === 'published') return { label: 'منشور',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (s === 'draft')     return { label: 'مسودة',  cls: 'bg-slate-100 text-slate-600 border-slate-200' }
  if (s === 'archived')  return { label: 'مؤرشف', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: s ?? '—', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
}

function kindLabel(c: Course): string {
  const pt = (c as { program_type?: string }).program_type
  if (pt === 'workshop')     return 'ورشة'
  if (pt === 'one_session')  return 'جلسة'
  if (pt === 'full_program') return 'برنامج'
  return 'دورة'
}

function courseThumb(c: Course) {
  const src = c.course_image ?? c.image_url
    ?? (c as { thumbnail?: string }).thumbnail
    ?? (c as { cover_image?: string }).cover_image
    ?? c.image ?? null
  if (src) return <img src={src} alt={c.title} className="h-9 w-12 shrink-0 rounded-xl object-cover" />
  return (
    <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
      <BookOpen className="h-4 w-4 text-slate-300" />
    </div>
  )
}

// ── Inline edit panel ─────────────────────────────────────────────────────────

interface EditState { title: string; description: string; duration: string; level: string; status: string }

function InlineEditPanel({
  course, onSaved, onCancel,
}: { course: Course; onSaved: (updated: Course) => void; onCancel: () => void }) {
  const [form, setForm] = useState<EditState>({
    title:       course.title ?? '',
    description: course.description ?? '',
    duration:    course.duration ?? '',
    level:       course.level ?? '',
    status:      course.status ?? 'draft',
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const set = (key: keyof EditState, val: string) => setForm((f) => ({ ...f, [key]: val }))

  async function handleSave() {
    if (!form.title.trim()) { setError('العنوان مطلوب'); return }
    setSaving(true)
    setError(null)
    try {
      const updated = await updateCourse(course.id, {
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        duration:    form.duration.trim() || undefined,
        level:       form.level.trim() || undefined,
        status:      (form.status || 'draft') as 'draft' | 'published' | 'archived',
        type:        (course as { type?: 'free' | 'paid' }).type ?? 'free',
      })
      setSuccess(true)
      setTimeout(() => onSaved(updated), 650)
    } catch {
      setError('فشل الحفظ — تحقق من الاتصال')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', damping: 32, stiffness: 320 }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded-2xl border border-[#2691C2]/25 bg-[#2691C2]/[0.04] p-4" dir="rtl">
        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#2691C2]">
          تعديل سريع
        </p>

        {success ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center gap-2 py-3 text-emerald-600"
          >
            <Check className="h-5 w-5" />
            <span className="font-black">تم الحفظ بنجاح</span>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-black text-slate-700">العنوان *</label>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-right focus:border-[#2691C2] focus:outline-none focus:ring-2 focus:ring-[#2691C2]/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-black text-slate-700">الوصف</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-right focus:border-[#2691C2] focus:outline-none focus:ring-2 focus:ring-[#2691C2]/20"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-black text-slate-700">المدة</label>
                <input
                  value={form.duration}
                  onChange={(e) => set('duration', e.target.value)}
                  placeholder="4 أسابيع"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-right focus:border-[#2691C2] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-black text-slate-700">المستوى</label>
                <select
                  value={form.level}
                  onChange={(e) => set('level', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-right focus:border-[#2691C2] focus:outline-none"
                >
                  <option value="">—</option>
                  <option value="مبتدئ">مبتدئ</option>
                  <option value="متوسط">متوسط</option>
                  <option value="متقدم">متقدم</option>
                  <option value="beginner">beginner</option>
                  <option value="intermediate">intermediate</option>
                  <option value="advanced">advanced</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-black text-slate-700">الحالة</label>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-right focus:border-[#2691C2] focus:outline-none"
                >
                  <option value="draft">مسودة</option>
                  <option value="published">منشور</option>
                  <option value="archived">مؤرشف</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <motion.button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2691C2] px-4 py-1.5 text-xs font-black text-white disabled:opacity-60 hover:bg-[#1d7aab] transition-colors"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                حفظ
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Confirm remove ────────────────────────────────────────────────────────────

function ConfirmRemove({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 p-3"
    >
      <p className="mb-2 text-xs font-bold text-rose-800">إزالة «{title}» من المسار؟</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-700 transition-colors"
        >
          إزالة
        </button>
      </div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { value: number[]; onChange: (ids: number[]) => void }

export default function CourseSelector({ value, onChange }: Props) {
  const [catalog, setCatalog]     = useState<Course[]>([])
  const [fetching, setFetching]   = useState(true)
  const [search, setSearch]       = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  useEffect(() => {
    fetchAdminCoursesStrict().then((res) => {
      if (res.ok) setCatalog(res.rows)
      setFetching(false)
    })
  }, [])

  const selectedSet = useMemo(() => new Set(value), [value])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter((c) => {
      const instr = c.instructor?.name ?? (c as { instructor_name?: string }).instructor_name ?? ''
      return c.title.toLowerCase().includes(q) || instr.toLowerCase().includes(q)
    })
  }, [catalog, search])

  const selectedCourses = useMemo(
    () => value.map((id) => ({ id, course: catalog.find((c) => c.id === id) ?? null })),
    [value, catalog],
  )

  const add    = (id: number) => { if (!selectedSet.has(id)) onChange([...value, id]) }
  const remove = (id: number) => { onChange(value.filter((v) => v !== id)); setConfirmId(null); setEditingId(null) }

  const move = (i: number, dir: -1 | 1) => {
    const arr = [...value]
    ;[arr[i], arr[i + dir]] = [arr[i + dir], arr[i]]
    onChange(arr)
  }

  const handleUpdated = useCallback((updated: Course) => {
    setCatalog((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    setEditingId(null)
  }, [])

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── Selected courses ─────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">الدورات المضافة</span>
          <span className="rounded-full bg-[#2691C2] px-2.5 py-0.5 text-[10px] font-black text-white">
            {selectedCourses.length}
          </span>
        </div>

        {selectedCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center">
            <BookOpen className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-400">لم تُضَف دورات بعد</p>
            <p className="mt-1 text-xs text-slate-300">ابحث في الكتالوج أدناه</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {selectedCourses.map(({ id, course }, i) => {
                const { label, cls } = statusBadge(course?.status)
                const isEditing    = editingId === id
                const isConfirming = confirmId === id

                return (
                  <motion.div
                    key={id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20, transition: { duration: 0.16 } }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      whileHover={{ y: -1, boxShadow: '0 4px 16px -4px rgba(38,145,194,0.15)' }}
                      className={`rounded-2xl border bg-white px-4 py-3 transition-colors ${
                        isEditing ? 'border-[#2691C2]/40 ring-2 ring-[#2691C2]/15' : 'border-slate-200 hover:border-[#2691C2]/25'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Index */}
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#2691C2] text-[11px] font-black text-white">
                          {i + 1}
                        </span>

                        {/* Thumb */}
                        {course ? courseThumb(course) : (
                          <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-[10px] font-bold text-slate-400">
                            #{id}
                          </div>
                        )}

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-black text-[#22334A]" style={{ maxWidth: '22ch' }}>
                              {course?.title ?? `دورة #${id}`}
                            </p>
                            {course && (
                              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500">
                                {kindLabel(course)}
                              </span>
                            )}
                            <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>
                              {label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {course?.instructor?.name ?? (course as { instructor_name?: string } | null)?.instructor_name ?? '—'}
                            {course?.duration ? ` · ${course.duration}` : ''}
                            {course?.level ? ` · ${course.level}` : ''}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => move(i, -1)}
                            disabled={i === 0}
                            title="لأعلى"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-20 transition-colors"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(i, 1)}
                            disabled={i === selectedCourses.length - 1}
                            title="لأسفل"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-20 transition-colors"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setConfirmId(null); setEditingId(isEditing ? null : id) }}
                            title="تعديل"
                            className={`rounded-lg p-1.5 transition-colors ${
                              isEditing ? 'bg-[#2691C2]/15 text-[#2691C2]' : 'text-slate-400 hover:bg-[#2691C2]/10 hover:text-[#2691C2]'
                            }`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </motion.button>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setEditingId(null); setConfirmId(isConfirming ? null : id) }}
                            title="إزالة"
                            className={`rounded-lg p-1.5 transition-colors ${
                              isConfirming ? 'bg-rose-100 text-rose-600' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-500'
                            }`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </motion.button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isEditing && course && (
                          <InlineEditPanel
                            key={`edit-${id}`}
                            course={course}
                            onSaved={handleUpdated}
                            onCancel={() => setEditingId(null)}
                          />
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {isConfirming && (
                          <ConfirmRemove
                            key={`confirm-${id}`}
                            title={course?.title ?? `#${id}`}
                            onConfirm={() => remove(id)}
                            onCancel={() => setConfirmId(null)}
                          />
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Catalog search ───────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-[11px] font-black uppercase tracking-wide text-slate-500">
          إضافة دورات من الكتالوج
        </p>
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالعنوان أو اسم المدرب..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-9 text-sm text-right focus:border-[#2691C2] focus:outline-none focus:ring-2 focus:ring-[#2691C2]/20"
          />
        </div>

        {fetching ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#2691C2]" />
          </div>
        ) : catalog.length === 0 ? (
          <p className="rounded-xl border border-slate-200 py-6 text-center text-sm text-slate-400">لا دورات متاحة</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-slate-200 py-6 text-center text-sm text-slate-400">لا نتائج تطابق «{search}»</p>
        ) : (
          <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200">
            {filtered.map((course) => {
              const already = selectedSet.has(course.id)
              const { label, cls } = statusBadge(course.status)
              return (
                <motion.div
                  key={course.id}
                  whileHover={already ? {} : { backgroundColor: 'rgba(38,145,194,0.04)' }}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${already ? 'opacity-60' : ''}`}
                >
                  {courseThumb(course)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#22334A]">{course.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {course.instructor?.name ?? (course as { instructor_name?: string }).instructor_name ?? '—'}
                      {course.duration ? ` · ${course.duration}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>
                    {label}
                  </span>
                  {already ? (
                    <span className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                      مضاف ✓
                    </span>
                  ) : (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => add(course.id)}
                      className="shrink-0 rounded-xl bg-[#2691C2] px-3 py-1.5 text-xs font-black text-white hover:bg-[#1d7aab] transition-colors"
                    >
                      إضافة
                    </motion.button>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
