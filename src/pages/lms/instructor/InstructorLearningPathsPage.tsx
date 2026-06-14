import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Award,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Route,
  Users,
} from 'lucide-react'
import { fetchInstructorLearningPaths, type LearningPath } from '@/api/learningPathsApi'
import { InstructorHero } from '@/components/instructor'

/* ── Helpers ───────────────────────────────────────────────────────────── */

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n)

/* ── Status config ─────────────────────────────────────────────────────── */

type StatusFilter = 'all' | 'published' | 'draft' | 'archived'

const STATUS_CFG: Record<string, { label: string; badge: string; glow: string }> = {
  published: {
    label: 'منشور',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    glow:  'from-emerald-500/20 to-[#2691C2]/10',
  },
  draft: {
    label: 'مسودة',
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
    glow:  'from-slate-400/10 to-slate-200/10',
  },
  archived: {
    label: 'مؤرشف',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    glow:  'from-amber-400/20 to-amber-200/10',
  },
}

const FILTER_OPTS: { id: StatusFilter; label: string }[] = [
  { id: 'all',       label: 'الكل'   },
  { id: 'published', label: 'منشور'  },
  { id: 'draft',     label: 'مسودة'  },
  { id: 'archived',  label: 'مؤرشف' },
]

/* ── Path Card ─────────────────────────────────────────────────────────── */

