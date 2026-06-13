import { studentLearnHref } from '@/utils/studentLearnNavigation'

export type PublicEnrollCta = {
  label: string
  disabled: boolean
  href?: string
  scrollToEnroll?: boolean
  variant: 'primary' | 'success' | 'muted'
}

export function buildCourseLoginHref(courseSlug: string): string {
  return `/login?redirect=${encodeURIComponent(`/courses/${courseSlug}`)}`
}

export function resolveCourseEnrollCta(input: {
  registrationOpen: boolean
  seatsFull: boolean
  alreadyEnrolled: boolean
  isAuthenticated: boolean
  courseSlug: string
  courseId: number
}): PublicEnrollCta {
  const { registrationOpen, seatsFull, alreadyEnrolled, isAuthenticated, courseSlug, courseId } = input

  if (!registrationOpen) {
    return { label: 'التسجيل مغلق', disabled: true, variant: 'muted' }
  }
  if (seatsFull) {
    return { label: 'المقاعد مكتملة', disabled: true, variant: 'muted' }
  }
  if (alreadyEnrolled) {
    return {
      label: 'متابعة التعلم',
      disabled: false,
      href: studentLearnHref(courseId),
      variant: 'success',
    }
  }
  if (!isAuthenticated) {
    return {
      label: 'تسجيل الدخول للالتحاق',
      disabled: false,
      href: buildCourseLoginHref(courseSlug),
      variant: 'primary',
    }
  }
  return {
    label: 'الالتحاق بالدورة',
    disabled: false,
    scrollToEnroll: true,
    variant: 'primary',
  }
}
