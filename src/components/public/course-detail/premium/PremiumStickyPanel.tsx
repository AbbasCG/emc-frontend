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
      className="overflow-hidden rounded-[1.25rem] border border-white/80 bg-white shadow-[0_16px_48px_-16px_rgba(12, 42, 75,0.18)] backdrop-blur-xl ring-1 ring-[#0C2A4B]/5"
    >
      {children}
      <PremiumSidebarInstructor instructor={instructor} />
    </div>
  )
}
