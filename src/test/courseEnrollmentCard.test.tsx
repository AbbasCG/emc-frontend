import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ComponentProps } from 'react'
import { render, screen, act, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AxiosError } from 'axios'
import CourseEnrollmentCard from '@/components/enrollment/CourseEnrollmentCard'
import { ENDED_COURSE_DETAIL_MESSAGE } from '@/utils/courseEnded'
import { PUBLIC_ENROLL_STUDENT_ONLY_MSG } from '@/utils/publicEnrollAuth'
import type { Course, User } from '@/types'
import { axeCheck } from './axe'

/* ── module boundary mocks ─────────────────────────────────────────── */

const auth = vi.hoisted(() => ({
  value: {
    user: null as User | null,
    isAuthenticated: false,
    refreshUser: vi.fn(),
  },
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }))

const mockFetchProfileUser = vi.fn()
const mockUpdateProfile = vi.fn()
vi.mock('@/api/profileApi', () => ({
  fetchProfileUser: (...a: unknown[]) => mockFetchProfileUser(...a),
  updateProfile: (...a: unknown[]) => mockUpdateProfile(...a),
}))

const mockSubmitCourseRegistration = vi.fn()
vi.mock('@/api/registrationsApi', () => ({
  submitCourseRegistration: (...a: unknown[]) => mockSubmitCourseRegistration(...a),
}))

const mockInitiateCheckout = vi.fn()
vi.mock('@/api/checkoutApi', () => ({
  initiateCheckout: (...a: unknown[]) => mockInitiateCheckout(...a),
}))

const mockNotifyStudentScopeRefresh = vi.fn()
vi.mock('@/api/studentApi', () => ({
  notifyStudentScopeRefresh: (...a: unknown[]) => mockNotifyStudentScopeRefresh(...a),
}))

const mockNotifyNotificationsRefresh = vi.fn()
vi.mock('@/api/notificationsApi', () => ({
  notifyNotificationsRefresh: (...a: unknown[]) => mockNotifyNotificationsRefresh(...a),
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('@/lib/toast', () => ({
  default: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
    warning: vi.fn(),
    message: vi.fn(),
  },
}))

// Animations are not part of the contract under test and would otherwise leak
// motion-only props onto DOM nodes; render plain elements instead.
vi.mock('framer-motion', async () => {
  const React = await import('react')
  const MOTION_PROPS = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap',
    'whileFocus', 'whileDrag', 'whileInView', 'viewport', 'layout', 'layoutId',
    'drag', 'onAnimationComplete',
  ])
  const strip = (props: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(props).filter(([k]) => !MOTION_PROPS.has(k)))

  // Cache per tag: a fresh component identity on every property access would make
  // React remount the subtree on each render and drop the form's local state.
  const cache = new Map<string, unknown>()
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          const Comp = React.forwardRef<unknown, Record<string, unknown>>(function MotionMock(
            { children, ...rest },
            ref,
          ) {
            return React.createElement(tag, { ...strip(rest), ref }, children as never)
          })
          cache.set(tag, Comp)
        }
        return cache.get(tag)
      },
    },
  )
  return {
    motion,
    AnimatePresence: ({ children }: { children?: unknown }) => children as never,
  }
})

/* ── fixtures ──────────────────────────────────────────────────────── */

function course(overrides: Partial<Course> & Record<string, unknown> = {}): Course {
  return {
    id: 1,
    title: 'اللغة الإنجليزية للمبتدئين',
    slug: 'english-101',
    type: 'free',
    price: 0,
    is_online: true,
    ...overrides,
  } as Course
}

function studentUser(overrides: Partial<User> = {}): User {
  return {
    id: 5,
    name: 'سارة أحمد',
    email: 'sara@example.com',
    role: 'student',
    ...overrides,
  } as User
}

/** Shape returned by `fetchProfileUser` — complete unless a field is nulled out. */
function profilePayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    name: 'سارة أحمد',
    email: 'sara@example.com',
    phone: '+967771234567',
    city: 'صنعاء',
    gender: 'female',
    country: 'YE',
    role: 'student',
    ...overrides,
  } as unknown as User
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function axiosErr(status: number, data: unknown) {
  const err = new AxiosError('request failed', 'ERR_BAD_REQUEST')
  err.response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: {} },
  } as never
  return err
}

type CardProps = ComponentProps<typeof CourseEnrollmentCard>

