import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCallback, useMemo, useRef, useState, type ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { usePickerKeyboard } from '@/components/ui/usePickerKeyboard'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import CourseEnrollmentCard from '@/components/enrollment/CourseEnrollmentCard'
import type { Course, User } from '@/types'
import { axeCheck } from './axe'

/**
 * Regression tests for four confirmed defects:
 *
 *  1. `usePickerKeyboard` kept a stale roving index when only the `isDisabled`
 *     predicate changed (a min/max-date constraint arriving on the same month).
 *  2. `useFocusTrap` re-ran its whole effect on every parent render because the
 *     inline `onEscape` sat in the dep array, yanking focus mid-typing.
 *  3. `useFocusTrap` carried two unreachable `!panel.contains(activeEl)` branches;
 *     they were deleted rather than re-homed on `document`.
 *  4. `CourseEnrollmentCard` detected paid courses with `course.is_paid` alone while
 *     the fields modal also accepts `course.type === 'paid'`.
 */

/* ═══ 1 — usePickerKeyboard ══════════════════════════════════════════ */

// A 30-day month whose 1st falls in the 4th column: three leading pads.
// Index of day d === d + 2.
const MONTH: (number | null)[] = [
  null, null, null, 1, 2, 3, 4,
  5, 6, 7, 8, 9, 10, 11,
  12, 13, 14, 15, 16, 17, 18,
  19, 20, 21, 22, 23, 24, 25,
  26, 27, 28, 29, 30, null, null,
]

const dayIndex = (day: number) => day + 2

type GridProps = {
  selectedIndex?: number
  disabledIndices?: number[]
  onSelect?: (index: number) => void
}

