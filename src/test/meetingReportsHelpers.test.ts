import { describe, expect, it } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'
import { normalizeMeetingReport, normalizeMeetingReportDetail } from '@/api/operationsReportsApi'
import { activeFilterCount, describeReportsError, EMPTY_FILTERS, formatDay, scoreTone } from '@/components/operations/meetingReports/meetingReportsUi'

describe('normalizeMeetingReport', () => {
  it('turns a legacy all-null row into a displayable one', () => {
    const r = normalizeMeetingReport({ id: 3, title: null, meeting_date: null, department: null, author: null, created_at: '2026-10-12T22:23:06.000000Z' })
    expect(r).toEqual({
      id: 3, title: 'تقرير اجتماع', meeting_date: '2026-10-12', department: null, author: null,
      ratings_count: 0, attended_count: 0, created_at: '2026-10-12T22:23:06.000000Z',
    })
  })

  it('strips a datetime down to the day and keeps a plain day', () => {
    expect(normalizeMeetingReport({ id: 1, meeting_date: '2026-03-04T00:00:00.000000Z' })?.meeting_date).toBe('2026-03-04')
    expect(normalizeMeetingReport({ id: 1, meeting_date: '2026-03-04' })?.meeting_date).toBe('2026-03-04')
  })

  it('drops rows without a usable id and non-objects', () => {
    for (const bad of [null, undefined, 4, 'x', [], {}, { id: 'abc' }]) expect(normalizeMeetingReport(bad)).toBeNull()
  })

  it('ignores a malformed relation instead of throwing', () => {
    const r = normalizeMeetingReport({ id: 1, department: 'x', author: { id: 'a' } })
    expect(r?.department).toBeNull()
    expect(r?.author).toBeNull()
  })
})

describe('normalizeMeetingReportDetail', () => {
  it('coalesces quick-report columns from an older backend payload', () => {
    const d = normalizeMeetingReportDetail({ id: 1, completed_tasks_summary: 'أ', next_month_goals: 'ب', challenges: 'ج', executive_requests: 'د' })
    expect([d?.achieved, d?.planned, d?.needs_reason, d?.needs]).toEqual(['أ', 'ب', 'ج', 'د'])
  })

  it('tolerates missing ratings and extras', () => {
    const d = normalizeMeetingReportDetail({ id: 1, ratings: 'nope', extras: null })
    expect(d?.ratings).toEqual([])
    expect(d?.extras).toEqual({})
  })

  it('skips malformed rating rows but keeps good ones', () => {
    const d = normalizeMeetingReportDetail({ id: 1, ratings: [null, { id: 'x' }, { id: 2, attended: true, avg_score: 8, user: { id: 5, name: 'سارة' } }] })
    expect(d?.ratings).toHaveLength(1)
    expect(d?.ratings[0].user?.name).toBe('سارة')
  })
})

describe('describeReportsError', () => {
  const err = (status?: number) => new AxiosError('x', 'E', undefined, undefined, status ? ({ status, data: {}, statusText: '', headers: {}, config: {} } as AxiosResponse) : undefined)

  it.each([
    [401, 'unauthenticated', false],
    [403, 'forbidden', false],
    [404, 'not_found', false],
    [422, 'validation', true],
    [500, 'server', true],
    [503, 'server', true],
  ])('maps %s to %s (retryable: %s)', (status, kind, retryable) => {
    const d = describeReportsError(err(status))
    expect(d.kind).toBe(kind)
    expect(d.retryable).toBe(retryable)
    expect(d.title).toBeTruthy()
  })

  it('maps a response-less axios error to a network error and a non-axios throw to a server error', () => {
    expect(describeReportsError(err()).kind).toBe('network')
    expect(describeReportsError(new Error('boom')).kind).toBe('server')
  })
})

describe('display helpers', () => {
  it('formats a plain day without shifting it and shows a dash for nothing usable', () => {
    expect(formatDay('2026-10-12')).toContain('12')
    expect(formatDay(null)).toBe('—')
    expect(formatDay('not a date')).toBe('—')
  })

  it('bands scores and counts active filters', () => {
    expect([scoreTone(9.5), scoreTone(7), scoreTone(5)]).toEqual(['high', 'mid', 'low'])
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0)
    expect(activeFilterCount({ q: ' x ', department_id: 2, date_from: '', date_to: '2026-01-01' })).toBe(3)
  })
})
