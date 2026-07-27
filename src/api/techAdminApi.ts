import apiClient from './axios'
import { unwrapData } from './unwrap'

export interface SystemHealth {
  api: string
  database: string
  cache: string
  queue: string
  storage: string
  mail: string
}

export interface TechAdminCounts {
  users: number
  active_users: number
  roles: number
  permissions: number
  courses: number
  learning_paths: number
  registrations: number
  audit_logs_today: number
  uploads: number
}

export interface TechAdminSecurity {
  failed_logins_today: number
  full_access_users: number
  impersonation_permission_users: number
}

export interface AuditLogEntry {
  id: number
  actor: string | null
  actor_role: string | null
  action: string
  action_meta: { label: string; color: string; icon: string }
  entity_type: string | null
  entity_name: string | null
  route: string | null
  method: string | null
  created_at: string
}

export interface TechAdminDashboard {
  success: boolean
  system: SystemHealth
  counts: TechAdminCounts
  security: TechAdminSecurity
  recent_audit_logs: AuditLogEntry[]
}

// ── Empty-payload contract normalization ────────────────────────────────────
// The API may legitimately answer `{ success: true, data: [] }` or
// `{ success: true, data: {} }`. Normalize here (at the fetch boundary) so the
// page always receives a complete `TechAdminDashboard` and never crashes on
// `Object.entries(undefined)` / `.map` of a missing array.

const DEFAULT_SYSTEM: SystemHealth = {
  api: 'unknown',
  database: 'unknown',
  cache: 'unknown',
  queue: 'unknown',
  storage: 'unknown',
  mail: 'unknown',
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' && v !== '' ? v : fallback
}

export function normalizeTechAdminDashboard(payload: unknown): TechAdminDashboard {
  const raw = isRecord(payload) ? payload : {}
  const system = isRecord(raw.system) ? raw.system : {}
  const counts = isRecord(raw.counts) ? raw.counts : {}
  const security = isRecord(raw.security) ? raw.security : {}
  return {
    success: raw.success !== false,
    system: {
      api:      str(system.api,      DEFAULT_SYSTEM.api),
      database: str(system.database, DEFAULT_SYSTEM.database),
      cache:    str(system.cache,    DEFAULT_SYSTEM.cache),
      queue:    str(system.queue,    DEFAULT_SYSTEM.queue),
      storage:  str(system.storage,  DEFAULT_SYSTEM.storage),
      mail:     str(system.mail,     DEFAULT_SYSTEM.mail),
    },
    counts: {
      users:            num(counts.users),
      active_users:     num(counts.active_users),
      roles:            num(counts.roles),
      permissions:      num(counts.permissions),
      courses:          num(counts.courses),
      learning_paths:   num(counts.learning_paths),
      registrations:    num(counts.registrations),
      audit_logs_today: num(counts.audit_logs_today),
      uploads:          num(counts.uploads),
    },
    security: {
      failed_logins_today:            num(security.failed_logins_today),
      full_access_users:              num(security.full_access_users),
      impersonation_permission_users: num(security.impersonation_permission_users),
    },
    recent_audit_logs: Array.isArray(raw.recent_audit_logs)
      ? (raw.recent_audit_logs as AuditLogEntry[])
      : [],
  }
}

export async function fetchTechAdminDashboard(): Promise<TechAdminDashboard> {
  const res = await apiClient.get<unknown>('/tech-admin/dashboard', { skipErrorToast: true } as never)
  // The dashboard payload historically arrives either at the top level or
  // wrapped in `{ success, data }` — unwrap first, then fall back to the raw
  // body before normalizing.
  const inner = unwrapData<unknown>(res.data)
  return normalizeTechAdminDashboard(isRecord(inner) ? inner : res.data)
}
