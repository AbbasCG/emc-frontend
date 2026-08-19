import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Search, FileText, CheckCircle, Clock, XCircle, AlertCircle, Eye } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import api from '@/lib/api'
import toast from '@/lib/toast'

interface ExpertApplication {
  id: number
  uuid: string
  status: string
  full_name: string
  email: string
  whatsapp_number: string
  country: string
  city: string
  primary_specialty: string
  created_at: string
}

export default function AdminExpertApplicationsPage() {
  const [applications, setApplications] = useState<ExpertApplication[]>([])
  const [loading, setLoading] = useState(true)

  const fetchApplications = async () => {
    try {
      const response = await api.get('/admin/expert-applications')
      setApplications(response.data.data)
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب طلبات الخبراء')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-600"><Clock size={12} /> جديد</span>
      case 'under_review': return <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-600"><AlertCircle size={12} /> قيد المراجعة</span>
      case 'approved': return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600"><CheckCircle size={12} /> مقبول</span>
      case 'rejected': return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600"><XCircle size={12} /> مرفوض</span>
      default: return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{status}</span>
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/dashboard/admin/ai" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:bg-slate-50">
          <ArrowRight size={18} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-deepBlue">طلبات انضمام المدربين والخبراء</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">إدارة طلبات الانضمام لمجتمع المدربين والخبراء في المنصة.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:flex sm:items-center sm:justify-between">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="ابحث بالاسم أو البريد..." className="h-10 w-full rounded-xl bg-slate-50 pr-10 text-sm font-medium text-deepBlue outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-customBlue" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">مقدم الطلب</th>
                <th className="px-6 py-4">التخصص الأساسي</th>
                <th className="px-6 py-4">الدولة والمدينة</th>
                <th className="px-6 py-4">تاريخ التقديم</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-customBlue border-t-transparent" /></div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">لا توجد طلبات انضمام حالياً.</td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-deepBlue">{app.full_name}</div>
                      <div className="text-xs text-slate-500">{app.email}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{app.primary_specialty}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">{app.country}</div>
                      <div className="text-xs text-slate-500">{app.city}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-500" dir="ltr">{new Date(app.created_at).toLocaleDateString('en-US')}</td>
                    <td className="px-6 py-4">{getStatusBadge(app.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-customBlue shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50">
                        <Eye size={14} /> عرض
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
