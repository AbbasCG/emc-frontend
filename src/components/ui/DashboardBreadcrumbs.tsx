import { Link, useLocation } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export type BreadcrumbItem = { label: string; href?: string }

// Static map of dashboard routes to readable Arabic labels
const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':                             'الرئيسية',
  '/dashboard/instructor':                  'لوحة المدرب',
  '/dashboard/instructor/courses':          'دوراتي',
  '/dashboard/instructor/sessions':         'الجلسات',
  '/dashboard/instructor/attendance':       'الحضور',
  '/dashboard/instructor/submissions':      'التسليمات',
  '/dashboard/instructor/students':         'الطلاب',
  '/dashboard/instructor/availability':     'التوفر',
  '/dashboard/instructor/classes':          'الصفوف',
  '/dashboard/instructor/placement-tests':  'اختبارات التحديد',
  '/dashboard/instructor/oral-assessments': 'المقابلات الشفوية',
  '/dashboard/student':                     'لوحة الطالب',
  '/dashboard/student/courses':             'دوراتي',
  '/dashboard/student/attendance':          'سجل الحضور',
  '/dashboard/student/assignments':         'الواجبات',
  '/dashboard/admin':                       'الإدارة',
  '/dashboard/admin/lms/sessions':          'الجلسات',
  '/dashboard/admin/lms/attendance':        'الحضور',
}

/**
 * Reusable Arabic RTL breadcrumbs for dashboard pages.
 *
 * Usage (auto-detect from route):
 *   <DashboardBreadcrumbs />
 *
 * Usage (custom items):
 *   <DashboardBreadcrumbs items={[
 *     { label: 'دوراتي', href: '/dashboard/instructor/courses' },
 *     { label: 'الحضور' },
 *   ]} />
 */
export default function DashboardBreadcrumbs({ items }: { items?: BreadcrumbItem[] }) {
  const { pathname } = useLocation()

  // If no explicit items, build from current path
  const crumbs: BreadcrumbItem[] = items ?? (() => {
    const segments = pathname.split('/').filter(Boolean)
    const built: BreadcrumbItem[] = []
    let accumulated = ''
    for (const seg of segments) {
      accumulated += '/' + seg
      const label = ROUTE_LABELS[accumulated]
      if (label) {
        built.push({ label, href: accumulated })
      }
    }
    // Last item should not be a link
    if (built.length > 0) {
      built[built.length - 1] = { label: built[built.length - 1]!.label }
    }
    return built
  })()

  if (crumbs.length <= 1) return null

  return (
    <nav
      aria-label="مسار الصفحة"
      dir="rtl"
      className="mb-2 flex flex-wrap items-center gap-1 text-[11px] font-bold text-deepBlue/45"
    >
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1
        return (
          <span key={`${crumb.label}-${idx}`} className="inline-flex items-center gap-1">
            {crumb.href && !isLast ? (
              <Link
                to={crumb.href}
                className="rounded px-1 py-0.5 transition hover:text-[#0077B6]"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-deepBlue/70' : undefined}>{crumb.label}</span>
            )}
            {!isLast && (
              <ChevronLeft size={11} className="text-deepBlue/25" aria-hidden />
            )}
          </span>
        )
      })}
    </nav>
  )
}
