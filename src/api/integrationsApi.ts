import apiClient from './axios'
import { unwrapData } from './unwrap'
import type {
  EmailIntegrationPreview,
  IntegrationSummary,
  WhatsAppIntegrationPreview,
} from '@/types/phase7'

export async function fetchIntegrations(): Promise<IntegrationSummary[]> {
  try {
    const res = await apiClient.get<unknown>('/integrations')
    const inner = unwrapData<{ integrations?: IntegrationSummary[] } | IntegrationSummary[]>(res.data)
    if (Array.isArray(inner)) return inner
    if (inner && typeof inner === 'object' && Array.isArray((inner as { integrations: IntegrationSummary[] }).integrations)) {
      return (inner as { integrations: IntegrationSummary[] }).integrations
    }
    return []
  } catch {
    return []
  }
}

export async function fetchWhatsAppIntegration(): Promise<WhatsAppIntegrationPreview> {
  const res = await apiClient.get<unknown>('/integrations/whatsapp')
  return unwrapData<WhatsAppIntegrationPreview>(res.data)
}

export async function fetchEmailIntegration(): Promise<EmailIntegrationPreview> {
  const res = await apiClient.get<unknown>('/integrations/email')
  return unwrapData<EmailIntegrationPreview>(res.data)
}

/** Sends smoke-test WhatsApp — backend queues provider delivery */
export async function sendWhatsAppTestMessage(payload?: {
  to?: string
  template?: string
}): Promise<void> {
  try {
    await apiClient.post('/integrations/whatsapp/test', payload ?? {})
  } catch {
    /* noop — UI shows toast separately when wired */
  }
}

/** Sends test transactional email — secrets remain server-side */
export async function sendEmailSmokeTest(payload?: { to?: string }): Promise<void> {
  try {
    await apiClient.post('/integrations/email/test', payload ?? {})
  } catch {
    /* noop */
  }
}
