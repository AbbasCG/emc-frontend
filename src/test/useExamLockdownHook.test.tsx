import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { useExamLockdown } from '@/hooks/useExamLockdown'
import { logExamViolation } from '@/api/placementApi'
import toast from '@/lib/toast'

/**
 * Contract under test (src/hooks/useExamLockdown.ts):
 * - only arms while `active`;
 * - blocks copy/cut/paste/right-click/selection/drag and the fixed shortcut set,
 *   warning the student and logging each violation server-side;
 * - counts tab switches and window blur;
 * - enforces fullscreen, counting only real exits (never the not-yet-entered state)
 *   and firing onMaxExitsReached exactly once at the limit;
 * - logs each violation exactly once, including under StrictMode double-invocation.
 */

vi.mock('@/api/placementApi', () => ({
  logExamViolation: vi.fn(() => Promise.resolve()),
}))
vi.mock('@/lib/toast', () => ({
  default: { warning: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const mockedLog = vi.mocked(logExamViolation)
const mockedToast = vi.mocked(toast)

/** jsdom implements neither the fullscreen element nor the request; model both. */
function installFullscreen() {
  let current: Element | null = null
  const setCurrent = (el: Element | null) => {
    current = el
  }
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => current,
  })
  Element.prototype.requestFullscreen = vi.fn(function (this: Element) {
    setCurrent(this)
    return Promise.resolve()
  })
  return {
    /** Simulate the browser entering/leaving fullscreen and firing the event. */
    set(el: Element | null) {
      current = el
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'))
      })
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function fireKey(init: KeyboardEventInit): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })
  act(() => {
    document.dispatchEvent(e)
  })
  return e
}

function fireClipboard(type: 'copy' | 'cut' | 'paste'): Event {
  const e = new Event(type, { bubbles: true, cancelable: true })
  act(() => {
    document.dispatchEvent(e)
  })
  return e
}

describe('useExamLockdown — inactive', () => {
  it('arms nothing while inactive', () => {
    installFullscreen()
    renderHook(() => useExamLockdown({ active: false, courseId: 7 }))

    const copy = fireClipboard('copy')
    expect(copy.defaultPrevented).toBe(false)
    expect(mockedLog).not.toHaveBeenCalled()
    expect(Element.prototype.requestFullscreen).not.toHaveBeenCalled()
  })
})

describe('useExamLockdown — clipboard, context menu and selection', () => {
  it.each([
    ['copy', 'copy'],
    ['cut', 'cut'],
    ['paste', 'paste'],
  ] as const)('blocks %s, warns the student and logs it', (evt, violation) => {
    installFullscreen()
    const { result } = renderHook(() => useExamLockdown({ active: true, courseId: 7 }))

    const e = fireClipboard(evt)

    expect(e.defaultPrevented).toBe(true)
    expect(mockedToast.warning).toHaveBeenCalled()
    expect(mockedLog).toHaveBeenCalledWith(7, violation, undefined)
    expect(result.current.violationCount).toBe(1)
  })

  it('blocks the context menu', () => {
    installFullscreen()
    renderHook(() => useExamLockdown({ active: true, courseId: 7 }))

    const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    act(() => {
      document.dispatchEvent(e)
    })

    expect(e.defaultPrevented).toBe(true)
    expect(mockedLog).toHaveBeenCalledWith(7, 'right_click', undefined)
  })

  it.each(['selectstart', 'dragstart'])('blocks %s without logging a violation', (type) => {
    installFullscreen()
    renderHook(() => useExamLockdown({ active: true, courseId: 7 }))

    const e = new Event(type, { bubbles: true, cancelable: true })
    act(() => {
      document.dispatchEvent(e)
    })

    expect(e.defaultPrevented).toBe(true)
    expect(mockedLog).not.toHaveBeenCalled()
  })

  it('still counts violations locally when there is no courseId to log against', () => {
    installFullscreen()
    const { result } = renderHook(() => useExamLockdown({ active: true, courseId: undefined }))

    fireClipboard('copy')

    expect(result.current.violationCount).toBe(1)
    expect(mockedLog).not.toHaveBeenCalled()
  })

  it('disarms every listener on unmount', () => {
    installFullscreen()
    const { unmount } = renderHook(() => useExamLockdown({ active: true, courseId: 7 }))
    unmount()

    const e = fireClipboard('copy')
    expect(e.defaultPrevented).toBe(false)
    expect(mockedLog).not.toHaveBeenCalled()
  })
})

