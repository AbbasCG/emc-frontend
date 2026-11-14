import { fetchUsersOverview, type OverviewData } from '@/api/usersAnalyticsApi'
import { adminRoleLabelAr } from '@/pages/super-admin/users/assignableRoles'
import { getCountryByCode } from '@/lib/countries'
import { fmtInt, fmtPct } from '../analytics/format'
import { LazyTimeSeries } from '../analytics/LazyTimeSeries'
import { QueryBoundary } from '../analytics/QueryBoundary'
import { useAnalyticsQuery, useAnalyticsRange } from '../analytics/useAnalytics'
import {
  DistributionList,
  EmptyNote,
  LoginDataNotes,
  MetricCard,
  Panel,
  RangeFilter,
  ShareBar,
  Skeleton,
} from '../analytics/ui'

/**
 * «التحليلات»: account totals and growth, logins, and who the accounts are.
 *
 * Everything shown is returned by GET /admin/users-analytics/overview (permission users.analytics.view). The window is
 * shared with «النشاط» through the URL. Figures that do not follow the window say so on their card.
 */
export default function AnalyticsTab() {
  const { range, compare, query, today, setPreset, setCustom, setCompare } = useAnalyticsRange()
  const result = useAnalyticsQuery(`overview:${query.from}:${query.to}:${query.compare}`, (signal) => fetchUsersOverview(query, signal))

  return (
    <div className="space-y-6">
      <RangeFilter range={range} compare={compare} today={today} onPreset={setPreset} onCustom={setCustom} onCompare={setCompare} />

      <QueryBoundary query={result} onRetry={result.reload} skeleton={<OverviewSkeleton />}>
        {(data) => <OverviewBody data={data} compare={compare} />}
      </QueryBoundary>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[132px]" />
        ))}
      </div>
      <Skeleton className="h-[340px]" />
    </div>
  )
}

const STATUS_LABELS_AR = { active: 'نشط', inactive: 'موقوف', deleted: 'محذوف', verified: 'بريد موثَّق', unverified: 'بريد غير موثَّق' } as const

function CumulativeTag() {
  return <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">تراكمي</span>
}

