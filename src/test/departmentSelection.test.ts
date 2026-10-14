import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readRememberedDepartment, rememberDepartment, resolveDepartmentSelection } from '@/utils/departmentSelection'

const dept = (...ids: number[]) => ids.map((id) => ({ id }))

describe('resolveDepartmentSelection', () => {
  it('1. exactly one authorized department: that one, whatever else is known', () => {
    expect(resolveDepartmentSelection({ readable: dept(7) })).toEqual({ id: 7, source: 'single' })
    expect(resolveDepartmentSelection({ readable: dept(7), primaryId: 99, rememberedId: 98 })).toEqual({ id: 7, source: 'single' })
  })

  it('2. several with a reliable primary: the primary, ahead of a remembered choice', () => {
    expect(resolveDepartmentSelection({ readable: dept(3, 5, 8), primaryId: 5, rememberedId: 8 })).toEqual({ id: 5, source: 'primary' })
  })

  it('2b. a primary the user may not read is not reliable, so it is ignored', () => {
    expect(resolveDepartmentSelection({ readable: dept(3, 5), primaryId: 40 })).toEqual({ id: null, source: 'choose' })
  })

  it('3. several, no default: the remembered department, if it is still authorized', () => {
    expect(resolveDepartmentSelection({ readable: dept(3, 5, 8), rememberedId: 8 })).toEqual({ id: 8, source: 'restored' })
  })

  it('3b. a remembered department the user no longer has is ignored', () => {
    expect(resolveDepartmentSelection({ readable: dept(3, 5, 8), rememberedId: 12 })).toEqual({ id: null, source: 'choose' })
  })

  it('4. several and nothing to go on: never the first one the API returned, the user chooses', () => {
    const r = resolveDepartmentSelection({ readable: dept(3, 5, 8) })
    expect(r).toEqual({ id: null, source: 'choose' })
    expect(r.id).not.toBe(3)
  })

  it('5. none: nothing to show', () => {
    expect(resolveDepartmentSelection({ readable: [], primaryId: 1, rememberedId: 2 })).toEqual({ id: null, source: 'none' })
  })
})

describe('remembered department', () => {
  beforeEach(() => localStorage.clear())

  it('is kept per user and cleared with null', () => {
    rememberDepartment(1, 5)
    rememberDepartment(2, 9)
    expect(readRememberedDepartment(1)).toBe(5)
    expect(readRememberedDepartment(2)).toBe(9)

    rememberDepartment(1, null)
    expect(readRememberedDepartment(1)).toBeNull()
    expect(readRememberedDepartment(2)).toBe(9)
  })

  it('ignores a corrupt value and missing user', () => {
    localStorage.setItem('emc.admin.department.1', 'abc')
    expect(readRememberedDepartment(1)).toBeNull()
    expect(readRememberedDepartment(null)).toBeNull()
    expect(readRememberedDepartment(undefined)).toBeNull()
  })

  it('survives blocked storage', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readRememberedDepartment(1)).toBeNull()
    spy.mockRestore()
  })
})
