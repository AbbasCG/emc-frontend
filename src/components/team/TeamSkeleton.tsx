import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/utils/animations'

export default function TeamSkeleton() {
  return (
    <div className="min-h-[50vh]" dir="rtl">
      <p className="mb-10 text-center text-base font-semibold text-foreground/60">جاري تحميل الفريق...</p>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mx-auto grid max-w-[1540px] gap-6 sm:grid-cols-2 xl:grid-cols-4"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            variants={staggerItem}
            className="relative overflow-hidden rounded-[1.35rem] border border-deepBlue/[0.07] bg-white p-7 shadow-emc-sm ring-1 ring-deepBlue/[0.03]"
          >
            <span className="emc-skeleton mx-auto mb-6 block aspect-square w-[40%] max-w-[140px] rounded-[1.75rem]" />
            <span className="emc-skeleton mb-4 block mx-auto mr-0 h-5 w-4/5 rounded-lg" />
            <span className="emc-skeleton mx-auto mr-0 block h-3 w-3/5 rounded-lg opacity-75" />
            <span className="emc-skeleton mt-6 mr-0 block h-10 w-full rounded-xl opacity-55" />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
