import apiClient from './axios'

/**
 * Payment reconciliation cases: confirmed payments whose enrollment was withheld (the payer teaches what they paid for).
 * The platform never moves money here. A case is settled by deciding the ENROLLMENT; a refund, when due, is made outside the
 * platform and only tracked as a to-do (`refund_status: 'pending'`). No payment is ever marked refunded.
 */

export type ReconciliationStatus = 'open' | 'resolved'
export type ReconciliationResolution = 'enrollment_activated' | 'closed_without_enrollment'

export type ReconciliationCase = {
  id: number
  status: ReconciliationStatus
  reason: string
  created_at: string | null
  user: { id: number; name: string; email: string } | null
  program: { type: 'course' | 'workshop' | 'learning_path'; id: number | null; title: string | null; slug: string | null } | null
  payment: {
    id: number
    amount: number
    currency: string
    status: string
    provider: string | null
    payment_method: string | null
    provider_reference: string | null
    confirmed_at: string | null
  } | null
  order: { id: number; number: string | null; status: string | null } | null
  invoice: { id: number; number: string | null } | null
  registration: { id: number; status: string } | null
  actions: ReconciliationResolution[]
  /** Open cases only: true while the payer still teaches the program, i.e. activating the enrollment would be refused. */
  conflict_still_present: boolean | null
  resolution: ReconciliationResolution | null
  resolution_note: string | null
  resolved_at: string | null
  resolved_by: { id: number; name: string } | null
  /** `pending` = money is owed back and must be returned outside the platform. Never means "refunded". */
  refund_status: 'pending' | null
}

export type ReconciliationSummary = { open: number; resolved: number; refund_pending: number }

export type ReconciliationPage = {
  rows: ReconciliationCase[]
  summary: ReconciliationSummary
  total: number
  currentPage: number
  lastPage: number
}

export type ReconciliationFilter = { status?: ReconciliationStatus; refund?: 'pending'; q?: string; page?: number }

const EMPTY: ReconciliationSummary = { open: 0, resolved: 0, refund_pending: 0 }

export async function fetchReconciliations(filter: ReconciliationFilter = {}): Promise<ReconciliationPage> {
  const params: Record<string, string | number> = {}
  if (filter.status) params.status = filter.status
  if (filter.refund) params.refund = filter.refund
  if (filter.q?.trim()) params.q = filter.q.trim()
  if (filter.page && filter.page > 1) params.page = filter.page

  const res = await apiClient.get<{
    data?: ReconciliationCase[]
    meta?: { total?: number; current_page?: number; last_page?: number }
    summary?: Partial<ReconciliationSummary>
  }>('/finance/payment-reconciliations', { params, skipErrorToast: true })

  const body = res.data ?? {}
  return {
    rows: Array.isArray(body.data) ? body.data : [],
    summary: { ...EMPTY, ...(body.summary ?? {}) },
    total: Number(body.meta?.total ?? 0),
    currentPage: Number(body.meta?.current_page ?? 1),
    lastPage: Number(body.meta?.last_page ?? 1),
  }
}

export type ResolveReconciliationInput = {
  resolution: ReconciliationResolution
  /** Mandatory internal note (at least 5 characters). */
  note: string
  /** Only when closing without enrollment: money is owed back and will be returned outside the platform. A to-do marker only. */
  refundRequired?: boolean
}

export async function resolveReconciliation(id: number, input: ResolveReconciliationInput): Promise<ReconciliationCase> {
  const res = await apiClient.post<{ data: ReconciliationCase }>(
    `/finance/payment-reconciliations/${id}/resolve`,
    {
      resolution: input.resolution,
      note: input.note.trim(),
      ...(input.resolution === 'closed_without_enrollment' && input.refundRequired ? { refund_required: true } : {}),
    },
    { skipErrorToast: true },
  )

  return res.data.data
}