function PathCard({ path, index }: { path: LearningPath; index: number }) {
  const cfg = STATUS_CFG[path.status] ?? STATUS_CFG.draft

  const durationLabel = path.duration
    ? `${path.duration} ${
        path.duration_unit === 'weeks' ? 'أسبوع' : path.duration_unit === 'months' ? 'شهر' : 'يوم'
      }`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.055 }}
    >
      <Link
        to={`/dashboard/instructor/learning-paths/${path.id}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#2691C2]/40 hover:shadow-xl"
      >
        {/* Cover image / gradient */}
        <div className="relative h-32 shrink-0 overflow-hidden bg-gradient-to-br from-[#22334A] to-[#2691C2]">
          {path.featured_image ? (
            <img
              src={path.featured_image}
              alt={path.title}
              className="h-full w-full object-cover opacity-75 transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <>
              {/* Decorative pattern */}
              <div className={`absolute inset-0 bg-gradient-to-br ${cfg.glow} opacity-40`} />
              <GraduationCap className="absolute inset-0 m-auto h-14 w-14 text-white/10" />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#22334A]/70 via-transparent to-transparent" />

          {/* Status badge */}
          <div className="absolute bottom-3 right-3">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black backdrop-blur-sm ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>

          {/* Certificate badge */}
          {path.certificate_name && (
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-400/20 px-2 py-0.5 text-[9px] font-black text-amber-200 backdrop-blur-sm">
                <Award className="h-3 w-3" />
                شهادة
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          {/* Title */}
          <h3 className="line-clamp-2 font-black leading-snug text-[#22334A] transition-colors group-hover:text-[#2691C2]">
            {path.title}
          </h3>

          {/* Short description */}
          {path.short_description && (
            <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-500">
              {path.short_description}
            </p>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3 w-3 text-[#EC943C]" />
              {fmt(path.courses_count)} دورة
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3 text-[#2691C2]" />
              {fmt(path.students_count)} طالب
            </span>
            {durationLabel && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400" />
                {durationLabel}
              </span>
            )}
          </div>

          {/* Next session preview if path has courses */}
          {(path.courses?.length ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-[#2691C2]/10 bg-[#2691C2]/[0.04] px-3 py-2">
              <Calendar className="h-3 w-3 shrink-0 text-[#2691C2]" />
              <span className="text-[11px] font-semibold text-[#22334A]/70">
                {fmt(path.courses_count)} دورة مضمّنة في المسار
              </span>
            </div>
          )}

          {/* Footer: instructor + CTA */}
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              {path.instructor?.avatar_url ? (
                <img
                  src={path.instructor.avatar_url}
                  alt={path.instructor.name}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : path.instructor?.name ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#22334A]/10 text-[9px] font-black text-[#22334A]">
                  {path.instructor.name.charAt(0)}
                </div>
              ) : null}
              {path.instructor?.name && (
                <span className="text-[11px] font-semibold text-slate-400">
                  {path.instructor.name}
                </span>
              )}
            </div>

            <span className="inline-flex items-center gap-1 rounded-xl bg-[#22334A] px-3 py-1.5 text-[11px] font-black text-white transition-colors group-hover:bg-[#2691C2]">
              إدارة المسار
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function InstructorLearningPathsPage() {
  const [paths,    setPaths]   = useState<LearningPath[]>([])
  const [loading,  setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [accessMessage, setAccessMessage] = useState<string | null>(null)
  const [search,   setSearch]  = useState('')
  const [filter,   setFilter]  = useState<StatusFilter>('all')

  const load = () => {
    setLoading(true)
    setForbidden(false)
    setLoadError(false)
    setNotFound(false)
    setAccessMessage(null)
    fetchInstructorLearningPaths()
      .then(({ paths: list, forbidden: denied, message, loadError: err, notFound: nf }) => {
        setPaths(list)
        setForbidden(denied)
        setLoadError(Boolean(err))
        setNotFound(Boolean(nf))
        setAccessMessage(message ?? null)
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const stats = useMemo(() => ({
    total:    paths.length,
    students: paths.reduce((s, p) => s + (p.students_count ?? 0), 0),
    courses:  paths.reduce((s, p) => s + (p.courses_count  ?? 0), 0),
  }), [paths])

  const filtered = useMemo(() => {
    let list = paths
    if (filter !== 'all')   list = list.filter((p) => p.status === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) => p.title.toLowerCase().includes(q))
    }
    return list
  }, [paths, filter, search])

  return (
    <div className="space-y-5 pb-16 text-right" dir="rtl">

      <InstructorHero
        title="مساراتي التعليمية"
        subtitle="المسارات التعليمية المُسنَدة إليك كمدرب"
        eyebrow="لوحة المدرب"
        onRefresh={load}
        refreshing={loading}
        pills={loading ? [] : [
          { label: 'المسارات', value: fmt(stats.total)    },
          { label: 'الطلاب',   value: fmt(stats.students) },
          { label: 'الدورات',  value: fmt(stats.courses)  },
        ]}
      />

      {/* Search + Status filter */}
      {!loading && !forbidden && paths.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن مسار..."
            className="min-w-[180px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-[#22334A] placeholder:text-slate-400 outline-none focus:border-[#2691C2]/50 focus:ring-1 focus:ring-[#2691C2]/20"
          />
          <div className="flex gap-1.5">
            {FILTER_OPTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-2xl px-3 py-2 text-[12px] font-black transition ${
                  filter === f.id
                    ? 'bg-[#22334A] text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-[#22334A]/30 hover:text-[#22334A]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-72 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      )}

      {/* Load error */}
      {!loading && loadError && !forbidden && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-amber-200 bg-amber-50/80 py-16 text-center shadow-sm">
          <p className="text-lg font-black text-[#22334A]">{accessMessage ?? 'تعذر تحميل المسارات.'}</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 rounded-2xl bg-[#22334A] px-5 py-2.5 text-[12px] font-black text-white"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Access denied */}
      {!loading && forbidden && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50/80 py-20 text-center shadow-sm">
          <p className="text-lg font-black text-[#22334A]">{accessMessage ?? 'لا تملك صلاحية عرض مسارات التعلّم.'}</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] text-slate-500">
            تواصل مع الإدارة إذا كنت تعتقد أن هذا خطأ.
          </p>
        </div>
      )}

      {/* Empty — no paths assigned */}
      {!loading && !forbidden && !loadError && (paths.length === 0 || notFound) && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-24 text-center shadow-sm">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#22334A]/5 to-[#2691C2]/10">
            <Route className="h-9 w-9 text-[#22334A]/20" />
          </div>
          <p className="text-lg font-black text-[#22334A]">لا توجد مسارات تعليمية مرتبطة بك</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] text-slate-400">
            تواصل مع الإدارة لتسنيد مسار تعليمي إليك، أو لإضافتك كمدرب لأحد دورات مسار قائم.
          </p>
        </div>
      )}

      {/* Empty — search/filter produced no results */}
      {!loading && !forbidden && paths.length > 0 && filtered.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white py-12 text-center">
          <p className="font-black text-[#22334A]">لا نتائج مطابقة</p>
          <button
            type="button"
            onClick={() => { setSearch(''); setFilter('all') }}
            className="mt-3 text-[12px] font-black text-[#2691C2] hover:underline"
          >
            مسح الفلاتر
          </button>
        </div>
      )}

      {/* Path cards */}
      {!loading && !loadError && !forbidden && filtered.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((path, i) => (
            <PathCard key={path.id} path={path} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
