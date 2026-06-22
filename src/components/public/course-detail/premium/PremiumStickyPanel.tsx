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
      className="overflow-hidden rounded-[1.25rem] border border-line bg-white shadow-emc-md backdrop-blur-xl"
    >
      {children}
      <PremiumSidebarInstructor instructor={instructor} />
    </div>
  )
}
