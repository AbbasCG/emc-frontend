import { studentLearnHref } from '@/utils/studentLearnNavigation'
import { buildPublicLoginHref, isStudentUser } from '@/utils/publicEnrollAuth'
import type { EnrollIntent } from '@/lib/enrollIntent'
import type { StudentCourseAccess } from '@/api/studentApi'

export type PublicEnrollCta = {
  label: string
  disabled: boolean
  href?: string
  scrollToEnroll?: boolean
  denyNonStudent?: boolean
  /** Triggers paid checkout flow — POST /courses/{id}/checkout */
  checkout?: boolean
  checkoutCourseId?: number
  price?: number
  currency?: string
  variant: 'primary' | 'success' | 'muted'
  /** Supporting notice shown near the CTA (payment-required / under-review states). */
  message?: string
  /**
   * Present on the guest CTA — pass it to `gatePublicEnrollClick({ intent })` so
   * the click opens the in-context QuickJoin modal instead of leaving the page.
   * `href` stays populated as the /login?redirect fallback for hosts without
   * the modal (and for plain-link rendering).
   */
  enrollIntent?: EnrollIntent
}

const RESUME_PAYMENT_FALLBACK_HREF = '/dashboard/student/registrations'
const PAYMENT_REQUIRED_NOTICE = 'يجب إكمال الدفع أولًا قبل الوصول إلى محتوى الدورة.'

/**
 * Resolves the CTA for a paid course where the student already has a
 * registration row (StudentCourseAccess is only populated in that case).
 * Backend (CourseAccessEligibilityService, via fetchStudentRegistrations)
 * is the single source of truth — never re-derived from registration
 * presence, `StudentProgress`, or a locally-computed payment guess. Mirrors
 * the wording/href rules already established in
 * `components/dashboard/PaymentRequiredCta.tsx` for the My Courses card, so
 * the two surfaces stay consistent. Returns null when the access block
 * doesn't apply here (free course, or payment already resolved by
 * something other than payment — e.g. placement-test gating, out of this
 * resolver's scope) so the caller falls through to the generic CTA logic.
 */
function resolveAccessBlockedCta(access: StudentCourseAccess): PublicEnrollCta | null {
  if (!access.is_paid_course) return null // free course — untouched, existing behavior applies.

  if (access.can_access_learning) return null // let the normal "متابعة التعلم" path handle it.

  const resumeHref = access.payment_url ?? RESUME_PAYMENT_FALLBACK_HREF

  switch (access.block_reason) {
    case 'payment_pending':
      if (access.payment_status === 'pending_review') {
        return {
          label: 'الدفع قيد المراجعة',
          disabled: true,
          variant: 'muted',
          message: 'سيتم تفعيل الوصول إلى محتوى الدورة بعد اعتماد عملية الدفع.',
        }
      }
      return {
        label: access.payment_url ? 'إكمال الدفع' : 'الدفع للالتحاق',
        disabled: false,
        href: resumeHref,
        variant: 'primary',
        message: PAYMENT_REQUIRED_NOTICE,
      }
    case 'payment_failed':
      return {
        label: access.payment_url ? 'إعادة محاولة الدفع' : 'إكمال الدفع',
        disabled: false,
        href: resumeHref,
        variant: 'primary',
        message: PAYMENT_REQUIRED_NOTICE,
      }
    case 'registration_cancelled':
      return {
        label: access.payment_url ? 'إعادة الدفع' : 'الدفع للالتحاق',
        disabled: false,
        href: resumeHref,
        variant: 'primary',
        message: PAYMENT_REQUIRED_NOTICE,
      }
    default:
      // placement_test_required / placement_test_in_progress / other non-payment
      // blocks: payment itself is resolved, so this resolver doesn't own the
      // decision — fall through to the generic "متابعة التعلم" CTA, which
      // routes to the already-gated learn page.
      return null
  }
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
  /** Arabic course title — carried into the guest QuickJoin intent (modal header / success state). */
  courseTitle?: string
  isEnded?: boolean
  /** True when admin keeps registration_open on an ended course (override). */
  allowEndedEnrollment?: boolean
  /** True when this course belongs to a learning path and cannot be enrolled directly */
  isPartOfLearningPath?: boolean
  /** Slug of the owning learning path, used to build the "view path" link */
  learningPathSlug?: string | null
  isPaid?: boolean
  price?: number
  currency?: string
  /** Canonical backend eligibility block (CourseAccessEligibilityService) for
   *  the student's own registration on this course, when one exists. */
  access?: StudentCourseAccess | null
}): PublicEnrollCta {
  const {
    registrationOpen,
    seatsFull,
    alreadyEnrolled,
    isAuthenticated,
    userRole,
    courseSlug,
    courseId,
    courseTitle,
    isEnded = false,
    allowEndedEnrollment = false,
    isPartOfLearningPath,
    learningPathSlug,
    isPaid = false,
    price,
    currency = 'EUR',
    access,
  } = input

  if (isPartOfLearningPath && !alreadyEnrolled) {
    return {
      label: 'عرض المسار التعليمي',
      disabled: false,
      href: learningPathSlug ? `/learning-paths/${learningPathSlug}` : '/learning-paths',
      variant: 'primary',
    }
  }

  if (isEnded && !allowEndedEnrollment) {
    return { label: 'انتهت الدورة', disabled: true, variant: 'muted' }
  }

  if (!registrationOpen) {
    return { label: 'التسجيل مغلق', disabled: true, variant: 'muted' }
  }
  if (seatsFull) {
    return { label: 'المقاعد مكتملة', disabled: true, variant: 'muted' }
  }
  if (alreadyEnrolled && access) {
    const blocked = resolveAccessBlockedCta(access)
    if (blocked) return blocked
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
    // Guest — the minimal-friction path: the click records an enroll intent and the
    // QuickJoin modal finishes join+enroll in place. `href` remains the classic
    // /login?redirect fallback when no modal host is mounted.
    return {
      label: 'انضم والتحق الآن',
      disabled: false,
      href: buildCourseLoginHref(courseSlug),
      enrollIntent: {
        kind: 'course',
        slug: courseSlug,
        id: courseId,
        title: courseTitle ?? '',
        isFree: !isPaid,
        price,
        currency,
      },
      variant: 'primary',
    }
  }
  if (!isStudentUser(userRole)) {
    return {
      label: isPaid ? 'الدفع والتسجيل' : 'الالتحاق بالدورة',
      disabled: false,
      denyNonStudent: true,
      variant: 'primary',
    }
  }

  if (isPaid) {
    return {
      label: 'الدفع والتسجيل',
      disabled: false,
      checkout: true,
      checkoutCourseId: courseId,
      price,
      currency,
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

/**
 * Shared CTA resolver — single source of truth for both the hero and the
 * enrollment sidebar CTA on the public course-detail page (same alias the
 * two callers should use so neither re-implements the state switch).
 */
export const resolveCoursePrimaryAction = resolveCourseEnrollCta
