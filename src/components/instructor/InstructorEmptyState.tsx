import type { ElementType } from 'react'

interface Props {
  icon: ElementType
  title: string
  description?: string
}

export function InstructorEmptyState({ icon: Icon, title, description }: Props) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
      <Icon className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-4 text-[16px] font-black text-deepBlue">{title}</p>
      {description && (
        <p className="mt-1.5 text-[12px] font-semibold text-deepBlue/45">{description}</p>
      )}
    </div>
  )
}
