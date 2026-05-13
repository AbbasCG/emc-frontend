import apiClient from './axios'
import { unwrapData } from './unwrap'

export async function fakeConfirmPayment(paymentId: number): Promise<unknown> {
  const res = await apiClient.post(`/payments/fake/confirm/${paymentId}`)
  return unwrapData(res.data)
}

export async function fakeFailPayment(paymentId: number): Promise<unknown> {
  const res = await apiClient.post(`/payments/fake/fail/${paymentId}`)
  return unwrapData(res.data)
}
