import type {
  CertificateRecord,
  CertificateVerificationResult,
  CouponRecord,
  FinanceDashboardData,
  FinancePaymentRow,
  FinanceTransactionRow,
  KpiMetric,
  KpiTabData,
  KpiTabSlug,
  QualityReview,
  ReportRecord,
  ScholarshipApplication,
} from '@/types/intelligence'
import { formatEuroCompact, formatEuroInteger } from '@/utils/currency'

export function seedFinanceDashboard(): FinanceDashboardData {
  return {
    total_revenue: 428_900,
    confirmed_revenue: 392_400,
    pending_revenue: 31_200,
    failed_count: 12,
    monthly_revenue: [
      { month: 'يناير', amount: 62000 },
      { month: 'فبراير', amount: 71000 },
      { month: 'مارس', amount: 68800 },
      { month: 'أبريل', amount: 74500 },
      { month: 'مايو', amount: 80100 },
      { month: 'يونيو', amount: 72500 },
    ],
    revenue_by_course: [
      { course_name: 'مسار القيادة التعليمية', amount: 112400 },
      { course_name: 'أساسيات الجودة في التدريب', amount: 89400 },
      { course_name: 'إدارة برامج التطوير', amount: 76300 },
    ],
    revenue_by_track: [
      { track_name: 'القيادة والسياسات', amount: 156000 },
      { track_name: 'التعليم والتقويم', amount: 121300 },
      { track_name: 'التشغيل والشراكات', amount: 98200 },
    ],
    latest_payments: seedFinancePayments().slice(0, 8),
  }
}

export function seedFinancePayments(): FinancePaymentRow[] {
  const providers = ['stripe', 'paypal', 'fake'] as const
  const statuses = ['confirmed', 'pending', 'failed'] as const
  return Array.from({ length: 16 }).map((_, i) => ({
    id: i + 1,
    amount: 450 + (i % 7) * 120,
    currency: 'EUR',
    status: statuses[i % statuses.length]!,
    provider: providers[i % providers.length]!,
    course_name: ['مسار القيادة', 'جودة التدريب', 'ورشة تقييم الأثر'][i % 3]!,
    payer_email: `learner${i + 1}@example.com`,
    created_at: `2026-05-${String((i % 28) + 1).padStart(2, '0')}T${10 + (i % 8)}:30:00`,
  }))
}

export function seedFinanceTransactions(): FinanceTransactionRow[] {
  return Array.from({ length: 20 }).map((_, i) => ({
    id: i + 100,
    label: i % 3 === 0 ? 'استرداد جزئي' : i % 3 === 1 ? 'رسوم تسجيل' : 'اشتراك دورة',
    amount: 200 + i * 35,
    type: i % 5 === 0 ? 'debit' : 'credit',
    status: i % 11 === 0 ? 'failed' : i % 7 === 0 ? 'pending' : 'confirmed',
    provider: (['stripe', 'paypal', 'fake'] as const)[i % 3]!,
    created_at: `2026-05-${String((i % 25) + 1).padStart(2, '0')}`,
  }))
}

export function seedCoupons(): CouponRecord[] {
  return [
    {
      id: 1,
      code: 'EMC20',
      name: 'خصم انطلاقة الصيف',
      discount_type: 'percent',
      value: 20,
      max_uses: 200,
      uses_count: 54,
      starts_at: '2026-05-01',
      ends_at: '2026-08-31',
      applies_to: 'جميع الدورات المدفوعة',
      active: true,
    },
    {
      id: 2,
      code: 'PARTNER50',
      name: 'شراكات المؤسسات',
      discount_type: 'fixed',
      value: 150,
      max_uses: 40,
      uses_count: 12,
      starts_at: '2026-04-01',
      ends_at: '2026-12-31',
      applies_to: 'مسارات القيادة فقط',
      active: true,
    },
    {
      id: 3,
      code: 'OLD',
      name: 'منتهي',
      discount_type: 'percent',
      value: 10,
      max_uses: 100,
      uses_count: 100,
      starts_at: '2025-01-01',
      ends_at: '2025-12-31',
      applies_to: 'عام',
      active: false,
    },
  ]
}

