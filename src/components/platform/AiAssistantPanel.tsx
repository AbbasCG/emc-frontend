import { AnimatePresence } from 'framer-motion'
import { Paperclip, Send, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { AiConversationThread, AiContextScope, AiSuggestedPrompt } from '@/types/ai'
import type { AiConversation } from '@/types/platform'
import AiConversationSidebar from '@/components/ai/AiConversationSidebar'
import AiMessageBubble from '@/components/ai/AiMessageBubble'
import AiTypingIndicator from '@/components/ai/AiTypingIndicator'

type LegacyConversation = AiConversation

type Props = {
  conversations: (AiConversationThread | LegacyConversation)[]
  activeId: number | null
  messages: { id: number; role: 'user' | 'assistant' | 'system'; content: string; created_at: string }[]
  suggestions: AiSuggestedPrompt[]
  typing?: boolean
  activeScopes: AiContextScope[]
  onSelectConversation: (id: number) => void
  onToggleScope: (scope: AiContextScope) => void
  onPickSuggestion: (text: string) => void
  onSend: (text: string) => Promise<void>
}

function normalizeConversations(items: Props['conversations']): AiConversationThread[] {
  return items.map((item) =>
    'persona' in item
      ? item
      : {
          id: item.id,
          title: item.title,
          updated_at: item.updated_at,
          persona: 'student',
        },
  )
}

export default function AiAssistantPanel({
  conversations,
  activeId,
  messages,
  suggestions,
  typing = false,
  activeScopes,
  onSelectConversation,
  onToggleScope,
  onPickSuggestion,
  onSend,
}: Props) {
  const [input, setInput] = useState('')
  const normalized = useMemo(() => normalizeConversations(conversations), [conversations])

  async function submit() {
    const text = input.trim()
    if (!text) return
    setInput('')
    await onSend(text)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]" dir="rtl">
      <AiConversationSidebar
        conversations={normalized}
        activeId={activeId}
        activeScopes={activeScopes}
        suggestions={suggestions}
        onSelectConversation={onSelectConversation}
        onScopeToggle={onToggleScope}
        onPickSuggestion={onPickSuggestion}
      />

      <section className="relative flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0, 119, 182,0.08),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(242, 140, 0,0.1),transparent_40%)]" />
        <header className="relative border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">AI Assistant</p>
              <h2 className="text-lg font-black text-deepBlue">مساعد EMC المؤسسي</h2>
            </div>
            <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-[#F6F8FB] px-3 py-1.5 text-[11px] font-black text-slate-600 ring-1 ring-slate-100">
              <Paperclip size={13} />
              Attach context
            </button>
          </div>
        </header>

        <div className="relative flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <AiMessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>
          {typing && <AiTypingIndicator />}
        </div>

        <footer className="relative border-t border-slate-100 p-4">
          <div className="mb-2 flex items-center gap-1 text-[11px] font-black text-slate-400">
            <Sparkles size={12} className="text-customOrange" />
            Smart actions: تلخيص، استخراج قرارات، اقتراح خطة
          </div>
          <div className="flex gap-2 rounded-2xl bg-[#F6F8FB] p-2 ring-1 ring-slate-100">
            <textarea
              rows={2}
              className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-transparent bg-white px-3 py-2 text-sm font-medium text-deepBlue outline-none ring-customBlue/30 focus:ring-2"
              placeholder="اكتب طلبك... (يدعم markdown placeholder)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void submit()}
              className="inline-flex h-fit items-center gap-1 rounded-xl bg-customBlue px-4 py-2 text-xs font-black text-white shadow-md transition hover:opacity-95"
            >
              <Send size={14} />
              إرسال
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}
