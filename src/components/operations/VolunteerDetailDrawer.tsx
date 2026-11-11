import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  History,
  Info,
  Loader2,
  MinusCircle,
  PlusCircle,
  Shield,
  Star,
  User,
  X,
} from 'lucide-react'
import {
  fetchVolunteerPointsLedger,
  fetchVolunteerStatusLogs,
  fetchVolunteerWeeklyRatings,
  type PointsLedgerResponse,
  type VolunteerHubItem,
  type VolunteerStatusLogItem,
  type WeeklyRatingsResponse,
} from '@/api/volunteersHubApi'
import { EVALUATION_CRITERIA } from '@/data/evaluationCriteria'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  volunteer: VolunteerHubItem | null
  onClose: () => void
  onOpenStatusModal: () => void
}

type TabKey = 'personal' | 'points' | 'activity' | 'evaluations'

export default function VolunteerDetailDrawer({ volunteer, onClose, onOpenStatusModal }: Props) {
  const { user } = useAuth()
  const isHrOrAdmin = ['super_admin', 'executive_admin', 'hr_manager', 'admin'].includes(
    user?.role ?? '',
  )

  const [activeTab, setActiveTab] = useState<TabKey>('personal')
  const [pointsData, setPointsData] = useState<PointsLedgerResponse | null>(null)
  const [statusLogs, setStatusLogs] = useState<VolunteerStatusLogItem[]>([])
  const [weeklyRatings, setWeeklyRatings] = useState<WeeklyRatingsResponse | null>(null)

  const [loadingPoints, setLoadingPoints] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [loadingRatings, setLoadingRatings] = useState(false)
  const [expandedRatingId, setExpandedRatingId] = useState<number | null>(null)

  useEffect(() => {
    if (!volunteer) return

    if (activeTab === 'points' && !pointsData) {
      setLoadingPoints(true)
      fetchVolunteerPointsLedger(volunteer.id)
        .then(setPointsData)
        .finally(() => setLoadingPoints(false))
    }

    if (activeTab === 'activity' && statusLogs.length === 0) {
      setLoadingLogs(true)
      fetchVolunteerStatusLogs(volunteer.id)
        .then(setStatusLogs)
        .finally(() => setLoadingLogs(false))
    }

    if (activeTab === 'evaluations' && !weeklyRatings) {
      setLoadingRatings(true)
      fetchVolunteerWeeklyRatings(volunteer.id)
        .then(setWeeklyRatings)
        .finally(() => setLoadingRatings(false))
    }
  }, [volunteer, activeTab, pointsData, statusLogs.length, weeklyRatings])

  if (!volunteer) return null

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'active':
        return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 border border-emerald-200">نشط</span>
      case 'inactive':
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-700 border border-slate-200">منقطع</span>
      case 'on_leave':
        return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-black text-amber-800 border border-amber-200">في إجازة</span>
      case 'withdrawn':
        return <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-black text-rose-700 border border-rose-200">انسحب</span>
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-600">{st}</span>
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="fixed inset-y-0 end-0 flex max-w-full ps-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="border-b border-slate-100 bg-[#0C2A4B] p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-white font-black text-lg border border-white/20">
                  {volunteer.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white">{volunteer.name}</h2>
                    {volunteer.is_leader && (
                      <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-black text-amber-300 border border-amber-400/30">
                        قائد
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/70 mt-0.5">
                    {volunteer.department_name} · {volunteer.email ?? 'لا يوجد بريد'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick status bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-white/60">الحالة التشغيلية:</span>
                {getStatusBadge(volunteer.status)}
              </div>
              {isHrOrAdmin && (
                <button
                  type="button"
                  onClick={onOpenStatusModal}
                  className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition border border-white/20"
                >
                  تعديل الحالة الآن
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-6">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition ${
                activeTab === 'personal'
                  ? 'border-[#0077B6] text-[#0C2A4B]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="h-4 w-4" />
              البيانات الشخصية
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('points')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition ${
                activeTab === 'points'
                  ? 'border-[#0077B6] text-[#0C2A4B]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Award className="h-4 w-4" />
              نقاط الأثر ({volunteer.balance})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition ${
                activeTab === 'activity'
                  ? 'border-[#0077B6] text-[#0C2A4B]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="h-4 w-4" />
              سجل النشاط
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('evaluations')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition ${
                activeTab === 'evaluations'
                  ? 'border-[#0077B6] text-[#0C2A4B]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Star className="h-4 w-4" />
              التقييمات الأسبوعية
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ── 1. البيانات الشخصية ────────────────────────────────────────── */}
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <h4 className="text-sm font-black text-[#0C2A4B]">بطاقة المتطوع</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold">الاسم الرباعي</span>
                      <p className="mt-1 font-bold text-slate-800">{volunteer.name}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">الإدارة الحالية</span>
                      <p className="mt-1 font-bold text-slate-800">{volunteer.department_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">البريد الإلكتروني</span>
                      <p className="mt-1 font-bold text-slate-800">{volunteer.email ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">الساعات التراكمية المعتمدة</span>
                      <p className="mt-1 font-bold text-emerald-700">{volunteer.hours_logged} ساعة</p>
                    </div>
                  </div>
                </div>

                {/* Single Source of Truth link to Volunteer Profiles */}
                <div className="rounded-3xl border border-customBlue/20 bg-customBlue/5 p-5 text-xs leading-relaxed text-[#0C2A4B] space-y-3">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <Info className="h-4 w-4 text-customBlue" />
                    المصدر الوحيد لتعديل البيانات الشخصية
                  </div>
                  <p className="text-slate-600">
                    حرصاً على سلامة البيانات وعدم تكرارها، تُعدَّل البيانات الشخصية والملف الذاتي
                    للمتطوع من شاشة <strong>«المتطوعون»</strong> المخصصة لذلك فقط، وتقتصر صلاحية التعديل
                    على إدارة الموارد البشرية.
                  </p>
                  <div className="pt-2">
                    <Link
                      to="/dashboard/volunteer/hr-profile"
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#0077B6] px-4 py-2 text-xs font-black text-white shadow-md transition hover:bg-[#005f92]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      الانتقال إلى صفحة بيانات المتطوع الشخصية
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ── 2. نقاط الأثر (Ledger) ─────────────────────────────────────── */}
            {activeTab === 'points' && (
              <div className="space-y-6">
                {/* Points Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-right">
                    <span className="text-[11px] font-bold text-emerald-700">النقاط الفعلية (المكتسبة)</span>
                    <p className="mt-1 text-2xl font-black text-emerald-800">
                      {pointsData?.actual_points ?? volunteer.actual_points}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-right">
                    <span className="text-[11px] font-bold text-rose-700">النقاط المستخدمة</span>
                    <p className="mt-1 text-2xl font-black text-rose-800">
                      {pointsData?.used_points ?? volunteer.used_points}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-customBlue/20 bg-customBlue/5 p-4 text-right">
                    <span className="text-[11px] font-bold text-customBlue">الرصيد المتاح</span>
                    <p className="mt-1 text-2xl font-black text-[#0C2A4B]">
                      {pointsData?.balance ?? volunteer.balance}
                    </p>
                  </div>
                </div>

                {/* Ledger Table */}
                <div>
                  <h4 className="text-xs font-black text-slate-700 mb-3">
                    سجل حركات دفتر الأستاذ (Ledger):
                  </h4>
                  {loadingPoints ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-customBlue mb-2" />
                      جارٍ تحميل حركات النقاط...
                    </div>
                  ) : (pointsData?.ledger.length ?? 0) === 0 ? (
                    <div className="rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                      لا توجد حركات نقاط مسجلة لهذا المتطوع حتى الآن.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-[11px] font-black text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="p-3">التاريخ</th>
                            <th className="p-3">السبب / المصدر</th>
                            <th className="p-3">النقاط</th>
                            <th className="p-3">بواسطة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pointsData?.ledger.map((item) => {
                            const isPositive = item.points >= 0
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/60 transition">
                                <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                  {item.date ? item.date.slice(0, 10) : '—'}
                                </td>
                                <td className="p-3">
                                  <p className="font-bold text-slate-800">{item.reason}</p>
                                  <span className="text-[10px] text-slate-400">{item.source}</span>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1 font-black ${
                                      isPositive ? 'text-emerald-700' : 'text-rose-600'
                                    }`}
                                  >
                                    {isPositive ? <PlusCircle className="h-3 w-3" /> : <MinusCircle className="h-3 w-3" />}
                                    {Math.abs(item.points)}
                                  </span>
                                </td>
                                <td className="p-3 whitespace-nowrap text-slate-600">{item.creator}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── 3. سجل النشاط (Timeline) ───────────────────────────────────── */}
            {activeTab === 'activity' && (
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-700">
                  سجل تغييرات الحالة والقرارات الإدارية:
                </h4>
                {loadingLogs ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-customBlue mb-2" />
                    جارٍ تحميل سجل النشاط...
                  </div>
                ) : statusLogs.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                    لا توجد تغييرات حالة مسجلة حتى الآن. الحالة الحالية هي الحالة الأولية.
                  </div>
                ) : (
                  <div className="relative border-s-2 border-slate-200 ms-3 space-y-6">
                    {statusLogs.map((log) => (
                      <div key={log.id} className="relative ps-6">
                        <span className="absolute -start-1.5 top-1.5 h-3 w-3 rounded-full bg-customBlue ring-4 ring-white" />
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {log.old_status && getStatusBadge(log.old_status)}
                              <span className="text-slate-400">←</span>
                              {getStatusBadge(log.new_status)}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">
                              {log.date_formatted}
                            </span>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-700 border border-slate-100">
                            <span className="font-black text-slate-900 block mb-1">السبب المسجل:</span>
                            {log.reason}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Shield className="h-3 w-3 text-customBlue" />
                            <span>نُفِّذ بواسطة: <strong>{log.changed_by_name}</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── 4. التقييمات الأسبوعية بالمعايير العشرة ───────────────────── */}
            {activeTab === 'evaluations' && (
              <div className="space-y-6">
                {loadingRatings ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-customBlue mb-2" />
                    جارٍ قراءة التقييمات الأسبوعية من النظام...
                  </div>
                ) : (weeklyRatings?.ratings.length ?? 0) === 0 ? (
                  <div className="rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                    لم يُسجل أي تقييم أسبوعي لهذا المتطوع حتى الآن.
                  </div>
                ) : (
                  <>
                    {/* Monthly Averages Strip */}
                    <div>
                      <h4 className="text-xs font-black text-slate-700 mb-2.5">
                        متوسط التقييم لكل شهر:
                      </h4>
                      <div className="flex flex-wrap gap-2.5">
                        {weeklyRatings?.monthly_averages.map((m) => (
                          <div
                            key={m.month_key}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm text-right"
                          >
                            <span className="text-[11px] font-bold text-slate-500">{m.month_label}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-lg font-black text-[#0C2A4B]">{m.avg_score}</span>
                              <span className="text-[10px] text-slate-400">/ 10</span>
                              <span className="text-[10px] text-slate-400 me-1 font-semibold">({m.count} أسابيع)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Overall Criteria Averages Table (المعايير العشرة) */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-[#0C2A4B]">
                          متوسط درجات المتطوع في المعايير العشرة التراكمية:
                        </h4>
                        <div className="flex items-center gap-1 font-black text-sm text-emerald-700">
                          <Star className="h-4 w-4 fill-emerald-600 text-emerald-600" />
                          المتوسط العام: {weeklyRatings?.overall_avg} / 10
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {EVALUATION_CRITERIA.map((crit) => {
                          const val = weeklyRatings?.criteria_averages[crit.key]
                          return (
                            <div
                              key={crit.key}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100"
                            >
                              <span className="font-semibold text-slate-700">{crit.label}</span>
                              <span className="font-black text-[#0C2A4B]">
                                {val != null ? `${val} / 10` : '—'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Weekly Reports List */}
                    <div>
                      <h4 className="text-xs font-black text-slate-700 mb-2.5">
                        سجل أسابيع التقييم (اضغط على أي أسبوع لعرض المعايير العشرة):
                      </h4>
                      <div className="space-y-2">
                        {weeklyRatings?.ratings.map((r) => {
                          const isExpanded = expandedRatingId === r.id
                          return (
                            <div
                              key={r.id}
                              className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedRatingId(isExpanded ? null : r.id)
                                }
                                className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 text-right transition"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-customBlue/10 text-customBlue font-bold text-xs">
                                    <Calendar className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-xs">
                                      أسبوع {r.date ?? 'تقرير الإدارة'}
                                    </p>
                                    <span className="text-[10px] text-slate-400">
                                      {r.department_name}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
                                    {r.avg_score} / 10
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                  )}
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {EVALUATION_CRITERIA.map((crit) => {
                                      const scoreVal = r.scores[crit.key]
                                      return (
                                        <div
                                          key={crit.key}
                                          className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80"
                                        >
                                          <span className="text-slate-600 font-semibold">
                                            {crit.label}
                                          </span>
                                          <span className="font-black text-slate-800">
                                            {scoreVal != null ? `${scoreVal} / 10` : '—'}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                  {r.note && (
                                    <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                                      <strong>ملاحظة المقيم:</strong> {r.note}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

