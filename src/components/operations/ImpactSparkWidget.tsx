import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'

/**
 * «ومضة الأثر» — أيقونة عائمة تُخرج كل فترة جملة خاطفة من سياسة التقدير
 * والمكافآت (نقاط أثر EMC)، وتقود بنقرة إلى صفحة النقاط. الهدف: تذكير الفريق
 * والمتطوعين باستمرار أن كل مساهمة تُحسب — دون إزعاج: الومضة تظهر ثوانٍ ثم
 * تنسحب، ويمكن كتمها للجلسة كاملة.
 */

const SPARKS = [
  'كل مساهمة تُحسب، وكل أثر يُقدَّر.',
  '1,000 نقطة أثر = 10 يورو رصيداً تعليمياً داخل EMC.',
  'سنة كاملة من العطاء = عضوية سديم VIP مجاناً.',
  'المدة تثبت الاستمرارية، والأداء يثبت الاستحقاق.',
  'حضورك لاجتماع اليوم يضيف 50 نقطة إلى رصيدك.',
  'أفضل متطوع في الإدارة يكسب 1,000 نقطة كل شهر.',
  'متطوع الشهر على مستوى المركز: 2,000 نقطة.',
  'فكرتك إذا نفّذتها قد تساوي حتى 1,000 نقطة.',
  'إدارة معسكر ناجح = 1,000 نقطة دفعة واحدة.',
  'رائد أثر EMC ليس الأطول بقاءً، بل الأعمق أثراً.',
  'نقاطك التراكمية لا تنقص عند الاستبدال — سجل أثرك محفوظ.',
  'رحلتك هنا: مساهمة، فتقدير، فتعلم، فخبرة، ففرصة.',
] as const

const MUTE_KEY = 'emc_impact_spark_muted'
const SHOW_AFTER_MS = 6_000     // أول ومضة بعد استقرار الصفحة
const VISIBLE_MS = 8_000        // مدة بقاء الومضة
const INTERVAL_MS = 45_000      // بين الومضات

export default function ImpactSparkWidget() {
  const { pathname } = useLocation()
  const shouldReduce = useReducedMotion()
  const [sparkIndex, setSparkIndex] = useState<number | null>(null)
  const [muted, setMuted] = useState(() => {
    try {
      return sessionStorage.getItem(MUTE_KEY) === '1'
    } catch {
      return false
    }
  })
  const counter = useRef(Math.floor(Math.random() * SPARKS.length))

  // دورة الومضات: تظهر، تبقى ثوانيَ، تنسحب — ما لم تُكتم.
  useEffect(() => {
    if (muted) return
    let hideTimer: number | undefined
    const show = () => {
      counter.current = (counter.current + 1) % SPARKS.length
      setSparkIndex(counter.current)
      hideTimer = window.setTimeout(() => setSparkIndex(null), VISIBLE_MS)
    }
    const first = window.setTimeout(show, SHOW_AFTER_MS)
    const loop = window.setInterval(show, INTERVAL_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(loop)
      if (hideTimer) window.clearTimeout(hideTimer)
    }
  }, [muted])

  // على صفحة النقاط نفسها لا معنى للومضة.
  if (pathname.startsWith('/dashboard/operations/impact-points')) return null

  function mute() {
    setSparkIndex(null)
    setMuted(true)
    try {
      sessionStorage.setItem(MUTE_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <div dir="rtl" className="fixed bottom-5 start-5 z-40 flex items-end gap-3">
      {/* الزر العائم */}
      <Link
        to="/dashboard/operations/impact-points"
        aria-label="نقاط أثر EMC — كل مساهمة تُحسب"
        className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-customOrange text-white transition-colors hover:bg-ember"
      >
        {!shouldReduce && !muted && (
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-customOrange/30" style={{ animationDuration: '3s' }} />
        )}
        <Sparkles size={20} aria-hidden className="relative transition-transform duration-300 group-hover:scale-110" />
      </Link>

      {/* الومضة */}
      <AnimatePresence>
        {sparkIndex != null && (
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
              aria-label="إخفاء ومضات الأثر لهذه الجلسة"
              className="absolute end-2 top-2 rounded-lg p-1 text-ink-300 transition hover:text-ink-500"
            >
              <X size={13} />
            </button>
            <p className="text-[10px] font-black tracking-[0.14em] text-customOrange">نقاط أثر EMC</p>
            <Link to="/dashboard/operations/impact-points" className="mt-1 block">
              <p className="text-[13px] font-bold leading-6 text-deepBlue transition-colors hover:text-customBlue">
                {SPARKS[sparkIndex]}
              </p>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
