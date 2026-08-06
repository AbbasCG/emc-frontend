import apiClient from './axios'
import { unwrapData } from './unwrap'
import type {
  AdminAuditLogEntry,
  AdminAuditLogPaginationMeta,
  AdminAuditLogStats,
} from '@/types/adminAudit'
import type { AuditLogsPageResult, ExportFormat } from '@/components/super-admin/audit-logs/constants'

export type AdminAuditLogQuery = {
  action?: string
  user_id?: number | string
  role?: string
  entity_type?: string
  date_from?: string
  date_to?: string
  search?: string
  ip_address?: string
  method?: string
  status?: string
  page?: number
  per_page?: number
  sort?: string
  direction?: 'asc' | 'desc'
  // Legacy aliases
  actor?: string
  actor_role?: string
  from?: string
  to?: string
}

function pickStr(v: unknown): string {
  return v != null ? String(v).trim() : ''
}

function coerceId(v: unknown): string | number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') return v
  if (typeof v === 'bigint') return String(v)
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function coerceJsonMaybe(v: unknown): unknown {
  if (v == null) return null
  if (typeof v === 'object') return v
  if (typeof v === 'string') {
    const t = v.trim()
    if (!t) return null
    try {
      return JSON.parse(t) as unknown
    } catch {
      return v
    }
  }
  return v
}

function coerceStringArray(v: unknown): string[] | null {
  if (v == null) return null
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === 'string') {
    const t = v.trim()
    if (!t) return null
    try {
      const parsed = JSON.parse(t) as unknown
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      // ignore
    }
    return [t]
  }
  return null
}

function uaBrief(ua?: string | null): string {
  const s = ua?.trim() ?? ''
  if (!s) return '—'
  if (s.length <= 120) return s
  return `${s.slice(0, 117)}…`
}

/** Normalize Laravel / mixed casing into canonical AdminAuditLogEntry. */
export function normalizeAdminAuditLogRow(raw: unknown): AdminAuditLogEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const userObj =
    r.user && typeof r.user === 'object' && !Array.isArray(r.user)
      ? (r.user as Record<string, unknown>)
      : null

  const actor_name =
    pickStr(r.actor_name) ||
    pickStr(r.user_name) ||
    (userObj ? pickStr(userObj.name) : '') ||
    pickStr(r.performed_by) ||
    '—'

  const actor_role =
    pickStr(r.actor_role) ||
    pickStr(r.user_role) ||
    pickStr(r.role) ||
    (userObj ? pickStr(userObj.role) : '') ||
    ''

  const action = pickStr(r.action) || pickStr(r.event) || pickStr(r.operation) || 'unknown'

  const entity_type =
    pickStr(r.entity_type) ||
    pickStr(r.subject_type) ||
    pickStr(r.resource_type) ||
    pickStr(r.model_type) ||
    '—'

  const entity_label =
    pickStr(r.entity_label) ||
    pickStr(r.entity_name) ||
    pickStr(r.summary) ||
    pickStr(r.title) ||
    (r.entity_id != null ? `#${pickStr(r.entity_id)}` : '') ||
    (r.subject_id != null ? `#${pickStr(r.subject_id)}` : '')

  const created_at =
    pickStr(r.created_at) ||
    pickStr(r.performed_at) ||
    pickStr(r.happened_at) ||
    pickStr(r.timestamp) ||
    ''

  const old_values =
    'old_values' in r ? coerceJsonMaybe(r.old_values ?? r.old) : coerceJsonMaybe(r.old)

  const new_values =
    'new_values' in r ? coerceJsonMaybe(r.new_values ?? r.new) : coerceJsonMaybe(r.new)

  const changed_fields = coerceStringArray(r.changed_fields)

  const ip_address =
    pickStr(r.ip_address) || pickStr(r.ip) || pickStr(r.client_ip) || null

  const fullUa = pickStr(r.user_agent) || pickStr(r.userAgent) || null

  const user_agent_summary =
    pickStr(r.user_agent_summary) || uaBrief(fullUa)

  return {
    id: coerceId(r.id),
    actor_name,
    actor_role,
    user: userObj
      ? {
          id: typeof userObj.id === 'number' ? userObj.id : null,
          name: pickStr(userObj.name) || null,
          email: pickStr(userObj.email) || null,
          role: pickStr(userObj.role) || null,
        }
      : undefined,
    action,
    action_label: pickStr(r.action_label) || null,
    action_color: pickStr(r.action_color) || null,
    action_icon: pickStr(r.action_icon) || null,
    entity_type,
    entity_label: entity_label || '—',
    entity_name: pickStr(r.entity_name) || null,
    entity_id: r.entity_id != null ? Number(r.entity_id) : null,
    description: pickStr(r.description) || null,
    changed_fields,
    old_values,
    new_values,
    ip_address: ip_address || null,
    user_agent_summary,
    user_agent: fullUa,
    metadata: r.metadata ?? null,
    route: pickStr(r.route) || null,
    method: pickStr(r.method) || null,
    created_at: created_at || '—',
  }
}

