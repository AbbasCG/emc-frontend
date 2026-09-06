import { describe, it, expect, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import { safeEnrollmentRedirect } from '@/utils/enrollmentRedirect'
import FormField from '@/components/ui/FormField'
import CourseEnrollmentFieldsModal from '@/components/enrollment/CourseEnrollmentFieldsModal'
import type { Course } from '@/types'
import { axeCheck } from './axe'

/* ── module boundary mocks ─────────────────────────────────────────── */

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

// The country picker is a third-party react-select widget with its own a11y contract;
// what is under test here is the modal's own markup, so stand in a minimal labelled
// control and keep the real COUNTRIES table (the phone hydration reads it).
vi.mock('@/components/ui/CountrySelector', async (importOriginal) => {
  const React = await import('react')
  const actual = await importOriginal<typeof import('@/components/ui/CountrySelector')>()
  return {
    ...actual,
    default: ({ value }: { value: { name: string } | null }) =>
      React.createElement(
        'button',
        { type: 'button', 'aria-label': 'اختر الدولة' },
        value?.name ?? 'اختر الدولة',
      ),
  }
})

/* ── 1. safeEnrollmentRedirect — open-redirect bypasses ────────────── */

describe('safeEnrollmentRedirect — backslash open-redirect bypasses', () => {
  it('rejects a backslash used as the second separator (`/\\host`)', () => {
    // Browsers normalise the backslash to `/`, making this `//evil.example`.
    expect(safeEnrollmentRedirect('/\\evil.example')).toBeNull()
    expect(safeEnrollmentRedirect('/\\evil.example/courses/1')).toBeNull()
  })

  it('rejects the mixed `/\\/host` and `/\\\\host` shapes', () => {
    expect(safeEnrollmentRedirect('/\\/evil.example')).toBeNull()
    expect(safeEnrollmentRedirect('/\\\\evil.example')).toBeNull()
    expect(safeEnrollmentRedirect('/\\')).toBeNull()
  })

  it('rejects a backslash anywhere in the path, not only in second position', () => {
    expect(safeEnrollmentRedirect('/courses/eng\\lish-101')).toBeNull()
    expect(safeEnrollmentRedirect('/courses/1?next=\\\\evil.example')).toBeNull()
  })

  it('rejects a percent-encoded backslash in either case', () => {
    expect(safeEnrollmentRedirect('/%5Cevil.example')).toBeNull()
    expect(safeEnrollmentRedirect('/%5cevil.example')).toBeNull()
  })

  it('rejects whitespace/control characters the URL parser strips before navigating', () => {
    // `/<tab>/evil.example` collapses to `//evil.example` once the tab is stripped.
    expect(safeEnrollmentRedirect('/\t/evil.example')).toBeNull()
    expect(safeEnrollmentRedirect('/\n/evil.example')).toBeNull()
    expect(safeEnrollmentRedirect('/\r/evil.example')).toBeNull()
    expect(safeEnrollmentRedirect(' /courses/english-101')).toBeNull()
  })

  it('still rejects the plain protocol-relative form', () => {
    expect(safeEnrollmentRedirect('//evil.example')).toBeNull()
  })

  it('keeps accepting legitimate internal paths', () => {
    expect(safeEnrollmentRedirect('/')).toBe('/')
    expect(safeEnrollmentRedirect('/courses/english-101')).toBe('/courses/english-101')
    expect(safeEnrollmentRedirect('/courses/english-101?ref=email#enroll')).toBe(
      '/courses/english-101?ref=email#enroll',
    )
    // The `%5C` guard must not swallow ordinary percent-encoding.
    expect(safeEnrollmentRedirect('/courses/%D8%AF%D9%88%D8%B1%D8%A9')).toBe(
      '/courses/%D8%AF%D9%88%D8%B1%D8%A9',
    )
    expect(safeEnrollmentRedirect('/courses/دورة-الإنجليزية')).toBe('/courses/دورة-الإنجليزية')
  })
})

/* ── 2. FormField — aria-describedby must not dangle ───────────────── */

function describedIds(el: HTMLElement): string[] {
  const value = el.getAttribute('aria-describedby')
  return value ? value.split(/\s+/).filter(Boolean) : []
}

describe('FormField — aria-describedby references only rendered elements', () => {
  it('drops the hint id once an error replaces the hint paragraph', () => {
    render(
      <FormField
        id="email"
        label="البريد الإلكتروني"
        hint="نستخدمه للتواصل"
        error="البريد مستخدم مسبقًا"
        defaultValue=""
      />,
    )

    const input = screen.getByLabelText('البريد الإلكتروني')
    expect(describedIds(input)).toEqual(['email-error'])
    expect(document.getElementById('email-hint')).toBeNull()
  })

  it('every id listed in aria-describedby resolves to an element in the DOM', () => {
    render(
      <FormField
        id="phone"
        label="رقم الجوال"
        hint="أرقام فقط"
        error="رقم غير صالح"
        defaultValue=""
      />,
    )

    const input = screen.getByLabelText('رقم الجوال')
    const ids = describedIds(input)
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      expect(document.getElementById(id)).not.toBeNull()
    }
  })

  it('still points at the hint when there is no error', () => {
    render(<FormField id="city" label="المدينة" hint="مثال: صنعاء" defaultValue="" />)

    const input = screen.getByLabelText('المدينة')
    expect(describedIds(input)).toEqual(['city-hint'])
    expect(document.getElementById('city-hint')).toHaveTextContent('مثال: صنعاء')
  })

  it('has no accessibility violations with hint and error set together', async () => {
    const { container } = render(
      <FormField
        id="a5"
        label="البريد الإلكتروني"
        hint="نستخدمه للتواصل"
        error="البريد مستخدم مسبقًا"
        defaultValue=""
      />,
    )
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

/* ── 3. CourseEnrollmentFieldsModal — labelled phone input ─────────── */

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

function renderModal(props: Partial<ComponentProps<typeof CourseEnrollmentFieldsModal>> = {}) {
  return render(
    <CourseEnrollmentFieldsModal
      open
      course={course()}
      missing={['phone']}
      onClose={vi.fn()}
      onSubmit={vi.fn()}
      {...props}
    />,
  )
}

describe('CourseEnrollmentFieldsModal — phone field accessible name', () => {
  it('labels the tel input with its visible caption', () => {
    renderModal()

    const phone = screen.getByLabelText('رقم الجوال')
    expect(phone.tagName).toBe('INPUT')
    expect(phone).toHaveAttribute('type', 'tel')
  })

  it('keeps the caption in the accessible name once a dial-code prefix is shown', () => {
    renderModal({
      initial: { phone: '+967771234567', phone_country_code: '+967', country_code: 'YE' },
    })

    const phone = screen.getByLabelText(/رقم الجوال/)
    expect(phone).toHaveAttribute('type', 'tel')
    expect(phone).toHaveValue('771234567')
  })

  it('has no accessibility violations while collecting the phone number', async () => {
    const { container } = renderModal()
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})
