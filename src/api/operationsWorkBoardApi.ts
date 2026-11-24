import apiClient from './axios'
import type { MyWorkColumnKey } from '@/lib/myWorkColumns'
import { MY_WORK_COLUMNS } from '@/lib/myWorkColumns'
import type { TaskPriority, TaskScope } from '@/types/operations'

/**
 * GET /operations/work-board: the GLOBAL board. Every operational task and every assigned ticket of every assignee, in the
 * SAME eight columns as «مهامي ومسؤولياتي» (the server decides the column; the client never re-derives it).
 *
 * A card is a public-safe whitelist: seeing one grants nothing. `capabilities` is the viewer's REAL access:
 * `can_open` says whether the item's own page may be opened; accept / reject / complete exist only for the real assignee.
 * A ticket card the viewer cannot open arrives MASKED (`masked: true`, a generic title, no reference).
 * The old GET /operations/board is untouched and still feeds the task-management screens.
 */

export type WorkBoardKindFilter = 'all' | 'tasks' | 'tickets'
export type WorkBoardScope = 'all' | 'mine'

export interface WorkBoardParams {
  scope?: WorkBoardScope
  kind?: WorkBoardKindFilter
  department_id?: number
  /** At most 100 characters; matches the title (and a ticket's number) of the items the viewer may open. */
  search?: string
  per_column?: number
  /** «Load more» of ONE column: `column` + `page` go together (a page without a column is a 422). */
  column?: MyWorkColumnKey
  page?: number
}

export interface WorkBoardCardCapabilities {
  can_open: boolean
  can_accept: boolean
  can_reject: boolean
  can_complete: boolean
}

export interface WorkBoardCard {
  key: string
  kind: 'task' | 'ticket'
  id: number
  reference: string | null
  title: string
  /** True: the viewer may not open this ticket, so title and reference are placeholders. Read-only, nothing else shown. */
  masked: boolean
  column: MyWorkColumnKey
  status: string
  acceptance: string | null
  stage: string | null
  stage_badge: string | null
  next_step: string | null
  priority: TaskPriority
  due_at: string | null
  is_overdue: boolean
  /** Null for an unassigned task, and for a viewer who is only the reporter of a ticket. */
  assignee: { id: number; name: string } | null
  department: { id: number; name: string } | null
  scope: TaskScope | null
  points: number | null
  hours: number | null
  estimate_hidden: boolean
  is_locked: boolean
  group_id: number | null
  is_mine: boolean
  updated_at: string | null
  capabilities: WorkBoardCardCapabilities
}

export interface WorkBoardColumnData {
  key: MyWorkColumnKey
  label: string
  /** The column's TOTAL under the current filters (not the number of cards loaded). */
  count: number
  counts: { tasks: number; tickets: number }
  has_more: boolean
  items: WorkBoardCard[]
}

export interface WorkBoardMeta {
  scope: WorkBoardScope
  kind: WorkBoardKindFilter
  per_column: number
  column: MyWorkColumnKey | null
  page: number
  /** Totals of the WHOLE board under the filters; always present, also on a «load more» answer. Never recompute them from loaded cards. */
  counts: { all: number; tasks: number; tickets: number }
  generated_at: string | null
}

export interface WorkBoardResult {
  columns: WorkBoardColumnData[]
  meta: WorkBoardMeta
}

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const num = (v: unknown, d = 0): number => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : d)
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)

const COLUMN_KEYS = MY_WORK_COLUMNS.map((c) => c.key)
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical']

const person = (v: unknown): { id: number; name: string } | null => {
  const o = rec(v)

  return o.name == null ? null : { id: num(o.id), name: String(o.name) }
}

/** One card from whatever the server sent; a missing field becomes its safe empty value, never a crash. */
export function normalizeWorkBoardCard(raw: unknown): WorkBoardCard | null {
  const c = rec(raw)
  const kind = c.kind === 'ticket' ? 'ticket' : c.kind === 'task' ? 'task' : null
  const id = num(c.id)
  const column = COLUMN_KEYS.find((k) => k === c.column)
  if (!kind || id <= 0 || !column) return null
  const caps = rec(c.capabilities)
  const priority = PRIORITIES.find((p) => p === c.priority) ?? 'medium'

  return {
    key: typeof c.key === 'string' && c.key !== '' ? c.key : `${kind}:${id}`,
    kind,
    id,
    reference: strOrNull(c.reference),
    title: typeof c.title === 'string' ? c.title : '',
    masked: c.masked === true,
    column,
    status: typeof c.status === 'string' ? c.status : '',
    acceptance: strOrNull(c.acceptance),
    stage: strOrNull(c.stage),
    stage_badge: strOrNull(c.stage_badge),
    next_step: strOrNull(c.next_step),
    priority,
    due_at: strOrNull(c.due_at),
    is_overdue: c.is_overdue === true,
    assignee: person(c.assignee),
    department: person(c.department),
    scope: (strOrNull(c.scope) as TaskScope | null) ?? null,
    points: numOrNull(c.points),
    hours: numOrNull(c.hours),
    estimate_hidden: c.estimate_hidden === true,
    is_locked: c.is_locked === true,
    group_id: numOrNull(c.group_id),
    is_mine: c.is_mine === true,
    updated_at: strOrNull(c.updated_at),
    // A missing flag is «no»: nothing is offered on a guess.
    capabilities: {
      can_open: caps.can_open === true,
      can_accept: caps.can_accept === true,
      can_reject: caps.can_reject === true,
      can_complete: caps.can_complete === true,
    },
  }
}

export async function fetchWorkBoard(params: WorkBoardParams = {}, { signal }: { signal?: AbortSignal } = {}): Promise<WorkBoardResult> {
  const query: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') query[k] = v as string | number

  const res = await apiClient.get<unknown>('/operations/work-board', { params: query, signal, skipErrorToast: true })
  const body = rec(res.data)
  const meta = rec(body.meta)
  const counts = rec(meta.counts)

  return {
    columns: arr(rec(body.data).columns)
      .map((x) => {
        const c = rec(x)
        const key = COLUMN_KEYS.find((k) => k === c.key)
        if (!key) return null
        const cc = rec(c.counts)

        return {
          key,
          label: typeof c.label === 'string' ? c.label : '',
          count: num(c.count),
          counts: { tasks: num(cc.tasks), tickets: num(cc.tickets) },
          has_more: c.has_more === true,
          items: arr(c.items).map(normalizeWorkBoardCard).filter((i): i is WorkBoardCard => i !== null),
        } satisfies WorkBoardColumnData
      })
      .filter((c): c is WorkBoardColumnData => c !== null),
    meta: {
      scope: meta.scope === 'mine' ? 'mine' : 'all',
      kind: meta.kind === 'tasks' || meta.kind === 'tickets' ? meta.kind : 'all',
      per_column: num(meta.per_column, 30),
      column: COLUMN_KEYS.find((k) => k === meta.column) ?? null,
      page: num(meta.page, 1),
      counts: { all: num(counts.all), tasks: num(counts.tasks), tickets: num(counts.tickets) },
      generated_at: strOrNull(meta.generated_at),
    },
  }
}
