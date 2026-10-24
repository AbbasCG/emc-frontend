import { describe, expect, it } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'
import { describeMeetingError, normalizeCandidate, normalizeMeeting, normalizeMeetingDetail } from '@/api/meetingsApi'
import { normalizeMeetingReport } from '@/api/operationsReportsApi'
import { formatMeetingWhen } from '@/components/operations/meetings/meetingsUi'

describe('normalizeMeeting', () => {
  it('fills every field the UI relies on from a bare row', () => {
    const m = normalizeMeeting({ id: 3 })
    expect(m).toEqual({
      id: 3, title: 'اجتماع بلا عنوان', type: 'general', status: 'scheduled', display_status: 'scheduled', meeting_date: null,
      start_time: null, end_time: null, department: null, organizer: null, has_report: false, report_id: null,
      meeting_url: null, audience: 'general', my_attendance: null, participants_count: null,
      capabilities: {
        can_view: true, can_join: false, can_confirm_attendance: false, can_manage: false, can_upload_report: false,
        can_view_report: false, can_view_attendance: false, can_view_quality_data: false,
      }, created_at: null,
    })
  })

  it('maps the older type names and trims dates and times', () => {
    const m = normalizeMeeting({ id: 1, type: 'exec', meeting_date: '2026-03-04T00:00:00.000000Z', start_time: '09:30:00', end_time: '10:15:00' })
    expect(m).toMatchObject({ type: 'executive', meeting_date: '2026-03-04', start_time: '09:30', end_time: '10:15' })
    expect(normalizeMeeting({ id: 1, type: 'departments' })?.type).toBe('department')
    expect(normalizeMeeting({ id: 1, type: 'external' })?.type).toBe('external_partner')
    expect(normalizeMeeting({ id: 1, type: 'nonsense' })?.type).toBe('general')
  })

  it('derives a display status when an older server sent none, and never lets "no report" be a upload offer', () => {
    expect(normalizeMeeting({ id: 1, status: 'completed' })?.display_status).toBe('awaiting_report')
    expect(normalizeMeeting({ id: 1, status: 'completed', has_report: true })?.display_status).toBe('report_submitted')
    expect(normalizeMeeting({ id: 1, status: 'cancelled' })?.display_status).toBe('cancelled')
    expect(normalizeMeeting({ id: 1 })?.capabilities.can_upload_report).toBe(false)
  })

  it('takes the capabilities only from explicit true values', () => {
    const m = normalizeMeeting({ id: 1, capabilities: { can_manage: 'yes', can_upload_report: true, can_view_report: 1 } })
    expect(m?.capabilities).toMatchObject({ can_manage: false, can_upload_report: true, can_view_report: false })
  })

  it('drops rows without an id and non-objects', () => {
    for (const bad of [null, undefined, 3, 'x', [], {}, { id: 'abc' }]) expect(normalizeMeeting(bad)).toBeNull()
  })

  it('ignores a malformed relation', () => {
    const m = normalizeMeeting({ id: 1, department: 'x', organizer: { id: 'a', name: 5 } })
    expect(m?.department).toBeNull()
    expect(m?.organizer).toBeNull()
  })
})

describe('normalizeMeetingDetail', () => {
  it('maps decisions, action items, attendees, agenda and the report to what the lists render', () => {
    const d = normalizeMeetingDetail({
      id: 1, title: 'ع', agenda: ['البند الأول', { title: 'الثاني' }, 5], attendees: ['أحمد', { name: 'سارة', role: 'مديرة' }, {}],
      decisions: [{ id: 1, title: 'قرار', description: 'تفصيل' }, { id: 'x' }],
      action_items: [{ id: 2, title: 'بند', assigned_to: { id: 4, name: 'ليلى' }, due_date: '2026-05-01', status: 'completed' }],
      report: { id: 9, absentees: ['أ', 7], challenges: 'تحدٍّ', uploaded_by: { id: 1, name: 'نورة' }, created_at: '2026-10-01T00:00:00Z' },
    })
    expect(d?.agenda).toEqual(['البند الأول', 'الثاني'])
    expect(d?.decisions).toEqual([{ id: 1, text: 'قرار — تفصيل' }])
    expect(d?.action_items).toEqual([{ id: 2, text: 'بند', owner: 'ليلى', due_at: '2026-05-01', done: true }])
    expect(d?.report).toMatchObject({ id: 9, absentees: ['أ'], challenges: 'تحدٍّ', uploaded_by: { id: 1, name: 'نورة' }, uploaded_at: '2026-10-01T00:00:00Z' })
  })

  it('has a null report and empty lists when the server sent none', () => {
    const d = normalizeMeetingDetail({ id: 1 })
    expect(d).toMatchObject({ report: null, decisions: [], action_items: [], participants: [], agenda: [], meeting_url: null, attendance_summary: null, participants_visible: false })
  })
})

