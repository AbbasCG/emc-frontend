import apiClient from './axios'

export async function submitWorkshopRequest(formData: FormData): Promise<void> {
  await apiClient.post('/workshop-requests', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
