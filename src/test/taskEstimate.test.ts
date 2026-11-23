import { describe, it, expect } from 'vitest'
import { AxiosError } from 'axios'
import {
  TASK_SCOPE_RULES,
  durationToHours,
  emptyEstimate,
  estimateFromRecord,
  formatEstimate,
  hasEstimateErrors,
  isEstimateHidden,
  isLegacyRecord,
  mapEstimateServerErrors,
  taskFormEstimate,
  toEstimatePayload,
  validateEstimate,
  validatePointsForScope,
  type EstimateDraft,
} from '@/lib/taskEstimate'

const draft = (over: Partial<EstimateDraft>): EstimateDraft => ({ ...emptyEstimate(), ...over })

describe('scope ranges (the same as the server)', () => {
  it('simple 25-50, medium 75-150, large 200-300, strategic 300 and up (open)', () => {
    expect([TASK_SCOPE_RULES.simple.min, TASK_SCOPE_RULES.simple.max]).toEqual([25, 50])
    expect([TASK_SCOPE_RULES.medium.min, TASK_SCOPE_RULES.medium.max]).toEqual([75, 150])
    expect([TASK_SCOPE_RULES.large.min, TASK_SCOPE_RULES.large.max]).toEqual([200, 300])
    expect(TASK_SCOPE_RULES.strategic.min).toBe(300)
    expect(TASK_SCOPE_RULES.strategic.open).toBe(true)
  })

  it('accepts the edges and refuses outside', () => {
    expect(validatePointsForScope('simple', 25, false)).toBeNull()
    expect(validatePointsForScope('simple', 50, false)).toBeNull()
    expect(validatePointsForScope('simple', 24, false)).toMatch('بين 25 و 50')
    expect(validatePointsForScope('simple', 51, false)).toMatch('بين 25 و 50')
    expect(validatePointsForScope('medium', 74, false)).not.toBeNull()
    expect(validatePointsForScope('medium', 151, false)).not.toBeNull()
    expect(validatePointsForScope('large', 201, false)).toBeNull()
    expect(validatePointsForScope('large', 301, false)).not.toBeNull()
  })

  it('strategic is open ended above 300 and refuses below', () => {
    expect(validatePointsForScope('strategic', 300, false)).toBeNull()
    expect(validatePointsForScope('strategic', 9000, false)).toBeNull()
    expect(validatePointsForScope('strategic', 299, false)).not.toBeNull()
    expect(validatePointsForScope('strategic', 299, true)).toMatch('300')
    expect(validatePointsForScope('strategic', 1_000_001, true)).toMatch('1,000,000')
  })
})

describe('duration', () => {
  it('hours stay hours, minutes become decimal hours (two places), empty is none', () => {
    expect(durationToHours('2.5', 'hours')).toBe(2.5)
    expect(durationToHours('45', 'minutes')).toBe(0.75)
    expect(durationToHours('20', 'minutes')).toBe(0.33)
    expect(durationToHours('', 'hours')).toBeNull()
    expect(durationToHours('  ', 'minutes')).toBeNull()
  })

  it('is optional but, when given, must be between 0.01 and 1000 hours', () => {
    const base = draft({ scope: 'simple', points: '30' })
    expect(validateEstimate({ ...base, duration: '' }, { required: true })).toEqual({})
    expect(validateEstimate({ ...base, duration: '0' }, { required: true }).estimated_hours).toBeDefined()
    expect(validateEstimate({ ...base, duration: '-1' }, { required: true }).estimated_hours).toBeDefined()
    expect(validateEstimate({ ...base, duration: '0.2', unit: 'minutes' }, { required: true }).estimated_hours).toBeDefined()
    expect(validateEstimate({ ...base, duration: '1001' }, { required: true }).estimated_hours).toBeDefined()
    expect(validateEstimate({ ...base, duration: '1000' }, { required: true })).toEqual({})
    expect(validateEstimate({ ...base, duration: '1', unit: 'minutes' }, { required: true })).toEqual({})
  })
})

