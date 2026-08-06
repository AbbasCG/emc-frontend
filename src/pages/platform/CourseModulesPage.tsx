import { motion } from 'framer-motion'
import { ArrowLeft, Layers } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchCourseModules } from '@/api/advancedLmsApi'
import EmptyState from '@/components/dashboard/EmptyState'
import type { LmsModule } from '@/types/platform'

function firstLessonForModule(moduleIndexFromOne: number) {
  return (moduleIndexFromOne - 1) * 3 + 1
}

export default function CourseModulesPage() {
  const { courseId } = useParams()
  const cid = Number(courseId) || 1
  const [modules, setModules] = useState<LmsModule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const m = await fetchCourseModules(cid)
      if (!cancelled) {
        setModules(m.sort((a, b) => a.sort_order - b.sort_order))
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cid])

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Course #{cid}</p>
          <h1 className="text-2xl font-black text-deepBlue">الوحدات والدروس</h1>
        </div>
        <Link to="/dashboard/learning" className="text-xs font-black text-customBlue hover:underline">
          العودة لمسار التعلّم
        </Link>
      </motion.div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : modules.length === 0 ? (
        <EmptyState title="لا وحدات بعد" />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {modules.map((m, idx) => {
            const startLesson = firstLessonForModule(m.sort_order || idx + 1)
            const pct = Math.round(((m.completed_lessons ?? 0) / Math.max(m.lessons_count, 1)) * 100)
            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-deepBlue text-white shadow-lg">
                    <Layers size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-black text-deepBlue">{m.title}</h2>
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      الدروس {m.lessons_count} — المكتمل {m.completed_lessons ?? 0}
                    </p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-l from-customBlue to-customOrange"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                      />
                    </div>
                    <Link
                      to={`/dashboard/lessons/${startLesson}`}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-black text-customBlue hover:underline"
                    >
                      فتح أول درس
                      <ArrowLeft size={16} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
