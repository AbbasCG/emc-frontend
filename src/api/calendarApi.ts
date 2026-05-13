import apiClient from './axios'
import { asList } from './lmsApi'
import { seedCalendarEvents } from '@/data/phase7Seed'
import type { CalendarEventRecord, CalendarFilterKind } from '@/types/phase7'

export async function fetchCalendarEvents(kind?: CalendarFilterKind): Promise<CalendarEventRecord[]> {
  try {
    const res = await apiClient.get<unknown>('/calendar/events', {
      params: kind && kind !== 'all' ? { kind } : undefined,
    })
    return asList<CalendarEventRecord>(res.data)
  } catch {
    const base = seedCalendarEvents()
    if (!kind || kind === 'all') return base
    return base.filter((e) => e.kind === kind)
  }
}

function escapeIcsText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function formatIcsDate(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

/** ICS fallback generator — used when `/calendar/export.ics` is unavailable */
export function buildLocalIcsBlob(events: CalendarEventRecord[]): Blob {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EMC//Frontend//AR', 'CALSCALE:GREGORIAN']

  for (const ev of events) {
    const uid = ev.ics_uid ?? `emc-event-${ev.id}`
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${escapeIcsText(uid)}@emc`)
    lines.push(`DTSTAMP:${formatIcsDate(new Date().toISOString())}`)
    lines.push(`DTSTART:${formatIcsDate(ev.starts_at)}`)
    if (ev.ends_at) lines.push(`DTEND:${formatIcsDate(ev.ends_at)}`)
    lines.push(`SUMMARY:${escapeIcsText(ev.title)}`)
    if (ev.location_ar) lines.push(`LOCATION:${escapeIcsText(ev.location_ar)}`)
    if (ev.join_url) lines.push(`URL:${escapeIcsText(ev.join_url)}`)
    lines.push(`DESCRIPTION:${escapeIcsText(ev.status_ar)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
}

export async function fetchCalendarIcsBlob(kind?: CalendarFilterKind): Promise<Blob> {
  try {
    const res = await apiClient.get<Blob>('/calendar/export.ics', {
      params: kind && kind !== 'all' ? { kind } : undefined,
      responseType: 'blob',
      skipErrorToast: true,
    })
    return res.data
  } catch {
    const events = await fetchCalendarEvents(kind === undefined ? 'all' : kind)
    return buildLocalIcsBlob(events)
  }
}
