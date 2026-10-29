import axios from 'axios'
import apiClient from './axios'
import { unwrapData } from './unwrap'

/**
 * Private executive command center (read-only feed).
 *
 * ONE endpoint, already normalized by the backend, so the page never fans out to twenty
 * module APIs. The endpoint is authorized by the explicit `executive.command_center.view`
 * permission on the server; a 403 is rendered as an unauthorized state, never as empty data.
 */

export type CommandCenterRange = 'today' | 'week' | 'month'
export type CommandCenterSourceKey =
  | 'smart_rules'
  | 'tickets'
  | 'meetings'
  | 'education'
  | 'finance'
  | 'hr'
  | 'quality'
  | 'email'
  | 'users'
  | 'system'
export type CommandCenterSectionKey = 'needs_attention' | 'upcoming' | 'recent_updates' | 'errors'
export type CommandCenterPriority = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type CommandCenterItem = {
  id: string
  source: CommandCenterSourceKey
  type: string
  title: string
  description: string
  status: string | null
  statusLabel: string | null
  priority: CommandCenterPriority
  priorityLabel: string
  timestamp: string | null
  dueAt: string | null
  actor: { name: string } | null
  url: string
  actionLabel: string
  badge: string | null
  /** The area the item belongs to (a smart alert's source is `smart_rules`; its module says which area). */
  module: CommandCenterSourceKey
  /** Present on smart rule alerts only. */
  smart: SmartAlertDetails | null
}

/** Extra fields of a smart operational alert. Rules run on the server; the client only displays them. */
export type SmartAlertDetails = {
  ruleKey: string
  priorityScore: number
  detectedAt: string | null
  suggestedAction: string
  relatedEntity: { type: string; id: string; title: string } | null
}

export type SmartRuleStatus = { key: string; label: string; module: string; status: 'ok' | 'failed' | 'disabled' | 'skipped'; count: number }

export type CommandCenterSection = {
  key: CommandCenterSectionKey
  title: string
  total: number
  items: CommandCenterItem[]
}

export type CommandCenterSource = {
  key: CommandCenterSourceKey
  label: string
  available: boolean
  count: number
  unavailable: string[]
}

export type CommandCenterData = {
  meta: { generatedAt: string | null; range: CommandCenterRange; source: string; priority: string; timezone: string }
  summary: Record<CommandCenterSectionKey, number> & { sourcesActive: number; sourcesTotal: number; smartAlerts: number }
  sections: CommandCenterSection[]
  sources: CommandCenterSource[]
  smartRules: SmartRuleStatus[]
  capabilities: { canView: boolean; canRefresh: boolean; readOnly: boolean }
}

export type CommandCenterQuery = {
  range?: CommandCenterRange
  source?: CommandCenterSourceKey | 'all'
  priority?: CommandCenterPriority | 'all'
  limit?: number
}

const SECTION_KEYS: CommandCenterSectionKey[] = ['needs_attention', 'upcoming', 'recent_updates', 'errors']
const SOURCE_KEYS: CommandCenterSourceKey[] = ['smart_rules', 'tickets', 'meetings', 'education', 'finance', 'hr', 'quality', 'email', 'users', 'system']
const PRIORITIES: CommandCenterPriority[] = ['critical', 'high', 'medium', 'low', 'info']

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}
function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : v == null ? fallback : String(v)
}
function strOrNull(v: unknown): string | null {
  return v == null || v === '' ? null : String(v)
}
function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Only an internal dashboard path may become a link. The backend already guarantees this;
 * the client refuses anything else too (absolute URLs, protocol-relative, javascript:), so a
 * bad value can never turn an item's button into an open redirect.
 */
export function safeInternalUrl(url: unknown): string {
  const u = str(url)
  return /^\/dashboard\/[A-Za-z0-9/_-]*$/.test(u) && !u.includes('//') ? u : '/dashboard'
}