export function seedScholarships(): ScholarshipApplication[] {
  return [
    {
      id: 1,
      applicant_name: 'نورة الغامدي',
      email: 'noura.g@example.com',
      type: 'partial',
      discount_percent: 40,
      amount: null,
      reason: 'التزام مجتمعي — مشاركة في مبادرة التطوع',
      status: 'pending',
      created_at: '2026-05-08',
    },
    {
      id: 2,
      applicant_name: 'فيصل الحربي',
      email: 'faisal.h@example.com',
      type: 'full',
      discount_percent: null,
      amount: 2400,
      reason: 'خريج برنامج ابتعاث محلي',
      status: 'accepted',
      created_at: '2026-05-05',
    },
    {
      id: 3,
      applicant_name: 'لينا السبيعي',
      email: 'lina.s@example.com',
      type: 'partial',
      discount_percent: 25,
      amount: null,
      reason: 'دخل أسرة محدود — تم التحقق مبدئياً',
      status: 'rejected',
      created_at: '2026-04-28',
    },
  ]
}

export function seedCertificates(): CertificateRecord[] {
  return Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    student_name: ['أحمد المنصوري', 'سارة القحطاني', 'خالد الدوسري'][i % 3]! + ` ${i + 1}`,
    student_email: `student${i + 1}@example.com`,
    program_name: i % 2 === 0 ? 'برنامج القيادة التعليمية' : null,
    course_name: i % 2 === 1 ? 'دورة الجودة المعاصرة' : null,
    track_name: i % 3 === 0 ? 'مسار السياسات' : null,
    title: ['شهادة إتمام', 'شهادة مشاركة معتمدة', 'شهادة إنجاز متقدم'][i % 3]!,
    certificate_type: ['إتمام دورة', 'ورشة معتمدة', 'مسار تعليمي'][i % 3]!,
    verification_code: `EMC-${2026}${String(i + 1).padStart(4, '0')}-X${(i % 9) + 1}`,
    status: (['issued', 'pending_approval', 'draft', 'revoked'] as const)[i % 4]!,
    issued_at: i % 4 === 3 ? null : `2026-05-${String((i % 20) + 1).padStart(2, '0')}`,
  }))
}

export function seedStudentCertificates(): CertificateRecord[] {
  return seedCertificates()
    .filter((c) => c.status === 'issued')
    .slice(0, 4)
}

export function seedCertificateVerification(code: string): CertificateVerificationResult {
  const normalized = code.trim().toUpperCase()
  if (normalized.length < 6) {
    return { valid: false, message: 'رمز التحقق غير صالح.' }
  }
  return {
    valid: true,
    student_name: 'أحمد المنصوري',
    program_name: 'برنامج القيادة التعليمية',
    course_name: 'دورة الجودة المعاصرة',
    track_name: 'مسار السياسات',
    title: 'شهادة إتمام معتمدة',
    issued_at: '2026-05-02',
    verification_code: normalized,
  }
}

export function seedQualityReviews(): QualityReview[] {
  return Array.from({ length: 6 }).map((_, i) => ({
    id: i + 1,
    reviewable_label: ['ورشة تقييم الأثر', 'دورة الجودة', 'مسار القيادة'][i % 3]!,
    reviewer_name: ['د. مازن العتيبي', 'أ. هند الكندري'][i % 2]!,
    overall_score: 72 + (i % 25),
    status: (['submitted', 'draft'] as const)[i % 3 === 0 ? 1 : 0]!,
    reviewed_at: i % 3 === 1 ? null : `2026-05-${String((i % 15) + 1).padStart(2, '0')}`,
    objective_clarity: 8,
    content_quality: 7 + (i % 3),
    instructor_score: 8,
    organization_score: 7,
    time_commitment: 6 + (i % 2),
    completion_score: 8,
    output_quality: 7,
    repeatability: 8,
    notes: 'ملاحظات مراجعة الجودة الداخلية.',
    recommendations: 'زيادة تمارين التطبيق العملي.',
  }))
}

