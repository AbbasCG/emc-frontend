import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InfoTip } from '@/pages/super-admin/users/hub/analytics/ui'

function setViewport(width: number, height = 800) {
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(width)
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(height)
}

function stubTrigger(left: number, top = 100) {
  const rect = { left, right: left + 24, top, bottom: top + 24, width: 24, height: 24, x: left, y: top, toJSON: () => ({}) }
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect as DOMRect)
}

/** The popover's own height (jsdom has no layout). */
function stubTipHeight(height: number) {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(height)
}

afterEach(() => {
  vi.restoreAllMocks()
})

const NAME = 'ما معنى س'
const trigger = () => screen.getByRole('button', { name: NAME })
const tooltip = () => screen.queryByRole('tooltip')
const placement = () => {
  const tip = screen.getByRole('tooltip')
  return { left: parseFloat(tip.style.left), width: parseFloat(tip.style.width), top: parseFloat(tip.style.top) }
}
const renderTip = () => render(<InfoTip label={NAME}>تعريف</InfoTip>)
const focusTrigger = () => act(() => trigger().focus())

describe('InfoTip horizontal placement', () => {
  it('stays inside the viewport for a trigger at the right edge of a 375px screen', () => {
    setViewport(375)
    stubTrigger(340)
    renderTip()

    focusTrigger()

    const { left, width } = placement()
    expect(left).toBeGreaterThanOrEqual(16)
    expect(left + width).toBeLessThanOrEqual(375 - 16)
    expect(width).toBe(256)
  })

  it('stays inside the viewport for a trigger at the left edge', () => {
    setViewport(375)
    stubTrigger(0)
    renderTip()

    focusTrigger()

    expect(placement().left).toBe(16)
  })

  it('narrows itself on a very small screen', () => {
    setViewport(280)
    stubTrigger(120)
    renderTip()

    focusTrigger()

    const { left, width } = placement()
    expect(width).toBe(280 - 32)
    expect(left).toBeGreaterThanOrEqual(16)
    expect(left + width).toBeLessThanOrEqual(280 - 16)
  })
})

describe('InfoTip vertical placement', () => {
  it('sits just under the trigger when there is room', () => {
    setViewport(1024, 800)
    stubTrigger(500, 200)
    stubTipHeight(80)
    renderTip()

    focusTrigger()

    expect(placement().top).toBe(228)
  })

  it('flips above the trigger when it would run past the bottom edge', () => {
    setViewport(1024, 600)
    stubTrigger(500, 560) // trigger bottom 584; 584 + 4 + 120 > 592
    stubTipHeight(120)
    renderTip()

    focusTrigger()

    expect(placement().top).toBe(560 - 4 - 120)
  })

  it('never flips above the top edge of the screen', () => {
    setViewport(1024, 200)
    stubTrigger(500, 60) // does not fit below or above in a 200px window
    stubTipHeight(180)
    renderTip()

    focusTrigger()

    expect(placement().top).toBeGreaterThanOrEqual(8)
  })

  it('never opens for a hidden trigger (zero size, e.g. inside a hidden tab)', () => {
    setViewport(1024)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect)
    renderTip()

    focusTrigger()
    fireEvent.mouseEnter(trigger().parentElement as HTMLElement)

    expect(tooltip()).toBeNull()
  })
})

