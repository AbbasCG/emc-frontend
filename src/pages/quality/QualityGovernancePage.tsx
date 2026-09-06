import { motion } from 'framer-motion'
import { CalendarDays, FileText, FolderLock, LayoutGrid, ShieldCheck } from 'lucide-react'

const areas = [
  {
    icon: FileText,
    title: 'السياسات والإجراءات',
    description: 'إدارة وثائق السياسات المعتمدة والإجراءات التشغيلية الموحدة للمنصة',
    color: 'text-blue-600 bg-blue-50 border-blue-100',
  },
  {
    icon: LayoutGrid,
    title: 'مصفوفة الموافقات',
    description: 'تحديد صلاحيات الاعتماد والموافقة لكل مستوى تنظيمي بشكل واضح وموثق',
    color: 'text-violet-600 bg-violet-50 border-violet-100',
  },
  {
    icon: FolderLock,
    title: 'إدارة المستندات',
    description: 'حفظ وتصنيف المستندات الرسمية مع ضبط الإصدارات وحقوق الوصول',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
  {
    icon: CalendarDays,
    title: 'تواريخ المراجعة',
    description: 'جدولة مراجعات دورية للسياسات والإجراءات لضمان ملاءمتها المستمرة',
    color: 'text-amber-600 bg-amber-50 border-amber-100',
  },
]

export default function QualityGovernancePage() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-deepBlue/[0.07] shadow-sm p-8 mb-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-black text-deepBlue mb-2">الحوكمة والسياسات</h1>
        <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
          إطار متكامل لضمان الامتثال وإدارة السياسات والمستندات التنظيمية
        </p>
      </div>

      {/* Area Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {areas.map((area, i) => (
          <motion.div
            key={area.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`bg-white rounded-2xl border shadow-sm p-6 ${area.color.split(' ')[2]}`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${area.color.split(' ')[1]}`}>
                <area.icon className={`w-5 h-5 ${area.color.split(' ')[0]}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-bold text-deepBlue text-sm">{area.title}</h3>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-semibold rounded-full">قريباً</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{area.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
        <p className="text-sm text-blue-700 font-medium">
          لإضافة وثائق الحوكمة، تواصل مع مدير النظام
        </p>
      </div>
    </div>
  )
}
