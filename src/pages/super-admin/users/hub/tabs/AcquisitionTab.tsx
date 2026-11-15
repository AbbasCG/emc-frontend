import { useId } from 'react'
import { fetchUsersAcquisition, type AcquisitionData, type AcquisitionSourceItem, type AcquisitionUnavailableKey, type AcquisitionUtmRow } from '@/api/usersAnalyticsApi'
import { cn } from '@/lib/utils'
import { fmtInt, fmtPct } from '../analytics/format'
import { LazyTimeSeries } from '../analytics/LazyTimeSeries'
import { QueryBoundary } from '../analytics/QueryBoundary'
import { useAnalyticsQuery, useAnalyticsRange } from '../analytics/useAnalytics'
import { DistributionList, EmptyNote, MetricCard, Panel, RangeFilter, Skeleton } from '../analytics/ui'

/**
 * «الاستقطاب»: where members say they came from, and how much campaign traffic reached the site.
 *
 * Source: GET /admin/users-analytics/acquisition (permission users.acquisition.view). Two measurements that must not be
 * mixed up are kept in separate panels:
 *  - sign-ups by the source the person typed (optional free text; «unknown» is no answer, never «direct»);
 *  - page visits that carried UTM parameters (what the visits note says about consent and linking comes from the
 *    response flags, not from this file).
 * Referral codes, direct registration, a conversion rate and campaign-to-account linking are NOT collected, so they are
 * listed as unavailable and no figure is derived for them.
 */
export default function AcquisitionTab() {
  const { range, compare, query, today, setPreset, setCustom, setCompare } = useAnalyticsRange()
  const result = useAnalyticsQuery(`acquisition:${query.from}:${query.to}:${query.compare}`, (signal) => fetchUsersAcquisition(query, signal))

  return (
    <div className="space-y-6">
      <RangeFilter range={range} compare={compare} today={today} onPreset={setPreset} onCustom={setCustom} onCompare={setCompare} />

      <QueryBoundary query={result} onRetry={result.reload} skeleton={<AcquisitionSkeleton />}>
        {(data) => <AcquisitionBody data={data} compare={compare} />}
      </QueryBoundary>
    </div>
  )
}

function AcquisitionSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[132px]" />
        ))}
      </div>
      <Skeleton className="h-[320px]" />
    </div>
  )
}

/** The four figures the platform does not collect. Always listed, whatever the response contains. */
const UNAVAILABLE_ITEMS: ReadonlyArray<{ key: AcquisitionUnavailableKey; labelAr: string }> = [
  { key: 'referral_codes', labelAr: 'رموز الإحالة' },
  { key: 'direct_registration', labelAr: 'التسجيل المباشر' },
  { key: 'conversion_rate', labelAr: 'معدل التحويل' },
  { key: 'utm_to_account', labelAr: 'ربط الحملة بالحساب' },
]

const NO_REASON_AR = 'لا تتوفر بيانات لهذا البند'

/** The visits note says only what the response flags say: consent-gated, and/or not linked to the account made later. */
function utmVisitsNote(utm: { consent_gated: boolean; linked_to_accounts: boolean }): string {
  const parts: string[] = []
  if (utm.consent_gated) parts.push('تُسجَّل فقط لمن وافق على ملفات التحليلات')
  if (!utm.linked_to_accounts) parts.push(utm.consent_gated ? 'ولا ترتبط بالحساب الذي ينشئه الزائر لاحقًا' : 'لا ترتبط بالحساب الذي ينشئه الزائر لاحقًا')
  return `هذه زيارات لصفحات وليست تسجيلات${parts.length > 0 ? `: ${parts.join('، ')}` : ''}.`
}

/** Free text keeps its own direction (a Latin handle inside an Arabic page must not reorder around punctuation). An empty value is said so. */
function RawText({ children }: { children: string }) {
  if (children.trim() === '') return <span className="text-slate-400">(بلا اسم)</span>
  return <bdi dir="auto">{children}</bdi>
}

function SourceChange({ item }: { item: AcquisitionSourceItem }) {
  if (item.previous == null) return null
  const change = item.change_pct ?? null
  const tone = change === null ? '' : change > 0 ? 'text-emerald-700' : change < 0 ? 'text-red-700' : 'text-slate-600'

  return (
    <span className="inline-flex items-baseline gap-1.5">
      {change === null ? null : (
        <span dir="ltr" className={cn('font-medium', tone)}>
          {fmtPct(change, true)}
        </span>
      )}
      <span>الفترة السابقة {fmtInt(item.previous)}</span>
    </span>
  )
}

function utmRows(rows: AcquisitionUtmRow[]) {
  return rows.map((r, i) => ({
    key: `${i}:${r.name}`,
    label: <RawText>{r.name}</RawText>,
    title: r.name.trim() === '' ? undefined : r.name,
    value: r.visits,
    detail: `${fmtInt(r.visitors)} زائر`,
  }))
}

