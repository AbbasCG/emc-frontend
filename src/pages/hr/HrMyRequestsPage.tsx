import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Plus, Loader2, Users } from 'lucide-react'
import apiClient from '@/api/axios'
import toast from '@/lib/toast'

/** Server-provided message from an API error response, if any. */
function apiMessage(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined
  const data = err.response?.data as { message?: string } | undefined
  return typeof data?.message === 'string' ? data.message : undefined
}

export type EmploymentTypeOption = 'وظيفة شاغرة' | 'استبدال'

export const EMPLOYMENT_TYPE_OPTIONS: EmploymentTypeOption[] = [
  'وظيفة شاغرة',
  'استبدال',
]

// HR Staffing Request Type
export interface HrRequest {
  id: number
  department_id: number
  employment_type?: string | null
  job_title?: string | null
  request_type: string
  required_count: number
  qualification?: string | null
  responsibilities?: string | null
  skills_and_specs: string
  notes: string | null
  status: 'pending' | 'approved' | 'rejected' | 'in_progress'
  hr_feedback: string | null
  target_audience: string
  created_by: number
  created_at: string
  department?: { id: number; name?: string | null; name_ar?: string | null }
  creator?: { id: number; name: string }
}

/** Extract employment type & job title gracefully even for legacy rows that only stored `request_type`. */
function resolveRequestDisplay(req: HrRequest): {
  employmentType: string
  jobTitle: string
} {
  if (req.employment_type || req.job_title) {
    return {
      employmentType: req.employment_type || 'وظيفة شاغرة',
      jobTitle: req.job_title || req.request_type || 'احتياج وظيفي',
    }
  }
  const raw = (req.request_type || '').trim()
  const match = raw.match(/^(.*?)\s*\((وظيفة شاغرة|استبدال)\)\s*$/)
  if (match) {
    return {
      jobTitle: match[1].trim() || raw,
      employmentType: match[2],
    }
  }
  return {
    employmentType: 'وظيفة شاغرة',
    jobTitle: raw || 'احتياج وظيفي',
  }
}

