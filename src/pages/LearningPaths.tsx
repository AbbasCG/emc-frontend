import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap,
  Clock,
  BookOpen,
  Award,
  Users,
  ChevronLeft,
  Search,
  Loader2,
  Star,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { fetchPublicLearningPaths, type LearningPath } from '../api/learningPathsApi'
import { formatEuroInteger } from '../utils/currency'
import PublicSeo from '@/components/public/PublicSeo'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

function LevelBadge({ level }: { level: string | null }) {
  if (!level) return null
  const map: Record<string, string> = {
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم',
  }
  const colors: Record<string, string> = {
    beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
    advanced: 'bg-rose-50 text-rose-700 border-rose-200',
  }
  const key = level.toLowerCase()
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${colors[key] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {map[key] ?? level}
    </span>
  )
}

function PathCard({ path, index }: { path: LearningPath; index: number }) {
  const price =
    path.discount_price != null
      ? path.discount_price
      : path.price

  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -6 }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:border-[#2691C2]/40 hover:shadow-xl"
    >
      {/* Image */}
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[#22334A] to-[#2691C2]">
        {path.featured_image ? (
          <img
            src={path.featured_image}
            alt={path.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <GraduationCap className="h-16 w-16 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#22334A]/70 via-transparent to-transparent" />

        {path.is_featured && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EC943C] px-2.5 py-1 text-[11px] font-black text-white shadow">
              <Star className="h-3 w-3 fill-white" />
              مميز
            </span>
          </div>
        )}

        {path.certificate_name && (
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#22334A] shadow backdrop-blur">
              <Award className="h-3 w-3 text-[#2691C2]" />
              شهادة
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-6 text-right">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <LevelBadge level={path.level} />
          {path.language && (
            <span className="text-[11px] text-slate-400">· {path.language}</span>
          )}
        </div>

        <h3 className="mb-2 line-clamp-2 text-lg font-black leading-snug text-[#22334A] transition group-hover:text-[#2691C2]">
          {path.title}
        </h3>

        {path.short_description && (
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500">
            {path.short_description}
          </p>
        )}

        {/* Stats row */}
        <div className="mb-4 flex flex-wrap gap-3 text-[12px] text-slate-500">
          {path.duration && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 font-medium">
              <Clock className="h-3.5 w-3.5 text-[#2691C2]" />
              {path.duration}{' '}
              {path.duration_unit === 'weeks' ? 'أسبوع' : path.duration_unit === 'months' ? 'شهر' : 'يوم'}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 font-medium">
            <BookOpen className="h-3.5 w-3.5 text-[#EC943C]" />
            {path.courses_count} دورة
          </span>
          {path.students_count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 font-medium">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              {path.students_count.toLocaleString('ar-EG')} طالب
            </span>
          )}
        </div>

        {/* Instructor */}
        {path.instructor && (
          <div className="mb-4 flex items-center justify-end gap-2 text-sm text-slate-600">
            {path.instructor.avatar_url ? (
              <img
                src={path.instructor.avatar_url}
                alt={path.instructor.name}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2691C2]/10 text-[11px] font-black text-[#2691C2]">
                {path.instructor.name.charAt(0)}
              </div>
            )}
            <span className="font-semibold">{path.instructor.name}</span>
          </div>
        )}

        {/* Price + CTA */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            {price != null ? (
              <div>
                {path.discount_price != null && path.price != null && path.price > path.discount_price && (
                  <p className="text-[11px] font-medium text-slate-400 line-through">
                    {formatEuroInteger(path.price, 'ar')}
                  </p>
                )}
                <p className="text-lg font-black text-[#22334A]">
                  {price === 0 ? 'مجاناً' : formatEuroInteger(price, 'ar')}
                </p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-400">تواصل معنا</p>
            )}
          </div>
          <Link
            to={`/learning-paths/${path.slug}`}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#2691C2] px-4 py-2.5 text-xs font-black text-white shadow-md shadow-[#2691C2]/25 transition hover:bg-[#1d7aab]"
          >
            اكتشف المسار
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? 'border-[#2691C2] bg-[#2691C2] text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-[#2691C2]/50'
      }`}
    >
      {label}
    </button>
  )
}

export default function LearningPaths() {
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1, per_page: 12 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPublicLearningPaths({ search: search || undefined, level: level || undefined, page })
      .then((res) => {
        if (!cancelled) {
          setPaths(res.data)
          setMeta(res.meta)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [search, level, page])

  const levels = [
    { value: '', label: 'الكل' },
    { value: 'beginner', label: 'مبتدئ' },
    { value: 'intermediate', label: 'متوسط' },
    { value: 'advanced', label: 'متقدم' },
  ]

  return (
    <main className="bg-slate-50 pt-20" dir="rtl">
      <PublicSeo
        title="المسارات التعليمية"
        description="مسارات تعلم متكاملة من EMC — دورات مرتبة، شهادات، وتوجيه مهني بالعربية."
        path="/learning-paths"
      />
      <PageHeader
        title="المسارات التعليمية"
        subtitle="رحلات تعليمية متكاملة تأخذك خطوة بخطوة من البداية إلى الاحتراف."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'المسارات التعليمية' },
        ]}
      />

      {/* Filters */}
      <section className="sticky top-16 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن مسار..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-9 pl-4 text-sm text-right text-slate-700 placeholder-slate-400 focus:border-[#2691C2] focus:outline-none focus:ring-2 focus:ring-[#2691C2]/20"
            />
          </div>

          {/* Level filters */}
          <div className="flex flex-wrap gap-2">
            {levels.map((l) => (
              <FilterChip
                key={l.value}
                label={l.label}
                active={level === l.value}
                onClick={() => { setLevel(l.value); setPage(1) }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-[#2691C2]" />
            </div>
          ) : paths.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <GraduationCap className="mb-4 h-12 w-12 text-slate-300" />
              <p className="text-lg font-semibold text-slate-500">لا توجد مسارات متاحة حالياً</p>
              <p className="mt-1 text-sm text-slate-400">جرّب تغيير معايير البحث أو تصفح الدورات المتاحة</p>
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm text-slate-500">
                {meta.total.toLocaleString('ar-EG')} مسار تعليمي
              </p>
              <AnimatePresence mode="wait">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {paths.map((path, i) => (
                    <PathCard key={path.id} path={path} index={i} />
                  ))}
                </div>
              </AnimatePresence>

              {/* Pagination */}
              {meta.last_page > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#2691C2] hover:text-[#2691C2] disabled:opacity-40"
                  >
                    السابق
                  </button>
                  <span className="text-sm text-slate-500">
                    {page} / {meta.last_page}
                  </span>
                  <button
                    disabled={page === meta.last_page}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#2691C2] hover:text-[#2691C2] disabled:opacity-40"
                  >
                    التالي
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl bg-gradient-to-l from-[#22334A] via-[#1c4567] to-[#162334] p-8 text-right text-white shadow-2xl sm:p-10 lg:flex-row lg:items-center"
        >
          <div>
            <h2 className="text-3xl font-black sm:text-4xl">غير متأكد من مسارك؟</h2>
            <p className="mt-4 max-w-xl text-lg leading-9 text-slate-300">
              تواصل معنا وسيساعدك أحد مستشارينا في اختيار المسار الأنسب لأهدافك ومستواك الحالي.
            </p>
          </div>
          <Link
            to="/contact"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#EC943C] px-7 py-4 font-black text-white transition hover:bg-[#d4832e]"
          >
            تواصل مع مستشار
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </motion.div>
      </section>
    </main>
  )
}
