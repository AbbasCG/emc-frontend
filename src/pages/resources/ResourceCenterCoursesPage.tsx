import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import QRCode from 'qrcode'
import {
  BookMarked,
  Copy,
  Download,
  Grid3x3,
  Heart,
  List,
  QrCode,
  RefreshCw,
  Search,
  Share2,
  Users,
  X,
} from 'lucide-react'
import {
  exportResourceCenterCourses,
  fetchResourceCenterCourses,
  toggleResourceCenterFavorite,
  type ResourceCenterCourse,
  type ResourceCenterFilters,
} from '@/api/resourceCenterApi'

type ViewMode = 'grid' | 'table'

const STATUS_LABELS: Record<string, string> = {
  published: 'منشورة',
  draft: 'مسودة',
  archived: 'مؤرشفة',
}

const TYPE_LABELS: Record<string, string> = {
  course: 'دورة',
  workshop: 'ورشة',
  one_session: 'جلسة واحدة',
  full_program: 'برنامج كامل',
}

function statusBadgeClass(status: string) {
  if (status === 'published') return 'bg-emerald-50 text-emerald-700'
  if (status === 'draft') return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-[#0C2A4B] px-5 py-3 text-sm font-bold text-white shadow-xl"
    >
      {message}
    </motion.div>
  )
}

