import { motion } from 'framer-motion'

export default function AiTypingIndicator() {
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl bg-[#F6F8FB] px-3 py-2 ring-1 ring-slate-100">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-customBlue/70"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
        />
      ))}
      <span className="mr-2 text-[11px] font-bold text-slate-500">AI يكتب...</span>
    </div>
  )
}
