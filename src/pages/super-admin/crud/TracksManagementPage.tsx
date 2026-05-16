import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GitBranch, RefreshCw } from 'lucide-react'
import type { CatalogTrackRow } from '@/api/superAdminCatalogApi'
import { fetchTracksStrict } from '@/api/superAdminCatalogApi'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { CrudFilterBar, MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { LoadingPanel, EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'
import {
  SaGlassCard,
  SaPageRoot,
  SaStatChip,
  SaToolbar,
} from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'

type SortOpt = 'courses_desc' | 'title_az' | 'duration_asc'

function PathwayNodes({ count }: { count: number }) {
  const shown = Math.min(Math.max(count, 0), 10)
  const extra = Math.max(0, count - shown)
  if (count === 0) {
    return <span className="text-[11px] font-bold text-muted-400">لا برامج مربوطة بعد</span>
  }
  return (
    <div dir="rtl" className="flex flex-wrap items-center justify-end gap-2">
      {Array.from({ length: shown }, (_, idx) => idx + 1).map((step, i) => (
        <Fragment key={step}>
          {i > 0 ?
            <span className="hidden h-1 w-8 shrink-0 rounded-full bg-gradient-to-l from-customBlue/35 to-accent-400/35 sm:block" aria-hidden />
          : null}
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#2691C2] to-[#22334A] text-[10px] font-black text-white shadow-md ring-2 ring-white">
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

  return (
    <SaPageRoot>
      <SaToolbar
        eyebrow="تصميم المسارات"
        title="المسارات"
        subtitle="بطاقات «مسار تعلّم» مع عقد مرئية لعدد البرامج المرتبطة — المصدر GET /tracks."
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-[12px] font-black text-deepBlue shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="rounded-2xl bg-[#22334A] px-4 py-2.5 text-[12px] font-black text-white shadow-sm"
            >
              إنشاء مسار (قريبًا)
            </button>
            <Link to="/tracks" className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-[12px] font-black text-brand-900">
              المعاينة العامّة
            </Link>
          </>
        }
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SaStatChip label="مسارات محمّلة" value={rows.length} tone="blue" />
        <SaStatChip label="مرتبطة ببرامج" value={bundled} tone="success" />
        <SaStatChip
          label="متوسط المدة"
          value={avgDur != null ? `${avgDur.toFixed(1)} شهر` : '—'}
          tone="orange"
        />
        <SaStatChip label="بيانات ناقصة" value={unnamed} tone={unnamed ? 'orange' : 'ink'} />
      </div>

      <CrudFilterBar searchValue={q} onSearchChange={setQ} searchPlaceholder="بحث بالعنوان أو المعرِّف المختصر…">
        <MiniSelect
          label="الفرز"
          value={sortKey}
          onChange={(v) => setSortKey(v as SortOpt)}
          options={[
            { value: 'courses_desc', labelAr: 'الأكثر برامج' },
            { value: 'duration_asc', labelAr: 'المدّة المتصاعدة' },
            { value: 'title_az', labelAr: 'اسمًا أبجديًا' },
          ]}
        />
      </CrudFilterBar>

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

      <CrudModal open={guideOpen} onClose={() => setGuideOpen(false)} title="إنشاء مسار جديد" subtitle="حالة نقطة مسؤولة">
        <div className="space-y-3 text-right text-[13px] font-semibold text-muted-700">
          <p>
            ستُحمَّل نقطة مستقبلية لإنشاء وتحرير المسارات وتربط الوحدات الدراسية. حتى ذلك الحين احتفظ بهذه الواجهة كمركز
            رقابة واستكشاف.
          </p>
          <CrudBadge variant="brand">مسار هذا العنصر باقٍ مستقرًا لتجربة السوبر مشرف</CrudBadge>
        </div>
      </CrudModal>

      <CrudModal open={view !== null} onClose={() => setView(null)} title={view?.title ?? ''} subtitle="تفاصيل مسار">
        {view ?
          <div className="space-y-2 text-right text-[13px] font-semibold text-muted-700">
            <p>
              المعرّف #{view.id} · المختصر <code className="font-black text-deepBlue">{view.slug}</code>
            </p>
            <p>
              مرتبط بـ <span className="font-black text-customBlue">{view.courses_count ?? 0}</span> برنامجًا في ناتج
              الخادم الحالي.
            </p>
            <PathwayNodes count={view.courses_count ?? 0} />
          </div>
        : null}
      </CrudModal>
    </SaPageRoot>
  )
}
