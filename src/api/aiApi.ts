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
    const res = await apiClient.post<unknown>('/ai/chat', {
      conversation_id: conversationId,
      message,
      persona: options?.persona,
      context_scopes: options?.context_scopes,
      stream: options?.stream,
    })
    return unwrapLms(res.data)
  } catch {
    const prefix =
      options?.persona === 'operations'
        ? 'تحليل تشغيلي مبدئي:'
        : options?.persona === 'reports'
          ? 'ملخص تحليلي سريع:'
          : 'استجابة مبدئية:'
    return {
      reply: `${prefix} ${message} — يمكن ربط هذا الرد بتدفق بث حي عند توفر endpoint stream.`,
      conversation_id: conversationId ?? Date.now(),
      simulated_stream_chunks: ['جارٍ تحليل الطلب...', 'جارٍ بناء الاستجابة...', 'اكتمل.'],
    }
  }
}

export async function fetchAiRecentGenerations(): Promise<AiGenerationRecord[]> {
  try {
    const res = await apiClient.get<unknown>('/ai/generations')
    const payload = unwrapLms<AiGenerationRecord[] | { records: AiGenerationRecord[] }>(res.data)
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && Array.isArray(payload.records)) return payload.records
    return []
  } catch {
    return []
  }
}

export async function generateAiContent(input: {
  kind: AiGenerationKind
  prompt: string
  temperature?: number
  max_tokens?: number
}): Promise<AiGenerationRecord> {
  const res = await apiClient.post<unknown>('/ai/generations', input)
  return unwrapLms<AiGenerationRecord>(res.data)
}
