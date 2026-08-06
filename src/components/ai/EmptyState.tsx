import { Sparkles } from 'lucide-react'

export default function EmptyState({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
        <Sparkles size={24} className="text-customBlue" />
      </div>
      <h3 className="text-base font-black text-deepBlue">{title}</h3>
      {description && <p className="mt-2 text-sm font-medium leading-7 text-slate-500">{description}</p>}
    </div>
  )
}
