import type { Course } from '@/types'

/**
 * Admin form field `certificate` ("الشهادة المتاحة") persists on the course record.
 * Public course detail API returns the same `certificate` string on the course payload.
 *
 * Fallback when unset/null/empty: hide certificate UI (admin did not configure an offering).
 */
export const PROGRAM_CERTIFICATE_NONE_AR = 'لا توجد شهادة'

const NO_CERTIFICATE_VALUES = new Set([
  PROGRAM_CERTIFICATE_NONE_AR,
  'none',
  'no_certificate',
  'no certificate',
  'false',
  '0',
])

export type ProgramCertificateAvailability = {
  hasCertificate: boolean
  /** Arabic label for detail surfaces (e.g. "شهادة حضور") */
  label: string | null
  /** Short label for hero badges — same as `label` when configured explicitly */
  badgeLabel: string | null
}

function trim(raw: unknown): string | null {
  if (raw == null || raw === false) return null
  const s = String(raw).trim()
  return s === '' || s === '—' ? null : s
}

function isExplicitNoCertificate(raw: unknown): boolean {
  const s = trim(raw)
  if (!s) return false
  return NO_CERTIFICATE_VALUES.has(s) || NO_CERTIFICATE_VALUES.has(s.toLowerCase())
}

function isTruthyFlag(raw: unknown): boolean {
  return raw === true || raw === 1 || raw === '1'
}

function isFalsyFlag(raw: unknown): boolean {
  return raw === false || raw === 0 || raw === '0'
}

function mapCertificateTypeToArabic(raw: string): string | null {
  const lower = raw.toLowerCase()
  const map: Record<string, string> = {
    attendance: 'شهادة حضور',
    course_attendance: 'شهادة حضور',
    completion: 'شهادة إتمام',
    course_completion: 'شهادة إتمام',
    participation: 'شهادة مشاركة',
    accredited: 'شهادة معتمدة',
  }
  return map[lower] ?? null
}

function asRecord(program: unknown): Record<string, unknown> {
  if (!program || typeof program !== 'object' || Array.isArray(program)) return {}
  return program as Record<string, unknown>
}

/**
 * Resolves whether a course/workshop program is configured to offer a certificate.
 * Uses backend fields only — never registration state or issued certificate counts.
 */
export function resolveCertificateAvailability(program: unknown): ProgramCertificateAvailability {
  const x = asRecord(program)
  const courseCert = trim(x.certificate)
  const certName = trim(x.certificate_name)
  const certTitle = trim(x.certificate_title)
  const certTypeRaw = trim(x.certificate_type)

  if (
    isFalsyFlag(x.certificate_available) ||
    isFalsyFlag(x.has_certificate) ||
    isExplicitNoCertificate(courseCert) ||
    isExplicitNoCertificate(certName) ||
    isExplicitNoCertificate(certTitle) ||
    isExplicitNoCertificate(certTypeRaw)
  ) {
    return { hasCertificate: false, label: null, badgeLabel: null }
  }

  if (courseCert) {
    return { hasCertificate: true, label: courseCert, badgeLabel: courseCert }
  }

  if (certName) {
    return { hasCertificate: true, label: certName, badgeLabel: certName }
  }

  if (certTitle) {
    return { hasCertificate: true, label: certTitle, badgeLabel: certTitle }
  }

  if (certTypeRaw) {
    const label = mapCertificateTypeToArabic(certTypeRaw) ?? certTypeRaw
    return { hasCertificate: true, label, badgeLabel: label }
  }

  if (isTruthyFlag(x.certificate_available) || isTruthyFlag(x.has_certificate)) {
    return {
      hasCertificate: true,
      label: 'شهادة متاحة وفق سياسات البرنامج',
      badgeLabel: 'شهادة معتمدة',
    }
  }

  return { hasCertificate: false, label: null, badgeLabel: null }
}

export function hasProgramCertificate(program: unknown): boolean {
  return resolveCertificateAvailability(program).hasCertificate
}

/** Normalize workshop/course API rows so "لا توجد شهادة" is treated as absent. */
export function normalizePublicCertificateName(raw: unknown): string | null {
  const s = trim(raw)
  if (!s || isExplicitNoCertificate(s)) return null
  return s
}

export function certificateLineForCourse(course: Course, extra: Record<string, unknown> = {}): string | null {
  const merged = { ...(course as unknown as Record<string, unknown>), ...extra }
  const { hasCertificate, label } = resolveCertificateAvailability(merged)
  if (!hasCertificate || !label) return null
  return label
}
