import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { submitMeetingReport } from '@/api/meetingsApi'
import toast from 'react-hot-toast'

interface MeetingReportModalProps {
  isOpen: boolean
  onClose: () => void
  meetingId: number
  onSuccess: () => void
}

export default function MeetingReportModal({ isOpen, onClose, meetingId, onSuccess }: MeetingReportModalProps) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    absentees: '', // Will convert to array on submit
    team_commitment_score: 5,
    team_commitment_notes: '',
    completed_tasks_summary: '',
    kpi_percentage: 100,
    top_interactive_member: '',
    challenges: '',
    executive_requests: '',
    next_month_goals: '',
    improvement_suggestions: '',
  })

  if (!isOpen) return null

  const handleNext = () => setStep(s => Math.min(s + 1, 3))
  const handlePrev = () => setStep(s => Math.max(s - 1, 1))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await submitMeetingReport(meetingId, {
        ...formData,
        absentees: formData.absentees.split(',').map(s => s.trim()).filter(Boolean)
      })
      toast.success('تم رفع تقرير الاجتماع بنجاح وتوثيق المخرجات')
      onSuccess()
      onClose()
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'تعذر رفع التقرير')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deepBlue/40 backdrop-blur-sm" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/80 p-6 backdrop-blur-md">
            <div>
              <h2 className="text-xl font-black text-deepBlue">تقرير الاجتماع والمخرجات</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                الخطوة {step} من 3 توثيق الأداء والمقررات
              </p>
            </div>
            <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="min-h-[300px]">
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                  <h3 className="text-sm font-black text-customBlue border-b border-customBlue/10 pb-2">البيانات التأسيسية والانضباط</h3>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">الأعضاء الغائبون (مفصولين بفاصلة)</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                      value={formData.absentees}
                      onChange={e => setFormData({ ...formData, absentees: e.target.value })}
                      placeholder="أحمد، سارة..."
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">مقياس التزام الفريق (1 - 5)</label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      className="w-full accent-customBlue"
                      value={formData.team_commitment_score}
                      onChange={e => setFormData({ ...formData, team_commitment_score: Number(e.target.value) })}
                    />
                    <div className="mt-2 text-center font-black text-customBlue">{formData.team_commitment_score} / 5</div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">ملاحظات حول الانضباط</label>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                      rows={3}
                      value={formData.team_commitment_notes}
                      onChange={e => setFormData({ ...formData, team_commitment_notes: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                  <h3 className="text-sm font-black text-customBlue border-b border-customBlue/10 pb-2">تقييم الأداء والإنجازات السابقة</h3>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">المهام التي أُنجزت خلال الفترة السابقة</label>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                      rows={3}
                      value={formData.completed_tasks_summary}
                      onChange={e => setFormData({ ...formData, completed_tasks_summary: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">نسبة تحقيق الأهداف التشغيلية (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                      value={formData.kpi_percentage}
                      onChange={e => setFormData({ ...formData, kpi_percentage: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">اسم العضو الأكثر تفاعلاً وتميزاً</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                      value={formData.top_interactive_member}
                      onChange={e => setFormData({ ...formData, top_interactive_member: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">المشاكل والتحديات التي واجهت الإدارة</label>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                      rows={3}
                      value={formData.challenges}
                      onChange={e => setFormData({ ...formData, challenges: e.target.value })}
                    />
                  </div>
                </div>
              )}



              {step === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                  <h3 className="text-sm font-black text-customBlue border-b border-customBlue/10 pb-2">المتطلبات من الإدارة العليا والتطلعات</h3>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">الأعمال المطلوبة من مجلس إدارة المركز</label>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                      rows={3}
                      value={formData.executive_requests}
                      onChange={e => setFormData({ ...formData, executive_requests: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">الأهداف التشغيلية للشهر القادم</label>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                      rows={3}
                      value={formData.next_month_goals}
                      onChange={e => setFormData({ ...formData, next_month_goals: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">مقترحات تطوير آلية عمل المركز</label>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue"
                      rows={3}
                      value={formData.improvement_suggestions}
                      onChange={e => setFormData({ ...formData, improvement_suggestions: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={handlePrev}
                disabled={step === 1 || submitting}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
                السابق
              </button>
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 rounded-xl bg-customBlue px-5 py-2.5 text-sm font-black text-white hover:bg-customBlue/90"
                >
                  التالي
                  <ChevronLeft size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white hover:bg-deepBlue/90 disabled:opacity-70"
                >
                  {submitting ? 'يتم الرفع...' : 'رفع التقرير النهائي'}
                  {!submitting && <CheckCircle size={16} />}
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
