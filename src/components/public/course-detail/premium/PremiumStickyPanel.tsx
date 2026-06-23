import type { ReactNode } from 'react'
import type { CourseDetailDerived } from '@/utils/courseDetailDerived'
import PremiumSidebarInstructor from './PremiumSidebarInstructor'

type Props = {
  instructor: CourseDetailDerived['instructor']
  children: ReactNode
}

export default function PremiumStickyPanel({ instructor, children }: Props) {
  return (
    <div
      dir="rtl"
      className="overflow-hidden rounded-[1.25rem] border border-white/70 bg-white shadow-emc-lg ring-1 ring-customBlue/[0.06]"
    >
      {children}
      <PremiumSidebarInstructor instructor={instructor} />
    </div>
  )
}
