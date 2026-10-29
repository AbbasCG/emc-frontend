import axios from 'axios'
import apiClient from '@/api/axios'
import type { ReporterTicket, Ticket, TicketPriority, TicketStatus } from '@/types/ticket'
import type {
  AssignmentSuggestions,
  BoardColumn,
  BulkRequest,
  BulkResult,
  DuplicateHint,
  InsightSeverity,
  TicketAnalytics,
  TicketInsight,
  TicketListResult,
  TicketStats,
} from '@/types/ticketOps'

/**
 * Client for the ticket work queue (list, statistics, board, analytics, insights, hints, priority,
 * bulk). The server decides what any user may see or do; this file only moves data and normalizes
 * it so a missing or partial field never crashes a screen.
 *
 * Every read takes an AbortSignal so a superseded request (a filter changed again) is cancelled and
 * its late answer can never overwrite a newer one.
 */

type Query = Record<string, string | number>
type Opts = { signal?: AbortSignal }

const silent = { skipErrorToast: true as const }

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const num = (v: unknown, d = 0): number => (Number.isFinite(Number(v)) ? Number(v) : d)
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v))
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : v == null ? d : String(v))

export const isCancelled = (e: unknown): boolean => axios.isCancel(e) || (e instanceof DOMException && e.name === 'AbortError')

/** HTTP status of a failed request, or null. */
export const httpStatus = (e: unknown): number | null => (axios.isAxiosError(e) ? (e.response?.status ?? null) : null)

/** The server's message for a failed request, when it sent one. */
export function apiMessage(e: unknown, fallback: string): string {
  if (!axios.isAxiosError(e)) return fallback
  const d = rec(e.response?.data)
  const errors = rec(d.errors)
  const first = Object.values(errors).flatMap((v) => (Array.isArray(v) ? v : [v]))[0]

  return (typeof first === 'string' && first) || (typeof d.message === 'string' && d.message) || fallback
}

export async function fetchTicketList(params: Query, { signal }: Opts = {}): Promise<TicketListResult> {
  const res = await apiClient.get<unknown>('/v1/tickets', { params, signal, ...silent })
  const page = rec(rec(res.data).data)

  return {
    items: arr(page.data) as Ticket[],
    total: num(page.total),
    currentPage: num(page.current_page, 1),
    lastPage: Math.max(1, num(page.last_page, 1)),
    perPage: num(page.per_page, 25),
  }
}

/** One ticket as the server presents it to THIS viewer (the full staff payload, or the reporter-safe one). */
export async function fetchTicketDetail(id: number, { signal }: Opts = {}): Promise<Ticket | ReporterTicket> {
  const res = await apiClient.get<unknown>(`/v1/tickets/${id}`, { signal, ...silent })
  const data = rec(rec(res.data).data)
  if (num(data.id) <= 0) throw new Error('empty ticket payload')

  return data as unknown as Ticket | ReporterTicket
}

export async function fetchTicketStats(params: Query, { signal }: Opts = {}): Promise<TicketStats> {
  const res = await apiClient.get<unknown>('/v1/tickets/stats', { params, signal, ...silent })
  const d = rec(rec(res.data).data)
  const c = rec(d.counts)
  const t = rec(d.timings)
  const defs = rec(t.definitions)
  const scope = rec(d.scope)

  return {
    counts: {
      total: num(c.total), pendingApproval: num(c.pending_approval), assigned: num(c.assigned), inProgress: num(c.in_progress),
      resolved: num(c.resolved), unresolved: num(c.unresolved), rejectedByAdmin: num(c.rejected_by_admin), rejectedByAssignee: num(c.rejected_by_assignee),
      open: num(c.open), closed: num(c.closed), overdue: num(c.overdue), dueSoon: num(c.due_soon), unassigned: num(c.unassigned),
      highPriority: num(c.high_priority), new24h: num(c.new_24h),
    },
    timings: {
      windowDays: num(t.window_days, 30),
      avgResponseHours: numOrNull(t.avg_response_hours),
      responseSample: num(t.response_sample),
      avgResolutionHours: numOrNull(t.avg_resolution_hours),
      resolutionSample: num(t.resolution_sample),
      truncated: t.truncated === true,
      definitions: { response: str(defs.response), resolution: str(defs.resolution) },
    },
    scopeNote: str(scope.note),
    dueSoonHours: num(scope.due_soon_hours, 24),
  }
}

export async function fetchTicketBoard(params: Query, perColumn: number, { signal }: Opts = {}): Promise<BoardColumn[]> {
  const res = await apiClient.get<unknown>('/v1/tickets/board', { params: { ...params, per_column: perColumn }, signal, ...silent })

  return arr(rec(rec(res.data).data).columns).map((x) => {
    const c = rec(x)

    return { status: str(c.status) as TicketStatus, count: num(c.count), tickets: arr(c.tickets) as Ticket[] }
  })
}

