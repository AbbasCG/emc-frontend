import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from './ticket'

/** Everything the work queue can filter on. Empty string / empty array / false mean "not filtering". */
export interface TicketFilters {
  search: string
  status: TicketStatus[]
  priority: TicketPriority[]
  category: '' | TicketCategory
  department: string
  assignee: string
  unassigned: boolean
  mine: boolean
  attention: boolean
  overdue: boolean
  state: '' | 'open' | 'closed'
  sla: '' | 'overdue' | 'due_soon' | 'on_track' | 'none'
  createdFrom: string
  createdTo: string
  dueFrom: string
  dueTo: string
  sort: TicketSortKey
  dir: 'asc' | 'desc'
  perPage: number
  page: number
}

export type TicketSortKey = 'created_at' | 'updated_at' | 'priority' | 'status' | 'ticket_number' | 'title' | 'due' | 'last_activity'
export type TicketView = 'table' | 'board' | 'analytics'

export interface TicketCounts {
  total: number
  pendingApproval: number
  assigned: number
  inProgress: number
  resolved: number
  unresolved: number
  rejectedByAdmin: number
  rejectedByAssignee: number
  open: number
  closed: number
  overdue: number
  dueSoon: number
  unassigned: number
  highPriority: number
  new24h: number
}

export interface TicketTimings {
  windowDays: number
  avgResponseHours: number | null
  responseSample: number
  avgResolutionHours: number | null
  resolutionSample: number
  truncated: boolean
  definitions: { response: string; resolution: string }
}

export interface TicketStats {
  counts: TicketCounts
  timings: TicketTimings
  scopeNote: string
  dueSoonHours: number
}

export interface TicketListResult {
  items: Ticket[]
  total: number
  currentPage: number
  lastPage: number
  perPage: number
}

export interface BoardColumn {
  status: TicketStatus
  count: number
  tickets: Ticket[]
}

export type InsightSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface TicketInsight {
  ticketId: number
  ticketNumber: string
  ticketTitle: string
  rule: string
  severity: InsightSeverity
  severityLabel: string
  title: string
  reason: string
  since: string | null
  suggestedAction: string
  suggestedPriority: { value: TicketPriority; label: string; current: TicketPriority; reason: string } | null
  url: string
}

export interface AssignmentCandidate {
  id: number
  name: string
  openTickets: number
  isCurrent: boolean
  recommended: boolean
  reason: string
}

export interface AssignmentSuggestions {
  basis: string
  scope: 'unit' | 'department'
  candidates: AssignmentCandidate[]
  message: string | null
}

export interface DuplicateHint {
  id: number
  ticketNumber: string
  title: string
  status: TicketStatus
  createdAt: string | null
  sharedWords: string[]
  wordOverlapPercent: number
  basis: string
}

export interface TicketAnalytics {
  window: { days: number; from: string; to: string }
  volume: { date: string; created: number; resolved: number }[]
  byStatus: { key: string; count: number }[]
  byPriority: { key: string; count: number }[]
  departmentWorkload: { id: number; name: string; open: number; overdue: number }[]
  assignment: { topAssignees: { id: number; name: string; open: number }[]; unassignedOpen: number }
  resolutionTrend: { weekStart: string; resolved: number; avgHours: number }[]
  overdueNow: { key: string; label: string; count: number }[]
  notes: { distribution: string; workload: string; overdue: string }
}

export interface BulkResult {
  requested: number
  succeeded: number
  failed: number
  results: { id: number; ticketNumber: string | null; ok: boolean; message: string }[]
}

export type BulkRequest =
  | { action: 'priority'; ticketIds: number[]; priority: TicketPriority; reason?: string }
  | { action: 'reassign'; ticketIds: number[]; assignedToId: number; unitId?: number; reason?: string }

/** A named set of filters, kept on this device. It stores filters only; the server still decides what is visible. */
export interface SavedTicketView {
  id: string
  name: string
  query: string
}
