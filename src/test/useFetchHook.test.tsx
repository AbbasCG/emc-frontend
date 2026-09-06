import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useFetch } from '@/hooks/useFetch'
import { axeCheck } from './axe'

/**
 * Contract under test (src/hooks/useFetch.ts):
 * - aborts the in-flight request on dep change and on unmount;
 * - ignores stale resolutions — only the latest request may commit state;
 * - never updates state after unmount;
 * - clears `data` when a request fails;
 * - returns to the loading state during render when `deps` change.
 */

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** Drains the microtask queue inside `act` so hook continuations commit deterministically. */
async function flush(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
  })
}

describe('useFetch — happy path', () => {
  it('starts in the loading state with no data and no error', () => {
    const pending = deferred<string>()
    const { result } = renderHook(() => useFetch(() => pending.promise, []))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('exposes the resolved payload and leaves the loading state exactly once', async () => {
    const pending = deferred<string[]>()
    const fn = vi.fn(() => pending.promise)
    const { result } = renderHook(() => useFetch(fn, []))

    pending.resolve(['الدورة الأولى', 'الدورة الثانية'])
    await flush()

    expect(result.current.data).toEqual(['الدورة الأولى', 'الدورة الثانية'])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('treats an empty payload as a real result, not as "no data yet"', async () => {
    const pending = deferred<string[]>()
    const { result } = renderHook(() => useFetch(() => pending.promise, []))

    pending.resolve([])
    await flush()

    expect(result.current.data).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('finishes loading even when the payload itself is null', async () => {
    const pending = deferred<string | null>()
    const { result } = renderHook(() => useFetch(() => pending.promise, []))

    pending.resolve(null)
    await flush()

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBeNull()
  })

  it('hands the request an AbortSignal that is live while the request runs', () => {
    const pending = deferred<string>()
    const signals: AbortSignal[] = []
    renderHook(() =>
      useFetch((signal) => {
        signals.push(signal)
        return pending.promise
      }, []),
    )

    expect(signals).toHaveLength(1)
    expect(signals[0]).toBeInstanceOf(AbortSignal)
    expect(signals[0]!.aborted).toBe(false)
  })
})

describe('useFetch — failure path', () => {
  it('surfaces the rejection reason and clears data', async () => {
    const pending = deferred<string>()
    const { result } = renderHook(() => useFetch(() => pending.promise, []))

    pending.reject(new Error('boom'))
    await flush()

    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toBe('boom')
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('passes through a non-Error rejection reason untouched', async () => {
    const pending = deferred<string>()
    const { result } = renderHook(() => useFetch(() => pending.promise, []))

    pending.reject('تعذر الاتصال بالخادم')
    await flush()

    expect(result.current.error).toBe('تعذر الاتصال بالخادم')
    expect(result.current.data).toBeNull()
  })

  it('drops previously loaded data when a later attempt fails', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const fn = vi.fn<() => Promise<string>>()
    fn.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const { result } = renderHook(() => useFetch(fn, []))
    first.resolve('نتيجة')
    await flush()
    expect(result.current.data).toBe('نتيجة')

    let run!: Promise<void>
    await act(async () => {
      run = result.current.refetch()
    })
    second.reject(new Error('500'))
    await act(async () => {
      await run
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.loading).toBe(false)
  })

  it('clears a previous error once a later attempt succeeds', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const fn = vi.fn<() => Promise<string>>()
    fn.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const { result } = renderHook(() => useFetch(fn, []))
    first.reject(new Error('boom'))
    await flush()
    expect(result.current.error).toBeInstanceOf(Error)

    let run!: Promise<void>
    await act(async () => {
      run = result.current.refetch()
    })
    expect(result.current.error).toBeNull()

    second.resolve('نجح')
    await act(async () => {
      await run
    })

    expect(result.current.data).toBe('نجح')
    expect(result.current.error).toBeNull()
  })
})

describe('useFetch — dep changes', () => {
  it('re-runs the loader when a dep changes and returns to the loading state', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const fn = vi.fn((_signal: AbortSignal, id: number) => (id === 1 ? first.promise : second.promise))

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useFetch((signal) => fn(signal, id), [id]),
      { initialProps: { id: 1 } },
    )

    first.resolve('الأولى')
    await flush()
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBe('الأولى')

    rerender({ id: 2 })

    // Back to loading in the same commit — consumers never paint a "ready" frame for the old deps.
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
    expect(fn).toHaveBeenCalledTimes(2)

    second.resolve('الثانية')
    await flush()
    expect(result.current.data).toBe('الثانية')
    expect(result.current.loading).toBe(false)
  })

  it('keeps the last successful payload visible while the new deps load', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const fn = vi.fn((id: number) => (id === 1 ? first.promise : second.promise))

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useFetch(() => fn(id), [id]),
      { initialProps: { id: 1 } },
    )
    first.resolve('الأولى')
    await flush()

    rerender({ id: 2 })

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBe('الأولى')
  })

  it('does not re-run when a rerender leaves the deps equal', async () => {
    const pending = deferred<string>()
    const fn = vi.fn(() => pending.promise)
    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useFetch(fn, [id]),
      { initialProps: { id: 7 } },
    )
    pending.resolve('ثابت')
    await flush()

    rerender({ id: 7 })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBe('ثابت')
  })

  it('aborts the in-flight request when the deps change', () => {
    const signals: AbortSignal[] = []
    const never = deferred<string>()
    const { rerender } = renderHook(
      ({ id }: { id: number }) =>
        useFetch((signal) => {
          signals.push(signal)
          return never.promise
        }, [id]),
      { initialProps: { id: 1 } },
    )

    expect(signals[0]!.aborted).toBe(false)
    rerender({ id: 2 })

    expect(signals).toHaveLength(2)
    expect(signals[0]!.aborted).toBe(true)
    expect(signals[1]!.aborted).toBe(false)
  })

  it('clears a stale error as soon as the deps change, before the new request lands', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const fn = (id: number) => (id === 1 ? first.promise : second.promise)

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useFetch(() => fn(id), [id]),
      { initialProps: { id: 1 } },
    )
    first.reject(new Error('boom'))
    await flush()
    expect(result.current.error).toBeInstanceOf(Error)

    rerender({ id: 2 })

    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(true)
    second.resolve('ok')
    await flush()
    expect(result.current.error).toBeNull()
  })
})

