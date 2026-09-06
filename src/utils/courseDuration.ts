import type { Course } from '@/types'

/** Arabic UI label for single-session workshops in the admin wizard */
export const ONE_SESSION_WORKSHOP_UI = 'ورشة / لقاء واحد'

/** Canonical public display for one-session workshops */
export const ONE_SESSION_WORKSHOP_DURATION_AR = '1 يوم'

export function isOneSessionWorkshop(
  course: Course | Record<string, unknown>,
  extra?: Record<string, unknown>,
): boolean {
  const x = extra ?? (course as Record<string, unknown>)
  const pt = String(course.program_type ?? x.program_type ?? '').toLowerCase()
  if (pt === 'one_session' || pt === 'workshop_one_session') return true

  const sf = String(course.session_format ?? x.session_format ?? '').toLowerCase()
  if (sf === 'workshop_single_session' || sf === 'workshop_one_session') return true
  if (sf.includes('one_session') || sf.includes('لقاء واحد')) return true

  const kind = String(course.program_kind ?? x.program_kind ?? x.catalog_kind ?? '').toLowerCase()
  if (kind.includes('one_session')) return true

  return false
}

/** Map API session_format / program_type → wizard select value */
export function sessionFormatFromApi(
  raw?: string | null,
  programType?: string | null,
): string {
  const pt = String(programType ?? '').toLowerCase()
  const sf = String(raw ?? '').trim()
  const lower = sf.toLowerCase()

  if (pt === 'one_session' || lower === 'workshop_single_session' || lower === 'workshop_one_session') {
    return ONE_SESSION_WORKSHOP_UI
  }
  if (sf.includes('لقاء واحد')) return ONE_SESSION_WORKSHOP_UI
  if (sf && sf !== 'online' && sf !== 'offline' && sf !== 'hybrid') return sf

  return 'دورة متعددة الأيام'
}

/** Map wizard session format → Laravel session_format enum (omit when not applicable) */
export function sessionFormatToApi(uiLabel: string): 'workshop_single_session' | undefined {
  if (uiLabel === ONE_SESSION_WORKSHOP_UI) return 'workshop_single_session'
  return undefined
}

export function programTypeForPayload(
  kind: string,
  sessionFormat: string,
): 'course' | 'workshop' | 'one_session' | 'full_program' {
  if (kind === 'workshop' || sessionFormat === ONE_SESSION_WORKSHOP_UI) return 'one_session'
  if (sessionFormat === 'برنامج كامل') return 'full_program'
  const m: Record<string, 'course' | 'workshop' | 'one_session' | 'full_program'> = {
    course: 'course',
    workshop: 'one_session',
    program: 'full_program',
    track: 'full_program',
  }
  return m[kind] ?? 'course'
}

export function resolveCourseDisplayDuration(
  course: Course,
  extra?: Record<string, unknown>,
  calculatedFallback?: string,
): string {
  const apiExtra = extra ?? (course as unknown as Record<string, unknown>)
  if (isOneSessionWorkshop(course, apiExtra)) return ONE_SESSION_WORKSHOP_DURATION_AR

  const explicit = typeof course.duration === 'string' ? course.duration.trim() : ''
  if (explicit) return explicit

  const computed = String(apiExtra.computed_duration_label ?? '').trim()
  if (computed) return computed

  return calculatedFallback?.trim() ?? ''
}
