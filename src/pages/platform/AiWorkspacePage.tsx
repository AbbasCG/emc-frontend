import { motion } from 'framer-motion'
import { Bot, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { fetchAiConversationThreads, fetchAiMessages, generateAiContent, sendAiMessage } from '@/api/aiApi'
import { fetchAiRecommendations } from '@/api/aiRecommendationsApi'
import CommandPalette from '@/components/ai/CommandPalette'
import AiGenerationPanel from '@/components/ai/AiGenerationPanel'
import AiRecommendationCard from '@/components/ai/AiRecommendationCard'
import EmptyState from '@/components/ai/EmptyState'
import AiAssistantPanel from '@/components/platform/AiAssistantPanel'
import type { AiChatMessage, AiContextScope, AiGenerationRecord, AiRecommendation, AiSuggestedPrompt } from '@/types/ai'

export default function AiWorkspacePage() {
  const [list, setList] = useState<Awaited<ReturnType<typeof fetchAiConversationThreads>>>([])
  const [active, setActive] = useState<number | null>(null)
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [typing, setTyping] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [activeScopes, setActiveScopes] = useState<AiContextScope[]>(['knowledge', 'tasks'])
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([])
  const [generation, setGeneration] = useState<AiGenerationRecord | null>(null)
  const suggestions = useMemo<AiSuggestedPrompt[]>(() => [], [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const c = await fetchAiConversationThreads()
      if (!cancelled) {
        setList(c)
        setActive(c[0]?.id ?? null)
        setRecommendations(await fetchAiRecommendations('student'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    ;(async () => {
      const data = await fetchAiMessages(active)
      if (!cancelled) setMessages(data)
    })()
    return () => {
      cancelled = true
    }
  }, [active])

  async function handleSend(text: string) {
    if (!active) return
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: text, created_at: 'الآن' }])
    setTyping(true)
    const res = await sendAiMessage(active, text, {
      persona: list.find((x) => x.id === active)?.persona,
      context_scopes: activeScopes,
      stream: true,
    })
    setTyping(false)
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.reply,
        created_at: 'الآن',
      },
    ])
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(38,145,194,0.14),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(236,148,60,0.14),transparent_40%)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-customOrange">AI Operating System</p>
            <h1 className="mt-1 text-3xl font-black text-deepBlue">مساحة الذكاء المؤسسي</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-600">
              مساعد متعدد الأدوار، بحث دلالي، توصيات ذكية، وتوليد محتوى تشغيلي — ضمن واجهة موحدة.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-deepBlue px-4 py-2 text-xs font-black text-white shadow-md"
          >
            <Sparkles size={14} />
            Command Palette (Ctrl/Cmd + K)
          </button>
        </div>
      </motion.div>

      <AiAssistantPanel
        conversations={list}
        activeId={active}
        messages={messages}
        typing={typing}
        activeScopes={activeScopes}
        suggestions={suggestions}
        onSelectConversation={(id) => setActive(id)}
        onToggleScope={(scope) =>
          setActiveScopes((prev) => (prev.includes(scope) ? prev.filter((x) => x !== scope) : [...prev, scope]))
        }
        onPickSuggestion={(text) => void handleSend(text)}
        onSend={handleSend}
      />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_minmax(0,1fr)]">
        <AiGenerationPanel
          output={generation?.output_markdown}
          onGenerate={async (input) => {
            const generated = await generateAiContent({ kind: input.kind, prompt: input.prompt, temperature: input.temperature })
            setGeneration(generated)
          }}
        />
        <section className="space-y-3">
          <h2 className="text-sm font-black text-deepBlue">توصيات ذكية (طالب)</h2>
          {recommendations.length === 0 ? (
            <EmptyState title="لا توصيات بعد" description="ستظهر الاقتراحات عند توفر تحليلات كافية." />
          ) : (
            recommendations.map((item) => <AiRecommendationCard key={item.id} recommendation={item} />)
          )}
        </section>
      </div>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="fixed bottom-6 left-6 z-40 inline-flex items-center gap-2 rounded-full bg-deepBlue px-4 py-3 text-xs font-black text-white shadow-xl shadow-deepBlue/30"
      >
        <Bot size={16} />
        مساعد AI
      </button>

      <CommandPalette open={paletteOpen} onOpen={() => setPaletteOpen(true)} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
