import { useEffect, useState } from 'react'
import { BookOpen, CalendarClock, ExternalLink, Layers, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fetchInstructorCourses, fetchInstructorLmsDashboard } from '@/api/instructorApi'
import { DashboardSection, EmptyState } from '@/components/dashboard'
import type { TeachingCourseLms } from '@/types/lms'
import { useAuth } from '@/contexts/AuthContext'

function parseDate(raw?: string | null): string | null {
  if (raw == null || String(raw).trim() === '') return null
  return String(raw).slice(0, 10)
}

export default function InstructorAssignedCoursesPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<TeachingCourseLms[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([fetchInstructorCourses(), fetchInstructorLmsDashboard()])
      .then(([list, dash]) => {
        if (!alive) return
        const merged = list.length > 0 ? list : (dash.assigned_courses ?? [])
        setRows(Array.isArray(merged) ? merged : [])
      })
      .catch(() => {
        if (alive) setRows([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="space-y-8 text-right rtl" dir="rtl">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.65rem] border border-deepBlue/[0.08] bg-gradient-to-bl from-[#22334A] via-[#0F172A] to-[#2691C2] p-6 text-white shadow-xl"
      >
        <p className="text-[11px] font-black uppercase tracking-widest text-white/55">مدرّب EMC</p>
        <h1 className="mt-2 text-2xl font-black">دوراتي وورش العمل المسنَدة</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-white/80">
          {user?.name ? `مرحبًا ${user.name} — ` : null}
          البيانات من /instructor/courses و /instructor/dashboard؛ لا يعرض إلا المسند للحساب الحالي.
        </p>
      </motion.header>

      <DashboardSection title="قائمة الإسناد">
        {loading ?
          <div className="flex min-h-[10rem] items-center justify-center rounded-2xl border bg-slate-50">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-customBlue border-t-transparent" />
          </div>
        : rows.length === 0 ?
          <EmptyState
            icon={BookOpen}
            title="لا توجد دورات مسندة"
            description="عند إسناد دورة جديدة ستظهر هنا وستصلك إشعارات المنصّة."
          />
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((c) => (
              <motion.article
                key={c.id}
                layout
                className="flex flex-col rounded-[1.25rem] border border-slate-100 bg-white p-5 shadow-md ring-1 ring-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="line-clamp-2 text-base font-black text-deepBlue">{c.title}</h2>
                  <span className="shrink-0 rounded-full bg-customBlue/10 px-2 py-0.5 text-[10px] font-black text-customBlue">
                    {c.status ?? '—'}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-[11px] font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Users size={14} className="text-customOrange" aria-hidden />
                    طلاب: {c.student_count ?? '—'}
                  </span>
                  {c.start_date ?
                    <span className="inline-flex items-center gap-1 font-mono dir-ltr text-slate-600">
                      <CalendarClock size={14} className="text-customBlue" aria-hidden />
                      {parseDate(c.start_date as string)}
                    </span>
                  : null}
                </div>
                {c.meeting_link ?
                  <a
                    href={c.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-black text-customBlue hover:underline"
                  >
                    <ExternalLink size={14} /> رابط الجلسة
                  </a>
                : null}
                <Link
                  to={c.slug ? `/courses/${c.slug}` : '/dashboard/instructor'}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 py-2 text-xs font-black text-deepBlue hover:border-customBlue"
                >
                  عرض تفاصيل الدورة
                </Link>
                <Link
                  to={`/dashboard/instructor/courses/${c.id}/content`}
                  aria-label={`إدارة محتوى الدورة ${c.title}`}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-deepBlue py-2.5 text-xs font-black text-white shadow-sm hover:brightness-105"
                >
                  <Layers className="h-3.5 w-3.5" aria-hidden />
                  إدارة المحتوى (LMS)
                </Link>
              </motion.article>
            ))}
          </div>
        }
      </DashboardSection>
    </div>
  )
}
