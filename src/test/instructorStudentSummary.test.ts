import { describe, it, expect } from 'vitest'
import {
  getCanonicalStudentIdentity,
  getCanonicalPlacement,
  getCanonicalClassAssignment,
  getCanonicalProgress,
} from '../api/normalizers/instructorStudentSummary'

describe('instructorStudentSummary compatibility adapter — canonical field priority', () => {
  it('prefers canonical student name over legacy top-level name', () => {
    const row = { student: { name: 'Canonical Name' }, name: 'Legacy Name' }
    expect(getCanonicalStudentIdentity(row).name).toBe('Canonical Name')
  })

  it('prefers canonical written score over conflicting legacy score', () => {
    const row = { placement: { written: { score: 80 } }, written_score: 55 }
    expect(getCanonicalPlacement(row).written_score).toBe(80)
  })

  it('prefers canonical oral score over conflicting legacy score', () => {
    const row = { placement: { oral: { score: 90 } }, oral_score: 40 }
    expect(getCanonicalPlacement(row).oral_score).toBe(90)
  })

  it('prefers canonical final level over conflicting legacy level', () => {
    const row = { placement: { final_level: 'C1' }, final_level: 'A2' }
    expect(getCanonicalPlacement(row).final_level).toBe('C1')
  })

  it('prefers canonical class-assignment status over legacy flags', () => {
    const row = { class_assignment: { status: 'assigned' }, is_assigned: false }
    expect(getCanonicalClassAssignment(row).is_assigned).toBe(true)
  })

  it('prefers canonical progress percentage over absent legacy value', () => {
    const row = { progress: { placement_progress: 42 } }
    expect(getCanonicalProgress(row).placement_progress).toBe(42)
  })

  it('does not mistake a canonical zero score for "missing"', () => {
    const row = { placement: { written: { score: 0 } }, written_score: 99 }
    expect(getCanonicalPlacement(row).written_score).toBe(0)
  })

  it('does not mistake a canonical false is_assigned for "missing"', () => {
    const row = { progress: { is_assigned: false } }
    expect(getCanonicalProgress(row).is_assigned).toBe(false)
  })

  it('does not mistake a canonical empty-string level for "missing"', () => {
    const row = { placement: { written: { level: '' } } }
    expect(getCanonicalPlacement(row).written_level).toBe('')
  })

  it('falls back to undefined (not a derived default) when canonical fields are absent', () => {
    const row = { written_score: 55 }
    expect(getCanonicalPlacement(row).written_score).toBeUndefined()
  })
})
