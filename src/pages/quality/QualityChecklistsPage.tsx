import { motion } from 'framer-motion'
import { CheckSquare, Eye, Plus } from 'lucide-react'
import toast from '@/lib/toast'

const templates = [
  {
    title: 'قائمة تحقق الورشة الجديدة',
    itemCount: 10,
    description: 'تحقق شامل من متطلبات قبول الورشة قبل الإطلاق',
    color: 'text-blue-600 bg-blue-50 border-blue-100',
  },
  {
    title: 'قائمة تحقق مراجعة المحتوى',
    itemCount: 8,
    description: 'معايير مراجعة محتوى البرامج التدريبية للتأكد من الجودة',
    color: 'text-violet-600 bg-violet-50 border-violet-100',
  },
  {
    title: 'قائمة تحقق الامتثال التنظيمي',
    itemCount: 12,
    description: 'التحقق من الامتثال لمتطلبات الجهات التنظيمية والمعايير المعتمدة',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
]

export default function QualityChecklistsPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-deepBlue">قوائم التحقق</h1>
          <p className="text-sm text-slate-500 mt-1">قوائم تحقق منظمة لكل ورشة ومراجعة</p>
        </div>
        <button
          onClick={() => toast.message('ميزة قيد التطوير')}
          className="flex items-center gap-2 bg-customBlue hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> قالب جديد
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
        <p className="text-sm text-blue-700">
          قوائم التحقق تتيح لفريق الجودة مراجعة منظمة لكل ورشة ومراجعة بشكل موحد وقابل للتتبع
        </p>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map((t, i) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`bg-white rounded-2xl border shadow-sm p-6 flex flex-col ${t.color.split(' ')[2]}`}
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${t.color.split(' ')[1]}`}>
              <CheckSquare className={`w-5 h-5 ${t.color.split(' ')[0]}`} />
            </div>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-deepBlue text-sm flex-1 ml-2">{t.title}</h3>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-semibold rounded-full shrink-0">قيد التطوير</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed flex-1">{t.description}</p>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400">{t.itemCount} عناصر</span>
              <button
                onClick={() => toast.message('معاينة القالب قيد التطوير')}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-deepBlue transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                معاينة
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
