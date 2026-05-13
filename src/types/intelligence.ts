/** Phase 4 — Revenue, certificates, quality, KPIs, reports */

export type PaymentProvider = 'stripe' | 'paypal' | 'fake' | string
export type PaymentStatus = 'confirmed' | 'pending' | 'failed' | 'refunded'

export type FinanceDashboardData = {
  total_revenue: number
  confirmed_revenue: number
  pending_revenue: number
  failed_count: number
  monthly_revenue: { month: string; amount: number }[]
  revenue_by_course: { course_name: string; amount: number }[]
  revenue_by_track: { track_name: string; amount: number }[]
  latest_payments: FinancePaymentRow[]
}

export type FinancePaymentRow = {
  id: number
  amount: number
  currency?: string
  status: PaymentStatus
  provider: PaymentProvider
  course_name?: string | null
  payer_email?: string | null
  created_at: string
}

export type FinanceTransactionRow = {
  id: number
  label: string
  amount: number
  type: 'credit' | 'debit'
  status: PaymentStatus
  provider: PaymentProvider
  created_at: string
}

export type CouponDiscountType = 'percent' | 'fixed'

export type CouponRecord = {
  id: number
  code: string
  name: string
  discount_type: CouponDiscountType
  value: number
  max_uses: number | null
  uses_count: number
  starts_at: string | null
  ends_at: string | null
  applies_to: string
  active: boolean
}

export type ScholarshipType = 'full' | 'partial'
export type ScholarshipStatus = 'pending' | 'accepted' | 'rejected'

export type ScholarshipApplication = {
  id: number
  applicant_name: string
  email: string
  type: ScholarshipType
  discount_percent: number | null
  amount: number | null
  reason: string | null
  status: ScholarshipStatus
  created_at: string
}

export type CertificateStatus = 'draft' | 'pending_approval' | 'issued' | 'revoked'

export type CertificateRecord = {
  id: number
  student_name: string
  student_email?: string | null
  program_name?: string | null
  course_name?: string | null
  track_name?: string | null
  title: string
  certificate_type: string
  verification_code: string
  status: CertificateStatus
  issued_at: string | null
}

export type CertificateVerificationResult = {
  valid: boolean
  student_name?: string | null
  program_name?: string | null
  course_name?: string | null
  track_name?: string | null
  title?: string | null
  issued_at?: string | null
  verification_code?: string | null
  message?: string | null
}

export type QualityReviewStatus = 'draft' | 'submitted' | 'archived'

export type QualityReview = {
  id: number
  reviewable_label: string
  reviewer_name: string
  overall_score: number
  status: QualityReviewStatus
  reviewed_at: string | null
  objective_clarity?: number
  content_quality?: number
  instructor_score?: number
  organization_score?: number
  time_commitment?: number
  completion_score?: number
  output_quality?: number
  repeatability?: number
  notes?: string | null
  recommendations?: string | null
}

export type QualityReviewPayload = Omit<
  QualityReview,
  'id' | 'reviewer_name' | 'status' | 'reviewed_at' | 'reviewable_label'
> & {
  reviewable_label: string
}

export type KpiTabSlug =
  | 'overview'
  | 'education'
  | 'finance'
  | 'departments'
  | 'marketing'
  | 'partnerships'
  | 'hr'

export type KpiMetric = {
  id: string
  label: string
  value: string | number
  hint?: string
  trend?: 'up' | 'down' | 'flat'
  accent?: 'blue' | 'orange'
}

export type KpiTabData = {
  tab: KpiTabSlug
  metrics: KpiMetric[]
  highlights?: string[]
}

export type ReportTypeSlug =
  | 'program'
  | 'course'
  | 'workshop'
  | 'finance'
  | 'quality'
  | 'management'
  | 'partnership'
  | 'hr'

export type ReportRecord = {
  id: number
  title: string
  report_type: ReportTypeSlug
  related_label?: string | null
  created_at: string
  preview_summary?: string | null
}
