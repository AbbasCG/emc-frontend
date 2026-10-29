import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { NestedLayer } from '@/components/ui/NestedLayer'
import { useModalGuard } from '@/components/ui/modalGuard'
import DashboardPageShell from '@/components/ui/DashboardPageShell'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

function Typing() {
  const [v, setV] = useState('')
  useModalGuard('typing', { dirty: v !== '' })

  return <input aria-label="نص" value={v} onChange={(e) => setV(e.target.value)} />
}

function Submitting({ busy }: { busy: boolean }) {
  useModalGuard('submit', { busy })

  return <span>child</span>
}

function Harness({ children, busy, dirty, onClose = () => {} }: { children?: React.ReactNode; busy?: boolean; dirty?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>فتح</button>
      <CenteredModal
        open={open}
        onClose={() => {
          onClose()
          setOpen(false)
        }}
        title="العنوان"
        busy={busy}
        dirty={dirty}
        testId="m"
      >
        {children ?? <button type="button">داخل</button>}
      </CenteredModal>
    </div>
  )
}

const openIt = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'فتح' }))

  return screen.findByRole('dialog', { name: 'العنوان' })
}

describe('CenteredModal', () => {
  it('is a labelled, modal dialog, centered by its wrapper, in a portal on the body', async () => {
    render(<Harness />)
    const dlg = await openIt()

    expect(dlg).toHaveAttribute('aria-modal', 'true')
    expect(dlg.parentElement).toHaveClass('fixed', 'inset-0', 'items-center', 'justify-center')
    expect(dlg.closest('body > *')).not.toBe(screen.getByRole('button', { name: 'فتح' }).parentElement)
    expect(dlg).toHaveAttribute('data-size', 'lg')
  })

  it('locks the page behind it, and releases the lock exactly once on close', async () => {
    document.body.style.overflow = ''
    render(<Harness />)
    await openIt()
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.body.style.overflow).toBe('')
  })

  it('Escape closes; the close button closes; focus goes back to the control that opened it', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const opener = screen.getByRole('button', { name: 'فتح' })
    opener.focus()
    await openIt()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(opener).toHaveFocus()

    await openIt()
    await userEvent.click(screen.getByRole('button', { name: 'إغلاق النافذة' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('keeps focus inside while open (Tab wraps)', async () => {
    render(<Harness />)
    const dlg = await openIt()

    for (let i = 0; i < 6; i++) await userEvent.tab()

    expect(dlg.contains(document.activeElement)).toBe(true)
  })

  it('a press that starts and ends on the backdrop closes it; one that starts inside does not', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const dlg = await openIt()
    const wrapper = dlg.parentElement!

    fireEvent.mouseDown(dlg)
    fireEvent.mouseUp(wrapper)
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.mouseDown(wrapper)
    fireEvent.mouseUp(wrapper)
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('unsaved input: Escape and the backdrop ask first; staying keeps the dialog, confirming closes it', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose}><Typing /></Harness>)
    const dlg = await openIt()
    await userEvent.type(screen.getByLabelText('نص'), 'مسودة')

    fireEvent.mouseDown(dlg.parentElement!)
    fireEvent.mouseUp(dlg.parentElement!)
    expect(onClose).not.toHaveBeenCalled()

    await userEvent.keyboard('{Escape}')
    expect(await screen.findByText('تجاهل التغييرات؟')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'متابعة التحرير' }))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByLabelText('نص')).toHaveValue('مسودة')

    await userEvent.click(screen.getByRole('button', { name: 'إغلاق النافذة' }))
    await userEvent.click(await screen.findByRole('button', { name: 'تجاهل وإغلاق' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('while a child is submitting nothing closes it: not Escape, not the button, not the backdrop', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose}><Submitting busy /></Harness>)
    const dlg = await openIt()

    await userEvent.keyboard('{Escape}')
    fireEvent.mouseDown(dlg.parentElement!)
    fireEvent.mouseUp(dlg.parentElement!)

    expect(screen.getByRole('button', { name: 'إغلاق النافذة' })).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()
    expect(dlg).toHaveAttribute('aria-busy', 'true')
  })

  it('a parent can force busy / dirty too', async () => {
    const onClose = vi.fn()
    render(<Harness busy onClose={onClose} />)
    await openIt()

    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('a nested layer owns Escape and the backdrop while it is open', async () => {
    const onClose = vi.fn()
    function WithNested() {
      const [n, setN] = useState(false)

      return (
        <>
          <button type="button" onClick={() => setN(true)}>افتح داخلية</button>
          {n ? <NestedLayer><div role="dialog" aria-label="داخلية"><button type="button" onClick={() => setN(false)}>أغلق الداخلية</button></div></NestedLayer> : null}
        </>
      )
    }
    render(<Harness onClose={onClose}><WithNested /></Harness>)
    await openIt()
    await userEvent.click(screen.getByRole('button', { name: 'افتح داخلية' }))
    expect(document.querySelector('[data-nested-overlay]')).not.toBeNull()

    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'أغلق الداخلية' }))
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})

describe('the Arabic page eyebrow', () => {
  it('uses the Arabic treatment (no uppercase, no letter-spacing, brand face) for Arabic text', () => {
    render(<DashboardPageShell title="ت" eyebrow="لوحة التحكم التقنية"><span /></DashboardPageShell>)

    expect(screen.getByText('لوحة التحكم التقنية')).toHaveClass('emc-eyebrow', 'emc-eyebrow-ar')
  })

  it('leaves Latin eyebrows exactly as before', () => {
    render(<DashboardPageShell title="T" eyebrow="AI Command Center"><span /></DashboardPageShell>)

    const el = screen.getByText('AI Command Center')
    expect(el).toHaveClass('emc-eyebrow')
    expect(el).not.toHaveClass('emc-eyebrow-ar')
  })
})
