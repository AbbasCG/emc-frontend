import { describe, it, expect } from 'vitest'
import { resolveCourseEnrollCta, resolveCoursePrimaryAction } from '@/utils/publicCourseDetailCta'
import type { StudentCourseAccess } from '@/api/studentApi'

function access(overrides: Partial<StudentCourseAccess> = {}): StudentCourseAccess {
  return {
    is_paid_course: true, payment_required: true, payment_status: 'pending_payment',
    payment_completed: false, payment_url: null, enrollment_active: false,
    can_start_placement_test: false, placement_test_required: false, can_access_learning: false,
    block_reason: 'payment_pending', registration_id: 1,
    ...overrides,
  }
}

const BASE = {
  registrationOpen: true,
  seatsFull: false,
  isAuthenticated: true,
  userRole: 'student',
  courseSlug: 'dor-ielts-alshaml',
  courseId: 44,
  isPaid: true,
}

describe('resolveCourseEnrollCta / resolveCoursePrimaryAction — paid course, canonical backend eligibility', () => {
  it('is the same function reused for both hero and sidebar (single shared resolver, no duplicated switch)', () => {
    expect(resolveCoursePrimaryAction).toBe(resolveCourseEnrollCta)
  })

  it('pending payment: shows إكمال الدفع, never متابعة التعلم, opens the existing payment URL (no checkout re-trigger)', () => {
    const cta = resolveCourseEnrollCta({
      ...BASE, alreadyEnrolled: true,
      access: access({ block_reason: 'payment_pending', payment_status: 'pending_payment', payment_url: 'https://checkout.stripe.com/pay/cs_test_1' }),
    })

    expect(cta.label).toBe('إكمال الدفع')
    expect(cta.label).not.toBe('متابعة التعلم')
    expect(cta.href).toBe('https://checkout.stripe.com/pay/cs_test_1')
    expect(cta.checkout).toBeUndefined()
    expect(cta.disabled).toBe(false)
    expect(cta.message).toBe('يجب إكمال الدفع أولًا قبل الوصول إلى محتوى الدورة.')
  })

  it('pending payment with no reusable payment URL falls back to الدفع للالتحاق and a safe resume route (no duplicate checkout)', () => {
    const cta = resolveCourseEnrollCta({
      ...BASE, alreadyEnrolled: true,
      access: access({ block_reason: 'payment_pending', payment_status: 'pending_payment', payment_url: null }),
    })

    expect(cta.label).toBe('الدفع للالتحاق')
    expect(cta.href).toBe('/dashboard/student/registrations')
    expect(cta.checkout).toBeUndefined()
  })

  it('successfully paid: shows متابعة التعلم and links to the learn route', () => {
    const cta = resolveCourseEnrollCta({
      ...BASE, alreadyEnrolled: true,
      access: access({ block_reason: 'access_allowed', payment_status: 'payment_confirmed', payment_completed: true, can_access_learning: true, enrollment_active: true }),
    })

    expect(cta.label).toBe('متابعة التعلم')
    expect(cta.href).toBe('/dashboard/student/learn/44')
    expect(cta.variant).toBe('success')
  })

  it('manual payment under review: shows الدفع قيد المراجعة, disabled, with the review notice', () => {
    const cta = resolveCourseEnrollCta({
      ...BASE, alreadyEnrolled: true,
      access: access({ block_reason: 'payment_pending', payment_status: 'pending_review' }),
    })

    expect(cta.label).toBe('الدفع قيد المراجعة')
    expect(cta.disabled).toBe(true)
    expect(cta.message).toBe('سيتم تفعيل الوصول إلى محتوى الدورة بعد اعتماد عملية الدفع.')
  })

  it('failed payment: shows a retry/payment action, not متابعة التعلم', () => {
    const cta = resolveCourseEnrollCta({
      ...BASE, alreadyEnrolled: true,
      access: access({ block_reason: 'payment_failed', payment_status: 'payment_failed', payment_url: 'https://checkout.stripe.com/pay/cs_test_2' }),
    })

    expect(cta.label).toBe('إعادة محاولة الدفع')
    expect(cta.href).toBe('https://checkout.stripe.com/pay/cs_test_2')
    expect(cta.label).not.toBe('متابعة التعلم')
  })

  it('cancelled registration: shows a re-pay action, not متابعة التعلم', () => {
    const cta = resolveCourseEnrollCta({
      ...BASE, alreadyEnrolled: true,
      access: access({ block_reason: 'registration_cancelled', payment_url: null }),
    })

    expect(cta.label).toBe('الدفع للالتحاق')
    expect(cta.label).not.toBe('متابعة التعلم')
  })

  it('free course: access block is ignored entirely, existing enrollment CTA unaffected', () => {
    const cta = resolveCourseEnrollCta({
      ...BASE, isPaid: false, alreadyEnrolled: false,
      access: null,
    })

    expect(cta.label).toBe('الالتحاق بالدورة')
  })

  it('no access block available (e.g. never registered): falls through to the generic enrollment CTA', () => {
    const cta = resolveCourseEnrollCta({ ...BASE, alreadyEnrolled: false, access: null })

    expect(cta.label).toBe('الدفع والتسجيل')
    expect(cta.checkout).toBe(true)
  })

  it('placement-test-blocked but payment completed: still resolves to متابعة التعلم (out of this resolver payment-only scope)', () => {
    const cta = resolveCourseEnrollCta({
      ...BASE, alreadyEnrolled: true,
      access: access({ block_reason: 'placement_test_required', payment_completed: true, enrollment_active: true, can_access_learning: false }),
    })

    expect(cta.label).toBe('متابعة التعلم')
  })
})
