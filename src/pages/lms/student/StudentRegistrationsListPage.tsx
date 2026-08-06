import { ClipboardList } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { DashboardSection, EmptyState } from '@/components/dashboard'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { mapBackendRegStatus } from '@/utils/studentEnrollmentMerge'
import { StudentBackButton } from '@/components/shared/StudentBackButton'

export default function StudentRegistrationsListPage() {
  const { loading, refreshing, loadError, refresh, registrations } = useStudentDashboardData()

  return (
    <div className="space-y-8 text-right rtl" dir="rtl">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.65rem] border border-deepBlue/[0.08] bg-gradient-to-bl from-[#0F172A] to-[#22334A] p-6 text-white shadow-lg"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black sm:text-2xl">التسجيلات</h1>
            <p className="mt-2 text-sm font-semibold text-white/80">
              صفوف حقيقية من <span className="font-mono text-[11px]">GET /student/registrations</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || refreshing}
            className="rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-black backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
          >
            {refreshing ? 'جارٍ التحديث…' : 'تحديث'}
          </button>
        </div>
      </motion.header>

      {loadError ?
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-950">{loadError}</p>
      : null}

      <StudentBackButton fallback="/dashboard/student" label="العودة إلى لوحة الطالب" />

      <DashboardSection title="سجل التسجيل">
        {loading ?
          <div className="flex min-h-[8rem] items-center justify-center rounded-2xl border bg-slate-50">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-customOrange border-t-transparent" />
          </div>
        : registrations.length === 0 ?
          <EmptyState
            icon={ClipboardList}
            title="لا توجد تسجيلات"
            description="عند إتمام تسجيل دورة ستظهر هنا فور تحديث الخادم."
            action={{ label: 'دورات متاحة', href: '/dashboard/student/available-courses' }}
          />
        : <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/90 text-[11px] font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">الدورة</th>
                  <th className="px-4 py-3">حالة التسجيل</th>
                  <th className="px-4 py-3">الدفع</th>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.map((r) => {
                  const st = mapBackendRegStatus(r.status)
                  const label = st === 'completed' ? 'مكتمل' : st === 'pending' ? 'معلّق' : 'نشط'
                  const pay = r.payment_status ?? '—'
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-bold text-deepBlue">{r.course_title ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-slate-700">{label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-600">{pay}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500" dir="ltr">
                        {r.enrolled_at ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-end">
                        {r.slug ?
                          <Link to={`/courses/${r.slug}`} className="text-xs font-black text-customBlue hover:underline">
                            صفحة الدورة
                          </Link>
                        : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        }
      </DashboardSection>
    </div>
  )
}
