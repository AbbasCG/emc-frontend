import { useCallback, useEffect, useState } from 'react'
import {
  ArrowUpDown,
  Coins,
  Eye,
  HeartHandshake,
  Loader2,
  MoreVertical,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  fetchVolunteersHub,
  type VolunteerHubItem,
  type VolunteerHubSummary,
  type VolunteerStatus,
  type VolunteersHubQuery,
} from '@/api/volunteersHubApi'
import VolunteerStatusModal from '@/components/operations/VolunteerStatusModal'
import VolunteerDetailDrawer from '@/components/operations/VolunteerDetailDrawer'
import { useAuth } from '@/contexts/AuthContext'

export default function HrVolunteersPage() {
  const { user } = useAuth()
  const isHrOrAdmin = ['super_admin', 'executive_admin', 'hr_manager', 'admin'].includes(
    user?.role ?? '',
  )

  const [volunteers, setVolunteers] = useState<VolunteerHubItem[]>([])
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([])
  const [summary, setSummary] = useState<VolunteerHubSummary>({
    total_volunteers: 0,
    total_actual_points: 0,
    total_used_points: 0,
    total_balance: 0,
    status_counts: { active: 0, inactive: 0, on_leave: 0, withdrawn: 0 },
  })

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'points' | 'name' | 'balance' | 'last_rating'>('points')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')

  // Modals state
  const [statusModalVolunteer, setStatusModalVolunteer] = useState<VolunteerHubItem | null>(null)
  const [detailVolunteer, setDetailVolunteer] = useState<VolunteerHubItem | null>(null)
  const [actionMenuOpenId, setActionMenuOpenId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params: VolunteersHubQuery = {
        search: search.trim() || undefined,
        department_id: departmentId || undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        sort: sortBy,
        direction,
      }
      const data = await fetchVolunteersHub(params)
      setVolunteers(data.volunteers)
      setSummary(data.summary)
      if (data.departments.length > 0) {
        setDepartments(data.departments)
      }
    } catch {
      // Handled silently or empty state
    } finally {
      setLoading(false)
    }
  }, [search, departmentId, selectedStatus, sortBy, direction])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleSort = (field: 'points' | 'name' | 'balance' | 'last_rating') => {
    if (sortBy === field) {
      setDirection((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortBy(field)
      setDirection('desc')
    }
  }

  const getStatusBadge = (st: VolunteerStatus) => {
    switch (st) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            نشط
          </span>
        )
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-700 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            منقطع
          </span>
        )
      case 'on_leave':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-black text-amber-800 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            في إجازة
          </span>
        )
      case 'withdrawn':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-black text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            انسحب
          </span>
        )
      default:
        return (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-600">
            {st}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* ── Page Hero Header ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-[#0C2A4B] to-[#173a62] p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-[#0077B6]/20 blur-[80px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#0077B6]">
              <HeartHandshake className="h-4 w-4" />
              <span>مركز إدارة المتطوعين الموحد · Volunteer Command Center</span>
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">إدارة ومتابعة المتطوعين</h1>
            <p className="mt-1 max-w-xl text-xs font-semibold leading-relaxed text-white/70">
              جدول شامل يجمع حالات المتطوعين، نقاط الأثر التراكمية، دفاتر الأستاذ، وسجل التقييمات الأسبوعية بالمعايير العشرة.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-black text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث البيانات
            </button>
          </div>
        </div>
      </div>

      {/* ── Top KPI Bar & Member Status Card ────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Volunteers */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm text-right">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">عدد المتطوعين</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-customBlue/10 text-customBlue">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-[#0C2A4B]">{summary.total_volunteers}</p>
          <span className="text-[11px] text-slate-400 font-semibold">حسب نتائج الفلتر الحالية</span>
        </div>

        {/* Actual Earned Points */}
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm text-right">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">إجمالي النقاط الفعلية</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-800">{summary.total_actual_points.toLocaleString()}</p>
          <span className="text-[11px] text-emerald-600 font-semibold">مجموع النقاط المكتسبة</span>
        </div>

        {/* Used Points */}
        <div className="rounded-3xl border border-rose-200 bg-rose-50/40 p-5 shadow-sm text-right">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">النقاط المستخدمة</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-100 text-rose-700">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-rose-800">{summary.total_used_points.toLocaleString()}</p>
          <span className="text-[11px] text-rose-600 font-semibold">استبدال وصرف المكافآت</span>
        </div>

        {/* Available Balance */}
        <div className="rounded-3xl border border-customBlue/20 bg-customBlue/5 p-5 shadow-sm text-right">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0C2A4B]">الرصيد المتاح</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0077B6]/15 text-[#0077B6]">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-[#0C2A4B]">{summary.total_balance.toLocaleString()}</p>
          <span className="text-[11px] text-slate-500 font-semibold">الرصيد الصافي القابل للاستخدام</span>
        </div>

        {/* Member Status Card (Click to filter) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm text-right sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-700">حالات الأعضاء</span>
            <span className="text-[10px] text-slate-400 font-semibold">اضغط للفلترة</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'active' ? 'all' : 'active')}
              className={`p-2 rounded-xl border text-right transition flex items-center justify-between ${
                selectedStatus === 'active'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/30'
                  : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span className="font-bold">نشط</span>
              <span className="font-black text-emerald-700">{summary.status_counts.active}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'inactive' ? 'all' : 'inactive')}
              className={`p-2 rounded-xl border text-right transition flex items-center justify-between ${
                selectedStatus === 'inactive'
                  ? 'border-slate-500 bg-slate-200 text-slate-900 ring-2 ring-slate-400/30'
                  : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span className="font-bold">منقطع</span>
              <span className="font-black text-slate-800">{summary.status_counts.inactive}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'on_leave' ? 'all' : 'on_leave')}
              className={`p-2 rounded-xl border text-right transition flex items-center justify-between ${
                selectedStatus === 'on_leave'
                  ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/30'
                  : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span className="font-bold">إجازة</span>
              <span className="font-black text-amber-800">{summary.status_counts.on_leave}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'withdrawn' ? 'all' : 'withdrawn')}
              className={`p-2 rounded-xl border text-right transition flex items-center justify-between ${
                selectedStatus === 'withdrawn'
                  ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/30'
                  : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span className="font-bold">انسحب</span>
              <span className="font-black text-rose-700">{summary.status_counts.withdrawn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[280px]">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم المتطوع أو بريده..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pe-10 ps-3 text-xs text-slate-800 outline-none transition focus:border-customBlue focus:bg-white focus:ring-2 focus:ring-customBlue/20"
            />
          </div>

          {/* Department Filter */}
          <div className="min-w-[160px]">
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-customBlue focus:bg-white"
            >
              <option value="">جميع الإدارات</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div className="min-w-[140px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-customBlue focus:bg-white"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">منقطع</option>
              <option value="on_leave">في إجازة</option>
              <option value="withdrawn">انسحب</option>
            </select>
          </div>
        </div>

        {/* Sorting buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400">ترتيب:</span>
          <button
            type="button"
            onClick={() => toggleSort('points')}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
              sortBy === 'points'
                ? 'border-[#0077B6] bg-[#0077B6]/10 text-[#0077B6]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>النقاط</span>
            {sortBy === 'points' && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={() => toggleSort('balance')}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
              sortBy === 'balance'
                ? 'border-[#0077B6] bg-[#0077B6]/10 text-[#0077B6]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>الرصيد</span>
            {sortBy === 'balance' && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={() => toggleSort('last_rating')}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
              sortBy === 'last_rating'
                ? 'border-[#0077B6] bg-[#0077B6]/10 text-[#0077B6]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>التقييم</span>
            {sortBy === 'last_rating' && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={() => toggleSort('name')}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
              sortBy === 'name'
                ? 'border-[#0077B6] bg-[#0077B6]/10 text-[#0077B6]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>الاسم</span>
            {sortBy === 'name' && <ArrowUpDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* ── Main Volunteers Table ───────────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-customBlue mb-3" />
            جارٍ تحميل بيانات المتطوعين وحساب الأرصدة...
          </div>
        ) : volunteers.length === 0 ? (
          <div className="py-20 text-center text-slate-500 space-y-3">
            <Users className="mx-auto h-12 w-12 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">لا يوجد متطوعون يطابقون خيارات البحث والفلترة</p>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setDepartmentId('')
                setSelectedStatus('all')
              }}
              className="text-xs font-black text-customBlue hover:underline"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-black text-slate-500">
                <tr>
                  <th className="p-4">الاسم والدور</th>
                  <th className="p-4">الإدارة</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">النقاط الفعلية</th>
                  <th className="p-4">المستخدمة</th>
                  <th className="p-4">الرصيد المتاح</th>
                  <th className="p-4">آخر تقييم أسبوعي</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {volunteers.map((vol) => (
                  <tr
                    key={vol.id}
                    onClick={() => setDetailVolunteer(vol)}
                    className="cursor-pointer hover:bg-slate-50/70 transition group"
                  >
                    {/* Name + Leader Badge */}
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[#0C2A4B]/10 text-[#0C2A4B] font-black text-sm">
                          {vol.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900 group-hover:text-customBlue transition">
                              {vol.name}
                            </span>
                            {vol.is_leader && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 border border-amber-300">
                                قائد
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block">{vol.email ?? '—'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="p-4 whitespace-nowrap text-slate-700">
                      <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                        {vol.department_name}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4 whitespace-nowrap">
                      {getStatusBadge(vol.status)}
                    </td>

                    {/* Actual Points */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-black text-emerald-700 text-sm">
                        {vol.actual_points.toLocaleString()}
                      </span>
                    </td>

                    {/* Used Points */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-black text-rose-600 text-sm">
                        {vol.used_points.toLocaleString()}
                      </span>
                    </td>

                    {/* Available Balance */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-black text-[#0C2A4B] text-sm bg-customBlue/10 px-2.5 py-1 rounded-xl">
                        {vol.balance.toLocaleString()}
                      </span>
                    </td>

                    {/* Last Rating */}
                    <td className="p-4 whitespace-nowrap">
                      {vol.last_weekly_rating != null ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800 border border-emerald-200">
                          <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                          {vol.last_weekly_rating} / 10
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">لا يوجد تقييم</span>
                      )}
                    </td>

                    {/* Actions ⋮ */}
                    <td
                      className="p-4 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative inline-block text-start">
                        <button
                          type="button"
                          onClick={() =>
                            setActionMenuOpenId(actionMenuOpenId === vol.id ? null : vol.id)
                          }
                          className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {actionMenuOpenId === vol.id && (
                          <div className="absolute end-0 mt-1 w-44 z-30 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl text-right">
                            {isHrOrAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuOpenId(null)
                                  setStatusModalVolunteer(vol)
                                }}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                              >
                                <ShieldAlert className="h-4 w-4 text-amber-600" />
                                <span>تعديل الحالة</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuOpenId(null)
                                setDetailVolunteer(vol)
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                            >
                              <Eye className="h-4 w-4 text-customBlue" />
                              <span>عرض الملف والتفاصيل</span>
                            </button>
                          </div>
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

      {/* ── Modals & Drawers ────────────────────────────────────────────── */}
      {statusModalVolunteer && (
        <VolunteerStatusModal
          volunteer={statusModalVolunteer}
          onClose={() => setStatusModalVolunteer(null)}
          onSuccess={() => {
            loadData()
            if (detailVolunteer && detailVolunteer.id === statusModalVolunteer.id) {
              setDetailVolunteer(null)
            }
          }}
        />
      )}

      {detailVolunteer && (
        <VolunteerDetailDrawer
          volunteer={detailVolunteer}
          onClose={() => setDetailVolunteer(null)}
          onOpenStatusModal={() => setStatusModalVolunteer(detailVolunteer)}
        />
      )}
    </div>
  )
}
