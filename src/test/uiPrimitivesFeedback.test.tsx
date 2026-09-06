import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Users } from 'lucide-react'
import AppBadge from '@/components/ui/AppBadge'
import AppAlert from '@/components/ui/AppAlert'
import ApiErrorAlert from '@/components/ui/ApiErrorAlert'
import StatTile from '@/components/ui/StatTile'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import { axeCheck } from './axe'

type RenderableChildren = import('react').ReactNode

// <ConfirmDeleteModal> mounts through AnimatePresence. In jsdom the exit tween never
// settles, so the modal would linger after `open` flips to false and every close
// assertion would be timing-dependent. Swapping the animation layer for plain DOM
// keeps the test about the modal's contract, not framer-motion's scheduler.
vi.mock('framer-motion', async () => {
  const React = await import('react')
  const MOTION_ONLY = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'viewport',
    'whileHover', 'whileTap', 'whileInView', 'whileFocus', 'whileDrag',
    'layout', 'layoutId', 'drag', 'custom', 'onAnimationComplete', 'onAnimationStart',
  ])
  const make = (tag: string) =>
    function MotionStub(props: Record<string, unknown>) {
      const { children, ...rest } = props
      const domProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(rest)) {
        if (!MOTION_ONLY.has(key)) domProps[key] = value
      }
      return React.createElement(tag, domProps, children as RenderableChildren)
    }
  return {
    motion: { div: make('div'), button: make('button'), span: make('span'), header: make('header') },
    AnimatePresence: (props: { children?: unknown }) => props.children as RenderableChildren,
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AppBadge', () => {
  it('renders its label as visible text', () => {
    render(<AppBadge label="نشط" />)
    expect(screen.getByText('نشط')).toBeInTheDocument()
  })

  it('keeps the label readable across every variant and size', () => {
    const variants = ['primary', 'secondary', 'success', 'warning', 'error'] as const
    const sizes = ['sm', 'md'] as const

    for (const variant of variants) {
      for (const size of sizes) {
        const { unmount } = render(<AppBadge label={`${variant}-${size}`} variant={variant} size={size} />)
        expect(screen.getByText(`${variant}-${size}`)).toBeInTheDocument()
        unmount()
      }
    }
  })

  it('renders an empty badge shell for an empty label instead of crashing', () => {
    const { container } = render(<AppBadge label="" />)
    const badge = container.querySelector('span')
    expect(badge).not.toBeNull()
    expect(badge).toBeEmptyDOMElement()
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<AppBadge label="قيد المراجعة" variant="warning" />)
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

describe('AppAlert', () => {
  it('announces errors assertively via role="alert"', () => {
    render(<AppAlert type="error" title="فشل الحفظ" message="حاول مرة أخرى" />)

    const alert = screen.getByRole('alert')
    expect(within(alert).getByRole('heading', { name: 'فشل الحفظ' })).toBeInTheDocument()
    expect(alert).toHaveTextContent('حاول مرة أخرى')
  })

  it('uses the polite role="status" for success and info', () => {
    const { rerender } = render(<AppAlert type="success" title="تم الحفظ" />)
    expect(screen.getByRole('status')).toHaveTextContent('تم الحفظ')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    rerender(<AppAlert type="info" title="تنبيه" />)
    expect(screen.getByRole('status')).toHaveTextContent('تنبيه')
  })

  it('renders the title alone when no message is given', () => {
    render(<AppAlert type="info" title="بدون تفاصيل" />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('بدون تفاصيل')
    expect(within(status).queryAllByText(/./, { selector: 'p' })).toHaveLength(0)
  })

  it('accepts a rich ReactNode message', () => {
    render(
      <AppAlert type="error" title="خطأ" message={<a href="/support">تواصل مع الدعم</a>} />,
    )
    expect(screen.getByRole('link', { name: 'تواصل مع الدعم' })).toBeInTheDocument()
  })

  it('is not dismissible by default', () => {
    render(<AppAlert type="info" title="تنبيه" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('dismissing hides the alert and notifies the caller exactly once', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<AppAlert type="success" title="تم الحفظ" dismissible onDismiss={onDismiss} />)

    await user.click(screen.getByRole('button', { name: 'إغلاق التنبيه' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('تم الحفظ')).not.toBeInTheDocument()
  })

  it('dismisses cleanly when no onDismiss handler is supplied', async () => {
    const user = userEvent.setup()
    render(<AppAlert type="error" title="خطأ" dismissible />)

    await user.click(screen.getByRole('button', { name: 'إغلاق التنبيه' }))
    expect(screen.queryByText('خطأ')).not.toBeInTheDocument()
  })

  it('stays dismissed when the parent re-renders it with the same props', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<AppAlert type="info" title="رسالة" dismissible />)

    await user.click(screen.getByRole('button', { name: 'إغلاق التنبيه' }))
    rerender(<AppAlert type="info" title="رسالة" dismissible />)
    expect(screen.queryByText('رسالة')).not.toBeInTheDocument()
  })

  it('has no accessibility violations (each type, dismissible)', async () => {
    for (const type of ['error', 'success', 'info'] as const) {
      const { container, unmount } = render(
        <AppAlert type={type} title={`عنوان-${type}`} message="تفاصيل" dismissible onDismiss={() => {}} />,
      )
      expect(await axeCheck(container)).toHaveNoViolations()
      unmount()
    }
  })
})

/** axios.isAxiosError only checks the `isAxiosError` flag, so a literal is enough. */
function axiosErrorLike(status: number, data: unknown = {}) {
  return { isAxiosError: true, config: { url: '/api/x' }, response: { status, data } }
}

describe('ApiErrorAlert', () => {
  it('renders an assertive alert with the default Arabic title', () => {
    render(<ApiErrorAlert error={new Error('انقطع الاتصال')} />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
    expect(alert).toHaveTextContent('تعذّر إكمال الطلب')
    expect(alert).toHaveTextContent('انقطع الاتصال')
  })

  it('lets the caller override the title', () => {
    render(<ApiErrorAlert error={new Error('boom')} title="تعذّر تحميل الدورات" />)
    expect(screen.getByRole('alert')).toHaveTextContent('تعذّر تحميل الدورات')
  })

  it('falls back to the generic Arabic message for a non-Error value', () => {
    render(<ApiErrorAlert error={null} />)
    expect(screen.getByRole('alert')).toHaveTextContent('حدث خطأ غير متوقع. حاول مرة أخرى.')
  })

  it('maps an HTTP status with no body message to its Arabic wording', () => {
    render(<ApiErrorAlert error={axiosErrorLike(403)} />)
    expect(screen.getByRole('alert')).toHaveTextContent('لا تملك صلاحية الوصول.')
  })

  it('prefers the first field-level validation message on 422', () => {
    render(
      <ApiErrorAlert
        error={axiosErrorLike(422, { message: 'The given data was invalid.', errors: { email: ['البريد مستخدم'] } })}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('البريد مستخدم')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<ApiErrorAlert error={axiosErrorLike(500)} />)
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

describe('StatTile', () => {
  it('renders the label and the value', () => {
    render(<StatTile label="المتدربون" value={1280} />)
    expect(screen.getByText('المتدربون')).toBeInTheDocument()
    expect(screen.getByText('1280')).toBeInTheDocument()
  })

  it('renders an arbitrary ReactNode as the value', () => {
    render(<StatTile label="الإيراد" value={<span>12,500 ر.س</span>} />)
    expect(screen.getByText('12,500 ر.س')).toBeInTheDocument()
  })

  it('omits caption, delta, icon and footer when they are not provided', () => {
    const { container } = render(<StatTile label="المتدربون" value={10} />)
    expect(container.querySelectorAll('svg')).toHaveLength(0)
    expect(container.textContent).toBe('المتدربون10')
  })

  it('renders caption and footer content when provided', () => {
    render(
      <StatTile
        label="المتدربون"
        value={10}
        caption="خلال ٣٠ يومًا"
        footer={<a href="/reports">عرض التقرير</a>}
      />,
    )
    expect(screen.getByText('خلال ٣٠ يومًا')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'عرض التقرير' })).toBeInTheDocument()
  })

  it('shows a directional glyph next to the delta for up and down, but not for flat', () => {
    const up = render(<StatTile label="النمو" value={5} delta="+12.4%" trend="up" />)
    expect(screen.getByText('+12.4%').querySelectorAll('svg')).toHaveLength(1)
    up.unmount()

    const down = render(<StatTile label="النمو" value={5} delta="-3.2%" trend="down" />)
    expect(screen.getByText('-3.2%').querySelectorAll('svg')).toHaveLength(1)
    down.unmount()

    render(<StatTile label="النمو" value={5} delta="0.0%" trend="flat" />)
    expect(screen.getByText('0.0%').querySelectorAll('svg')).toHaveLength(0)
  })

  it('renders the icon cap hidden from assistive tech', () => {
    const { container } = render(<StatTile label="المتدربون" value={10} icon={Users} tone="success" />)
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(1)
    expect(screen.getByText('المتدربون')).toBeInTheDocument()
  })

  it('has no accessibility violations (full tile)', async () => {
    const { container } = render(
      <StatTile
        label="المتدربون"
        value={1280}
        icon={Users}
        tone="brand"
        caption="خلال ٣٠ يومًا"
        delta="+12.4%"
        trend="up"
        footer={<a href="/reports">عرض التقرير</a>}
      />,
    )
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

function modalProps(overrides: Partial<Parameters<typeof ConfirmDeleteModal>[0]> = {}) {
  return {
    open: true,
    title: 'حذف الدورة',
    description: 'لا يمكن التراجع عن هذا الإجراء.',
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  }
}

describe('ConfirmDeleteModal', () => {
  it('renders nothing while closed', () => {
    const { container } = render(<ConfirmDeleteModal {...modalProps({ open: false })} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('حذف الدورة')).not.toBeInTheDocument()
  })

  it('shows the title, description and both actions when open', () => {
    render(<ConfirmDeleteModal {...modalProps({ itemLabel: 'اللغة الإنجليزية — المستوى ٣' })} />)

    expect(screen.getByRole('heading', { name: 'حذف الدورة' })).toBeInTheDocument()
    expect(screen.getByText('لا يمكن التراجع عن هذا الإجراء.')).toBeInTheDocument()
    expect(screen.getByText('اللغة الإنجليزية — المستوى ٣')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تأكيد الحذف' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'إلغاء' })).toBeEnabled()
  })

  it('omits the item label line when none is supplied', () => {
    render(<ConfirmDeleteModal {...modalProps()} />)
    expect(screen.getByRole('heading', { name: 'حذف الدورة' })).toBeInTheDocument()
    expect(screen.queryByText('اللغة الإنجليزية — المستوى ٣')).not.toBeInTheDocument()
  })

  it('confirming calls onConfirm and leaves closing to the caller', async () => {
    const user = userEvent.setup()
    const props = modalProps()
    render(<ConfirmDeleteModal {...props} />)

    await user.click(screen.getByRole('button', { name: 'تأكيد الحذف' }))
    expect(props.onConfirm).toHaveBeenCalledTimes(1)
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('awaits an async onConfirm without throwing', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<ConfirmDeleteModal {...modalProps({ onConfirm })} />)

    await user.click(screen.getByRole('button', { name: 'تأكيد الحذف' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('cancelling calls onClose without confirming', async () => {
    const user = userEvent.setup()
    const props = modalProps()
    render(<ConfirmDeleteModal {...props} />)

    await user.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
    expect(props.onConfirm).not.toHaveBeenCalled()
  })

  it('clicking the labelled backdrop closes the modal', async () => {
    const user = userEvent.setup()
    const props = modalProps()
    render(<ConfirmDeleteModal {...props} />)

    await user.click(screen.getByRole('button', { name: 'إغلاق' }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('while busy it shows progress copy, disables both actions and ignores the backdrop', async () => {
    const user = userEvent.setup()
    const props = modalProps({ busy: true })
    render(<ConfirmDeleteModal {...props} />)

    const confirm = screen.getByRole('button', { name: 'جاري الحذف...' })
    expect(confirm).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'تأكيد الحذف' })).not.toBeInTheDocument()
    const cancel = screen.getByRole('button', { name: 'إلغاء' })
    expect(cancel).toBeDisabled()

    await user.click(confirm)
    await user.click(cancel)
    await user.click(screen.getByRole('button', { name: 'إغلاق' }))
    expect(props.onConfirm).not.toHaveBeenCalled()
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('the confirm action is reachable and activatable by keyboard alone', async () => {
    const user = userEvent.setup()
    const props = modalProps()
    render(<ConfirmDeleteModal {...props} />)

    const confirm = screen.getByRole('button', { name: 'تأكيد الحذف' })
    for (let i = 0; i < 6 && document.activeElement !== confirm; i += 1) {
      await user.tab()
    }
    expect(document.activeElement).toBe(confirm)

    await user.keyboard('{Enter}')
    expect(props.onConfirm).toHaveBeenCalledTimes(1)
  })

  it('reopening after a close renders the dialog again', () => {
    const props = modalProps({ open: false })
    const { rerender } = render(<ConfirmDeleteModal {...props} />)
    expect(screen.queryByRole('heading', { name: 'حذف الدورة' })).not.toBeInTheDocument()

    rerender(<ConfirmDeleteModal {...props} open />)
    expect(screen.getByRole('heading', { name: 'حذف الدورة' })).toBeInTheDocument()

    rerender(<ConfirmDeleteModal {...props} open={false} />)
    expect(screen.queryByRole('heading', { name: 'حذف الدورة' })).not.toBeInTheDocument()
  })

  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <ConfirmDeleteModal {...modalProps({ itemLabel: 'دورة تجريبية' })} />,
    )
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})
