import { describe, expect, it } from 'vitest'
import { assessmentLegacyFields } from '@/utils/volunteerApplyLegacyFields'

/**
 * The assessment form must never send an answer the applicant did not give: the server stores a missing answer as NULL,
 * and the HR screens show it as "—" instead of an invented sentence.
 */

const form = {
  personal_skills: ['تصميم', 'مونتاج'],
  volunteer_days_availability: 'أيام الإجازة فقط',
  volunteering_organizations: 'جمعية الخير',
}

describe('assessmentLegacyFields', () => {
  it('copies only answers that mean the same thing', () => {
    expect(assessmentLegacyFields(form)).toEqual({
      skills: 'تصميم, مونتاج',
      availability: 'أيام الإجازة فقط',
      previous_experience: 'جمعية الخير',
    })
  })

  it('never sends an experience level or a motivation, so they stay unanswered', () => {
    const fields: object = assessmentLegacyFields(form)
    expect(fields).not.toHaveProperty('experience_level')
    expect(fields).not.toHaveProperty('motivation')
  })

  it('invents nothing for a question that was left out', () => {
    const fields = assessmentLegacyFields({ personal_skills: [], volunteer_days_availability: '', volunteering_organizations: '' })

    expect(fields.previous_experience).toBeUndefined()
    const sent = JSON.stringify(fields)
    for (const invented of ['غير محدد', 'مرن', 'الرغبة في المساهمة في خدمة المجتمع']) expect(sent).not.toContain(invented)
  })
})
