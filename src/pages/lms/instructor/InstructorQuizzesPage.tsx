import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, ListChecks, Users, BarChart3, X, Save, Sparkles, Search, HelpCircle,
  BookOpen, Clock3, TrendingUp, ChevronDown,
} from 'lucide-react'
import {
  fetchInstructorQuizzes, createInstructorQuiz, deleteInstructorQuiz, duplicateInstructorQuiz,
  publishInstructorQuiz, closeInstructorQuiz, reopenInstructorQuiz, archiveInstructorQuiz,
  updateInstructorQuiz,
  fetchAssessmentSettings, saveAssessmentSettings,
  type InstructorQuizSummary, type QuizStatus, type QuizWeightingMode, type QuizFormInput,
} from '@/api/courseQuizApi'
import { fetchInstructorCourses } from '@/api/instructorApi'
import type { TeachingCourseLms } from '@/types/lms'
import { InstructorHero } from '@/components/instructor'
import AnimatedSelect from '@/components/ui/AnimatedSelect'
import QuizHelpModal from '@/components/instructor/quiz/QuizHelpModal'
import QuizActionsMenu, { type QuizAction } from '@/components/instructor/quiz/QuizActionsMenu'
import toast from '@/lib/toast'

const STATUS_LABEL: Record<QuizStatus, string> = {
  draft: 'مسودة', scheduled: 'مجدول', active: 'متاح الآن', closed: 'منتهٍ', archived: 'مؤرشف',
}
const STATUS_BADGE: Record<QuizStatus, string> = {
  draft: 'bg-slate-100 text-slate-500',
  scheduled: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-red-100 text-red-600',
  archived: 'bg-slate-100 text-slate-400',
}

// ─── Course hero section ──────────────────────────────────────────────────────

