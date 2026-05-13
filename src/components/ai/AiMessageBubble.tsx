import { motion } from 'framer-motion'
import type { AiChatMessage } from '@/types/ai'

export default function AiMessageBubble({ message }: { message: AiChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm ring-1 ring-inset',
        isUser
          ? 'mr-auto bg-deepBlue text-white ring-deepBlue/20'
          : 'ml-auto bg-white text-deepBlue ring-slate-100',
      ].join(' ')}
    >
      <div className="whitespace-pre-wrap">{message.content}</div>
      <p className={['mt-2 text-[10px] font-bold', isUser ? 'text-white/70' : 'text-slate-400'].join(' ')}>
        {message.created_at}
      </p>
    </motion.article>
  )
}
