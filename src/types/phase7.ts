/** Phase 7 — integrations, webhooks, calendar, notifications prefs, API tokens, mobile readiness */

export type NotificationChannelKey = 'in_app' | 'email' | 'whatsapp'

export type NotificationPreferenceKey =
  | 'registration_confirm'
  | 'payment_confirm'
  | 'payment_failed'
  | 'session_reminder'
  | 'assignment_due'
  | 'certificate_issued'
  | 'task_assigned'
  | 'meeting_invite'
  | 'support_reply'
  | 'partner_update'

export type NotificationPreferenceRow = {
  key: NotificationPreferenceKey
  label_ar: string
  channels: Record<NotificationChannelKey, boolean>
}

export type IntegrationProvider =
  | 'stripe'
  | 'paypal'
  | 'whatsapp'
  | 'email'
  | 'google_calendar'
  | 'outlook_calendar'
  | 'webhooks'
  | 'api_tokens'

export type IntegrationStatus = 'connected' | 'not_configured' | 'needs_setup'

export type IntegrationSummary = {
  provider: IntegrationProvider
  title_ar: string
  description_ar: string
  status: IntegrationStatus
  security_note_ar?: string
  settings_path: string
}

export type EmailIntegrationPreview = {
  driver_label_ar: string
  driver_hint_ar: string
  templates: { id: string; name_ar: string; slug: string }[]
}

export type WhatsAppIntegrationPreview = {
  mode: 'meta_cloud' | 'twilio' | 'fake' | 'local'
  meta_placeholder_ar: string
  twilio_placeholder_ar: string
}

export type CalendarFilterKind = 'all' | 'session' | 'meeting' | 'task'

export type CalendarEventRecord = {
  id: number
  title: string
  kind: Exclude<CalendarFilterKind, 'all'>
  starts_at: string
  ends_at?: string | null
  location_ar?: string | null
  join_url?: string | null
  status_ar: string
  ics_uid?: string
}

export const WEBHOOK_PHASE_EVENTS = [
  'registration.created',
  'payment.confirmed',
  'certificate.issued',
  'task.completed',
  'meeting.created',
  'partner.requested',
  'support.ticket.created',
] as const

export type WebhookPhaseEvent = (typeof WEBHOOK_PHASE_EVENTS)[number]

export type WebhookEndpoint = {
  id: number
  url: string
  active: boolean
  events: WebhookPhaseEvent[]
  secret_hint_ar?: string
  created_at: string
  updated_at: string
}

export type WebhookDeliveryStatus = 'success' | 'failed' | 'pending'

export type WebhookDelivery = {
  id: number
  webhook_id: number
  event: WebhookPhaseEvent
  status: WebhookDeliveryStatus
  http_status?: number | null
  attempted_at: string
  duration_ms?: number | null
  detail_ar?: string | null
}

export type ApiTokenScope =
  | 'read:registrations'
  | 'read:courses'
  | 'write:webhooks'
  | 'read:reports'
  | 'write:forms'

export type ApiAccessTokenRow = {
  id: number
  name: string
  scopes: ApiTokenScope[]
  last_used_at: string | null
  created_at: string
  /** Prefix shown after masking — placeholder until backend supplies real prefix */
  token_preview?: string
}

export type MobileEndpointPreview = {
  path: string
  description_ar: string
  ready: boolean
}

export type MobileReadinessPayload = {
  api_online: boolean
  notification_bridge_ready: boolean
  offline_placeholder_ar: string
  roadmap: { id: string; label_ar: string; done: boolean }[]
  endpoints: MobileEndpointPreview[]
  dashboard_preview_ar: string[]
}