describe('InfoTip opening and closing', () => {
  it('focus opens it with aria-describedby, and Escape closes it', async () => {
    setViewport(1024)
    stubTrigger(500, 200)
    const user = userEvent.setup()
    renderTip()

    await user.tab()

    const tip = screen.getByRole('tooltip')
    expect(trigger()).toHaveAttribute('aria-describedby', tip.id)
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    expect(tooltip()).toBeNull()
  })

  it('Escape also closes a tip that hover opened (focus is not on the trigger)', () => {
    setViewport(1024)
    stubTrigger(500, 200)
    renderTip()

    fireEvent.mouseEnter(trigger().parentElement as HTMLElement)
    expect(tooltip()).not.toBeNull()
    expect(document.activeElement).not.toBe(trigger())

    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(tooltip()).toBeNull()
  })

  it('a real mouse click (hover, focus, click) keeps the tip open instead of closing the one it just opened', async () => {
    setViewport(1024)
    stubTrigger(500, 200)
    const user = userEvent.setup()
    renderTip()

    await user.click(trigger())

    expect(tooltip()).not.toBeNull()
    await user.click(trigger()) // a second mouse click does not toggle it off: the tip leaves with the mouse or the focus
    expect(tooltip()).not.toBeNull()
  })

  it('on a touch screen the first tap opens it and the second tap closes it', () => {
    setViewport(375)
    stubTrigger(200, 200)
    renderTip()
    const tap = () => {
      fireEvent.pointerDown(trigger(), { pointerType: 'touch' })
      fireEvent.mouseEnter(trigger().parentElement as HTMLElement) // the compatibility mouse events a tap produces
      act(() => trigger().focus())
      fireEvent.click(trigger())
    }

    tap()
    expect(tooltip()).not.toBeNull()

    fireEvent.pointerDown(trigger(), { pointerType: 'touch' })
    fireEvent.click(trigger())
    expect(tooltip()).toBeNull()

    tap()
    expect(tooltip()).not.toBeNull()
  })

  it('mouse-leave closes a hover tip but not one the keyboard focus holds open', () => {
    setViewport(1024)
    stubTrigger(500, 200)
    renderTip()
    const wrapper = trigger().parentElement as HTMLElement

    fireEvent.mouseEnter(wrapper)
    fireEvent.mouseLeave(wrapper)
    expect(tooltip()).toBeNull()

    focusTrigger()
    fireEvent.mouseEnter(wrapper)
    fireEvent.mouseLeave(wrapper)
    expect(tooltip()).not.toBeNull()

    act(() => trigger().blur())
    expect(tooltip()).toBeNull()
  })
})

describe('InfoTip and the page scrolling', () => {
  it('a hover tip closes when a scroll carries its trigger away', () => {
    setViewport(1024)
    stubTrigger(500, 200)
    renderTip()
    fireEvent.mouseEnter(trigger().parentElement as HTMLElement)
    expect(tooltip()).not.toBeNull()

    stubTrigger(500, 120)
    fireEvent.scroll(window)

    expect(tooltip()).toBeNull()
  })

  it('a keyboard-focused tip follows its trigger while the browser scrolls it into view', () => {
    setViewport(1024, 800)
    stubTrigger(500, 700)
    renderTip()
    focusTrigger()
    expect(placement().top).toBe(728)

    stubTrigger(500, 300) // smooth scroll in progress
    fireEvent.scroll(window)
    expect(placement().top).toBe(328)
  })

  it('stays open through a scroll that does not move the trigger (e.g. the browser scrolling it into view on focus)', () => {
    setViewport(1024)
    stubTrigger(500, 200)
    renderTip()
    focusTrigger()

    fireEvent.scroll(window)

    expect(tooltip()).not.toBeNull()
  })

  it('once closed, a later scroll does not reopen it, and a resize closes an open one', () => {
    setViewport(1024)
    stubTrigger(500, 200)
    renderTip()
    focusTrigger()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(tooltip()).toBeNull()

    stubTrigger(500, 120)
    fireEvent.scroll(window)
    expect(tooltip()).toBeNull()

    fireEvent.mouseEnter(trigger().parentElement as HTMLElement)
    expect(tooltip()).not.toBeNull()
    fireEvent(window, new Event('resize'))
    expect(tooltip()).toBeNull()
  })

  it('unmounting while open leaves no listeners behind', () => {
    setViewport(1024)
    stubTrigger(500, 200)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = renderTip()
    focusTrigger()
    expect(tooltip()).not.toBeNull()

    unmount()
    stubTrigger(500, 120)
    fireEvent.scroll(window)
    fireEvent(window, new Event('resize'))
    fireEvent.keyDown(document.body, { key: 'Escape' })

    expect(tooltip()).toBeNull()
    expect(errors).not.toHaveBeenCalled()
  })
})
