import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Inbox, Loader2, Lock, RefreshCw, ShieldAlert } from 'lucide-react'
import DashboardPageShell from '@/components/ui/DashboardPageShell'
import toast from '@/lib/toast'
import { cn } from '@/lib/utils'
import {
  classifyIncomingError,
  createOpportunityDraft,
  fetchDraftSuggestion,
  fetchIncomingRequests,
  incomingErrorMessage,
  updateIncomingRequestStatus,
  updateOpportunityDraft,
  type HrRequestStatus,
  type IncomingList,
  type IncomingRequest,
  type OpportunityDraft,
} from '@/api/hrIncomingRequestsApi'
import { IncomingFilters } from '@/components/hrIncoming/IncomingFilters'
import { IncomingKpis } from '@/components/hrIncoming/IncomingKpis'
import { IncomingRequestCard } from '@/components/hrIncoming/IncomingRequestCard'
import { OpportunityDraftModal } from '@/components/hrIncoming/OpportunityDraftModal'
import { RequestDetailsModal } from '@/components/hrIncoming/RequestDetailsModal'
import { NestedLayer } from '@/components/ui/NestedLayer'
import { EMPTY_FILTERS, type IncomingFilterState, type MatchState } from '@/components/hrIncoming/hrIncomingUi'

/**
 * /dashboard/hr/incoming-requests — الطلبات الواردة.
 *
 * HR's workspace for department staffing needs: a filterable list, a centered details window, smart
 * volunteer matching and draft vacancy opportunities. It is decision support only. It never
 * assigns or contacts a volunteer, sends anything, or publishes anything.
 *
 * Every permission decision comes from the server (the `capabilities` it returns and 403s); the
 * page only shows or hides controls to match, and an action the server refuses is reported.
 */

const EMPTY_STATS = { total: 0, pending: 0, inProgress: 0, approved: 0, rejected: 0, withDrafts: 0 }
const NO_CAPS = { canViewAll: false, canManage: false, canMatchVolunteers: false, canCreateDraft: false }

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-deepBlue/[0.06]', className)} />
}

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

