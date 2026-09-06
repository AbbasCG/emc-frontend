import { memo } from 'react'
import type { ClassAssignmentStudent } from '@/api/placementApi'

function initials(name: string): string {
  return name.trim().charAt(0) || '?'
}

type Props = {
  students: ClassAssignmentStudent[]
  max?: number
  size?: 'sm' | 'md'
}

function StudentsPreviewInner({ students, max = 4, size = 'sm' }: Props) {
  if (!students.length) return null

  const shown = students.slice(0, max)
  const extra = students.length - shown.length
  const dim = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-[11px]'

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2 space-x-reverse">
        {shown.map((s, i) => (
          <div
            key={s.student_id}
            title={s.student_name}
            className={`${dim} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-bl from-[#0C2A4B] to-[#0077B6] font-bold text-white ring-1 ring-[#0C2A4B]/10`}
            style={{ zIndex: shown.length - i }}
          >
            {s.avatar_url ? (
              <img src={s.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(s.student_name)
            )}
          </div>
        ))}
      </div>
      {extra > 0 && (
        <span className="mr-2 text-[10px] font-bold text-[#0C2A4B]/45">+{extra}</span>
      )}
    </div>
  )
}

export const StudentsPreview = memo(StudentsPreviewInner)