function normalizeItem(raw: unknown): CommandCenterItem | null {
  const r = rec(raw)
  const id = str(r.id)
  if (!id) return null
  const source = str(r.source) as CommandCenterSourceKey
  const priority = PRIORITIES.includes(r.priority as CommandCenterPriority) ? (r.priority as CommandCenterPriority) : 'info'
  const actor = rec(r.actor)
  const entity = rec(r.related_entity)
  const moduleKey = str(r.module) as CommandCenterSourceKey
  const isSmart = r.type === 'operational_alert' && typeof r.rule_key === 'string'
  const score = Math.max(0, Math.min(100, Math.round(num(r.priority_score))))

  return {
    id,
    source: SOURCE_KEYS.includes(source) ? source : 'system',
    type: str(r.type),
    title: str(r.title, 'بدون عنوان'),
    description: str(r.description),
    status: strOrNull(r.status),
    statusLabel: strOrNull(r.status_label),
    priority,
    priorityLabel: str(r.priority_label),
    timestamp: strOrNull(r.timestamp),
    dueAt: strOrNull(r.due_at),
    actor: actor.name ? { name: str(actor.name) } : null,
    url: safeInternalUrl(r.url),
    actionLabel: str(r.action_label, 'فتح'),
    badge: strOrNull(r.badge),
    module: SOURCE_KEYS.includes(moduleKey) ? moduleKey : SOURCE_KEYS.includes(source) ? source : 'system',
    smart: isSmart ?
      {
        ruleKey: str(r.rule_key),
        priorityScore: score,
        detectedAt: strOrNull(r.detected_at),
        suggestedAction: str(r.suggested_action),
        relatedEntity: entity.type ? { type: str(entity.type), id: str(entity.id), title: str(entity.title) } : null,
      }
    : null,
  }
}

export function normalizeCommandCenter(payload: unknown): CommandCenterData {
  const d = rec(unwrapData<unknown>(payload))
  const meta = rec(d.meta)
  const summary = rec(d.summary)
  const caps = rec(d.capabilities)

  const sections: CommandCenterSection[] = SECTION_KEYS.map((key) => {
    const found = arr(d.sections).map(rec).find((s) => s.key === key) ?? {}
    return {
      key,
      title: str(found.title),
      total: num(found.total),
      items: arr(found.items).map(normalizeItem).filter((i): i is CommandCenterItem => i !== null),
    }
  })

  const range = meta.range
  return {
    meta: {
      generatedAt: strOrNull(meta.generated_at),
      range: range === 'week' || range === 'month' ? range : 'today',
      source: str(meta.source, 'all'),
      priority: str(meta.priority, 'all'),
      timezone: str(meta.timezone),
    },
    summary: {
      needs_attention: num(summary.needs_attention),
      upcoming: num(summary.upcoming),
      recent_updates: num(summary.recent_updates),
      errors: num(summary.errors),
      sourcesActive: num(summary.sources_active),
      sourcesTotal: num(summary.sources_total),
      smartAlerts: num(summary.smart_alerts),
    },
    sections,
    sources: arr(d.sources).map(rec).filter((s) => SOURCE_KEYS.includes(s.key as CommandCenterSourceKey)).map((s) => ({
      key: s.key as CommandCenterSourceKey,
      label: str(s.label),
      available: s.available === true,
      count: num(s.count),
      unavailable: arr(s.unavailable).map((x) => str(x)),
    })),
    smartRules: arr(d.smart_rules).map(rec).filter((x) => str(x.key) !== '').map((x) => ({
      key: str(x.key),
      label: str(x.label),
      module: str(x.module),
      status: x.status === 'failed' || x.status === 'disabled' || x.status === 'skipped' ? x.status : 'ok',
      count: num(x.count),
    })),
    capabilities: { canView: caps.can_view !== false, canRefresh: caps.can_refresh !== false, readOnly: caps.read_only !== false },
  }
}

export async function fetchCommandCenter(query: CommandCenterQuery = {}): Promise<CommandCenterData> {
  const params: Record<string, string | number> = {}
  if (query.range) params.range = query.range
  if (query.source && query.source !== 'all') params.source = query.source
  if (query.priority && query.priority !== 'all') params.priority = query.priority
  if (query.limit) params.limit = query.limit

  const res = await apiClient.get<unknown>('/executive/command-center', { params, skipErrorToast: true })
  return normalizeCommandCenter(res.data)
}

export type CommandCenterErrorKind = 'forbidden' | 'unauthenticated' | 'error'

export function classifyCommandCenterError(err: unknown): CommandCenterErrorKind {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 403) return 'forbidden'
    if (err.response?.status === 401) return 'unauthenticated'
  }
  return 'error'
}
