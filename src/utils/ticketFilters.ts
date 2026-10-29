import type { TicketCategory, TicketPriority, TicketStatus } from '@/types/ticket'
import type { SavedTicketView, TicketFilters, TicketSortKey, TicketView } from '@/types/ticketOps'

/**
 * The ticket work queue's filter model: one place that knows the URL vocabulary, validates it,
 * turns it into an API query, and describes it as removable chips.
 *
 * Pure functions only. The URL is the source of truth (refresh, back/forward and shared links all
 * work from it), and everything read from it is validated here, so a hand-edited or stale link can
 * never reach the API as an invalid value.
 *
 * Changing the PAGE never touches any other filter: `withFilters` merges into what is there and
 * resets `page` only when a filter other than `page` changes (the earlier bug erased the query
 * string when it reset the page).
 */

export const TICKET_STATUSES: TicketStatus[] = ['PENDING_APPROVAL', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'UNRESOLVED', 'REJECTED_BY_ADMIN', 'REJECTED_BY_ASSIGNEE']
export const TICKET_PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
export const TICKET_CATEGORIES: TicketCategory[] = ['OLD_ISSUE', 'NEW_SUGGESTION']
export const SORT_KEYS: TicketSortKey[] = ['created_at', 'updated_at', 'priority', 'status', 'ticket_number', 'title', 'due', 'last_activity']
export const PAGE_SIZES = [10, 25, 50, 100] as const
export const VIEWS: TicketView[] = ['table', 'board', 'analytics']
export const ANALYTICS_WINDOWS = [7, 14, 30, 90] as const

export const DEFAULT_FILTERS: TicketFilters = {
  search: '',
  status: [],
  priority: [],
  category: '',
  department: '',
  assignee: '',
  unassigned: false,
  mine: false,
  attention: false,
  overdue: false,
  state: '',
  sla: '',
  createdFrom: '',
  createdTo: '',
  dueFrom: '',
  dueTo: '',
  sort: 'created_at',
  dir: 'desc',
  perPage: 25,
  page: 1,
}

/** URL parameter names owned by the filters (everything else, such as `view` or `ticket`, is left alone). */
export const FILTER_PARAM_KEYS = [
  'search', 'status', 'priority', 'category', 'dept', 'assignee', 'unassigned', 'mine', 'attention', 'overdue', 'delayed',
  'state', 'sla', 'created_from', 'created_to', 'due_from', 'due_to', 'sort', 'dir', 'per_page', 'page',
] as const

/**
 * The filters the KPI cards select among. Statistics ignore them (see TicketQuery::KPI_TOGGLES), and
 * applying a KPI replaces exactly these and nothing else.
 */
export const KPI_FILTER_KEYS = ['status', 'priority', 'overdue', 'unassigned', 'state', 'sla', 'attention', 'mine'] as const

const isoDay = (v: string | null): string => {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return ''
  const d = new Date(`${v}T00:00:00Z`)
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? '' : v
}
const posInt = (v: string | null): string => (v && /^[1-9]\d{0,9}$/.test(v) ? v : '')
const list = <T extends string>(v: string | null, allowed: readonly T[]): T[] =>
  [...new Set((v ?? '').split(',').map((x) => x.trim()).filter((x): x is T => (allowed as readonly string[]).includes(x)))]
const flag = (v: string | null) => v === '1' || v === 'true'
const one = <T extends string>(v: string | null, allowed: readonly T[]): T | '' => ((allowed as readonly string[]).includes(v ?? '') ? (v as T) : '')

