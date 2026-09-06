import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import { unwrapData } from './unwrap'
import type { WebhookDelivery, WebhookEndpoint, WebhookPhaseEvent } from '@/types/phase7'

export const WEBHOOK_EVENT_LABELS_AR: Record<WebhookPhaseEvent, string> = {
  'registration.created': 'إنشاء تسجيل',
  'payment.confirmed': 'تأكيد دفع',
  'certificate.issued': 'إصدار شهادة',
  'task.completed': 'اكتمال مهمة',
  'meeting.created': 'إنشاء اجتماع',
  'partner.requested': 'طلب شراكة',
  'support.ticket.created': 'تذكرة دعم جديدة',
}

export async function fetchWebhookEndpoints(): Promise<WebhookEndpoint[]> {
  try {
    const res = await apiClient.get<unknown>('/webhooks')
    return asList<WebhookEndpoint>(res.data)
  } catch {
    return []
  }
}

export async function fetchWebhookEndpoint(id: number): Promise<WebhookEndpoint | undefined> {
  try {
    const res = await apiClient.get<unknown>(`/webhooks/${id}`)
    return unwrapData<WebhookEndpoint>(res.data)
  } catch {
    return undefined
  }
}

export async function fetchWebhookDeliveries(webhookId: number): Promise<WebhookDelivery[]> {
  try {
    const res = await apiClient.get<unknown>(`/webhooks/${webhookId}/deliveries`)
    return asList<WebhookDelivery>(res.data)
  } catch {
    return []
  }
}

export async function createWebhookEndpoint(body: {
  url: string
  events: WebhookPhaseEvent[]
  active?: boolean
}): Promise<{ endpoint: WebhookEndpoint; secret?: string }> {
  const res = await apiClient.post<unknown>('/webhooks', body)
  const data = unwrapData<
    { endpoint?: WebhookEndpoint; secret?: string } | (WebhookEndpoint & { secret?: string })
  >(res.data)
  if (data && typeof data === 'object' && 'endpoint' in data && data.endpoint) {
    return { endpoint: data.endpoint, secret: data.secret }
  }
  const merged = data as WebhookEndpoint & { secret?: string }
  return { endpoint: merged, secret: merged.secret }
}

export async function patchWebhookEndpoint(
  id: number,
  body: Partial<Pick<WebhookEndpoint, 'url' | 'active' | 'events'>>,
): Promise<WebhookEndpoint | null> {
  try {
    const res = await apiClient.patch<unknown>(`/webhooks/${id}`, body)
    return unwrapLms<WebhookEndpoint>(res.data)
  } catch {
    return null
  }
}

export async function testWebhookEndpoint(id: number, sample?: unknown): Promise<{ ok: boolean }> {
  try {
    await apiClient.post(`/webhooks/${id}/test`, { sample })
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
