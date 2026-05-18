/** Super Admin changelog row — tolerant of backend field naming drift. */

export type AdminAuditLogEntry = {
  id: string | number
  actor_name: string
  actor_role: string
  /** Raw action slug from backend (never empty). */
  action: string
  entity_type: string
  entity_label: string
  created_at: string
  old_values: unknown
  new_values: unknown
  ip_address: string | null
  user_agent_summary: string
}