export default function HrMyRequestsPage() {
  const [requests, setRequests] = useState<HrRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State — ordered per HR staffing specification:
  // 1. نوع التوظيف (وظيفة شاغرة - استبدال)
  // 2. المسمى الوظيفي (+ العدد المطلوب)
  // 3. المؤهل (اختياري)
  // 4. المهام والمسؤوليات
  // 5. المهارات والقدرات
  // 6. ملاحظات (اختياري)
  const [employmentType, setEmploymentType] = useState<EmploymentTypeOption>('وظيفة شاغرة')
  const [jobTitle, setJobTitle] = useState('')
  const [requiredCount, setRequiredCount] = useState(1)
  const [qualification, setQualification] = useState('')
  const [responsibilities, setResponsibilities] = useState('')
  const [skillsAndSpecs, setSkillsAndSpecs] = useState('')
  const [notes, setNotes] = useState('')

  // No synchronous setState before the first await: loading starts `true`,
  // so the effect below can invoke this loader legally (all setStates land
  // after the await — see docs/04-references/effect-patterns.md P1).
  const loadRequests = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data?: HrRequest[] }>('/admin/hr-requests/my')
      setRequests(res.data?.data || [])
    } catch {
      toast.error('فشل في جلب طلبات الاحتياج')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await loadRequests()
    })()
  }, [loadRequests])

  // Refresh after submitting = event-handler path, so the synchronous
  // setLoading(true) here is allowed and required.
  const refreshRequests = useCallback(async () => {
    setLoading(true)
    await loadRequests()
  }, [loadRequests])

  const resetForm = () => {
    setEmploymentType('وظيفة شاغرة')
    setJobTitle('')
    setRequiredCount(1)
    setQualification('')
    setResponsibilities('')
    setSkillsAndSpecs('')
    setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanJobTitle = jobTitle.trim()
    const cleanResponsibilities = responsibilities.trim()
    const cleanSkills = skillsAndSpecs.trim()
    const cleanQualification = qualification.trim()
    const cleanNotes = notes.trim()

    if (!cleanJobTitle) {
      toast.error('يرجى إدخال المسمى الوظيفي')
      return
    }
    if (!cleanResponsibilities) {
      toast.error('يرجى تحديد المهام والمسؤوليات')
      return
    }
    if (!cleanSkills) {
      toast.error('يرجى تحديد المهارات والقدرات')
      return
    }

    try {
      setSubmitting(true)
      await apiClient.post('/admin/hr-requests', {
        employment_type: employmentType,
        job_title: cleanJobTitle,
        request_type: `${cleanJobTitle} (${employmentType})`,
        required_count: requiredCount,
        qualification: cleanQualification || null,
        responsibilities: cleanResponsibilities,
        skills_and_specs: cleanSkills,
        notes: cleanNotes || null,
      })
      toast.success('تم تقديم الطلب بنجاح')
      setShowModal(false)
      resetForm()
      void refreshRequests()
    } catch (err) {
      toast.error(apiMessage(err) || 'فشل في إرسال الطلب')
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
          className="flex items-center gap-2 px-4 py-2 bg-customBlue text-white font-bold rounded-xl hover:bg-[#0E5A8A] transition shadow-emc-sm hover:-translate-y-0.5"
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
                  <th className="px-5 py-4 font-black">نوع التوظيف</th>
                  <th className="px-5 py-4 font-black">المسمى الوظيفي</th>
                  <th className="px-5 py-4 font-black">العدد المطلوب</th>
                  <th className="px-5 py-4 font-black">المؤهل</th>
                  <th className="px-5 py-4 font-black">القسم</th>
                  <th className="px-5 py-4 font-black">حالة الطلب</th>
                  <th className="px-5 py-4 font-black">تاريخ التقديم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-deepBlue/[0.05]">
                {requests.map((req) => {
                  const { employmentType: empType, jobTitle: title } = resolveRequestDisplay(req)
                  return (
                    <tr key={req.id} className="hover:bg-[#F6F8FB]/50 transition">
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold border ${
                            empType === 'استبدال'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-customBlue/10 text-customBlue border-customBlue/20'
                          }`}
                        >
                          {empType}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-deepBlue">
                        {title}
                      </td>
                      <td className="px-5 py-4 font-semibold text-deepBlue/80 font-latin">
                        {req.required_count}
                      </td>
                      <td className="px-5 py-4 font-semibold text-deepBlue/70">
                        {req.qualification || '—'}
                      </td>
                      <td className="px-5 py-4 font-semibold text-deepBlue/70">
                        {req.department?.name_ar || req.department?.name || '---'}
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
                  )
                })}
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
              <form id="hr-request-form" onSubmit={handleSubmit} className="space-y-4">
                {/* 1. قائمة نوع التوظيف (وظيفة شاغرة - استبدال) */}
                <div>
                  <label className="block text-sm font-bold text-deepBlue mb-1.5">
                    نوع التوظيف
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as EmploymentTypeOption)}
                    required
                    className="w-full h-11 px-4 rounded-xl border border-deepBlue/10 bg-[#F6F8FB] text-sm font-semibold text-deepBlue focus:bg-white focus:border-customBlue focus:ring-1 focus:ring-customBlue outline-none transition"
                  >
                    {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. المسمى الوظيفي + العدد المطلوب */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold text-deepBlue mb-1.5">
                      المسمى الوظيفي
                    </label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      required
                      placeholder="مثال: منسق برامج، مصمم محتوى..."
                      className="w-full h-11 px-4 rounded-xl border border-deepBlue/10 bg-[#F6F8FB] text-sm font-semibold focus:bg-white focus:border-customBlue focus:ring-1 focus:ring-customBlue outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-deepBlue mb-1.5">
                      العدد المطلوب
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={requiredCount}
                      onChange={(e) => setRequiredCount(Math.max(1, Number(e.target.value) || 1))}
                      required
                      className="w-full h-11 px-4 rounded-xl border border-deepBlue/10 bg-[#F6F8FB] font-latin text-sm font-semibold focus:bg-white focus:border-customBlue focus:ring-1 focus:ring-customBlue outline-none transition"
                    />
                  </div>
                </div>

                {/* 3. المؤهل (اختياري) */}
                <div>
                  <label className="block text-sm font-bold text-deepBlue mb-1.5">
                    المؤهل (اختياري)
                  </label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="مثال: بكالوريوس إدارة أعمال أو ما يعادله..."
                    className="w-full h-11 px-4 rounded-xl border border-deepBlue/10 bg-[#F6F8FB] text-sm font-semibold focus:bg-white focus:border-customBlue focus:ring-1 focus:ring-customBlue outline-none transition"
                  />
                </div>

                {/* 4. المهام والمسؤوليات */}
                <div>
                  <label className="block text-sm font-bold text-deepBlue mb-1.5">
                    المهام والمسؤوليات
                  </label>
                  <textarea
                    value={responsibilities}
                    onChange={(e) => setResponsibilities(e.target.value)}
                    required
                    rows={3}
                    placeholder="اذكر المهام والمسؤوليات الرئيسية للدور المطلوب..."
                    className="w-full p-4 rounded-xl border border-deepBlue/10 bg-[#F6F8FB] text-sm font-semibold focus:bg-white focus:border-customBlue focus:ring-1 focus:ring-customBlue outline-none transition resize-none"
                  ></textarea>
                </div>

                {/* 5. المهارات والقدرات */}
                <div>
                  <label className="block text-sm font-bold text-deepBlue mb-1.5">
                    المهارات والقدرات
                  </label>
                  <textarea
                    value={skillsAndSpecs}
                    onChange={(e) => setSkillsAndSpecs(e.target.value)}
                    required
                    rows={3}
                    placeholder="مثال: خبرة سنتين، إجادة اللغة الإنجليزية، مهارات التواصل..."
                    className="w-full p-4 rounded-xl border border-deepBlue/10 bg-[#F6F8FB] text-sm font-semibold focus:bg-white focus:border-customBlue focus:ring-1 focus:ring-customBlue outline-none transition resize-none"
                  ></textarea>
                </div>

                {/* 6. ملاحظات (اختياري) */}
                <div>
                  <label className="block text-sm font-bold text-deepBlue mb-1.5">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="أي ملاحظات إضافية..."
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
                className="px-6 py-2.5 rounded-xl font-bold bg-customBlue text-white hover:bg-[#0E5A8A] transition shadow-emc-sm disabled:opacity-50 flex items-center gap-2"
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
