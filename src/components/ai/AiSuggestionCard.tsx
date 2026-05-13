import { Sparkles } from 'lucide-react'

export default function AiSuggestionCard({
  text,
  onClick,
}: {
  text: string
  onClick?: (text: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(text)}
      className="flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2 text-right text-xs font-black text-deepBlue ring-1 ring-slate-100 transition hover:ring-customBlue/35"
    >
      <Sparkles size={14} className="text-customOrange" />
      <span className="truncate">{text}</span>
    </button>
  )
}
