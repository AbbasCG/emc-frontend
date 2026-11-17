import { useEffect, useId, useState } from 'react'
import {
  AlertTriangle,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  Star,
  User,
  X,
} from 'lucide-react'
import {
  fetchVolunteerActivity,
  fetchVolunteerPointsLedger,
  fetchVolunteerProfile,
  fetchVolunteerWeeklyRatings,
  isForbiddenError,
  type VolunteerHubItem,
  type VolunteerProfile,
} from '@/api/volunteersHubApi'
import VolunteerActivityTimeline, { VolunteerStatusBadge } from './VolunteerActivityTimeline'
import VolunteerPersonalTab, { VolunteerPersonalTabLimited } from './VolunteerPersonalTab'
import { useRetryableLoad } from '@/hooks/useRetryableLoad'
import { hasNestedLayer } from '@/components/ui/modalGuard'
import { EVALUATION_CRITERIA } from '@/data/evaluationCriteria'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  volunteer: VolunteerHubItem | null
  onClose: () => void
  onOpenStatusModal: () => void
}

type TabKey = 'personal' | 'points' | 'activity' | 'evaluations'

type ProfileOutcome = { forbidden: boolean; profile: VolunteerProfile | null }

/** A failed request, said out loud, with the way to repeat it. Never leave a tab looking merely empty. */
function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center" role="alert">
      <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-rose-500" aria-hidden="true" />
      <p className="text-xs font-black text-rose-800">تعذّر تحميل {what}.</p>
      <p className="mt-1 text-[11px] font-semibold text-rose-700">هذا خلل في الاتصال أو في الخادم، وليس معناه أنه لا توجد بيانات.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        إعادة المحاولة
      </button>
    </div>
  )
}