export async function fetchTicketAnalytics(params: Query, days: number, { signal }: Opts = {}): Promise<TicketAnalytics> {
  const res = await apiClient.get<unknown>('/v1/tickets/analytics', { params: { ...params, days }, signal, ...silent })
  const d = rec(rec(res.data).data)
  const w = rec(d.window)
  const a = rec(d.assignment)
  const n = rec(d.notes)

  return {
    window: { days: num(w.days, days), from: str(w.from), to: str(w.to) },
    volume: arr(d.volume).map((x) => ({ date: str(rec(x).date), created: num(rec(x).created), resolved: num(rec(x).resolved) })),
    byStatus: arr(d.by_status).map((x) => ({ key: str(rec(x).key), count: num(rec(x).count) })),
    byPriority: arr(d.by_priority).map((x) => ({ key: str(rec(x).key), count: num(rec(x).count) })),
    departmentWorkload: arr(d.department_workload).map((x) => ({ id: num(rec(x).id), name: str(rec(x).name), open: num(rec(x).open), overdue: num(rec(x).overdue) })),
    assignment: {
      topAssignees: arr(a.top_assignees).map((x) => ({ id: num(rec(x).id), name: str(rec(x).name), open: num(rec(x).open) })),
      unassignedOpen: num(a.unassigned_open),
    },
    resolutionTrend: arr(d.resolution_trend).map((x) => ({ weekStart: str(rec(x).week_start), resolved: num(rec(x).resolved), avgHours: num(rec(x).avg_hours) })),
    overdueNow: arr(d.overdue_now).map((x) => ({ key: str(rec(x).key), label: str(rec(x).label), count: num(rec(x).count) })),
    notes: { distribution: str(n.distribution), workload: str(n.workload), overdue: str(n.overdue) },
  }
}

const SEVERITIES: InsightSeverity[] = ['critical', 'high', 'medium', 'low', 'info']

export async function fetchTicketInsights(params: Query, { signal }: Opts = {}): Promise<TicketInsight[]> {
  const res = await apiClient.get<unknown>('/v1/tickets/insights', { params, signal, ...silent })

  return arr(rec(res.data).data).map((x) => {
    const i = rec(x)
    const sp = rec(i.suggested_priority)
    const sev = str(i.severity) as InsightSeverity

    return {
      ticketId: num(i.ticket_id),
      ticketNumber: str(i.ticket_number),
      ticketTitle: str(i.ticket_title),
      rule: str(i.rule),
      severity: SEVERITIES.includes(sev) ? sev : 'info',
      severityLabel: str(i.severity_label),
      title: str(i.title),
      reason: str(i.reason),
      since: i.since == null ? null : str(i.since),
      suggestedAction: str(i.suggested_action),
      suggestedPriority: sp.value
        ? { value: str(sp.value) as TicketPriority, label: str(sp.label), current: str(sp.current) as TicketPriority, reason: str(sp.reason) }
        : null,
      // Only an internal dashboard path is ever followed.
      url: /^\/dashboard\/tickets\/\d+$/.test(str(i.url)) ? str(i.url) : '/dashboard/tickets/admin',
    }
  })
}

export async function fetchAssignmentSuggestions(ticketId: number, { signal }: Opts = {}): Promise<AssignmentSuggestions> {
  const res = await apiClient.get<unknown>(`/v1/tickets/${ticketId}/assignment-suggestions`, { signal, ...silent })
  const d = rec(rec(res.data).data)

  return {
    basis: str(d.basis),
    scope: d.scope === 'unit' ? 'unit' : 'department',
    candidates: arr(d.candidates).map((x) => ({
      id: num(rec(x).id), name: str(rec(x).name), openTickets: num(rec(x).open_tickets), isCurrent: rec(x).is_current === true,
      recommended: rec(x).recommended === true, reason: str(rec(x).reason),
    })),
    message: d.message == null ? null : str(d.message),
  }
}

export async function fetchPossibleDuplicates(ticketId: number, { signal }: Opts = {}): Promise<DuplicateHint[]> {
  const res = await apiClient.get<unknown>(`/v1/tickets/${ticketId}/possible-duplicates`, { signal, ...silent })

  return arr(rec(res.data).data).map((x) => {
    const h = rec(x)

    return {
      id: num(h.id), ticketNumber: str(h.ticket_number), title: str(h.title), status: str(h.status) as TicketStatus,
      createdAt: h.created_at == null ? null : str(h.created_at), sharedWords: arr(h.shared_words).map((w) => str(w)),
      wordOverlapPercent: num(h.word_overlap_percent), basis: str(h.basis),
    }
  })
}

export async function changeTicketPriority(ticketId: number, priority: TicketPriority, reason?: string): Promise<void> {
  await apiClient.patch(`/v1/tickets/${ticketId}/priority`, { priority, ...(reason?.trim() ? { reason: reason.trim() } : {}) }, silent)
}

export async function bulkUpdateTickets(req: BulkRequest): Promise<BulkResult> {
  const body = req.action === 'priority'
    ? { action: 'priority', ticket_ids: req.ticketIds, priority: req.priority, reason: req.reason }
    : { action: 'reassign', ticket_ids: req.ticketIds, assigned_to_id: req.assignedToId, unit_id: req.unitId, reason: req.reason }
  const res = await apiClient.post<unknown>('/v1/tickets/bulk', body, silent)
  const d = rec(rec(res.data).data)

  return {
    requested: num(d.requested), succeeded: num(d.succeeded), failed: num(d.failed),
    results: arr(d.results).map((x) => ({ id: num(rec(x).id), ticketNumber: rec(x).ticket_number == null ? null : str(rec(x).ticket_number), ok: rec(x).ok === true, message: str(rec(x).message) })),
  }
}
