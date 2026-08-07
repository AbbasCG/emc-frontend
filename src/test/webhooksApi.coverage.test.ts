import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  WEBHOOK_EVENT_LABELS_AR,
  fetchWebhookEndpoints,
  fetchWebhookEndpoint,
  fetchWebhookDeliveries,
  createWebhookEndpoint,
  patchWebhookEndpoint,
  testWebhookEndpoint,
} from '@/api/webhooksApi'
import type { WebhookDelivery, WebhookEndpoint, WebhookPhaseEvent } from '@/types/phase7'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

const endpoint: WebhookEndpoint = {
  id: 1,
  url: 'https://partner.example.com/hooks/emc',
  active: true,
  events: ['registration.created', 'payment.confirmed'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
}

describe('WEBHOOK_EVENT_LABELS_AR', () => {
  it('has an Arabic label for every phase event', () => {
    const expected: Record<WebhookPhaseEvent, string> = {
      'registration.created': 'إنشاء تسجيل',
      'payment.confirmed': 'تأكيد دفع',
      'certificate.issued': 'إصدار شهادة',
      'task.completed': 'اكتمال مهمة',
      'meeting.created': 'إنشاء اجتماع',
      'partner.requested': 'طلب شراكة',
      'support.ticket.created': 'تذكرة دعم جديدة',
    }
    expect(WEBHOOK_EVENT_LABELS_AR).toEqual(expected)
    // no raw English label leaks
    for (const label of Object.values(WEBHOOK_EVENT_LABELS_AR)) {
      expect(label).not.toMatch(/^[a-zA-Z]/)
    }
  })
})

describe('fetchWebhookEndpoints', () => {
  it('returns the list from a wrapped payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [endpoint] } })
    expect(await fetchWebhookEndpoints()).toEqual([endpoint])
    expect(mockedApi.get).toHaveBeenCalledWith('/webhooks')
  })

  it('returns the list from a bare-array payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [endpoint] })
    expect(await fetchWebhookEndpoints()).toEqual([endpoint])
  })

  it('returns [] for a non-list payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { unexpected: true } } })
    expect(await fetchWebhookEndpoints()).toEqual([])
  })

  it('swallows errors and returns []', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    expect(await fetchWebhookEndpoints()).toEqual([])
  })
})

describe('fetchWebhookEndpoint', () => {
  it('unwraps a single endpoint', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: endpoint } })
    expect(await fetchWebhookEndpoint(1)).toEqual(endpoint)
    expect(mockedApi.get).toHaveBeenCalledWith('/webhooks/1')
  })

  it('returns undefined on error', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('404'))
    expect(await fetchWebhookEndpoint(99)).toBeUndefined()
  })
})

describe('fetchWebhookDeliveries', () => {
  it('lists deliveries for the webhook', async () => {
    const delivery: WebhookDelivery = {
      id: 10,
      webhook_id: 1,
      event: 'certificate.issued',
      status: 'failed',
      http_status: 500,
      attempted_at: '2026-02-01T12:00:00Z',
      detail_ar: 'فشل الاتصال بالخادم',
    }
    mockedApi.get.mockResolvedValueOnce({ data: { data: [delivery] } })
    expect(await fetchWebhookDeliveries(1)).toEqual([delivery])
    expect(mockedApi.get).toHaveBeenCalledWith('/webhooks/1/deliveries')
  })

  it('returns [] on error', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('boom'))
    expect(await fetchWebhookDeliveries(1)).toEqual([])
  })
})

describe('createWebhookEndpoint', () => {
  const body = {
    url: 'https://partner.example.com/hooks/emc',
    events: ['registration.created'] as WebhookPhaseEvent[],
    active: true,
  }

  it('handles the { endpoint, secret } envelope shape', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { endpoint, secret: 'whsec_abc' } } })
    const out = await createWebhookEndpoint(body)
    expect(mockedApi.post).toHaveBeenCalledWith('/webhooks', body)
    expect(out).toEqual({ endpoint, secret: 'whsec_abc' })
  })

  it('handles the flat endpoint-with-secret shape', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: { ...endpoint, secret: 'whsec_xyz' } } })
    const out = await createWebhookEndpoint(body)
    expect(out.secret).toBe('whsec_xyz')
    expect(out.endpoint).toEqual({ ...endpoint, secret: 'whsec_xyz' })
  })

  it('propagates errors (no internal catch)', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('422'))
    await expect(createWebhookEndpoint(body)).rejects.toThrow('422')
  })
})

describe('patchWebhookEndpoint', () => {
  it('patches and unwraps the updated endpoint', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: { data: { ...endpoint, active: false } } })
    const out = await patchWebhookEndpoint(1, { active: false })
    expect(mockedApi.patch).toHaveBeenCalledWith('/webhooks/1', { active: false })
    expect(out?.active).toBe(false)
  })

  it('returns null on error', async () => {
    mockedApi.patch.mockRejectedValueOnce(new Error('403'))
    expect(await patchWebhookEndpoint(1, { active: true })).toBeNull()
  })
})

describe('testWebhookEndpoint', () => {
  it('posts the sample and reports ok:true', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    const sample = { event: 'registration.created', payload: { name: 'محمد' } }
    expect(await testWebhookEndpoint(5, sample)).toEqual({ ok: true })
    expect(mockedApi.post).toHaveBeenCalledWith('/webhooks/5/test', { sample })
  })

  it('reports ok:false when the test call fails', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('timeout'))
    expect(await testWebhookEndpoint(5)).toEqual({ ok: false })
  })
})
