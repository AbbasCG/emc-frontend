import type { Course } from '@/types'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'

/** SVG gradient — لا صور أسهم خارجية؛ هوية EMC فقط عند غياب صورة الغلاف */
export const EMC_COURSE_COVER_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="e" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#22334A"/><stop offset="100%" stop-color="#2691C2"/></linearGradient></defs><rect fill="url(#e)" width="1200" height="800"/><text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-weight="900" font-size="52">EMC</text><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="#ffffffc0" font-family="system-ui,sans-serif" font-size="22">برامج تدريبية</text></svg>`,
  )

function trimStr(raw: unknown): string | null {
  if (raw == null || raw === false) return null
  const s = typeof raw === 'string' ? raw.trim() : String(raw).trim()
  return s === '' || s === '—' ? null : s
}

function absMediaUrl(raw: unknown): string | null {
  const s = trimStr(raw)
  if (!s) return null
  if (/^https?:\/\//iu.test(s)) return s
  return resolvePublicAssetUrl(s.startsWith('/') ? s : `/${s}`)
}

/** حقول الغلاف الشائعة من لوحة الإدارة */
export function resolveCourseCoverImageUrl(course: Course): string | null {
  const x = course as Record<string, unknown>
  const keys = ['image_url', 'cover_image_url', 'course_image', 'image', 'thumbnail', 'cover_image', 'hero_image']
  for (const k of keys) {
    const resolved = absMediaUrl(x[k])
    if (resolved) return resolved
  }
  const ci = trimStr(course.course_image)
  if (ci && /^https?:\/\//iu.test(ci)) return ci
  if (ci) return absMediaUrl(ci)
  return null
}

/** حالة النشر العربية؛ لم نتعرّف عليها — لا نعرض صفًا */
export function mapCourseStatusArabic(status: unknown, isPublished: unknown): string | null {
  let key = ''
  const st =
    typeof status === 'string' && status.trim() !== '' ? status.toLowerCase().trim() : ''
  if (
    !st &&
    (isPublished === true || isPublished === 1 || `${isPublished}` === '1')
  )
    key = 'published'
  else if (
    !st &&
    (isPublished === false || isPublished === 0 || `${isPublished}` === '0')
  )
    key = 'draft'
  else key = st

  if (!key) return null

  const map: Record<string, string> = {
    published: 'منشورة',
    active: 'منشورة',
    draft: 'مسودة',
    archived: 'مؤرشفة',
    inactive: 'غير نشطة',
    cancelled: 'ملغاة',
  }

  const direct = map[key]
  if (direct) return direct

  const hitKey = Object.keys(map).find((k) => key.includes(k))
  return hitKey ? map[hitKey] ?? null : null
}

/** نمط الإيصال حضورياً أم عن بعد */
export function mapDeliveryTypeArabic(course: Course, extra: Record<string, unknown>): string | null {
  const lt = trimStr(course.location_type ?? extra.location_type)?.toLowerCase() ?? ''
  const dt = trimStr(extra.delivery_type)?.toLowerCase() ?? ''
  const hay = `${lt} ${dt}`.toLowerCase()

  if (/hybrid|blended|هجين/i.test(hay)) return 'هجين'
  if (/online|remote|distance|digital|عن.?بُعد/i.test(hay)) return 'عن بُعد'
  if (/offline|onsite|in.?person|attendance|presence|حضوري/i.test(hay)) return 'حضوري'

  const onlineFallback =
    course.is_online === true ||
    course.is_online === 1 ||
    `${course.is_online}` === '1' ||
    `${extra.is_online}` === '1'

  return onlineFallback ? 'عن بُعد' : null
}

/** نوع المحتوى (عرض مختصر لواجهات الكتالوج) */
export function mapProgramTypeArabic(course: Course, extra: Record<string, unknown>): string | null {
  const p =
    trimStr(extra.program_type) ??
    trimStr(course.program_kind) ??
    trimStr(course.program_type) ??
    trimStr(extra.catalog_kind)
  if (!p) return null
  const lower = p.toLowerCase()
  const full: Record<string, string> = {
    workshop: 'ورشة تدريبية',
    one_session: 'ورشة / لقاء واحد',
    full_program: 'برنامج تدريبي كامل',
    course: 'دورة تدريبية',
    track: 'مسار تعليمي',
  }
  for (const [k, v] of Object.entries(full)) if (lower.includes(k)) return v
  return p
}

export function mapRegistrationOpen(course: Course): { open: boolean; labelAr: string } {
  const r = course.registration_open as unknown
  if (r === false || r === 0 || r === '0' || `${r}`.toLowerCase() === 'false') return { open: false, labelAr: 'التسجيل مغلق' }
  if (r === true || r === 1 || r === '1' || `${r}`.toLowerCase() === 'true') return { open: true, labelAr: 'التسجيل مفتوح' }
  /** غير موجود — لا نضلل الزائر؛ نفترض أن التسجيل مفتوح */
  return { open: true, labelAr: 'التسجيل مفتوح' }
}

export function certificateLineArabic(course: Course, extra: Record<string, unknown>): string | null {
  const explicitOff =
    extra.certificate_available === false ||
    `${extra.certificate_available}` === '0' ||
    extra.has_certificate === false ||
    `${extra.has_certificate}` === '0'

  const title =
    trimStr(extra.certificate_type) ??
    (course.certificate && String(course.certificate).trim() !== '' ?
      String(course.certificate).trim()
    : null)

  const explicitOn =
    extra.certificate_available === true ||
    `${extra.certificate_available}` === '1' ||
    extra.has_certificate === true ||
    `${extra.has_certificate}` === '1'

  if (explicitOff) return null
  if (title) return `شهادة: ${title}`
  if (explicitOn) return 'شهادة متاحة وفق سياسات البرنامج'
  return null
}