export default function VolunteerDetailDrawer({ volunteer, onClose, onOpenStatusModal }: Props) {
  const { user } = useAuth()
  const isHrOrAdmin = ['super_admin', 'executive_admin', 'hr_manager', 'admin'].includes(
    user?.role ?? '',
  )
  const titleId = useId()

  const [activeTab, setActiveTab] = useState<TabKey>('personal')
  // A tab's data is requested the first time the tab is opened, then kept for the life of the drawer.
  const [opened, setOpened] = useState<ReadonlySet<TabKey>>(() => new Set<TabKey>(['personal']))
  const [expandedRatingId, setExpandedRatingId] = useState<number | null>(null)

  const volunteerId = volunteer?.id ?? 0
  const points = useRetryableLoad(() => fetchVolunteerPointsLedger(volunteerId), `points:${volunteerId}`, volunteer != null && opened.has('points'))
  // A 403 is an answer («you may not read this»), not a failure: it becomes `forbidden` instead of the retry state.
  const profile = useRetryableLoad<ProfileOutcome>(
    async () => {
      try {
        return { forbidden: false, profile: await fetchVolunteerProfile(volunteerId) }
      } catch (err) {
        if (isForbiddenError(err)) return { forbidden: true, profile: null }
        throw err
      }
    },
    `profile:${volunteerId}`,
    volunteer != null && opened.has('personal'),
  )
  const activity = useRetryableLoad(() => fetchVolunteerActivity(volunteerId), `activity:${volunteerId}`, volunteer != null && opened.has('activity'))
  const ratings = useRetryableLoad(() => fetchVolunteerWeeklyRatings(volunteerId), `ratings:${volunteerId}`, volunteer != null && opened.has('evaluations'))

  const pointsData = points.data
  const activityItems = activity.data ?? []
  const weeklyRatings = ratings.data

  function openTab(tab: TabKey) {
    setActiveTab(tab)
    setOpened((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)))
  }

  // Escape closes the drawer (it is a modal dialog).
  useEffect(() => {
    if (!volunteer) return
    const onKey = (e: KeyboardEvent) => {
      // Something above the drawer (the status modal, a dialog) owns Escape while it is open.
      if (e.key !== 'Escape' || e.defaultPrevented || hasNestedLayer()) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [volunteer, onClose])

  if (!volunteer) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="fixed inset-y-0 end-0 flex max-w-full ps-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="border-b border-slate-100 bg-navy p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-white font-black text-lg border border-white/20">
                  {volunteer.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id={titleId} className="text-xl font-black text-white"><bdi>{volunteer.name}</bdi></h2>
                    {volunteer.is_leader && (
                      <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-black text-amber-300 border border-amber-400/30">
                        قائد
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/70 mt-0.5">
                    {volunteer.department_name?.trim() || 'غير محدد'} · {volunteer.email ?? 'لا يوجد بريد'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick status bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-white/60">الحالة التشغيلية:</span>
                <VolunteerStatusBadge status={volunteer.status} />
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
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-6" role="tablist" aria-label="أقسام ملف المتطوع">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'personal'}
              onClick={() => openTab('personal')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition ${
                activeTab === 'personal'
                  ? 'border-customBlue text-navy'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="h-4 w-4" />
              البيانات الشخصية
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'points'}
              onClick={() => openTab('points')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition ${
                activeTab === 'points'
                  ? 'border-customBlue text-navy'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Award className="h-4 w-4" />
              نقاط الأثر ({volunteer.balance})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'activity'}
              onClick={() => openTab('activity')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition ${
                activeTab === 'activity'
                  ? 'border-customBlue text-navy'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="h-4 w-4" />
              سجل النشاط
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'evaluations'}
              onClick={() => openTab('evaluations')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition ${
                activeTab === 'evaluations'
                  ? 'border-customBlue text-navy'
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
              <div className="space-y-4">
                {profile.loading ? (
                  <div className="py-8 text-center text-xs text-slate-400" role="status">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-customBlue" />
                    جارٍ تحميل بيانات المتطوع...
                  </div>
                ) : profile.data?.forbidden ? (
                  <VolunteerPersonalTabLimited volunteer={volunteer} />
                ) : profile.error || !profile.data?.profile ? (
                  <LoadError what="بيانات المتطوع" onRetry={profile.retry} />
                ) : (
                  <VolunteerPersonalTab volunteer={volunteer} profile={profile.data.profile} />
                )}
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
                    <p className="mt-1 text-2xl font-black text-navy">
                      {pointsData?.balance ?? volunteer.balance}
                    </p>
                  </div>
                </div>

                {/* Ledger Table */}
                <div>
                  <h4 className="text-xs font-black text-slate-700 mb-3">
                    سجل حركات دفتر الأستاذ (Ledger):
                  </h4>
                  {points.loading ? (
                    <div className="py-8 text-center text-xs text-slate-400" role="status">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-customBlue mb-2" />
                      جارٍ تحميل حركات النقاط...
                    </div>
                  ) : points.error ? (
                    <LoadError what="سجل حركات النقاط" onRetry={points.retry} />
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
                  كل ما جرى لهذا المتطوع، من الأحدث إلى الأقدم:
                </h4>
                {activity.loading ? (
                  <div className="py-8 text-center text-xs text-slate-400" role="status">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-customBlue" />
                    جارٍ تحميل سجل النشاط...
                  </div>
                ) : activity.error ? (
                  <LoadError what="سجل النشاط" onRetry={activity.retry} />
                ) : activityItems.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                    لا توجد أحداث مسجلة لهذا المتطوع حتى الآن.
                  </div>
                ) : (
                  <VolunteerActivityTimeline items={activityItems} />
                )}
              </div>
            )}

            {/* ── 4. التقييمات الأسبوعية بالمعايير العشرة ───────────────────── */}
            {activeTab === 'evaluations' && (
              <div className="space-y-6">
                {ratings.loading ? (
                  <div className="py-8 text-center text-xs text-slate-400" role="status">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-customBlue mb-2" />
                    جارٍ قراءة التقييمات الأسبوعية من النظام...
                  </div>
                ) : ratings.error ? (
                  <LoadError what="التقييمات الأسبوعية" onRetry={ratings.retry} />
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
                              <span className="text-lg font-black text-navy">{m.avg_score}</span>
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
                        <h4 className="text-xs font-black text-navy">
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
                              <span className="font-black text-navy">
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

