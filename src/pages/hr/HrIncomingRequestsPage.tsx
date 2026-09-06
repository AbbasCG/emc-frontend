import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Loader2, Inbox, Check, X } from 'lucide-react'
import apiClient from '@/api/axios'
import toast from '@/lib/toast'
import type { HrRequest } from './HrMyRequestsPage'

/** Server-provided message from an API error response, if any. */
function apiMessage(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined
  const data = err.response?.data as { message?: string } | undefined
  return typeof data?.message === 'string' ? data.message : undefined
}

export default function HrIncomingRequestsPage() {
  const [requests, setRequests] = useState<HrRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  // No synchronous setState before the first await: loading starts `true`,
  // so the effect below can invoke this loader legally (all setStates land
  // after the await — see docs/04-references/effect-patterns.md P1).
  const loadRequests = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data?: HrRequest[] }>('/admin/hr-requests/incoming')
      setRequests(res.data?.data || [])
    } catch {
      toast.error('فشل في جلب الطلبات الواردة')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await loadRequests()
    })()
  }, [loadRequests])

  // Refresh after a mutation = event-handler path, so the synchronous
  // setLoading(true) here is allowed and required.
  const refreshRequests = useCallback(async () => {
    setLoading(true)
    await loadRequests()
  }, [loadRequests])

  const updateStatus = async (id: number, status: string) => {
    try {
      setUpdatingId(id)
      await apiClient.patch(`/admin/hr-requests/${id}/status`, { status })
      toast.success('تم تحديث حالة الطلب بنجاح')
      void refreshRequests()
    } catch (err) {
      toast.error(apiMessage(err) || 'فشل في تحديث حالة الطلب')
    } finally {
      setUpdatingId(null)
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-customBlue/10 flex items-center justify-center text-customBlue shrink-0">
            <Inbox size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-deepBlue">الطلبات الواردة (HR والإدارات)</h1>
            <p className="text-sm font-semibold text-deepBlue/60 mt-1">
              إدارة طلبات الاحتياج الوظيفي الواردة من مختلف الأقسام
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-deepBlue/[0.08] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-customBlue" />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-deepBlue/50 font-semibold">
            لا توجد طلبات واردة في الوقت الحالي.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[#F6F8FB] text-deepBlue border-b border-deepBlue/[0.08]">
                <tr>
                  <th className="px-5 py-4 font-black">القسم الطالب</th>
                  <th className="px-5 py-4 font-black">المسمى / نوع الطلب</th>
                  <th className="px-5 py-4 font-black">العدد</th>
                  <th className="px-5 py-4 font-black">المهارات والمواصفات</th>
                  <th className="px-5 py-4 font-black">تاريخ الطلب</th>
                  <th className="px-5 py-4 font-black">الحالة</th>
                  <th className="px-5 py-4 font-black text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-deepBlue/[0.05]">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#F6F8FB]/50 transition">
                    <td className="px-5 py-4 font-bold text-deepBlue">
                      {req.department?.name || '---'}
                      <div className="text-xs font-semibold text-deepBlue/50 mt-0.5">بواسطة: {req.creator?.name}</div>
                    </td>
                    <td className="px-5 py-4 font-bold text-deepBlue">
                      {req.request_type}
                    </td>
                    <td className="px-5 py-4 font-bold text-deepBlue font-latin text-center">
                      {req.required_count}
                    </td>
                    <td className="px-5 py-4 text-deepBlue/70 text-xs max-w-xs truncate" title={req.skills_and_specs}>
                      {req.skills_and_specs}
                      {req.notes && (
                        <div className="text-deepBlue/40 mt-1 truncate" title={req.notes}>ملاحظة: {req.notes}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 font-semibold text-deepBlue/60 font-latin text-[13px]">
                      {new Date(req.created_at).toLocaleDateString('en-CA')}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold border ${getStatusColor(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {updatingId === req.id ? (
                          <Loader2 size={18} className="animate-spin text-customBlue" />
                        ) : req.status === 'pending' || req.status === 'in_progress' ? (
                          <>
                            <button
                              onClick={() => updateStatus(req.id, 'approved')}
                              title="قبول واعتماد"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => updateStatus(req.id, 'rejected')}
                              title="رفض"
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-deepBlue/30 font-semibold">مكتمل</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
