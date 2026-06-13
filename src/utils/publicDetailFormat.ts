const TZ = 'Europe/Amsterdam'

export function formatPublicDate(raw: unknown): string {
  if (raw == null || String(raw).trim() === '') return ''
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('ar', {
      timeZone: TZ,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      numberingSystem: 'latn',
    }).format(d)
  } catch {
    return ''
  }
}

export function formatPublicTime(raw: unknown): string {
  const s = raw == null ? '' : String(raw).trim()
  if (!s) return ''
  const d = Date.parse(`1970-01-01T${s}`)
  if (!Number.isFinite(d)) return s
  try {
    return new Intl.DateTimeFormat('ar', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      numberingSystem: 'latn',
    }).format(new Date(d))
  } catch {
    return s
  }
}

export function formatPublicCount(n: number, unit: string): string {
  if (!Number.isFinite(n) || n <= 0) return ''
  return `${String(Math.round(n))} ${unit}`
}

function parseTimeToMinutes(raw: unknown): number | null {
  const s = raw == null ? '' : String(raw).trim()
  if (!s) return null
  const match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return null
  return h * 60 + m
}

/** Returns session length in hours (e.g. 20:00–22:00 => 2). */
export function calculateDurationFromTimeRange(startTime: unknown, endTime: unknown): number | null {
  const startMin = parseTimeToMinutes(startTime)
  const endMin = parseTimeToMinutes(endTime)
  if (startMin == null || endMin == null) return null
  let diffMin = endMin - startMin
  if (diffMin <= 0) diffMin += 24 * 60
  const hours = diffMin / 60
  return hours > 0 && hours <= 24 ? hours : null
}

export function formatSessionDurationArabic(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return ''

  const roundedHalf = Math.round(hours * 2) / 2
  const whole = Math.floor(roundedHalf)
  const hasHalf = Math.abs(roundedHalf - whole - 0.5) < 0.01

  if (roundedHalf === 0.5) return 'نصف ساعة'
  if (roundedHalf === 1 && !hasHalf) return 'ساعة واحدة'
  if (roundedHalf === 2 && !hasHalf) return 'ساعتان'
  if (whole === 1 && hasHalf) return 'ساعة ونصف'
  if (hasHalf && whole > 1) return `${String(whole)} ساعات ونصف`
  if (whole >= 3 && whole <= 10) return `${String(whole)} ساعات`
  if (whole > 10) return `${String(whole)} ساعة`
  return `${String(roundedHalf)} ساعات`
}

export function formatSessionDurationFromRange(startTime: unknown, endTime: unknown): string {
  const hours = calculateDurationFromTimeRange(startTime, endTime)
  if (hours == null) return ''
  return formatSessionDurationArabic(hours)
}

/** Alias requested by product spec */
export const calculateSessionDuration = calculateDurationFromTimeRange
