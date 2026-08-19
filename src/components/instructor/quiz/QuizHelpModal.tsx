import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'

type Step = {
  title: string
  items: string[]
}

const STEPS: Step[] = [
  { title: 'المعلومات الأساسية', items: ['عنوان الاختبار', 'الوصف', 'نوع الاختبار', 'المدة'] },
  { title: 'إضافة الأسئلة', items: ['إضافة سؤال', 'نوع السؤال', 'الإجابات', 'الإجابة الصحيحة'] },
  { title: 'إعدادات الاختبار', items: ['عدد المحاولات', 'درجة النجاح', 'المؤقت', 'إظهار النتائج'] },
  { title: 'المراجعة والنشر', items: ['مراجعة البيانات', 'التحقق من الأسئلة', 'نشر الاختبار'] },
  { title: 'متابعة النتائج', items: ['عدد المحاولات', 'متوسط الدرجات', 'أداء الطلاب'] },
]

export default function QuizHelpModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1
  const isFirst = step === 0

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-0 sm:p-4"
        style={{ backdropFilter: 'blur(4px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        dir="rtl"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="flex h-full w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-[720px] sm:rounded-3xl sm:shadow-2xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
            <div>
              <h2 className="text-[15px] font-black text-deepBlue">كيف يعمل نظام الاختبارات القصيرة؟</h2>
              <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/45">دليل سريع لإنشاء اختبار ومتابعة نتائجه</p>
            </div>
            <button
              type="button" onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-deepBlue"
              aria-label="إغلاق"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="flex shrink-0 items-center gap-1.5 px-5 pt-4 sm:px-7">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => setStep(i)}
                aria-label={s.title}
                className="group relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
              >
                <motion.div
                  className="absolute inset-y-0 right-0 rounded-full bg-customBlue"
                  initial={false}
                  animate={{ width: i <= step ? '100%' : '0%' }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                />
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-2 text-[10px] font-black text-deepBlue/40 sm:px-7">
            <span>الخطوة {step + 1} من {STEPS.length}</span>
            <span>{STEPS[step].title}</span>
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-customBlue text-[13px] font-black text-white">
                    {step + 1}
                  </span>
                  <h3 className="text-[15px] font-black text-deepBlue">{STEPS[step].title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {STEPS[step].items.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                      <Check className="h-4 w-4 shrink-0 text-customBlue" />
                      <span className="text-[13px] font-bold text-deepBlue/80">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Step navigation */}
          <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-5 py-4 sm:px-7">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={isFirst}
              className="flex h-10 items-center gap-1.5 rounded-2xl border border-slate-200 px-4 text-[12px] font-black text-deepBlue/60 transition hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" /> السابق
            </button>
            {isLast ? (
              <button
                type="button" onClick={onClose}
                className="flex h-10 items-center gap-1.5 rounded-2xl bg-deepBlue px-5 text-[12px] font-black text-white transition hover:opacity-90"
              >
                فهمت، إغلاق
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="flex h-10 items-center gap-1.5 rounded-2xl bg-customBlue px-5 text-[12px] font-black text-white transition hover:opacity-90"
              >
                التالي <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
