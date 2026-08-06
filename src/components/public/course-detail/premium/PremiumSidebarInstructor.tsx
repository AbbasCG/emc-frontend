import { useState } from 'react'
import { Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CourseDetailDerived } from '@/utils/courseDetailDerived'

const AVATAR =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="40" fill="#2691C2"/><circle cx="40" cy="30" r="13" fill="rgba(255,255,255,0.35)"/><path fill="rgba(255,255,255,0.25)" d="M10 74c7-18 17-26 30-26s23 8 30 26"/></svg>`,
  )

type Props = { instructor: CourseDetailDerived['instructor'] }

export default function PremiumSidebarInstructor({ instructor }: Props) {
  const [bioOpen, setBioOpen] = useState(false)

  if (!instructor.assigned || !instructor.name) return null

  const bio = instructor.bio?.trim() ?? ''
  const needsClamp = bio.length > 120

  return (
    <div dir="rtl" className="border-t border-[#22334A]/6 bg-gradient-to-br from-[#2691C2]/6 to-white px-4 py-3.5 text-right">
      <p className="mb-2 text-[10px] font-black text-[#22334A]/45">المدرب</p>
      <div className="flex items-start gap-2.5">
        <img
          src={instructor.avatarUrl ?? AVATAR}
          alt=""
          loading="lazy"
          className="h-11 w-11 shrink-0 rounded-xl object-cover ring-2 ring-[#2691C2]/15"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#22334A]">{instructor.name}</p>
          {instructor.title ?
            <p className="text-[10px] font-bold text-[#2691C2]">{instructor.title}</p>
          : null}
          {bio ?
            <p className={cn('mt-1 text-[11px] leading-5 text-slate-600', !bioOpen && needsClamp && 'line-clamp-2')}>
              {bio}
            </p>
          : null}
          {needsClamp ?
            <button
              type="button"
              onClick={() => setBioOpen((v) => !v)}
              className="mt-0.5 text-[10px] font-black text-[#2691C2] hover:underline"
            >
              {bioOpen ? 'عرض أقل' : 'عرض المزيد'}
            </button>
          : null}
          {instructor.email ?
            <a href={`mailto:${instructor.email}`} className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-[#2691C2]">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{instructor.email}</span>
            </a>
          : null}
        </div>
      </div>
    </div>
  )
}
