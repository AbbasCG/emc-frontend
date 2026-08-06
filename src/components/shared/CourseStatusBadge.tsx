import { cn } from '@/lib/utils'
import { ENDED_COURSE_LABEL_AR, resolveCourseComputedStatus, resolveCourseIsEnded } from '@/utils/courseEnded'

type Props = {
  /** When true, show the ended badge (top-left overlay style). */
  isEnded?: boolean
  computedStatus?: string | null
  status?: string | null
  /** ended | published | archived | draft — explicit variant */
  variant?: 'ended' | 'published' | 'archived' | 'draft' | 'neutral'
  /** overlay = on card image; inline = in text rows */
  placement?: 'overlay' | 'inline'
  className?: string
}

const VARIANT_CLS: Record<string, string> = {
  ended: 'bg-red-600 text-white ring-red-300/30',
  published: 'bg-emerald-600/90 text-white ring-emerald-200/30',
  archived: 'bg-slate-600/90 text-white ring-slate-200/30',
  draft: 'bg-amber-600/90 text-white ring-amber-200/30',
  neutral: 'bg-slate-700/90 text-white ring-white/15',
}

export default function CourseStatusBadge({
  isEnded,
  computedStatus,
  status,
  variant,
  placement = 'overlay',
  className,
}: Props) {
  const ended = isEnded ?? resolveCourseIsEnded({ is_ended: isEnded, computed_status: computedStatus, status })
  const resolved = variant ?? (ended ? 'ended' : resolveCourseComputedStatus({ computed_status: computedStatus, status }))

  const label =
    resolved === 'ended' ? ENDED_COURSE_LABEL_AR
    : resolved === 'published' ? 'منشورة'
    : resolved === 'archived' ? 'مؤرشفة'
    : resolved === 'draft' ? 'مسودة'
    : null

  if (!label) return null

  const tone = VARIANT_CLS[resolved] ?? VARIANT_CLS.neutral

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-black tracking-wide shadow-sm ring-1 backdrop-blur-sm',
        placement === 'overlay' ? 'px-2.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        tone,
        className,
      )}
    >
      {label}
    </span>
  )
}
