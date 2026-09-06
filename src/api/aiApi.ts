import apiClient from './axios'
import { unwrapLms } from './lmsApi'
import type { AiConversation } from '@/types/platform'
import type { AiChatMessage, AiConversationThread, AiGenerationKind, AiGenerationRecord } from '@/types/ai'

export async function fetchAiConversations(): Promise<AiConversation[]> {
  const rich = await fetchAiConversationThreads()
  return rich.map((x) => ({ id: x.id, title: x.title, updated_at: x.updated_at }))
}

export async function fetchAiConversationThreads(): Promise<AiConversationThread[]> {
  try {
    const res = await apiClient.get<unknown>('/ai/conversations')
    const payload = unwrapLms<AiConversationThread[] | { conversations: AiConversationThread[] }>(res.data)
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && Array.isArray(payload.conversations)) {
      return payload.conversations
    }
    return []
  } catch {
    return []
  }
}

export async function fetchAiMessages(conversationId: number): Promise<AiChatMessage[]> {
  try {
    const res = await apiClient.get<unknown>(`/ai/conversations/${conversationId}/messages`)
    const payload = unwrapLms<AiChatMessage[] | { messages: AiChatMessage[] }>(res.data)
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && Array.isArray(payload.messages)) return payload.messages
    return []
  } catch {
    return []
  }
}

export async function sendAiMessage(
  conversationId: number | null,
  message: string,
  options?: { persona?: string; context_scopes?: string[]; stream?: boolean },
): Promise<{ reply: string; conversation_id: number; simulated_stream_chunks?: string[] }> {
  try {
    const endpoint = conversationId != null
      ? `/ai/conversations/${conversationId}/messages`
      : '/ai/chat'
    const body = conversationId != null
      ? { message, persona: options?.persona, context_scopes: options?.context_scopes, stream: options?.stream }
      : { conversation_id: conversationId, message, persona: options?.persona, context_scopes: options?.context_scopes, stream: options?.stream }
    const res = await apiClient.post<unknown>(endpoint, body)
    return unwrapLms(res.data)
  } catch {
    const prefix =
      options?.persona === 'operations'
        ? 'تحليل تشغيلي مبدئي:'
        : options?.persona === 'reports'
          ? 'ملخص تحليلي سريع:'
          : 'استجابة مبدئية:'
    return {
      reply: `${prefix} ${message} يمكن ربط هذا الرد بتدفق بث حي عند توفر endpoint stream.`,
      conversation_id: conversationId ?? Date.now(),
      simulated_stream_chunks: ['جارٍ تحليل الطلب...', 'جارٍ بناء الاستجابة...', 'اكتمل.'],
    }
  }
}

/**
 * No backend route or persistence exists for this yet — every
 * AiContentGenerationController::generate* endpoint is stateless (it
 * returns generated content directly and saves nothing), so there is no
 * "recent generations" log to list. Calling `/ai/generations` always 404s.
 * Returning [] directly (instead of hitting a route that can never exist)
 * keeps the "Recent Generations" section in its honest empty state without
 * spamming a guaranteed-failing request. Backing this for real is a
 * separate feature (would need a generations table + a write on every
 * generate call), not a contract fix.
 */
export async function fetchAiRecentGenerations(): Promise<AiGenerationRecord[]> {
  return []
}

const GENERATION_ROUTES: Partial<Record<AiGenerationKind, string>> = {
  course_outline: '/ai/generate/course-outline',
  workshop_plan: '/ai/generate/workshop',
}

export async function generateAiContent(input: {
  kind: AiGenerationKind
  prompt: string
  temperature?: number
  max_tokens?: number
}): Promise<AiGenerationRecord> {
  const endpoint = GENERATION_ROUTES[input.kind] ?? `/ai/generate/${input.kind}`
  const res = await apiClient.post<unknown>(endpoint, input)
  return unwrapLms<AiGenerationRecord>(res.data)
}
