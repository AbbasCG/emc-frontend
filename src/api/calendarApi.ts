import apiClient from './axios'
import { unwrapData } from './unwrap'
import type { CalendarEventRecord, CalendarFilterKind, CalendarEventInput, CalendarEventType } from '@/types/phase7'

const silent = { skipErrorToast: true as const }

export type CalendarEventsResult = {
  events: CalendarEventRecord[]
  ok: boolean
}

function pickStr(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return null
}

function mapEventType(raw: string): CalendarEventType {
  const k = raw.toLowerCase()
  if (k === 'sessions' || k === 'session' || k === 'class' || k === 'live_session') return 'session'
  if (k === 'workshops' || k === 'workshop' || k === 'one_session') return 'workshop'
  if (k === 'meetings' || k === 'meeting') return 'meeting'
  if (k === 'tasks' || k === 'task') return 'task'
  if (k === 'assignments' || k === 'assignment') return 'task'
  if (k === 'programs' || k === 'program' || k === 'full_program') return 'program'
  if (k === 'learning_path' || k === 'learning_paths' || k === 'path' || k === 'track') return 'learning_path'
  if (k === 'courses' || k === 'course') return 'course'
  if (k === 'events' || k === 'event') return 'event'
  return 'event'
}

function normalizeVisibility(raw: unknown): CalendarEventRecord['visibility'] {
  const v = String(raw ?? 'all').toLowerCase()
  if (v === 'private') return 'private'
  if (v === 'department' || v === 'dept') return 'department'
  return 'all'
}

function normalizeCalendarEvent(raw: unknown): CalendarEventRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>

  const idRaw = o.id ?? o.event_id ?? o.uuid
  const title = pickStr(o.title, o.name, o.subject, o.summary)
  const start_at = pickStr(
    o.start_at,
    o.starts_at,
    o.start_time,
    o.scheduled_at,
    o.scheduled_start,
    o.date_time,
    o.datetime,
  )

  if (idRaw == null || !title || !start_at) return null

  const typeRaw = pickStr(o.type, o.kind, o.event_type, o.category) ?? 'event'
  const type = mapEventType(typeRaw)
  const end_at = pickStr(o.end_at, o.ends_at, o.end_time, o.scheduled_end, o.finish_at)
  const meeting_link = pickStr(o.meeting_link, o.meeting_url, o.join_url, o.link, o.zoom_link)
  const can_join =
    o.can_join === true ||
    o.canJoin === true ||
    (o.can_join !== false && o.canJoin !== false && Boolean(meeting_link))
  const can_edit = o.can_edit === true || o.canEdit === true

  const courseRaw =
    o.course && typeof o.course === 'object' && !Array.isArray(o.course) ?
      (o.course as Record<string, unknown>)
    : null
  const deptRaw =
    o.department && typeof o.department === 'object' && !Array.isArray(o.department) ?
      (o.department as Record<string, unknown>)
    : null
  const ownerRaw =
    o.owner && typeof o.owner === 'object' && !Array.isArray(o.owner) ?
      (o.owner as Record<string, unknown>)
    : o.instructor && typeof o.instructor === 'object' && !Array.isArray(o.instructor) ?
      (o.instructor as Record<string, unknown>)
    : null
  const instructorRaw =
    o.instructor && typeof o.instructor === 'object' && !Array.isArray(o.instructor) ?
      (o.instructor as Record<string, unknown>)
    : ownerRaw
  const lpRaw =
    o.learning_path && typeof o.learning_path === 'object' && !Array.isArray(o.learning_path) ?
      (o.learning_path as Record<string, unknown>)
    : null
  const sourceId = o.source_id != null ? Number(o.source_id) : null

  return {
    id: String(idRaw),
    source_id: Number.isFinite(sourceId) ? sourceId : null,
    source:
      (pickStr(o.source) ??
        (String(idRaw).startsWith('program-') ? 'program' :
          String(idRaw).startsWith('learning_path-') ? 'learning_path' : null)) as CalendarEventRecord['source'],
    type,
    title,
    subtitle: pickStr(o.subtitle),
    description: pickStr(o.description, o.details, o.body),
    start_at,
    end_at,
    status: pickStr(o.status, o.state) ?? 'scheduled',
    location: pickStr(o.location, o.venue, o.place),
    meeting_link,
    image_url: pickStr(o.image_url, o.cover_image, o.featured_image),
    slug: pickStr(o.slug, courseRaw?.slug as string | undefined),
    instructor:
      instructorRaw ?
        {
          id: Number(instructorRaw.id ?? 0),
          name: pickStr(instructorRaw.name, instructorRaw.full_name, instructorRaw.title) ?? '',
        }
      : null,
    course:
      courseRaw ?
        {
          id: Number(courseRaw.id ?? courseRaw.course_id ?? 0),
          title: pickStr(courseRaw.title, courseRaw.name) ?? '',
          slug: pickStr(courseRaw.slug),
        }
      : null,
    learning_path:
      lpRaw ?
        {
          id: Number(lpRaw.id ?? 0),
          title: pickStr(lpRaw.title, lpRaw.name) ?? '',
          slug: pickStr(lpRaw.slug),
        }
      : null,
    department:
      deptRaw ?
        {
          id: Number(deptRaw.id ?? 0),
          name_ar: pickStr(deptRaw.name_ar, deptRaw.name, deptRaw.title) ?? '',
        }
      : null,
    owner:
      ownerRaw ?
        {
          id: Number(ownerRaw.id ?? 0),
          name: pickStr(ownerRaw.name, ownerRaw.full_name, ownerRaw.title) ?? '',
        }
      : null,
    visibility: normalizeVisibility(o.visibility),
    can_edit,
    can_join: o.can_join === false ? false : can_join,
  }
}

