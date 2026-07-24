import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder: string
  delay?: number
}

/**
 * Compact pill search — debounced, RTL. Capped to a modest width on desktop
 * (260–320px) so it never dominates the toolbar; full width on mobile.
 */
export default function SearchInput({ value, onChange, placeholder, delay = 280 }: Props) {
  const [raw, setRaw] = useState(value)
  const [focused, setFocused] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => setRaw(value), [value])

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current) }, [])

  function handleChange(v: string) {
    setRaw(v)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => onChange(v), delay)
  }

  function clear() {
    setRaw('')
    if (timerRef.current) window.clearTimeout(timerRef.current)
    onChange('')
  }

  return (
    <motion.div
      className="relative w-full sm:w-[280px] shrink-0"
      animate={{ scale: focused ? 1.015 : 1 }}
      transition={{ duration: 0.15 }}
    >
      <Search className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#0C2A4B]/35" />
      <input
        type="text"
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        dir="rtl"
        className={`h-9 w-full rounded-full border bg-white pe-3.5 ps-9 text-[12px] font-semibold text-[#0C2A4B] outline-none transition-all placeholder:text-[#0C2A4B]/35 ${
          focused
            ? 'border-[#0077B6]/40 shadow-[0_2px_12px_-2px_rgba(0,119,182,0.25)]'
            : 'border-[#0C2A4B]/10 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#0C2A4B]/20'
        }`}
      />
      {raw && (
        <button
          type="button"
          onClick={clear}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#0C2A4B]/35 transition hover:bg-slate-100 hover:text-[#0C2A4B]"
          aria-label="مسح البحث"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  )
}
