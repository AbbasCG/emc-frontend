import { useCallback, useEffect, useRef, useState } from 'react'
import { Award, CalendarClock, Coins, Crown, RefreshCw, Sparkles, TrendingUp, Trophy, Users } from 'lucide-react'
import toast from '@/lib/toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchMyAwards,
  fetchMyPointsSummary,
  fetchPointsLeaderboard,
  fetchPointsPolicy,
  type PointAward,
  type PointsCapabilities,
  type PointsLevel,
  type PointsMember,
  type PointsSummary,
} from '@/api/volunteerPointsApi'
import PointsKpiCards, { type KpiItem } from '@/components/operations/impactPoints/PointsKpiCards'
import PeopleWithPoints from '@/components/operations/impactPoints/PeopleWithPoints'
import PointsHistoryDrawer from '@/components/operations/impactPoints/PointsHistoryDrawer'
import AdjustPointsModal from '@/components/operations/impactPoints/AdjustPointsModal'
import QuickAwardForm from '@/components/operations/impactPoints/QuickAwardForm'
import LevelLadder from '@/components/operations/impactPoints/LevelLadder'
import { usePeopleWithPoints } from '@/components/operations/impactPoints/usePeopleWithPoints'
import { formatNumber } from '@/components/operations/impactPoints/impactPointsUi'
import {
  LeaderboardCard,
  ManagementNote,
  MyHistoryTable,
  MySummaryCard,
  RecentActivityCard,
} from '@/components/operations/impactPoints/SidePanels'

/**
 * نقاط الأثر — تنفيذ سياسة التقدير والمكافآت والتدرج للمتطوعين v1.0.
 *
 * Two experiences from one page, decided ONLY by the server's capabilities:
 *  - every member: their own score, level, history and the level ladder;
 *  - authorized staff (HR, admins, department leaders in scope): the people
 *    who received points, per-person history, awards and adjustments.
 *
 * Opening the page grants none of the management actions. The browser never
 * decides authority from a role name: it renders the capabilities the summary
 * endpoint returns, and every endpoint re-checks them.
 */

const NO_CAPABILITIES: PointsCapabilities = {
  can_view_all: false, can_award: false, can_adjust: false, can_view_history: false, can_manage: false, scope: 'none',
}

type Leaderboard = Array<{ user: { id: number; name: string; role: string | null } | null; lifetime_points: number }>

type PageData = { summary: PointsSummary; awards: PointAward[]; board: Leaderboard; levels: PointsLevel[] }

async function fetchPageData(): Promise<PageData> {
  const [summary, awards, board, policy] = await Promise.all([
    fetchMyPointsSummary(),
    fetchMyAwards(),
    fetchPointsLeaderboard(),
    fetchPointsPolicy(),
  ])
  return { summary, awards, board, levels: policy.levels }
}

