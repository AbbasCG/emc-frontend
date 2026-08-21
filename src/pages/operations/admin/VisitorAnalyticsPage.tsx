import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Eye, Globe2, MonitorSmartphone, RefreshCw, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  fetchAnalyticsErrors,
  fetchAnalyticsOverview,
  fetchAnalyticsTop,
  type AnalyticsDailyRow,
  type AnalyticsErrorRow,
  type AnalyticsTop,
  type AnalyticsTotals,
  type RankRow,
} from '@/api/visitorAnalyticsApi'

/**
 * «تحليلات الزوار» — من زارنا، من أين، ماذا فعل، وما الأخطاء التي واجهته.
 * البيانات ذاتية بالكامل (analytics_events) وخلف موافقة الكوكيز، بلا أي
 * خدمة خارجية. المناطق الزمنية هي تقريب «من وين» بلا GeoIP.
 */

const RANGES = [
  { days: 7, label: '7 أيام' },
  { days: 14, label: '14 يوماً' },
  { days: 30, label: '30 يوماً' },
  { days: 90, label: '90 يوماً' },
]

/** أعمدة CSS بسيطة — بلا مكتبة رسوم، تعمل على كل جهاز. */
function DailyBars({ daily }: { daily: AnalyticsDailyRow[] }) {
  const max = Math.max(1, ...daily.map((d) => d.pageviews))
  return (
    <div dir="ltr" className="flex h-36 items-end gap-1">
      {daily.map((d) => (
        <div key={d.day} className="group relative flex-1">
          <div
            className="mx-auto w-full max-w-[26px] rounded-t-md bg-customBlue/80 transition group-hover:bg-customBlue"
            style={{ height: `${Math.max(3, (d.pageviews / max) * 100)}%` }}
          />
          {d.errors > 0 && <div className="mx-auto mt-0.5 h-1 w-full max-w-[26px] rounded bg-red-400" />}
          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-deepBlue px-2 py-1 text-[10px] font-bold text-white group-hover:block">
            {d.day} · {d.pageviews} مشاهدة · {d.visitors} زائر{d.errors > 0 ? ` · ${d.errors} خطأ` : ''}
          </div>
        </div>
      ))}
    </div>
  )
}

