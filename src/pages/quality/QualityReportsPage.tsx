import { motion } from 'framer-motion'
import {
  BookOpen, Download, FileBarChart, FileSpreadsheet, FileText,
  GraduationCap, ShieldAlert, ShieldCheck, Star, TrendingUp,
} from 'lucide-react'
import toast from '@/lib/toast'

const reports = [
  {
    icon: BookOpen,
    title: 'تقرير جودة الورش',
    description: 'نظرة شاملة على جودة الورش التدريبية المقيّمة خلال الفترة المحددة',
    color: 'text-blue-600 bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    icon: GraduationCap,
    title: 'تقرير أداء المدربين',
    description: 'تحليل مفصّل لأداء المدربين بناءً على نتائج المراجعات والتقييمات',
    color: 'text-violet-600 bg-violet-50',
    borderColor: 'border-violet-200',
  },
  {
    icon: Star,
    title: 'تقرير رضا الطلاب',
    description: 'مؤشرات رضا الطلاب والملاحظات المجمّعة من تقييمات الدورات',
    color: 'text-amber-600 bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    icon: ShieldCheck,
    title: 'تقرير الامتثال',
    description: 'مستوى الامتثال للمعايير والسياسات المعتمدة في المنصة',
    color: 'text-emerald-600 bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    icon: FileBarChart,
    title: 'تقرير الحوكمة',
    description: 'ملخص شامل لعمليات الحوكمة وتطبيق السياسات والإجراءات',
    color: 'text-indigo-600 bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  {
    icon: ShieldAlert,
    title: 'تقرير الحوادث',
    description: 'إحصائيات الحوادث المسجّلة وتوزيعها حسب الخطورة والحالة',
    color: 'text-rose-600 bg-rose-50',
    borderColor: 'border-rose-200',
  },
  {
    icon: TrendingUp,
    title: 'تقرير الإجراءات التصحيحية',
    description: 'متابعة الإجراءات التصحيحية ومؤشرات الأداء والإتمام',
    color: 'text-orange-600 bg-orange-50',
    borderColor: 'border-orange-200',
  },
  {
    icon: FileText,
    title: 'تقرير التدقيق',
    description: 'سجل مفصّل لعمليات التدقيق والمراجعة الداخلية خلال الفترة',
    color: 'text-slate-600 bg-slate-50',
    borderColor: 'border-slate-200',
  },
]

function ExportButton({ label, icon: Icon }: { label: string; icon: typeof Download }) {
  return (
    <button
      onClick={() => {
        toast.message('جاري التحضير...')
        setTimeout(() => toast.message('ميزة التصدير قيد التطوير'), 600)
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

export default function QualityReportsPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      <div className="mb-6">
        <h1 className="text-xl font-black text-deepBlue">مركز التقارير</h1>
        <p className="text-sm text-slate-500 mt-1">توليد وتصدير تقارير الجودة والامتثال</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reports.map((r, i) => (
          <motion.div
            key={r.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-white rounded-2xl border ${r.borderColor} shadow-sm p-6 flex flex-col`}
          >
            <div className={`w-11 h-11 rounded-2xl ${r.color} flex items-center justify-center mb-4`}>
              <r.icon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-deepBlue text-sm mb-1.5">{r.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed flex-1">{r.description}</p>
            <div className="flex gap-2 mt-4 flex-wrap">
              <ExportButton label="PDF" icon={FileText} />
              <ExportButton label="Excel" icon={FileSpreadsheet} />
              <ExportButton label="CSV" icon={Download} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
