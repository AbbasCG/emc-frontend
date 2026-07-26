import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'

const silent = { skipErrorToast: true as const }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmailSettingItem {
  key: string
  label: string
  description: string
  category: string
  category_label: string
  enabled: boolean
  updated_at: string | null
}

export interface EmailSettingsPayload {
  settings?: Record<string, { enabled: boolean }>
  sender_name?: string | null
  sender_email?: string | null
}

export interface EmailSettingsResponse {
  settings: Record<string, EmailSettingItem>
  sender_name: string
  sender_email: string
}

export interface EmailLog {
  id: number
  uuid: string | null
  user_id: number | null
  recipient: string
  recipient_name: string | null
  type: string
  subject: string | null
  status: 'pending' | 'sent' | 'failed' | 'queued' | 'sending' | 'bounced' | 'skipped_disabled'
  error_message: string | null
  smtp_response?: string | null
  payload?: Record<string, unknown> | null
  mail_driver: string | null
  job_id: string | null
  retry_count: number
  execution_time_ms: number | null
  delivery_time_ms: number | null
  queued_at: string | null
  sent_at: string | null
  failed_at: string | null
  delivered_at: string | null
  created_at: string
  user?: { id: number; name: string; email: string } | null
  triggered_by?: { id: number; name: string } | null
  related_course?: { id: number; title: string } | null
}

export interface EmailLogMeta {
  total: number
  current_page: number
  last_page: number
  per_page: number
}

export interface EmailLogStats {
  total: number
  total_sent: number
  sent_today: number
  failed_today: number
  pending: number
  failed: number
  success_rate: number
  avg_delivery_ms: number | null
}

export interface EmailChartPoint {
  date: string
  sent: number
  failed: number
  pending: number
  total: number
  success_rate: number | null
}

export interface EmailQueueStats {
  pending_logs: number
  failed_logs: number
  retrying: number
  queue_jobs: number
  failed_jobs: number
}

// ── Email Settings ────────────────────────────────────────────────────────────

export async function fetchEmailSettings(): Promise<EmailSettingsResponse> {
  const res = await apiClient.get<unknown>('/admin/email-settings', silent)
  return unwrapData<EmailSettingsResponse>(res.data) as EmailSettingsResponse
}

export async function updateEmailSettings(payload: EmailSettingsPayload): Promise<void> {
  await apiClient.put('/admin/email-settings', payload)
}

export async function sendTestEmail(): Promise<string> {
  const res = await apiClient.post<unknown>('/admin/email-settings/test')
  const data = unwrapData<{ message: string }>(res.data) as { message: string }
  return data?.message ?? 'تم إرسال البريد التجريبي'
}

// ── Email Logs ────────────────────────────────────────────────────────────────

export async function fetchEmailLogs(params?: {
  status?: string
  type?: string
  search?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}): Promise<{ data: EmailLog[]; meta: EmailLogMeta }> {
  const res = await apiClient.get<unknown>('/admin/email-logs', { params, ...silent })
  // Backend returns { data: [...], meta: {...} } directly — not the wrapped { data: {...} } pattern.
  const body = res.data as { data: EmailLog[]; meta: EmailLogMeta } | null
  return body ?? { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 25 } }
}

export async function fetchEmailLog(id: number): Promise<EmailLog> {
  const res = await apiClient.get<unknown>(`/admin/email-logs/${id}`, silent)
  return unwrapData<EmailLog>(res.data) as EmailLog
}

export async function fetchEmailLogStats(): Promise<EmailLogStats> {
  const res = await apiClient.get<unknown>('/admin/email-logs/stats', silent)
  return (unwrapData<EmailLogStats>(res.data) as EmailLogStats) ?? {
    total: 0, total_sent: 0, sent_today: 0, failed_today: 0,
    pending: 0, failed: 0, success_rate: 0, avg_delivery_ms: null,
  }
}

export async function fetchEmailLogChart(days = 14): Promise<EmailChartPoint[]> {
  const res = await apiClient.get<unknown>('/admin/email-logs/chart', { params: { days }, ...silent })
  return (unwrapData<EmailChartPoint[]>(res.data) as EmailChartPoint[]) ?? []
}

export async function fetchEmailQueueStats(): Promise<EmailQueueStats> {
  const res = await apiClient.get<unknown>('/admin/email-logs/queue', silent)
  return (unwrapData<EmailQueueStats>(res.data) as EmailQueueStats) ?? {
    pending_logs: 0, failed_logs: 0, retrying: 0, queue_jobs: 0, failed_jobs: 0,
  }
}

export async function retryEmailLog(id: number): Promise<void> {
  await apiClient.post(`/admin/email-logs/${id}/retry`)
}