describe('attendance and participants', () => {
  it('reads the audience, the viewers own attendance and the join link', () => {
    const m = normalizeMeeting({ id: 1, audience: 'explicit', meeting_url: 'https://meet.test/a', my_attendance: { status: 'joined', joined_at: '2026-10-01T10:00:00Z', confirmed_at: null }, participants_count: 4 })
    expect(m).toMatchObject({ audience: 'explicit', meeting_url: 'https://meet.test/a', participants_count: 4 })
    expect(m?.my_attendance).toEqual({ status: 'joined', joined_at: '2026-10-01T10:00:00Z', confirmed_at: null })
  })

  it('falls back safely on an unknown audience or participant status', () => {
    expect(normalizeMeeting({ id: 1, audience: 'zzz', department: { id: 1, name: 'إ' } })?.audience).toBe('department')
    expect(normalizeMeeting({ id: 1, audience: 'zzz' })?.audience).toBe('general')
    expect(normalizeMeeting({ id: 1, my_attendance: { status: 'weird' } })?.my_attendance?.status).toBe('invited')
  })

  it('maps participants and the summary for someone who may see them, and drops malformed rows', () => {
    const d = normalizeMeetingDetail({
      id: 1, participants_visible: true,
      participants: [{ user: { id: 5, name: 'سارة', department: 'البرامج' }, status: 'attended' }, { user: { id: 'x' } }, null, { status: 'joined' }],
      attendance_summary: { invited: 3, joined: 1, attended: 1, absent: 1 },
    })
    expect(d?.participants).toHaveLength(1)
    expect(d?.participants[0]).toMatchObject({ status: 'attended', user: { id: 5, name: 'سارة', department: 'البرامج' } })
    expect(d?.attendance_summary).toEqual({ invited: 3, joined: 1, attended: 1, absent: 1 })
    expect(d?.participants_visible).toBe(true)
  })

  it('reads the candidate pool and ignores rows without an id or a name', () => {
    expect(normalizeCandidate({ id: 3, name: 'ليلى', role: 'instructor', role_title: null, department: 'الجودة' })).toEqual({ id: 3, name: 'ليلى', role: 'instructor', role_title: null, department: 'الجودة' })
    for (const bad of [null, {}, { id: 3 }, { name: 'x' }, 'x']) expect(normalizeCandidate(bad)).toBeNull()
  })
})

describe('describeMeetingError', () => {
  const err = (status?: number, data: unknown = {}) =>
    new AxiosError('x', 'E', undefined, undefined, status ? ({ status, data, statusText: '', headers: {}, config: {} } as AxiosResponse) : undefined)

  it('keeps the server Arabic reason for a refusal and ignores an English one', () => {
    expect(describeMeetingError(err(403, { message: 'ليست لديك صلاحية.' })).message).toBe('ليست لديك صلاحية.')
    expect(describeMeetingError(err(403, { message: 'Forbidden' })).message).not.toBe('Forbidden')
  })

  it('recognises the duplicate-report refusal', () => {
    const d = describeMeetingError(err(422, { message: 'تم رفع تقرير لهذا الاجتماع مسبقًا.', errors: { meeting: ['تم رفع تقرير لهذا الاجتماع مسبقًا.'] } }))
    expect(d.kind).toBe('duplicate_report')
    expect(d.message).toBe('تم رفع تقرير لهذا الاجتماع مسبقًا.')
  })

  it.each([[401, 'unauthenticated', false], [403, 'forbidden', false], [404, 'not_found', false], [422, 'validation', true], [500, 'server', true]])(
    'maps %s to %s (retryable %s)', (status, kind, retryable) => {
      const d = describeMeetingError(err(status))
      expect(d.kind).toBe(kind)
      expect(d.retryable).toBe(retryable)
    })

  it('collects the first message per field on a 422', () => {
    const d = describeMeetingError(err(422, { errors: { title: ['أ', 'ب'], start_time: ['ج'] } }))
    expect(d.fields).toEqual({ title: 'أ', start_time: 'ج' })
  })

  it('maps a response-less error to network and a plain throw to server', () => {
    expect(describeMeetingError(err()).kind).toBe('network')
    expect(describeMeetingError(new Error('boom')).kind).toBe('server')
  })
})

describe('operations report source meeting', () => {
  it('reads the meeting a lounge report was filed for, and tolerates its absence or a bad type', () => {
    expect(normalizeMeetingReport({ id: 1, meeting: { id: 4, title: 'اجتماع', type: 'quality' } })?.meeting).toEqual({ id: 4, title: 'اجتماع', type: 'quality' })
    expect(normalizeMeetingReport({ id: 1, meeting: { id: 4, title: 'اجتماع', type: 'zzz' } })?.meeting?.type).toBe('general')
    expect(normalizeMeetingReport({ id: 1 })?.meeting).toBeNull()
    expect(normalizeMeetingReport({ id: 1, meeting: { id: 4 } })?.meeting).toBeNull()
  })
})

describe('formatMeetingWhen', () => {
  it('writes one spaced line: date، start – end, 24-hour', () => {
    expect(formatMeetingWhen({ meeting_date: '2026-10-15', start_time: '22:00', end_time: '23:00' })).toBe('15 أكتوبر 2026، 22:00 – 23:00')
    expect(formatMeetingWhen({ meeting_date: '2026-10-15', start_time: '09:30', end_time: null })).toBe('15 أكتوبر 2026، 09:30')
    expect(formatMeetingWhen({ meeting_date: '2026-10-15', start_time: null, end_time: null })).toBe('15 أكتوبر 2026')
    expect(formatMeetingWhen({ meeting_date: null, start_time: '09:30', end_time: '10:00' })).toBe('09:30 – 10:00')
    expect(formatMeetingWhen({ meeting_date: null, start_time: null, end_time: null })).toBe('—')
  })

  it('never runs the date and the time together', () => {
    expect(formatMeetingWhen({ meeting_date: '2026-10-15', start_time: '22:00', end_time: '23:00' })).not.toMatch(/\d{4}\d{2}:/)
  })
})
