import { cloneElement, useEffect, type ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MAX_SOURCE_LINES, pivotSources, type SourceSeries } from '@/pages/super-admin/users/hub/analytics/sourcesPivot'

// recharts measures its container; in jsdom nothing has a size, so the responsive wrapper hands a fixed size to the chart
const container = vi.hoisted(() => ({ width: 600 as number | null }))
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children, onResize }: { children: ReactElement<{ width?: number; height?: number }>; onResize?: (w: number, h: number) => void }) => {
      useEffect(() => {
        if (container.width !== null) onResize?.(container.width, 260) // what the real container reports once it has been measured
      }, [onResize])
      return cloneElement(children, { width: container.width ?? 600, height: 260 })
    },
  }
})

import TimeSeriesChart from '@/pages/super-admin/users/hub/analytics/charts/TimeSeriesChart'

const dates = (n: number) => Array.from({ length: n }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`)
const source = (name: string, n: number, f: (i: number) => number): SourceSeries => ({
  source: name,
  series: dates(n).map((date, i) => ({ date, count: f(i) })),
})

describe('pivotSources', () => {
  it('makes one row per day, in date order, with a positional key per source', () => {
    const out = pivotSources([
      { source: 'instagram', series: [{ date: '2026-11-03', count: 3 }, { date: '2026-11-01', count: 1 }, { date: '2026-11-02', count: 2 }] },
      { source: 'google', series: [{ date: '2026-11-01', count: 9 }, { date: '2026-11-02', count: 8 }, { date: '2026-11-03', count: 7 }] },
    ])

    expect(out.keys).toEqual(['s0', 's1'])
    expect(out.rows).toEqual([
      { date: '2026-11-01', s0: 1, s1: 9 },
      { date: '2026-11-02', s0: 2, s1: 8 },
      { date: '2026-11-03', s0: 3, s1: 7 },
    ])
  })

  it('plots at most five sources', () => {
    const many = Array.from({ length: 8 }, (_, i) => source(`s-${i}`, 2, () => i))

    const out = pivotSources(many)

    expect(MAX_SOURCE_LINES).toBe(5)
    expect(out.keys).toEqual(['s0', 's1', 's2', 's3', 's4'])
    expect(Object.keys(out.labels)).toHaveLength(5)
    expect(Object.keys(out.rows[0])).toEqual(['date', 's0', 's1', 's2', 's3', 's4'])
  })

  it('counts a day missing from a source as 0 for that source, and keeps every day any source has', () => {
    const out = pivotSources([
      { source: 'a', series: [{ date: '2026-11-01', count: 4 }] },
      { source: 'b', series: [{ date: '2026-11-02', count: 6 }] },
    ])

    expect(out.rows).toEqual([
      { date: '2026-11-01', s0: 4, s1: 0 },
      { date: '2026-11-02', s0: 0, s1: 6 },
    ])
  })

  it('maps each key back to the source text exactly as typed (free text never becomes a property name)', () => {
    const out = pivotSources([source('__proto__', 1, () => 1), source('صديق عزيز', 1, () => 2), source('', 1, () => 3)])

    expect(out.labels).toEqual({ s0: '__proto__', s1: 'صديق عزيز', s2: '' })
    expect(out.rows[0]).toEqual({ date: '2026-11-01', s0: 1, s1: 2, s2: 3 })
  })

  it('returns nothing for no sources', () => {
    expect(pivotSources([])).toEqual({ rows: [], keys: [], labels: {} })
  })
})

describe('TimeSeriesChart kind="sources" (real recharts, fixed size)', () => {
  const original = window.matchMedia
  afterEach(() => {
    window.matchMedia = original
    container.width = 600
  })

  const five = ['instagram', 'google', 'صديق', 'newsletter', 'tiktok'].map((name, k) => source(name, 30, (i) => 1 + ((i + k) % 4)))

  it('draws one line per source, each with its own dash pattern, and a legend naming them', () => {
    const { container } = render(<TimeSeriesChart kind="sources" data={five} height={260} />)

    const curves = container.querySelectorAll('.recharts-line-curve')
    expect(curves).toHaveLength(5)
    const dashes = Array.from(curves).map((c) => c.getAttribute('stroke-dasharray') ?? 'none')
    expect(new Set(dashes).size).toBe(5)

    const legend = screen.getByRole('list', { name: 'مفتاح الخطوط' })
    const items = within(legend).getAllByRole('listitem')
    expect(items.map((i) => i.textContent)).toEqual(['instagram', 'google', 'صديق', 'newsletter', 'tiktok'])
    // the legend swatches use the same patterns as the lines
    const swatchDashes = Array.from(legend.querySelectorAll('svg line')).map((l) => l.getAttribute('stroke-dasharray') ?? 'none')
    expect(swatchDashes).toEqual(dashes)
  })

  it('draws no more than five lines even if given more', () => {
    const { container } = render(<TimeSeriesChart kind="sources" data={[...five, source('extra', 30, () => 2)]} height={260} />)

    expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(5)
  })

  const narrowMedia = () =>
    ((query: string) => ({ matches: true, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia
  const labels = () => document.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick').length

  it('labels the x axis with about seven dates in a wide chart and three in a phone-sized one', () => {
    container.width = 600
    const wideChart = render(<TimeSeriesChart kind="sources" data={five} height={260} />)
    const wide = labels()
    wideChart.unmount()

    container.width = 300
    render(<TimeSeriesChart kind="sources" data={five} height={260} />)
    const narrow = labels()

    expect(wide).toBeGreaterThanOrEqual(6)
    expect(wide).toBeLessThanOrEqual(8)
    expect(narrow).toBeLessThanOrEqual(4)
    expect(narrow).toBeLessThan(wide)
  })

  it('the other chart kinds use the same width rule', () => {
    const data = dates(30).map((date, i) => ({ date, events: 10 + i, users: 5 + (i % 3) }))

    container.width = 600
    const wideChart = render(<TimeSeriesChart kind="logins" data={data} height={200} />)
    const wide = labels()
    wideChart.unmount()
    container.width = 250
    render(<TimeSeriesChart kind="logins" data={data} height={200} />)

    expect(labels()).toBeLessThan(wide)
  })

  it('before the chart is measured it falls back to the breakpoint (7 wide, 3 on a phone)', () => {
    container.width = null
    const desktop = render(<TimeSeriesChart kind="sources" data={five} height={260} />)
    const wide = labels()
    desktop.unmount()

    window.matchMedia = narrowMedia()
    render(<TimeSeriesChart kind="sources" data={five} height={260} />)

    expect(wide).toBeGreaterThanOrEqual(6)
    expect(labels()).toBeLessThanOrEqual(4)
  })

  it('the date-label count follows the chart own measured width, not the viewport', () => {
    const labels = () => document.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick').length
    const counts: number[] = []
    for (const width of [200, 420, 900]) {
      container.width = width
      const { unmount } = render(<TimeSeriesChart kind="sources" data={five} height={260} />)
      counts.push(labels())
      unmount()
    }

    expect(counts[0]).toBeLessThanOrEqual(3) // a 200px chart: 2 labels
    expect(counts[1]).toBeGreaterThanOrEqual(4) // a half-width panel
    expect(counts[1]).toBeLessThanOrEqual(5)
    expect(counts[2]).toBeGreaterThanOrEqual(6) // a wide chart
    expect(counts[0]).toBeLessThan(counts[1])
    expect(counts[1]).toBeLessThan(counts[2])
  })
})