describe('useFetch — stale-resolution guard', () => {
  it('a superseded request that resolves LAST never overwrites the newer payload', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const fn = (id: number) => (id === 1 ? first.promise : second.promise)

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useFetch(() => fn(id), [id]),
      { initialProps: { id: 1 } },
    )

    rerender({ id: 2 })
    second.resolve('جديد')
    await flush()
    expect(result.current.data).toBe('جديد')

    first.resolve('قديم')
    await flush()

    expect(result.current.data).toBe('جديد')
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('a superseded request that resolves FIRST never commits and never ends the loading state', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const fn = (id: number) => (id === 1 ? first.promise : second.promise)

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useFetch(() => fn(id), [id]),
      { initialProps: { id: 1 } },
    )

    rerender({ id: 2 })

    first.resolve('قديم')
    await flush()

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(true)

    second.resolve('جديد')
    await flush()
    expect(result.current.data).toBe('جديد')
    expect(result.current.loading).toBe(false)
  })

  it('a superseded request that REJECTS late never surfaces an error over a good payload', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const fn = (id: number) => (id === 1 ? first.promise : second.promise)

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useFetch(() => fn(id), [id]),
      { initialProps: { id: 1 } },
    )

    rerender({ id: 2 })
    second.resolve('جديد')
    await flush()

    first.reject(new Error('aborted upstream'))
    await flush()

    expect(result.current.error).toBeNull()
    expect(result.current.data).toBe('جديد')
  })

  it('only the newest of three rapid dep changes is allowed to commit', async () => {
    const runs = [deferred<string>(), deferred<string>(), deferred<string>()]
    const fn = vi.fn((id: number) => runs[id]!.promise)

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useFetch(() => fn(id), [id]),
      { initialProps: { id: 0 } },
    )
    rerender({ id: 1 })
    rerender({ id: 2 })

    runs[2]!.resolve('C')
    await flush()
    runs[0]!.resolve('A')
    runs[1]!.resolve('B')
    await flush()

    expect(fn).toHaveBeenCalledTimes(3)
    expect(result.current.data).toBe('C')
  })
})

