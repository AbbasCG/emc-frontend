import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  User,
  X,
  XCircle,
} from 'lucide-react'
import toast from '@/lib/toast'
import { HrPageShell } from '@/components/hr/HrLayout'
import {
  approvePointsRequest,
  fetchPointsActivities,
  fetchPointsRequestDetail,
  fetchPointsRequests,
  rejectPointsRequest,
  returnPointsRequestForRevision,
  type PointCategoryGroup,
  type PointRequestDetailResponse,
  type PointRequestItem,
} from '@/api/volunteerPointsApi'
import { formatDate, formatDateTime, formatNumber, serverMessage } from '@/components/operations/impactPoints/impactPointsUi'

const STATUS_BADGES: Record<PointRequestItem['status'], { label: string; bg: string; text: string }> = {
  pending:  { label: 'بانتظار الاعتماد', bg: 'bg-amber-100', text: 'text-amber-800' },
  approved: { label: 'معتمد',           bg: 'bg-emerald-100', text: 'text-emerald-800' },
  rejected: { label: 'مرفوض',          bg: 'bg-rose-100',    text: 'text-rose-800' },
  revision: { label: 'قيد التعديل',    bg: 'bg-blue-100',    text: 'text-blue-800' },
}

export default function HrVolunteerPointsApprovalPage() {
  const [requests, setRequests] = useState<PointRequestItem[]>([])
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [categories, setCategories] = useState<PointCategoryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [canApprove, setCanApprove] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('pending') // default to pending
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [deptFilter, setDeptFilter] = useState<string>('')

  // Detailed Modal
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null)
  const [requestDetail, setRequestDetail] = useState<PointRequestDetailResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Action states in modal
  const [actionTab, setActionTab] = useState<'view' | 'approve' | 'reject' | 'revision'>('view')
  const [approvedPoints, setApprovedPoints] = useState<number>(0)
  const [reviewNotes, setReviewNotes] = useState<string>('')
  const [rejectionReason, setRejectionReason] = useState<string>('')
  const [actionSubmitting, setActionSubmitting] = useState(false)

  // Load data
  async function loadData() {
    try {
      setLoading(true)
      const [reqsPage, actsData] = await Promise.all([
        fetchPointsRequests({
          status: statusFilter || undefined,
          category_key: categoryFilter || undefined,
          search: search || undefined,
        }),
        fetchPointsActivities(),
      ])

      setRequests(reqsPage.rows)
      setStats(reqsPage.stats)
      setCanApprove(reqsPage.capabilities.can_approve)
      setCategories(actsData.categories)
    } catch (err) {
      toast.error('تعذر تحميل طلبات النقاط')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter, categoryFilter])

  // Open detail modal
  async function openDetail(id: number) {
    setSelectedRequestId(id)
    setActionTab('view')
    setReviewNotes('')
    setRejectionReason('')
    try {
      setDetailLoading(true)
      const detail = await fetchPointsRequestDetail(id)
      setRequestDetail(detail)
      setApprovedPoints(detail.data.points_requested)
    } catch (err) {
      toast.error('تعذر تحميل تفاصيل الطلب')
      setSelectedRequestId(null)
    } finally {
      setDetailLoading(false)
    }
  }

  // Handle Approve
  async function handleApprove() {
    if (!selectedRequestId || !requestDetail) return
    try {
      setActionSubmitting(true)
      const res = await approvePointsRequest(selectedRequestId, {
        approved_points: approvedPoints,
        review_notes: reviewNotes.trim() || undefined,
      })
      toast.success(res.message || 'تم اعتماد الطلب وإضافة النقاط للمتطوع')
      setSelectedRequestId(null)
      loadData()
    } catch (err) {
      toast.error(serverMessage(err, 'تعذر اعتماد الطلب'))
    } finally {
      setActionSubmitting(false)
    }
  }

  // Handle Reject
  async function handleReject() {
    if (!selectedRequestId) return
    if (!rejectionReason.trim() || rejectionReason.trim().length < 4) {
      toast.error('يرجى كتابة سبب الرفض بوضوح (4 أحرف على الأقل)')
      return
    }
    try {
      setActionSubmitting(true)
      const res = await rejectPointsRequest(selectedRequestId, rejectionReason.trim())
      toast.success(res.message || 'تم رفض الطلب وتسجيل السبب')
      setSelectedRequestId(null)
      loadData()
    } catch (err) {
      toast.error(serverMessage(err, 'تعذر رفض الطلب'))
    } finally {
      setActionSubmitting(false)
    }
  }

  // Handle Revision
  async function handleRevision() {
    if (!selectedRequestId) return
    if (!reviewNotes.trim() || reviewNotes.trim().length < 4) {
      toast.error('يرجى توضيح ملاحظات التعديل المطلوبة')
      return
    }
    try {
      setActionSubmitting(true)
      const res = await returnPointsRequestForRevision(selectedRequestId, reviewNotes.trim())
      toast.success(res.message || 'تمت إعادة الطلب للمعدّ')
      setSelectedRequestId(null)
      loadData()
    } catch (err) {
      toast.error(serverMessage(err, 'تعذر إعادة الطلب'))
    } finally {
      setActionSubmitting(false)
    }
  }

  // Unique departments for filter
  const departments = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of requests) {
      if (r.department?.id && r.department.name) {
        map.set(r.department.id, r.department.name)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [requests])

  // Filtered requests by local department or search
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (deptFilter && String(r.department_id) !== deptFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const userMatch = r.user?.name?.toLowerCase().includes(q)
        const reqMatch = r.requester?.name?.toLowerCase().includes(q)
        const actMatch = r.activity_name?.toLowerCase().includes(q)
        const reasonMatch = r.reason?.toLowerCase().includes(q)
        if (!userMatch && !reqMatch && !actMatch && !reasonMatch) return false
      }
      return true
    })
  }, [requests, deptFilter, search])

  return (
    <HrPageShell
      title="اعتماد نقاط المتطوعين"
      description="مراجعة واعتماد طلبات منح نقاط الأثر الواردة من مديري الإدارات وفق سياسة EMC."
    >
      {/* ── ملخص العدادات الإحصائية ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">بانتظار الاعتماد</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900">{formatNumber(stats.pending)}</p>
          <p className="mt-0.5 text-[11px] text-amber-700">طلبات جديدة معلقة</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">الطلبات المعتمدة</span>
            <CheckCircle size={16} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900">{formatNumber(stats.approved)}</p>
          <p className="mt-0.5 text-[11px] text-emerald-700">أضيفت لرصيد المتطوعين</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">الطلبات المرفوضة</span>
            <XCircle size={16} className="text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-900">{formatNumber(stats.rejected)}</p>
          <p className="mt-0.5 text-[11px] text-rose-700">موثقة بأسباب الرفض</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">إجمالي الطلبات</span>
            <Sparkles size={16} className="text-accent-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-navy">{formatNumber(requests.length)}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">في النطاق المعروض</p>
        </div>
      </div>

      {/* ── شريط الفلاتر والبحث ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* البحث */}
          <div className="relative min-w-[240px] flex-1">
            <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم المتطوع، مقدم الطلب، أو النشاط..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pe-3 ps-9 text-xs font-bold text-navy outline-none focus:border-accent-500 focus:bg-white"
            />
          </div>

          {/* زر التحديث */}
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-navy hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>

        {/* فلاتر القوائم المنسدلة */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* فلتر الحالة */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`rounded-lg px-2.5 py-1 transition ${
                statusFilter === 'pending' ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-navy'
              }`}
            >
              المعلقة ({stats.pending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              className={`rounded-lg px-2.5 py-1 transition ${
                statusFilter === 'approved' ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-navy'
              }`}
            >
              المعتمدة
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('rejected')}
              className={`rounded-lg px-2.5 py-1 transition ${
                statusFilter === 'rejected' ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-navy'
              }`}
            >
              المرفوضة
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('')}
              className={`rounded-lg px-2.5 py-1 transition ${
                statusFilter === '' ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-navy'
              }`}
            >
              الكل
            </button>
          </div>

          {/* فلتر الإدارة */}
          {departments.length > 0 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-navy outline-none focus:border-accent-500"
            >
              <option value="">جميع الإدارات</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {/* فلتر التصنيف */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-navy outline-none focus:border-accent-500"
          >
            <option value="">جميع التصنيفات</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name_ar}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── جدول الطلبات ──────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">
            <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-accent-500" />
            جارٍ تحميل طلبات النقاط...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">
            <CheckCircle size={32} className="mx-auto mb-2 text-slate-300" />
            لا توجد طلبات تطابق الفلاتر المحددة حالياً.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">المتطوع والإدارة</th>
                  <th className="px-4 py-3.5">مقدم الطلب</th>
                  <th className="px-4 py-3.5">التصنيف والنشاط</th>
                  <th className="px-4 py-3.5">النقاط المطلوبة</th>
                  <th className="px-4 py-3.5">تاريخ التقديم</th>
                  <th className="px-4 py-3.5">الحالة</th>
                  <th className="px-4 py-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((r) => {
                  const badge = STATUS_BADGES[r.status] ?? STATUS_BADGES.pending
                  return (
                    <tr key={r.id} className="transition hover:bg-slate-50/50">
                      {/* المتطوع */}
                      <td className="px-4 py-3.5">
                        <p className="font-black text-navy">{r.user?.name ?? `عضو #${r.user_id}`}</p>
                        <p className="text-[10.5px] font-semibold text-slate-400">
                          {r.department?.name ?? 'إدارة غير محددة'}
                        </p>
                      </td>

                      {/* مقدم الطلب */}
                      <td className="px-4 py-3.5 font-bold text-slate-700">
                        {r.requester?.name ?? `مستخدم #${r.requester_id}`}
                      </td>

                      {/* النشاط */}
                      <td className="px-4 py-3.5">
                        <p className="font-black text-navy">{r.activity_name}</p>
                        <p className="text-[10.5px] font-semibold text-slate-400 truncate max-w-xs">{r.reason}</p>
                      </td>

                      {/* النقاط */}
                      <td className="px-4 py-3.5 tabular-nums">
                        <span className="font-black text-accent-700">{formatNumber(r.points_requested)}</span>
                        {r.points_approved && r.points_approved !== r.points_requested && (
                          <span className="ms-1 text-[10px] text-emerald-600 font-bold">
                            (اعتمد {formatNumber(r.points_approved)})
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-semibold ms-0.5">نقطة</span>
                      </td>

                      {/* التاريخ */}
                      <td className="px-4 py-3.5 text-slate-500 tabular-nums">
                        {formatDate(r.created_at)}
                      </td>

                      {/* الحالة */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10.5px] font-black ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* الإجراء */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => void openDetail(r.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-navy transition hover:bg-accent-500 hover:text-white"
                        >
                          <Eye size={13} />
                          <span>{r.status === 'pending' ? 'مراجعة واعتماد' : 'تفاصيل الطلب'}</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── نافذة المراجعة والاعتماد المنبثقة التفصيلية (Modal) ──────────────── */}
      {selectedRequestId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div
            dir="rtl"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-black text-navy">تفاصيل طلب منح النقاط</h3>
                <p className="text-xs font-semibold text-slate-400">
                  طلب رقم #{selectedRequestId} · مقدم للاعتماد من الموارد البشرية
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequestId(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {detailLoading || !requestDetail ? (
                <div className="py-12 text-center text-xs font-bold text-slate-400">
                  <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-accent-500" />
                  جارٍ تحميل بيانات الطلب...
                </div>
              ) : (
                <>
                  {/* بطاقة ملخص المتطوع وسقفه ورصيده */}
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200/50 pb-2">
                      <div className="flex items-center gap-2 font-black text-sky-950">
                        <User size={16} className="text-sky-600" />
                        <span className="text-sm">{requestDetail.data.user?.name}</span>
                        {requestDetail.data.department && (
                          <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-sky-800 border border-sky-200">
                            {requestDetail.data.department.name}
                          </span>
                        )}
                      </div>
                      <span className="rounded-full bg-accent-500 px-2.5 py-0.5 text-[10.5px] font-black text-white">
                        {requestDetail.volunteer_summary.level.title}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-1 text-[11.5px] font-bold text-sky-900">
                      <div>
                        <span className="text-slate-500 font-medium">الرصيد التراكمي: </span>
                        <span className="font-black">{formatNumber(requestDetail.volunteer_summary.lifetime_points)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">نقاط هذا الشهر: </span>
                        <span className="font-black">{formatNumber(requestDetail.volunteer_summary.month_points)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">المتبقي من السقف: </span>
                        <span className="font-black text-accent-700">{formatNumber(requestDetail.volunteer_summary.monthly_cap_left)} نقطة</span>
                      </div>
                    </div>
                  </div>

                  {/* معلومات الطلب الأساسية */}
                  <div className="rounded-2xl border border-slate-200 p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <span className="font-bold text-slate-500">النشاط المستحق: </span>
                        <span className="font-black text-navy">{requestDetail.data.activity_name}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500">النقاط المطلوبة: </span>
                        <span className="font-black text-accent-600">{formatNumber(requestDetail.data.points_requested)} نقطة</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500">مقدم الطلب: </span>
                        <span className="font-black text-slate-800">{requestDetail.data.requester?.name}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-500">تاريخ التقديم: </span>
                        <span className="text-slate-700 tabular-nums">{formatDateTime(requestDetail.data.created_at)}</span>
                      </div>
                    </div>

                    {/* السبب والتوثيق */}
                    <div className="border-t border-slate-100 pt-2">
                      <p className="font-bold text-slate-500 mb-1">سبب المنح والتوثيق:</p>
                      <p className="rounded-xl bg-slate-50 p-3 font-semibold text-slate-800 leading-relaxed border border-slate-100">
                        {requestDetail.data.reason}
                      </p>
                    </div>

                    {/* المرفق الداعم إن وجد */}
                    {requestDetail.data.attachment_path && (
                      <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Paperclip size={15} className="text-accent-500" />
                          <span className="font-bold text-slate-700">المرفق الداعم: </span>
                          <span className="font-semibold text-slate-600">{requestDetail.data.attachment_name ?? 'ملف مرفق'}</span>
                        </div>
                        {requestDetail.attachment_url && (
                          <a
                            href={requestDetail.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-accent-50 px-2.5 py-1 text-xs font-black text-accent-700 hover:bg-accent-100"
                          >
                            <ExternalLink size={12} />
                            فتح / تحميل
                          </a>
                        )}
                      </div>
                    )}

                    {/* حالة الطلب إن كان معتمداً أو مرفوضاً */}
                    {requestDetail.data.status === 'approved' && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 font-bold space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-black">
                          <CheckCircle size={15} />
                          <span>تم اعتماد هذا الطلب بنجاح</span>
                        </div>
                        <p>النقاط المعتمدة: {formatNumber(requestDetail.data.points_approved ?? requestDetail.data.points_requested)} نقطة</p>
                        {requestDetail.data.reviewer && <p>المعتمد: {requestDetail.data.reviewer.name}</p>}
                        {requestDetail.data.review_notes && <p>ملاحظات الاعتماد: {requestDetail.data.review_notes}</p>}
                      </div>
                    )}

                    {requestDetail.data.status === 'rejected' && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 font-bold space-y-1">
                        <div className="flex items-center gap-1.5 text-rose-800 font-black">
                          <XCircle size={15} />
                          <span>تم رفض هذا الطلب</span>
                        </div>
                        <p>سبب الرفض: {requestDetail.data.rejection_reason}</p>
                        {requestDetail.data.reviewer && <p>المراجع: {requestDetail.data.reviewer.name}</p>}
                      </div>
                    )}
                  </div>

                  {/* واجهة اتخاذ الإجراء (للطلبات المعلقة فقط) */}
                  {requestDetail.data.status === 'pending' && canApprove && (
                    <div className="rounded-2xl border-2 border-accent-200 bg-slate-50/50 p-4 space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <button
                          type="button"
                          onClick={() => setActionTab('approve')}
                          className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                            actionTab === 'approve'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          اعتماد الطلب
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionTab('reject')}
                          className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                            actionTab === 'reject'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          رفض الطلب
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionTab('revision')}
                          className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                            actionTab === 'revision'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          إعادة للتعديل
                        </button>
                      </div>

                      {/* شاشة الاعتماد */}
                      {actionTab === 'approve' && (
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">
                              النقاط المعتمدة (يمكن تعديلها ضمن النطاق):
                            </label>
                            <input
                              type="number"
                              dir="ltr"
                              value={approvedPoints}
                              onChange={(e) => setApprovedPoints(Number(e.target.value))}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-navy outline-none focus:border-emerald-500"
                            />
                            {approvedPoints !== requestDetail.data.points_requested && (
                              <p className="mt-1 text-[11px] font-bold text-amber-700">
                                تنبيه: سيتم اعتماد {approvedPoints} نقطة بدلاً من {requestDetail.data.points_requested} نقطة المطلوبة.
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">
                              ملاحظات الاعتماد (اختياري):
                            </label>
                            <textarea
                              rows={2}
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              placeholder="أدخل أي ملاحظات مرافقة للاعتماد..."
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-navy outline-none focus:border-emerald-500 resize-none"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={actionSubmitting || approvedPoints <= 0}
                            onClick={() => void handleApprove()}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <CheckCircle size={15} />
                            {actionSubmitting ? 'جارٍ الاعتماد...' : `تأكيد اعتماد ${approvedPoints} نقطة وإضافتها للرصيد`}
                          </button>
                        </div>
                      )}

                      {/* شاشة الرفض */}
                      {actionTab === 'reject' && (
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block font-bold text-rose-700 mb-1">
                              سبب الرفض (إلزامي):
                            </label>
                            <textarea
                              rows={3}
                              required
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="يرجى كتابة سبب عدم اعتماد الطلب لتوضيحه لمقدم الطلب..."
                              className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-navy outline-none focus:border-rose-500 resize-none"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={actionSubmitting || !rejectionReason.trim()}
                            onClick={() => void handleReject()}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            <XCircle size={15} />
                            {actionSubmitting ? 'جارٍ الرفض...' : 'تأكيد رفض الطلب'}
                          </button>
                        </div>
                      )}

                      {/* شاشة الإعادة للتعديل */}
                      {actionTab === 'revision' && (
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block font-bold text-blue-700 mb-1">
                              الملاحظات والتعديلات المطلوبة (إلزامي):
                            </label>
                            <textarea
                              rows={3}
                              required
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              placeholder="وضّح لمقدم الطلب ما المطلوب تعديله أو إرفاقه..."
                              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-navy outline-none focus:border-blue-500 resize-none"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={actionSubmitting || !reviewNotes.trim()}
                            onClick={() => void handleRevision()}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <RotateCcw size={15} />
                            {actionSubmitting ? 'جارٍ الإعادة...' : 'إعادة الطلب للمعدّ'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-end">
              <button
                type="button"
                onClick={() => setSelectedRequestId(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </HrPageShell>
  )
}
