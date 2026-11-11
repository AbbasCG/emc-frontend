/**
 * The five-level assessment form still has to fill a few older fields of POST /volunteer-requests that HR screens and
 * volunteer matching read. Only answers that mean the same thing are copied across:
 *
 *  - the skills the applicant picked        → `skills`
 *  - how available the applicant says they are (the form's own availability question) → `availability`
 *  - the organisations they volunteered with → `previous_experience`
 *
 * Deliberately NOT copied, so the server stores "no answer" (NULL) instead of an answer nobody gave:
 *  - the education level is not an experience level (it has its own `education_level` field);
 *  - "what can you add" is not the reason for volunteering (it has its own `value_add_contributions` field);
 *  - no stock sentence or "غير محدد" is sent for a question that was left out.
 */
export interface AssessmentAnswers {
  personal_skills: string[]
  volunteer_days_availability: string
  volunteering_organizations: string
}

export interface AssessmentLegacyFields {
  skills: string
  availability: string
  previous_experience: string | undefined
}

export function assessmentLegacyFields(form: AssessmentAnswers): AssessmentLegacyFields {
  return {
    skills: form.personal_skills.join(', '),
    availability: form.volunteer_days_availability,
    previous_experience: form.volunteering_organizations || undefined,
  }
}