function OverviewBody({ data, compare }: { data: OverviewData; compare: boolean }) {
  const { kpis, charts, meta } = data
  const growth = kpis.registration_growth_pct.value
  const hasLogins = charts.login_trend.some((d) => d.events > 0)
  const hasNewVsReturning = charts.new_vs_returning.some((d) => d.new + d.returning > 0)
  const createdInPeriod = kpis.accounts_created.value

  const countryRows = [
    ...charts.by_country.items.map((c) => ({
      key: c.country,
      label: getCountryByCode(c.country)?.name ?? c.country,
      value: c.count,
    })),
    ...(charts.by_country.other > 0 ? [{ key: '__other', label: 'دول أخرى', value: charts.by_country.other }] : []),
    ...(charts.by_country.unknown > 0 ? [{ key: '__unknown', label: 'غير محدد', value: charts.by_country.unknown }] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-5">
        <MetricCard
          label="إجمالي الحسابات"
          value={fmtInt(kpis.total_accounts.value)}
          cumulative
          tip="عدد الحسابات القائمة الآن، دون المحذوفة. رقم تراكمي لا يتغير باختيار الفترة."
        />
        <MetricCard
          label="حسابات أُنشئت في الفترة"
          value={fmtInt(kpis.accounts_created.value)}
          kpi={kpis.accounts_created}
          compare={compare}
          tip="الحسابات التي أُنشئت خلال الفترة المختارة وما زالت قائمة."
        />
        <MetricCard
          label="تسجيلات الدخول الناجحة"
          value={fmtInt(kpis.successful_logins.value)}
          kpi={kpis.successful_logins}
          compare={compare}
          tip="عدد أحداث تسجيل الدخول الناجحة المسجَّلة في الفترة. لا يشمل محاولات الدخول الفاشلة ولا الجلسات المستمرة دون دخول جديد."
        />
        <MetricCard
          label="المستخدمون الذين سجلوا الدخول"
          value={fmtInt(kpis.unique_logged_in_users.value)}
          kpi={kpis.unique_logged_in_users}
          compare={compare}
          tip="عدد المستخدمين المختلفين الذين لهم تسجيل دخول واحد على الأقل في الفترة. ليس «المستخدمين النشطين»: لا تتوفر أحداث نشاط أوسع من الدخول."
        />
        <MetricCard
          label="نمو التسجيلات"
          value={growth === null ? null : fmtPct(growth, true)}
          tip="الفرق في عدد الحسابات المنشأة بين الفترة المختارة والفترة السابقة لها بالطول نفسه، كنسبة مئوية من الفترة السابقة."
          note={
            growth !== null ? 'مقارنةً بالفترة السابقة'
            : compare ? 'لا حسابات في الفترة السابقة للمقارنة'
            : 'فعّل «مقارنة بالفترة السابقة» لعرض النمو'
          }
        />
      </div>

      <LoginDataNotes coverage={meta.login_history} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="نمو الحسابات"
          className="lg:col-span-2"
          tip="إجمالي الحسابات القائمة في نهاية كل يوم من الفترة. الأيام بتوقيت أمستردام."
          aside={<span className="text-xs tabular-nums text-slate-500">{createdInPeriod > 0 ? `+${fmtInt(createdInPeriod)} في الفترة` : 'لا حسابات جديدة في الفترة'}</span>}
        >
          <LazyTimeSeries kind="growth" data={charts.accounts_growth} height={300} />
        </Panel>

        <Panel title="توزيع الأدوار" tip="الحسابات القائمة الآن حسب الدور. رقم تراكمي لا يتغير باختيار الفترة." aside={<CumulativeTag />}>
          <DistributionList
            total={kpis.total_accounts.value}
            rows={charts.by_role.map((r) => ({ key: r.role, label: r.role === 'unknown' ? 'غير محدد' : adminRoleLabelAr(r.role), value: r.count }))}
          />
        </Panel>
      </div>

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

        <Panel title="حالة الحسابات" tip="الحسابات الآن: نشطة أو موقوفة، وتوثيق البريد. المحذوفة تُعرض مرة واحدة هنا ولا تدخل في الإجماليات." aside={<CumulativeTag />}>
          <div className="space-y-5">
            <ShareBar
              segments={[
                { key: 'active', label: STATUS_LABELS_AR.active, value: charts.by_status.active },
                { key: 'inactive', label: STATUS_LABELS_AR.inactive, value: charts.by_status.inactive },
              ]}
            />
            <ShareBar
              segments={[
                { key: 'verified', label: STATUS_LABELS_AR.verified, value: charts.by_status.verified },
                { key: 'unverified', label: STATUS_LABELS_AR.unverified, value: charts.by_status.unverified },
              ]}
            />
            <p className="text-xs text-slate-500">
              {STATUS_LABELS_AR.deleted}: <span className="tabular-nums text-navy">{fmtInt(charts.by_status.deleted)}</span> (غير محسوبة أعلاه)
            </p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="جدد مقابل عائدين"
          tip="المستخدمون الذين سجلوا الدخول كل يوم: «جدد» أُنشئ حسابهم داخل الفترة، و«عائدون» حسابهم أقدم. يُحدَّد ذلك بعمر الحساب لأن سجل الدخول قد يكون ناقصًا."
        >
          {hasNewVsReturning ?
            <LazyTimeSeries kind="newVsReturning" data={charts.new_vs_returning} height={200} compact />
          : <EmptyNote>لا توجد تسجيلات دخول في هذه الفترة</EmptyNote>}
        </Panel>

        <Panel
          title="توزيع البلدان"
          className="lg:col-span-2"
          tip="البلد الذي أدخله المستخدم عند التسجيل. لا نستنتج البلد من العنوان الشبكي، فالقيمة معلنة ذاتيًا وقد تكون ناقصة."
          aside={<span className="text-xs text-slate-500">معلن ذاتيًا · {fmtPct(charts.by_country.coverage_pct)} من الحسابات</span>}
        >
          <DistributionList total={kpis.total_accounts.value} rows={countryRows} />
        </Panel>
      </div>
    </div>
  )
}
