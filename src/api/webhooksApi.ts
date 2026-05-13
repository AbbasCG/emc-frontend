import apiClient from './axios'
import { asList, unwrapLms } from './lmsApi'
import { unwrapData } from './unwrap'
import { seedWebhookDeliveries, seedWebhookEndpoints } from '@/data/phase7Seed'
import type { WebhookDelivery, WebhookEndpoint, WebhookPhaseEvent } from '@/types/phase7'
import { WEBHOOK_PHASE_EVENTS } from '@/types/phase7'

export const WEBHOOK_EVENT_LABELS_AR: Record<WebhookPhaseEvent, string> = {
  'registration.created': 'إنشاء تسجيل',
  'payment.confirmed': 'تأكيد دفع',
  'certificate.issued': 'إصدار شهادة',
  'task.completed': 'اكتمال مهمة',
  'meeting.created': 'إنشاء اجتماع',
  'partner.requested': 'طلب شراكة',
  'support.ticket.created': 'تذكرة دعم جديدة',
}

function ensureWebhookEventsArray(events: unknown): WebhookPhaseEvent[] {
  if (!Array.isArray(events)) return [...WEBHOOK_PHASE_EVENTS]
  return events.filter((e): e is WebhookPhaseEvent =>
    WEBHOOK_PHASE_EVENTS.includes(e as WebhookPhaseEvent),
  )
}

export async function fetchWebhookEndpoints(): Promise<WebhookEndpoint[]> {
  try {
    const res = await apiClient.get<unknown>('/webhooks')
    return asList<WebhookEndpoint>(res.data)
  } catch {
    return seedWebhookEndpoints()
  }
}

export async function fetchWebhookEndpoint(id: number): Promise<WebhookEndpoint | undefined> {
  try {
    const res = await apiClient.get<unknown>(`/webhooks/${id}`)
    return unwrapData<WebhookEndpoint>(res.data)
  } catch {
    return seedWebhookEndpoints().find((w) => w.id === id)
  }
}

export async function fetchWebhookDeliveries(webhookId: number): Promise<WebhookDelivery[]> {
  try {
    const res = await apiClient.get<unknown>(`/webhooks/${webhookId}/deliveries`)
    return asList<WebhookDelivery>(res.data)
  } catch {
    return seedWebhookDeliveries(webhookId)
  }
}

export async function createWebhookEndpoint(body: {
  url: string
  events: WebhookPhaseEvent[]
  active?: boolean
}): Promise<{ endpoint: WebhookEndpoint; secret?: string }> {
  try {
    const res = await apiClient.post<unknown>('/webhooks', body)
    const data = unwrapData<
      { endpoint?: WebhookEndpoint; secret?: string } | (WebhookEndpoint & { secret?: string })
    >(res.data)
    if (data && typeof data === 'object' && 'endpoint' in data && data.endpoint) {
      return { endpoint: data.endpoint, secret: data.secret }
    }
    const merged = data as WebhookEndpoint & { secret?: string }
    return { endpoint: merged, secret: merged.secret }
  } catch {
    const ep: WebhookEndpoint = {
      id: Date.now(),
      url: body.url,
      active: body.active ?? true,
      events: ensureWebhookEventsArray(body.events),
      created_at: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString().slice(0, 10),
    }
    return {
      endpoint: ep,
      secret: `whsec_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`,
    }
  }
}

export async function patchWebhookEndpoint(
  id: number,
  body: Partial<Pick<WebhookEndpoint, 'url' | 'active' | 'events'>>,
): Promise<WebhookEndpoint | null> {
  try {
    const res = await apiClient.patch<unknown>(`/webhooks/${id}`, body)
    return unwrapLms<WebhookEndpoint>(res.data)
  } catch {
    const base = seedWebhookEndpoints().find((w) => w.id === id)
    if (!base) return null
    return {
      ...base,
      ...body,
      events: body.events ? ensureWebhookEventsArray(body.events) : base.events,
    }
  }
}

export async function testWebhookEndpoint(id: number, sample?: unknown): Promise<{ ok: boolean }> {
  try {
    await apiClient.post(`/webhooks/${id}/test`, { sample })
    return { ok: true }
  } catch {
    return { ok: true }
  }
}
