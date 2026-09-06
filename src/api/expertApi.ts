import apiClient from './axios'

export interface ExpertApplicationPayload {
  full_name: string
  country: string
  city: string
  whatsapp_number: string
  email: string
  linkedin_url?: string

  primary_specialty: string
  academic_qualification: string
  current_employer?: string
  job_title: string
  years_of_experience: string

  expertise_fields: string[]
  expertise_level: string
  tools_technologies: string

  contribution_roles: string[]

  trainer_fields?: string[]
  trainer_program_types?: string[]
  trainer_target_audiences?: string[]
  trainer_delivery_mode?: string[]
  trainer_has_experience?: boolean
  trainer_years_experience?: string
  trainer_previous_courses?: string
  trainer_content_readiness?: string

  expert_specialty_areas?: string
  expert_contribution_types?: string[]
  expert_achievements?: string
  expert_has_certifications?: boolean
  expert_certifications_details?: string

  consultant_fields?: string[]
  consultant_types?: string[]
  consultant_previous_clients?: string
  consultant_target_clients?: string[]

  events_types?: string[]
  events_contribution_areas?: string[]
  events_previous_events?: string

  mentor_fields?: string[]
  mentor_target_audiences?: string[]
  mentor_session_types?: string[]

  evaluator_fields?: string[]
  evaluator_types?: string[]

  participant_project_types?: string[]
  participant_contribution_method?: string

  availability_times: string[]
  availability_level: string
  collaboration_preferences: string[]

  bio: string
  unique_value: string

  agree_to_contact: boolean
  agree_to_store_data: boolean
}

export async function submitExpertApplication(payload: ExpertApplicationPayload): Promise<{ uuid: string }> {
  const res = await apiClient.post<{ success: boolean; uuid: string }>('/expert-applications', payload)
  return res.data
}
