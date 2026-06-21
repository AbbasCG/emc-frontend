import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GitBranch, GitMerge, Layers, Link2, RefreshCw, Route } from 'lucide-react'
import type { CatalogTrackRow } from '@/api/superAdminCatalogApi'
import { fetchTracksStrict } from '@/api/superAdminCatalogApi'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { LoadingPanel, EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'
import {
  EntityDetailDrawer,
  EntityDetailField,
  EntityDetailSection,
} from '@/pages/super-admin/crud/shared/EntityDetailDrawer'
import { EntityActionMenu } from '@/pages/super-admin/crud/shared/EntityActionMenu'
import { CrudToolbar } from '@/pages/super-admin/crud/shared/CrudToolbar'
import { AnimatedTabular, EnterpriseCrudHero, EnterpriseMetricTile } from '@/pages/super-admin/crud/shared/enterprise/EnterpriseMetrics'
import {
  EMC_CHART_PALETTE,
  EnterpriseColumnChart,
  EnterprisePieRadial,
  EnterpriseScatterPlot,
} from '@/pages/super-admin/crud/shared/enterprise/charts'
import { SaGlassCard, SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'

type SortOpt = 'courses_desc' | 'title_az' | 'duration_asc'

function PathwayNodes({ count }: { count: number }) {
  const shown = Math.min(Math.max(count, 0), 10)
  const extra = Math.max(0, count - shown)
  if (count === 0) {
    return <span className="text-[11px] font-bold text-muted-400">لا برامج مربوطة بعد</span>
  }
  return (
    <div dir="rtl" className="flex flex-wrap items-center justify-start gap-2">
      {Array.from({ length: shown }, (_, idx) => idx + 1).map((step, i) => (
        <Fragment key={step}>
          {i > 0 ?
            <span className="hidden h-1 w-8 shrink-0 rounded-full bg-customOrange sm:block" aria-hidden />
          : null}
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0077B6] to-[#0C2A4B] text-[10px] font-black text-white shadow-md ring-2 ring-white">
            {step}
          </span>
        </Fragment>
      ))}
      {extra > 0 ?
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-muted-700 ring-1 ring-slate-200">
          +{extra}
        </span>
      : null}
    </div>
  )
}

export default function TracksManagementPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<CatalogTrackRow[]>([])
  const [failed, setFailed] = useState(false)
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<SortOpt>('courses_desc')
  const [view, setView] = useState<CatalogTrackRow | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    const pack = await fetchTracksStrict()
    if (!pack.ok) {
      setFailed(true)
      setRows([])
    } else setRows(pack.rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    const base = [...rows]
    base.sort((a, b) => {
      if (sortKey === 'title_az') return a.title.localeCompare(b.title)
      if (sortKey === 'duration_asc') {
        const ad = a.duration_months ?? 999
        const bd = b.duration_months ?? 999
        return ad - bd
      }
      const ac = a.courses_count ?? 0
      const bc = b.courses_count ?? 0
      return bc - ac
    })
    return base.filter((r) => !t || `${r.title} ${r.slug}`.toLowerCase().includes(t))
  }, [rows, q, sortKey])

  const bundled = rows.filter((r) => (r.courses_count ?? 0) > 0).length
  const withDur = rows.filter((r) => r.duration_months != null && r.duration_months !== undefined)
  const avgDur = withDur.length > 0 ? withDur.reduce((a, r) => a + (r.duration_months ?? 0), 0) / withDur.length : null
  const unnamed = rows.filter((r) => !r.slug?.trim()).length
  const emptyShell = Math.max(0, rows.length - bundled)
  const funnel =
    filtered.length ?
      [{ label: 'المرشّح', مرتبط: filtered.filter((r) => (r.courses_count ?? 0) > 0).length, فارغ: filtered.filter((r) => !(r.courses_count ?? 0)).length }]
    : []
  const orbitPie = [
    { name: 'عدّ ظاهري', value: bundled, fill: EMC_CHART_PALETTE[0] },
    { name: 'صف بلا عدّ', value: emptyShell, fill: EMC_CHART_PALETTE[4] },
  ].filter((x) => x.value > 0)
  const scatterPoints = filtered
    .filter((r) => typeof r.duration_months === 'number')
    .map((r) => ({ id: r.id, title: r.title, x: r.courses_count ?? 0, y: r.duration_months as number }))

  return (
    <SaPageRoot className="space-y-8 pb-16">
      <EnterpriseCrudHero
        eyebrow="Topology · Catalog structure"
        title="المسارات"
        subtitle="مسارات الكتالوج من GET /tracks — لا بيانات وهمية عند الخطأ."
        variant="blue"
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-[18px] border border-white/26 bg-white/95 px-4 py-2.5 text-[12px] font-black text-deepBlue shadow backdrop-blur-md"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="rounded-[18px] bg-white/14 px-4 py-2.5 text-[12px] font-black text-white ring-2 ring-white/45 backdrop-blur"
            >
              إنشاء مسار (قريبًا)
            </button>
            <Link to="/tracks" className="rounded-[18px] border border-white/50 px-4 py-2.5 text-[12px] font-black text-white">
              المعاينة العامّة
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EnterpriseMetricTile accent="blue" icon={Route} label="صفوف محمّلة" value={<AnimatedTabular value={rows.length} />} />
        <EnterpriseMetricTile accent="mint" icon={Layers} label="ظهور عدّ برنامج" value={<AnimatedTabular value={bundled} />} deltaLabel={`بلا ظهور برنامج: ${emptyShell}`} />
        <EnterpriseMetricTile
          accent="orange"
          icon={Layers}
          label="متوسط المدة حيث تُحمِّل نقطة الانطلاق"
          value={avgDur != null ? `${avgDur.toFixed(1)} شهر` : '—'}
        />
        <EnterpriseMetricTile accent="navy" icon={Link2} label=".slug ناقص" value={<AnimatedTabular value={unnamed} />} />
      </div>

      <CrudToolbar
        sticky
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="بحث بالعنوان أو المعرِّف المختصر…"
      >
        <MiniSelect
          label="الفرز"
          value={sortKey}
          onChange={(v) => setSortKey(v as SortOpt)}
          options={[
            { value: 'courses_desc', labelAr: 'الأكثر برامج' },
            { value: 'duration_asc', labelAr: 'المدّة المتصاعدة حيث تتوفر نقطة الانطلاق' },
            { value: 'title_az', labelAr: 'اسمًا أبجديًا' },
          ]}
        />
      </CrudToolbar>

      {!failed ?
        <div className="grid gap-6 lg:grid-cols-2">
          <SaGlassCard className="flex flex-col gap-4 p-7 text-right" glow="orange">
            <div className="flex items-start justify-between gap-3 rtl:flex-row-reverse">
              <div>
                <p className="text-[11px] font-black text-accent-950">قطاع مجموعة المرجع</p>
                <p className="mt-3 text-[12px] font-semibold text-muted-700">حيث يمكن إظهار عدّ ظاهري مقابل أصفار.</p>
              </div>
              <GitMerge className="h-7 w-7 text-accent-700/85" aria-hidden />
            </div>
            <div className="rounded-[22px] border border-white/80 bg-white/70 p-2 shadow-inner">
              {orbitPie.length ? <EnterprisePieRadial data={orbitPie} height={200} /> : <p className="py-12 text-center text-[12px] font-bold text-muted-600">لا قيم قطاع الآن على الشاشة.</p>}
            </div>
          </SaGlassCard>
          <div className="space-y-6">
            <SaGlassCard className="space-y-4 p-7 text-right" glow="blue">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-600">صفوف مجموعة المرشَّح المرئية فقط</p>
              <div className="rounded-[22px] border border-ink-100/70 bg-white/70 px-2 py-1 shadow-inner">
                {funnel.length ?
                  <EnterpriseColumnChart data={funnel} height={176} bars={[{ key: 'مرتبط', color: EMC_CHART_PALETTE[2] }, { key: 'فارغ', color: EMC_CHART_PALETTE[3] }]} />
                : (
                  <p className="py-12 text-center text-[12px] font-bold text-muted-600">لا صفوف في المرشَّح المرئية لتشغيل عمود ظاهرة.</p>
                )}
              </div>
            </SaGlassCard>
            <SaGlassCard className="space-y-4 p-7 text-right" glow="orange">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-accent-950">نقطة مدّة × عمق اتصالات ظاهرة</p>
              <div className="rounded-[26px] border border-white/80 bg-white/70 px-3 py-2 shadow-inner backdrop-blur">
                {scatterPoints.length ?
                  <EnterpriseScatterPlot data={scatterPoints} height={246} />
                : (
                  <p className="flex min-h-[200px] items-center justify-center text-center text-[12px] font-bold text-muted-600">
                    لا Scatter: مجموعة المرشَّح الحالية لا تحتوي نقطة انطلاق رقمية.
                  </p>
                )}
              </div>
            </SaGlassCard>
          </div>
        </div>
      : null}

      {failed ?
        <ErrorPanel title="تعذّر جلب GET /tracks" hint="تحقَّق من الربط وتشغيل الخلفية، ثم طالِ زر التحديث." />
      : loading ?
        <LoadingPanel />
      : !filtered.length ?
        <EmptyPanel title="لا مسارات للعرض وفق المرشح الحالي." subtitle="امسح البحث أو جرّب فرزًا مختلفًا." />
      :
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {filtered.map((r) => (
            <SaGlassCard key={r.id} className="flex flex-col p-5 text-right" glow="blue">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-100 text-sm font-black text-deepBlue ring-1 ring-slate-200">
                    {initialsFromName(r.title)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-black text-deepBlue">{r.title}</h2>
                    <code className="mt-1 block truncate font-mono text-[11px] text-muted-600">{r.slug}</code>
                  </div>
                </div>
                <GitBranch className="h-8 w-8 shrink-0 text-customBlue/35" aria-hidden />
              </div>
              <div className="mt-5 rounded-2xl border border-dashed border-customBlue/25 bg-brand-500/[0.04] px-4 py-4">
                <p className="text-[11px] font-black text-deepBlue">تمثيل برامج المسار</p>
                <div className="mt-3 overflow-x-auto pb-1">
                  <PathwayNodes count={r.courses_count ?? 0} />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100/70 pt-4">
                <div className="flex flex-wrap gap-2 justify-start">
                  {r.duration_months != null ?
                    <CrudBadge variant="brand">{r.duration_months} شهر</CrudBadge>
                  : (
                    <CrudBadge variant="default">مدّة غير معلنة</CrudBadge>
                  )}
                  <CrudBadge variant="accent">{r.courses_count ?? 0} برنامج</CrudBadge>
                </div>
                <RowActionsMenu
                  ariaLabel={r.title}
                  actions={[
                    { key: 'v', label: 'عرض', onClick: () => setView(r) },
                    { key: 'pub', label: 'صفحة الزائر', onClick: () => window.open(`/tracks#${encodeURIComponent(r.slug)}`, '_blank') },
                  ]}
                />
              </div>
            </SaGlassCard>
          ))}
        </div>
      }

      <CrudModal open={guideOpen} onClose={() => setGuideOpen(false)} title="إنشاء مسار جديد" subtitle="حالة نقطة مسؤولة" widthClassName="max-w-2xl">
        <div className="space-y-3 text-right text-[13px] font-semibold text-muted-700">
          <p>
            ستُحمَّل نقطة مستقبلية لإنشاء وتحرير المسارات وتربط الوحدات الدراسية. حتى ذلك الحين احتفظ بهذه الواجهة كمركز
            رقابة واستكشاف.
          </p>
          <CrudBadge variant="brand">مسار هذا العنصر باقٍ مستقرًا لتجربة السوبر مشرف</CrudBadge>
        </div>
      </CrudModal>

      <EntityDetailDrawer
        open={view !== null}
        onClose={() => setView(null)}
        title={view?.title ?? ''}
        subtitle="تفاصيل مسار من الكتالوج"
        avatar={
          view ?
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-sm font-black text-deepBlue ring-2 ring-white">
              {initialsFromName(view.title)}
            </span>
          : null
        }
        badges={
          view ?
            <>
              <CrudBadge variant="accent">{view.courses_count ?? 0} برنامج</CrudBadge>
              {view.duration_months != null ?
                <CrudBadge variant="brand">{view.duration_months} شهر</CrudBadge>
              : null}
            </>
          : null
        }
        footerSlot={
          <EntityActionMenu
            onClose={() => setView(null)}
            onEdit={view ? () => window.open(`/tracks#${encodeURIComponent(view.slug)}`, '_blank') : undefined}
            editLabel="صفحة الزائر"
          />
        }
        tabs={
          view ?
            [
              {
                id: 'overview',
                labelAr: 'نظرة عامة',
                content: (
                  <EntityDetailSection title="هوية المسار" icon={<Route className="h-4 w-4" aria-hidden />}>
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <EntityDetailField label="المعرّف" value={<span className="font-mono">#{view.id}</span>} />
                      <EntityDetailField label="slug" value={<code className="font-mono">{view.slug}</code>} />
                      <EntityDetailField label="برامج مربوطة (عدّاد)" value={view.courses_count ?? 0} />
                      <EntityDetailField
                        label="مدّة تشغيلية (شهر)"
                        value={view.duration_months ?? 'غير معلنة'}
                      />
                    </dl>
                    <div className="mt-4">
                      <p className="mb-2 text-[11px] font-black text-muted-600">تمثيل المسار</p>
                      <PathwayNodes count={view.courses_count ?? 0} />
                    </div>
                  </EntityDetailSection>
                ),
              },
              {
                id: 'details',
                labelAr: 'التفاصيل',
                content: (
                  <EntityDetailSection title="صحة الكتالوج" icon={<GitBranch className="h-4 w-4" aria-hidden />}>
                    <p className="text-[13px] font-semibold text-muted-700">
                      مخرجات GET /tracks تُستخدم كما هي؛ لا حقول إضافية للنتائج أو الشهادات في هذه الاستجابة.
                    </p>
                  </EntityDetailSection>
                ),
              },
              {
                id: 'activity',
                labelAr: 'النشاط',
                content: (
                  <EntityDetailSection title="سجل تدقيق">
                    <p className="text-[12px] font-semibold text-muted-600">
                      لا أعمدة `updated_at`/`updated_by` في عرض السوبر مشرف الحالي لمسارات الكتالوج.
                    </p>
                  </EntityDetailSection>
                ),
              },
            ]
          : undefined
        }
      />
    </SaPageRoot>
  )
}
