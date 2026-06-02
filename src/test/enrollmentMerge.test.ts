import { describe, it, expect } from 'vitest'
import { mapBackendRegStatus } from '@/utils/studentEnrollmentMerge'

describe('mapBackendRegStatus', () => {
  it('maps attended and completed variants → completed', () => {
    expect(mapBackendRegStatus('attended')).toBe('completed')
    expect(mapBackendRegStatus('completed')).toBe('completed')
  })

  it('maps pending payment and waiting variants → pending', () => {
    expect(mapBackendRegStatus('pending_payment')).toBe('pending')
    expect(mapBackendRegStatus('pending')).toBe('pending')
    expect(mapBackendRegStatus('registered')).toBe('pending')
  })

  it('maps cancellation variants → pending (not displayed as active)', () => {
    expect(mapBackendRegStatus('cancelled')).toBe('pending')
    expect(mapBackendRegStatus('no_show')).toBe('pending')
  })

  it('maps confirmed active states → active', () => {
    expect(mapBackendRegStatus('active')).toBe('active')
    expect(mapBackendRegStatus('payment_confirmed')).toBe('active')
  })

  it('defaults to active for null/undefined', () => {
    expect(mapBackendRegStatus(null)).toBe('active')
    expect(mapBackendRegStatus(undefined)).toBe('active')
  })
})
