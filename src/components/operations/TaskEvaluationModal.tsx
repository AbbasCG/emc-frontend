import { useState, type FormEvent } from 'react'
import { Award, CheckCircle2, Info, ShieldCheck, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiMessageOr } from '@/api/apiErrors'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { evaluateTask, type BoardTask } from '@/api/operationsBoardApi'

type Props = {
  task: BoardTask | null
  open: boolean
  onClose: () => void
  onEvaluated: () => void
}

export default function TaskEvaluationModal({ task, open, onClose, onEvaluated }: Props) {
  const [deliveredOnTime, setDeliveredOnTime] = useState<number>(5)
  const [qualityOfOutputs, setQualityOfOutputs] = useState<number>(5)
  const [autonomy, setAutonomy] = useState<number>(5)
  const [responsiveness, setResponsiveness] = useState<number>(5)
  const [collaboration, setCollaboration] = useState<number>(5)
  const [collaborationNa, setCollaborationNa] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // A new task (or a re-opened window) starts from the default scores, never the previous task's.
  const [seen, setSeen] = useState({ open, id: task?.id })
  if (seen.open !== open || seen.id !== task?.id) {
    setSeen({ open, id: task?.id })
    setDeliveredOnTime(5)
    setQualityOfOutputs(5)
    setAutonomy(5)
    setResponsiveness(5)
    setCollaboration(5)
    setCollaborationNa(false)
    setFeedback('')
  }

  if (!task) return null

  const isSimple = task.task_scope === 'simple' || (!task.task_scope && (task.points ?? 0) <= 50)

  // Calculate live average score
  const validScores = [deliveredOnTime, qualityOfOutputs, autonomy, responsiveness]
  if (!collaborationNa) validScores.push(collaboration)
  const avgScore = (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      await evaluateTask(task.id, {
        delivered_on_time: deliveredOnTime,
        quality_of_outputs: qualityOfOutputs,
        autonomy,
        responsiveness,
        collaboration: collaborationNa ? null : collaboration,
        collaboration_na: collaborationNa,
        feedback: feedback.trim() || undefined,
      })

      if (isSimple) {
        toast.success('تم التقييم والاعتماد الفوري وإضافة النقاط وساعات التطوع لرصيد المتطوع!')
      } else {
        toast.success('تم حفظ التقييم وإحالة المهمة للموارد البشرية (HR) للاعتماد النهائي.')
      }

      onEvaluated()
      onClose()
    } catch (err: unknown) {
      toast.error(getApiMessageOr(err, 'تعذر حفظ التقييم'))
    } finally {
      setSubmitting(false)
    }
  }

  // Star rating selector component (1-5)
  const renderLikertRow = (
    label: string,
    value: number,
    onChange: (val: number) => void,
    disabled = false
  ) => {
    return (
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border p-3.5 transition ${
        disabled ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-100 bg-white hover:border-customBlue/30'
      }`}>
        <span className="text-xs font-black text-deepBlue">{label}</span>
        <div className="flex items-center gap-1.5" dir="ltr">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onClick={() => onChange(star)}
              className={`flex size-8 items-center justify-center rounded-xl font-black text-xs transition ${
                star <= value && !disabled
                  ? 'bg-amber-400 text-deepBlue shadow-sm'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              {star}
            </button>
          ))}
          <span className="ml-2 text-xs font-black text-slate-500 w-12 text-center" dir="rtl">
            {value === 5 ? 'ممتاز' : value === 4 ? 'جيد جداً' : value === 3 ? 'جيد' : value === 2 ? 'مقبول' : 'ضعيف'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <CenteredModal
      open={open && task !== null}
      onClose={onClose}
      size="md"
      testId="task-evaluation-modal"
      busy={submitting}
      dirty={feedback.trim() !== ''}
      title={
        <span className="block">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
            <CheckCircle2 size={13} aria-hidden="true" />
            تقييم المهمة وإغلاقها
          </span>
          <span className="mt-1.5 block truncate text-base font-black text-deepBlue">{task.title}</span>
        </span>
      }
      subtitle={`المكلف: ${task.assigned_to?.name ?? 'غير محدد'} · النقاط: ${task.points ?? '—'} · المدة: ${task.estimated_hours ?? '—'} س`}
      footer={(requestClose) => (
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={requestClose} disabled={submitting} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            إلغاء
          </button>
          <button
            type="submit"
            form="task-evaluation-form"
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-deepBlue px-6 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-deepBlue/90 disabled:opacity-50"
          >
            <Award size={14} className="text-amber-400" aria-hidden="true" />
            <span>{submitting ? 'جاري الاعتماد...' : 'حفظ التقييم والاعتماد'}</span>
          </button>
        </div>
      )}
    >
      <div className="text-right">
          {/* تنبيه مسار الاعتماد بحسب حجم المهمة */}
          <div className={`mt-4 rounded-2xl p-4 text-xs font-bold leading-relaxed flex items-start gap-3 ${
            isSimple
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
              : 'bg-amber-50 text-amber-900 border border-amber-200/60'
          }`}>
            {isSimple ? (
              <ShieldCheck size={20} className="shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <Info size={20} className="shrink-0 text-amber-600 mt-0.5" />
            )}
            <div>
              <p className="font-black text-sm mb-0.5">
                {isSimple ? 'مهمة بسيطة (اعتماد مباشر)' : 'مهمة تتطلب اعتماد الموارد البشرية (HR)'}
              </p>
              <p className="text-[11px] opacity-90">
                {isSimple
                  ? 'بما أن المهمة بسيطة (25 - 50 نقطة)، فإن تقييمك سيعتمد المهمة نهائياً وتُضاف النقاط وساعات التطوع التراكمية مباشرة إلى حساب المتطوع.'
                  : 'بما أن المهمة متوسطة أو أعلى، سيتم تسجيل تقييمك وإحالة المهمة إلى قسم الموارد البشرية لاعتمادها وإيداع النقاط والساعات للمتطوع.'}
              </p>
            </div>
          </div>

          <form id="task-evaluation-form" onSubmit={handleSubmit} className="mt-1 space-y-4 text-right">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-black text-deepBlue">معايير التقييم الخمسة (مقياس ليكرت 1 - 5):</span>
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl">
                <Star size={13} className="fill-amber-400 text-amber-400" />
                <span>المعدل: {avgScore} / 5</span>
              </div>
            </div>

            {/* 1. سلمت في الوقت المحدد */}
            {renderLikertRow('1. سلمت في الوقت المحدد', deliveredOnTime, setDeliveredOnTime)}

            {/* 2. جودة المخرجات المطلوبة */}
            {renderLikertRow('2. جودة المخرجات المطلوبة', qualityOfOutputs, setQualityOfOutputs)}

            {/* 3. استقلالية العضو في أداء المهمة */}
            {renderLikertRow('3. استقلالية العضو في أداء المهمة', autonomy, setAutonomy)}

            {/* 4. سرعة الاستجابة */}
            {renderLikertRow('4. سرعة الاستجابة والتواصل', responsiveness, setResponsiveness)}

            {/* 5. التعاون مع الأشخاص الآخرين مع خيار لا ينطبق */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-500">التعاون مع الفريق والجهات الأخرى</span>
                <label className="flex items-center gap-1.5 text-[11px] font-black text-customBlue cursor-pointer">
                  <input
                    type="checkbox"
                    checked={collaborationNa}
                    onChange={(e) => setCollaborationNa(e.target.checked)}
                    className="rounded text-customBlue"
                  />
                  <span>[x] لا ينطبق (مهمة فردية بحتة)</span>
                </label>
              </div>
              {renderLikertRow(
                '5. التعاون مع الأشخاص الآخرين',
                collaboration,
                setCollaboration,
                collaborationNa
              )}
            </div>

            {/* ملاحظات التقييم والتغذية الراجعة */}
            <div>
              <label className="block text-xs font-black text-deepBlue mb-1.5">
                ملاحظات وتغذية راجعة للعضو (اختياري)
              </label>
              <textarea
                rows={2}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="كلمة شكر، أو توجيهات للتحسين في المهام القادمة..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-deepBlue placeholder:text-slate-400 focus:border-customBlue"
              />
            </div>
          </form>
      </div>
    </CenteredModal>
  )
}
