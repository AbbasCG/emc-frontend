import { useCallback, useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  GraduationCap,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  TRAINER_STATUS_LABELS,
  fetchTrainerApplications,
  type TrainerApplicationListItem,
  type TrainerApplicationStatus,
} from '@/api/trainerApplicationsAdminApi'
import TrainerApplicationDetailModal, {
  TrainerStatusBadge,
} from '@/components/trainer/TrainerApplicationDetailModal'

const STATUS_TABS: Array<{ value: TrainerApplicationStatus | ''; label: string }> = [
  { value: '', label: 'الكل' },
  { value: 'new', label: TRAINER_STATUS_LABELS.new },
  { value: 'under_review', label: TRAINER_STATUS_LABELS.under_review },
  { value: 'approved', label: TRAINER_STATUS_LABELS.approved },
  { value: 'rejected', label: TRAINER_STATUS_LABELS.rejected },
]

export default function AdminTrainerApplicationsPage() {
  const [rows, setRows] = useState<TrainerApplicationListItem[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<TrainerApplicationStatus | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeModalId, setActiveModalId] = useState<number | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchTrainerApplications({ page, search, status })
      setRows(res.data)
      setLastPage(res.last_page)
      setTotal(res.total)
    } catch {
      toast.error('حدث خطأ أثناء جلب طلبات انضمام المدربين')
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when the filter or page changes; the loading flag must reset before the request
    load()
  }, [load])

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-customBlue/10 text-customBlue">
              <GraduationCap size={18} />
            </span>
            <h1 className="text-xl font-black text-deepBlue">طلبات انضمام المدربين</h1>
          </div>
          <p className="text-xs text-slate-500">
            مراجعة وتقييم طلبات المدربين المتخصصين في الذكاء الاصطناعي والتكنولوجيا
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100/80 p-1.5">
          {STATUS_TABS.map(tab => {
            const active = status === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setStatus(tab.value)
                  setPage(1)
                }}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  active
                    ? 'bg-white text-deepBlue shadow-sm'
                    : 'text-slate-600 hover:text-deepBlue'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px] flex-1 sm:max-w-xs">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="بحث بالاسم، الإيميل، الهاتف، التخصص..."
            className="w-full h-11 rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-xs font-semibold text-deepBlue outline-none focus:border-customBlue"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-3xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm font-bold text-slate-500">
            جاري تحميل طلبات المدربين...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto mb-3 text-slate-300" size={40} />
            <h3 className="text-sm font-bold text-slate-700 mb-1">لا توجد طلبات مدربين</h3>
            <p className="text-xs text-slate-400">لم يتم العثور على أي طلبات تطابق المعايير المحددة.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold">
                <tr>
                  <th className="py-4 px-6">المدرب</th>
                  <th className="py-4 px-4">التخصص والخبرة</th>
                  <th className="py-4 px-4">نمط التدريب</th>
                  <th className="py-4 px-4">سعر الساعة</th>
                  <th className="py-4 px-4">الحالة</th>
                  <th className="py-4 px-4">تاريخ التقديم</th>
                  <th className="py-4 px-6 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6">
                      <div className="font-black text-deepBlue text-sm">{row.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{row.email}</div>
                      <div className="text-[11px] text-slate-500 dir-ltr inline-block mt-0.5">
                        {row.phone_or_whatsapp}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-800 block">{row.primary_specialty}</span>
                      <span className="text-[11px] text-slate-500">{row.years_of_experience}</span>
                    </td>

                    <td className="py-4 px-4 font-semibold text-slate-700">
                      {row.delivery_mode}
                    </td>

                    <td className="py-4 px-4">
                      {row.hourly_rate ? (
                        <span className="font-black text-emerald-700">
                          {row.hourly_rate} {row.currency === 'OTHER' ? row.currency_other : row.currency}
                        </span>
                      ) : (
                        <span className="text-slate-400">غير محدد</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <TrainerStatusBadge status={row.status} />
                    </td>

                    <td className="py-4 px-4 text-slate-500 text-[11px]">
                      {new Date(row.created_at).toLocaleDateString('ar-EG')}
                    </td>

                    <td className="py-4 px-6 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveModalId(row.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-customBlue/10 px-3 py-1.5 text-xs font-bold text-customBlue hover:bg-customBlue/20 transition"
                      >
                        <Eye size={14} />
                        معاينة التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold">
              إجمالي النتائج: {total} (صفحة {page} من {lastPage})
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                disabled={page >= lastPage}
                onClick={() => setPage(p => Math.min(p + 1, lastPage))}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {activeModalId !== null && (
        <TrainerApplicationDetailModal
          id={activeModalId}
          onClose={() => setActiveModalId(null)}
          onStatusChanged={load}
        />
      )}
    </div>
  )
}