describe('useFetch — refetch', () => {
  it('re-runs the loader and refreshes the data', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const fn = vi.fn<() => Promise<string>>()
    fn.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const { result } = renderHook(() => useFetch(fn, []))
    first.resolve('v1')
    await flush()

    let run!: Promise<void>
    await act(async () => {
      run = result.current.refetch()
    })

    expect(result.current.loading).toBe(true)
    second.resolve('v2')
    await act(async () => {
      await run
    })

    expect(fn).toHaveBeenCalledTimes(2)
    expect(result.current.data).toBe('v2')
    expect(result.current.loading).toBe(false)
  })

  it('keeps a stable identity across renders and always calls the latest loader', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const fnA = vi.fn(() => first.promise)
    const fnB = vi.fn(() => second.promise)

    const { result, rerender } = renderHook(
      ({ f }: { f: () => Promise<string> }) => useFetch(f, ['stable']),
      { initialProps: { f: fnA } },
    )
    first.resolve('a')
    await flush()

    const refetchBefore = result.current.refetch
    rerender({ f: fnB })
    expect(result.current.refetch).toBe(refetchBefore)
    expect(fnB).not.toHaveBeenCalled()

    let run!: Promise<void>
    await act(async () => {
      run = result.current.refetch()
    })
    second.resolve('b')
    await act(async () => {
      await run
    })

    expect(fnA).toHaveBeenCalledTimes(1)
    expect(fnB).toHaveBeenCalledTimes(1)
    expect(result.current.data).toBe('b')
  })

  it('aborts the previous request when refetch is fired while one is still in flight', async () => {
    const signals: AbortSignal[] = []
    const first = deferred<string>()
    const second = deferred<string>()
    const promises = [first.promise, second.promise]
    let call = 0
    const { result } = renderHook(() =>
      useFetch((signal) => {
        signals.push(signal)
        return promises[call++]!
      }, []),
    )

    let run!: Promise<void>
    await act(async () => {
      run = result.current.refetch()
    })

    expect(signals).toHaveLength(2)
    expect(signals[0]!.aborted).toBe(true)
    expect(signals[1]!.aborted).toBe(false)

    second.resolve('من الطلب الثاني')
    await act(async () => {
      await run
    })
    first.resolve('من الطلب الأول')
    await flush()

    expect(result.current.data).toBe('من الطلب الثاني')
  })
})

describe('useFetch — unmount safety', () => {
  it('aborts the in-flight request on unmount', () => {
    const signals: AbortSignal[] = []
    const pending = deferred<string>()
    const { unmount } = renderHook(() =>
      useFetch((signal) => {
        signals.push(signal)
        return pending.promise
      }, []),
    )

    expect(signals[0]!.aborted).toBe(false)
    unmount()
    expect(signals[0]!.aborted).toBe(true)
  })

  it('a resolution that lands after unmount is swallowed without re-running or throwing', async () => {
    const pending = deferred<string>()
    const fn = vi.fn(() => pending.promise)
    const { unmount } = renderHook(() => useFetch(fn, []))

    unmount()
    pending.resolve('too late')
    await expect(flush()).resolves.toBeUndefined()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('a rejection that lands after unmount is swallowed', async () => {
    const pending = deferred<string>()
    const { unmount } = renderHook(() => useFetch(() => pending.promise, []))

    unmount()
    pending.reject(new Error('late failure'))
    await expect(flush()).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Consumed from a real component — the way every caller uses the hook.
// ---------------------------------------------------------------------------

function CoursesPanel({
  load,
}: {
  load: (signal: AbortSignal) => Promise<string[]>
}) {
  const { data, loading, error, refetch } = useFetch(load, [])

  return (
    <section aria-labelledby="courses-heading" dir="rtl">
      <h2 id="courses-heading">دوراتي</h2>
      {loading && <p role="status">جارٍ التحميل…</p>}
      {error != null && <p role="alert">تعذر تحميل الدورات</p>}
      {data != null && (
        <ul>
          {data.map((title) => (
            <li key={title}>{title}</li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => void refetch()}>
        إعادة المحاولة
      </button>
    </section>
  )
}

describe('useFetch — inside a component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading status, then the loaded list, and has no axe violations', async () => {
    const pending = deferred<string[]>()
    const { container } = render(<CoursesPanel load={() => pending.promise} />)

    expect(screen.getByRole('status')).toHaveTextContent('جارٍ التحميل…')

    pending.resolve(['اللغة الإنجليزية', 'المحادثة'])
    await flush()

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText('اللغة الإنجليزية')).toBeInTheDocument()
    expect(screen.getByText('المحادثة')).toBeInTheDocument()
    expect(await axeCheck(container)).toHaveNoViolations()
  })

  it('shows an alert on failure and recovers when the user retries', async () => {
    const user = userEvent.setup()
    const first = deferred<string[]>()
    const second = deferred<string[]>()
    const load = vi.fn<() => Promise<string[]>>()
    load.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    render(<CoursesPanel load={load} />)

    first.reject(new Error('network'))
    await flush()
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل الدورات')

    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()

    second.resolve(['المحادثة'])
    await flush()

    expect(screen.getByText('المحادثة')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(load).toHaveBeenCalledTimes(2)
  })
})
