import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Inbox, RefreshCw, SearchX, ShieldAlert, Plus } from 'lucide-react'
import DashboardPageShell from '@/components/ui/DashboardPageShell'
import { ApproveTicketModal } from '@/components/tickets/modals/ApproveTicketModal'
import { RejectTicketModal } from '@/components/tickets/modals/RejectTicketModal'
import { ReassignTicketModal } from '@/components/tickets/modals/ReassignTicketModal'
import { useAuth } from '@/contexts/AuthContext'
import { useAbortableResource } from '@/hooks/useAbortableResource'
import { useContainerWidth } from '@/hooks/useContainerWidth'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useTicketFilters } from '@/hooks/useTicketFilters'
import { useTicketMeta } from '@/hooks/useTicketMeta'
import { invalidateTicketDetail, prefetchTicketDetail } from '@/services/ticketDetailCache'
import { fetchTicketAnalytics, fetchTicketBoard, fetchTicketInsights, fetchTicketList, fetchTicketStats, httpStatus } from '@/services/ticketOpsService'
import type { Ticket } from '@/types/ticket'
import type { TicketFilters, TicketView } from '@/types/ticketOps'
import { cn } from '@/lib/utils'
import { activeFilterCount, isKpiActive, kpiPatch, toApiParams, type KpiKey } from '@/utils/ticketFilters'
import { TicketBulkBar } from './ops/TicketBulkBar'
import { TicketDetailsModal } from './ops/TicketDetailsModal'
import { TicketFilterBar } from './ops/TicketFilterBar'
import { TicketInsightsPanel } from './ops/TicketInsightsPanel'
import { TicketKanbanBoard } from './ops/TicketKanbanBoard'
import { TicketKpiCards } from './ops/TicketKpiCards'
import { TicketPagination } from './ops/TicketPagination'
import { TicketSavedViews } from './ops/TicketSavedViews'
import { loadColumns, type ColumnKey } from './ops/ticketColumns'
import { ColumnMenu, TicketTable, type RowAction } from './ops/TicketTable'
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from './ops/ticketOpsUi'

// Charts are only needed on the analytics view, so they load on demand and stay out of the main bundle.
const TicketAnalyticsPanel = lazy(() => import('./ops/TicketAnalyticsPanel'))

type ActiveModal = { type: RowAction; ticketId: number; departmentId: number; unitId?: number } | null

/** Below this content width the table needs sideways scrolling, so the card layout is used instead. */
const TABLE_MIN_WIDTH = 900

const VIEW_TABS: { id: TicketView; label: string }[] = [
  { id: 'table', label: 'الجدول' },
  { id: 'board', label: 'لوحة كانبان' },
  { id: 'analytics', label: 'التحليلات' },
]

function StateCard({ icon: Icon, title, body, action, danger = false }: { icon: typeof Inbox; title: string; body: string; action?: React.ReactNode; danger?: boolean }) {
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

function ListSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="جارٍ تحميل التذاكر" data-testid="list-loading">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-deepBlue/[0.06]" />)}
    </div>
  )
}

/**
 * /dashboard/tickets/admin — مركز عمليات التذاكر.
 *
 * The work queue for ticket coordinators: live figures, advanced filters kept in the URL, a table, a
 * board and analytics over the same filters, a details drawer, and safe bulk actions.
 *
 * Nothing here decides what a user may see or do. The API scopes every list, figure and board to the
 * viewer, and every button comes from the per-ticket `capabilities` the server sends (and is
 * re-checked there). This page only presents and navigates.
 */
