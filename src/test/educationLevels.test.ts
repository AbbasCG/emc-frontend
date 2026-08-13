import { describe, it, expect } from 'vitest'
import {
  EDUCATION_LEVELS,
  educationFromFormState,
  educationToFormState,
  getEducationLabel,
} from '@/data/educationLevels'

describe('educationLevels', () => {
  it('exposes the full canonical option list', () => {
    expect(EDUCATION_LEVELS.map((e) => e.value)).toEqual([
      'none', 'primary', 'middle_school', 'high_school', 'diploma', 'higher_diploma',
      'bachelor', 'master', 'doctorate', 'fellowship_board', 'professional_certificate',
      'university_student', 'other',
    ])
  })

  it('maps canonical codes to Arabic labels', () => {
    expect(getEducationLabel('bachelor')).toBe('بكالوريوس')
    expect(getEducationLabel('master')).toBe('ماجستير')
  })

  it('preserves unknown legacy free-text values', () => {
    expect(getEducationLabel('دبلوم تقني خاص')).toBe('دبلوم تقني خاص')
  })

  it('hydrates select state from codes, labels, and legacy text', () => {
    expect(educationToFormState('bachelor')).toEqual({ select: 'bachelor', other: '' })
    expect(educationToFormState('بكالوريوس')).toEqual({ select: 'bachelor', other: '' })
    expect(educationToFormState('مؤهل نادر')).toEqual({ select: 'other', other: 'مؤهل نادر' })
  })

  it('serializes other with custom text', () => {
    expect(educationFromFormState('bachelor', '')).toBe('bachelor')
    expect(educationFromFormState('other', 'شهادة دولية')).toBe('شهادة دولية')
    expect(educationFromFormState('other', '  ')).toBe('other')
  })
})
