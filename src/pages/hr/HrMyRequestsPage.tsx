import { useState, useEffect } from 'react'
import { Plus, Loader2, Users } from 'lucide-react'
import apiClient from '@/api/axios'
import toast from '@/lib/toast'
import type { Department } from '@/types/platform'

// Basic HR Request Type
export interface HrRequest {
  id: number
  department_id: number
  request_type: string
  required_count: number
  skills_and_specs: string
  notes: string | null
  status: 'pending' | 'approved' | 'rejected' | 'in_progress'
  hr_feedback: string | null
  target_audience: string
  created_by: number
  created_at: string
  department?: Department
  creator?: { id: number; name: string }
}

export default function HrMyRequestsPage() {
  const [requests, setRequests] = useState<HrRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [requestType, setRequestType] = useState('احتياج وظيفي')
  const [requiredCount, setRequiredCount] = useState(1)
  const [skillsAndSpecs, setSkillsAndSpecs] = useState('')
  const [notes, setNotes] = useState('')

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/admin/hr-requests/my')
      setRequests(res.data?.data || [])
    } catch (err) {
      toast.error('فشل في جلب طلبات الاحتياج')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchRequests()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!skillsAndSpecs.trim()) {
      toast.error('يرجى تحديد المهارات والمواصفات المطلوبة')
      return
    }

    try {
      setSubmitting(true)
      await apiClient.post('/admin/hr-requests', {
        request_type: requestType,
        required_count: requiredCount,
        skills_and_specs: skillsAndSpecs,
        notes: notes
      })
      toast.success('تم تقديم الطلب بنجاح')
      setShowModal(false)
      // Reset form
      setRequestType('احتياج وظيفي')
      setRequiredCount(1)
      setSkillsAndSpecs('')
      setNotes('')
      // Refresh list
      void fetchRequests()
    } catch (err: any) {
      errorToast(err.response?.data?.message || 'فشل في إرسال الطلب')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-orange-100 text-orange-800 border-orange-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'مقبول'
      case 'rejected': return 'مرفوض'
      case 'in_progress': return 'جاري التنفيذ'
      default: return 'قيد الانتظار'
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-deepBlue">طلبات الاحتياج (إدارتي)</h1>
          <p className="text-sm font-semibold text-deepBlue/60 mt-1">
            تقديم ومتابعة طلبات التوظيف والاحتياج الوظيفي لقسمك
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-customBlue text-white font-bold rounded-xl hover:bg-[#1B6489] transition shadow-emc-sm hover:-translate-y-0.5"
        >
          <Plus size={18} />
          تقديم طلب احتياج جديد
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-deepBlue/[0.08] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-customBlue" />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-deepBlue/50 font-semibold">
            لا توجد طلبات احتياج مقدمة حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[#F6F8FB] text-deepBlue border-b border-deepBlue/[0.08]">
                <tr>
                  <th className="px-5 py-4 font-black">نوع الطلب</th>
                  <th className="px-5 py-4 font-black">العدد المطلوب</th>
                  <th className="px-5 py-4 font-black">القسم</th>
                  <th className="px-5 py-4 font-black">حالة الطلب</th>
                  <th className="px-5 py-4 font-black">تاريخ التقديم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-deepBlue/[0.05]">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#F6F8FB]/50 transition">
                    <td className="px-5 py-4 font-bold text-deepBlue">
                      {req.request_type}
                    </td>
                    <td className="px-5 py-4 font-semibold text-deepBlue/80 font-latin">
                      {req.required_count}
                    </td>
                    <td className="px-5 py-4 font-semibold text-deepBlue/70">
                      {req.department?.name || '---'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold border ${getStatusColor(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-deepBlue/60 font-latin text-[13px]">
                      {new Date(req.created_at).toLocaleDateString('en-CA')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submission Modal */}
      {showModal && (
        <div className="fixed inset-0 z-modal-overlay bg-deepBlue/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-emc-card flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-deepBlue/[0.08] flex items-center justify-between bg-[#F6F8FB]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-customBlue/10 flex items-center justify-center text-customBlue">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-deepBlue">طلب احتياج كادر</h3>
                  <p className="text-xs font-semibold text-deepBlue/60">نموذج رفع احتياج الموارد البشرية</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="hr-request-form" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-deepBlue mb-1.5">نوع الطلب / المسمى الوظيفي</label>
                  <input 
                    type="text" 
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    required
                    className="w-full h-11 px-4 rounded-xl border border-deepBlue/10 bg-[#F6F8FB] text-sm font-semibold focus:bg-white focus:border-customBlue focus:ring-1 focus:ring-customBlue outline-none transition"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-deepBlue mb-1.5">العدد المطلوب</label>
                  <input 
                    type="number" 
                    min="1"
                    value={requiredCount}
                    onChange={(e) => setRequiredCount(Number(e.target.value))}
                    required
                    className="w-full h-11 px-4 rounded-xl border border-deepBlue/10 bg-[#F6F8FB] font-latin text-sm font-semibold focus:bg-white focus:border-customBlue focus:ring-1 focus:ring-customBlue outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-deepBlue mb-1.5">المهارات والمواصفات المطلوبة</label>
                  <textarea 
                    value={skillsAndSpecs}
                    onChange={(e) => setSkillsAndSpecs(e.target.value)}
                    required
                    rows={4}
                    placeholder="مثال: خبرة سنتين، إجادة اللغة الإنجليزية..."
                    className="w-full p-4 rounded-xl border border-deepBlue/10 bg-[#F6F8FB] text-sm font-semibold focus:bg-white focus:border-customBlue focus:ring-1 focus:ring-customBlue outline-none transition resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-bold text-deepBlue mb-1.5">ملاحظات إضافية (اختياري)</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full p-4 rounded-xl border border-deepBlue/10 bg-[#F6F8FB] text-sm font-semibold focus:bg-white focus:border-customBlue focus:ring-1 focus:ring-customBlue outline-none transition resize-none"
                  ></textarea>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-deepBlue/[0.08] bg-[#F6F8FB]/50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-deepBlue/70 hover:bg-deepBlue/5 transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                form="hr-request-form"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl font-bold bg-customBlue text-white hover:bg-[#1B6489] transition shadow-emc-sm disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : 'تقديم الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
