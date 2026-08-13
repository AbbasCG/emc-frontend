import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import {
  Plus, ListChecks, Clock, Users, BarChart3, Play, Pause, Archive, RotateCcw,
  Copy, Trash2, Pencil, X, Save, Sparkles,
} from 'lucide-react'
import {
  fetchInstructorQuizzes, createInstructorQuiz, deleteInstructorQuiz, duplicateInstructorQuiz,
  publishInstructorQuiz, closeInstructorQuiz, reopenInstructorQuiz, archiveInstructorQuiz,
  updateInstructorQuiz,
  fetchAssessmentSettings, saveAssessmentSettings,
  type InstructorQuizSummary, type QuizStatus, type QuizWeightingMode, type QuizFormInput,
} from '@/api/courseQuizApi'
import { InstructorHero } from '@/components/instructor'
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

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
}

// ─── Assessment settings panel ───────────────────────────────────────────────

function AssessmentSettingsPanel({ courseId }: { courseId: string }) {
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

  if (loading) return <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-[#0077B6]" />
        <h2 className="text-[14px] font-black text-deepBlue">إعدادات التقييم</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">وزن الاختبارات القصيرة (%)</label>
          <input
            type="number" min={0} max={100} value={quizWeight}
            onChange={(e) => setQuizWeight(Number(e.target.value))}
            className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-[13px] font-bold text-deepBlue outline-none focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">وزن الاختبار النهائي (%)</label>
          <input
            type="number" min={0} max={100} value={examWeight}
            onChange={(e) => setExamWeight(Number(e.target.value))}
            className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-[13px] font-bold text-deepBlue outline-none focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
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
                mode === m ? 'bg-[#0077B6] text-white' : 'border border-slate-200 text-deepBlue/60 hover:bg-slate-50'
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
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-black text-deepBlue">{quiz ? 'تعديل الاختبار' : 'إنشاء اختبار قصير'}</h3>
          <button type="button" onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">عنوان الاختبار</label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)} dir="rtl"
              className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-[13px] font-bold text-deepBlue outline-none focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">الوصف (اختياري)</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)} dir="rtl" rows={2}
              className="w-full rounded-2xl border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">عدد المحاولات المسموحة</label>
              <input
                type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-[13px] font-bold text-deepBlue outline-none focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-black text-deepBlue/60">وزن مخصص (%) — اختياري</label>
              <input
                type="number" min={0} max={100} value={weight}
                onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-10 w-full rounded-2xl border border-slate-200 px-3.5 text-[13px] font-bold text-deepBlue outline-none focus:border-[#0077B6] focus:ring-4 focus:ring-sky-100"
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
      </div>
    </div>
  )
}

// ─── Quiz card ────────────────────────────────────────────────────────────────

function QuizCard({ quiz, onAction, onEdit }: {
  quiz: InstructorQuizSummary
  onAction: (action: 'publish' | 'close' | 'reopen' | 'archive' | 'duplicate' | 'delete', quiz: InstructorQuizSummary) => void
  onEdit: (quiz: InstructorQuizSummary) => void
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-black text-deepBlue">{quiz.title}</h3>
            {quiz.is_final_exam && <span title="الاختبار النهائي"><Sparkles className="h-3.5 w-3.5 text-amber-500" /></span>}
          </div>
          <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/40">
            {quiz.questions_count} سؤال · {quiz.total_points} نقطة
          </p>
        </div>
        <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${STATUS_BADGE[quiz.effective_status]}`}>
          {STATUS_LABEL[quiz.effective_status]}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-deepBlue/55">
        <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> يفتح: {fmtDate(quiz.opens_at)}</div>
        <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> يغلق: {fmtDate(quiz.closes_at)}</div>
        <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> أكمل: {quiz.completed_students_count}</div>
        <div className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> المتوسط: {quiz.average_score ?? '—'}%</div>
      </div>

      {quiz.counts_toward_final_grade && (
        <p className="mt-2 text-[10px] font-black text-[#0077B6]">
          يُحتسب ضمن النتيجة النهائية · الوزن: {quiz.weight ?? 'متساوٍ'}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => onEdit(quiz)} className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 px-2.5 text-[10px] font-black text-deepBlue/60 hover:bg-slate-50">
          <Pencil className="h-3 w-3" /> تعديل
        </button>
        {quiz.status === 'draft' && (
          <button type="button" onClick={() => onAction('publish', quiz)} className="flex h-8 items-center gap-1 rounded-xl bg-emerald-50 px-2.5 text-[10px] font-black text-emerald-700 hover:bg-emerald-100">
            <Play className="h-3 w-3" /> نشر الآن
          </button>
        )}
        {(quiz.status === 'active' || quiz.status === 'scheduled') && (
          <button type="button" onClick={() => onAction('close', quiz)} className="flex h-8 items-center gap-1 rounded-xl bg-red-50 px-2.5 text-[10px] font-black text-red-600 hover:bg-red-100">
            <Pause className="h-3 w-3" /> إيقاف
          </button>
        )}
        {quiz.status === 'closed' && (
          <button type="button" onClick={() => onAction('reopen', quiz)} className="flex h-8 items-center gap-1 rounded-xl bg-sky-50 px-2.5 text-[10px] font-black text-sky-700 hover:bg-sky-100">
            <RotateCcw className="h-3 w-3" /> إعادة فتح
          </button>
        )}
        {quiz.status !== 'archived' && (
          <button type="button" onClick={() => onAction('archive', quiz)} className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 px-2.5 text-[10px] font-black text-deepBlue/50 hover:bg-slate-50">
            <Archive className="h-3 w-3" /> أرشفة
          </button>
        )}
        <button type="button" onClick={() => onAction('duplicate', quiz)} className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 px-2.5 text-[10px] font-black text-deepBlue/50 hover:bg-slate-50">
          <Copy className="h-3 w-3" /> نسخ
        </button>
        {quiz.completed_students_count === 0 && (
          <button type="button" onClick={() => onAction('delete', quiz)} className="flex h-8 items-center gap-1 rounded-xl border border-red-200 px-2.5 text-[10px] font-black text-red-500 hover:bg-red-50">
            <Trash2 className="h-3 w-3" /> حذف
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function InstructorQuizzesPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const [quizzes, setQuizzes] = useState<InstructorQuizSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [modalQuiz, setModalQuiz] = useState<InstructorQuizSummary | null | 'new'>(null)

  async function load() {
    if (!courseId) return
    setLoading(true)
    try {
      setQuizzes(await fetchInstructorQuizzes(Number(courseId)))
    } catch {
      toast.error('تعذّر تحميل الاختبارات القصيرة')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [courseId])

  async function handleAction(action: 'publish' | 'close' | 'reopen' | 'archive' | 'duplicate' | 'delete', quiz: InstructorQuizSummary) {
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
      void load()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'تعذّر تنفيذ العملية')
    }
  }

  const stats = useMemo(() => ({
    total: quizzes.length,
    active: quizzes.filter((q) => q.effective_status === 'active').length,
    counted: quizzes.filter((q) => q.counts_toward_final_grade).length,
  }), [quizzes])

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
        pills={loading ? [] : [
          { label: 'إجمالي الاختبارات', value: stats.total },
          { label: 'متاح الآن', value: stats.active },
          { label: 'ضمن النتيجة', value: stats.counted },
        ]}
        actions={
          <button
            type="button" onClick={() => setModalQuiz('new')}
            className="flex h-9 items-center gap-1.5 rounded-2xl bg-white/15 px-3.5 text-[12px] font-black text-white backdrop-blur transition hover:bg-white/25"
          >
            <Plus className="h-4 w-4" /> إضافة اختبار قصير
          </button>
        }
      />

      <AssessmentSettingsPanel courseId={courseId} />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-3xl bg-slate-100" />)}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <ListChecks className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-[16px] font-black text-deepBlue">لا توجد اختبارات قصيرة بعد</p>
          <p className="mt-1.5 text-[12px] font-semibold text-deepBlue/45">أضف أول اختبار قصير لهذه الدورة</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((q) => (
            <QuizCard key={q.id} quiz={q} onAction={(a, qz) => void handleAction(a, qz)} onEdit={setModalQuiz} />
          ))}
        </div>
      )}

      {modalQuiz && (
        <QuizFormModal
          courseId={courseId}
          quiz={modalQuiz === 'new' ? null : modalQuiz}
          onClose={() => setModalQuiz(null)}
          onSaved={() => void load()}
        />
      )}
    </div>
  )
}
