export function formatDateTime(
  dateStr: string | null | undefined,
  locale = 'ar',
  timezone = 'Europe/Amsterdam',
): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return dateStr.slice(0, 16)
  }
}

export function formatDate(
  dateStr: string | null | undefined,
  locale = 'ar',
  timezone = 'Europe/Amsterdam',
): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  } catch {
    return dateStr.slice(0, 10)
  }
}
