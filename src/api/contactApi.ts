import apiClient from './axios'

export async function submitContactMessage(payload: {
  name: string
  email: string
  phone?: string
  subject?: string
  category?: string
  message: string
}): Promise<void> {
  await apiClient.post('/contact', payload)
}
