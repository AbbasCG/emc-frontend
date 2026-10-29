import type { Course } from '@/types'
import { resolveCourseIsEnded } from '@/utils/courseEnded'

/**
 * دالة مساعدة لتحويل النصوص التاريخية إلى وقت رقمي موثوق (Timestamp)
 */
function safeTimestamp(val: unknown): number | null {
  if (!val || typeof val !== 'string') return null
  const ts = Date.parse(val)
  return Number.isFinite(ts) ? ts : null
}

/**
 * فحص دقيق وشامل لانتهاء الدورة أو الورشة (Bulletproof IsEnded check)
 */
function isProgramEnded(c: Course): boolean {
  if (resolveCourseIsEnded(c)) return true

  // للورش التي حُدد لها تاريخ بدء فقط وتجاوز موعدها الحالي بأكثر من 24 ساعة
  const isWorkshop = c.program_type === 'workshop' || Boolean((c as Record<string, unknown>).is_workshop)
  if (isWorkshop && c.start_date) {
    const startTs = safeTimestamp(c.start_date)
    if (startTs != null && startTs + 24 * 60 * 60 * 1000 < Date.now()) {
      return true
    }
  }

  return false
}

/**
 * خوارزمية ترتيب البرامج الذكية للصفحة الرئيسية (Enterprise-Grade Ranking):
 * 1. الأولوية المطلقة للفعاليات والورش القادمة (تاريخ بدء مستقبلي): تُرتّب تصاعدياً (الأقرب موعداً أولاً).
 * 2. تليها البرامج والدورات المستمرة/المفتوحة للتسجيل: تُرتّب تنازلياً حسب الأحدث إضافة (id تنازلي).
 * 3. البرامج المنتهية تُدفع إلى النهاية تماماً ولا تظهر إلا لسد الفراغ عند قلة البرامج النشطة.
 */
export function sortFeaturedPrograms(courses: Course[]): Course[] {
  const now = Date.now()
  const todayBuffer = now - 24 * 60 * 60 * 1000

  const upcomingWithDate: Course[] = []
  const activeOpen: Course[] = []
  const ended: Course[] = []

  for (const c of courses) {
    if (isProgramEnded(c)) {
      ended.push(c)
      continue
    }

    const startTs = safeTimestamp(c.start_date)
    if (startTs != null && startTs >= todayBuffer) {
      upcomingWithDate.push(c)
    } else {
      activeOpen.push(c)
    }
  }

  // 1. الفعاليات القادمة: الأقرب بدءاً أولاً (Chronological Soonest)
  upcomingWithDate.sort((a, b) => {
    const timeA = safeTimestamp(a.start_date) ?? Number.POSITIVE_INFINITY
    const timeB = safeTimestamp(b.start_date) ?? Number.POSITIVE_INFINITY
    if (timeA !== timeB) return timeA - timeB
    return (Number(b.id) || 0) - (Number(a.id) || 0)
  })

  // 2. البرامج المفتوحة / المضافة حديثاً: الأحدث إضافةً أولاً (Newest Added First)
  activeOpen.sort((a, b) => {
    const idA = Number(a.id) || 0
    const idB = Number(b.id) || 0
    return idB - idA
  })

  // 3. البرامج المنتهية: الأحدث انتهاءً أولاً
  ended.sort((a, b) => {
    const endA = safeTimestamp(a.end_date) ?? 0
    const endB = safeTimestamp(b.end_date) ?? 0
    if (endA !== endB) return endB - endA
    return (Number(b.id) || 0) - (Number(a.id) || 0)
  })

  return [...upcomingWithDate, ...activeOpen, ...ended]
}
