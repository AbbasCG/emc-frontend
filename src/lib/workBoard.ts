import type { BoardTask } from '@/api/operationsBoardApi'
import type { WorkBoardCard, WorkBoardColumnData } from '@/api/operationsWorkBoardApi'
import type { OpsTask } from '@/types/operations'
import { MY_WORK_COLUMNS, type MyWorkColumnKey } from './myWorkColumns'

/**
 * The global board's client-side state, as pure functions (the hook only holds them).
 *
 * The COLUMN of a card is the server's answer (the very map «مهامي ومسؤولياتي» uses); nothing here decides it. What this
 * file does is bookkeeping: eight columns always present, «load more» pages appended without ever repeating a card, and the
 * quick views that only look at fields already on the card.
 */

/** Cards per column on the first screen and per «load more» page. */
export const WORK_BOARD_PAGE_SIZE = 30
/** The most one quiet refresh asks for per column (three pages), so a refresh never grows without bound. */
export const WORK_BOARD_MAX_REFRESH = 90

export interface BoardColumnState {
  key: MyWorkColumnKey
  /** The column's total under the current filters, as the server counted it. */
  count: number
  counts: { tasks: number; tickets: number }
  hasMore: boolean
  /** The last page loaded for this column (1 = the first screen). */
  page: number
  items: WorkBoardCard[]
}

export type BoardColumns = Record<MyWorkColumnKey, BoardColumnState>

export function emptyColumns(): BoardColumns {
  return Object.fromEntries(MY_WORK_COLUMNS.map((c) => [c.key, { key: c.key, count: 0, counts: { tasks: 0, tickets: 0 }, hasMore: false, page: 1, items: [] }])) as unknown as BoardColumns
}

/**
 * The columns of a read that asked for `perColumn` cards per column (a multiple of the page size): replaces everything.
 * `page` is how many pages that read covers, so the next «load more» asks for the page AFTER them and returns new rows.
 */
export function columnsFromRead(cols: WorkBoardColumnData[], perColumn: number = WORK_BOARD_PAGE_SIZE): BoardColumns {
  const page = Math.max(1, Math.round(perColumn / WORK_BOARD_PAGE_SIZE))
  const out = emptyColumns()
  for (const c of cols) out[c.key] = { key: c.key, count: c.count, counts: c.counts, hasMore: c.has_more, page, items: c.items }

  return out
}

/** One more page of ONE column, appended after what is there. Counts and `has_more` come from the answer. */
export function appendColumnPage(current: BoardColumns, col: WorkBoardColumnData, page: number): BoardColumns {
  const prev = current[col.key]
  const have = new Set(prev.items.map((i) => i.key))

  return { ...current, [col.key]: { key: col.key, count: col.count, counts: col.counts, hasMore: col.has_more, page, items: [...prev.items, ...col.items.filter((i) => !have.has(i.key))] } }
}

/**
 * Each card exactly once on the whole board: the first occurrence of a key wins (columns in their order). A card that moved
 * columns between two reads, or a page that overlapped the previous one, can never show twice.
 */
export function dedupeBoard(cols: BoardColumns): BoardColumns {
  const seen = new Set<string>()
  const out = { ...cols }
  for (const { key } of MY_WORK_COLUMNS) {
    out[key] = { ...cols[key], items: cols[key].items.filter((i) => (seen.has(i.key) ? false : (seen.add(i.key), true))) }
  }

  return out
}

export type QuickView = 'all' | 'pending_eval' | 'unassigned' | 'rejected'

/** The three management quick views of the old board. They read fields on the card only (status / acceptance / assignee). */
export function matchesQuickView(card: WorkBoardCard, view: QuickView): boolean {
  switch (view) {
    case 'pending_eval': return card.kind === 'task' && card.status === 'needs_evaluation'
    case 'unassigned': return card.assignee === null && card.kind === 'task'
    case 'rejected': return card.kind === 'task' && card.acceptance === 'rejected'
    default: return true
  }
}

/** Every loaded card, in column order. */
export function allCards(cols: BoardColumns): WorkBoardCard[] {
  return MY_WORK_COLUMNS.flatMap((c) => cols[c.key].items)
}

export const anyHasMore = (cols: BoardColumns): boolean => MY_WORK_COLUMNS.some((c) => cols[c.key].hasMore)

/**
 * How many cards per column a quiet refresh asks for: enough pages to cover what the fullest column has loaded (so a refresh
 * never shrinks a column the user opened further), always a whole number of pages (so `page` stays exact), at most `max`.
 */
export function refreshSize(cols: BoardColumns, base: number, max: number): number {
  const loaded = Math.max(0, ...MY_WORK_COLUMNS.map((c) => cols[c.key].items.length))
  const pages = Math.max(1, Math.ceil(Math.max(base, loaded) / base))

  return Math.min(Math.floor(max / base) * base, pages * base)
}

/**
 * What the evaluate / reassign dialogs read of a task. The public card gives the basics; `detail` (the task as the drawer loaded
 * it, through the authorised endpoint) adds what a card never carries: the description and the decline reason of the member.
 */
export function cardToBoardTask(c: WorkBoardCard, detail?: OpsTask | null): BoardTask {
  const same = detail != null && detail.id === c.id ? detail : null

  return {
    id: c.id,
    title: c.title,
    description: same?.description ?? null,
    rejection_reason: same?.rejection_reason ?? null,
    priority: c.priority === 'critical' ? 'urgent' : c.priority,
    task_scope: c.scope,
    points: c.points,
    estimated_hours: c.hours,
    status: c.status,
    acceptance_status: c.acceptance === 'pending' || c.acceptance === 'accepted' || c.acceptance === 'rejected' ? c.acceptance : undefined,
    locked_at: c.is_locked ? 'locked' : null,
    locked_by: null,
    due_date: c.due_at,
    department: c.department,
    assigned_to: c.assignee,
  }
}
