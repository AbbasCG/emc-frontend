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
  payment_method?: string | null
  // student
  student_name?: string | null
  student_email?: string | null
  student_phone?: string | null
  student_avatar?: string | null
  // item
  item_title?: string | null
  item_type?: 'course' | 'workshop' | 'learning_path' | string | null
  // legacy compat
  course_name?: string | null
  payer_email?: string | null
  // order
  order_number?: string | null
  invoice_number?: string | null
  order_id?: number | null
  registration_id?: number | null
  confirmed_at?: string | null
  receipt_url?: string | null
  created_at: string
}

export type FinanceOrder = {
  id: number
  order_number: string
  type?: string | null
  subtotal?: number | null
  tax_amount?: number | null
  total: number
  currency: string
  status: string
  payment_provider?: string | null
  paid_at?: string | null
  created_at: string
  updated_at?: string | null
  course?: { id: number; title: string; slug?: string } | null
  user?: {
    id?: number
    name?: string | null
    email?: string | null
    phone?: string | null
    phone_country_code?: string | null
    city?: string | null
    country?: string | null
    avatar_url?: string | null
  } | null
  invoice?: { id: number; invoice_number: string; issued_at: string } | null
}

export type FinanceInvoice = {
  id: number
  invoice_number: string
  issued_at?: string | null
  order_number?: string | null
  total?: number | null
  currency: string
  status?: string | null
  course_title?: string | null
  student_name?: string | null
  student_email?: string | null
  has_pdf?: boolean
}

export type FinanceAccount = {
  id: number
  name: string
  type: string
  currency: string
  opening_balance: number
  current_balance: number
  notes?: string | null
  is_active: boolean
  created_at?: string
}

export type FinanceAccountTransaction = {
  id: number
  finance_account_id: number
  type: string
  category?: string | null
  amount: number
  currency: string
  status: string
  description?: string | null
  payment_method?: string | null
  transaction_date: string
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
