import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'

const silent = { skipErrorToast: true as const }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmailSettingItem {
  key: string
  label: string
  description: string
  enabled: boolean
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
  user_id: number | null
  recipient: string
  type: string
  subject: string | null
  status: 'pending' | 'sent' | 'failed'
  error_message: string | null
  queued_at: string | null
  sent_at: string | null
  failed_at: string | null
  created_at: string
  user?: { id: number; name: string; email: string } | null
}

export interface EmailLogMeta {
  total: number
  current_page: number
  last_page: number
  per_page: number
}

export interface EmailLogStats {
  total: number
  sent_today: number
  failed_today: number
  pending: number
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
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}): Promise<{ data: EmailLog[]; meta: EmailLogMeta }> {
  const res = await apiClient.get<unknown>('/admin/email-logs', { params, ...silent })
  const body = unwrapData<{ data: EmailLog[]; meta: EmailLogMeta }>(res.data) as {
    data: EmailLog[]
    meta: EmailLogMeta
  }
  return body ?? { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 25 } }
}

export async function fetchEmailLogStats(): Promise<EmailLogStats> {
  const res = await apiClient.get<unknown>('/admin/email-logs/stats', silent)
  return (unwrapData<EmailLogStats>(res.data) as EmailLogStats) ?? {
    total: 0,
    sent_today: 0,
    failed_today: 0,
    pending: 0,
  }
}

export async function retryEmailLog(id: number): Promise<void> {
  await apiClient.post(`/admin/email-logs/${id}/retry`)
}
