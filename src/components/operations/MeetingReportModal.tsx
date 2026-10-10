import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, ChevronRight, ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { submitMeetingReport } from '@/api/meetingsApi'
import toast from 'react-hot-toast'

const TOTAL_STEPS = 4

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-deepBlue focus:border-customBlue focus:ring-1 focus:ring-customBlue'

type AttendeeRow = { name: string; role: string }
type ActionRow = { title: string; due_date: string }

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-customBlue/40 px-3 py-1.5 text-xs font-bold text-customBlue hover:bg-customBlue/5"
    >
      <Plus size={14} />
      {label}
    </button>
  )
}

function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="حذف"
      className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
    >
      <Trash2 size={15} />
    </button>
  )
}

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

  // Step 4 — meeting minutes & follow-ups (stored on the meeting itself)
  const [agenda, setAgenda] = useState<string[]>([''])
  const [attendees, setAttendees] = useState<AttendeeRow[]>([{ name: '', role: '' }])
  const [decisions, setDecisions] = useState<string[]>([''])
  const [actionItems, setActionItems] = useState<ActionRow[]>([{ title: '', due_date: '' }])
  const [minutes, setMinutes] = useState('')

  if (!isOpen) return null

  const handleNext = () => setStep(s => Math.min(s + 1, TOTAL_STEPS))
  const handlePrev = () => setStep(s => Math.max(s - 1, 1))

  // Form-level submit (e.g. Enter key) must NEVER upload — it only advances the wizard.
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (step < TOTAL_STEPS) handleNext()
  }

  // Final upload: triggered only by the explicit button on the last step.
  const handleFinalSubmit = async () => {
    if (step !== TOTAL_STEPS || submitting) return

    setSubmitting(true)
    try {
      await submitMeetingReport(meetingId, {
        ...formData,
        absentees: formData.absentees.split(',').map(s => s.trim()).filter(Boolean),
        agenda: agenda.map(s => s.trim()).filter(Boolean),
        attendees: attendees
          .map(a => ({ name: a.name.trim(), role: a.role.trim() }))
          .filter(a => a.name),
        decisions: decisions.map(s => s.trim()).filter(Boolean).map(title => ({ title })),
        action_items: actionItems
          .map(a => ({ title: a.title.trim(), due_date: a.due_date || undefined }))
          .filter(a => a.title),
        minutes: minutes.trim() || undefined,
      })
      toast.success('تم رفع تقرير الاجتماع بنجاح وتوثيق المخرجات')
      setStep(1)
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
                الخطوة {step} من {TOTAL_STEPS} توثيق الأداء والمقررات
              </p>
            </div>
            <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="p-6">
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

              {step === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <h3 className="text-sm font-black text-customBlue border-b border-customBlue/10 pb-2">محضر الاجتماع وبنود المتابعة</h3>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">جدول الأعمال</label>
                    <div className="space-y-2">
                      {agenda.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-5 shrink-0 text-center text-xs font-black text-customOrange">{i + 1}</span>
                          <input
                            type="text"
                            className={inputCls}
                            value={item}
                            placeholder="بند من جدول الأعمال"
                            onChange={e => setAgenda(list => list.map((v, idx) => (idx === i ? e.target.value : v)))}
                          />
                          <RemoveRowButton onClick={() => setAgenda(list => (list.length > 1 ? list.filter((_, idx) => idx !== i) : ['']))} />
                        </div>
                      ))}
                    </div>
                    <AddRowButton onClick={() => setAgenda(list => [...list, ''])} label="إضافة بند" />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">الحضور</label>
                    <div className="space-y-2">
                      {attendees.map((row, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            className={inputCls}
                            value={row.name}
                            placeholder="الاسم"
                            onChange={e => setAttendees(list => list.map((v, idx) => (idx === i ? { ...v, name: e.target.value } : v)))}
                          />
                          <input
                            type="text"
                            className={inputCls}
                            value={row.role}
                            placeholder="الصفة / الدور"
                            onChange={e => setAttendees(list => list.map((v, idx) => (idx === i ? { ...v, role: e.target.value } : v)))}
                          />
                          <RemoveRowButton onClick={() => setAttendees(list => (list.length > 1 ? list.filter((_, idx) => idx !== i) : [{ name: '', role: '' }]))} />
                        </div>
                      ))}
                    </div>
                    <AddRowButton onClick={() => setAttendees(list => [...list, { name: '', role: '' }])} label="إضافة حاضر" />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">القرارات</label>
                    <div className="space-y-2">
                      {decisions.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-5 shrink-0 text-center text-xs font-black text-customOrange">{i + 1}</span>
                          <input
                            type="text"
                            className={inputCls}
                            value={item}
                            placeholder="نص القرار"
                            onChange={e => setDecisions(list => list.map((v, idx) => (idx === i ? e.target.value : v)))}
                          />
                          <RemoveRowButton onClick={() => setDecisions(list => (list.length > 1 ? list.filter((_, idx) => idx !== i) : ['']))} />
                        </div>
                      ))}
                    </div>
                    <AddRowButton onClick={() => setDecisions(list => [...list, ''])} label="إضافة قرار" />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">بنود العمل</label>
                    <div className="space-y-2">
                      {actionItems.map((row, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            className={inputCls}
                            value={row.title}
                            placeholder="المهمة المطلوبة"
                            onChange={e => setActionItems(list => list.map((v, idx) => (idx === i ? { ...v, title: e.target.value } : v)))}
                          />
                          <input
                            type="date"
                            dir="ltr"
                            aria-label="تاريخ الاستحقاق"
                            className={`${inputCls} max-w-[11rem]`}
                            value={row.due_date}
                            onChange={e => setActionItems(list => list.map((v, idx) => (idx === i ? { ...v, due_date: e.target.value } : v)))}
                          />
                          <RemoveRowButton onClick={() => setActionItems(list => (list.length > 1 ? list.filter((_, idx) => idx !== i) : [{ title: '', due_date: '' }]))} />
                        </div>
                      ))}
                    </div>
                    <AddRowButton onClick={() => setActionItems(list => [...list, { title: '', due_date: '' }])} label="إضافة بند عمل" />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-deepBlue">محضر الاجتماع</label>
                    <textarea
                      className={inputCls}
                      rows={5}
                      value={minutes}
                      placeholder="ملخص ما دار في الاجتماع..."
                      onChange={e => setMinutes(e.target.value)}
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
              
              {step < TOTAL_STEPS ? (
                <button
                  key="wizard-next"
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 rounded-xl bg-customBlue px-5 py-2.5 text-sm font-black text-white hover:bg-customBlue/90"
                >
                  التالي
                  <ChevronLeft size={16} />
                </button>
              ) : (
                <button
                  key="wizard-submit"
                  type="button"
                  onClick={() => void handleFinalSubmit()}
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
