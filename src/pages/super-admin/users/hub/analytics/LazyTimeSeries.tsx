import { lazy, Suspense } from 'react'
import SectionErrorBoundary from '@/components/errors/SectionErrorBoundary'
import type { TimeSeriesProps } from './charts/TimeSeriesChart'

const TimeSeriesChart = lazy(() => import('./charts/TimeSeriesChart'))

/** The recharts bundle loads only when a chart is first drawn, and a failed chunk cannot take the tab down with it. */
export function LazyTimeSeries(props: TimeSeriesProps) {
  const height = props.height ?? 240

  return (
    <SectionErrorBoundary title="تعذّر تحميل الرسم البياني">
      <Suspense fallback={<div aria-hidden="true" className="w-full animate-pulse rounded-xl bg-slate-100" style={{ height }} />}>
        <TimeSeriesChart {...props} />
      </Suspense>
    </SectionErrorBoundary>
  )
}