describe('useExamLockdown — keyboard shortcuts', () => {
  it.each([
    ['Ctrl+C', { key: 'c', ctrlKey: true }],
    ['Ctrl+V', { key: 'v', ctrlKey: true }],
    ['Ctrl+P', { key: 'p', ctrlKey: true }],
    ['Ctrl+Shift+I', { key: 'i', ctrlKey: true, shiftKey: true }],
  ] as const)('blocks %s and logs it with its label', (label, init) => {
    installFullscreen()
    renderHook(() => useExamLockdown({ active: true, courseId: 7 }))

    const e = fireKey(init)

    expect(e.defaultPrevented).toBe(true)
    expect(mockedLog).toHaveBeenCalledWith(7, 'keyboard_shortcut', { key: label })
  })

  it('treats Cmd as Ctrl so the shortcuts hold on macOS', () => {
    installFullscreen()
    renderHook(() => useExamLockdown({ active: true, courseId: 7 }))

    const e = fireKey({ key: 'c', metaKey: true })

    expect(e.defaultPrevented).toBe(true)
    expect(mockedLog).toHaveBeenCalledWith(7, 'keyboard_shortcut', { key: 'Ctrl+C' })
  })

  it('blocks F12 with no modifier', () => {
    installFullscreen()
    renderHook(() => useExamLockdown({ active: true, courseId: 7 }))

    const e = fireKey({ key: 'F12' })

    expect(e.defaultPrevented).toBe(true)
    expect(mockedLog).toHaveBeenCalledWith(7, 'keyboard_shortcut', { key: 'F12' })
  })

  it('lets ordinary typing through — answering the exam must still work', () => {
    installFullscreen()
    renderHook(() => useExamLockdown({ active: true, courseId: 7 }))

    for (const init of [{ key: 'a' }, { key: 'Tab' }, { key: 'Enter' }, { key: 'c' }]) {
      const e = fireKey(init)
      expect(e.defaultPrevented).toBe(false)
    }
    expect(mockedLog).not.toHaveBeenCalled()
  })

  it('does not fire a shortcut on the right key with the wrong modifiers', () => {
    installFullscreen()
    renderHook(() => useExamLockdown({ active: true, courseId: 7 }))

    // Ctrl+Shift+V is not in the blocked set (Ctrl+V is).
    const e = fireKey({ key: 'v', ctrlKey: true, shiftKey: true })

    expect(e.defaultPrevented).toBe(false)
    expect(mockedLog).not.toHaveBeenCalled()
  })
})

describe('useExamLockdown — tab switch and blur', () => {
  it('logs a tab switch only when the document actually becomes hidden', () => {
    installFullscreen()
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    const { result } = renderHook(() => useExamLockdown({ active: true, courseId: 7 }))

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(mockedLog).toHaveBeenCalledWith(7, 'tab_switch', undefined)
    expect(result.current.violationCount).toBe(1)

    hidden.mockReturnValue(false)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    // Coming back into view is not itself a violation.
    expect(mockedLog).toHaveBeenCalledTimes(1)
  })

  it('logs window blur', () => {
    installFullscreen()
    renderHook(() => useExamLockdown({ active: true, courseId: 7 }))

    act(() => {
      window.dispatchEvent(new Event('blur'))
    })

    expect(mockedLog).toHaveBeenCalledWith(7, 'window_blur', undefined)
  })
})

