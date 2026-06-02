import { describe, it, expect } from 'vitest'
import {
  getCourseStatusLabel,
  getRegistrationStatusLabel,
  getRegistrationStatusBadge,
  normalizeRegistrationStatus,
  KNOWLEDGE_CATEGORY_LABELS,
} from '@/utils/statusLabels'

describe('getCourseStatusLabel', () => {
  it('returns Arabic label for known statuses', () => {
    expect(getCourseStatusLabel('published')).toBe('منشور')
    expect(getCourseStatusLabel('draft')).toBe('مسودة')
    expect(getCourseStatusLabel('archived')).toBe('مؤرشف')
    expect(getCourseStatusLabel('active')).toBe('نشط')
    expect(getCourseStatusLabel('completed')).toBe('مكتمل')
    expect(getCourseStatusLabel('cancelled')).toBe('ملغي')
  })

  it('returns raw value for unknown status', () => {
    expect(getCourseStatusLabel('legacy_status')).toBe('legacy_status')
  })

  it('returns fallback for null/undefined', () => {
    expect(getCourseStatusLabel(null)).toBe('غير محدد')
    expect(getCourseStatusLabel(undefined)).toBe('غير محدد')
    expect(getCourseStatusLabel('')).toBe('غير محدد')
  })

  it('is case-insensitive', () => {
    expect(getCourseStatusLabel('PUBLISHED')).toBe('منشور')
    expect(getCourseStatusLabel('Draft')).toBe('مسودة')
  })
})

describe('getRegistrationStatusLabel', () => {
  it('returns Arabic label for backend enum values', () => {
    expect(getRegistrationStatusLabel('registered')).toBe('مسجّل')
    expect(getRegistrationStatusLabel('pending_payment')).toBe('في انتظار الدفع')
    expect(getRegistrationStatusLabel('payment_confirmed')).toBe('مدفوع ومؤكّد')
    expect(getRegistrationStatusLabel('attended')).toBe('حضر')
    expect(getRegistrationStatusLabel('no_show')).toBe('لم يحضر')
    expect(getRegistrationStatusLabel('cancelled')).toBe('ملغي')
  })

  it('defaults to active label for unknown status', () => {
    expect(getRegistrationStatusLabel('unknown_xyz')).toBe('نشط')
  })

  it('handles null/undefined gracefully', () => {
    expect(getRegistrationStatusLabel(null)).toBe('نشط')
    expect(getRegistrationStatusLabel(undefined)).toBe('نشط')
  })
})

describe('normalizeRegistrationStatus', () => {
  it('maps attended/completed variants → completed', () => {
    expect(normalizeRegistrationStatus('attended')).toBe('completed')
    expect(normalizeRegistrationStatus('completed')).toBe('completed')
    expect(normalizeRegistrationStatus('finished')).toBe('completed')
  })

  it('maps pending variants → pending', () => {
    expect(normalizeRegistrationStatus('pending_payment')).toBe('pending')
    expect(normalizeRegistrationStatus('pending')).toBe('pending')
    expect(normalizeRegistrationStatus('registered')).toBe('pending')
    expect(normalizeRegistrationStatus('on_hold')).toBe('pending')
  })

  it('maps cancellation variants → pending', () => {
    expect(normalizeRegistrationStatus('cancelled')).toBe('pending')
    expect(normalizeRegistrationStatus('no_show')).toBe('pending')
    expect(normalizeRegistrationStatus('rejected')).toBe('pending')
  })

  it('defaults to active for active/payment_confirmed', () => {
    expect(normalizeRegistrationStatus('active')).toBe('active')
    expect(normalizeRegistrationStatus('payment_confirmed')).toBe('active')
  })

  it('handles null/undefined', () => {
    expect(normalizeRegistrationStatus(null)).toBe('active')
    expect(normalizeRegistrationStatus(undefined)).toBe('active')
  })
})

describe('getRegistrationStatusBadge', () => {
  it('returns colour tokens for known statuses', () => {
    const badge = getRegistrationStatusBadge('pending_payment')
    expect(badge.text).toContain('amber')
    expect(badge.bg).toContain('amber')
  })

  it('returns slate fallback for unknown status', () => {
    const badge = getRegistrationStatusBadge('unknown_xyz')
    expect(badge.text).toContain('slate')
  })
})

describe('KNOWLEDGE_CATEGORY_LABELS', () => {
  it('maps known category keys', () => {
    expect(KNOWLEDGE_CATEGORY_LABELS['policies']).toBe('السياسات')
    expect(KNOWLEDGE_CATEGORY_LABELS['guides']).toBe('الأدلة')
    expect(KNOWLEDGE_CATEGORY_LABELS['templates']).toBe('القوالب')
    expect(KNOWLEDGE_CATEGORY_LABELS['reports']).toBe('التقارير')
    expect(KNOWLEDGE_CATEGORY_LABELS['lessons_learned']).toBe('الدروس المستفادة')
  })
})
