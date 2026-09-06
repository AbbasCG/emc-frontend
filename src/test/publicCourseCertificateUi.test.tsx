import { describe, it, expect, vi } from 'vitest'
import type { PropsWithChildren, ReactElement } from 'react'
import { render, screen, within, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import PremiumHero from '@/components/public/course-detail/premium/PremiumHero'
import PremiumJourney from '@/components/public/course-detail/premium/PremiumJourney'
import { deriveCourseDetail } from '@/utils/courseDetailDerived'
import { PROGRAM_CERTIFICATE_NONE_AR } from '@/utils/programCertificateAvailability'
import type { Course } from '@/types'
import type { CourseDetailDerived } from '@/utils/courseDetailDerived'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

function baseCourse(overrides: Partial<Course> & Record<string, unknown> = {}): Course {
  return {
    id: 9,
    title: 'المهارات الناعمة',
    slug: 'almharat-alnaaam',
    type: 'paid',
    price: 120,
    is_online: true,
    short_description: 'وصف مختصر',
    registration_open: true,
    ...overrides,
  } as Course
}

function heroProps(course: Course, derived: CourseDetailDerived) {
  return {
    course,
    derived,
    coverUrl: '/cover.jpg',
    gallery: [],
    videoUrl: null,
    category: null,
    level: null,
    rating: null,
    reviewCount: 0,
    wishlisted: false,
    onToggleWishlist: () => {},
    onShare: () => {},
    cta: <button type="button">التسجيل</button>,
  }
}

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('public course certificate UI', () => {
  it('no certificate: hides hero badge and journey certificate step', () => {
    const course = baseCourse({ certificate: PROGRAM_CERTIFICATE_NONE_AR })
    const derived = deriveCourseDetail(course)

    renderWithRouter(<PremiumHero {...heroProps(course, derived)} />)
    expect(screen.queryByText('شهادة معتمدة')).not.toBeInTheDocument()
    expect(screen.queryByText(PROGRAM_CERTIFICATE_NONE_AR)).not.toBeInTheDocument()
    cleanup()

    renderWithRouter(<PremiumJourney course={course} derived={derived} />)
    const journey = screen.getByLabelText('رحلة التعلم')
    expect(within(journey).queryByText('الشهادة')).not.toBeInTheDocument()
    expect(within(journey).queryByText('استلام شهادة إتمام معتمدة')).not.toBeInTheDocument()
    expect(within(journey).queryByText('استلم شهادة إتمامك المعتمدة')).not.toBeInTheDocument()
    expect(within(journey).getAllByText('قبل الدورة').length).toBeGreaterThanOrEqual(1)
    expect(within(journey).getAllByText('أثناء الدورة').length).toBeGreaterThanOrEqual(1)
    expect(within(journey).getAllByText('إتمام البرنامج').length).toBeGreaterThanOrEqual(1)
    expect(within(journey).getAllByText('3')).toHaveLength(2)
  })

  it('attendance certificate: shows configured badge and journey step', () => {
    const course = baseCourse({ certificate: 'شهادة حضور' })
    const derived = deriveCourseDetail(course)

    renderWithRouter(<PremiumHero {...heroProps(course, derived)} />)
    expect(screen.getByText('شهادة حضور')).toBeInTheDocument()
    expect(screen.queryByText('شهادة معتمدة')).not.toBeInTheDocument()
    cleanup()

    renderWithRouter(<PremiumJourney course={course} derived={derived} />)
    const journey = screen.getByLabelText('رحلة التعلم')
    expect(within(journey).getAllByText('الشهادة').length).toBeGreaterThanOrEqual(1)
    expect(within(journey).getAllByText('شهادة حضور').length).toBeGreaterThanOrEqual(1)
    expect(within(journey).getAllByText('4')).toHaveLength(2)
  })

  it('completion certificate: journey keeps certificate step with configured wording', () => {
    const course = baseCourse({ certificate: 'شهادة إتمام' })
    const derived = deriveCourseDetail(course)

    renderWithRouter(<PremiumJourney course={course} derived={derived} />)
    const journey = screen.getByLabelText('رحلة التعلم')
    expect(within(journey).getAllByText('الشهادة').length).toBeGreaterThanOrEqual(1)
    expect(within(journey).getAllByText('شهادة إتمام').length).toBeGreaterThanOrEqual(1)
  })

  it('mobile and desktop journey share the same filtered step phases', () => {
    const course = baseCourse({ certificate: PROGRAM_CERTIFICATE_NONE_AR })
    const derived = deriveCourseDetail(course)

    renderWithRouter(<PremiumJourney course={course} derived={derived} />)
    const journey = screen.getByLabelText('رحلة التعلم')
    const phases = ['قبل الدورة', 'أثناء الدورة', 'إتمام البرنامج']
    for (const phase of phases) {
      expect(within(journey).getAllByText(phase).length).toBeGreaterThanOrEqual(1)
    }
    expect(within(journey).queryByText('الشهادة')).not.toBeInTheDocument()
  })
})