export default function TechAdminDashboardPage() {
  const { user } = useAuth()
  const nav = useTicketFilters()
  const { filters, view, ticketId, days, search } = nav
  // Table or cards by how much room the CONTENT has (the window minus the sidebar), with the viewport as the fallback before it is measured.
  const [rootRef, rootWidth] = useContainerWidth<HTMLDivElement>()
  const viewportWide = useMediaQuery('(min-width: 768px)')
  const compact = rootWidth > 0 ? rootWidth < TABLE_MIN_WIDTH : !viewportWide
  const meta = useTicketMeta(filters.department ? Number(filters.department) : null)

  const [columns, setColumns] = useState<ColumnKey[]>(loadColumns)
  const [modal, setModal] = useState<ActiveModal>(null)

  // One query per distinct input. The figures follow only the scope filters, so pressing a KPI card
  // or changing the page never re-requests them.
  const listParams = useMemo(() => toApiParams(filters, { lite: true }), [filters])
  const scopeParams = useMemo(() => toApiParams(filters, { scope: true }), [filters])
  const boardParams = useMemo(() => {
    const p = { ...toApiParams(filters) }
    for (const k of ['sort', 'dir', 'per_page', 'page']) delete p[k]

    return p
  }, [filters])
  const listKey = JSON.stringify(listParams)
  const scopeKey = JSON.stringify(scopeParams)
  const boardKey = JSON.stringify(boardParams)

  const list = useAbortableResource((signal) => fetchTicketList(listParams, { signal }), listKey, view === 'table')
  const stats = useAbortableResource((signal) => fetchTicketStats(scopeParams, { signal }), scopeKey)
  const insights = useAbortableResource((signal) => fetchTicketInsights(scopeParams, { signal }), scopeKey)
  const board = useAbortableResource((signal) => fetchTicketBoard(boardParams, 8, { signal }), boardKey, view === 'board')
  const analytics = useAbortableResource((signal) => fetchTicketAnalytics(scopeParams, days, { signal }), `${scopeKey}|${days}`, view === 'analytics')

  // Entering the queue starts from a clean cache: a ticket changed elsewhere (its full page, another tab of work)
  // must not open from an older copy.
  useEffect(() => invalidateTicketDetail(), [])

  const refreshAll = () => {
    // Anything changed from here (row actions, bulk actions) makes every cached copy untrustworthy.
    invalidateTicketDetail()
    list.reload()
    stats.reload()
    insights.reload()
    board.reload()
    analytics.reload()
  }

  // A page past the end (a link from before the data shrank) lands on the last page instead of an empty one.
  const lastPage = list.data?.lastPage ?? 1
  useEffect(() => {
    if (view === 'table' && list.data && !list.loading && filters.page > lastPage) nav.update({ page: lastPage }, { replace: true })
  }, [view, list.data, list.loading, filters.page, lastPage, nav])

  // Selection belongs to ONE filter set: it is simply not applied once the filters change (paging keeps it).
  const filterKey = useMemo(() => {
    const rest = { ...listParams }
    delete rest.page

    return JSON.stringify(rest)
  }, [listParams])
  const [selection, setSelection] = useState<{ key: string; map: Map<number, Ticket> }>({ key: filterKey, map: new Map() })
  const selected = useMemo(() => (selection.key === filterKey ? selection.map : new Map<number, Ticket>()), [selection, filterKey])
  const setSelected = (fn: (m: Map<number, Ticket>) => Map<number, Ticket>) => setSelection({ key: filterKey, map: fn(new Map(selected)) })

  const items = list.data?.items ?? []
  const toggle = (id: number) =>
    setSelected((m) => {
      const t = items.find((x) => x.id === id)
      if (m.has(id)) m.delete(id)
      else if (t) m.set(id, t)

      return m
    })
  const toggleAll = (ids: number[], on: boolean) =>
    setSelected((m) => {
      ids.forEach((id) => {
        const t = items.find((x) => x.id === id)
        if (!on) m.delete(id)
        else if (t) m.set(id, t)
      })

      return m
    })

  const pickKpi = (k: KpiKey) => nav.update(isKpiActive(filters, k) && k !== 'total' ? kpiPatch('total') : kpiPatch(k))
  const apply = (f: TicketFilters) => nav.update({ ...f, page: 1 })
  const drill = (patch: Partial<TicketFilters>) => {
    // From a chart: a clean slate for the card-level filters, keep search/department/dates, and show the table.
    nav.update({ ...kpiPatch('total'), ...patch }, { view: 'table' })
  }

  // The element that opened the ticket gets focus back when the modal closes. `ticket-row`/`card` re-render
  // on refresh, so the id is kept and the element is looked up again at close time when it was replaced.
  const openerRef = useRef<HTMLElement | null>(null)
  const openerId = useRef<number | null>(null)
  const openTicket = useCallback(
    (id: number) => {
      const active = document.activeElement
      openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null
      openerId.current = id
      // The core details are requested in this very event, before React renders the modal: the side panels
      // (suggestions, duplicates) start in effects that run first, and on a server that handles one request
      // at a time the details would otherwise wait behind them. The cache shares this request with the modal.
      prefetchTicketDetail(user?.id, id)
      nav.openTicket(id)
    },
    [nav, user?.id],
  )
  const returnTarget = (): HTMLElement | null => {
    const el = openerRef.current
    if (el?.isConnected) return el
    const id = openerId.current

    return id === null ? null : document.querySelector<HTMLElement>(`[data-ticket-id="${id}"] button[aria-label^="فتح التذكرة"]`)
  }

  // Hover intent: a pointer that rests on a row for a moment warms the details cache, so the click is instant.
  const hoverTimer = useRef<number | undefined>(undefined)
  const onHover = (e: React.PointerEvent<HTMLElement>) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-ticket-id]')
    window.clearTimeout(hoverTimer.current)
    if (!row) return
    const id = Number(row.dataset.ticketId)
    hoverTimer.current = window.setTimeout(() => prefetchTicketDetail(user?.id, id), 120)
  }
  useEffect(() => () => window.clearTimeout(hoverTimer.current), [])

  const previewRow = useMemo<Ticket | null>(() => {
    if (ticketId === null) return null
    const fromList = list.data?.items.find((t) => t.id === ticketId)
    if (fromList) return fromList
    for (const c of board.data ?? []) {
      const t = c.tickets.find((x) => x.id === ticketId)
      if (t) return t
    }

    return null
  }, [ticketId, list.data, board.data])

  const onAction = (a: RowAction, t: Ticket) => setModal({ type: a, ticketId: t.id, departmentId: t.department_id, unitId: t.unit_id ?? undefined })
  const closeModal = () => setModal(null)
  const modalDone = () => {
    closeModal()
    refreshAll()
  }

  const labels = { active: activeFilterCount(filters, { status: STATUS_LABELS, priority: PRIORITY_LABELS, category: CATEGORY_LABELS }) }
  const hasFilters = labels.active > 0
  const total = view === 'table' ? (list.data?.total ?? null) : view === 'board' ? (board.data ? board.data.reduce((n, c) => n + c.count, 0) : null) : (stats.data?.counts.total ?? null)
  const backSearch = useMemo(() => {
    const p = new URLSearchParams(search)
    p.delete('ticket')

    return p.toString()
  }, [search])
  const forbidden = httpStatus(list.error) === 403 || httpStatus(stats.error) === 403

  const tabs = (
    <div role="tablist" aria-label="طريقة العرض" className="inline-flex rounded-2xl bg-deepBlue/[0.06] p-1">
      {VIEW_TABS.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={view === t.id} onClick={() => nav.setView(t.id)} className={cn('rounded-xl px-4 py-2 text-[12px] font-black transition', view === t.id ? 'bg-white text-customBlue shadow-sm' : 'text-deepBlue/60 hover:text-deepBlue')}>
          {t.label}
        </button>
      ))}
    </div>
  )

  return (
    <div ref={rootRef} dir="rtl" className="mx-auto w-full max-w-[1400px] px-1">
      <DashboardPageShell
        eyebrow="لوحة التحكم التقنية"
        title="مركز عمليات التذاكر"
        description="تابع التذاكر، وحدّد ما يحتاج قرارك، وأسنده وراقب التأخير من مكان واحد."
        breadcrumbs={[{ label: 'التذاكر', href: '/dashboard/tickets' }, { label: 'مركز العمليات' }]}
        density="compact"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/dashboard/tickets/new" className="inline-flex items-center gap-2 rounded-xl border border-deepBlue/10 bg-white px-4 py-2.5 text-[12px] font-black text-deepBlue shadow-sm hover:border-customBlue/40">
              <Plus size={14} aria-hidden="true" /> تذكرة جديدة
            </Link>
            <button type="button" onClick={refreshAll} disabled={list.loading || stats.loading} className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-4 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:brightness-110 disabled:opacity-60">
              <RefreshCw size={14} className={cn((list.loading || stats.loading) && 'animate-spin')} aria-hidden="true" /> تحديث
            </button>
          </div>
        }
      >
        {forbidden ?
          <StateCard icon={ShieldAlert} danger title="لا تملك صلاحية عرض التذاكر" body="هذه الصفحة تعرض تذاكر الإدارات التي تتبعها. تواصل مع المسؤول إن كنت تحتاجها." />
        : (
          <div className="space-y-5" onPointerOver={onHover}>
            <TicketKpiCards stats={stats.data} loading={stats.loading} filters={filters} onPick={pickKpi} />
            <TicketInsightsPanel insights={insights.data} loading={insights.loading} onOpen={openTicket} />

            <TicketFilterBar
              filters={filters}
              onChange={nav.update}
              onReset={nav.reset}
              departments={meta.departments}
              assignees={meta.users}
              assigneesLoading={meta.usersLoading}
              total={total}
              loading={view === 'table' ? list.loading : view === 'board' ? board.loading : stats.loading}
              viewsSlot={<TicketSavedViews userId={user?.id} filters={filters} onApply={apply} />}
            />

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2" data-testid="results-toolbar">
              {tabs}
              {view === 'table' && !compact ? <ColumnMenu columns={columns} onColumns={setColumns} /> : null}
            </div>

            {view === 'table' ?
              list.loading && !list.data ?
                <ListSkeleton />
              : list.error && !list.data ?
                <StateCard icon={ShieldAlert} danger title="تعذّر تحميل التذاكر" body="حدث خطأ أثناء جلب البيانات. حاول مرة أخرى." action={<button type="button" onClick={list.reload} className="rounded-xl bg-customOrange px-5 py-2.5 text-sm font-extrabold text-white shadow-emc-md">إعادة المحاولة</button>} />
              : list.data && items.length === 0 ?
                <StateCard
                  icon={hasFilters ? SearchX : Inbox}
                  title={hasFilters ? 'لا توجد تذاكر مطابقة' : 'لا توجد تذاكر'}
                  body={hasFilters ? 'جرّب تغيير الفلاتر أو مسحها.' : 'ستظهر هنا التذاكر المُدخَلة للإدارات التي تتبعها.'}
                  action={hasFilters ? <button type="button" onClick={nav.reset} className="rounded-xl bg-customBlue px-5 py-2.5 text-sm font-extrabold text-white">مسح الفلاتر</button> : undefined}
                />
              : (
                <div className={cn('space-y-4 transition-opacity', list.loading && 'opacity-60')} aria-busy={list.loading}>
                  <TicketTable
                    tickets={items}
                    filters={filters}
                    columns={columns}
                    onSort={(key) => nav.update(filters.sort === key ? { dir: filters.dir === 'asc' ? 'desc' : 'asc' } : { sort: key, dir: key === 'title' || key === 'ticket_number' ? 'asc' : 'desc' })}
                    selected={new Set(selected.keys())}
                    onToggle={toggle}
                    onToggleAll={toggleAll}
                    activeId={ticketId}
                    onOpen={openTicket}
                    onAction={onAction}
                    compact={compact}
                  />
                  <TicketPagination
                    page={list.data?.currentPage ?? filters.page}
                    lastPage={lastPage}
                    total={list.data?.total ?? 0}
                    perPage={filters.perPage}
                    loading={list.loading}
                    onPage={(p) => nav.update({ page: Math.min(Math.max(1, p), lastPage) })}
                    onPerPage={(n) => nav.update({ perPage: n })}
                  />
                </div>
              )
            : null}

            {view === 'board' ?
              board.error && !board.data ?
                <StateCard icon={ShieldAlert} danger title="تعذّر تحميل اللوحة" body="حدث خطأ أثناء جلب البيانات." action={<button type="button" onClick={board.reload} className="rounded-xl bg-customOrange px-5 py-2.5 text-sm font-extrabold text-white">إعادة المحاولة</button>} />
              : board.data ?
                <TicketKanbanBoard
                  columns={board.data}
                  loading={board.loading}
                  activeId={ticketId}
                  onOpen={openTicket}
                  onAction={onAction}
                  onShowAll={(status) => nav.update({ status: [status] }, { view: 'table' })}
                />
              : <ListSkeleton />
            : null}

            {view === 'analytics' ?
              analytics.error && !analytics.data ?
                <StateCard icon={ShieldAlert} danger title="تعذّر تحميل التحليلات" body="حدث خطأ أثناء جلب البيانات." action={<button type="button" onClick={analytics.reload} className="rounded-xl bg-customOrange px-5 py-2.5 text-sm font-extrabold text-white">إعادة المحاولة</button>} />
              : (
                <Suspense fallback={<ListSkeleton />}>
                  <TicketAnalyticsPanel data={analytics.data} loading={analytics.loading} days={days} onDays={nav.setDays} onDrill={drill} />
                </Suspense>
              )
            : null}

            {view === 'table' ?
              <TicketBulkBar
                selected={[...selected.values()]}
                onClear={() => setSelected(() => new Map())}
                onDone={(ok) => {
                  setSelected((m) => {
                    ok.forEach((id) => m.delete(id))

                    return m
                  })
                  refreshAll()
                }}
              />
            : null}
          </div>
        )}
      </DashboardPageShell>

      <TicketDetailsModal
        ticketId={ticketId}
        preview={previewRow}
        userKey={user?.id}
        onClose={nav.closeTicket}
        onChanged={refreshAll}
        onOpenOther={nav.openTicket}
        backSearch={backSearch}
        insight={insights.data?.find((i) => i.ticketId === ticketId)}
        returnFocusTo={returnTarget}
      />

      {modal?.type === 'approve' ? <ApproveTicketModal ticketId={modal.ticketId} departmentId={modal.departmentId} onClose={closeModal} onSuccess={modalDone} /> : null}
      {modal?.type === 'reject' ? <RejectTicketModal ticketId={modal.ticketId} onClose={closeModal} onSuccess={modalDone} /> : null}
      {modal?.type === 'reassign' ? <ReassignTicketModal ticketId={modal.ticketId} departmentId={modal.departmentId} currentUnitId={modal.unitId} onClose={closeModal} onSuccess={modalDone} /> : null}
    </div>
  )
}
