import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useNow } from '@/hooks/useNow'

/**
 * Contract under test (src/hooks/useNow.ts):
 * - captures the time once at mount and stays stable across re-renders with no interval;
 * - refreshes on the given interval when one is provided;
 * - clears its interval on unmount (no timer leak, no post-unmount state update).
 */

afterEach(() => {
  vi.useRealTimers()
})

describe('useNow', () => {
  it('captures a mount-time snapshot that survives re-renders when no interval is given', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-07T10:00:00Z'))

    const { result, rerender } = renderHook(() => useNow())
    const atMount = result.current
    expect(atMount).toBe(Date.now())

    // Time moves on, but without an interval the snapshot must not.
    act(() => {
      vi.setSystemTime(new Date('2026-08-07T10:05:00Z'))
      vi.advanceTimersByTime(5 * 60_000)
    })
    rerender()

    expect(result.current).toBe(atMount)
  })

  it('refreshes on the interval when one is provided', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-07T10:00:00Z'))

    const { result } = renderHook(() => useNow(1000))
    const atMount = result.current

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current).toBeGreaterThan(atMount)
    expect(result.current).toBe(Date.now())
  })

  it('clears the interval on unmount', () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(window, 'clearInterval')

    const { unmount } = renderHook(() => useNow(500))
    unmount()

    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })

  it('starts a fresh timer when the interval changes and leaves none behind', () => {
    vi.useFakeTimers()
    const setSpy = vi.spyOn(window, 'setInterval')
    const clearSpy = vi.spyOn(window, 'clearInterval')

    const { rerender, unmount } = renderHook(({ ms }: { ms?: number }) => useNow(ms), {
      initialProps: { ms: 1000 as number | undefined },
    })
    const afterFirst = setSpy.mock.calls.length

    rerender({ ms: 2000 })
    expect(clearSpy).toHaveBeenCalled()
    expect(setSpy.mock.calls.length).toBeGreaterThan(afterFirst)

    // Dropping the interval tears the timer down and starts no replacement.
    const beforeDrop = setSpy.mock.calls.length
    rerender({ ms: undefined })
    expect(setSpy.mock.calls.length).toBe(beforeDrop)

    unmount()
    setSpy.mockRestore()
    clearSpy.mockRestore()
  })
})