function ShareModal({ course, onClose }: { course: ResourceCenterCourse; onClose: () => void }) {
  const text = encodeURIComponent(course.title)
  const url = encodeURIComponent(course.public_url)
  const links = [
    { label: 'واتساب', href: `https://wa.me/?text=${text}%20${url}` },
    { label: 'تيليجرام', href: `https://t.me/share/url?url=${url}&text=${text}` },
    { label: 'البريد الإلكتروني', href: `mailto:?subject=${text}&body=${url}` },
  ]
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex items-center justify-center bg-[#0F172A]/40 p-4"
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        dir="rtl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-black text-[#0C2A4B]">مشاركة الدورة</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {l.label}
            </a>
          ))}
          <button
            onClick={async () => {
              await copyText(course.public_url)
              onClose()
            }}
            className="block w-full rounded-xl bg-deepBlue px-4 py-2.5 text-right text-sm font-bold text-white transition hover:opacity-90"
          >
            نسخ الرابط
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function QrModal({ course, onClose }: { course: ResourceCenterCourse; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(course.public_url, { width: 320, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [course.public_url])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex items-center justify-center bg-[#0F172A]/40 p-4"
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-2xl"
        dir="rtl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-black text-[#0C2A4B]">رمز QR</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        {dataUrl ? (
          <img src={dataUrl} alt={course.title} className="mx-auto mb-4 rounded-xl border border-slate-100" />
        ) : (
          <div className="mx-auto mb-4 h-64 w-64 animate-pulse rounded-xl bg-slate-100" />
        )}
        <div className="flex gap-2">
          <a
            href={dataUrl ?? undefined}
            download={`qr-${course.slug}.png`}
            className="flex-1 rounded-xl bg-deepBlue px-4 py-2 text-xs font-bold text-white"
          >
            تحميل
          </a>
          <button
            onClick={async () => {
              await copyText(course.public_url)
            }}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
          >
            نسخ الرابط
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function CourseCard({
  course,
  onToast,
  onFavorite,
  onShare,
  onQr,
}: {
  course: ResourceCenterCourse
  onToast: (m: string) => void
  onFavorite: (id: number) => void
  onShare: (c: ResourceCenterCourse) => void
  onQr: (c: ResourceCenterCourse) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
    >
      <div className="relative h-32 bg-gradient-to-br from-deepBlue to-[#0077B6]">
        {course.course_thumbnail || course.course_image ? (
          <img
            src={course.course_thumbnail ?? course.course_image ?? ''}
            alt={course.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookMarked className="text-white/70" size={32} />
          </div>
        )}
        <div className="absolute inset-x-2 top-2 flex items-center justify-between">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-deepBlue">
            {TYPE_LABELS[course.program_type] ?? course.program_type}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusBadgeClass(course.status)}`}>
            {STATUS_LABELS[course.status] ?? course.status}
          </span>
        </div>
        <button
          onClick={() => onFavorite(course.id)}
          className="absolute bottom-2 left-2 rounded-full bg-white/90 p-1.5 transition hover:bg-white"
        >
          <Heart size={14} className={course.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 line-clamp-1 text-sm font-black text-[#0C2A4B]">{course.title}</h3>
        <p className="mb-2 line-clamp-2 flex-1 text-xs text-slate-500">
          {course.short_description ?? course.description ?? '—'}
        </p>
        <div className="mb-3 flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-semibold">{course.instructor?.user?.name ?? '—'}</span>
          <span className="flex items-center gap-1">
            <Users size={12} />
            {course.effective_enrollment_count ?? course.registrations_count ?? 0}
          </span>
        </div>

        <div className="flex items-center gap-1.5 border-t border-slate-100 pt-3">
          <a
            href={course.public_url}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-lg bg-deepBlue px-2 py-1.5 text-center text-[11px] font-bold text-white transition hover:opacity-90"
          >
            فتح الدورة
          </a>
          <button
            title="نسخ الرابط"
            onClick={async () => {
              const ok = await copyText(course.public_url)
              onToast(ok ? 'تم نسخ الرابط بنجاح ✅' : 'تعذر نسخ الرابط')
            }}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50"
          >
            <Copy size={13} />
          </button>
          <button
            title="رمز QR"
            onClick={() => onQr(course)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50"
          >
            <QrCode size={13} />
          </button>
          <button
            title="مشاركة"
            onClick={() => onShare(course)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50"
          >
            <Share2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function ResourceCenterCoursesPage() {
  const [courses, setCourses] = useState<ResourceCenterCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [programType, setProgramType] = useState('')
  const [sort, setSort] = useState<ResourceCenterFilters['sort']>('latest')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [shareCourse, setShareCourse] = useState<ResourceCenterCourse | null>(null)
  const [qrCourse, setQrCourse] = useState<ResourceCenterCourse | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filters: ResourceCenterFilters = useMemo(
    () => ({
      search: search || undefined,
      status: status || undefined,
      program_type: programType || undefined,
      sort,
      per_page: 60,
    }),
    [search, status, programType, sort],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchResourceCenterCourses(filters)
      setCourses(res.data)
    } catch {
      setError('تعذر تحميل مكتبة الدورات')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void load()
  }, [load])

  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(searchInput), 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  const visibleCourses = favoritesOnly ? courses.filter((c) => c.is_favorite) : courses

  const handleFavorite = async (id: number) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, is_favorite: !c.is_favorite } : c)))
    try {
      await toggleResourceCenterFavorite(id)
    } catch {
      setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, is_favorite: !c.is_favorite } : c)))
    }
  }

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      await exportResourceCenterCourses(format, filters)
      setToast('جاري تنزيل الملف...')
    } catch {
      setToast('تعذر تصدير البيانات')
    }
  }

  return (
    <div dir="rtl" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#0C2A4B]">مكتبة الدورات</h1>
          <p className="mt-1 text-sm text-slate-500">
            الوصول السريع إلى جميع الدورات والورش والمسارات التعليمية وروابطها.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <Download size={14} />
            CSV
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <Download size={14} />
            Excel
          </button>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-deepBlue px-3 py-2 text-xs font-bold text-white transition hover:opacity-90"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ابحث بالعنوان، المدرب، التصنيف..."
            className="w-full rounded-xl border border-slate-200 py-2 pl-3 pr-9 text-sm focus:border-deepBlue focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
        >
          <option value="">كل الحالات</option>
          <option value="published">منشورة</option>
          <option value="draft">مسودة</option>
          <option value="archived">مؤرشفة</option>
        </select>
        <select
          value={programType}
          onChange={(e) => setProgramType(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
        >
          <option value="">كل الأنواع</option>
          <option value="course">دورات</option>
          <option value="workshop">ورش</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as ResourceCenterFilters['sort'])}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
        >
          <option value="latest">الأحدث أولاً</option>
          <option value="oldest">الأقدم أولاً</option>
          <option value="title_asc">العنوان (أ-ي)</option>
          <option value="title_desc">العنوان (ي-أ)</option>
        </select>
        <button
          onClick={() => setFavoritesOnly((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
            favoritesOnly ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Heart size={13} className={favoritesOnly ? 'fill-rose-500' : ''} />
          المفضلة
        </button>
        <div className="flex overflow-hidden rounded-xl border border-slate-200">
          <button
            onClick={() => setView('grid')}
            className={`p-2 transition ${view === 'grid' ? 'bg-deepBlue text-white' : 'text-slate-500'}`}
          >
            <Grid3x3 size={15} />
          </button>
          <button
            onClick={() => setView('table')}
            className={`p-2 transition ${view === 'table' ? 'bg-deepBlue text-white' : 'text-slate-500'}`}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-bold text-red-500">{error}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : visibleCourses.length === 0 ? (
        <div className="rounded-2xl bg-white p-14 text-center shadow-sm ring-1 ring-slate-100">
          <BookMarked className="mx-auto mb-3 text-slate-200" size={36} />
          <p className="text-sm font-bold text-slate-400">لا توجد دورات مطابقة</p>
        </div>
      ) : view === 'grid' ? (
        <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {visibleCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                onToast={setToast}
                onFavorite={handleFavorite}
                onShare={setShareCourse}
                onQr={setQrCourse}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-4 py-3.5 text-xs font-black text-slate-500">الدورة</th>
                  <th className="px-4 py-3.5 text-xs font-black text-slate-500">المدرب</th>
                  <th className="px-4 py-3.5 text-xs font-black text-slate-500">النوع</th>
                  <th className="px-4 py-3.5 text-xs font-black text-slate-500">الحالة</th>
                  <th className="px-4 py-3.5 text-xs font-black text-slate-500">الطلاب</th>
                  <th className="px-4 py-3.5 text-xs font-black text-slate-500">الرابط</th>
                  <th className="px-4 py-3.5 text-xs font-black text-slate-500">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {visibleCourses.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-black text-deepBlue">{c.title}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{c.instructor?.user?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{TYPE_LABELS[c.program_type] ?? c.program_type}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusBadgeClass(c.status)}`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.effective_enrollment_count ?? c.registrations_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <a href={c.public_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-deepBlue underline">
                        فتح
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={async () => {
                            const ok = await copyText(c.public_url)
                            setToast(ok ? 'تم نسخ الرابط بنجاح ✅' : 'تعذر نسخ الرابط')
                          }}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => setQrCourse(c)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                        >
                          <QrCode size={13} />
                        </button>
                        <button
                          onClick={() => handleFavorite(c.id)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                        >
                          <Heart size={13} className={c.is_favorite ? 'fill-rose-500 text-rose-500' : ''} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>{shareCourse && <ShareModal course={shareCourse} onClose={() => setShareCourse(null)} />}</AnimatePresence>
      <AnimatePresence>{qrCourse && <QrModal course={qrCourse} onClose={() => setQrCourse(null)} />}</AnimatePresence>
      <AnimatePresence>{toast && <Toast message={toast} onDone={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}