export default function ImpactPointsPage() {
  const { user } = useAuth()

  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  // A failed load ends in an explicit error state with a retry — never an
  // endless skeleton.
  const [loadFailed, setLoadFailed] = useState(false)

  const [historyFor, setHistoryFor] = useState<{ id: number; name: string } | null>(null)
  const [adjusting, setAdjusting] = useState<PointsMember | null>(null)
  const [awardTarget, setAwardTarget] = useState<number | null>(null)
  const awardRef = useRef<HTMLDivElement>(null)

  const summary = data?.summary ?? null
  // Capabilities come from the server. `can_award` alone (an older server) still
  // enables the award form but nothing else.
  const caps: PointsCapabilities = summary?.capabilities ?? { ...NO_CAPABILITIES, can_award: summary?.can_award === true }
  const people = usePeopleWithPoints(caps.can_view_all)

  // Mount fetch — inline async IIFE.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const next = await fetchPageData()
        if (alive) setData(next)
      } catch {
        if (alive) {
          setLoadFailed(true)
          toast.error('فشل تحميل نقاط الأثر')
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  /** Reload everything (the refresh button, the retry button and after a change). */
  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      setData(await fetchPageData())
    } catch {
      setLoadFailed(true)
      toast.error('فشل تحميل نقاط الأثر')
    } finally {
      setLoading(false)
    }
    people.reload()
    // people.reload is stable (useCallback with no dependencies).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onPointsChanged() {
    void refresh()
  }

  function startAward(member: PointsMember) {
    setAwardTarget(member.user_id)
  }

  const monthlyCap = summary?.monthly_cap ?? 2500
  const managerPage = people.state.page

  const kpis: KpiItem[] = !summary
    ? []
    : caps.can_view_all
      ? [
          ...(managerPage
            ? [
                { label: 'إجمالي نقاط الأثر', value: formatNumber(managerPage.kpis.total_points), hint: 'مجموع نقاط المستفيدين في نطاقك', icon: TrendingUp },
                { label: 'عدد المستفيدين', value: formatNumber(managerPage.kpis.members_with_points), hint: `من أصل ${formatNumber(managerPage.kpis.scope_members)} عضواً في النطاق`, icon: Users, tone: 'navy' as const },
              ]
            : []),
          { label: 'نقاطي الحالية', value: formatNumber(summary.lifetime_points), hint: `المتاح ${formatNumber(summary.available_points)} · ${summary.eligible_level.title}`, icon: Sparkles },
          ...(managerPage
            ? [
                {
                  label: 'أعلى مساهم هذا الشهر',
                  value: managerPage.kpis.top_contributor_month?.name ?? '—',
                  hint: managerPage.kpis.top_contributor_month
                    ? `${formatNumber(managerPage.kpis.top_contributor_month.points)} نقطة${managerPage.kpis.top_contributor_month.department ? ` · ${managerPage.kpis.top_contributor_month.department}` : ''}`
                    : 'لا منح هذا الشهر بعد',
                  icon: Trophy,
                  tone: 'accent' as const,
                },
                { label: 'النقاط الممنوحة هذا الشهر', value: formatNumber(managerPage.kpis.month_points_total), hint: 'المنح الموجبة فقط', icon: CalendarClock, tone: 'accent' as const },
              ]
            : []),
        ]
      : [
          { label: 'نقاط الأثر التراكمية', value: formatNumber(summary.lifetime_points), hint: 'لا تنقص عند الاستبدال', icon: TrendingUp },
          { label: 'الرصيد المتاح', value: formatNumber(summary.available_points), hint: `يعادل €${formatNumber(summary.credit_eur)}`, icon: Coins, tone: 'accent' },
          { label: 'مستواي الحالي', value: summary.eligible_level.title, hint: `سديم ${summary.eligible_level.sadeem}`, icon: Award, tone: 'navy' },
          {
            label: 'المستوى التالي',
            value: summary.next_level?.title ?? 'القمة',
            hint: summary.next_level
              ? `يلزم ${formatNumber(Math.max(0, summary.next_level.points - summary.lifetime_points))} نقطة و${Math.max(0, summary.next_level.months - summary.active_months)} شهراً`
              : 'أنت في أعلى السلم',
            icon: Crown,
          },
        ]

  return (
    <div dir="rtl" className="min-h-full space-y-6 bg-slate-50/60 p-1">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black tracking-[0.2em] text-accent-700">التقدير والمكافآت</p>
          <h1 className="mt-1 text-2xl font-black text-navy">نقاط الأثر</h1>
          <p className="mt-1 text-sm font-semibold text-muted-500">
            كل مساهمة تُحسب، وكل أثر يُقدَّر — 1,000 نقطة = 10 يورو رصيداً تعليمياً داخلياً
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {caps.can_award && (
            <button
              type="button"
              onClick={() => {
                setAwardTarget(null)
                awardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-accent-600"
            >
              <Award size={15} aria-hidden="true" /> منح نقاط
            </button>
          )}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-navy shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> تحديث
          </button>
        </div>
      </header>

      {loading && !data ? (
        <div aria-busy="true" aria-label="جارٍ التحميل" className="space-y-6">
          <div className="grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      ) : loadFailed || !data || !summary ? (
        <div role="alert" className="rounded-3xl border border-rose-100 bg-rose-50 p-8 text-center">
          <p className="text-sm font-black text-rose-700">تعذر تحميل نقاط الأثر</p>
          <p className="mt-1 text-xs font-semibold text-rose-600/80">تحقق من الاتصال ثم أعد المحاولة.</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-navy ring-1 ring-rose-200 hover:bg-rose-100/50"
          >
            <RefreshCw size={14} aria-hidden="true" /> إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          <PointsKpiCards items={kpis} />

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            {/* Main column */}
            <div className="min-w-0 space-y-6">
              {caps.can_view_all ? (
                <PeopleWithPoints
                  state={people.state}
                  query={people.query}
                  hasFilters={people.hasFilters}
                  capabilities={caps}
                  onChange={people.update}
                  onReset={people.reset}
                  onRetry={people.reload}
                  onHistory={(m) => setHistoryFor({ id: m.user_id, name: m.name })}
                  onAdjust={setAdjusting}
                  onAward={startAward}
                />
              ) : (
                <>
                  <ManagementNote />
                  <MyHistoryTable awards={data.awards} />
                </>
              )}
            </div>

            {/* Side column */}
            <aside aria-label="ملخص وأدوات" className="min-w-0 space-y-6">
              <MySummaryCard summary={summary} name={user?.name} userId={user?.id} />

              {caps.can_award && (
                <div ref={awardRef} id="quick-award" className="scroll-mt-4">
                  <QuickAwardForm
                    monthlyCap={monthlyCap}
                    scope={caps.scope}
                    preselectUserId={awardTarget}
                    onAwarded={onPointsChanged}
                  />
                </div>
              )}

              <section aria-labelledby="ladder-heading" className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <h2 id="ladder-heading" className="text-sm font-black text-navy">رحلة المتطوع — المستويات الست</h2>
                <p className="mt-1 text-xs font-semibold leading-6 text-muted-500">
                  المدة تعطي الأهلية، والنقاط تثبت الاستحقاق. «رائد أثر EMC» يتطلب اعتماداً نوعياً من الإدارة.
                </p>
                <div className="mt-4">
                  <LevelLadder levels={data.levels} currentId={summary.eligible_level.id} lifetimePoints={summary.lifetime_points} />
                </div>
              </section>

              <LeaderboardCard rows={data.board} />

              {caps.can_view_all && <RecentActivityCard awards={data.awards} />}
            </aside>
          </div>
        </>
      )}

      {historyFor && (
        <PointsHistoryDrawer userId={historyFor.id} name={historyFor.name} onClose={() => setHistoryFor(null)} />
      )}

      {adjusting && (
        <AdjustPointsModal
          member={adjusting}
          onClose={() => setAdjusting(null)}
          onDone={() => {
            setAdjusting(null)
            onPointsChanged()
          }}
        />
      )}
    </div>
  )
}
