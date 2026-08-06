import { Bot, Paperclip } from 'lucide-react'
import type { AiAssistantPersona, AiConversationThread, AiContextScope, AiSuggestedPrompt } from '@/types/ai'
import AiSuggestionCard from './AiSuggestionCard'

const personaLabel: Record<AiAssistantPersona, string> = {
  student: 'Student assistant',
  trainer: 'Trainer assistant',
  operations: 'Operations assistant',
  reports: 'Reports assistant',
  support: 'Support assistant',
}

const scopes: { id: AiContextScope; label: string }[] = [
  { id: 'knowledge', label: 'المعرفة' },
  { id: 'meetings', label: 'الاجتماعات' },
  { id: 'reports', label: 'التقارير' },
  { id: 'tasks', label: 'المهام' },
  { id: 'lms', label: 'LMS' },
  { id: 'documents', label: 'المستندات' },
  { id: 'programs', label: 'البرامج' },
]

export default function AiConversationSidebar({
  conversations,
  activeId,
  activeScopes,
  suggestions,
  onSelectConversation,
  onScopeToggle,
  onPickSuggestion,
}: {
  conversations: AiConversationThread[]
  activeId: number | null
  activeScopes: AiContextScope[]
  suggestions: AiSuggestedPrompt[]
  onSelectConversation: (id: number) => void
  onScopeToggle: (scope: AiContextScope) => void
  onPickSuggestion: (text: string) => void
}) {
  return (
    <aside className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-deepBlue text-white">
          <Bot size={18} />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">AI Workspace</p>
          <p className="text-sm font-black text-deepBlue">المحادثات</p>
        </div>
      </div>

      <ul className="space-y-1.5">
        {conversations.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelectConversation(c.id)}
              className={[
                'flex w-full flex-col rounded-xl px-3 py-2 text-right transition',
                c.id === activeId ? 'bg-deepBlue text-white' : 'bg-[#F6F8FB] text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              <span className="text-xs font-black">{c.title}</span>
              <span className={['mt-1 text-[10px] font-bold', c.id === activeId ? 'text-white/70' : 'text-slate-400'].join(' ')}>
                {personaLabel[c.persona]} · {c.updated_at}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
        <p className="mb-2 text-xs font-black text-slate-500">Context Selector</p>
        <div className="flex flex-wrap gap-1.5">
          {scopes.map((scope) => {
            const active = activeScopes.includes(scope.id)
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => onScopeToggle(scope.id)}
                className={[
                  'rounded-full px-2.5 py-1 text-[10px] font-black transition',
                  active ? 'bg-customBlue text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200',
                ].join(' ')}
              >
                {scope.label}
              </button>
            )
          })}
        </div>
        <button type="button" className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-black text-deepBlue ring-1 ring-slate-200">
          <Paperclip size={12} />
          Attach context (placeholder)
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs font-black text-slate-500">Suggested prompts</p>
        <div className="space-y-2">
          {suggestions.map((s) => (
            <AiSuggestionCard key={s.id} text={s.text} onClick={onPickSuggestion} />
          ))}
        </div>
      </div>
    </aside>
  )
}
