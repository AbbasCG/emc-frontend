import axios from 'axios'
import apiClient from './axios'
import { unwrapData } from './unwrap'

/**
 * Read-only cross-department monitoring (Technology Management).
 *
 * Both endpoints return COUNTS ONLY and are authorized server-side by the
 * `tech.department_dashboards.view` permission. Hiding this page in the browser protects
 * nothing on its own; a missing permission comes back as 403 and is shown as such.
 */

export type DashboardTone = 'good' | 'info' | 'warning' | 'neutral'

export type DashboardMetric = {
  key: string
  label: string
  value: number | string | null
  tone: DashboardTone
}

export type DepartmentLeaderRef = { id: number; name: string } | null

export type MonitoredDepartment = {
  id: number
  name: string
  slug: string | null
  status: string
  leader: DepartmentLeaderRef
}

export type DashboardSection = {
  key: string
  label: string
  available: boolean
  metrics: DashboardMetric[]
}

export type DashboardModule = { key: string; label: string; available: boolean }

export type DashboardWarning = {
  code: string
  severity: 'info' | 'warning' | 'critical'
  message: string
}

export type DashboardLink = { key: string; label: string; path: string; page_key: string }

export type DashboardDiagnostics = {
  generated_at: string | null
  last_activity_at: string | null
  data_source: string
  stale: boolean
  sections_failed: number
}

export type DashboardCapabilities = {
  can_view: boolean
  can_refresh: boolean
  can_view_sensitive: boolean
  read_only: boolean
}

export type DepartmentDashboardList = {
  departments: MonitoredDepartment[]
  capabilities: DashboardCapabilities
}

export type DepartmentDashboard = {
  departments: MonitoredDepartment[]
  selectedDepartment: MonitoredDepartment
  cards: DashboardMetric[]
  modules: DashboardModule[]
  sections: DashboardSection[]
  warnings: DashboardWarning[]
  links: DashboardLink[]
  diagnostics: DashboardDiagnostics
  capabilities: DashboardCapabilities
}

const BASE = '/tech/department-dashboards'
const silent = { skipErrorToast: true as const }

const DEFAULT_CAPABILITIES: DashboardCapabilities = {
  can_view: true,
  can_refresh: true,
  can_view_sensitive: false,
  read_only: true,
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : v == null ? fallback : String(v)
}

function tone(v: unknown): DashboardTone {
  return v === 'good' || v === 'info' || v === 'warning' ? v : 'neutral'
}

function normalizeDepartment(raw: unknown): MonitoredDepartment {
  const r = asRecord(raw)
  const leader = asRecord(r.leader)
  return {
    id: Number(r.id ?? 0),
    name: str(r.name, 'إدارة بلا اسم'),
    slug: r.slug == null ? null : str(r.slug),
    status: str(r.status, 'active'),
    leader: leader.id != null ? { id: Number(leader.id), name: str(leader.name) } : null,
  }
}

function normalizeMetric(raw: unknown): DashboardMetric {
  const r = asRecord(raw)
  const value = r.value
  return {
    key: str(r.key),
    label: str(r.label),
    value: typeof value === 'number' || typeof value === 'string' ? value : null,
    tone: tone(r.tone),
  }
}

function normalizeCapabilities(raw: unknown): DashboardCapabilities {
  const r = asRecord(raw)
  return {
    can_view: r.can_view !== false,
    can_refresh: r.can_refresh !== false,
    // Never trust the client side to widen this: anything but an explicit true is false.
    can_view_sensitive: r.can_view_sensitive === true,
    read_only: r.read_only !== false,
  }
}

export async function fetchMonitoredDepartments(): Promise<DepartmentDashboardList> {
  const res = await apiClient.get<unknown>(BASE, silent)
  const data = asRecord(unwrapData<unknown>(res.data))
  return {
    departments: asArray(data.departments).map(normalizeDepartment).filter((d) => d.id > 0),
    capabilities: data.capabilities ? normalizeCapabilities(data.capabilities) : DEFAULT_CAPABILITIES,
  }
}

export async function fetchDepartmentDashboard(departmentId: number): Promise<DepartmentDashboard> {
  const res = await apiClient.get<unknown>(`${BASE}/${departmentId}`, silent)
  const data = asRecord(unwrapData<unknown>(res.data))
  const summary = asRecord(data.summary)
  const diag = asRecord(data.diagnostics)

  return {
    departments: asArray(data.departments).map(normalizeDepartment).filter((d) => d.id > 0),
    selectedDepartment: normalizeDepartment(data.selected_department),
    cards: asArray(summary.cards).map(normalizeMetric),
    modules: asArray(data.modules).map((m) => {
      const r = asRecord(m)
      return { key: str(r.key), label: str(r.label), available: r.available !== false }
    }),
    sections: asArray(data.sections).map((s) => {
      const r = asRecord(s)
      return {
        key: str(r.key),
        label: str(r.label),
        available: r.available !== false,
        metrics: asArray(r.metrics).map(normalizeMetric),
      }
    }),
    warnings: asArray(data.warnings).map((w) => {
      const r = asRecord(w)
      const sev = r.severity
      return {
        code: str(r.code),
        severity: sev === 'critical' || sev === 'warning' ? sev : 'info',
        message: str(r.message),
      }
    }),
    links: asArray(data.links).map((l) => {
      const r = asRecord(l)
      return { key: str(r.key), label: str(r.label), path: str(r.path), page_key: str(r.page_key) }
    }),
    diagnostics: {
      generated_at: diag.generated_at == null ? null : str(diag.generated_at),
      last_activity_at: diag.last_activity_at == null ? null : str(diag.last_activity_at),
      data_source: str(diag.data_source),
      stale: diag.stale === true,
      sections_failed: Number(diag.sections_failed ?? 0),
    },
    capabilities: normalizeCapabilities(data.capabilities),
  }
}

export type DashboardErrorKind = 'forbidden' | 'not_found' | 'unauthenticated' | 'error'

export function classifyDashboardError(err: unknown): DashboardErrorKind {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status
    if (status === 403) return 'forbidden'
    if (status === 404) return 'not_found'
    if (status === 401) return 'unauthenticated'
  }
  return 'error'
}
