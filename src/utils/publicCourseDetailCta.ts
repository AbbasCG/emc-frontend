import { studentLearnHref } from '@/utils/studentLearnNavigation'
import { buildPublicLoginHref, isStudentUser } from '@/utils/publicEnrollAuth'

export type PublicEnrollCta = {
  label: string
  disabled: boolean
  href?: string
  scrollToEnroll?: boolean
  denyNonStudent?: boolean
  variant: 'primary' | 'success' | 'muted'
}

export function buildCourseLoginHref(courseSlug: string): string {
  return buildPublicLoginHref(`/courses/${courseSlug}`)
}

export function resolveCourseEnrollCta(input: {
  registrationOpen: boolean
  seatsFull: boolean
  alreadyEnrolled: boolean
  isAuthenticated: boolean
  userRole?: string | null
  courseSlug: string
  courseId: number
  /** True when this course belongs to a learning path and cannot be enrolled directly */
  isPartOfLearningPath?: boolean
  /** Slug of the owning learning path, used to build the "view path" link */
  learningPathSlug?: string | null
}): PublicEnrollCta {
  const {
    registrationOpen,
    seatsFull,
    alreadyEnrolled,
    isAuthenticated,
    userRole,
    courseSlug,
    courseId,
    isPartOfLearningPath,
    learningPathSlug,
  } = input

  if (isPartOfLearningPath && !alreadyEnrolled) {
    return {
      label: 'عرض المسار التعليمي',
      disabled: false,
      href: learningPathSlug ? `/learning-paths/${learningPathSlug}` : '/learning-paths',
      variant: 'primary',
    }
  }

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
  if (!isStudentUser(userRole)) {
    return {
      label: 'الالتحاق بالدورة',
      disabled: false,
      denyNonStudent: true,
      variant: 'primary',
    }
  }
  return {
    label: 'الالتحاق بالدورة',
    disabled: false,
    href: `/courses/${courseSlug}/register`,
    variant: 'primary',
  }
}
