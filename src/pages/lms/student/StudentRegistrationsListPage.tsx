import { ClipboardList } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { DashboardSection, EmptyState } from '@/components/dashboard'
import { useStudentLearningLists } from '@/hooks/useStudentLearningLists'
import { mapBackendRegStatus } from '@/utils/studentEnrollmentMerge'

export default function StudentRegistrationsListPage() {
  const { loading, registrations } = useStudentLearningLists()

  return (
    <div className="space-y-8 text-right rtl" dir="rtl">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.65rem] border border-deepBlue/[0.08] bg-gradient-to-bl from-[#0F172A] to-[#22334A] p-6 text-white shadow-lg"
      >
        <h1 className="text-xl font-black sm:text-2xl">التسجيلات</h1>
        <p className="mt-2 text-sm font-semibold text-white/80">سجلات التسجيل كما تُرجعها نقطة /student/registrations.</p>
      </motion.header>

      <DashboardSection title="سجل التسجيل">
        {loading ?
          <div className="flex min-h-[8rem] items-center justify-center rounded-2xl border bg-slate-50">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-customOrange border-t-transparent" />
          </div>
        : registrations.length === 0 ?
          <EmptyState
            icon={ClipboardList}
            title="لا تسجيلات ظاهرة"
            description="عند إتمام تسجيل دورة ستظهر هنا."
            action={{ label: 'استعرض الدورات المتاحة', href: '/courses' }}
          />
        : <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/90 text-[11px] font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">الدورة</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.map((r) => {
                  const st = mapBackendRegStatus(r.status)
                  const label = st === 'completed' ? 'مكتمل' : st === 'pending' ? 'معلّق' : 'نشط'
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-bold text-deepBlue">{r.course_title ?? '—'}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-600">{label}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500" dir="ltr">
                        {r.enrolled_at ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-end">
                        {r.slug ?
                          <Link to={`/courses/${r.slug}`} className="text-xs font-black text-customBlue hover:underline">
                            عرض
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