/** Read and validate the filters from a query string. Anything unrecognised is dropped, never passed on. */
export function parseFilters(params: URLSearchParams): TicketFilters {
  const createdFrom = isoDay(params.get('created_from'))
  const dueFrom = isoDay(params.get('due_from'))
  const createdTo = isoDay(params.get('created_to'))
  const dueTo = isoDay(params.get('due_to'))
  const size = Number(params.get('per_page'))
  const page = Number(params.get('page'))

  return {
    search: (params.get('search') ?? '').slice(0, 100),
    status: list(params.get('status'), TICKET_STATUSES),
    priority: list(params.get('priority'), TICKET_PRIORITIES),
    category: one(params.get('category'), TICKET_CATEGORIES),
    department: posInt(params.get('dept')),
    assignee: posInt(params.get('assignee')),
    unassigned: flag(params.get('unassigned')),
    mine: flag(params.get('mine')),
    attention: flag(params.get('attention')),
    // `delayed=1` is the parameter the page used before the redesign; old links keep working.
    overdue: flag(params.get('overdue')) || flag(params.get('delayed')),
    state: one(params.get('state'), ['open', 'closed'] as const),
    sla: one(params.get('sla'), ['overdue', 'due_soon', 'on_track', 'none'] as const),
    // An end before its start is kept (so the form can say what is wrong) and is never sent: see toApiParams.
    createdFrom,
    createdTo,
    dueFrom,
    dueTo,
    sort: one(params.get('sort'), SORT_KEYS) || DEFAULT_FILTERS.sort,
    dir: params.get('dir') === 'asc' ? 'asc' : 'desc',
    perPage: (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_FILTERS.perPage,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  }
}

/** Write the filters to a query string, omitting everything that is at its default. */
export function filtersToParams(f: TicketFilters): URLSearchParams {
  const p = new URLSearchParams()
  const set = (k: string, v: string) => {
    if (v) p.set(k, v)
  }
  set('search', f.search.trim())
  set('status', f.status.join(','))
  set('priority', f.priority.join(','))
  set('category', f.category)
  set('dept', f.department)
  set('assignee', f.assignee)
  if (f.unassigned) p.set('unassigned', '1')
  if (f.mine) p.set('mine', '1')
  if (f.attention) p.set('attention', '1')
  if (f.overdue) p.set('overdue', '1')
  set('state', f.state)
  set('sla', f.sla)
  set('created_from', f.createdFrom)
  set('created_to', f.createdTo)
  set('due_from', f.dueFrom)
  set('due_to', f.dueTo)
  if (f.sort !== DEFAULT_FILTERS.sort) p.set('sort', f.sort)
  if (f.dir !== DEFAULT_FILTERS.dir) p.set('dir', f.dir)
  if (f.perPage !== DEFAULT_FILTERS.perPage) p.set('per_page', String(f.perPage))
  if (f.page > 1) p.set('page', String(f.page))

  return p
}

/** Does this patch change any filter other than the page itself? (Then the page must go back to 1.) */
const changesFilters = (patch: Partial<TicketFilters>, current: TicketFilters): boolean =>
  (Object.keys(patch) as (keyof TicketFilters)[]).some((k) => k !== 'page' && JSON.stringify(patch[k]) !== JSON.stringify(current[k]))

/** Merge a patch into the filters. The page resets to 1 only when a different filter changed and the patch did not set a page. */
export function withFilters(current: TicketFilters, patch: Partial<TicketFilters>): TicketFilters {
  const next = { ...current, ...patch }
  if (!('page' in patch) && changesFilters(patch, current)) next.page = 1

  return next
}

/** The same query string with the filters replaced and every unrelated parameter (view, ticket, days) kept. */
export function mergeIntoParams(prev: URLSearchParams, filters: TicketFilters): URLSearchParams {
  const next = new URLSearchParams(prev)
  FILTER_PARAM_KEYS.forEach((k) => next.delete(k))
  filtersToParams(filters).forEach((v, k) => next.set(k, v))

  return next
}

/** A date range's end may be sent only when it does not precede its start. */
export const rangeEndOk = (from: string, to: string): boolean => !from || !to || to >= from

type Query = Record<string, string | number>

/**
 * The API query for the list, board, stats and insights.
 * `scope` keeps only what the statistics honour (see KPI_FILTER_KEYS) and drops paging and sorting.
 */
export function toApiParams(f: TicketFilters, opts: { scope?: boolean; lite?: boolean } = {}): Query {
  const q: Query = {}
  const put = (k: string, v: string | number | boolean | undefined) => {
    if (v !== '' && v !== false && v !== undefined) q[k] = v === true ? 1 : v
  }

  put('search', f.search.trim())
  put('ticket_category', f.category)
  put('department_id', f.department)
  put('assigned_to_id', f.assignee)
  put('created_from', f.createdFrom)
  put('created_to', rangeEndOk(f.createdFrom, f.createdTo) ? f.createdTo : '')
  put('due_from', f.dueFrom)
  put('due_to', rangeEndOk(f.dueFrom, f.dueTo) ? f.dueTo : '')

  if (!opts.scope) {
    put('status', f.status.join(','))
    put('priority', f.priority.join(','))
    put('unassigned', f.unassigned)
    put('mine', f.mine)
    put('attention', f.attention)
    put('overdue', f.overdue)
    put('state', f.state)
    put('sla', f.sla)
    put('sort', f.sort)
    put('dir', f.dir)
    put('per_page', f.perPage)
    if (f.page > 1) q.page = f.page
    if (opts.lite) q.lite = 1
  }

  return q
}

export type KpiKey = 'total' | 'pending' | 'open' | 'inProgress' | 'resolved' | 'closed' | 'overdue' | 'unassigned' | 'highPriority'

const CLEAR_KPI: Partial<TicketFilters> = { status: [], priority: [], overdue: false, unassigned: false, state: '', sla: '', attention: false, mine: false }

/** The filter patch a KPI card applies: it replaces the card-level filters and keeps everything else. */
export function kpiPatch(kpi: KpiKey): Partial<TicketFilters> {
  switch (kpi) {
    case 'pending': return { ...CLEAR_KPI, status: ['PENDING_APPROVAL'] }
    case 'open': return { ...CLEAR_KPI, state: 'open' }
    case 'inProgress': return { ...CLEAR_KPI, status: ['IN_PROGRESS'] }
    case 'resolved': return { ...CLEAR_KPI, status: ['RESOLVED'] }
    case 'closed': return { ...CLEAR_KPI, state: 'closed' }
    case 'overdue': return { ...CLEAR_KPI, overdue: true }
    case 'unassigned': return { ...CLEAR_KPI, state: 'open', unassigned: true }
    case 'highPriority': return { ...CLEAR_KPI, state: 'open', priority: ['HIGH', 'CRITICAL'] }
    default: return { ...CLEAR_KPI }
  }
}

/** Is this card the one currently applied? */
export function isKpiActive(f: TicketFilters, kpi: KpiKey): boolean {
  const target = withFilters(DEFAULT_FILTERS, kpiPatch(kpi))

  return KPI_FILTER_KEYS.every((k) => JSON.stringify(f[k]) === JSON.stringify(target[k]))
}

export interface FilterChip {
  key: string
  label: string
  /** The patch that removes just this chip. */
  remove: Partial<TicketFilters>
}

export interface ChipLabels {
  status: Record<string, string>
  priority: Record<string, string>
  category: Record<string, string>
  departmentName?: (id: string) => string | undefined
  assigneeName?: (id: string) => string | undefined
}

const SLA_LABEL = { overdue: 'متأخرة', due_soon: 'تستحق قريبًا', on_track: 'ضمن الموعد', none: 'بلا موعد' } as const

/** Active filters as removable chips. Sorting and paging are not filters and never appear. */
export function describeFilters(f: TicketFilters, l: ChipLabels): FilterChip[] {
  const chips: FilterChip[] = []
  const add = (key: string, label: string, remove: Partial<TicketFilters>) => chips.push({ key, label, remove })

  if (f.search.trim()) add('search', `بحث: ${f.search.trim()}`, { search: '' })
  f.status.forEach((s) => add(`status:${s}`, l.status[s] ?? s, { status: f.status.filter((x) => x !== s) }))
  f.priority.forEach((p) => add(`priority:${p}`, `أولوية: ${l.priority[p] ?? p}`, { priority: f.priority.filter((x) => x !== p) }))
  if (f.category) add('category', l.category[f.category] ?? f.category, { category: '' })
  if (f.department) add('department', `الإدارة: ${l.departmentName?.(f.department) ?? `#${f.department}`}`, { department: '' })
  if (f.assignee) add('assignee', `المكلف: ${l.assigneeName?.(f.assignee) ?? `#${f.assignee}`}`, { assignee: '' })
  if (f.unassigned) add('unassigned', 'بلا مكلف', { unassigned: false })
  if (f.mine) add('mine', 'المسندة إليّ', { mine: false })
  if (f.attention) add('attention', 'تحتاج إجرائي', { attention: false })
  if (f.overdue) add('overdue', 'متأخرة', { overdue: false })
  if (f.state) add('state', f.state === 'open' ? 'مفتوحة' : 'مغلقة', { state: '' })
  if (f.sla) add('sla', `الموعد: ${SLA_LABEL[f.sla]}`, { sla: '' })
  if (f.createdFrom || f.createdTo) add('created', `الإنشاء: ${f.createdFrom || '…'} ← ${f.createdTo || '…'}`, { createdFrom: '', createdTo: '' })
  if (f.dueFrom || f.dueTo) add('due', `الاستحقاق: ${f.dueFrom || '…'} ← ${f.dueTo || '…'}`, { dueFrom: '', dueTo: '' })

  return chips
}

/** Number of filters a user would clear with "reset" (chips, excluding sort/paging). */
export const activeFilterCount = (f: TicketFilters, l: ChipLabels) => describeFilters(f, l).length

/** The query string a saved view stores: filters only, with no page, no drawer and no view mode. */
export function savedQueryOf(f: TicketFilters): string {
  return filtersToParams({ ...f, page: 1 }).toString()
}

/** Filters from a saved view, revalidated like any URL (a stored view can be stale or tampered with). */
export function filtersFromSaved(view: Pick<SavedTicketView, 'query'>): TicketFilters {
  return parseFilters(new URLSearchParams(view.query))
}

/** The view mode in the URL, validated. */
export function parseView(params: URLSearchParams): TicketView {
  const v = params.get('view')

  return (VIEWS as string[]).includes(v ?? '') ? (v as TicketView) : 'table'
}

/** The ticket id of the open drawer in the URL, or null. */
export function parseTicketParam(params: URLSearchParams): number | null {
  const v = params.get('ticket')

  return v && /^[1-9]\d{0,9}$/.test(v) ? Number(v) : null
}

/** Ready-made views. They are only filter sets: opening one runs the normal query and the server still scopes it. */
export const TICKET_PRESETS: { id: string; label: string; patch: Partial<TicketFilters> }[] = [
  { id: 'mine', label: 'مهامي المفتوحة', patch: { mine: true, state: 'open' } },
  { id: 'attention', label: 'تحتاج إجرائي', patch: { attention: true } },
  { id: 'pending', label: 'بانتظار الاعتماد', patch: { status: ['PENDING_APPROVAL'] } },
  { id: 'unassigned', label: 'بلا مكلف', patch: { unassigned: true, state: 'open' } },
  { id: 'high', label: 'أولوية عالية', patch: { priority: ['HIGH', 'CRITICAL'], state: 'open' } },
  { id: 'overdue', label: 'متأخرة', patch: { overdue: true } },
  { id: 'recent', label: 'حُلّت مؤخرًا', patch: { status: ['RESOLVED'], sort: 'updated_at', dir: 'desc' } },
]

