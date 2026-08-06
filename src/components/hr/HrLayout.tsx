import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export function HrNotLinkedBanner() {
  return (
    <div
      dir="rtl"
      className="rounded-3xl border border-amber-200/80 bg-amber-50/90 px-5 py-4 text-right shadow-emc-sm ring-1 ring-amber-100"
      role="status"
    >
      <div className="flex flex-wrap items-start justify-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center justify-end gap-2 text-[11px] font-black uppercase tracking-wide text-amber-800">
            <AlertCircle size={16} aria-hidden />
            لم يتم ربط هذا القسم بالبيانات بعد
          </p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-amber-900/80">
            عند اتصال الـ backend، ستُعرض السجلات هنا بدون الحاجة إلى تعديل هذا التخطيط.
          </p>
        </div>
      </div>
    </div>
  )
}

export function HrSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <header dir="rtl" className="text-right">
      {eyebrow ?
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-600">{eyebrow}</p>
      : null}
      <h1 className="mt-2 text-xl font-black text-deepBlue sm:text-2xl">{title}</h1>
      {description ?
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">{description}</p>
      : null}
    </header>
  )
}

export function HrPageShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div dir="rtl" className="space-y-8">
      <HrSectionHeader title={title} description={description} />
      {children}
    </div>
  )
}
