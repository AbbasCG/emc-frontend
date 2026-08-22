import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Gauge, X } from 'lucide-react'

/**
 * ومضة الاختبار — أيقونة عائمة على الموقع العام تُخرج كل فترة جملة خاطفة
 * تدعو الزائر إلى «اختبر مستواك في AI» وتقوده إليه بنقرة. تختفي داخل صفحات
 * الاختبار ولوحة التحكم، وتُكتم للجلسة بنقرة.
 */

const HOOKS = [
  'أين أنت في عالم AI؟ 15 سؤالاً تكشف مستواك.',
  '3 دقائق تعرف بعدها خطوتك التالية في الذكاء الاصطناعي.',
  'هل أنت مستكشف أم مهندس أنظمة؟ اكتشف مستواك الآن.',
  'نتيجة فورية + خطة شخصية + مكافأة 7% على برامجك المقترحة.',
  'لا تتعلم كل شيء — اعرف مستواك واختر الخطوة الصحيحة.',
  'تحدَّ أصدقاءك: من منكم أعلى مستوى في AI؟',
] as const

const MUTE_KEY = 'emc_assessment_spark_muted'
const SHOW_AFTER_MS = 9_000
const VISIBLE_MS = 8_000
const INTERVAL_MS = 50_000

export default function AssessmentSparkWidget() {
  const { pathname } = useLocation()
  const shouldReduce = useReducedMotion()
  const [hookIndex, setHookIndex] = useState<number | null>(null)
  const [muted, setMuted] = useState(() => {
    try {
      return sessionStorage.getItem(MUTE_KEY) === '1'
    } catch {
      return false
    }
  })
  const counter = useRef(-1)

  useEffect(() => {
    if (muted) return
    if (counter.current === -1) counter.current = 0
    let hideTimer: number | undefined
    const show = () => {
      counter.current = (counter.current + 1) % HOOKS.length
      setHookIndex(counter.current)
      hideTimer = window.setTimeout(() => setHookIndex(null), VISIBLE_MS)
    }
    const first = window.setTimeout(show, SHOW_AFTER_MS)
    const loop = window.setInterval(show, INTERVAL_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(loop)
      if (hideTimer) window.clearTimeout(hideTimer)
    }
  }, [muted])

  // لا تظهر على الاختبار نفسه ولا داخل لوحة التحكم (لها ومضتها الخاصة).
  if (pathname.startsWith('/ai-level') || pathname.startsWith('/dashboard')) return null

  function mute() {
    setHookIndex(null)
    setMuted(true)
    try {
      sessionStorage.setItem(MUTE_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <div dir="rtl" className="fixed bottom-5 start-5 z-40 flex items-end gap-3">
      <Link
        to="/ai-level"
        aria-label="اختبر مستواك في الذكاء الاصطناعي"
        className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-deepBlue text-white ring-1 ring-white/20 transition-colors hover:bg-customBlue"
      >
        {!shouldReduce && !muted && (
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-customBlue/30" style={{ animationDuration: '3.5s' }} />
        )}
        <Gauge size={20} aria-hidden className="relative transition-transform duration-300 group-hover:scale-110" />
      </Link>

      <AnimatePresence>
        {hookIndex != null && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative max-w-[16rem] rounded-2xl rounded-es-md border border-line bg-white p-3.5 pe-8 ring-1 ring-deepBlue/[0.04] sm:max-w-xs"
          >
            <button
              type="button"
              onClick={mute}
              aria-label="إخفاء دعوة الاختبار لهذه الجلسة"
              className="absolute end-2 top-2 rounded-lg p-1 text-ink-300 transition hover:text-ink-500"
            >
              <X size={13} />
            </button>
            <p className="text-[10px] font-black tracking-[0.14em] text-customBlue">اختبر مستواك في AI</p>
            <Link to="/ai-level" className="mt-1 block">
              <p className="text-[13px] font-bold leading-6 text-deepBlue transition-colors hover:text-customBlue">
                {HOOKS[hookIndex]}
              </p>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