export default function HrIncomingRequestsPage() {
  const [filters, setFilters] = useState<IncomingFilterState>(EMPTY_FILTERS)
  const [appliedQ, setAppliedQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<IncomingList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'forbidden' | 'error' | null>(null)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const [found, setFound] = useState<Record<number, number>>({})
  const [draftBusy, setDraftBusy] = useState(false)
  const [draftForm, setDraftForm] = useState<{ requestId: number; initial: OpportunityDraft; existing: boolean } | null>(null)
  const requestRef = useRef(0)

  // Typing in the search box waits a moment before it hits the server.
  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedQ(filters.q)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [filters.q])

  const load = useCallback(async () => {
    const request = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await fetchIncomingRequests({ q: appliedQ, status: filters.status, departmentId: filters.departmentId, hasDraft: filters.hasDraft, dateFrom: filters.dateFrom, dateTo: filters.dateTo, page })
      if (request !== requestRef.current) return
      setData(res)
    } catch (e) {
      if (request !== requestRef.current) return
      setData(null)
      setError(classifyIncomingError(e) === 'forbidden' ? 'forbidden' : 'error')
    } finally {
      if (request === requestRef.current) setLoading(false)
    }
  }, [appliedQ, filters.status, filters.departmentId, filters.hasDraft, filters.dateFrom, filters.dateTo, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when a filter or the page changes; the loading flag must reset before the request
    void load()
  }, [load])

  function changeFilters(next: IncomingFilterState) {
    setFilters(next)
    if (next.q === filters.q) setPage(1)
  }

  const items = useMemo(() => data?.items ?? [], [data])
  const caps = data?.capabilities ?? NO_CAPS
  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId])

  const matchState = (r: IncomingRequest): MatchState =>
    r.draft ? 'draft_created' : found[r.id] === undefined ? 'not_searched' : found[r.id] > 0 ? 'has_candidates' : 'no_candidates'

  async function changeStatus(status: HrRequestStatus) {
    if (!selected) return
    setStatusBusy(true)
    try {
      await updateIncomingRequestStatus(selected.id, status)
      toast.success('تم تحديث حالة الطلب.')
      await load()
    } catch (e) {
      toast.error(incomingErrorMessage(e, 'تعذّر تحديث حالة الطلب.'))
    } finally {
      setStatusBusy(false)
    }
  }

  async function openDraft() {
    if (!selected || draftBusy) return
    setDraftBusy(true)
    try {
      const { suggestion, existing } = await fetchDraftSuggestion(selected.id)
      setDraftForm({ requestId: selected.id, initial: existing ?? suggestion, existing: existing !== null })
    } catch (e) {
      toast.error(classifyIncomingError(e) === 'forbidden' ? 'لا تملك صلاحية إنشاء مسودة فرصة.' : incomingErrorMessage(e, 'تعذّر تجهيز مسودة الفرصة.'))
    } finally {
      setDraftBusy(false)
    }
  }

  function draftSaved() {
    toast.success('تم حفظ مسودة الفرصة. لم تُنشر للعامة.')
    setDraftForm(null)
    void load()
  }

  const refresh = (
    <button
      type="button"
      onClick={() => void load()}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border border-deepBlue/10 bg-white px-4 py-2.5 text-xs font-black text-deepBlue shadow-sm transition hover:bg-customBlue/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw size={14} className={cn(loading && 'animate-spin')} aria-hidden="true" />
      تحديث
    </button>
  )

  return (
    <div dir="rtl" className="mx-auto w-full max-w-6xl">
      <DashboardPageShell
        eyebrow="الموارد البشرية"
        title="الطلبات الواردة"
        description="إدارة طلبات الاحتياج الوظيفي الواردة من مختلف الأقسام"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/dashboard/hr' }, { label: 'الطلبات الواردة' }]}
        actions={refresh}
      >
        {error === 'forbidden' ?
          <StateCard icon={Lock} danger title="لا تملك صلاحية عرض الطلبات الواردة" body="هذه الصفحة خاصة بفريق الموارد البشرية والإدارات المعنية. تواصل مع المسؤول إن كنت تحتاجها." />
        : (
          <div className="space-y-5">
            {data ? <IncomingKpis stats={data.stats ?? EMPTY_STATS} /> : null}
            <IncomingFilters value={filters} onChange={changeFilters} departments={data?.departments ?? []} />

            {loading && !data ?
              <div className="space-y-3" aria-busy="true" aria-label="جارٍ التحميل" data-testid="incoming-loading">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
              </div>
            : error ?
              <StateCard
                icon={ShieldAlert}
                danger
                title="تعذّر تحميل الطلبات الواردة"
                body="حدث خطأ أثناء جلب البيانات. حاول مرة أخرى."
                action={<button type="button" onClick={() => void load()} className="rounded-xl bg-customOrange px-5 py-2.5 text-sm font-extrabold text-white shadow-emc-md">إعادة المحاولة</button>}
              />
            : data && items.length === 0 ?
              <StateCard
                icon={Inbox}
                title={JSON.stringify(filters) === JSON.stringify(EMPTY_FILTERS) ? 'لا توجد طلبات واردة' : 'لا توجد نتائج مطابقة'}
                body={JSON.stringify(filters) === JSON.stringify(EMPTY_FILTERS) ? 'ستظهر هنا طلبات الاحتياج التي ترسلها الأقسام.' : 'جرّب تغيير التصفية أو مسحها.'}
              />
            : (
              <div className={cn('space-y-4 transition-opacity', loading && 'opacity-60')}>
                <ul className="space-y-3" aria-label="قائمة الطلبات">
                  {items.map((r) => <IncomingRequestCard key={r.id} request={r} matchState={matchState(r)} onOpen={() => setSelectedId(r.id)} />)}
                </ul>

                {data && data.meta.lastPage > 1 ?
                  <nav aria-label="التنقل بين الصفحات" className="flex items-center justify-center gap-3">
                    <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="inline-flex items-center gap-1 rounded-xl border border-deepBlue/10 bg-white px-3.5 py-2 text-xs font-black text-deepBlue disabled:opacity-50">
                      <ChevronRight size={14} aria-hidden="true" /> السابق
                    </button>
                    <span className="text-xs font-bold text-deepBlue/60">صفحة {data.meta.currentPage} من {data.meta.lastPage}</span>
                    <button type="button" onClick={() => setPage((p) => Math.min(data.meta.lastPage, p + 1))} disabled={page >= data.meta.lastPage || loading} className="inline-flex items-center gap-1 rounded-xl border border-deepBlue/10 bg-white px-3.5 py-2 text-xs font-black text-deepBlue disabled:opacity-50">
                      التالي <ChevronLeft size={14} aria-hidden="true" />
                    </button>
                  </nav>
                : null}
              </div>
            )}

            {loading && data ?
              <p className="flex items-center justify-center gap-2 text-xs font-bold text-deepBlue/55" role="status"><Loader2 size={13} className="animate-spin" aria-hidden="true" /> جارٍ التحديث…</p>
            : null}
          </div>
        )}
      </DashboardPageShell>

      <RequestDetailsModal
        request={selected}
        capabilities={caps}
        onClose={() => setSelectedId(null)}
        onStatus={(s) => void changeStatus(s)}
        statusBusy={statusBusy}
        onMatchResult={(n) => selected && setFound((f) => ({ ...f, [selected.id]: n }))}
        onOpenDraft={() => void openDraft()}
        draftBusy={draftBusy}
      />

      {draftForm ?
        <NestedLayer>
        <OpportunityDraftModal
          key={`${draftForm.requestId}-${draftForm.existing}`}
          open
          initial={draftForm.initial}
          onSubmit={(input) => (draftForm.existing ? updateOpportunityDraft(draftForm.requestId, input) : createOpportunityDraft(draftForm.requestId, input))}
          onClose={() => setDraftForm(null)}
          onSaved={draftSaved}
        />
        </NestedLayer>
      : null}
    </div>
  )
}
