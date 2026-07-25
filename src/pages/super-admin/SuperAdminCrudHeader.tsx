import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import type { SuperCrudMeta } from './superAdminEntities'

export function SuperAdminCrudHeader({
  meta,
  actionSlot,
}: {
  meta: SuperCrudMeta
  actionSlot?: ReactNode
}) {
  return (
    <div dir="rtl" className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-deepBlue/[0.06] pb-6">
      <div className="min-w-0 text-right">
        <Link
          to="/dashboard/super-admin"
          className="inline-flex items-center gap-2 text-[12px] font-black text-customBlue hover:underline"
        >
          <ArrowLeft size={14} aria-hidden />
          لوحة السوبر مشرف
        </Link>
        <h1 className="mt-3 text-xl font-black text-deepBlue sm:text-2xl">{meta.titleAr}</h1>
        {meta.subtitleAr ?
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">{meta.subtitleAr}</p>
        : null}
        <p className="mt-3 rounded-2xl border border-brand-400/25 bg-brand-500/10 px-4 py-2 text-[11px] font-bold leading-relaxed text-brand-950">
          واجهات CRUD جاهزة لربط الـ REST: القائمة، الإنشاء، التفاصيل، التحرير والحذف. سيُستهلك المسار نفسه عند تفعّل نقاط EMC.
        </p>
      </div>
      {actionSlot ? <div className="shrink-0">{actionSlot}</div> : null}
    </div>
  )
}
