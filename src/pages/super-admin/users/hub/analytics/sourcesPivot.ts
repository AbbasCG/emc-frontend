/** One sign-up source with its daily counts (every day of the window). */
export interface SourceSeries {
  source: string
  series: Array<{ date: string; count: number }>
}

/** The chart draws at most this many lines (the API returns the top 5 sources). */
export const MAX_SOURCE_LINES = 5

export interface SourcesPivot {
  /** One row per day, ascending: `{ date, s0, s1, … }`. A source with no point on a day counts 0 that day. */
  rows: Array<Record<string, number | string>>
  /** Row keys of the plotted sources, in the order given (`s0` is the leading source). */
  keys: string[]
  /** Row key → the source text as typed (what tooltips and the legend show). */
  labels: Record<string, string>
}

/**
 * Turns per-source series into the one-row-per-day shape recharts wants. Pure: keys are positional (`s0`…) because a
 * source is free text and cannot safely be a property name.
 */
export function pivotSources(data: SourceSeries[], max: number = MAX_SOURCE_LINES): SourcesPivot {
  const sources = data.slice(0, max)
  const keys = sources.map((_, k) => `s${k}`)
  const labels = Object.fromEntries(sources.map((s, k) => [keys[k], s.source]))

  const byDate = new Map<string, Record<string, number | string>>()
  sources.forEach((s, k) => {
    for (const point of s.series) {
      let row = byDate.get(point.date)
      if (!row) {
        row = { date: point.date, ...Object.fromEntries(keys.map((key) => [key, 0])) }
        byDate.set(point.date, row)
      }
      row[keys[k]] = point.count
    }
  })

  const rows = [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  return { rows, keys, labels }
}