function AcquisitionBody({ data, compare }: { data: AcquisitionData; compare: boolean }) {
  const { self_reported: reported, utm_visits: utm, unavailable } = data
  // answered = what the response itself lists: the top sources plus the rest beyond them
  const answered = reported.items.reduce((sum, item) => sum + item.count, 0) + reported.other
  // an entry the backend marks available is not «unavailable»: it is left out here rather than shown with an invented figure;
  // an absent entry stays listed (we cannot say it is available)
  const unavailableItems = UNAVAILABLE_ITEMS.filter(({ key }) => unavailable[key]?.available !== true)
  const hasChannels = reported.daily.some((s) => s.series.some((p) => p.count > 0))

  const sourceRows = [
    ...reported.items.map((item, i) => ({
      key: `src:${i}:${item.source}`,
      label: <RawText>{item.source}</RawText>,
      title: item.source.trim() === '' ? undefined : item.source,
      value: item.count,
      detail: compare ? <SourceChange item={item} /> : undefined,
      quiet: false,
    })),
    ...(reported.other > 0 ? [{ key: '__other', label: reported.items.length > 0 ? `مصادر أخرى خارج الأعلى ${fmtInt(reported.items.length)}` : 'مصادر أخرى', title: undefined, value: reported.other, detail: undefined, quiet: true }] : []),
    ...(reported.unknown > 0 ? [{ key: '__unknown', label: 'غير محدد', title: undefined, value: reported.unknown, detail: undefined, quiet: true }] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="حسابات أُنشئت في الفترة"
          value={fmtInt(reported.total_accounts_created)}
          tip="الحسابات التي أُنشئت خلال الفترة المختارة. هي الأساس الذي تُقاس عليه المصادر المعلنة."
        />
        <MetricCard
          label="صرّحوا بمصدر"
          value={fmtInt(answered)}
          note={reported.coverage_pct === null ? undefined : `${fmtPct(reported.coverage_pct)} من الحسابات`}
          tip="الحسابات المنشأة في الفترة التي كتب أصحابها مصدرًا عند التسجيل. السؤال اختياري، فالنسبة تبيّن مقدار التغطية لا حجم القناة."
        />
        <MetricCard
          label="بلا مصدر معلن"
          value={fmtInt(reported.unknown)}
          tip="الحسابات المنشأة في الفترة دون أي مصدر. لا يعني هذا أنهم سجّلوا مباشرة، فلا نعرف كيف وصلوا."
        />
        <MetricCard
          label="زيارات بحملات UTM"
          badge="زيارات"
          value={fmtInt(utm.with_utm)}
          note={`من ${fmtInt(utm.total_pageviews)} زيارة صفحة مسجَّلة`}
          tip={`زيارات صفحات حملت معاملات UTM في الرابط${utm.consent_gated ? '، ضمن زيارات من وافقوا على ملفات التحليلات' : ''}. هي زيارات وليست تسجيلات.`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="مصادر التسجيل المعلنة"
          tip="نص حر يكتبه الشخص عند التسجيل، واختياري. لا يُوحَّد إلا بالقص وحالة الأحرف، فقد يظهر المصدر نفسه بصيغ مختلفة. «غير محدد» تعني أنه لم يُجب، وليست «تسجيل مباشر»."
          aside={<span className="text-xs text-slate-500">معلن ذاتيًا</span>}
        >
          <p className="mb-4 text-xs leading-6 text-slate-500">
            ما كتبه الأعضاء بعد قص المسافات وتوحيد حالة الأحرف. «غير محدد» تعني أنهم لم يجيبوا، وليست «تسجيل مباشر».
          </p>
          <DistributionList rows={sourceRows} ariaLabel="المصادر المعلنة وعدد الحسابات لكل مصدر" empty="لا توجد حسابات أُنشئت في هذه الفترة" />
        </Panel>

        <Panel
          title="التسجيلات اليومية حسب المصدر المعلن"
          tip="عدد الحسابات المنشأة كل يوم لكل من أبرز المصادر المعلنة (حتى 5). المصدر نص حر كتبه أصحابه، فهو ليس قناة مثبتة. الخط الأزرق هو المصدر الأول، وتُعرف الأخرى من مفتاح الخطوط."
        >
          {hasChannels ?
            <LazyTimeSeries kind="sources" data={reported.daily} height={260} compact />
          : <EmptyNote>لا توجد مصادر معلنة في هذه الفترة</EmptyNote>}
        </Panel>
      </div>

      <Panel
        title="زيارات الحملات (UTM)"
        tip="الزيارات التي حملت معاملات UTM في رابط الصفحة، مرتبة بحسب المصدر والوسيط والحملة. الرقم الكبير عدد الزيارات وبجانبه عدد الزوار."
        aside={<span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">زيارات لا تسجيلات</span>}
      >
        <p className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">{utmVisitsNote(utm)}</p>

        {utm.with_utm === 0 ?
          <EmptyNote>لا توجد زيارات بحملات UTM في هذه الفترة</EmptyNote>
        : <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <UtmList title="المصدر" rows={utm.by_source} />
            <UtmList title="الوسيط" rows={utm.by_medium} />
            <UtmList title="الحملة" rows={utm.by_campaign} />
          </div>
        }
      </Panel>

      {unavailableItems.length > 0 ?
        <Panel title="غير متاح حاليًا" tip="بيانات لا تجمعها المنصة اليوم. لا نعرض لها رقمًا ولا نقدّره، حتى لا يُفهم غياب البيانات على أنه صفر.">
          <ul className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
            {unavailableItems.map(({ key, labelAr }) => (
              <li key={key} className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-navy">{labelAr}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">غير متاح</span>
                </div>
                <p className="mt-1 text-sm leading-7 text-slate-600">{unavailable[key]?.reason || NO_REASON_AR}</p>
              </li>
            ))}
          </ul>
        </Panel>
      : null}
    </div>
  )
}

function UtmList({ title, rows }: { title: string; rows: AcquisitionUtmRow[] }) {
  const headingId = useId()
  return (
    <div className="min-w-0">
      <h4 id={headingId} className="mb-3 text-xs font-medium text-slate-500">
        {title}
      </h4>
      <DistributionList rows={utmRows(rows)} labelledBy={headingId} empty="لا قيم مسجَّلة" />
    </div>
  )
}
