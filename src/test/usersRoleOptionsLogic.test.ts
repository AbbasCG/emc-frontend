import { describe, it, expect } from 'vitest'
import { AxiosError } from 'axios'
import {
  getAssignableRoleOptions,
  getOfferedSpecializedRole,
  unavailableSpecializedRole,
  roleOptionText,
  ROLE_NOT_ACTIVATED_HINT,
} from '@/pages/super-admin/users/assignableRoles'
import { parseRoleOptionSlugs } from '@/pages/super-admin/users/useServerRoleSlugs'
import {
  ADMIN_USER_INLINE_FIELDS,
  getAdminUserFieldErrors,
  getAdminUserMutationMessage,
} from '@/api/adminUsersApi'

const err422 = (errors: Record<string, string[]>) =>
  new AxiosError('x', '422', undefined, undefined, {
    status: 422,
    statusText: '',
    headers: {},
    config: {} as never,
    data: { message: 'The given data was invalid.', errors },
  })

describe('getAssignableRoleOptions with a server role list', () => {
  const server = new Set(['student', 'instructor', 'department_member'])

  it('keeps the static catalogue when the server list is unknown', () => {
    const opts = getAssignableRoleOptions(false, null, null)
    expect(opts.every((o) => !o.disabled && !o.hint)).toBe(true)
  })

  it('disables, with the hint, every catalogue role the server lacks and never lists super_admin without the policy', () => {
    const opts = getAssignableRoleOptions(false, null, server)
    const by = Object.fromEntries(opts.map((o) => [o.value, o]))
    expect(by.student.disabled).toBeUndefined()
    expect(by.partner).toMatchObject({ disabled: true, hint: ROLE_NOT_ACTIVATED_HINT })
    expect(roleOptionText(by.partner)).toBe('شريك — غير مفعّل في هذه البيئة')
    expect(by.super_admin).toBeUndefined()
  })

  it('never disables the current role, but still flags it', () => {
    const opts = getAssignableRoleOptions(false, 'partner', server)
    expect(opts.find((o) => o.value === 'partner')).toMatchObject({ hint: ROLE_NOT_ACTIVATED_HINT })
    expect(opts.find((o) => o.value === 'partner')?.disabled).toBeUndefined()
  })
})

describe('specialised manager auto-map against the server list', () => {
  const dept = { slug: 'human-resources', name_ar: 'إدارة الموارد البشرية' }

  it('applies only when the mapped role is offered', () => {
    expect(getOfferedSpecializedRole(dept, new Set(['hr_manager']))?.role).toBe('hr_manager')
    expect(getOfferedSpecializedRole(dept, new Set(['student']))).toBeNull()
    expect(getOfferedSpecializedRole(dept, null)?.role).toBe('hr_manager')
  })

  it('reports the mapped role as unavailable only when the server lacks it', () => {
    expect(unavailableSpecializedRole(dept, new Set(['student']))?.role).toBe('hr_manager')
    expect(unavailableSpecializedRole(dept, new Set(['hr_manager']))).toBeNull()
    expect(unavailableSpecializedRole(dept, null)).toBeNull()
  })
})

describe('parseRoleOptionSlugs', () => {
  it('reads `{ data: [{ value }] }` and a bare array, lower-cased', () => {
    expect([...(parseRoleOptionSlugs({ success: true, data: [{ value: 'Student', label: 'x' }, { value: 'admin' }] }) ?? [])]).toEqual([
      'student',
      'admin',
    ])
    expect([...(parseRoleOptionSlugs([{ value: 'partner' }]) ?? [])]).toEqual(['partner'])
  })

  it('returns null for anything that is not a list', () => {
    expect(parseRoleOptionSlugs({ success: true, data: {} })).toBeNull()
    expect(parseRoleOptionSlugs(null)).toBeNull()
  })
})

describe('422 field errors for the role / department inputs', () => {
  it('passes the server\'s Arabic role text through untouched', () => {
    const msg = 'الدور «department_member» معرَّف في النظام لكنه غير مُفعَّل في قاعدة بيانات هذه البيئة بعد.'
    expect(getAdminUserFieldErrors(err422({ role: [msg] }))).toEqual({ role: msg })
  })

  it('makes the old English message clear, per field', () => {
    expect(getAdminUserFieldErrors(err422({ role: ['The selected role is invalid.'] })).role).toBe('الدور المختار غير مقبول من الخادم.')
    expect(getAdminUserFieldErrors(err422({ department_id: ['The selected department id is invalid.'] })).department).toBe(
      'الإدارة المختارة غير مقبولة من الخادم.',
    )
  })

  it('reports only the fields the server returned, and nothing for non-422 or non-axios errors', () => {
    expect(getAdminUserFieldErrors(err422({ email: ['taken'] }))).toEqual({})
    expect(getAdminUserFieldErrors(new Error('x'))).toEqual({})
  })

  it('leaves the toast text out for inline fields: empty when only those failed, other fields otherwise', () => {
    expect(getAdminUserMutationMessage(err422({ role: ['The selected role is invalid.'] }), ADMIN_USER_INLINE_FIELDS)).toBe('')
    expect(
      getAdminUserMutationMessage(
        err422({ role: ['The selected role is invalid.'], email: ['The email has already been taken.'] }),
        ADMIN_USER_INLINE_FIELDS,
      ),
    ).toBe('البريد الإلكتروني: The email has already been taken.')
  })
})
