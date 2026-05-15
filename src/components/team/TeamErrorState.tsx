import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'

type Props = { onRetry?: () => void }

export default function TeamErrorState({ onRetry }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.5rem] border border-deepBlue/[0.08] bg-white px-8 py-16 text-center shadow-emc-lg ring-1 ring-deepBlue/[0.04]"
      dir="rtl"
    >
      <p className="text-lg font-black text-deepBlue">تعذر تحميل بيانات الفريق حاليًا</p>
      <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-7 text-foreground/65">
        تحقّق من الاتصال بالخادم أو حاول مرة أخرى خلال قليل.
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mx-auto mt-8 inline-flex items-center gap-2 rounded-xl border border-customBlue/30 bg-brand-50/80 px-6 py-3 text-sm font-black text-customBlue shadow-emc-xs transition hover:border-customBlue/50 hover:bg-white"
        >
          <RefreshCw size={17} aria-hidden />
          إعادة المحاولة
        </button>
      ) : null}
    </motion.div>
  )
}
