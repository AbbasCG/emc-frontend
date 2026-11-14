import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchLastLogins, fetchUsersActivity, type ActivityData } from '@/api/usersAnalyticsApi'
import { adminRoleLabelAr } from '@/pages/super-admin/users/assignableRoles'
import { fmtInstant, fmtInt, fmtPct } from '../analytics/format'
import { LoginHeatmap } from '../analytics/Heatmap'
import { LazyTimeSeries } from '../analytics/LazyTimeSeries'
import { QueryBoundary } from '../analytics/QueryBoundary'
import { useAnalyticsQuery, useAnalyticsRange } from '../analytics/useAnalytics'
import { DistributionList, EmptyNote, LoginDataNotes, MetricCard, Panel, RangeFilter, ShareBar, Skeleton } from '../analytics/ui'

/**
 * «النشاط»: who logged in, how often they came back, when, and who has gone quiet.
 *
 * Source: GET /admin/users-analytics/activity and /last-logins (permission users.activity.view). Every number comes from
 * recorded LOGIN events. The headline is «المستخدمون الذين سجلوا الدخول», not «النشطون»: with no broader activity events
 * there is no basis for calling anyone active, and sessions that continue without a new login are not seen.
 */
export default function ActivityTab() {
  const { range, compare, query, today, setPreset, setCustom, setCompare } = useAnalyticsRange()
  const result = useAnalyticsQuery(`activity:${query.from}:${query.to}:${query.compare}`, (signal) => fetchUsersActivity(query, signal))

  return (
    <div className="space-y-6">
      <RangeFilter range={range} compare={compare} today={today} onPreset={setPreset} onCustom={setCustom} onCompare={setCompare} />

      <QueryBoundary query={result} onRetry={result.reload} skeleton={<ActivitySkeleton />}>
        {(data) => <ActivityBody data={data} compare={compare} />}
      </QueryBoundary>

      <LastLoginsPanel />
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[132px]" />
        ))}
      </div>
      <Skeleton className="h-[260px]" />
    </div>
  )
}

const FREQUENCY_LABELS_AR: Record<string, string> = {
  '1': 'يوم واحد',
  '2-3': '2–3 أيام',
  '4-7': '4–7 أيام',
  '8+': '8 أيام فأكثر',
}

function CumulativeTag() {
  return <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">تراكمي</span>
}