function extractEventRows(payload: unknown): unknown[] {
  const inner = unwrapData<unknown>(payload)
  if (Array.isArray(inner)) return inner
  if (!inner || typeof inner !== 'object') return []

  const obj = inner as Record<string, unknown>
  for (const key of ['events', 'items', 'results', 'data'] as const) {
    const val = obj[key]
    if (Array.isArray(val)) return val
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const nested = val as Record<string, unknown>
      for (const nestedKey of ['events', 'items', 'data'] as const) {
        if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as unknown[]
      }
    }
  }

  return []
}

function applyClientFilter(events: CalendarEventRecord[], type?: CalendarFilterKind): CalendarEventRecord[] {
  if (!type || type === 'all') return events

  const now = Date.now()
  return events.filter((ev) => {
    const evType = ev.type === 'assignment' ? 'task' : ev.type
    if (evType !== type && mapEventType(ev.type) !== type) return false
    if (type === 'session') return new Date(ev.end_at ?? ev.start_at).getTime() >= now
    return true
  })
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function fetchCalendarEvents(
  type?: CalendarFilterKind,
  params?: { start_date?: string; end_date?: string; department_id?: number; course_id?: number },
): Promise<CalendarEventsResult> {
  const query: Record<string, string | number> = { ...params }
  if (type && type !== 'all') {
    query.type = type
    query.kind = type
  }

  try {
    const res = await apiClient.get<unknown>('/calendar/events', {
      params: query,
      ...silent,
    })

    const rows = extractEventRows(res.data)
    const events = rows
      .map(normalizeCalendarEvent)
      .filter((ev): ev is CalendarEventRecord => ev != null)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())

    return { events: applyClientFilter(events, type), ok: true }
  } catch {
    return { events: [], ok: false }
  }
}

// ─── Write (department leaders / admins only) ─────────────────────────────────

export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarEventRecord> {
  const res = await apiClient.post<{ success: boolean; data: CalendarEventRecord }>('/calendar/events', input)
  const normalized = normalizeCalendarEvent(res.data.data)
  if (!normalized) throw new Error('Invalid calendar event response')
  return normalized
}

export async function updateCalendarEvent(
  rawId: string,
  input: Partial<Omit<CalendarEventInput, 'kind'>>,
): Promise<CalendarEventRecord> {
  const numId = rawId.replace('event_', '')
  const res = await apiClient.put<{ success: boolean; data: CalendarEventRecord }>(`/calendar/events/${numId}`, input)
  const normalized = normalizeCalendarEvent(res.data.data)
  if (!normalized) throw new Error('Invalid calendar event response')
  return normalized
}

export async function deleteCalendarEvent(rawId: string): Promise<void> {
  const numId = rawId.replace('event_', '')
  await apiClient.delete(`/calendar/events/${numId}`)
}

// ─── ICS export ───────────────────────────────────────────────────────────────

export async function fetchCalendarIcsBlob(type?: CalendarFilterKind): Promise<Blob> {
  try {
    const res = await apiClient.get<Blob>('/calendar/export.ics', {
      params: type && type !== 'all' ? { type, kind: type } : undefined,
      responseType: 'blob',
      ...silent,
    })
    return res.data
  } catch {
    const { events } = await fetchCalendarEvents(type)
    return buildLocalIcsBlob(events)
  }
}

// ─── Local ICS fallback ───────────────────────────────────────────────────────

function escapeIcsText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function formatIcsDate(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    d.getUTCFullYear() +
    p(d.getUTCMonth() + 1) +
    p(d.getUTCDate()) +
    'T' +
    p(d.getUTCHours()) +
    p(d.getUTCMinutes()) +
    p(d.getUTCSeconds()) +
    'Z'
  )
}

export function buildLocalIcsBlob(events: CalendarEventRecord[]): Blob {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EMC//Frontend//AR', 'CALSCALE:GREGORIAN']

  for (const ev of events) {
    if (!ev.start_at) continue
    const endIso = ev.end_at ?? new Date(new Date(ev.start_at).getTime() + 3600000).toISOString()
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:emc-${ev.id}@emc.sa`)
    lines.push(`DTSTAMP:${formatIcsDate(new Date().toISOString())}`)
    lines.push(`DTSTART:${formatIcsDate(ev.start_at)}`)
    lines.push(`DTEND:${formatIcsDate(endIso)}`)
    lines.push(`SUMMARY:${escapeIcsText(ev.title)}`)
    if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`)
    if (ev.meeting_link) lines.push(`URL:${escapeIcsText(ev.meeting_link)}`)
    if (ev.description) lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
}
