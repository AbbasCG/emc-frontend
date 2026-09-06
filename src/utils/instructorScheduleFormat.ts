/** Shared Arabic/Amsterdam date-time formatting for instructor schedule
 *  metadata (course cards, placement-test cards, etc). Originally a local
 *  helper on the courses page — extracted so every instructor page renders
 *  dates/times identically instead of re-implementing the same formatting. */

export function formatInstructorDateAr(d: string | null | undefined): string | null {
  if (!d) return null
  try {
    return new Intl.DateTimeFormat('ar', {
      day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'Europe/Amsterdam',
      numberingSystem: 'latn',
    }).format(new Date(d.length <= 10 ? `${d}T00:00:00` : d))
  } catch { return d }
}

export function formatInstructorTime24(t: string | null | undefined): string | null {
  if (!t) return null
  // Already a bare HH:MM[:SS] string (e.g. course start_time/end_time).
  if (/^\d{2}:\d{2}/.test(t)) return t.slice(0, 5)
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'Europe/Amsterdam',
    }).format(new Date(t))
  } catch { return t }
}

export function formatInstructorDateRange(start: string | null | undefined, end: string | null | undefined): string | null {
  const s = formatInstructorDateAr(start)
  const e = formatInstructorDateAr(end)
  if (s && e && s !== e) return `${s} – ${e}`
  return s ?? e ?? null
}

export function formatInstructorTimeRange(start: string | null | undefined, end: string | null | undefined): string | null {
  const s = formatInstructorTime24(start)
  const e = formatInstructorTime24(end)
  if (s && e) return `${s} - ${e}`
  return s ?? e ?? null
}
