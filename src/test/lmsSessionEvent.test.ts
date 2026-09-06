import { describe, it, expect } from 'vitest'
import { normalizeLmsSessionEvent } from '../api/placementApi'

describe('normalizeLmsSessionEvent — canonical LmsSessionResource adapter (Ticket 4)', () => {
  it('reads the canonical nested course/class_group/meeting/attendance/permissions shape', () => {
    const raw = {
      id: 1, title: 'Session 1', date: '2026-08-05', start_time: '10:00', end_time: '11:00',
      status: 'scheduled', timezone: 'Europe/Amsterdam',
      course: { id: 5, title: 'English' },
      class_group: { id: 9, name: 'B1' },
      meeting: { provider: 'custom', url: 'https://x.test', join_allowed: false },
      attendance: { total: 3, present: 2, absent: 1, late: 0, excused: 0 },
      materials_count: 2, assignments_count: 0,
      allowed_transitions: ['live', 'cancelled', 'missed'],
      permissions: { view: true, update: true, transition: true, delete: false, view_meeting_link: true, record_attendance: false },
    }

    const row = normalizeLmsSessionEvent(raw)

    expect(row.course).toEqual({ id: 5, title: 'English' })
    expect(row.class_group).toEqual({ id: 9, name: 'B1' })
    expect(row.meeting.provider).toBe('custom')
    expect(row.attendance.present).toBe(2)
    expect(row.allowed_transitions).toEqual(['live', 'cancelled', 'missed'])
    expect(row.permissions.transition).toBe(true)
  })

  it('does not infer or calculate a status transition matrix on the frontend', () => {
    const row = normalizeLmsSessionEvent({ id: 1, title: 'S', status: 'completed', allowed_transitions: ['archived'] })
    // The frontend must only ever display what the backend already computed —
    // no local re-derivation of which transitions are legal.
    expect(row.allowed_transitions).toEqual(['archived'])
  })

  it('hides the meeting link when the backend already withheld it (unauthorized viewer)', () => {
    const row = normalizeLmsSessionEvent({
      id: 1, title: 'S', status: 'scheduled',
      meeting: { provider: 'custom', url: null, join_allowed: false },
      permissions: { view: true, update: false, transition: false, delete: false, view_meeting_link: false, record_attendance: false },
    })

    expect(row.meeting.url).toBeNull()
    expect(row.permissions.view_meeting_link).toBe(false)
  })

  it('falls back to safe defaults for missing optional fields without throwing', () => {
    const row = normalizeLmsSessionEvent({ id: 2, title: 'Minimal' })
    expect(row.course).toBeNull()
    expect(row.class_group).toBeNull()
    expect(row.attendance).toEqual({ total: 0, present: 0, absent: 0, late: 0, excused: 0 })
    expect(row.allowed_transitions).toEqual([])
  })

  it('a canonical null meeting URL stays null — never backfilled from any other field', () => {
    const row = normalizeLmsSessionEvent({
      id: 3, title: 'S', status: 'scheduled',
      meeting: { provider: 'zoom', url: null, join_allowed: false },
    })
    expect(row.meeting.url).toBeNull()
  })

  it('does not infer permissions locally — reads exactly what the backend sent, including all-false', () => {
    const row = normalizeLmsSessionEvent({
      id: 4, title: 'S', status: 'archived',
      permissions: { view: true, update: false, transition: false, delete: false, view_meeting_link: false, record_attendance: false },
    })
    expect(row.permissions).toEqual({
      view: true, update: false, transition: false, delete: false, view_meeting_link: false, record_attendance: false,
    })
  })

  it('meeting.join_allowed is read verbatim, never derived from status in the frontend', () => {
    const live = normalizeLmsSessionEvent({ id: 5, title: 'S', status: 'live', meeting: { provider: 'custom', url: 'https://x.test', join_allowed: false } })
    expect(live.meeting.join_allowed).toBe(false) // backend said no, even though status is live
  })
})
