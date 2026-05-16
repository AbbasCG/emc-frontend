import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import {
  SaGlassCard,
  SaPageRoot,
  SaStatChip,
  SaToolbar,
} from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import { EmptyPanel } from '@/pages/super-admin/crud/shared/States'

const PIPELINE = [
  {
    key: 'new',
    titleAr: 'طلب جديد',
    accent: 'border-customBlue/35 bg-brand-500/10',
    hintAr: 'ينتظر استلامًا من نقطة موحّدة.',
  },
  {
    key: 'review',
    titleAr: 'قيد المراجعة',
    accent: 'border-accent-400/45 bg-accent-400/10',
    hintAr: 'التحقق الأكاديمي أو المالي قبل التأكيد.',
  },
  {
    key: 'confirmed',
    titleAr: 'مؤكّد',
    accent: 'border-emerald-300/60 bg-emerald-50/80',
    hintAr: 'مقعد محجوز وفق سياسات المنصّة.',
  },
  {
    key: 'done',
    titleAr: 'مكتمل',
    accent: 'border-slate-200 bg-slate-50/90',
    hintAr: 'إنهاء الشهادة أو أرشفة الدورة.',
  },
] as const

/**
 * نقطة تجمع كافة التسجيلات للسوبر مشرف غير موجودة بعد في استجابات API المعروضة أمام هذا الفرونت‑إند؛
 * تُحرَف الواجهة صراحةً صوب الحلول المتاحة الآن لتفادي أي بيانات وهمية.
 */
export default function RegistrationsManagementPage() {
  return (
    <SaPageRoot>
      <SaToolbar
        eyebrow="عمليات القبول"
        title="التسجيلات"
        subtitle="لوحة تشغيل لتجميع اشتراك الدورات والمدفوعات — المرحلة الحالية تعرض مسارًا تشغيليًا فارغًا إلى أن يجهّز GET موحّد."
        actions={
          <>
            <Link
              to="/dashboard/admin/finance/payments"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#22334A] px-4 py-2.5 text-[12px] font-black text-white shadow-lg"
            >
              المدفوعات الإدارية
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <Link
              to="/dashboard/admin/certificates"
              className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-[12px] font-black text-deepBlue"
            >
              الشهادات والإنهاءات
            </Link>
            <Link
              to="/dashboard/admin/partnership-requests"
              className="rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-[12px] font-black text-deepBlue shadow-sm"
            >
              طلبات الشراكة
            </Link>
          </>
        }
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-4">
        <SaStatChip label="حالة التجميع" value="غير متصل" tone="orange" />
        <SaStatChip label="مسارات احتياطية" value={3} tone="blue" />
        <SaStatChip label="سياسة البيانات" value="بدون وهمي" tone="ink" />
        <SaStatChip label="الخطوة التالية" value="API" tone="success" />
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-4">
        {PIPELINE.map((col, idx) => (
          <SaGlassCard key={col.key} className={`flex flex-col border-2 ${col.accent} p-4 text-right`} glow={idx % 2 === 0 ? 'blue' : 'orange'}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-deepBlue">{col.titleAr}</h2>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/90 text-[11px] font-black text-muted-600 shadow-sm ring-1 ring-ink-100">
                {idx + 1}
              </span>
            </div>
            <p className="mt-3 flex-1 text-[12px] font-semibold leading-relaxed text-muted-700">{col.hintAr}</p>
            <div className="mt-6 rounded-2xl border border-dashed border-ink-200/80 bg-white/70 px-3 py-8 text-center">
              <EmptyPanel title="لا سجلات بعد" subtitle="سيُملأ هذا العمود تلقائيًا عند توفر نقطة التسجيلات." />
            </div>
            <Link
              to="/dashboard/admin/finance/payments"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-deepBlue/[0.06] px-3 py-2 text-[11px] font-black text-deepBlue transition hover:bg-deepBlue/[0.1]"
            >
              انتقل للعمليات
              <ArrowRight className="h-3.5 w-3.5 rotate-180" aria-hidden />
            </Link>
          </SaGlassCard>
        ))}
      </div>

      <SaGlassCard className="mt-10 p-6 text-right" glow="blue">
        <p className="text-[13px] font-semibold leading-relaxed text-muted-700">
          لا يوجد تجمع لتسجيلات الطلّاب في هذه المنطقة الآن. عند تهيئة مسار GET يجمع اشتراك الدورة، الأشخاص، والحالة المالية
          ستُحمَّل هذه الأعمدة آلياً دون تعطيل هذا الموجود.
        </p>
      </SaGlassCard>
    </SaPageRoot>
  )
}