function renderCard(props: Partial<CardProps> = {}) {
  return render(
    <MemoryRouter>
      <CourseEnrollmentCard
        course={course()}
        itemType="course"
        isFree
        priceLabel="مجانية"
        registrationOpen
        seatsFull={false}
        alreadyEnrolled={false}
        {...props}
      />
    </MemoryRouter>,
  )
}

function signInAsStudent(user: User = studentUser()) {
  auth.value.user = user
  auth.value.isAuthenticated = true
}

/** Lets the profile-hydration promise settle inside `act` so no update escapes it. */
async function flushProfile() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

/* ── setup ─────────────────────────────────────────────────────────── */

const originalLocation = window.location
let assignMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  auth.value.user = null
  auth.value.isAuthenticated = false
  auth.value.refreshUser = vi.fn().mockResolvedValue(null)
  mockFetchProfileUser.mockResolvedValue(profilePayload())
  mockUpdateProfile.mockResolvedValue(profilePayload())
  mockSubmitCourseRegistration.mockResolvedValue({ id: 77, status: 'pending' })
  assignMock = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...originalLocation, assign: assignMock, href: '' },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
})

/* ── guest ─────────────────────────────────────────────────────────── */

describe('CourseEnrollmentCard — guest visitor', () => {
  it('offers a login link that carries the course path as the post-auth redirect', () => {
    renderCard()

    const link = screen.getByRole('link', { name: 'سجّل الدخول لإكمال التسجيل' })
    expect(link).toHaveAttribute('href', '/login?redirect=%2Fcourses%2Fenglish-101')
  })

  it('does not expose the enrol action or fetch any profile for a signed-out visitor', () => {
    renderCard()

    expect(screen.queryByRole('button', { name: /الالتحاق بالدورة/ })).not.toBeInTheDocument()
    expect(mockFetchProfileUser).not.toHaveBeenCalled()
    expect(mockSubmitCourseRegistration).not.toHaveBeenCalled()
  })

  it('shows the open-for-registration badge while seats remain', () => {
    renderCard()
    expect(screen.getByText('متاح للتسجيل')).toBeInTheDocument()
  })

  it('has no axe violations in the guest state', async () => {
    const { container } = renderCard()
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

/* ── closed / full ─────────────────────────────────────────────────── */

describe('CourseEnrollmentCard — registration unavailable', () => {
  it('explains that registration is closed and hides the login CTA', () => {
    renderCard({ registrationOpen: false })

    expect(screen.getByText('التسجيل مغلق حالياً')).toBeInTheDocument()
    expect(screen.getByText('مغلق')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'سجّل الدخول لإكمال التسجيل' })).not.toBeInTheDocument()
  })

  it('reports full seats even while registration is nominally open', () => {
    renderCard({ seatsFull: true })

    expect(screen.getByText('المقاعد مكتملة')).toBeInTheDocument()
    expect(screen.getByText('مكتمل')).toBeInTheDocument()
  })

  it('blocks enrolment for a signed-in student when seats are full', async () => {
    signInAsStudent()
    renderCard({ seatsFull: true })

    expect(await screen.findByText('المقاعد مكتملة')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /الالتحاق بالدورة/ })).not.toBeInTheDocument()
  })
})

/* ── already enrolled ──────────────────────────────────────────────── */

