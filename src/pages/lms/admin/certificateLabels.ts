import type { CertificateType } from '@/api/certificatesApi'

/** Arabic display label per certificate type — shared across the certificates list,
 *  batches, templates and detail pages. */
export const CERT_TYPE_LABELS: Record<CertificateType, string> = {
  course_completion:   'إتمام دورة',
  workshop_attendance: 'حضور ورشة',
  summer_camp:         'معسكر صيفي',
  learning_track:      'مسار تعليمي',
  partner:             'شراكة',
  guest_speaker:       'متحدث ضيف',
  volunteer:           'تطوع',
  internship:          'تدريب',
  sponsor:             'رعاية',
  custom:              'مخصص',
}