function CourseHeroSection({ course, quizCount }: { course: TeachingCourseLms | null; quizCount: number }) {
  if (!course) return null
  const studentCount = course.students_count ?? course.enrolled_students_count ?? course.student_count ?? 0
  const sessionsCount = course.sessions_count ?? null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
    >
      <div className="flex flex-col sm:flex-row">
        <div className="h-32 shrink-0 bg-gradient-to-bl from-deepBlue to-customBlue sm:h-auto sm:w-48">
          {(course.image_url ?? course.image ?? course.thumbnail) ? (
            <img
              src={course.image_url ?? course.image ?? course.thumbnail ?? undefined}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-9 w-9 text-white/60" />
            </div>
          )}
        </div>
        <div className="flex-1 p-5">
          <h2 className="text-[16px] font-black text-deepBlue">{course.title}</h2>
          {course.description && (
            <p className="mt-1.5 line-clamp-2 text-[12px] font-semibold leading-relaxed text-deepBlue/50">{course.description}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-[11px] font-bold text-deepBlue/60">
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-customBlue" /> {studentCount} طالب</span>
            <span className="flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5 text-customBlue" /> {quizCount} اختبار</span>
            {sessionsCount != null && (
              <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-customBlue" /> {sessionsCount} جلسة</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Statistics cards ─────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, index }: { icon: typeof ListChecks; label: string; value: string | number; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      whileHover={{ y: -2, boxShadow: '0 10px 22px -12px rgba(12,42,75,0.18)' }}
      className="rounded-2xl border border-slate-200 bg-white p-4 transition-shadow"
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-wide text-deepBlue/40">{label}</p>
        <Icon className="h-4 w-4 text-customBlue" />
      </div>
      <p className="mt-1.5 text-[22px] font-black text-deepBlue">{value}</p>
    </motion.div>
  )
}

// ─── Create / edit quiz modal ─────────────────────────────────────────────────

function QuizFormModal({ courseId, quiz, onClose, onSaved }: {
  courseId: string
  quiz: InstructorQuizSummary | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(quiz?.title ?? '')
  const [description, setDescription] = useState(quiz?.description ?? '')
  const [maxAttempts, setMaxAttempts] = useState(quiz?.max_attempts ?? 1)
  const [counts, setCounts] = useState(quiz?.counts_toward_final_grade ?? true)
  const [isFinalExam, setIsFinalExam] = useState(quiz?.is_final_exam ?? false)
  const [required, setRequired] = useState(quiz?.required ?? true)
  const [weight, setWeight] = useState<number | ''>(quiz?.weight ?? '')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!title.trim()) { toast.error('العنوان مطلوب'); return }
    setSaving(true)
    const body: QuizFormInput = {
      title: title.trim(),
      description: description.trim() || null,
      max_attempts: maxAttempts,
      counts_toward_final_grade: counts,
      is_final_exam: isFinalExam,
      required,
      weight: weight === '' ? null : Number(weight),
    }
    try {
      if (quiz) {
        await updateInstructorQuiz(quiz.id, body)
        toast.success('تم تحديث الاختبار')
      } else {
        await createInstructorQuiz(Number(courseId), body)
        toast.success('تم إنشاء الاختبار')
      }
      onSaved()
      onClose()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'تعذّر حفظ الاختبار')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.16 }}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-black text-deepBlue">{quiz ? 'تعديل الاختبار' : 'إنشاء اختبار قصير'}</h3>
          <button type="button" onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">عنوان الاختبار</label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)} dir="rtl"
              className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-[13px] font-bold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">الوصف (اختياري)</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)} dir="rtl" rows={2}
              className="w-full rounded-2xl border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">عدد المحاولات المسموحة</label>
              <input
                type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-[13px] font-bold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">وزن مخصص (%) — اختياري</label>
              <input
                type="number" min={0} max={100} value={weight}
                onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-[13px] font-bold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-[12px] font-bold text-deepBlue/70">
            <input type="checkbox" checked={counts} onChange={(e) => setCounts(e.target.checked)} className="h-4 w-4 rounded" />
            يُحتسب ضمن النتيجة النهائية
          </label>
          <label className="flex items-center gap-2 text-[12px] font-bold text-deepBlue/70">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="h-4 w-4 rounded" />
            إلزامي
          </label>
          <label className="flex items-center gap-2 text-[12px] font-bold text-deepBlue/70">
            <input type="checkbox" checked={isFinalExam} onChange={(e) => setIsFinalExam(e.target.checked)} className="h-4 w-4 rounded" />
            هذا هو الاختبار النهائي للدورة (اختبار واحد فقط لكل دورة)
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button" disabled={saving} onClick={() => void submit()}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-deepBlue text-[12px] font-black text-white disabled:opacity-40"
          >
            {saving ? 'جارِ الحفظ...' : 'حفظ'}
          </button>
          <button type="button" onClick={onClose} className="h-10 rounded-2xl border border-slate-200 px-5 text-[12px] font-black text-deepBlue/60">إلغاء</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Assessment settings (collapsible) ────────────────────────────────────────

function AssessmentSettingsAccordion({ courseId }: { courseId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [quizWeight, setQuizWeight] = useState(0)
  const [examWeight, setExamWeight] = useState(100)
  const [mode, setMode] = useState<QuizWeightingMode>('equal')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const s = await fetchAssessmentSettings(Number(courseId))
        if (!alive) return
        setQuizWeight(s.quiz_component_weight)
        setExamWeight(s.final_exam_weight)
        setMode(s.quiz_weighting_mode)
      } catch {
        if (alive) toast.error('تعذّر تحميل إعدادات التقييم')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [courseId])

  const total = quizWeight + examWeight
  const valid = Math.abs(total - 100) < 0.01

  async function save() {
    if (!valid) return
    setSaving(true)
    try {
      await saveAssessmentSettings(Number(courseId), {
        quiz_component_weight: quizWeight, final_exam_weight: examWeight, quiz_weighting_mode: mode,
      })
      toast.success('تم حفظ إعدادات التقييم')
    } catch {
      toast.error('تعذّر حفظ الإعدادات')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white">
      <button
        type="button" onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-customBlue" />
          <h2 className="text-[14px] font-black text-deepBlue">إعدادات التقييم</h2>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              {loading ? <div className="h-32 animate-pulse rounded-2xl bg-slate-100" /> : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">وزن الاختبارات القصيرة (%)</label>
                      <input
                        type="number" min={0} max={100} value={quizWeight}
                        onChange={(e) => setQuizWeight(Number(e.target.value))}
                        className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-[13px] font-bold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">وزن الاختبار النهائي (%)</label>
                      <input
                        type="number" min={0} max={100} value={examWeight}
                        onChange={(e) => setExamWeight(Number(e.target.value))}
                        className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-[13px] font-bold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">طريقة احتساب الاختبارات القصيرة</label>
                    <div className="flex gap-2">
                      {(['equal', 'custom'] as QuizWeightingMode[]).map((m) => (
                        <button
                          key={m} type="button" onClick={() => setMode(m)}
                          className={`h-9 flex-1 rounded-2xl text-[12px] font-black transition ${
                            mode === m ? 'bg-customBlue text-white' : 'border border-slate-200 text-deepBlue/60 hover:bg-slate-50'
                          }`}
                        >
                          {m === 'equal' ? 'متساوية' : 'مخصصة'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`mt-4 flex items-center justify-between rounded-2xl px-4 py-2.5 text-[12px] font-black ${valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    <span>المجموع: {total}%</span>
                    {!valid && <span>يجب أن يساوي المجموع 100%</span>}
                  </div>

                  <button
                    type="button" disabled={!valid || saving} onClick={() => void save()}
                    className="mt-4 flex h-10 items-center gap-1.5 rounded-2xl bg-deepBlue px-5 text-[12px] font-black text-white transition disabled:opacity-40"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? 'جارِ الحفظ...' : 'حفظ الإعدادات'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Quiz table row ────────────────────────────────────────────────────────────

function QuizRow({ quiz, index, onAction }: {
  quiz: InstructorQuizSummary
  index: number
  onAction: (action: QuizAction, quiz: InstructorQuizSummary) => void
}) {
  return (
    <motion.tr
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, delay: index * 0.02 }}
      whileHover={{ backgroundColor: 'rgba(0, 119, 182, 0.03)' }}
      className="border-b border-slate-100 last:border-0"
    >
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-black text-deepBlue">{quiz.title}</span>
          {quiz.is_final_exam && <span title="الاختبار النهائي"><Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" /></span>}
        </div>
      </td>
      <td className="px-4 py-3.5 text-[12px] font-bold text-deepBlue/60">
        {quiz.is_final_exam ? 'اختبار نهائي' : 'اختبار قصير'}
      </td>
      <td className="px-4 py-3.5 text-[12px] font-bold text-deepBlue/60">{quiz.questions_count} سؤال</td>
      <td className="px-4 py-3.5 text-[12px] font-bold text-deepBlue/60">{quiz.completed_students_count}</td>
      <td className="px-4 py-3.5 text-[12px] font-bold text-deepBlue/60">{quiz.average_score != null ? `${quiz.average_score}%` : '—'}</td>
      <td className="px-4 py-3.5">
        <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${STATUS_BADGE[quiz.effective_status]}`}>
          {STATUS_LABEL[quiz.effective_status]}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <QuizActionsMenu quiz={quiz} onAction={(a) => onAction(a, quiz)} />
      </td>
    </motion.tr>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'active', label: 'نشط' },
  { value: 'closed', label: 'منتهٍ' },
  { value: 'draft', label: 'مسودة' },
  { value: 'scheduled', label: 'مجدول' },
]

export default function InstructorQuizzesPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const [quizzes, setQuizzes] = useState<InstructorQuizSummary[]>([])
  const [course, setCourse] = useState<TeachingCourseLms | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalQuiz, setModalQuiz] = useState<InstructorQuizSummary | null | 'new'>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [reloadKey, setReloadKey] = useState(0)

  // Show the loading skeleton again when the course changes — render-phase
  // adjustment (docs/04-references/effect-patterns.md §P2), not a setState in
  // the effect body.
  const [seenCourseId, setSeenCourseId] = useState(courseId)
  if (seenCourseId !== courseId) {
    setSeenCourseId(courseId)
    if (courseId) setLoading(true)
  }

  // Manual refresh (hero button / after actions). A plain handler, so the
  // synchronous setLoading is allowed; the fetch itself lives in the effect.
  function load() {
    if (!courseId) return
    setLoading(true)
    setReloadKey((k) => k + 1)
  }

  useEffect(() => {
    if (!courseId) return
    void (async () => {
      try {
        const [list, courses] = await Promise.all([
          fetchInstructorQuizzes(Number(courseId)),
          fetchInstructorCourses(),
        ])
        setQuizzes(list)
        setCourse(courses.find((c) => c.id === Number(courseId)) ?? null)
      } catch {
        toast.error('تعذّر تحميل الاختبارات القصيرة')
      } finally {
        setLoading(false)
      }
    })()
  }, [courseId, reloadKey])

  async function handleAction(action: QuizAction, quiz: InstructorQuizSummary) {
    if (action === 'edit') { setModalQuiz(quiz); return }
    if (action === 'results') {
      toast.message(`أكمل ${quiz.completed_students_count} طالب — المتوسط ${quiz.average_score != null ? `${quiz.average_score}%` : 'لا يوجد بعد'}`)
      return
    }
    try {
      if (action === 'publish') await publishInstructorQuiz(quiz.id)
      else if (action === 'close') await closeInstructorQuiz(quiz.id)
      else if (action === 'reopen') await reopenInstructorQuiz(quiz.id)
      else if (action === 'archive') await archiveInstructorQuiz(quiz.id)
      else if (action === 'duplicate') await duplicateInstructorQuiz(quiz.id)
      else if (action === 'delete') {
        if (!confirm('هل أنت متأكد من حذف هذا الاختبار؟')) return
        await deleteInstructorQuiz(quiz.id)
      }
      toast.success('تم التنفيذ بنجاح')
      load()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'تعذّر تنفيذ العملية')
    }
  }

  const statusCounts = useMemo(() => ({
    active: quizzes.filter((q) => q.effective_status === 'active').length,
    closed: quizzes.filter((q) => q.effective_status === 'closed').length,
    draft: quizzes.filter((q) => q.effective_status === 'draft').length,
    scheduled: quizzes.filter((q) => q.effective_status === 'scheduled').length,
  }), [quizzes])

  const stats = useMemo(() => {
    const totalAttempts = quizzes.reduce((sum, q) => sum + q.completed_students_count, 0)
    const scored = quizzes.filter((q) => q.average_score != null)
    const avgScore = scored.length ? Math.round(scored.reduce((s, q) => s + (q.average_score ?? 0), 0) / scored.length) : null
    const studentCount = course?.students_count ?? course?.enrolled_students_count ?? course?.student_count ?? 0
    const participationRate = studentCount && quizzes.length
      ? Math.round((totalAttempts / (studentCount * quizzes.length)) * 100)
      : null
    return {
      total: quizzes.length,
      totalAttempts,
      participationRate,
      avgScore,
    }
  }, [quizzes, course])

  const filtered = useMemo(() => {
    return quizzes.filter((q) => {
      if (search.trim() && !q.title.toLowerCase().includes(search.trim().toLowerCase())) return false
      if (statusFilter && q.effective_status !== statusFilter) return false
      return true
    })
  }, [quizzes, search, statusFilter])

  if (!courseId) return null

  return (
    <div className="space-y-5 pb-16 font-[Cairo,sans-serif]" dir="rtl">
      <InstructorHero
        title="الاختبارات القصيرة"
        subtitle="أنشئ عدداً غير محدود من الاختبارات وتحكّم بموعد إتاحتها ووزنها في النتيجة النهائية"
        backTo="/dashboard/instructor/courses"
        backLabel="دوراتي"
        onRefresh={load}
        refreshing={loading}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button" onClick={() => setHelpOpen(true)} aria-label="مساعدة"
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              type="button" onClick={() => setModalQuiz('new')}
              className="flex h-9 items-center gap-1.5 rounded-2xl bg-white/15 px-3.5 text-[12px] font-black text-white backdrop-blur transition hover:bg-white/25"
            >
              <Plus className="h-4 w-4" /> إضافة اختبار قصير
            </button>
          </div>
        }
      />

      <CourseHeroSection course={course} quizCount={quizzes.length} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="إجمالي الاختبارات" value={stats.total} index={0} />
        <StatCard icon={Users} label="إجمالي المحاولات" value={stats.totalAttempts} index={1} />
        <StatCard icon={TrendingUp} label="معدل المشاركة" value={stats.participationRate != null ? `${stats.participationRate}%` : '—'} index={2} />
        <StatCard icon={BarChart3} label="متوسط الدرجات" value={stats.avgScore != null ? `${stats.avgScore}%` : '—'} index={3} />
      </div>

      {/* Quick status summary bar */}
      <div className="flex flex-wrap gap-2">
        {([
          ['active', 'نشط', STATUS_BADGE.active],
          ['closed', 'منتهٍ', STATUS_BADGE.closed],
          ['draft', 'مسودة', STATUS_BADGE.draft],
          ['scheduled', 'مجدول', STATUS_BADGE.scheduled],
        ] as const).map(([key, label, cls]) => (
          <span key={key} className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-[11px] font-black ${cls}`}>
            {label} <span className="rounded-lg bg-white/60 px-1.5">{statusCounts[key]}</span>
          </span>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في الاختبارات..."
            className="h-10 w-full rounded-2xl border border-slate-200 bg-white pr-9 pl-3.5 text-[12px] font-semibold text-deepBlue outline-none focus:border-customBlue focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <div className="w-48">
          <AnimatedSelect
            value={statusFilter} onChange={setStatusFilter}
            options={STATUS_FILTER_OPTIONS} ariaLabel="تصفية حسب الحالة"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <ListChecks className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-[16px] font-black text-deepBlue">
            {quizzes.length === 0 ? 'لا توجد اختبارات قصيرة بعد' : 'لا توجد نتائج مطابقة'}
          </p>
          <p className="mt-1.5 text-[12px] font-semibold text-deepBlue/45">
            {quizzes.length === 0 ? 'أضف أول اختبار قصير لهذه الدورة' : 'جرّب تعديل كلمة البحث أو الفلتر'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-right">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wide text-deepBlue/40">
                <th className="px-4 py-3">الاختبار</th>
                <th className="px-4 py-3">النوع</th>
                <th className="px-4 py-3">الأسئلة</th>
                <th className="px-4 py-3">المشاركة</th>
                <th className="px-4 py-3">متوسط الدرجات</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => (
                <QuizRow key={q.id} quiz={q} index={i} onAction={(a, qz) => void handleAction(a, qz)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AssessmentSettingsAccordion courseId={courseId} />

      <AnimatePresence>
        {modalQuiz && (
          <QuizFormModal
            courseId={courseId}
            quiz={modalQuiz === 'new' ? null : modalQuiz}
            onClose={() => setModalQuiz(null)}
            onSaved={load}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {helpOpen && <QuizHelpModal onClose={() => setHelpOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}
