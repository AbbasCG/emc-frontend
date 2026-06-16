import apiClient from './axios'
import { asList } from './lmsApi'
import type { AdminAuditLogEntry } from '@/types/adminAudit'

export type AdminAuditLogQuery = {
  action?: string
  user_id?: number | string
  role?: string
  entity_type?: string
  date_from?: string
  date_to?: string
  search?: string
  per_page?: number
  // Legacy query param aliases
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

  // Support nested user object (new format) or flat actor fields (legacy)
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

  const user_agent_summary =
    pickStr(r.user_agent_summary) ||
    uaBrief(pickStr(r.user_agent) || pickStr(r.userAgent))

  return {
    id: coerceId(r.id),

    // Legacy flat fields
    actor_name,
    actor_role,

    // New nested user object
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
    route: pickStr(r.route) || null,
    method: pickStr(r.method) || null,
    created_at: created_at || '—',
  }
}

/** Excludes impersonation-style events from operational changelog UX. */
export function isImpersonationAuditEvent(e: AdminAuditLogEntry): boolean {
  const a = e.action.toLowerCase().replace(/[\s-]+/g, '_')
  const et = e.entity_type.toLowerCase()
  const lbl = e.entity_label.toLowerCase()

  const hay = `${a} ${et} ${lbl}`
  const signals = ['impersonat', 'simulate_session', 'act_as_user', 'login_as']

  return signals.some((s) => hay.includes(s))
}

export async function fetchAdminAuditLogs(params?: AdminAuditLogQuery): Promise<AdminAuditLogEntry[]> {
  // Map legacy param names to new backend param names
  const query: Record<string, unknown> = { ...params }
  if (params?.actor) query.search = params.actor
  if (params?.actor_role) query.role = params.actor_role
  if (params?.from) query.date_from = params.from
  if (params?.to) query.date_to = params.to

  const res = await apiClient.get<unknown>('/admin/audit-logs', {
    params: query,
    skipErrorToast: true,
  })
  const rows = asList<unknown>(res.data)
    .map((row) => normalizeAdminAuditLogRow(row))
    .filter((row): row is AdminAuditLogEntry => row != null)

  return rows.filter((row) => !isImpersonationAuditEvent(row))
}
