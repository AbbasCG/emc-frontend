import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { FolderLock } from 'lucide-react'
import { HrPageShell } from '@/components/hr/HrLayout'

export default function HrDocumentsPage() {
  return (
    <HrPageShell
      title="ملفات الموارد البشرية"
      description="مجلّدات الموارد البشرية المغلقة تتطلب ربط تخزين مخصّص في الخلفية. يمكن للفريق الآن الوصول إلى الملفات الشائعة للحساب."
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        <p className="rounded-3xl bg-amber-50 px-6 py-8 text-center text-sm font-bold text-amber-900 ring-1 ring-amber-100">
          لم يتم ربط هذا القسم بالبيانات بعد
        </p>
        <Link
          to="/documents"
          className="flex items-center justify-center gap-3 rounded-3xl border border-deepBlue/[0.08] bg-white px-8 py-6 font-black text-customBlue shadow-emc-sm transition hover:border-brand-400/40 hover:shadow-emc"
        >
          <FolderLock size={22} aria-hidden /> الانتقال إلى مستنداتي العامّة (/documents)
        </Link>
      </motion.div>
    </HrPageShell>
  )
}
