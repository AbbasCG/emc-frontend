import apiClient from './axios'

export interface TrainerApplicationPayload {
  // أولاً: البيانات الشخصية
  full_name: string
  phone_or_whatsapp: string
  email: string
  linkedin_url?: string

  // ثانياً: التخصص والخبرة
  primary_specialty: string
  years_of_experience: string
  has_training_experience: boolean

  // ثالثاً: مجالات التدريب
  ai_training_fields: string[]
  other_ai_field?: string
  training_program_types: string[]
  target_audiences: string[]

  // رابعاً: آلية التعاون والتسعير
  delivery_mode: string
  hourly_rate?: number | null
  currency: string
  currency_other?: string
  additional_notes?: string
}

export async function submitTrainerApplication(payload: TrainerApplicationPayload): Promise<{ success: boolean; uuid: string; message?: string }> {
  const res = await apiClient.post<{ success: boolean; uuid: string; message?: string }>('/trainer-applications', payload, {
    // Avoid double toast since TrainerApply has its own dedicated error handler
    skipErrorToast: true,
  } as any)
  return res.data
}
