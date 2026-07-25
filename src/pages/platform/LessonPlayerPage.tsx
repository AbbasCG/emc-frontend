import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { fetchCourseModules, fetchLesson } from '@/api/advancedLmsApi'
import LessonPlayer from '@/components/platform/LessonPlayer'
import EmptyState from '@/components/dashboard/EmptyState'
import type { LmsLesson, LmsModule } from '@/types/platform'

export default function LessonPlayerPage() {
  const { lessonId } = useParams()
  const lid = Number(lessonId) || 1
  const [lesson, setLesson] = useState<LmsLesson | null>(null)
  const [modules, setModules] = useState<LmsModule[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const l = await fetchLesson(lid)
        const mods = await fetchCourseModules(l.course_id)
        if (!cancelled) {
          setLesson(l)
          setModules(mods.sort((a, b) => a.sort_order - b.sort_order))
        }
      } catch {
        setErr('تعذر تحميل الدرس')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [lid])

  if (err) {
    return (
      <EmptyState title={err} action={{ label: 'مسار التعلّم', href: '/dashboard/learning' }} />
    )
  }

  if (!lesson) {
    return (
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to={`/dashboard/courses/${lesson.course_id}/modules`} className="text-xs font-black text-customBlue hover:underline">
          ← الوحدات
        </Link>
        <span className="rounded-full bg-[#F6F8FB] px-4 py-1.5 text-[11px] font-black text-deepBlue ring-1 ring-slate-100">
          مشغّل الدرس · LMS متقدم
        </span>
      </div>
      <LessonPlayer lesson={lesson} modules={modules} />
    </motion.div>
  )
}