describe('CourseEnrollmentCard — already enrolled', () => {
  it('confirms the existing registration and links to the student courses page', async () => {
    signInAsStudent()
    renderCard({ alreadyEnrolled: true })
    await flushProfile()

    expect(screen.getByText('أنت مسجّل بالفعل')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'عرض تسجيلي' })).toHaveAttribute(
      'href',
      '/dashboard/student/courses',
    )
    expect(screen.queryByRole('button', { name: /الالتحاق بالدورة/ })).not.toBeInTheDocument()
  })

  it('shows the enrolled state to a guest too, without a login CTA', () => {
    renderCard({ alreadyEnrolled: true })

    expect(screen.getByText('أنت مسجّل بالفعل')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'سجّل الدخول لإكمال التسجيل' })).not.toBeInTheDocument()
  })

  it('has no axe violations in the already-enrolled state', async () => {
    const { container } = renderCard({ alreadyEnrolled: true })
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

/* ── ended course ──────────────────────────────────────────────────── */

describe('CourseEnrollmentCard — ended course', () => {
  it('replaces the enrol action with the ended-course explanation', async () => {
    signInAsStudent()
    renderCard({ course: course({ is_ended: true }) })
    await flushProfile()

    expect(screen.getByText(ENDED_COURSE_DETAIL_MESSAGE)).toBeInTheDocument()
    expect(screen.getByText('انتهت')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /الالتحاق بالدورة/ })).not.toBeInTheDocument()
    expect(mockSubmitCourseRegistration).not.toHaveBeenCalled()
  })

  it('keeps the ended badge but still allows enrolment when registration is explicitly reopened', async () => {
    renderCard({ course: course({ is_ended: true, registration_open: true }) })

    expect(screen.getByText('انتهت')).toBeInTheDocument()
    expect(screen.queryByText(ENDED_COURSE_DETAIL_MESSAGE)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'سجّل الدخول لإكمال التسجيل' })).toBeInTheDocument()
  })

  it('has no axe violations in the ended state', async () => {
    const { container } = renderCard({ course: course({ is_ended: true }) })
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

/* ── non-student roles ─────────────────────────────────────────────── */

describe('CourseEnrollmentCard — signed-in non-student', () => {
  it('tells an instructor that only students may enrol and hides the action', async () => {
    signInAsStudent(studentUser({ role: 'instructor' }))
    renderCard()

    expect(await screen.findByText(PUBLIC_ENROLL_STUDENT_ONLY_MSG)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /الالتحاق بالدورة/ })).not.toBeInTheDocument()
  })

  it('applies the same gate to an admin', async () => {
    signInAsStudent(studentUser({ role: 'super_admin' }))
    renderCard()

    expect(await screen.findByText(PUBLIC_ENROLL_STUDENT_ONLY_MSG)).toBeInTheDocument()
  })
})

/* ── profile loading ───────────────────────────────────────────────── */

describe('CourseEnrollmentCard — profile hydration', () => {
  it('shows a loading state until the profile resolves, then reveals the enrol action', async () => {
    const gate = deferred<User>()
    mockFetchProfileUser.mockReturnValue(gate.promise)
    signInAsStudent()

    renderCard()

    expect(screen.getByText('جارٍ تحميل بياناتك…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /الالتحاق بالدورة/ })).not.toBeInTheDocument()

    await act(async () => {
      gate.resolve(profilePayload())
    })

    expect(await screen.findByRole('button', { name: /الالتحاق بالدورة/ })).toBeInTheDocument()
    expect(screen.queryByText('جارٍ تحميل بياناتك…')).not.toBeInTheDocument()
  })

  it('renders the hydrated identity summary once loaded', async () => {
    signInAsStudent()
    renderCard()

    expect(await screen.findByText('سارة أحمد')).toBeInTheDocument()
    expect(screen.getByText('sara@example.com')).toBeInTheDocument()
    expect(screen.getByText('+967771234567')).toBeInTheDocument()
  })

  it('falls back to the session identity when the profile endpoint fails', async () => {
    mockFetchProfileUser.mockRejectedValue(new Error('offline'))
    signInAsStudent(studentUser({ phone: '+967700000001', city: 'عدن', gender: 'female' }))

    renderCard()

    expect(await screen.findByText('سارة أحمد')).toBeInTheDocument()
    expect(screen.getByText('+967700000001')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /الالتحاق بالدورة/ })).toBeInTheDocument()
  })

  it('warns that extra fields may be requested when the profile is incomplete', async () => {
    mockFetchProfileUser.mockResolvedValue(profilePayload({ city: null, gender: null }))
    signInAsStudent(studentUser({ city: null, gender: null }))

    renderCard()

    expect(await screen.findByText('قد نطلب حقول إضافية قبل التأكيد.')).toBeInTheDocument()
  })
})

/* ── enrolling ─────────────────────────────────────────────────────── */

