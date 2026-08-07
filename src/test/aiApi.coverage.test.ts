import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchAiConversations,
  fetchAiConversationThreads,
  fetchAiMessages,
  sendAiMessage,
  fetchAiRecentGenerations,
  generateAiContent,
} from '@/api/aiApi'
import type { AiChatMessage, AiConversationThread, AiGenerationRecord } from '@/types/ai'

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

const thread = {
  id: 1,
  title: 'استفسار عن الدورات',
  persona: 'general',
  updated_at: '2026-08-01T10:00:00Z',
} as unknown as AiConversationThread

describe('fetchAiConversationThreads / fetchAiConversations', () => {
  it('accepts a bare array payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [thread] } })
    await expect(fetchAiConversationThreads()).resolves.toEqual([thread])
    expect(mockedApi.get).toHaveBeenCalledWith('/ai/conversations')
  })

  it('accepts the { conversations: [...] } shape', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { conversations: [thread] } } })
    await expect(fetchAiConversationThreads()).resolves.toEqual([thread])
  })

  it('returns [] for malformed payloads and on request failure', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { conversations: null } } })
    await expect(fetchAiConversationThreads()).resolves.toEqual([])

    mockedApi.get.mockRejectedValueOnce(new Error('down'))
    await expect(fetchAiConversationThreads()).resolves.toEqual([])
  })

  it('fetchAiConversations projects threads down to { id, title, updated_at }', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [thread] } })
    await expect(fetchAiConversations()).resolves.toEqual([
      { id: 1, title: 'استفسار عن الدورات', updated_at: '2026-08-01T10:00:00Z' },
    ])
  })
})

describe('fetchAiMessages', () => {
  const message: AiChatMessage = {
    id: 10,
    role: 'assistant',
    content: 'أهلاً بك! كيف أساعدك؟',
    created_at: '2026-08-01T10:01:00Z',
  }

  it('accepts a bare array payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [message] } })
    await expect(fetchAiMessages(5)).resolves.toEqual([message])
    expect(mockedApi.get).toHaveBeenCalledWith('/ai/conversations/5/messages')
  })

  it('accepts the { messages: [...] } shape', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { messages: [message] } } })
    await expect(fetchAiMessages(5)).resolves.toEqual([message])
  })

  it('returns [] for malformed payloads and on request failure', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: 42 } })
    await expect(fetchAiMessages(5)).resolves.toEqual([])

    mockedApi.get.mockRejectedValueOnce(new Error('down'))
    await expect(fetchAiMessages(5)).resolves.toEqual([])
  })
})

describe('sendAiMessage', () => {
  it('POSTs to the conversation-scoped endpoint when a conversation exists', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { data: { reply: 'تم', conversation_id: 5 } },
    })
    const res = await sendAiMessage(5, 'مرحبا', { persona: 'operations', stream: true })
    expect(mockedApi.post).toHaveBeenCalledWith('/ai/conversations/5/messages', {
      message: 'مرحبا',
      persona: 'operations',
      context_scopes: undefined,
      stream: true,
    })
    expect(res).toEqual({ reply: 'تم', conversation_id: 5 })
  })

  it('POSTs to /ai/chat with conversation_id null when starting a new conversation', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { data: { reply: 'أهلاً', conversation_id: 77 } },
    })
    const res = await sendAiMessage(null, 'سؤال جديد')
    expect(mockedApi.post).toHaveBeenCalledWith('/ai/chat', {
      conversation_id: null,
      message: 'سؤال جديد',
    })
    expect(res.conversation_id).toBe(77)
  })

  it('falls back to a simulated Arabic reply on failure — operations persona prefix', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('down'))
    const res = await sendAiMessage(3, 'حلل الأداء', { persona: 'operations' })
    expect(res.reply.startsWith('تحليل تشغيلي مبدئي:')).toBe(true)
    expect(res.conversation_id).toBe(3) // keeps the existing conversation id
    expect(res.simulated_stream_chunks).toEqual(['جارٍ تحليل الطلب...', 'جارٍ بناء الاستجابة...', 'اكتمل.'])
  })

  it('fallback uses the reports prefix and the default prefix, and mints a numeric id when none exists', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('down'))
    const reports = await sendAiMessage(1, 'تقرير', { persona: 'reports' })
    expect(reports.reply.startsWith('ملخص تحليلي سريع:')).toBe(true)

    mockedApi.post.mockRejectedValueOnce(new Error('down'))
    const generic = await sendAiMessage(null, 'مرحبا')
    expect(generic.reply.startsWith('استجابة مبدئية:')).toBe(true)
    expect(typeof generic.conversation_id).toBe('number')
  })
})

describe('fetchAiRecentGenerations / generateAiContent', () => {
  const record: AiGenerationRecord = {
    id: 4,
    kind: 'course_outline',
    title: 'مخطط دورة البرمجة',
    prompt: 'أنشئ مخطط دورة برمجة للمبتدئين',
    output_markdown: '## الوحدة الأولى',
    created_at: '2026-08-02T09:00:00Z',
  }

  it('fetchAiRecentGenerations accepts bare array and { records } shapes, [] otherwise', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [record] } })
    await expect(fetchAiRecentGenerations()).resolves.toEqual([record])
    expect(mockedApi.get).toHaveBeenCalledWith('/ai/generations')

    mockedApi.get.mockResolvedValueOnce({ data: { data: { records: [record] } } })
    await expect(fetchAiRecentGenerations()).resolves.toEqual([record])

    mockedApi.get.mockResolvedValueOnce({ data: { data: {} } })
    await expect(fetchAiRecentGenerations()).resolves.toEqual([])

    mockedApi.get.mockRejectedValueOnce(new Error('down'))
    await expect(fetchAiRecentGenerations()).resolves.toEqual([])
  })

  it('generateAiContent maps known kinds to dedicated routes', async () => {
    mockedApi.post.mockResolvedValue({ data: { data: record } })

    await generateAiContent({ kind: 'course_outline', prompt: 'مخطط' })
    expect(mockedApi.post).toHaveBeenLastCalledWith('/ai/generate/course-outline', {
      kind: 'course_outline',
      prompt: 'مخطط',
    })

    await generateAiContent({ kind: 'workshop_plan', prompt: 'ورشة' })
    expect(mockedApi.post).toHaveBeenLastCalledWith('/ai/generate/workshop', {
      kind: 'workshop_plan',
      prompt: 'ورشة',
    })
  })

  it('generateAiContent falls back to /ai/generate/{kind} for unmapped kinds and unwraps the record', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: record } })
    const out = await generateAiContent({ kind: 'quiz', prompt: 'اختبار', temperature: 0.2, max_tokens: 500 })
    expect(mockedApi.post).toHaveBeenCalledWith('/ai/generate/quiz', {
      kind: 'quiz',
      prompt: 'اختبار',
      temperature: 0.2,
      max_tokens: 500,
    })
    expect(out).toEqual(record)
  })

  it('generateAiContent propagates request errors', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('429'))
    await expect(generateAiContent({ kind: 'quiz', prompt: 'x' })).rejects.toThrow('429')
  })
})
