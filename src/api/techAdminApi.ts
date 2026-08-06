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

export async function fetchTechAdminDashboard(): Promise<TechAdminDashboard> {
  const res = await apiClient.get<unknown>('/tech-admin/dashboard', { skipErrorToast: true } as never)
  const inner = unwrapData<TechAdminDashboard>(res.data)
  return (inner ?? res.data) as TechAdminDashboard
}