describe('CourseEnrollmentCard — enrolling', () => {
  it('submits the registration with the hydrated profile and confirms success', async () => {
    const user = userEvent.setup()
    signInAsStudent()
    renderCard()

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    await waitFor(() => expect(mockSubmitCourseRegistration).toHaveBeenCalledTimes(1))
    expect(mockSubmitCourseRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        course_id: 1,
        full_name: 'سارة أحمد',
        email: 'sara@example.com',
        phone: '+967771234567',
        city: 'صنعاء',
        gender: 'female',
        notes: '',
        country_code: 'YE',
        phone_country_code: '+967',
      }),
    )

    expect(await screen.findByText('تم التسجيل بنجاح')).toBeInTheDocument()
    expect(toastSuccess).toHaveBeenCalledWith('تم التسجيل في البرنامج بنجاح')
    expect(mockNotifyStudentScopeRefresh).toHaveBeenCalled()
    expect(mockNotifyNotificationsRefresh).toHaveBeenCalled()
  })

  it('does not re-submit once the enrolment has succeeded', async () => {
    const user = userEvent.setup()
    signInAsStudent()
    renderCard()

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))
    expect(await screen.findByText('تم التسجيل بنجاح')).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /الالتحاق بالدورة/ })).not.toBeInTheDocument()
    expect(mockSubmitCourseRegistration).toHaveBeenCalledTimes(1)
  })

  it('still marks the enrolment successful when the follow-up profile sync fails', async () => {
    const user = userEvent.setup()
    mockUpdateProfile.mockRejectedValue(new Error('profile sync down'))
    signInAsStudent()
    renderCard()

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    expect(await screen.findByText('تم التسجيل بنجاح')).toBeInTheDocument()
  })

  it('opens the details modal instead of submitting when required fields are missing', async () => {
    const user = userEvent.setup()
    mockFetchProfileUser.mockResolvedValue(profilePayload({ city: null }))
    signInAsStudent(studentUser({ city: null }))
    renderCard()

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('إكمال بيانات الالتحاق')).toBeInTheDocument()
    expect(mockSubmitCourseRegistration).not.toHaveBeenCalled()
  })

  it('collects the missing city in the modal and submits it with the registration', async () => {
    const user = userEvent.setup()
    mockFetchProfileUser.mockResolvedValue(profilePayload({ city: null }))
    signInAsStudent(studentUser({ city: null }))
    renderCard()

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))
    const dialog = await screen.findByRole('dialog')

    await user.type(screen.getByLabelText(/المدينة/), 'تعز')
    await user.click(within(dialog).getByRole('button', { name: 'تأكيد الالتحاق' }))

    await waitFor(() => expect(mockSubmitCourseRegistration).toHaveBeenCalledTimes(1))
    expect(mockSubmitCourseRegistration).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'تعز', phone: '+967771234567' }),
    )
  })

  it('opens the modal for a paid course so a payment provider can be chosen', async () => {
    const user = userEvent.setup()
    signInAsStudent()
    renderCard({ course: course({ type: 'paid', price: 120, is_paid: true }), isFree: false, priceLabel: '€120' })

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(mockSubmitCourseRegistration).not.toHaveBeenCalled()
  })

  it('opens the modal for a course that requires a registration code', async () => {
    const user = userEvent.setup()
    signInAsStudent()
    renderCard({ course: course({ requires_registration_code: true }) })

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('أدخل رمز التسجيل للدورة')).toBeInTheDocument()
    expect(mockSubmitCourseRegistration).not.toHaveBeenCalled()
  })

  it('uses the workshop wording for the enrol action on workshops', async () => {
    signInAsStudent()
    renderCard({ itemType: 'workshop' })

    expect(await screen.findByRole('button', { name: /التسجيل في الورشة/ })).toBeInTheDocument()
  })

  it('hands off to the payment provider when the API returns a checkout URL', async () => {
    const user = userEvent.setup()
    mockSubmitCourseRegistration.mockResolvedValue({
      checkout_url: 'https://checkout.stripe.com/pay/cs_test_1',
    })
    signInAsStudent()
    renderCard()

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    await waitFor(() =>
      expect(assignMock).toHaveBeenCalledWith('https://checkout.stripe.com/pay/cs_test_1'),
    )
    expect(screen.queryByText('تم التسجيل بنجاح')).not.toBeInTheDocument()
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })
})

/* ── failures ──────────────────────────────────────────────────────── */

