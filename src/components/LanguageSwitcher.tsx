import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { LANGS } from '../i18n'
import { useLanguage } from '../i18n/useLanguage'

export default function LanguageSwitcher() {
  const { t } = useTranslation()
  const { lang, setLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0]

  function switchLang(code: any) {
    setLang(code)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t('languages.switchTo', { lang: current?.label || 'العربية' })}
        className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-deepBlue/[0.11] bg-white/90 px-3.5 text-[13px] font-semibold tracking-tight text-deepBlue shadow-[0_1px_2px_rgba(34,51,74,0.045)] backdrop-blur-sm transition-all duration-200 hover:border-customBlue/25 hover:bg-white hover:text-customBlue hover:shadow-[0_6px_18px_-12px_rgba(34,51,74,0.12)]"
      >
        <Languages size={16} className="shrink-0 text-deepBlue/55" />
        <span className="hidden sm:inline">{current?.label || 'العربية'}</span>
        <ChevronDown
          size={12}
          className={['shrink-0 text-deepBlue/40 transition-transform', open ? '-rotate-180' : ''].join(' ')}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border border-deepBlue/[0.08] bg-white py-1 shadow-[0_24px_48px_-14px_rgba(15,42,67,0.2)]"
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => switchLang(l.code)}
                disabled={l.code === lang}
                className={[
                  'flex w-full items-center gap-2 px-4 py-2.5 text-sm font-bold transition',
                  l.code === lang
                    ? 'bg-customBlue/[0.08] text-customBlue'
                    : 'text-deepBlue hover:bg-customBlue/[0.05]',
                ].join(' ')}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-deepBlue/[0.1] bg-white text-[11px] font-black uppercase">
                  {l.code}
                </span>
                {l.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
