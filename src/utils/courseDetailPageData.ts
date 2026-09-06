import type { Course } from '@/types'
import type { CourseDetailDerived } from '@/utils/courseDetailDerived'
import { formatPublicDate, formatPublicText, formatPublicTime } from '@/utils/publicDetailFormat'
import { safeTrimUnknown } from '@/utils/publicCourseNormalize'
import { hasProgramCertificate } from '@/utils/programCertificateAvailability'

export type CourseReviewItem = {
  id: string
  author: string
  rating: number
  body: string
  date?: string | null
}

export type CourseFaqItem = {
  id: string
  question: string
  answer: string
}

export type CourseGalleryItem = {
  id: string
  url: string
  label?: string
}

function num(raw: unknown): number | null {
  if (raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export type CourseSeatMetrics = {
  capacity: number | null
  enrolled: number | null
  remaining: number | null
}

/** capacity − enrolled_count; uses API fields only. */
export function resolveCourseSeatMetrics(course: Course): CourseSeatMetrics {
  const x = course as Record<string, unknown>
  const capacity = num(course.capacity ?? x.seats_count ?? x.capacity)
  const enrolled = num(
    course.registrations_count ?? x.registrations_count ?? x.enrolled_count,
  )
  const remaining =
    capacity != null && capacity > 0 && enrolled != null ?
      Math.max(0, capacity - enrolled)
    : null
  return { capacity, enrolled, remaining }
}

export function courseHasCertificate(course: Course): boolean {
  return hasProgramCertificate(course)
}

export function hasMeaningfulDuration(value: string | null | undefined): boolean {
  const s = safeTrimUnknown(value)
  if (!s) return false
  return s !== 'انضم إلى الدورة القادمة'
}

export function remainingSeatsLabel(course: Course, _derived: CourseDetailDerived): string | null {
  const { remaining } = resolveCourseSeatMetrics(course)
  if (remaining == null) return null
  return `${formatPublicText(remaining)} مقعد متبقٍ`
}

export function buildEnrollmentPanelMeta(course: Course, derived: CourseDetailDerived): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = []
  const start = formatPublicDate(course.start_date)
  if (start) rows.push({ label: 'تاريخ البداية', value: start })
  const left = remainingSeatsLabel(course, derived)
  if (left) rows.push({ label: 'المقاعد المتبقية', value: left })
  if (derived.discountPercent != null && derived.discountPercent > 0) {
    rows.push({ label: 'الخصم', value: `${formatPublicText(derived.discountPercent)}%` })
  }
  return rows.map((r) => ({ ...r, value: formatPublicText(r.value) }))
}

export function extractCourseVideoUrl(course: Course): string | null {
  const x = course as Record<string, unknown>
  return (
    safeTrimUnknown(x.video_url ?? x.preview_video ?? x.intro_video ?? x.trailer_url) ?? null
  )
}

export function extractCourseGallery(course: Course, coverUrl: string): CourseGalleryItem[] {
  const x = course as Record<string, unknown>
  const raw = x.gallery ?? x.images ?? x.media_gallery
  const items: CourseGalleryItem[] = []
  if (Array.isArray(raw)) {
    raw.forEach((entry, i) => {
      if (typeof entry === 'string' && entry.trim()) {
        items.push({ id: `g-${i}`, url: entry.trim() })
      } else if (entry && typeof entry === 'object') {
        const o = entry as Record<string, unknown>
        const url = safeTrimUnknown(o.url ?? o.image ?? o.src)
        if (url) items.push({ id: `g-${i}`, url, label: safeTrimUnknown(o.title ?? o.caption) ?? undefined })
      }
    })
  }
  if (items.length === 0 && coverUrl) {
    items.push({ id: 'cover', url: coverUrl, label: 'الغلاف' })
  }
  return items.slice(0, 6)
}

export function parseCourseReviews(course: Course): CourseReviewItem[] {
  const x = course as Record<string, unknown>
  const raw = x.reviews ?? x.course_reviews ?? x.ratings
  if (!Array.isArray(raw)) return []
  const out: CourseReviewItem[] = []
  raw.forEach((entry, i) => {
    if (!entry || typeof entry !== 'object') return
    const o = entry as Record<string, unknown>
    const rating = num(o.rating ?? o.overall_rating ?? o.stars)
    const body = safeTrimUnknown(o.comment ?? o.body ?? o.review ?? o.text)
    const author = safeTrimUnknown(o.student_name ?? o.user_name ?? o.name ?? o.author) ?? 'متدرب'
    if (!body && rating == null) return
    out.push({
      id: String(o.id ?? i),
      author,
      rating: rating != null ? Math.min(5, Math.max(1, rating)) : 5,
      body: body ?? '—',
      date: safeTrimUnknown(o.created_at ?? o.date),
    })
  })
  return out
}

export function averageRatingFromReviews(reviews: CourseReviewItem[]): number | null {
  if (reviews.length === 0) return null
  const sum = reviews.reduce((s, r) => s + r.rating, 0)
  return Math.round((sum / reviews.length) * 10) / 10
}

export function parseCourseFaqs(course: Course, derived: CourseDetailDerived): CourseFaqItem[] {
  const x = course as Record<string, unknown>
  const fromApi = x.faqs ?? x.faq ?? x.frequently_asked
  const items: CourseFaqItem[] = []

  if (Array.isArray(fromApi)) {
    fromApi.forEach((entry, i) => {
      if (!entry || typeof entry !== 'object') return
      const o = entry as Record<string, unknown>
      const q = safeTrimUnknown(o.question ?? o.q ?? o.title)
      const a = safeTrimUnknown(o.answer ?? o.a ?? o.body)
      if (q && a) items.push({ id: `api-faq-${i}`, question: q, answer: a })
    })
  }

  if (derived.registration.open) {
    items.push({
      id: 'reg-open',
      question: 'هل التسجيل متاح الآن؟',
      answer: derived.seatsFull ?
        'التسجيل مفتوح لكن المقاعد مكتملة حالياً.'
      : 'نعم، يمكنك التسجيل مباشرة من بطاقة الالتحاق.',
    })
  } else {
    items.push({
      id: 'reg-closed',
      question: 'هل التسجيل متاح الآن؟',
      answer: 'التسجيل مغلق حالياً لهذا البرنامج.',
    })
  }

  if (derived.certificateLine) {
    items.push({
      id: 'cert',
      question: 'هل يوجد شهادة؟',
      answer: derived.completionHint ?
        `${derived.certificateLine}. ${derived.completionHint.split('\n')[0]}`
      : derived.certificateLine,
    })
  }

  if (course.requires_placement_test || course.requires_placement) {
    items.push({
      id: 'placement',
      question: 'هل يتطلب البرنامج اختبار تحديد مستوى؟',
      answer: 'نعم، قد يُطلب منك إكمال اختبار تحديد المستوى قبل بدء التعلم.',
    })
  }

  if (derived.meetingLink && derived.deliveryAr !== 'حضوري') {
    items.push({
      id: 'meeting',
      question: 'كيف أحضر الجلسات الأونلاين؟',
      answer: 'بعد التسجيل ستتلقى تفاصيل الوصول. رابط الاجتماع متوفر في معلومات البرنامج.',
    })
  }

  const start = formatPublicDate(course.start_date)
  const clock = formatPublicTime(course.start_time ?? x.start_time)
  if (start) {
    items.push({
      id: 'schedule',
      question: 'متى يبدأ البرنامج؟',
 answer: clock ? `${start} ${clock}`: start,
    })
  }

  return items
}

export function categoryLabel(course: Course, derived: CourseDetailDerived): string | null {
  const x = course as Record<string, unknown>
  return (
    safeTrimUnknown(course.track_title ?? course.track?.title ?? x.track_title) ??
    safeTrimUnknown(course.department?.name ?? course.department_name ?? x.department_name) ??
    derived.programAr ??
    derived.L.badge
  )
}