describe('CourseEnrollmentCard — API failures', () => {
  it('reports a duplicate registration on HTTP 409 without claiming success', async () => {
    const user = userEvent.setup()
    mockSubmitCourseRegistration.mockRejectedValue(axiosErr(409, { message: 'Already registered' }))
    signInAsStudent()
    renderCard()

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    expect(await screen.findByText('أنت مسجل بالفعل في هذا البرنامج')).toBeInTheDocument()
    expect(toastError).toHaveBeenCalledWith('أنت مسجل بالفعل في هذا البرنامج')
    expect(screen.queryByText('تم التسجيل بنجاح')).not.toBeInTheDocument()
  })

  it('recognises a duplicate reported in Arabic with a non-409 status', async () => {
    const user = userEvent.setup()
    mockSubmitCourseRegistration.mockRejectedValue(
      axiosErr(400, { message: 'أنت مسجل بالفعل في هذه الدورة' }),
    )
    signInAsStudent()
    renderCard()

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    expect(await screen.findByText('أنت مسجل بالفعل في هذا البرنامج')).toBeInTheDocument()
  })

  it('surfaces the Arabic validation message returned on HTTP 422', async () => {
    const user = userEvent.setup()
    mockSubmitCourseRegistration.mockRejectedValue(
      axiosErr(422, { message_ar: 'رمز التسجيل غير صالح' }),
    )
    signInAsStudent()
    renderCard()

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    expect(await screen.findByText('رمز التسجيل غير صالح')).toBeInTheDocument()
    expect(toastError).toHaveBeenCalledWith('رمز التسجيل غير صالح')
  })

  it('reopens the modal with per-field errors for a 422 validation payload', async () => {
    const user = userEvent.setup()
    mockSubmitCourseRegistration.mockRejectedValue(
      axiosErr(422, { message: 'يرجى تصحيح الحقول.', errors: { city: ['المدينة مطلوبة'] } }),
    )
    signInAsStudent()
    renderCard()

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('يرجى تصحيح الحقول.')).toBeInTheDocument()
  })

  it('falls back to the generic Arabic error for a non-Axios failure', async () => {
    const user = userEvent.setup()
    mockSubmitCourseRegistration.mockRejectedValue(new Error('boom'))
    signInAsStudent()
    renderCard()

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    expect(await screen.findByText('تعذّر إتمام التسجيل. حاول مرة أخرى.')).toBeInTheDocument()
  })

  it('shows the server message for an unclassified Axios failure', async () => {
    const user = userEvent.setup()
    mockSubmitCourseRegistration.mockRejectedValue(axiosErr(500, { message: 'خطأ في الخادم' }))
    signInAsStudent()
    renderCard()

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    expect(await screen.findByText('خطأ في الخادم')).toBeInTheDocument()
  })

  it('restarts checkout when the backend answers 402 with a checkout endpoint', async () => {
    const user = userEvent.setup()
    mockInitiateCheckout.mockResolvedValue({ checkout_url: 'https://pay.example/cs_402' })
    mockSubmitCourseRegistration.mockRejectedValue(
      axiosErr(402, { checkout_endpoint: '/checkout' }),
    )
    signInAsStudent()
    renderCard()

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    await waitFor(() => expect(mockInitiateCheckout).toHaveBeenCalledWith(1))
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('https://pay.example/cs_402'))
  })
})

/* ── pricing / accessibility of the authenticated state ────────────── */

describe('CourseEnrollmentCard — pricing display', () => {
  it('labels a free course as مجانية', () => {
    renderCard()
    expect(screen.getByText('مجانية')).toBeInTheDocument()
  })

  it('shows the strike-through original price and discount badge for a discounted course', () => {
    renderCard({
      isFree: false,
      priceLabel: '€90',
      originalPriceLabel: '€120',
      discountPercent: 25,
      course: course({ type: 'paid', price: 90 }),
    })

    expect(screen.getByText('€120')).toBeInTheDocument()
    expect(screen.getByText('€90')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('hides the discount badge for a zero discount on a paid course', () => {
    renderCard({
      isFree: false,
      priceLabel: '€120',
      discountPercent: 0,
      course: course({ type: 'paid', price: 120 }),
    })
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
    expect(screen.getByText('€120')).toBeInTheDocument()
  })

  it('hides the discount badge on a free course even when a percentage is supplied', () => {
    renderCard({ discountPercent: 40 })
    expect(screen.queryByText('40%')).not.toBeInTheDocument()
    expect(screen.getByText('مجانية')).toBeInTheDocument()
  })

  it('has no axe violations for a signed-in student ready to enrol', async () => {
    signInAsStudent()
    const { container } = renderCard()

    await screen.findByRole('button', { name: /الالتحاق بالدورة/ })
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})
