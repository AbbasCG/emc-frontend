import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QueryState } from './useAnalytics'

/**
 * Loading / error / forbidden / ready, in one place.
 *
 *  - first load (no data yet): the skeleton;
 *  - reload after a period change: the previous data stays, dimmed, and the region is `aria-busy`;
 *  - error: a message with a retry (a permission error says so and offers no retry — retrying cannot help);
 *  - nothing is ever filled in with placeholder numbers.
 */
export function QueryBoundary<T>({
  query,
  onRetry,
  skeleton,
  children,
}: {
  query: QueryState<T>
  onRetry: () => void
  skeleton: ReactNode
  children: (data: T) => ReactNode
}) {
  if (query.status === 'error' && query.data === null) {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{query.forbidden ? 'لا تملك صلاحية عرض هذا القسم' : 'تعذّر تحميل البيانات'}</p>
          <p className="mt-1 leading-6">{query.error}</p>
          {query.forbidden ? null : (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-xl border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-900 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              إعادة المحاولة
            </button>
          )}
        </div>
      </div>
    )
  }

  if (query.data === null) {
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">جارٍ تحميل البيانات</span>
        {skeleton}
      </div>
    )
  }

  const stale = query.status === 'loading'
  return (
    <div aria-busy={stale} className={cn('transition-opacity duration-200', stale && 'opacity-60')}>
      {query.status === 'error' ?
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <span>{query.error} · الأرقام المعروضة من التحميل السابق.</span>
          <button type="button" onClick={onRetry} className="rounded-xl border border-red-300 bg-white px-3 py-1 font-medium hover:bg-red-100">
            إعادة المحاولة
          </button>
        </div>
      : null}
      {children(query.data)}
    </div>
  )
}