/** Minimal grid built to the DOM contract the hook documents. */
function CalendarGrid({ selectedIndex = -1, disabledIndices, onSelect = () => {} }: GridProps) {
  const disabled = useMemo(() => new Set(disabledIndices ?? []), [disabledIndices])
  // Fresh identity on every render — exactly what a real consumer produces from a
  // min/max date, and what the reconciliation guard must not compare by reference.
  const isDisabled = useCallback((index: number) => disabled.has(index), [disabled])

  const { gridRef, onGridKeyDown, activeIndex } = usePickerKeyboard({
    cells: MONTH,
    selectedIndex,
    open: true,
    onSelect,
    onPrevMonth: () => {},
    onNextMonth: () => {},
    onClose: () => {},
    isDisabled,
  })

  const rows: (number | null)[][] = []
  for (let start = 0; start < MONTH.length; start += 7) rows.push(MONTH.slice(start, start + 7))

  return (
    <div ref={gridRef} role="grid" aria-label="التقويم" dir="rtl" onKeyDown={onGridKeyDown}>
      {rows.map((row, rowIndex) => (
        <div role="row" key={rowIndex}>
          {row.map((day, col) => {
            const index = rowIndex * 7 + col
            if (day == null) {
              return <div role="gridcell" key={index} data-cell-index={index} aria-disabled="true" />
            }
            return (
              <div
                role="gridcell"
                key={index}
                data-cell-index={index}
                tabIndex={index === activeIndex ? 0 : -1}
                aria-selected={index === selectedIndex}
                aria-disabled={isDisabled(index) ? true : undefined}
              >
                {day}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

const focusedDay = () => document.activeElement?.textContent ?? null
const focusedIndex = () => document.activeElement?.getAttribute('data-cell-index') ?? null
const tabbableCells = () =>
  screen.getAllByRole('gridcell').filter((cell) => cell.getAttribute('tabindex') === '0')

describe('usePickerKeyboard — roving index follows a date constraint that arrives late', () => {
  it('moves off the active cell when a min-date constraint disables it', () => {
    const { rerender } = render(<CalendarGrid selectedIndex={dayIndex(8)} />)
    expect(focusedDay()).toBe('8')

    // Same month, same selection — only the disabled predicate changes.
    rerender(<CalendarGrid selectedIndex={dayIndex(8)} disabledIndices={[dayIndex(8)]} />)

    expect(focusedDay()).toBe('1')
    expect(focusedIndex()).toBe('3')
    expect(tabbableCells()).toHaveLength(1)
    expect(tabbableCells()[0]).not.toHaveAttribute('aria-disabled')
  })

  it('lands on the selected day when the constraint spares it', () => {
    const { rerender } = render(<CalendarGrid selectedIndex={dayIndex(20)} />)

    rerender(
      <CalendarGrid selectedIndex={dayIndex(20)} disabledIndices={[dayIndex(1), dayIndex(2)]} />,
    )

    expect(focusedDay()).toBe('20')
  })

  it('commits the cell the roving index moved to, never the disabled one', () => {
    const onSelect = vi.fn()
    const { rerender } = render(<CalendarGrid selectedIndex={dayIndex(8)} onSelect={onSelect} />)

    rerender(
      <CalendarGrid
        selectedIndex={dayIndex(8)}
        onSelect={onSelect}
        disabledIndices={[dayIndex(8)]}
      />,
    )
    fireEvent.keyDown(screen.getByRole('grid', { name: 'التقويم' }), { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(dayIndex(1))
    expect(onSelect).not.toHaveBeenCalledWith(dayIndex(8))
  })

  it('re-arms the roving index when a constraint that disabled every day is lifted', () => {
    const everyIndex = MONTH.map((_, i) => i)
    const { rerender } = render(
      <CalendarGrid selectedIndex={dayIndex(8)} disabledIndices={everyIndex} />,
    )
    expect(tabbableCells()).toHaveLength(0)

    rerender(<CalendarGrid selectedIndex={dayIndex(8)} />)

    expect(tabbableCells()).toHaveLength(1)
    expect(focusedDay()).toBe('8')
  })

  it('settles instead of reconciling forever on an unchanged re-render', () => {
    const { rerender } = render(<CalendarGrid selectedIndex={dayIndex(8)} />)

    for (let i = 0; i < 5; i++) rerender(<CalendarGrid selectedIndex={dayIndex(8)} />)

    expect(focusedDay()).toBe('8')
    expect(tabbableCells()).toHaveLength(1)
  })

  it('has no axe violations after a constraint moves the roving index', async () => {
    const { container, rerender } = render(<CalendarGrid selectedIndex={dayIndex(8)} />)
    rerender(<CalendarGrid selectedIndex={dayIndex(8)} disabledIndices={[dayIndex(8)]} />)

    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

/* ═══ 2 & 3 — useFocusTrap ══════════════════════════════════════════ */

function TrapHarness({ active }: { active: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, { active, onEscape: () => {} })

  return (
    <div>
      <button type="button">فتح</button>
      <div ref={panelRef} role="dialog" aria-label="نافذة حوار" tabIndex={-1}>
        <button type="button">الأول</button>
        <button type="button">الأوسط</button>
        <button type="button">الأخير</button>
      </div>
    </div>
  )
}

/** A dialog whose parent re-renders on every keystroke, with an inline `onEscape`. */
function TypingDialog({ onEscapeSpy }: { onEscapeSpy?: (city: string) => void }) {
  const [open, setOpen] = useState(true)
  const [city, setCity] = useState('')
  const [ticks, setTicks] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  // Inline arrow on purpose — every consumer in the app passes one.
  useFocusTrap(panelRef, {
    active: open,
    onEscape: () => {
      onEscapeSpy?.(city)
      setOpen(false)
    },
  })

  return (
    <div>
      <button type="button">فتح</button>
      {open && (
        <div ref={panelRef} role="dialog" aria-label="بيانات الالتحاق" tabIndex={-1}>
          <input aria-label="الاسم" />
          <input aria-label="المدينة" value={city} onChange={(e) => setCity(e.target.value)} />
          <button type="button" onClick={() => setTicks((t) => t + 1)}>
            تحديث {ticks}
          </button>
        </div>
      )}
    </div>
  )
}

describe('useFocusTrap — survives parent re-renders', () => {
  // jsdom has no layout, so `offsetParent` is always null and the hook's visibility
  // filter would discard every candidate. Emulate a laid-out document: attached and
  // not [hidden] === visible.
  const originalOffsetParent = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetParent',
  )

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get(this: HTMLElement) {
        return this.hidden ? null : this.parentElement
      },
    })
  })

  afterEach(() => {
    if (originalOffsetParent) {
      Object.defineProperty(HTMLElement.prototype, 'offsetParent', originalOffsetParent)
    }
  })

  it('keeps focus in the field being typed in while the parent re-renders', async () => {
    const user = userEvent.setup()
    render(<TypingDialog />)
    expect(document.activeElement).toBe(screen.getByLabelText('الاسم'))

    const cityField = screen.getByLabelText('المدينة')
    await user.type(cityField, 'صنعاء')

    expect(document.activeElement).toBe(cityField)
    expect(cityField).toHaveValue('صنعاء')
    expect(screen.getByLabelText('الاسم')).toHaveValue('')
  })

  it('leaves focus on the control that caused the re-render', async () => {
    const user = userEvent.setup()
    render(<TypingDialog />)

    const refresh = screen.getByRole('button', { name: /تحديث/ })
    await user.click(refresh)

    expect(document.activeElement).toBe(refresh)
    expect(refresh).toHaveTextContent('تحديث 1')
  })

  it('still runs the latest onEscape after the parent has re-rendered', async () => {
    const user = userEvent.setup()
    const seen: string[] = []
    render(<TypingDialog onEscapeSpy={(city) => seen.push(city)} />)

    await user.type(screen.getByLabelText('المدينة'), 'تعز')
    await user.keyboard('{Escape}')

    expect(seen).toEqual(['تعز'])
    expect(screen.queryByRole('dialog', { name: 'بيانات الالتحاق' })).not.toBeInTheDocument()
  })

  it('still wraps Tab from the last focusable back to the first', async () => {
    const user = userEvent.setup()
    render(<TrapHarness active />)

    await user.tab()
    await user.tab()
    expect(document.activeElement).toHaveTextContent('الأخير')

    await user.tab()
    expect(document.activeElement).toHaveTextContent('الأول')
  })

  it('still restores focus to the opener when the trap closes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<TrapHarness active={false} />)

    await user.click(screen.getByRole('button', { name: 'فتح' }))
    rerender(<TrapHarness active />)
    expect(document.activeElement).toHaveTextContent('الأول')

    rerender(<TrapHarness active={false} />)
    expect(document.activeElement).toHaveTextContent('فتح')
  })

  it('ignores a Tab event raised on the panel while focus sits outside it', () => {
    // Pins the decision taken for the dead `!panel.contains(activeEl)` branches: they
    // were deleted, not moved to `document`. The trap only steers focus that a real
    // key event could have come from — i.e. focus already inside the panel.
    render(<TrapHarness active />)
    const opener = screen.getByRole('button', { name: 'فتح' })
    opener.focus()

    fireEvent.keyDown(screen.getByRole('dialog', { name: 'نافذة حوار' }), { key: 'Tab' })

    expect(document.activeElement).toBe(opener)
  })
})

/* ═══ 4 — CourseEnrollmentCard paid detection ═══════════════════════ */

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

vi.mock('@/api/studentApi', () => ({ notifyStudentScopeRefresh: vi.fn() }))
vi.mock('@/api/notificationsApi', () => ({ notifyNotificationsRefresh: vi.fn() }))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
}))

// Animations are not part of the contract under test and would leak motion-only props
// onto DOM nodes; render plain elements with a stable component identity per tag.
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

function studentUser(): User {
  return {
    id: 5,
    name: 'سارة أحمد',
    email: 'sara@example.com',
    role: 'student',
  } as User
}

/** A complete profile — nothing is missing, so the card would submit straight away. */
function profilePayload() {
  return {
    id: 5,
    name: 'سارة أحمد',
    email: 'sara@example.com',
    phone: '+967771234567',
    city: 'صنعاء',
    gender: 'female',
    country: 'YE',
    role: 'student',
  } as unknown as User
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

describe('CourseEnrollmentCard — paid detection matches the fields modal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.value.user = studentUser()
    auth.value.isAuthenticated = true
    auth.value.refreshUser = vi.fn().mockResolvedValue(null)
    mockFetchProfileUser.mockResolvedValue(profilePayload())
    mockUpdateProfile.mockResolvedValue(profilePayload())
    mockSubmitCourseRegistration.mockResolvedValue({ id: 77, status: 'pending' })
  })

  const paidByType = course({ type: 'paid', price: 120 }) // no `is_paid` in the payload

  it('opens the fields modal for a course typed paid without an is_paid flag', async () => {
    const user = userEvent.setup()
    renderCard({ course: paidByType, isFree: false, priceLabel: '€120' })

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('طريقة الدفع ·')).toBeInTheDocument()
    expect(mockSubmitCourseRegistration).not.toHaveBeenCalled()
  })

  it('forwards the chosen payment provider for a course typed paid', async () => {
    const user = userEvent.setup()
    renderCard({ course: paidByType, isFree: false, priceLabel: '€120' })

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /PayPal/ }))
    await user.click(within(dialog).getByRole('button', { name: 'تأكيد الالتحاق' }))

    await waitFor(() => expect(mockSubmitCourseRegistration).toHaveBeenCalledTimes(1))
    expect(mockSubmitCourseRegistration).toHaveBeenCalledWith(
      expect.objectContaining({ course_id: 1, payment_provider: 'paypal' }),
    )
  })

  it('still enrols a free course directly, without the modal', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(await screen.findByRole('button', { name: /الالتحاق بالدورة/ }))

    await waitFor(() => expect(mockSubmitCourseRegistration).toHaveBeenCalledTimes(1))
    expect(mockSubmitCourseRegistration).toHaveBeenCalledWith(
      expect.not.objectContaining({ payment_provider: expect.anything() }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
