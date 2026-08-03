import api from './axios'

export interface CheckoutResult {
  success: boolean
  checkout_url: string | null
  /** true when a coupon reduced the price to €0 — enrollment is already complete, no Stripe redirect happens. */
  free: boolean
}

/**
 * Callers show their own error toast (usually with the specific backend
 * message via getApiErrorMessage) — skipErrorToast prevents the axios
 * interceptor's global toast from firing a second, generic one alongside it.
 */
export async function initiateCheckout(courseId: number, couponCode?: string | null): Promise<CheckoutResult> {
  const res = await api.post(
    `/courses/${courseId}/checkout`,
    couponCode ? { coupon_code: couponCode } : undefined,
    { skipErrorToast: true },
  )
  return res.data
}

export interface CouponPricingPreview {
  valid: true
  coupon: { code: string; name: string; discount_type: 'percentage' | 'fixed'; discount_value: number }
  pricing: {
    original_amount: number
    discount_amount: number
    final_amount: number
    currency: string
    formatted_original: string
    formatted_discount: string
    formatted_final: string
  }
}

/** Preview only — never consumes coupon usage. Re-validated again server-side at actual checkout. */
export async function validateCoupon(courseId: number, code: string): Promise<CouponPricingPreview> {
  const res = await api.post(`/courses/${courseId}/coupon/validate`, { code }, { skipErrorToast: true })
  return res.data
}

export async function getStudentOrders() {
  const res = await api.get('/student/orders')
  return res.data.data as Order[]
}

export async function getStudentOrder(orderId: number) {
  const res = await api.get(`/student/orders/${orderId}`)
  return res.data.data as Order
}

export async function getInvoiceDetails(invoiceId: number) {
  const res = await api.get(`/student/invoices/${invoiceId}/download`)
  return res.data
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'

export type Order = {
  id: number
  order_number: string
  type: string
  subtotal: number
  tax_amount: number
  total: number
  currency: string
  status: OrderStatus
  payment_provider: string
  provider_payment_intent_id: string | null
  paid_at: string | null
  created_at: string
  course?: { id: number; title: string; slug: string } | null
  user?: { id: number; name: string; email: string } | null
  invoice?: { id: number; invoice_number: string; issued_at: string } | null
}