describe('useExamLockdown — fullscreen enforcement', () => {
  it('requests fullscreen on activation and reports the state', () => {
    const fs = installFullscreen()
    const { result } = renderHook(() => useExamLockdown({ active: true, courseId: 7 }))

    expect(Element.prototype.requestFullscreen).toHaveBeenCalled()

    fs.set(document.documentElement)
    expect(result.current.isFullscreen).toBe(true)
  })

  it('survives a browser that refuses the fullscreen request', async () => {
    installFullscreen()
    Element.prototype.requestFullscreen = vi.fn(() => Promise.reject(new Error('denied')))

    const { result } = renderHook(() => useExamLockdown({ active: true, courseId: 7 }))
    await act(async () => {
      await Promise.resolve()
    })

    // Exam proceeds, just unlocked — no crash, no violation invented.
    expect(result.current.isFullscreen).toBe(false)
    expect(mockedLog).not.toHaveBeenCalled()
  })

  it('ignores a fullscreenchange that fires before fullscreen was ever entered', () => {
    const fs = installFullscreen()
    const { result } = renderHook(() => useExamLockdown({ active: true, courseId: 7 }))

    fs.set(null)

    expect(result.current.fullscreenExitCount).toBe(0)
    expect(mockedLog).not.toHaveBeenCalled()
  })

  it('counts a real exit once and logs it once', () => {
    const fs = installFullscreen()
    const { result } = renderHook(() => useExamLockdown({ active: true, courseId: 7 }))

    fs.set(document.documentElement)
    fs.set(null)

    expect(result.current.fullscreenExitCount).toBe(1)
    expect(result.current.violationCount).toBe(1)
    expect(mockedLog).toHaveBeenCalledTimes(1)
    expect(mockedLog).toHaveBeenCalledWith(7, 'fullscreen_exit', { exit_count: 1 })
  })

  it('fires onMaxExitsReached exactly once at the limit', () => {
    const fs = installFullscreen()
    const onMaxExitsReached = vi.fn()
    const { result } = renderHook(() =>
      useExamLockdown({ active: true, courseId: 7, maxFullscreenExits: 2, onMaxExitsReached }),
    )

    fs.set(document.documentElement)
    fs.set(null)
    expect(onMaxExitsReached).not.toHaveBeenCalled()

    fs.set(document.documentElement)
    fs.set(null)
    expect(onMaxExitsReached).toHaveBeenCalledTimes(1)

    fs.set(document.documentElement)
    fs.set(null)
    expect(result.current.fullscreenExitCount).toBe(3)
    expect(onMaxExitsReached).toHaveBeenCalledTimes(1)
  })

  it('fullscreens the provided container rather than the document element', () => {
    installFullscreen()
    const el = document.createElement('div')
    document.body.appendChild(el)
    const containerRef = { current: el } as React.RefObject<HTMLElement>

    renderHook(() => useExamLockdown({ active: true, courseId: 7, containerRef }))

    expect(Element.prototype.requestFullscreen).toHaveBeenCalled()
    expect(document.fullscreenElement).toBe(el)
    el.remove()
  })

  it('requestFullscreen is a no-op when already fullscreen', async () => {
    const fs = installFullscreen()
    const { result } = renderHook(() => useExamLockdown({ active: true, courseId: 7 }))
    fs.set(document.documentElement)

    const callsBefore = vi.mocked(Element.prototype.requestFullscreen).mock.calls.length
    await act(async () => {
      await result.current.requestFullscreen()
    })

    expect(vi.mocked(Element.prototype.requestFullscreen).mock.calls.length).toBe(callsBefore)
  })
})

describe('useExamLockdown — StrictMode', () => {
  it('logs one violation per fullscreen exit even under double-invoked updaters', () => {
    const fs = installFullscreen()
    const { result } = renderHook(
      () => useExamLockdown({ active: true, courseId: 7, maxFullscreenExits: 3 }),
      { wrapper: StrictMode },
    )

    fs.set(document.documentElement)
    fs.set(null)

    // React re-invokes state updaters in StrictMode. A violation report living inside
    // the updater would double-log the exit to the server and double-count it.
    expect(mockedLog).toHaveBeenCalledTimes(1)
    expect(mockedLog).toHaveBeenCalledWith(7, 'fullscreen_exit', { exit_count: 1 })
    expect(mockedToast.warning).toHaveBeenCalledTimes(1)
    expect(result.current.fullscreenExitCount).toBe(1)
    expect(result.current.violationCount).toBe(1)
  })
})