function ActivityBody({ data, compare }: { data: ActivityData; compare: boolean }) {
  const { kpis, charts, meta } = data
  const hasLogins = kpis.login_events.value > 0
  const back = kpis.users_back_on_another_day

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-5">
        <MetricCard
          label="إجمالي أحداث الدخول"
          value={fmtInt(kpis.login_events.value)}
          kpi={kpis.login_events}
          compare={compare}
          tip="عدد تسجيلات الدخول الناجحة المسجَّلة في الفترة. المستخدم الواحد قد يسجّل أكثر من مرة."
        />
        <MetricCard
          label="المستخدمون الذين سجلوا الدخول"
          value={fmtInt(kpis.unique_logged_in_users.value)}
          kpi={kpis.unique_logged_in_users}
          compare={compare}
          tip="المستخدمون المختلفون الذين لهم تسجيل دخول واحد على الأقل في الفترة. ليس «المستخدمين النشطين»."
        />
        <MetricCard
          label="مستخدمون عائدون"
          value={fmtInt(kpis.returning_users.value)}
          kpi={kpis.returning_users}
          compare={compare}
          tip="مستخدمون سجلوا الدخول في الفترة وحسابهم أُنشئ قبل بدايتها. يُحدَّد بعمر الحساب لأن سجل الدخول قد يكون ناقصًا."
        />
        <MetricCard
          label="جدد سجلوا الدخول"
          value={fmtInt(kpis.new_users_logged_in.value)}
          kpi={kpis.new_users_logged_in}
          compare={compare}
          tip="مستخدمون أُنشئ حسابهم داخل الفترة وسجلوا الدخول فيها."
        />
        <MetricCard
          label="عادوا في يوم آخر"
          value={fmtInt(back.value)}
          note={back.share_pct === null ? undefined : `${fmtPct(back.share_pct)} ممن سجلوا الدخول`}
          tip="مستخدمون سجلوا الدخول في يومين مختلفين أو أكثر ضمن الفترة، أي عادوا للمنصة بعد أول زيارة فيها."
        />
      </div>

      <LoginDataNotes coverage={meta.login_history} />

      <Panel
        title="متى يسجّل المستخدمون الدخول"
        tip="عدد تسجيلات الدخول لكل يوم من الأسبوع وساعة من اليوم خلال الفترة، بتوقيت أمستردام. الخلية الأغمق أكثر دخولًا."
      >
        <LoginHeatmap matrix={charts.heatmap.weekday_hour} timezone={charts.heatmap.timezone} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="اتجاه تسجيلات الدخول"
          className="lg:col-span-2"
          tip="لكل يوم: عدد تسجيلات الدخول (الخط الأزرق) وعدد المستخدمين المختلفين (الخط الرمادي)."
        >
          {hasLogins ?
            <LazyTimeSeries kind="logins" data={charts.login_trend} height={200} />
          : <EmptyNote>لا توجد تسجيلات دخول في هذه الفترة</EmptyNote>}
        </Panel>

        <Panel title="تكرار العودة" tip="كم يومًا مختلفًا سجّل فيه كل مستخدم الدخول خلال الفترة.">
          <ShareBar segments={charts.return_frequency.map((f) => ({ key: f.label, label: FREQUENCY_LABELS_AR[f.label] ?? f.label, value: f.users }))} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="الأدوار الأكثر دخولًا"
          className="lg:col-span-2"
          tip="تسجيلات الدخول حسب دور المستخدم وقت الدخول، مع عدد المستخدمين المختلفين لكل دور."
        >
          <DistributionList
            rows={charts.by_role.map((r) => ({
              key: r.role,
              label: r.role === 'unknown' ? 'غير محدد' : adminRoleLabelAr(r.role),
              value: r.events,
              detail: `${fmtInt(r.users)} مستخدم`,
            }))}
          />
        </Panel>

        <Panel
          title="حسابات بلا دخول حديث"
          tip="حسابات مفعَّلة آخر تسجيل دخول لها أقدم من المدة المذكورة. تعتمد على آخر تسجيل دخول مسجَّل، فمن يبقى مسجّلًا بجلسة مستمرة قد يظهر هنا."
          aside={<CumulativeTag />}
        >
          <ul className="space-y-3 text-sm">
            {data.inactivity.map((b) => (
              <li key={b.days} className="flex items-baseline justify-between gap-3">
                <span className="text-slate-600">بلا دخول منذ أكثر من {b.days} يومًا</span>
                <span className="tabular-nums text-navy">{fmtInt(b.users)}</span>
              </li>
            ))}
            <li className="flex items-baseline justify-between gap-3 border-t border-slate-100 pt-3">
              <span className="text-slate-600">لم يسجلوا الدخول أبدًا</span>
              <span className="tabular-nums text-navy">{fmtInt(data.never_logged_in)}</span>
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function LastLoginsPanel() {
  const [page, setPage] = useState(1)
  const result = useAnalyticsQuery(`last-logins:${page}`, (signal) => fetchLastLogins(page, 10, signal))

  return (
    <Panel
      title="آخر من سجّل الدخول"
      tip="الحسابات مرتبة بآخر تسجيل دخول مسجَّل، من الأحدث. تُعرض الأسماء والأدوار فقط، ولا بريد ولا رقم هاتف ولا عنوان شبكي."
    >
      <QueryBoundary query={result} onRetry={result.reload} skeleton={<Skeleton className="h-48" />}>
        {(data) =>
          data.rows.length === 0 ?
            <EmptyNote>لا توجد حسابات لها تسجيل دخول مسجَّل</EmptyNote>
          : <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-start text-xs text-slate-500">
                      <th scope="col" className="py-2 text-start font-medium">
                        الاسم
                      </th>
                      <th scope="col" className="py-2 text-start font-medium">
                        الدور
                      </th>
                      <th scope="col" className="hidden py-2 text-start font-medium sm:table-cell">
                        الحساب
                      </th>
                      <th scope="col" className="py-2 text-start font-medium">
                        آخر دخول
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={r.id} className="border-b border-slate-50 last:border-0">
                        <th scope="row" className="py-2.5 text-start font-normal text-navy">
                          {r.name}
                        </th>
                        <td className="py-2.5 text-slate-600">{adminRoleLabelAr(r.role)}</td>
                        <td className="hidden py-2.5 text-slate-600 sm:table-cell">{r.is_active ? 'نشط' : 'موقوف'}</td>
                        <td className="py-2.5 tabular-nums text-slate-600">{fmtInstant(r.last_login_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span className="tabular-nums">
                  {fmtInt(data.total)} حسابًا · صفحة {fmtInt(data.page)} من {fmtInt(data.lastPage)}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="الصفحة السابقة"
                    disabled={data.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="الصفحة التالية"
                    disabled={data.page >= data.lastPage}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
        }
      </QueryBoundary>
    </Panel>
  )
}
