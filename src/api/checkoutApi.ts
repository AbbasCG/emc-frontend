import api from './axios'

/**
 * Callers show their own error toast (usually with the specific backend
 * message via getApiErrorMessage) — skipErrorToast prevents the axios
 * interceptor's global toast from firing a second, generic one alongside it.
 */
export async function initiateCheckout(courseId: number): Promise<{ checkout_url: string }> {
  const res = await api.post(`/courses/${courseId}/checkout`, undefined, { skipErrorToast: true })
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
