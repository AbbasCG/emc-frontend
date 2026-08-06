import { motion } from 'framer-motion'
import { Users } from 'lucide-react'

export default function TeamEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-deepBlue/[0.12] bg-emcBg px-8 py-20 text-center shadow-inner"
      dir="rtl"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-emc-xs ring-1 ring-deepBlue/[0.06]">
        <Users className="text-customBlue/45" size={36} aria-hidden />
      </span>
      <p className="mt-6 text-lg font-black text-deepBlue">لا توجد بيانات فريق متاحة حاليًا</p>
      <p className="mt-3 max-w-md text-sm font-medium leading-7 text-foreground/60">
        ستظهر الهيكلة والأسماء تلقائيًا بعد قيام مسؤولي النظام بإعداد بيانات الفريق في لوحة الإدارة.
      </p>
    </motion.div>
  )
}
