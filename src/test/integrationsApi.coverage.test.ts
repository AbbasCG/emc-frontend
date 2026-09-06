import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchIntegrations,
  fetchWhatsAppIntegration,
  fetchEmailIntegration,
  sendWhatsAppTestMessage,
  sendEmailSmokeTest,
} from '@/api/integrationsApi'
import type {
  EmailIntegrationPreview,
  IntegrationSummary,
  WhatsAppIntegrationPreview,
} from '@/types/phase7'

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

const summary = {
  provider: 'whatsapp',
  title_ar: 'واتساب للأعمال',
  description_ar: 'إرسال إشعارات عبر واتساب',
  status: 'connected',
  settings_path: '/settings/integrations/whatsapp',
} as unknown as IntegrationSummary

describe('fetchIntegrations', () => {
  it('accepts a bare array under the data envelope', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [summary] } })
    await expect(fetchIntegrations()).resolves.toEqual([summary])
    expect(mockedApi.get).toHaveBeenCalledWith('/integrations')
  })

  it('accepts the { integrations: [...] } object shape', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { integrations: [summary] } } })
    await expect(fetchIntegrations()).resolves.toEqual([summary])
  })

  it('returns [] for a malformed payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { integrations: 'ليست قائمة' } } })
    await expect(fetchIntegrations()).resolves.toEqual([])
  })

  it('returns [] when the request fails (never throws)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchIntegrations()).resolves.toEqual([])
  })
})

describe('fetchWhatsAppIntegration / fetchEmailIntegration', () => {
  it('fetchWhatsAppIntegration unwraps the { data } envelope', async () => {
    const preview: WhatsAppIntegrationPreview = {
      mode: 'meta_cloud',
      meta_placeholder_ar: 'أدخل رمز ميتا',
      twilio_placeholder_ar: 'أدخل رمز تويليو',
    }
    mockedApi.get.mockResolvedValueOnce({ data: { data: preview } })
    await expect(fetchWhatsAppIntegration()).resolves.toEqual(preview)
    expect(mockedApi.get).toHaveBeenCalledWith('/integrations/whatsapp')
  })

  it('fetchEmailIntegration unwraps the { data } envelope', async () => {
    const preview: EmailIntegrationPreview = {
      driver_label_ar: 'خادم SMTP',
      driver_hint_ar: 'الإعدادات محفوظة في الخادم',
      templates: [{ id: 't1', name_ar: 'رسالة الترحيب', slug: 'welcome' }],
    }
    mockedApi.get.mockResolvedValueOnce({ data: { data: preview } })
    await expect(fetchEmailIntegration()).resolves.toEqual(preview)
    expect(mockedApi.get).toHaveBeenCalledWith('/integrations/email')
  })

  it('both propagate request errors (no silent fallback)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('500'))
    await expect(fetchWhatsAppIntegration()).rejects.toThrow('500')
    mockedApi.get.mockRejectedValueOnce(new Error('500'))
    await expect(fetchEmailIntegration()).rejects.toThrow('500')
  })
})

describe('smoke-test senders (fire-and-forget)', () => {
  it('sendWhatsAppTestMessage POSTs the payload, defaulting to {}', async () => {
    mockedApi.post.mockResolvedValue({ data: {} })
    await sendWhatsAppTestMessage({ to: '+201001234567', template: 'welcome' })
    expect(mockedApi.post).toHaveBeenCalledWith('/integrations/whatsapp/test', {
      to: '+201001234567',
      template: 'welcome',
    })

    await sendWhatsAppTestMessage()
    expect(mockedApi.post).toHaveBeenLastCalledWith('/integrations/whatsapp/test', {})
  })

  it('sendWhatsAppTestMessage swallows errors (resolves anyway)', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('provider down'))
    await expect(sendWhatsAppTestMessage()).resolves.toBeUndefined()
  })

  it('sendEmailSmokeTest POSTs the payload, defaulting to {}', async () => {
    mockedApi.post.mockResolvedValue({ data: {} })
    await sendEmailSmokeTest({ to: 'test@example.com' })
    expect(mockedApi.post).toHaveBeenCalledWith('/integrations/email/test', { to: 'test@example.com' })

    await sendEmailSmokeTest()
    expect(mockedApi.post).toHaveBeenLastCalledWith('/integrations/email/test', {})
  })

  it('sendEmailSmokeTest swallows errors (resolves anyway)', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('smtp down'))
    await expect(sendEmailSmokeTest()).resolves.toBeUndefined()
  })
})
