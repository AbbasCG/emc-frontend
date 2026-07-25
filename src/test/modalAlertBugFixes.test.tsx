import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppAlert from '@/components/ui/AppAlert'
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import { axeCheck } from './axe'

type RenderableChildren = import('react').ReactNode

// <ConfirmDeleteModal> mounts through AnimatePresence. In jsdom the exit tween never
// settles, so the modal would linger after `open` flips to false and every close /
// focus-restore assertion would be timing-dependent. Swapping the animation layer for
// plain DOM keeps these tests about the modal's contract.
vi.mock('framer-motion', async () => {
  const React = await import('react')
  const MOTION_ONLY = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'viewport',
    'whileHover', 'whileTap', 'whileInView', 'whileFocus', 'whileDrag',
    'layout', 'layoutId', 'drag', 'custom', 'onAnimationComplete', 'onAnimationStart',
  ])
  // forwardRef so the modal's panel ref — which the focus trap depends on — survives the stub.
  const make = (tag: string) =>
    React.forwardRef<HTMLElement, Record<string, unknown>>(function MotionStub(props, ref) {
      const { children, ...rest } = props
      const domProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(rest)) {
        if (!MOTION_ONLY.has(key)) domProps[key] = value
      }
      if (ref) domProps.ref = ref
      return React.createElement(tag, domProps, children as RenderableChildren)
    })
  return {
    motion: { div: make('div'), button: make('button'), span: make('span'), header: make('header') },
    AnimatePresence: (props: { children?: unknown }) => props.children as RenderableChildren,
  }
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

/** Mirrors the real caller: a trigger button owns the open state. */
function DeleteHarness({ busy = false }: { busy?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        احذف الدورة
      </button>
      <ConfirmDeleteModal
        open={open}
        busy={busy}
        title="حذف الدورة"
        description="لا يمكن التراجع عن هذا الإجراء."
        onClose={() => setOpen(false)}
        onConfirm={() => {}}
      />
    </div>
  )
}

