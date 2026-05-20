import { BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { DashboardSection, EmptyState } from '@/components/dashboard'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'

export default function StudentAvailableCoursesPage() {
  const { loading, refreshing, loadError, refresh, browseCourses, browseSource, registrations } = useStudentDashboardData()

  const sourceHint =
    browseSource === 'api_available' ?
      'مصدر القائمة: GET /student/available-courses'
    : 'مصدر القائمة: GET /courses مع استبعاد دوراتك المسجّلة'

  return (
    <div className="space-y-8 text-right rtl" dir="rtl">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.65rem] border border-deepBlue/[0.08] bg-gradient-to-bl from-[#2691C2] to-[#22334A] p-6 text-white shadow-lg"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black sm:text-2xl">الدورات المتاحة</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-white/85">{sourceHint}</p>
            <p className="mt-2 text-[11px] font-bold text-white/70">
              مسجَّل حاليًا في {registrations.length} دورة — لن تُعرض ضمن هذه القائمة.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || refreshing}
            className="rounded-2xl border border-white/25 bg-white/15 px-4 py-2 text-[11px] font-black backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
          >
            {refreshing ? 'جارٍ التحديث…' : 'تحديث'}
          </button>
        </div>
      </motion.header>

      {loadError ?
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-950">{loadError}</p>
      : null}

      <DashboardSection title="يمكنني التسجيل الآن" action={{ label: 'الكتالوج العام', href: '/courses' }}>
        {loading ?
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`sk-${String(i)}`} className="h-56 animate-pulse rounded-[1.35rem] bg-slate-200/90" />
            ))}
          </div>
        : browseCourses.length === 0 ?
          <EmptyState
            icon={BookOpen}
            title={registrations.length === 0 ? 'لا توجد دورات للعرض الآن' : 'جميع الدورات الحالية في قائمتك'}
            description="جرّب الكتالوج العام أو تحقّق من اتصال الخادم بـ GET /courses أو /student/available-courses."
            action={{ label: 'فتح الكتالوج', href: '/courses' }}
          />
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {browseCourses.slice(0, 48).map((c) => {
              const slug = c.slug?.trim()
              const href = slug ? `/courses/${slug}` : '/courses'
              const cover =
                (c.course_image && resolvePublicAssetUrl(c.course_image)) ||
                (c.image_url && resolvePublicAssetUrl(c.image_url)) ||
                null
              const noDate =
                c.start_date == null ||
                String(c.start_date).trim() === '' ||
                String(c.start_date) === '—'
              return (
                <motion.div
                  key={c.id}
                  layout
                  className="rounded-[1.35rem] border border-deepBlue/[0.06] bg-white p-4 shadow-md ring-1 ring-white"
                >
                  <div className="aspect-[21/10] overflow-hidden rounded-xl bg-slate-100">
                    {cover ?
                      <img src={cover} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center text-[11px] font-black text-slate-400">
                        بدون صورة من الخادم
                      </div>
                    }
                  </div>
                  <h4 className="mt-4 line-clamp-2 text-sm font-black text-deepBlue">{c.title}</h4>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    {noDate ?
                      <span className="text-[10px] font-bold text-[#EC943C]">موعد الدفعة غير محدد بعد</span>
                    : <span className="font-mono text-[11px] text-slate-600" dir="ltr">
                        {String(c.start_date).slice(0, 10)}
                      </span>}
                    <Link
                      to={href}
                      className="rounded-2xl bg-customOrange px-3 py-1.5 text-[11px] font-black text-white shadow-sm"
                    >
                      {noDate ? 'انضم إلى الدورة القادمة' : 'التسجيل الآن'}
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </div>
        }
      </DashboardSection>
    </div>
  )
}
