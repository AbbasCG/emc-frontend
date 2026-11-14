import type { LucideIcon } from 'lucide-react'

/**
 * لوحة مؤقتة لتبويب لم تُنفَّذ بياناته بعد. لا أرقام ولا رسوم وهمية: تعرض فقط ما سيحتويه التبويب.
 * تُستبدل بالمكوّن الحقيقي في مرحلة التبويب نفسه دون أي تغيير في الصفحة.
 */
export function HubTabPlaceholder({ Icon, titleAr, descriptionAr }: { Icon: LucideIcon; titleAr: string; descriptionAr: string }) {
  return (
    <section
      aria-label={titleAr}
      className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-customBlue">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-black text-navy">{titleAr}</h2>
      <p className="max-w-md text-sm leading-7 text-slate-600">{descriptionAr}</p>
      <p className="text-xs font-semibold text-slate-500">قيد التطوير — سيظهر هنا عند اكتمال هذا القسم.</p>
    </section>
  )
}
