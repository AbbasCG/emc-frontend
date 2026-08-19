import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, X } from 'lucide-react'
import toast from '@/lib/toast'
import { createMeeting } from '@/api/meetingsApi'
import { fetchWorkspaceDepartments } from '@/api/operationsApi'
import type { MeetingType, WorkspaceDepartment } from '@/types/operations'
import { MEETING_TYPE_AR } from '@/data/operationsLabels'
import EmcButton from '@/components/ui/EmcButton'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialType?: MeetingType
  hideTypeSelector?: boolean
}

export default function CreateMeetingForm({ isOpen, onClose, onSuccess, initialType, hideTypeSelector }: Props) {
  const [departments, setDepartments] = useState<WorkspaceDepartment[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingDepts, setLoadingDepts] = useState(isOpen)

  const [formData, setFormData] = useState({
    title: '',
    type: initialType || 'general',
    department_id: '',
    meeting_date: '',
    start_time: '',
    end_time: '',
    meeting_url: '',
  })

  // Reset the type + loading flag when the form opens — render-phase adjustment
  // (docs/04-references/effect-patterns.md §P2), not a setState in the effect.
  const [wasOpen, setWasOpen] = useState(isOpen)
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setFormData(prev => ({ ...prev, type: initialType || 'general' }))
      setLoadingDepts(true)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchWorkspaceDepartments()
        .then((res) => setDepartments(res.items))
        .catch((err) => {
          if (err.response?.status !== 403) {
            toast.error('تعذر تحميل الإدارات')
          }
        })
        .finally(() => setLoadingDepts(false))
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createMeeting({
        ...formData,
        department_id: formData.department_id || undefined,
        end_time: formData.end_time || undefined,
        meeting_url: formData.meeting_url || undefined,
      })
      toast.success('تمت جدولة الاجتماع بنجاح')
      onSuccess()
      onClose()
      setFormData({
        title: '',
        type: initialType || 'general',
        department_id: '',
        meeting_date: '',
        start_time: '',
        end_time: '',
        meeting_url: '',
      })
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'تعذر إضافة الاجتماع')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          className="overflow-hidden"
          dir="rtl"
        >
          <div className="rounded-2xl bg-white shadow-lg ring-1 ring-black/5 border border-slate-100">
            <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-customBlue/10 text-customBlue">
                  <Calendar size={20} />
                </div>
                <h2 className="text-lg font-black text-deepBlue">جدولة اجتماع جديد</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">عنوان الاجتماع *</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-customBlue focus:bg-white focus:ring-1 focus:ring-customBlue"
                    placeholder="مثال: مراجعة خطة الربع الثالث"
                  />
                </div>

                <div className={`grid grid-cols-1 gap-4 ${departments.length > 0 && !hideTypeSelector ? 'md:grid-cols-2' : ''}`}>
                  {!hideTypeSelector && (
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">النوع *</label>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as MeetingType })}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-customBlue focus:bg-white focus:ring-1 focus:ring-customBlue"
                      >
                        {Object.entries(MEETING_TYPE_AR).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {departments.length > 0 && (
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">الإدارة (اختياري)</label>
                      <select
                        value={formData.department_id}
                        onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                        disabled={loadingDepts}
                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-customBlue focus:bg-white focus:ring-1 focus:ring-customBlue"
                      >
                        <option value="">-- اختر الإدارة --</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name_ar || d.name} {d.leader_name ? `(مسؤول: ${d.leader_name})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">تاريخ الاجتماع *</label>
                    <input
                      required
                      type="date"
                      value={formData.meeting_date}
                      onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                      className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-customBlue focus:bg-white focus:ring-1 focus:ring-customBlue"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">وقت البدء *</label>
                    <input
                      required
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-customBlue focus:bg-white focus:ring-1 focus:ring-customBlue"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">وقت الانتهاء (اختياري)</label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-customBlue focus:bg-white focus:ring-1 focus:ring-customBlue"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">رابط الاجتماع (اختياري)</label>
                  <input
                    type="url"
                    value={formData.meeting_url}
                    onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-customBlue focus:bg-white focus:ring-1 focus:ring-customBlue text-left"
                    dir="ltr"
                    placeholder="https://zoom.us/..."
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <EmcButton type="submit" loading={submitting} className="flex-1 justify-center bg-deepBlue hover:bg-deepBlue/90">
                  حفظ الاجتماع
                </EmcButton>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 bg-white px-6 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
