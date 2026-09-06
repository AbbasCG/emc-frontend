import { useCallback, useEffect, useState } from 'react'
import { Award, Coins, Crown, Medal, RefreshCw, Send, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { fetchAdminUsersPage } from '@/api/adminUsersApi'
import {
  AWARD_CATEGORIES,
  awardPoints,
  fetchMyAwards,
  fetchMyPointsSummary,
  fetchPointsLeaderboard,
  fetchPointsPolicy,
  type PointAward,
  type PointsLevel,
  type PointsSummary,
} from '@/api/volunteerPointsApi'

/**
 * نقاط أثر EMC — تنفيذ سياسة التقدير والمكافآت والتدرج للمتطوعين v1.0:
 * ملخصي (المستوى، الرصيد، رصيد اليورو التعليمي)، سجل منحي، لوحة الصدارة،
 * سلم المستويات الست، ونموذج منح النقاط للمدراء المخوَّلين.
 */

const MANAGER_ROLES = new Set([
  'admin', 'super_admin', 'tech_admin', 'executive_admin',
  'hr_manager', 'operations_manager', 'department_manager',
])

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-deepBlue outline-none transition-colors focus:border-customBlue focus:ring-2 focus:ring-customBlue/15'

function LevelLadder({ levels, currentId }: { levels: PointsLevel[]; currentId: string }) {
  return (
    <ol className="space-y-2">
      {levels.map((level) => {
        const isCurrent = level.id === currentId
        return (
          <li
            key={level.id}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
              isCurrent ? 'border-customBlue bg-sky/40' : 'border-slate-100 bg-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {level.id === 'impact_leader' ? (
                <Crown size={16} className="text-customOrange" aria-hidden />
              ) : (
                <Medal size={16} className={isCurrent ? 'text-customBlue' : 'text-slate-300'} aria-hidden />
              )}
              <div>
                <p className={`text-sm font-black ${isCurrent ? 'text-deepBlue' : 'text-ink-600'}`}>{level.title}</p>
                <p className="text-[11px] font-bold text-slate-400">
                  {level.months > 0 ? `بعد ${level.months} شهراً · ` : 'من البداية · '}
                  {level.points.toLocaleString('en-US')} نقطة
                </p>
              </div>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
              سديم {level.sadeem}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default function ImpactPointsPage() {
  const { user } = useAuth()
  const canAward = MANAGER_ROLES.has(user?.role ?? '')

  const [summary, setSummary] = useState<PointsSummary | null>(null)
  const [awards, setAwards] = useState<PointAward[]>([])
  const [leaderboard, setLeaderboard] = useState<Array<{ user: { id: number; name: string; role: string | null }; lifetime_points: number }>>([])
  const [levels, setLevels] = useState<PointsLevel[]>([])
  const [loading, setLoading] = useState(true)

  // نموذج المنح (للمدراء)
  const [people, setPeople] = useState<Array<{ id: number; name: string }>>([])
  const [grant, setGrant] = useState({ user_id: '' as number | '', category: 'task', points: '', reason: '' })
  const [granting, setGranting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sum, myAwards, board, policy] = await Promise.all([
        fetchMyPointsSummary(),
        fetchMyAwards(),
        fetchPointsLeaderboard(),
        fetchPointsPolicy(),
      ])
      setSummary(sum)
      setAwards(myAwards)
      setLeaderboard(board)
      setLevels(policy.levels)
    } catch {
      toast.error('فشل تحميل نقاط الأثر')
    } finally {
      setLoading(false)
    }
  }, [])

  // Mount fetch — inline async IIFE per effect-patterns.md.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [sum, myAwards, board, policy] = await Promise.all([
          fetchMyPointsSummary(),
          fetchMyAwards(),
          fetchPointsLeaderboard(),
          fetchPointsPolicy(),
        ])
        if (alive) {
          setSummary(sum)
          setAwards(myAwards)
          setLeaderboard(board)
          setLevels(policy.levels)
        }
      } catch {
        if (alive) toast.error('فشل تحميل نقاط الأثر')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!canAward) return
    void fetchAdminUsersPage({ page: 1, per_page: 200 })
      .then((res) => setPeople(res.users.map((u) => ({ id: Number(u.id), name: u.name }))))
      .catch(() => setPeople([]))
  }, [canAward])

  async function submitGrant() {
    if (!grant.user_id || !grant.points || !grant.reason.trim()) {
      toast.error('العضو والنقاط والسبب حقول لازمة')
      return
    }
    setGranting(true)
    try {
      await awardPoints({
        user_id: grant.user_id,
        category: grant.category,
        points: Number(grant.points),
        reason: grant.reason.trim(),
      })
      toast.success('مُنحت النقاط ووُثِّق السبب')
      setGrant({ user_id: '', category: 'task', points: '', reason: '' })
      await load()
    } catch {
      toast.error('تعذر منح النقاط')
    } finally {
      setGranting(false)
    }
  }

  const categoryLabel = (value: string) => AWARD_CATEGORIES.find((c) => c.value === value)?.label ?? value

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customOrange">التقدير والمكافآت</p>
          <h1 className="mt-1 text-2xl font-black text-deepBlue">نقاط أثر EMC</h1>
          <p className="mt-1 text-sm text-deepBlue/50">
            كل مساهمة تُحسب، وكل أثر يُقدَّر — 1,000 نقطة = 10 يورو رصيداً تعليمياً داخلياً
          </p>
        </div>
        <button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-deepBlue hover:bg-slate-50">
          <RefreshCw size={15} /> تحديث
        </button>
      </div>

      {loading || !summary ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          {/* ملخصي */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'نقاط الأثر التراكمية', value: summary.lifetime_points.toLocaleString('en-US'), icon: TrendingUp, hint: 'لا تنقص عند الاستبدال' },
              { label: 'الرصيد المتاح', value: summary.available_points.toLocaleString('en-US'), icon: Coins, hint: `يعادل €${summary.credit_eur.toLocaleString('en-US')}` },
              { label: 'مستواي الحالي', value: summary.eligible_level.title, icon: Award, hint: `سديم ${summary.eligible_level.sadeem}` },
              {
                label: 'المستوى التالي',
                value: summary.next_level?.title ?? 'القمة',
                icon: Crown,
                hint: summary.next_level
                  ? `يلزم ${Math.max(0, summary.next_level.points - summary.lifetime_points).toLocaleString('en-US')} نقطة و${Math.max(0, summary.next_level.months - summary.active_months)} شهراً`
                  : 'أنت في أعلى السلم',
              },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{s.label}</span>
                  <s.icon size={17} className="text-customBlue" aria-hidden />
                </div>
                <p className="mt-3 text-xl font-black text-deepBlue">{s.value}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-400">{s.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* سلم المستويات */}
            <section className="rounded-2xl border border-slate-100 bg-white p-6">
              <h2 className="text-sm font-black text-deepBlue">رحلة المتطوع — المستويات الست</h2>
              <p className="mt-1 text-xs font-semibold leading-6 text-slate-400">
                المدة تعطي الأهلية، والنقاط تثبت الاستحقاق. «رائد أثر EMC» يتطلب اعتماداً نوعياً من الإدارة.
              </p>
              <div className="mt-4">
                <LevelLadder levels={levels} currentId={summary.eligible_level.id} />
              </div>
            </section>

            <div className="space-y-6">
              {/* منح النقاط — للمدراء */}
              {canAward && (
                <section className="rounded-2xl border border-slate-100 bg-white p-6">
                  <h2 className="text-sm font-black text-deepBlue">منح نقاط (للمدراء)</h2>
                  <p className="mt-1 text-xs font-semibold leading-6 text-slate-400">
                    لا مجاملة في النقاط: كل منحة تسجَّل باسم مانحها وسببها.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <select
                      value={grant.user_id}
                      onChange={(e) => setGrant((g) => ({ ...g, user_id: e.target.value ? Number(e.target.value) : '' }))}
                      className={fieldClass}
                    >
                      <option value="">اختر العضو…</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <select
                      value={grant.category}
                      onChange={(e) => setGrant((g) => ({ ...g, category: e.target.value }))}
                      className={fieldClass}
                    >
                      {AWARD_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      dir="ltr"
                      placeholder="النقاط (مثال: 150)"
                      value={grant.points}
                      onChange={(e) => setGrant((g) => ({ ...g, points: e.target.value }))}
                      className={fieldClass}
                    />
                    <input
                      placeholder="السبب — يُوثَّق في السجل"
                      value={grant.reason}
                      onChange={(e) => setGrant((g) => ({ ...g, reason: e.target.value }))}
                      className={fieldClass}
                    />
                  </div>
                  <button
                    disabled={granting}
                    onClick={() => void submitGrant()}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-customOrange px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-ember disabled:opacity-60"
                  >
                    <Send size={14} aria-hidden />
                    {granting ? 'جارٍ المنح…' : 'امنح النقاط'}
                  </button>
                </section>
              )}

              {/* لوحة الصدارة */}
              <section className="rounded-2xl border border-slate-100 bg-white p-6">
                <h2 className="text-sm font-black text-deepBlue">لوحة صدارة الأثر</h2>
                {leaderboard.length === 0 ? (
                  <p className="mt-3 text-xs font-bold text-slate-400">لا نقاط ممنوحة بعد — أول منحة تبدأ السجل</p>
                ) : (
                  <ol className="mt-3 space-y-1.5">
                    {leaderboard.slice(0, 10).map((row, i) => (
                      <li key={row.user.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="flex items-center gap-2.5 font-bold text-deepBlue">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                            {i + 1}
                          </span>
                          {row.user.name}
                        </span>
                        <span className="font-black tabular-nums text-customBlue">
                          {row.lifetime_points.toLocaleString('en-US')}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </div>

          {/* سجلي */}
          <section className="rounded-2xl border border-slate-100 bg-white p-6">
            <h2 className="text-sm font-black text-deepBlue">سجل نقاطي</h2>
            {awards.length === 0 ? (
              <p className="mt-3 text-xs font-bold text-slate-400">لا منح بعد — مساهمتك القادمة تفتح السجل</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[38rem] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 pe-4 text-start">التاريخ</th>
                      <th className="py-2.5 pe-4 text-start">الفئة</th>
                      <th className="py-2.5 pe-4 text-start">السبب</th>
                      <th className="py-2.5 pe-4 text-start">مانح النقاط</th>
                      <th className="py-2.5 text-start">النقاط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awards.map((a) => (
                      <tr key={a.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-3 pe-4 tabular-nums text-slate-500">{a.awarded_at.slice(0, 10)}</td>
                        <td className="py-3 pe-4 font-bold text-ink-600">{categoryLabel(a.category)}</td>
                        <td className="max-w-xs py-3 pe-4 text-ink-500">{a.reason}</td>
                        <td className="py-3 pe-4 text-slate-500">{a.awarder?.name ?? 'النظام'}</td>
                        <td className={`py-3 font-black tabular-nums ${a.points >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {a.points >= 0 ? `+${a.points}` : a.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
