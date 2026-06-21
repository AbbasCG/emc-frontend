import DOMPurify from 'dompurify'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Download, PlayCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LmsLesson, LmsModule } from '@/types/platform'
import ModuleSidebar from './ModuleSidebar'

type Props = {
  lesson: LmsLesson
  modules: LmsModule[]
}

export default function LessonPlayer({ lesson, modules }: Props) {
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons_count, 0)
  const approxIndex = lesson.sort_order
  const progressPct = Math.min(100, Math.round((approxIndex / Math.max(totalLessons, 1)) * 100))

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <ModuleSidebar
        courseId={lesson.course_id}
        modules={modules}
        lessonModuleId={lesson.module_id}
      />

      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">الدرس الحالي</p>
              <h2 className="mt-1 text-2xl font-black text-deepBlue">{lesson.title}</h2>
            </div>
            <div className="rounded-xl bg-[#F6F8FB] px-3 py-2 text-xs font-black text-deepBlue ring-1 ring-slate-100">
              التقدّم التقريبي {progressPct}%
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-brand-400 to-brand-600"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-deepBlue shadow-xl">
          <div className="flex aspect-video items-center justify-center bg-gradient-to-bl from-deepBlue via-[#1a2d45] to-customBlue/40">
            <button
              type="button"
              className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 px-8 py-6 text-white backdrop-blur transition hover:bg-white/15"
            >
              <PlayCircle size={44} />
              <span className="text-sm font-black">معاينة وسائط — ربط الفيديو لاحقاً</span>
              {lesson.video_placeholder_url && (
                <span className="max-w-xs truncate text-[11px] font-bold text-white/60" dir="ltr">
                  {lesson.video_placeholder_url}
                </span>
              )}
            </button>
          </div>
        </div>

        <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-black text-deepBlue">محتوى الدرس</h3>
          <div
            className="prose prose-sm mt-4 max-w-none text-slate-600 prose-p:leading-8"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.content_html ?? '') }}
          />
        </article>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-black text-deepBlue">المواد والمرفقات</h3>
          <ul className="mt-4 space-y-2">
            {(lesson.materials ?? []).map((mat) => (
              <li
                key={mat.id}
                className="flex items-center justify-between rounded-xl bg-[#F6F8FB] px-4 py-3 text-sm font-bold text-deepBlue ring-1 ring-slate-100"
              >
                <span>{mat.label}</span>
                <span className="inline-flex items-center gap-1 text-xs font-black text-customBlue">
                  <Download size={14} />
                  {mat.type.toUpperCase()}
                </span>
              </li>
            ))}
            {(lesson.materials ?? []).length === 0 && (
              <p className="text-sm font-medium text-slate-400">لا توجد مواد مرفوعة بعد.</p>
            )}
          </ul>
        </section>

        <div className="flex flex-wrap justify-between gap-3">
          {lesson.prev_lesson_id ? (
            <Link
              to={`/dashboard/lessons/${lesson.prev_lesson_id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-deepBlue shadow-sm transition hover:border-customBlue/40"
            >
              <ArrowRight size={18} />
              الدرس السابق
            </Link>
          ) : (
            <span />
          )}
          {lesson.next_lesson_id ? (
            <Link
              to={`/dashboard/lessons/${lesson.next_lesson_id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:bg-[#1e7dab]"
            >
              الدرس التالي
              <ArrowLeft size={18} />
            </Link>
          ) : (
            <Link
              to={`/dashboard/quizzes/1`}
              className="inline-flex items-center gap-2 rounded-xl bg-customOrange px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-100 transition hover:opacity-95"
            >
              الانتقال إلى الاختبار التجريبي
              <ArrowLeft size={18} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
