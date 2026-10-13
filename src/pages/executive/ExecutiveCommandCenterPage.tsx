import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Lock, RefreshCw, Search, ShieldAlert } from 'lucide-react'
import DashboardPageShell from '@/components/ui/DashboardPageShell'
import {
  classifyCommandCenterError,
  fetchCommandCenter,
  type CommandCenterData,
  type CommandCenterErrorKind,
  type CommandCenterRange,
} from '@/api/executiveCommandCenterApi'
import { CommandCenterFilters, type SourceFilter } from '@/components/executiveCommandCenter/CommandCenterFilters'
import { CommandCenterKpis } from '@/components/executiveCommandCenter/CommandCenterKpis'
import { CommandCenterSection } from '@/components/executiveCommandCenter/CommandCenterSection'
import { CommandCenterSourceHealth } from '@/components/executiveCommandCenter/CommandCenterSourceHealth'
import { RANGE_OPTIONS, formatDateTime } from '@/components/executiveCommandCenter/commandCenterUi'
import { cn } from '@/lib/utils'

/**
 * /dashboard/executive/command-center — مركز المتابعة التنفيذي.
 *
 * A private, READ-ONLY follow-up hub: one request to one aggregator endpoint, then a feed of
 * normalized, actionable items grouped into four sections. Every item says where it came
 * from and links to the page where the work is done; nothing here changes any data.
 *
 * Two layers decide who gets data, and this page trusts neither alone: PAGE ACCESS opens the
 * route and shows the sidebar entry; the API independently requires the explicit
 * `executive.command_center.view` permission. A 403 is rendered as an unauthorized state,
 * never as an empty feed.
 */

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-deepBlue/[0.06]', className)} />
}

function StateCard({ icon: Icon, title, body, action, danger = false }: { icon: typeof Lock; title: string; body: string; action?: React.ReactNode; danger?: boolean }) {
  return (
    <div role={danger ? 'alert' : 'status'} className="mx-auto max-w-lg rounded-3xl border border-deepBlue/[0.07] bg-white p-8 text-center shadow-sm">
      <span className={cn('mx-auto grid h-14 w-14 place-items-center rounded-full ring-1', danger ? 'bg-red-50 text-red-500 ring-red-100' : 'bg-customBlue/[0.07] text-customBlue ring-customBlue/15')}>
        <Icon size={26} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-black text-deepBlue">{title}</h2>
      <p className="mt-1.5 text-sm font-bold leading-relaxed text-deepBlue/60">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export default function ExecutiveCommandCenterPage() {
  const [range, setRange] = useState<CommandCenterRange>('today')
  const [source, setSource] = useState<SourceFilter>('all')
  const [query, setQuery] = useState('')
  const [data, setData] = useState<CommandCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<CommandCenterErrorKind | null>(null)
  const requestRef = useRef(0)

  const load = useCallback(async (r: CommandCenterRange, s: SourceFilter) => {
    const request = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await fetchCommandCenter({ range: r, source: s })
      if (request !== requestRef.current) return
      setData(res)
    } catch (e) {
      if (request !== requestRef.current) return
      setData(null)
      setError(classifyCommandCenterError(e))
    } finally {
      if (request === requestRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on filter change; the loading flag must reset before the request
    void load(range, source)
  }, [range, source, load])

  const needle = query.trim().toLowerCase()
  const searching = needle.length > 0
  const matches = useCallback(
    (i: { title: string; description: string; actor: { name: string } | null }) =>
      !searching || `${i.title} ${i.description} ${i.actor?.name ?? ''}`.toLowerCase().includes(needle),
    [needle, searching],
  )

  const sections = useMemo(() => data?.sections ?? [], [data])
  const forbidden = error === 'forbidden'

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="الفترة" className="inline-flex rounded-xl border border-deepBlue/10 bg-white p-1 shadow-sm">
        {RANGE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setRange(o.value)}
            aria-pressed={range === o.value}
            disabled={forbidden}
            className={cn('rounded-lg px-3.5 py-1.5 text-xs font-black transition', range === o.value ? 'bg-customBlue text-white shadow-sm' : 'text-deepBlue/60 hover:text-deepBlue', forbidden && 'opacity-50')}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => void load(range, source)}
        disabled={loading || forbidden}
        className="inline-flex items-center gap-2 rounded-xl border border-deepBlue/10 bg-white px-4 py-2.5 text-xs font-black text-deepBlue shadow-sm transition hover:bg-customBlue/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw size={14} className={cn(loading && 'animate-spin')} aria-hidden="true" />
        تحديث
      </button>
    </div>
  )

  return (
    <div dir="rtl" className="mx-auto w-full max-w-7xl">
      <DashboardPageShell
        eyebrow="المتابعة التقنية والتنفيذية"
        title="مركز المتابعة التنفيذي"
        description="متابعة أهم أحداث المنصة والمهام القادمة والتنبيهات من مكان واحد."
        breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'مركز المتابعة التنفيذي' }]}
        actions={actions}
      >
        {forbidden ?
          <StateCard
            icon={Lock}
            danger
            title="لا تملك صلاحية عرض مركز المتابعة"
            body="هذه الصفحة خاصة وتتطلب صلاحية صريحة. تواصل مع مالك المنصة إن كنت تحتاجها."
          />
        : error ?
          <StateCard
            icon={ShieldAlert}
            danger
            title="تعذّر تحميل مركز المتابعة"
            body="حدث خطأ أثناء جلب البيانات. حاول مرة أخرى."
            action={
              <button type="button" onClick={() => void load(range, source)} className="rounded-xl bg-customOrange px-5 py-2.5 text-sm font-extrabold text-white shadow-emc-md">
                إعادة المحاولة
              </button>
            }
          />
        : (
          <div className="space-y-6">
            {/* Search + last updated */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="relative block w-full sm:max-w-sm">
                <span className="sr-only">بحث في المتابعة</span>
                <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-deepBlue/40" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="بحث سريع في العناصر…"
                  className="w-full rounded-xl border border-deepBlue/10 bg-white py-2.5 ps-9 pe-3 text-sm font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:ring-2 focus:ring-customBlue/15"
                />
              </label>
              <p className="text-xs font-bold text-deepBlue/55" aria-live="polite">
                {loading ?
                  <span className="inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" aria-hidden="true" /> جارٍ التحديث…</span>
                : data?.meta.generatedAt ? `آخر تحديث: ${formatDateTime(data.meta.generatedAt)}` : null}
              </p>
            </div>

            {loading && !data ?
              <div className="space-y-4" aria-busy="true" aria-label="جارٍ التحميل" data-testid="command-center-loading">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
                <Skeleton className="h-11" />
                <div className="grid gap-4 xl:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56" />)}</div>
              </div>
            : data ?
              <div className={cn('space-y-6 transition-opacity', loading && 'opacity-60')}>
                <CommandCenterKpis summary={data.summary} />
                <CommandCenterFilters
                  value={source}
                  onChange={setSource}
                  sources={data.sources}
                  total={data.summary.needs_attention + data.summary.upcoming + data.summary.recent_updates + data.summary.errors}
                />

                <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
                  <div className="grid gap-4 xl:grid-cols-2">
                    {sections.map((s) => (
                      <CommandCenterSection
                        key={s.key}
                        section={s}
                        visibleItems={s.items.filter(matches)}
                        searching={searching}
                        className={s.key === 'needs_attention' ? 'xl:col-span-2' : undefined}
                      />
                    ))}
                  </div>
                  <CommandCenterSourceHealth sources={data.sources} />
                </div>
              </div>
            : null}
          </div>
        )}
      </DashboardPageShell>
    </div>
  )
}
