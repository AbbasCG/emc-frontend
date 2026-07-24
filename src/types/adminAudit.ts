/** Super Admin changelog row — tolerant of backend field naming drift. */

export type AdminAuditLogEntry = {
  id: string | number

  // User / actor (support both naming schemes)
  actor_name: string        // legacy alias
  actor_role: string        // legacy alias
  user?: {
    id: number | null
    name: string | null
    email: string | null
    role: string | null
  }

  /** Raw action slug from backend (e.g. "UPDATE", "CREATE", "created"). */
  action: string
  /** Arabic action label from backend (e.g. "تعديل"). */
  action_label?: string | null
  /** Tailwind color key (e.g. "amber", "red"). */
  action_color?: string | null
  /** Icon key (e.g. "edit", "trash"). */
  action_icon?: string | null

  entity_type: string
  entity_label: string      // legacy alias for entity_name
  entity_name?: string | null
  entity_id?: number | null

  /** Human-readable description of the event. */
  description?: string | null

  /** Fields that changed (UPDATE events). */
  changed_fields?: string[] | null
  old_values: unknown
  new_values: unknown

  ip_address: string | null
  user_agent_summary: string
  user_agent?: string | null
  metadata?: unknown
  route?: string | null
  method?: string | null

  created_at: string
}

export type AdminAuditLogStats = {
  total: number
  today: number
  this_week: number
  this_month: number
  unique_users: number
  failed_operations: number
  successful_operations: number
  top_entity: string | null
  most_active_user: string | null
  most_common_action: string | null
}

export type AdminAuditLogPaginationMeta = {
  total: number
  current_page: number
  last_page: number
  per_page: number
  from: number | null
  to: number | null
}
