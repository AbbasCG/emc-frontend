import { describe, expect, it } from 'vitest'
import {
  getSpecializedRoleForDepartment,
  isSpecializedManagerRole,
  getAssignableRoleOptions,
  adminRoleLabelAr,
  ALL_SPECIALIZED_MANAGER_ROLES,
} from '@/pages/super-admin/users/assignableRoles'

describe('Specialized Department Role Auto-Link', () => {
  it('maps all official department slugs and names to their correct specialized manager role', () => {
    // HR
    expect(getSpecializedRoleForDepartment({ slug: 'human-resources', name_ar: 'إدارة الموارد البشرية' })).toEqual({
      role: 'hr_manager',
      labelAr: 'مدير الموارد البشرية',
    })
    expect(getSpecializedRoleForDepartment('إدارة الموارد البشرية')).toEqual({
      role: 'hr_manager',
      labelAr: 'مدير الموارد البشرية',
    })

    // Finance
    expect(getSpecializedRoleForDepartment({ slug: 'finance', name_ar: 'الإدارة المالية' })).toEqual({
      role: 'finance_manager',
      labelAr: 'مدير مالي',
    })

    // Programs
    expect(getSpecializedRoleForDepartment({ slug: 'programs-tracks', name_ar: 'إدارة البرامج والمسارات' })).toEqual({
      role: 'programs_manager',
      labelAr: 'مدير البرامج والمسارات',
    })

    // Operations
    expect(getSpecializedRoleForDepartment({ slug: 'operations', name_ar: 'إدارة التشغيل والعمليات' })).toEqual({
      role: 'operations_manager',
      labelAr: 'مدير العمليات والتشغيل',
    })

    // Marketing
    expect(getSpecializedRoleForDepartment({ slug: 'marketing-media', name_ar: 'إدارة الإعلام والتسويق' })).toEqual({
      role: 'marketing_manager',
      labelAr: 'مدير التسويق',
    })

    // Partnerships
    expect(getSpecializedRoleForDepartment({ slug: 'partnerships', name_ar: 'إدارة الشراكات والعلاقات العامة' })).toEqual({
      role: 'partnerships_manager',
      labelAr: 'مدير الشراكات والعلاقات',
    })

    // Quality
    expect(getSpecializedRoleForDepartment({ slug: 'quality-governance', name_ar: 'إدارة الجودة والحوكمة' })).toEqual({
      role: 'quality_manager',
      labelAr: 'مدير الجودة',
    })

    // Community
    expect(getSpecializedRoleForDepartment({ slug: 'community-health', name_ar: 'إدارة المجتمع والصحة النفسية والوعي' })).toEqual({
      role: 'community_manager',
      labelAr: 'مدير الصحة النفسية والوعي',
    })

    // Technology
    expect(getSpecializedRoleForDepartment({ slug: 'technology', name_ar: 'إدارة التقنية والدعم الفني' })).toEqual({
      role: 'tech_admin',
      labelAr: 'مدير التقنية',
    })

    // AI
    expect(getSpecializedRoleForDepartment({ slug: 'ai-digital-transformation', name_ar: 'إدارة الذكاء الاصطناعي والتحول الرقمي' })).toEqual({
      role: 'ai_manager',
      labelAr: 'مدير الذكاء الاصطناعي',
    })
    expect(getSpecializedRoleForDepartment({ slug: 'ai-transformation', name_ar: 'إدارة الذكاء الاصطناعي' })).toEqual({
      role: 'ai_manager',
      labelAr: 'مدير الذكاء الاصطناعي',
    })

    // Strategy & Planning
    expect(getSpecializedRoleForDepartment({ slug: 'strategy-planning', name_ar: 'إدارة الاستراتيجية والتخطيط المؤسسي' })).toEqual({
      role: 'strategy_planning_manager',
      labelAr: 'مدير الاستراتيجية والتخطيط المؤسسي',
    })

    // Digital Ambassadors
    expect(getSpecializedRoleForDepartment({ slug: 'digital-ambassadors', name_ar: 'إدارة سفراء التحول الرقمي' })).toEqual({
      role: 'digital_ambassadors_manager',
      labelAr: 'مدير سفراء التحول الرقمي',
    })

    // Advisors
    expect(getSpecializedRoleForDepartment({ slug: 'advisors', name_ar: 'إدارة الاستشارات والمستشارين' })).toEqual({
      role: 'advisors_manager',
      labelAr: 'مدير الاستشارات والمستشارين',
    })

    // Executive Management
    expect(getSpecializedRoleForDepartment({ slug: 'executive-management', name_ar: 'الإدارة العليا' })).toEqual({
      role: 'executive_admin',
      labelAr: 'مشرف تنفيذي',
    })
  })

  it('correctly identifies specialized manager roles', () => {
    expect(isSpecializedManagerRole('department_manager')).toBe(true)
    for (const r of ALL_SPECIALIZED_MANAGER_ROLES) {
      expect(isSpecializedManagerRole(r)).toBe(true)
    }
    expect(isSpecializedManagerRole('student')).toBe(false)
    expect(isSpecializedManagerRole('instructor')).toBe(false)
    expect(isSpecializedManagerRole('volunteer')).toBe(false)
    expect(isSpecializedManagerRole('department_member')).toBe(false)
    expect(isSpecializedManagerRole(null)).toBe(false)
    expect(isSpecializedManagerRole(undefined)).toBe(false)
  })

  it('includes extra current specialized roles in role options when present', () => {
    const withoutExtra = getAssignableRoleOptions(false)
    expect(withoutExtra.some((o) => o.value === 'hr_manager')).toBe(false)

    const withExtra = getAssignableRoleOptions(false, 'hr_manager')
    expect(withExtra.some((o) => o.value === 'hr_manager')).toBe(true)
    const hrOption = withExtra.find((o) => o.value === 'hr_manager')
    expect(hrOption?.labelAr).toBe('مدير الموارد البشرية')
  })

  it('provides correct Arabic labels for all roles via adminRoleLabelAr', () => {
    expect(adminRoleLabelAr('hr_manager')).toBe('مدير الموارد البشرية')
    expect(adminRoleLabelAr('finance_manager')).toBe('مدير مالي')
    expect(adminRoleLabelAr('ai_manager')).toBe('مدير الذكاء الاصطناعي')
    expect(adminRoleLabelAr('department_member')).toBe('عضو إدارة / فريق')
  })

  it('correctly filters users when role = department_manager and department = specific department', async () => {
    const { filterUsersClientSide } = await import('@/api/adminUsersApi')

    const mockUsers = [
      { id: 1, name: 'سارة أحمد', email: 'sara@example.com', role: 'hr_manager', department: 'إدارة الموارد البشرية', is_active: true },
      { id: 2, name: 'خالد محمد', email: 'khaled@example.com', role: 'finance_manager', department: 'إدارة الشؤون المالية', is_active: true },
      { id: 3, name: 'علي حسن', email: 'ali@example.com', role: 'department_member', department: 'إدارة الموارد البشرية', is_active: true },
      { id: 4, name: 'منى عمر', email: 'mona@example.com', role: 'student', department: null, is_active: true },
      { id: 5, name: 'عبدالله يوسف', email: 'abdullah@example.com', role: 'department_manager', department: 'إدارة الموارد البشرية', is_active: true },
    ]

    // 1. Filter by role = department_manager alone matches hr_manager, finance_manager, and department_manager
    const allManagers = filterUsersClientSide(mockUsers, { role: 'department_manager' })
    expect(allManagers.map((u) => u.id)).toEqual([1, 2, 5])

    // 2. Filter by role = department_manager AND department = 'إدارة الموارد البشرية'
    const hrManagers = filterUsersClientSide(mockUsers, {
      role: 'department_manager',
      department: 'إدارة الموارد البشرية',
    })
    expect(hrManagers.map((u) => u.id)).toEqual([1, 5])

    // 3. Department matching works even without prefix 'إدارة '
    const hrManagersClean = filterUsersClientSide(mockUsers, {
      role: 'department_manager',
      department: 'الموارد البشرية',
    })
    expect(hrManagersClean.map((u) => u.id)).toEqual([1, 5])

    // 4. Filter by role = department_member AND department = 'إدارة الموارد البشرية'
    const hrMembers = filterUsersClientSide(mockUsers, {
      role: 'department_member',
      department: 'إدارة الموارد البشرية',
    })
    expect(hrMembers.map((u) => u.id)).toEqual([3])
  })
})