function RankList({ title, rows, icon: Icon, ltr }: { title: string; rows: RankRow[]; icon: typeof Eye; ltr?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.total))
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
        <Icon size={15} className="text-customBlue" aria-hidden />
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs font-bold text-slate-400">لا بيانات بعد</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.value}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span dir={ltr ? 'ltr' : undefined} className="min-w-0 truncate font-bold text-ink-600">{r.value}</span>
                <span className="shrink-0 font-black tabular-nums text-slate-500">
                  {r.total.toLocaleString('en-US')}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-sky" style={{ width: `${(r.total / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function VisitorAnalyticsPage() {
  const [days, setDays] = useState(14)
  const [totals, setTotals] = useState<AnalyticsTotals | null>(null)
  const [daily, setDaily] = useState<AnalyticsDailyRow[]>([])
  const [top, setTop] = useState<AnalyticsTop | null>(null)
  const [errors, setErrors] = useState<AnalyticsErrorRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (range: number) => {
    setLoading(true)
    try {
      const [overview, topRes, errRes] = await Promise.all([
        fetchAnalyticsOverview(range),
        fetchAnalyticsTop(range),
        fetchAnalyticsErrors(),
      ])
      setTotals(overview.totals)
      setDaily(overview.daily)
      setTop(topRes)
      setErrors(errRes)
    } catch {
      toast.error('فشل تحميل تحليلات الزوار')
    } finally {
      setLoading(false)
    }
  }, [])

  // Mount fetch — inline async IIFE per effect-patterns.md.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [overview, topRes, errRes] = await Promise.all([
          fetchAnalyticsOverview(14),
          fetchAnalyticsTop(14),
          fetchAnalyticsErrors(),
        ])
        if (alive) {
          setTotals(overview.totals)
          setDaily(overview.daily)
          setTop(topRes)
          setErrors(errRes)
        }
      } catch {
        if (alive) toast.error('فشل تحميل تحليلات الزوار')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const kpis = useMemo(
    () => [
      { label: 'زوار فريدون', value: totals?.visitors ?? 0, icon: Users, hint: 'حسب معرف الزائر بعد الموافقة' },
      { label: 'مشاهدات الصفحات', value: totals?.pageviews ?? 0, icon: Eye, hint: 'تنقلات فعلية داخل الموقع' },
      { label: 'أحداث القمع', value: totals?.events ?? 0, icon: Activity, hint: 'تسجيل، شراء، تقديم طلبات…' },
      { label: 'أخطاء واجهت الزوار', value: totals?.errors ?? 0, icon: AlertTriangle, hint: 'وقود الإصلاح المستمر' },
    ],
    [totals],
  )

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customOrange">اعرف عملاءك</p>
          <h1 className="mt-1 text-2xl font-black text-deepBlue">تحليلات الزوار</h1>
          <p className="mt-1 text-sm text-deepBlue/50">
            من زارنا، من أين، ماذا فعل، وما الأخطاء التي واجهته — ذاتي بالكامل وخلف موافقة الكوكيز
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => {
                  setDays(r.days)
                  void load(r.days)
                }}
                aria-pressed={days === r.days}
                className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                  days === r.days ? 'bg-deepBlue text-white' : 'text-slate-500 hover:text-deepBlue'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => void load(days)}
            aria-label="تحديث"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-deepBlue hover:bg-slate-50"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          {/* المؤشرات */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-2xl border border-slate-100 bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{k.label}</span>
                  <k.icon size={17} className={k.label.includes('أخطاء') && k.value > 0 ? 'text-red-500' : 'text-customBlue'} aria-hidden />
                </div>
                <p className="mt-3 text-3xl font-black tabular-nums text-deepBlue">{k.value.toLocaleString('en-US')}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-400">{k.hint}</p>
              </div>
            ))}
          </div>

          {/* الرسم اليومي */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5">
            <h2 className="text-sm font-black text-deepBlue">المشاهدات يومياً</h2>
            <p className="mt-0.5 text-[11px] font-bold text-slate-400">الشريط الأحمر أسفل اليوم = وقعت أخطاء فيه</p>
            <div className="mt-4">
              {daily.length === 0 ? (
                <p className="py-8 text-center text-xs font-bold text-slate-400">
                  لا بيانات بعد — تظهر فور موافقة أول زائر على التحليلات وتصفحه
                </p>
              ) : (
                <DailyBars daily={daily} />
              )}
            </div>
          </section>

          {/* القوائم العلوية */}
          {top && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <RankList title="أكثر الصفحات زيارة" rows={top.pages} icon={Eye} ltr />
              <RankList title="من أين وصلوا (المصادر)" rows={top.referrers} icon={Globe2} ltr />
              <RankList title="المناطق الزمنية (تقريب الموقع)" rows={top.timezones} icon={Globe2} ltr />
              <RankList title="الأجهزة" rows={top.devices} icon={MonitorSmartphone} />
              <RankList title="المتصفحات" rows={top.browsers} icon={MonitorSmartphone} />
              <RankList title="ماذا فعلوا (أحداث القمع)" rows={top.events} icon={Activity} ltr />
            </div>
          )}

          {/* الأخطاء */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
              <AlertTriangle size={15} className="text-red-500" aria-hidden />
              آخر الأخطاء التي واجهت الزوار
            </h2>
            {errors.length === 0 ? (
              <p className="mt-3 text-xs font-bold text-emerald-600">لا أخطاء مسجلة — الواجهة نظيفة عند زوارك</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 pe-4 text-start">الوقت</th>
                      <th className="py-2.5 pe-4 text-start">الخطأ</th>
                      <th className="py-2.5 pe-4 text-start">الصفحة</th>
                      <th className="py-2.5 text-start">البيئة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((e) => (
                      <tr key={e.id} className="border-b border-slate-50 align-top last:border-0">
                        <td className="py-3 pe-4 text-xs tabular-nums text-slate-500">
                          {e.created_at.slice(0, 16).replace('T', ' ')}
                        </td>
                        <td dir="ltr" className="max-w-md py-3 pe-4 text-start text-xs font-bold text-red-600">
                          {e.name ?? '—'}
                        </td>
                        <td dir="ltr" className="py-3 pe-4 text-start text-xs text-ink-500">{e.path ?? '—'}</td>
                        <td className="py-3 text-xs text-slate-500">
                          {[e.browser, e.os, e.device === 'mobile' ? 'جوال' : e.device === 'tablet' ? 'لوحي' : 'حاسوب']
                            .filter(Boolean)
                            .join(' · ')}
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
