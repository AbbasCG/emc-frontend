import type { ElementType, ReactNode } from 'react'

interface Props {
  icon: ElementType
  title: string
  description?: string
  action?: ReactNode
}

export function InstructorEmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0077B6]/[0.06]">
        <Icon className="h-7 w-7 text-[#0077B6]/50" />
      </div>
      <p className="mt-4 text-[16px] font-black text-deepBlue">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-[12px] font-semibold leading-relaxed text-deepBlue/45">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
