import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div
      dir="rtl"
      className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#F6F8FB] px-4"
    >
      <motion.div
        className="w-full max-w-lg text-center"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Icon */}
        <motion.div
          className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200/80 ring-1 ring-slate-100"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4, type: 'spring', stiffness: 180 }}
        >
          <SearchX size={52} className="text-customBlue" />
        </motion.div>

        {/* 404 */}
        <p className="text-8xl font-black leading-none tracking-tight text-deepBlue/10 select-none">
          404
        </p>

        {/* Heading */}
        <h1 className="-mt-4 text-3xl font-black text-deepBlue sm:text-4xl">
          الصفحة غير موجودة
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-5 max-w-sm leading-8 text-slate-500">
          عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها. ربما تم نقلها أو حذفها أو أن الرابط غير صحيح.
        </p>

        {/* Actions */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="emc-focus-ring inline-flex items-center gap-2 rounded-xl bg-customBlue px-7 py-3.5 font-bold text-white shadow-md shadow-sky-200 transition-all hover:bg-[#1e7dab] hover:shadow-lg"
          >
            العودة للرئيسية
            <ArrowLeft size={18} />
          </Link>
          <Link
            to="/courses"
            className="emc-focus-ring inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 font-bold text-deepBlue transition-colors hover:border-customBlue/30 hover:bg-sky-50 hover:text-customBlue"
          >
            تصفح الدورات
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