export function seedKpiTab(tab: KpiTabSlug): KpiTabData {
  const base = (): KpiMetric[] => [
    { id: 'students', label: 'إجمالي الطلاب', value: 1842, trend: 'up', accent: 'blue' },
    { id: 'instructors', label: 'المدربون', value: 96, trend: 'flat', accent: 'orange' },
    { id: 'volunteers', label: 'المتطوعون النشطون', value: 214, trend: 'up', accent: 'blue' },
    { id: 'workshops', label: 'الورش المنفذة', value: 58, hint: 'ربع سنوي', accent: 'orange' },
    { id: 'courses', label: 'الدورات النشطة', value: 42, accent: 'blue' },
    { id: 'attendance', label: 'معدل الحضور', value: '91%', trend: 'up', accent: 'blue' },
    { id: 'completion', label: 'معدل الإتمام', value: '78%', trend: 'up', accent: 'orange' },
    { id: 'satisfaction', label: 'رضا المستفيدين', value: '4.6/5', hint: 'متوسط نجمي', accent: 'orange' },
    { id: 'partnerships', label: 'شراكات نشطة', value: 23, accent: 'blue' },
    { id: 'tasks_overdue', label: 'مهام متأخرة', value: 7, trend: 'down', accent: 'orange' },
  ]

  const metricsByTab: Record<KpiTabSlug, KpiMetric[]> = {
    overview: base(),
    education: base().filter((m) =>
      ['students', 'instructors', 'courses', 'workshops', 'attendance', 'completion', 'satisfaction'].includes(m.id),
    ),
    finance: [
      {
        id: 'rev',
        label: 'إيرادات مؤكدة',
        value: formatEuroCompact(392_400, 'ar'),
        trend: 'up',
        accent: 'blue',
      },
      {
        id: 'pending',
        label: 'معلق',
        value: formatEuroCompact(31_200, 'ar'),
        accent: 'orange',
      },
      { id: 'failed', label: 'فاشلة', value: 12, accent: 'orange' },
      {
        id: 'arpu',
        label: 'متوسط الإيراد للمتعلم',
        value: formatEuroInteger(236, 'ar'),
        accent: 'blue',
      },
    ],
    departments: [
      { id: 'd1', label: 'صحة متوسط الإدارات', value: '88/100', accent: 'blue' },
      { id: 'd2', label: 'مهام مكتملة أسبوعياً', value: 156, trend: 'up', accent: 'orange' },
      { id: 'd3', label: 'اجتماعات معتمدة', value: 24, accent: 'blue' },
    ],
    marketing: [
      { id: 'm1', label: 'محتوى مجدول', value: 18, accent: 'blue' },
      { id: 'm2', label: 'منشور هذا الشهر', value: 42, trend: 'up', accent: 'orange' },
      { id: 'm3', label: 'تفاعل تقديري', value: '+12%', accent: 'blue' },
    ],
    partnerships: [
      { id: 'p1', label: 'شركاء نشطون', value: 23, accent: 'blue' },
      { id: 'p2', label: 'طلبات قيد المراجعة', value: 5, accent: 'orange' },
    ],
    hr: [
      { id: 'h1', label: 'متطوعون في المراجعة', value: 14, accent: 'orange' },
      { id: 'h2', label: 'ساعات تطوع مسجلة', value: 3260, trend: 'up', accent: 'blue' },
    ],
  }

  return {
    tab,
    metrics: metricsByTab[tab],
    highlights:
      tab === 'overview'
        ? ['تحسّن حضور الورش بنسبة تقريبية ٦٪', 'الشراكات الأكاديمية في أعلى مستوى منذ بداية السنة']
        : undefined,
  }
}

export function seedReports(): ReportRecord[] {
  return [
    {
      id: 1,
      title: 'تقرير برنامج القيادة — مايو',
      report_type: 'program',
      related_label: 'برنامج القيادة التعليمية',
      created_at: '2026-05-09',
      preview_summary: 'ملخص الإنجاز، الحضور، والتوصيات التصحيحية.',
    },
    {
      id: 2,
      title: 'تقرير مالي أسبوعي',
      report_type: 'finance',
      related_label: 'جميع المسارات',
      created_at: '2026-05-08',
      preview_summary: 'الإيرادات المؤكدة مقابل المعلقة.',
    },
    {
      id: 3,
      title: 'تقرير جودة ورشة الأثر',
      report_type: 'quality',
      related_label: 'ورشة تقييم الأثر',
      created_at: '2026-05-06',
      preview_summary: 'نتائج النظام الداخلي لمراجعة الجودة.',
    },
  ]
}