describe('validateEstimate mirrors the server', () => {
  it('requires scope and points when required', () => {
    const e = validateEstimate(emptyEstimate(), { required: true })
    expect(e.task_scope).toBeDefined()
    expect(e.task_points).toBeDefined()
    expect(hasEstimateErrors(e)).toBe(true)
  })

  it('an untouched empty form is valid when nothing is required', () => {
    expect(validateEstimate(emptyEstimate(), { required: false })).toEqual({})
  })

  it('once anything is typed, scope and points are needed together', () => {
    const e = validateEstimate(draft({ duration: '2' }), { required: false })
    expect(e.task_scope).toBeDefined()
    expect(e.task_points).toBeDefined()
  })

  it('checks the range of the chosen scope', () => {
    expect(validateEstimate(draft({ scope: 'medium', points: '120' }), { required: true })).toEqual({})
    expect(validateEstimate(draft({ scope: 'medium', points: '20' }), { required: true }).task_points).toBeDefined()
  })
})

describe('payload', () => {
  it('omits an empty duration (the server keeps stored hours)', () => {
    const p = toEstimatePayload(draft({ scope: 'large', points: '250' }))
    expect(p).toEqual({ task_scope: 'large', task_points: 250 })
    expect('estimated_hours' in p).toBe(false)
  })

  it('sends hours, converting minutes', () => {
    expect(toEstimatePayload(draft({ scope: 'simple', points: '30', duration: '90', unit: 'minutes' })).estimated_hours).toBe(1.5)
    expect(toEstimatePayload(draft({ scope: 'simple', points: '30', duration: '2' })).estimated_hours).toBe(2)
  })

  it('an emptied duration is an explicit null only when clearing is asked for', () => {
    const d = draft({ scope: 'simple', points: '30' })
    expect(toEstimatePayload(d, { clearHours: true })).toEqual({ task_scope: 'simple', task_points: 30, estimated_hours: null })
    expect('estimated_hours' in toEstimatePayload(d, { clearHours: false })).toBe(false)
  })
})

describe('records: legacy, hidden, display', () => {
  it('the task form starts as a simple, 25-point, 2-hour task', () => {
    expect(taskFormEstimate()).toEqual({ scope: 'simple', points: '25', exceptional: false, duration: '2', unit: 'hours' })
  })

  it('a legacy record (all null) opens EMPTY: nothing is invented', () => {
    const r = { task_scope: null, task_points: null, estimated_hours: null }
    expect(isLegacyRecord(r)).toBe(true)
    expect(estimateFromRecord(r)).toEqual(emptyEstimate())
  })

  it('a record with values opens with them', () => {
    const r = { task_scope: 'medium', task_points: 120, estimated_hours: 2.5 }
    expect(isLegacyRecord(r)).toBe(false)
    expect(estimateFromRecord(r)).toMatchObject({ scope: 'medium', points: '120', duration: '2.5' })
  })

  it('missing keys mean «not available to you», a present null means «not set»', () => {
    expect(isEstimateHidden({ id: 1 })).toBe(true)
    expect(isEstimateHidden({ id: 1, task_scope: null, task_points: null, estimated_hours: null })).toBe(false)
    expect(isEstimateHidden({ id: 1, task_points: 10 })).toBe(false)
  })

  it('formats «120 نقطة · 2.5 ساعة» and — when nothing is set', () => {
    expect(formatEstimate({ task_points: 120, estimated_hours: 2.5 })).toBe('120 نقطة · 2.5 ساعة')
    expect(formatEstimate({ task_points: 120, estimated_hours: null })).toBe('120 نقطة')
    expect(formatEstimate({ task_points: null, estimated_hours: null })).toBe('—')
  })
})

describe('server errors map back to the fields', () => {
  it('maps task_points / task_scope / estimated_hours of a 422', () => {
    const err = new AxiosError('x', '422', undefined, undefined, {
      status: 422, statusText: '', headers: {}, config: {} as never,
      data: { success: false, message: 'bad', errors: { task_points: ['نقاط المهمة المتوسطة يجب أن تتراوح بين 75 و 150 نقطة.'], estimated_hours: ['المدة غير صالحة'], other: ['x'] } },
    })
    expect(mapEstimateServerErrors(err)).toEqual({ task_points: 'نقاط المهمة المتوسطة يجب أن تتراوح بين 75 و 150 نقطة.', estimated_hours: 'المدة غير صالحة' })
  })

  it('anything else maps to nothing', () => {
    expect(mapEstimateServerErrors(new Error('boom'))).toEqual({})
  })
})