describe('ConfirmDeleteModal — dialog semantics', () => {
  it('exposes a modal dialog named by its heading', () => {
    render(<ConfirmDeleteModal {...modalProps()} />)

    const dialog = screen.getByRole('dialog', { name: 'حذف الدورة' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy ?? '')).toBe(
      screen.getByRole('heading', { name: 'حذف الدورة' }),
    )
  })

  it('describes the dialog with the consequence text', () => {
    render(<ConfirmDeleteModal {...modalProps()} />)

    const describedBy = screen.getByRole('dialog').getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent(
      'لا يمكن التراجع عن هذا الإجراء.',
    )
  })

  it('keeps the backdrop and the close button under distinct names', () => {
    render(<ConfirmDeleteModal {...modalProps()} />)

    expect(screen.getByRole('button', { name: 'إغلاق' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إغلاق النافذة' })).toBeInTheDocument()
  })

  it('moves focus into the dialog when it opens', () => {
    render(<ConfirmDeleteModal {...modalProps()} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'إغلاق النافذة' }))
  })

  it('focuses the dialog itself when every control is disabled by a running request', () => {
    render(<ConfirmDeleteModal {...modalProps({ busy: true })} />)
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('returns focus to the element that opened it', async () => {
    const user = userEvent.setup()
    render(<DeleteHarness />)

    const trigger = screen.getByRole('button', { name: 'احذف الدورة' })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(document.activeElement).not.toBe(trigger)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const props = modalProps()
    render(<ConfirmDeleteModal {...props} />)

    await user.keyboard('{Escape}')
    expect(props.onClose).toHaveBeenCalledTimes(1)
    expect(props.onConfirm).not.toHaveBeenCalled()
  })

  it('ignores Escape while a delete request is in flight', async () => {
    const user = userEvent.setup()
    const props = modalProps({ busy: true })
    render(<ConfirmDeleteModal {...props} />)

    await user.keyboard('{Escape}')
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('cycles Tab back to the first control instead of leaking behind the overlay', async () => {
    const user = userEvent.setup()
    render(<ConfirmDeleteModal {...modalProps()} />)

    const close = screen.getByRole('button', { name: 'إغلاق النافذة' })
    expect(document.activeElement).toBe(close)

    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'تأكيد الحذف' }))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'إلغاء' }))
    await user.tab()
    expect(document.activeElement).toBe(close)
  })

  it('cycles Shift+Tab from the first control to the last one', async () => {
    const user = userEvent.setup()
    render(<ConfirmDeleteModal {...modalProps()} />)

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'إغلاق النافذة' }))

    await user.tab({ shift: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'إلغاء' }))
  })

  it('has no accessibility violations as a labelled dialog', async () => {
    const { container } = render(<ConfirmDeleteModal {...modalProps({ itemLabel: 'دورة تجريبية' })} />)
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

describe('AppAlert — dismissed state follows the alert identity', () => {
  it('shows a new server error after the previous one was dismissed', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <AppAlert type="error" title="كلمة المرور غير صحيحة" dismissible />,
    )

    await user.click(screen.getByRole('button', { name: 'إغلاق التنبيه' }))
    expect(screen.queryByText('كلمة المرور غير صحيحة')).not.toBeInTheDocument()

    rerender(<AppAlert type="error" title="الحساب موقوف مؤقتاً" dismissible />)
    expect(screen.getByRole('alert')).toHaveTextContent('الحساب موقوف مؤقتاً')
  })

  it('reappears when only the message text changes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <AppAlert type="error" title="فشل الحفظ" message="حاول مرة أخرى" dismissible />,
    )

    await user.click(screen.getByRole('button', { name: 'إغلاق التنبيه' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    rerender(<AppAlert type="error" title="فشل الحفظ" message="انقطع الاتصال بالخادم" dismissible />)
    expect(screen.getByRole('alert')).toHaveTextContent('انقطع الاتصال بالخادم')
  })

  it('reappears when the alert switches kind', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<AppAlert type="success" title="تمت العملية" dismissible />)

    await user.click(screen.getByRole('button', { name: 'إغلاق التنبيه' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    rerender(<AppAlert type="error" title="تمت العملية" dismissible />)
    expect(screen.getByRole('alert')).toHaveTextContent('تمت العملية')
  })

  it('can be dismissed again after it comes back', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<AppAlert type="error" title="خطأ أول" dismissible />)

    await user.click(screen.getByRole('button', { name: 'إغلاق التنبيه' }))
    rerender(<AppAlert type="error" title="خطأ ثانٍ" dismissible />)
    await user.click(screen.getByRole('button', { name: 'إغلاق التنبيه' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('stays dismissed while the same alert keeps re-rendering', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <AppAlert type="info" title="تنبيه" message="تفاصيل" dismissible />,
    )

    await user.click(screen.getByRole('button', { name: 'إغلاق التنبيه' }))
    rerender(<AppAlert type="info" title="تنبيه" message="تفاصيل" dismissible />)
    rerender(<AppAlert type="info" title="تنبيه" message="تفاصيل" dismissible />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('stays dismissed when a rich message re-renders as a fresh node', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <AppAlert type="error" title="خطأ" message={<a href="/support">تواصل مع الدعم</a>} dismissible />,
    )

    await user.click(screen.getByRole('button', { name: 'إغلاق التنبيه' }))
    rerender(
      <AppAlert type="error" title="خطأ" message={<a href="/support">تواصل مع الدعم</a>} dismissible />,
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('has no accessibility violations after the identity reset', async () => {
    const user = userEvent.setup()
    const { container, rerender } = render(
      <AppAlert type="error" title="خطأ أول" message="تفاصيل" dismissible />,
    )

    await user.click(screen.getByRole('button', { name: 'إغلاق التنبيه' }))
    rerender(<AppAlert type="error" title="خطأ ثانٍ" message="تفاصيل" dismissible />)

    expect(await axeCheck(container)).toHaveNoViolations()
  })
})
