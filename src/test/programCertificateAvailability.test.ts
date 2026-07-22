import { describe, it, expect } from 'vitest'
import {
  PROGRAM_CERTIFICATE_NONE_AR,
  hasProgramCertificate,
  normalizePublicCertificateName,
  resolveCertificateAvailability,
} from '@/utils/programCertificateAvailability'
import { certificateLineArabic } from '@/utils/publicCourseDisplay'
import { deriveCourseDetail } from '@/utils/courseDetailDerived'
import { courseHasCertificate } from '@/utils/courseDetailPageData'
import type { Course } from '@/types'

function course(overrides: Partial<Course> & Record<string, unknown> = {}): Course {
  return {
    id: 1,
    title: 'دورة تجريبية',
    slug: 'dor-tjribia',
    type: 'paid',
    price: 100,
    is_online: true,
    ...overrides,
  } as Course
}

describe('resolveCertificateAvailability — backend `certificate` field', () => {
  it('treats "لا توجد شهادة" as no certificate', () => {
    const avail = resolveCertificateAvailability({ certificate: PROGRAM_CERTIFICATE_NONE_AR })
    expect(avail.hasCertificate).toBe(false)
    expect(avail.label).toBeNull()
    expect(hasProgramCertificate({ certificate: PROGRAM_CERTIFICATE_NONE_AR })).toBe(false)
  })

  it('attendance certificate remains visible with accurate label', () => {
    const avail = resolveCertificateAvailability({ certificate: 'شهادة حضور' })
    expect(avail.hasCertificate).toBe(true)
    expect(avail.label).toBe('شهادة حضور')
    expect(avail.badgeLabel).toBe('شهادة حضور')
  })

  it('completion certificate remains visible', () => {
    const avail = resolveCertificateAvailability({ certificate: 'شهادة إتمام' })
    expect(avail.hasCertificate).toBe(true)
    expect(avail.label).toBe('شهادة إتمام')
  })

  it('null/empty certificate hides certificate UI (unset admin choice)', () => {
    expect(hasProgramCertificate({ certificate: null })).toBe(false)
    expect(hasProgramCertificate({ certificate: '' })).toBe(false)
    expect(hasProgramCertificate({})).toBe(false)
  })

  it('certificate_available=false overrides a stray certificate string', () => {
    expect(
      hasProgramCertificate({ certificate: 'شهادة إتمام', certificate_available: false }),
    ).toBe(false)
  })

  it('certificate_available=true without label uses generic fallback', () => {
    const avail = resolveCertificateAvailability({ certificate_available: true })
    expect(avail.hasCertificate).toBe(true)
    expect(avail.badgeLabel).toBe('شهادة معتمدة')
  })

  it('does not infer certificate from registration or issued counts', () => {
    expect(
      hasProgramCertificate({
        certificate: PROGRAM_CERTIFICATE_NONE_AR,
        registrations_count: 50,
        certificates_count: 10,
      }),
    ).toBe(false)
  })

  it('normalizePublicCertificateName strips no-certificate sentinel', () => {
    expect(normalizePublicCertificateName(PROGRAM_CERTIFICATE_NONE_AR)).toBeNull()
    expect(normalizePublicCertificateName('شهادة حضور')).toBe('شهادة حضور')
  })
})

describe('public course detail derivations respect certificate configuration', () => {
  it('no certificate: derived surfaces omit certificate copy', () => {
    const c = course({ certificate: PROGRAM_CERTIFICATE_NONE_AR })
    const derived = deriveCourseDetail(c)
    expect(derived.certificateLine).toBeNull()
    expect(certificateLineArabic(c, {})).toBeNull()
    expect(courseHasCertificate(c)).toBe(false)
    expect(derived.quickFacts.some((f) => f.label === 'الشهادة')).toBe(false)
    expect(derived.trainingStats.some((s) => s.label === 'الشهادة')).toBe(false)
  })

  it('attendance certificate: derived line uses configured Arabic label', () => {
    const c = course({ certificate: 'شهادة حضور' })
    const derived = deriveCourseDetail(c)
    expect(derived.certificateLine).toBe('شهادة حضور')
    expect(courseHasCertificate(c)).toBe(true)
  })

  it('workshop program_type uses the same certificate rule as courses', () => {
    const c = course({
      certificate: PROGRAM_CERTIFICATE_NONE_AR,
      program_type: 'workshop',
    })
    expect(courseHasCertificate(c)).toBe(false)
    const withCert = course({ certificate: 'شهادة مشاركة', program_type: 'workshop' })
    expect(deriveCourseDetail(withCert).certificateLine).toBe('شهادة مشاركة')
  })
})
