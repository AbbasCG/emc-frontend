import type { CalendarEventRecord, CalendarEventType, CalendarFilterKind } from '@/types/phase7'

const TZ = 'Europe/Amsterdam'

/** Arabic labels with English (Latin) digits */
export function formatCalendarDateTime(
  iso: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat('ar', {
      timeZone: TZ,
      numberingSystem: 'latn',
      ...options,
    }).format(date)
  } catch {
    return iso.slice(0, 16)
  }
}

export function formatCalendarDate(iso: string | null | undefined): string {
  return formatCalendarDateTime(iso, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatCalendarTime(iso: string | null | undefined): string {
  return formatCalendarDateTime(iso, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatCalendarDateShort(iso: string | null | undefined): string {
  return formatCalendarDateTime(iso, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export type MeetingJoinState = 'before' | 'live' | 'ended' | 'none'

export function getMeetingJoinState(startAt: string, endAt?: string | null): MeetingJoinState {
  const now = Date.now()
  const start = new Date(startAt).getTime()
  if (Number.isNaN(start)) return 'none'
  const end = endAt ? new Date(endAt).getTime() : start + 3_600_000
  if (now < start) return 'before'
  if (now <= end) return 'live'
  return 'ended'
}

export function typeLabel(type: CalendarEventType | string): string {
  switch (type) {
    case 'session':
      return 'جلسة'
    case 'workshop':
      return 'ورشة'
    case 'meeting':
      return 'اجتماع'
    case 'task':
    case 'assignment':
      return 'مهمة'
    case 'course':
      return 'دورة'
    case 'program':
      return 'برنامج'
    case 'learning_path':
      return 'مسار تعليمي'
    case 'event':
      return 'حدث'
    default:
      return 'حدث'
  }
}

export function filterTypeLabel(type: CalendarFilterKind | 'all'): string {
  switch (type) {
    case 'all':
      return 'الكل'
    case 'session':
      return 'الجلسات القادمة'
    case 'workshop':
      return 'الورش'
    case 'meeting':
      return 'الاجتماعات'
    case 'task':
      return 'المهام'
    case 'course':
      return 'الدورات'
    case 'program':
      return 'البرامج'
    case 'learning_path':
      return 'المسارات التعليمية'
    default:
      return 'الكل'
  }
}

export function translateEventStatus(status: string): string {
  const map: Record<string, string> = {
    published: 'منشور',
    draft: 'مسودة',
    archived: 'مؤرشف',
    scheduled: 'مجدول',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    active: 'نشط',
    pending: 'معلّق',
    in_progress: 'قيد التنفيذ',
    done: 'منجز',
    upcoming: 'قادم',
    live: 'جاري الآن',
  }
  return map[status] ?? status
}

export const TYPE_COLORS: Record<string, string> = {
  session: 'bg-[#2691C2]/10 text-[#2691C2] ring-[#2691C2]/25',
  workshop: 'bg-purple-50 text-purple-700 ring-purple-200',
  meeting: 'bg-amber-50 text-amber-700 ring-amber-200',
  task: 'bg-red-50 text-red-700 ring-red-200',
  course: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  program: 'bg-[#22334A]/10 text-[#22334A] ring-[#22334A]/20',
  learning_path: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  event: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export const TYPE_ACCENT: Record<string, string> = {
  session: 'border-s-[#2691C2]',
  workshop: 'border-s-purple-500',
  meeting: 'border-s-amber-500',
  task: 'border-s-red-500',
  course: 'border-s-emerald-500',
  program: 'border-s-[#22334A]',
  learning_path: 'border-s-indigo-500',
  event: 'border-s-slate-400',
}

export function isProgramCalendarEvent(event: CalendarEventRecord): boolean {
  return (
    event.source === 'program' ||
    String(event.id).startsWith('program-') ||
    String(event.id).startsWith('course_')
  )
}

function parseProgramSourceId(event: CalendarEventRecord): number | null {
  if (event.source_id != null && Number.isFinite(event.source_id)) return event.source_id
  const id = String(event.id)
  if (id.startsWith('program-')) {
    const n = Number(id.replace('program-', ''))
    return Number.isFinite(n) ? n : null
  }
  if (id.startsWith('course_')) {
    const n = Number(id.replace('course_', ''))
    return Number.isFinite(n) ? n : null
  }
  return event.course?.id ?? null
}

export function getCalendarProgramHref(
  event: CalendarEventRecord,
  role?: string | null,
): string | null {
  if (event.type === 'learning_path') {
    const slug = event.learning_path?.slug
    return slug ? `/learning-paths/${slug}` : null
  }

  if (
    !isProgramCalendarEvent(event) &&
    event.type !== 'course' &&
    event.type !== 'workshop' &&
    event.type !== 'program'
  ) {
    if (event.course?.slug) return `/courses/${event.course.slug}`
    return null
  }

  const sourceId = parseProgramSourceId(event)
  const isAdmin = role === 'admin' || role === 'super_admin'
  if (isAdmin && sourceId) {
    return `/dashboard/super-admin/crud/programs?id=${sourceId}`
  }

  if (event.course?.slug) return `/courses/${event.course.slug}`
  return sourceId ? `/courses/${sourceId}` : null
}

export function groupEventsByDay(events: CalendarEventRecord[]): { key: string; label: string; items: CalendarEventRecord[] }[] {
  const map = new Map<string, CalendarEventRecord[]>()

  for (const ev of events) {
    const key = formatCalendarDateTime(ev.start_at, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const bucket = map.get(key) ?? []
    bucket.push(ev)
    map.set(key, bucket)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      key,
      label: formatCalendarDate(items[0]?.start_at),
      items: items.sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
      ),
    }))
}

export function isUpcomingEvent(ev: CalendarEventRecord, now = Date.now()): boolean {
  const end = ev.end_at ? new Date(ev.end_at).getTime() : new Date(ev.start_at).getTime()
  return end >= now
}