export function isImpersonationAuditEvent(e: AdminAuditLogEntry): boolean {
  const a = e.action.toLowerCase().replace(/[\s-]+/g, '_')
  const et = e.entity_type.toLowerCase()
  const lbl = e.entity_label.toLowerCase()
  const hay = `${a} ${et} ${lbl}`
  const signals = ['impersonat', 'simulate_session', 'act_as_user', 'login_as']
  return signals.some((s) => hay.includes(s))
}

function buildQueryParams(params?: AdminAuditLogQuery): Record<string, unknown> {
  const query: Record<string, unknown> = { ...params }
  if (params?.actor) query.search = params.actor
  if (params?.actor_role) query.role = params.actor_role
  if (params?.from) query.date_from = params.from
  if (params?.to) query.date_to = params.to
  return query
}

function parsePaginationMeta(payload: unknown): AdminAuditLogPaginationMeta | null {
  const root = payload != null && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null
  const meta = root?.meta as Record<string, unknown> | undefined
  if (!meta || typeof meta !== 'object') return null

  const total = Number(meta.total)
  const current_page = Number(meta.current_page ?? meta.page)
  const last_page = Number(meta.last_page ?? meta.lastPage)
  const per_page = Number(meta.per_page ?? meta.perPage)
  const from = meta.from != null ? Number(meta.from) : null
  const to = meta.to != null ? Number(meta.to) : null

  if (!Number.isFinite(total) || total < 0) return null

  return {
    total,
    current_page: Number.isFinite(current_page) && current_page > 0 ? current_page : 1,
    last_page: Number.isFinite(last_page) && last_page > 0 ? last_page : 1,
    per_page: Number.isFinite(per_page) && per_page > 0 ? per_page : 20,
    from: from != null && Number.isFinite(from) ? from : null,
    to: to != null && Number.isFinite(to) ? to : null,
  }
}

function unwrapRows(payload: unknown): AdminAuditLogEntry[] {
  const data = unwrapData<unknown>(payload)
  const list = Array.isArray(data) ? data : Array.isArray(payload) ? payload : []
  return list
    .map((row) => normalizeAdminAuditLogRow(row))
    .filter((row): row is AdminAuditLogEntry => row != null)
    .filter((row) => !isImpersonationAuditEvent(row))
}

/** @deprecated Use fetchAdminAuditLogsPage for paginated results. */
export async function fetchAdminAuditLogs(params?: AdminAuditLogQuery): Promise<AdminAuditLogEntry[]> {
  const result = await fetchAdminAuditLogsPage({ ...params, page: params?.page ?? 1, per_page: params?.per_page ?? 20 })
  return result.entries
}

export async function fetchAdminAuditLogsPage(params?: AdminAuditLogQuery): Promise<AuditLogsPageResult> {
  const res = await apiClient.get<unknown>('/admin/audit-logs', {
    params: buildQueryParams(params),
    skipErrorToast: true,
  })

  const entries = unwrapRows(res.data)
  const meta = parsePaginationMeta(res.data)
  const perPage = params?.per_page ?? meta?.per_page ?? 20
  const page = params?.page ?? meta?.current_page ?? 1

  if (meta) {
    return {
      entries,
      total: meta.total,
      page: meta.current_page,
      perPage: meta.per_page,
      lastPage: meta.last_page,
      from: meta.from,
      to: meta.to,
    }
  }

  const total = entries.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))

  return {
    entries,
    total,
    page,
    perPage,
    lastPage,
    from: total === 0 ? null : (page - 1) * perPage + 1,
    to: total === 0 ? null : Math.min(page * perPage, total),
  }
}

export async function fetchAdminAuditLogStats(params?: AdminAuditLogQuery): Promise<AdminAuditLogStats> {
  const res = await apiClient.get<unknown>('/admin/audit-logs/stats', {
    params: buildQueryParams(params),
    skipErrorToast: true,
  })
  const data = unwrapData<AdminAuditLogStats>(res.data)
  return data ?? {
    total: 0,
    today: 0,
    this_week: 0,
    this_month: 0,
    unique_users: 0,
    failed_operations: 0,
    successful_operations: 0,
    top_entity: null,
    most_active_user: null,
    most_common_action: null,
  }
}

export async function fetchAdminAuditLogDetail(id: string | number): Promise<AdminAuditLogEntry | null> {
  const res = await apiClient.get<unknown>(`/admin/audit-logs/${id}`, { skipErrorToast: true })
  const raw = unwrapData<unknown>(res.data)
  const row = normalizeAdminAuditLogRow(raw)
  if (!row || isImpersonationAuditEvent(row)) return null
  return row
}

export async function exportAdminAuditLogs(
  params: AdminAuditLogQuery | undefined,
  format: ExportFormat,
): Promise<void> {
  const query = { ...buildQueryParams(params), format: format === 'xlsx' ? 'xlsx' : format }
  const res = await apiClient.get<Blob>('/admin/audit-logs/export', {
    params: query,
    responseType: format === 'json' ? 'json' : 'blob',
    skipErrorToast: true,
  })

  const ext = format === 'xlsx' ? 'xls' : format
  const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.${ext}`

  if (format === 'json') {
    const json = JSON.stringify(res.data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    triggerDownload(blob, filename)
    return
  }

  triggerDownload(res.data as Blob, filename)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
