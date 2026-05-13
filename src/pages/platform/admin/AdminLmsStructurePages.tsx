import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { fetchAdminLessons, fetchAdminModules, fetchAdminQuizzes } from '@/api/advancedLmsApi'
import EmptyState from '@/components/dashboard/EmptyState'
import type { LmsLesson, LmsModule, LmsQuiz } from '@/types/platform'

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Admin LMS</p>
        <h1 className="text-2xl font-black text-deepBlue">{title}</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">{subtitle}</p>
      </motion.div>
      {children}
    </div>
  )
}

export function AdminModulesPage() {
  const [rows, setRows] = useState<LmsModule[]>([])
  useEffect(() => {
    let c = false
    ;(async () => {
      const r = await fetchAdminModules()
      if (!c) setRows(r)
    })()
    return () => {
      c = true
    }
  }, [])
  return (
    <Shell title="إدارة الوحدات" subtitle="عرض شبكي للوحدات المتصلة بالدورات — CRUD الكامل يُكمل مع الخادم.">
      {rows.length === 0 ? (
        <EmptyState title="لا وحدات مسجلة" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <p className="text-[11px] font-black text-slate-400">دورة #{m.course_id}</p>
              <h2 className="mt-2 text-lg font-black text-deepBlue">{m.title}</h2>
              <p className="mt-2 text-xs font-bold text-slate-500">ترتيب {m.sort_order} — دروس {m.lessons_count}</p>
            </motion.div>
          ))}
        </div>
      )}
    </Shell>
  )
}

export function AdminLessonsPage() {
  const [rows, setRows] = useState<LmsLesson[]>([])
  useEffect(() => {
    let c = false
    ;(async () => {
      const r = await fetchAdminLessons()
      if (!c) setRows(r)
    })()
    return () => {
      c = true
    }
  }, [])
  return (
    <Shell title="إدارة الدروس" subtitle="قائمة الدروس مع روابط محتوى المواد — جاهزة لتوسعة محرر تجربة المتعلم.">
      {rows.length === 0 ? (
        <EmptyState title="لا دروس" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#F6F8FB] text-[11px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-3">الدرس</th>
                <th className="px-4 py-3">الوحدة</th>
                <th className="px-4 py-3">ترتيب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-black text-deepBlue">{r.title}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-500">{r.module_id}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-500">{r.sort_order}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  )
}

export function AdminQuizzesPage() {
  const [rows, setRows] = useState<LmsQuiz[]>([])
  useEffect(() => {
    let c = false
    ;(async () => {
      const r = await fetchAdminQuizzes()
      if (!c) setRows(r)
    })()
    return () => {
      c = true
    }
  }, [])
  return (
    <Shell title="إدارة الاختبارات" subtitle="أسئلة وبنوك محتوى — ربط التصحيح الآلي يتم من الخلفية.">
      {rows.length === 0 ? (
        <EmptyState title="لا اختبارات" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-black text-deepBlue">{q.title}</h2>
              <p className="mt-2 text-xs font-bold text-slate-500">
                دورة #{q.course_id} — نجاح {q.passing_score}% — أسئلة {q.questions.length}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </Shell>
  )
}
