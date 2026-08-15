import { describe, it, expect } from 'vitest'
import {
  DASHBOARD_NAMESPACE_RULES,
  EMC_DASHBOARD_ROLES,
  canAccessDashboardPath,
  getAllowedRolesForPath,
  getDashboardPathByRole,
  getPostLoginRedirect,
  normalizeRole,
} from '@/utils/dashboardAccess'

/**
 * Complements `dashboardAccess.test.ts` — covers the alias table, the granular
 * manager sub-namespaces, prefix-boundary safety and the redirect edge cases.
 */

describe('normalizeRole — جدول المرادفات (aliases)', () => {
  it('يوحّد كتابات super_admin المختلفة', () => {
    expect(normalizeRole('superadmin')).toBe('super_admin')
    expect(normalizeRole('super-admin')).toBe('super_admin')
    expect(normalizeRole('Super Admin')).toBe('super_admin')
    expect(normalizeRole('SUPER_ADMIN')).toBe('super_admin')
  })

  it('يوسّع الاختصارات القديمة إلى الأدوار الكاملة', () => {
    expect(normalizeRole('finance')).toBe('finance_manager')
    expect(normalizeRole('HR')).toBe('hr_manager')
  })

  it('يوحّد كل كتابات مدير القسم', () => {
    expect(normalizeRole('dept_manager')).toBe('department_manager')
    expect(normalizeRole('Dept. Manager')).toBe('department_manager')
    expect(normalizeRole('DepartmentManager')).toBe('department_manager')
  })

  it('يستبدل أي فراغات متتالية بشرطة سفلية واحدة', () => {
    expect(normalizeRole('  quality   manager  ')).toBe('quality_manager')
    expect(normalizeRole('support\tagent')).toBe('support_agent')
  })

  it('يمرّر الأدوار غير المعروفة كما هي بعد التطبيع', () => {
    expect(normalizeRole('Ghost Role')).toBe('ghost_role')
  })
})

describe('getDashboardPathByRole — بقية الأدوار', () => {
  it('يعيد الصفحة الرئيسية الصحيحة للأدوار الإدارية والتشغيلية', () => {
    expect(getDashboardPathByRole('tech_admin')).toBe('/dashboard/tech-admin')
    expect(getDashboardPathByRole('executive_admin')).toBe('/dashboard/executive')
    expect(getDashboardPathByRole('quality_manager')).toBe('/dashboard/quality')
    expect(getDashboardPathByRole('marketing_manager')).toBe('/dashboard/marketing')
    expect(getDashboardPathByRole('support_agent')).toBe('/dashboard/support')
    expect(getDashboardPathByRole('volunteer')).toBe('/dashboard/ops/volunteers')
    expect(getDashboardPathByRole('department_manager')).toBe('/dashboard/department')
    expect(getDashboardPathByRole('programs_manager')).toBe('/dashboard/programs-manager')
    expect(getDashboardPathByRole('operations_manager')).toBe('/dashboard/operations-manager')
    expect(getDashboardPathByRole('partnerships_manager')).toBe('/dashboard/partnerships-manager')
    expect(getDashboardPathByRole('community_manager')).toBe('/dashboard/community-manager')
    expect(getDashboardPathByRole('section_lead')).toBe('/dashboard/section-lead')
  })

  it('يقبل المرادفات كما يقبل الأسماء القانونية', () => {
    expect(getDashboardPathByRole('finance')).toBe('/dashboard/finance')
    expect(getDashboardPathByRole('  SuperAdmin ')).toBe('/dashboard/super-admin')
  })

  it('كل دور معتمد يملك صفحة رئيسية يستطيع الوصول إليها فعلاً', () => {
    for (const role of EMC_DASHBOARD_ROLES) {
      const home = getDashboardPathByRole(role)
      expect(home).not.toBe('/dashboard/profile')
      expect(canAccessDashboardPath(role, home)).toBe(true)
    }
  })
})

describe('DASHBOARD_NAMESPACE_RULES', () => {
  it('مرتّبة من الأطول إلى الأقصر حتى تفوز القاعدة الأدق أولاً', () => {
    for (let i = 1; i < DASHBOARD_NAMESPACE_RULES.length; i++) {
      expect(DASHBOARD_NAMESPACE_RULES[i - 1]!.prefix.length).toBeGreaterThanOrEqual(
        DASHBOARD_NAMESPACE_RULES[i]!.prefix.length,
      )
    }
  })
})

describe('getAllowedRolesForPath — المسارات العامة وخارج اللوحة', () => {
  it('يعتبر مسارات التطبيق المشتركة متاحة لأي مستخدم مسجّل', () => {
    expect(getAllowedRolesForPath('/ai')).toBe('authenticated')
    expect(getAllowedRolesForPath('/ai/chat')).toBe('authenticated')
    expect(getAllowedRolesForPath('/documents/contracts/9')).toBe('authenticated')
    expect(getAllowedRolesForPath('/calendar/2026-07')).toBe('authenticated')
  })

  it('لا يقيّد المسارات العامة خارج اللوحة', () => {
    expect(getAllowedRolesForPath('/courses')).toBe('authenticated')
    expect(getAllowedRolesForPath('/')).toBe('authenticated')
  })

  it('يتيح جذر اللوحة وصفحات الحساب لأي دور', () => {
    expect(getAllowedRolesForPath('/dashboard')).toBe('authenticated')
    expect(getAllowedRolesForPath('/dashboard/profile/edit')).toBe('authenticated')
    expect(getAllowedRolesForPath('/dashboard/settings')).toBe('authenticated')
    expect(getAllowedRolesForPath('/dashboard/members')).toBe('authenticated')
    expect(getAllowedRolesForPath('/dashboard/members/12')).toBe('authenticated')
  })
})

describe('getAllowedRolesForPath — مساحات المديرين الدقيقة', () => {
  it('قاعدة البرامج الدقيقة تفوز على قاعدة الإدارة العامة', () => {
    expect(getAllowedRolesForPath('/dashboard/admin/programs')).toEqual([
      'admin',
      'super_admin',
      'programs_manager',
    ])
    // tech_admin يملك القاعدة العامة لكنه ليس ضمن القاعدة الدقيقة
    expect(getAllowedRolesForPath('/dashboard/admin/programs')).not.toContain('tech_admin')
    expect(getAllowedRolesForPath('/dashboard/admin')).toContain('tech_admin')
  })

  it('التسجيلات تشمل tech_admin بينما التقارير تشمل مديري الأقسام', () => {
    expect(getAllowedRolesForPath('/dashboard/admin/registrations')).toContain('tech_admin')
    expect(getAllowedRolesForPath('/dashboard/admin/reports')).toEqual(
      expect.arrayContaining(['programs_manager', 'operations_manager', 'partnerships_manager', 'community_manager']),
    )
  })

  it('طلبات الشراكة والمتطوعين والعمليات لكل مدير مختصّ', () => {
    expect(getAllowedRolesForPath('/dashboard/admin/partnership-requests')).toContain('partnerships_manager')
    expect(getAllowedRolesForPath('/dashboard/admin/volunteers')).toContain('community_manager')
    expect(getAllowedRolesForPath('/dashboard/admin/operations')).toContain('operations_manager')
    expect(getAllowedRolesForPath('/dashboard/admin/departments')).not.toContain('community_manager')
  })

  it('طلبات الورش مفتوحة لكل الأدوار الإدارية دون الطلاب والمدرّبين', () => {
    const allowed = getAllowedRolesForPath('/dashboard/admin/workshop-requests')
    expect(allowed).toEqual(expect.arrayContaining(['quality_manager', 'support_agent', 'hr_manager']))
    expect(allowed).not.toContain('student')
    expect(allowed).not.toContain('instructor')
    expect(allowed).not.toContain('partner')
    expect(getAllowedRolesForPath('/dashboard/admin/workshop-requests/12')).toEqual(allowed)
  })

  it('اعتماد البرامج المالية مشترك بينما بقية مساحة المالية حصرية', () => {
    expect(getAllowedRolesForPath('/dashboard/finance/program-approvals')).toContain('admin')
    expect(getAllowedRolesForPath('/dashboard/finance/reports')).toEqual(['finance_manager'])
  })

  it('الطلبات المالية للأقسام متاحة لأي مستخدم مسجّل (القيد على الخادم)', () => {
    expect(getAllowedRolesForPath('/dashboard/department/financial-requests')).toBe('authenticated')
    expect(getAllowedRolesForPath('/dashboard/department/financial-requests/4')).toBe('authenticated')
    expect(getAllowedRolesForPath('/dashboard/department/teams')).toEqual(['department_manager'])
  })

  it('يفرّق بين إدارة المتطوعين ولوحة المتطوّع نفسه', () => {
    expect(getAllowedRolesForPath('/dashboard/volunteer')).toEqual(
      expect.arrayContaining(['hr_manager', 'admin']),
    )
    expect(getAllowedRolesForPath('/dashboard/volunteer')).not.toContain('volunteer')
    expect(getAllowedRolesForPath('/dashboard/ops/volunteers')).toEqual(['volunteer'])
  })
})

describe('getAllowedRolesForPath — مسارات التعلّم والمحتوى', () => {
  it('إدارة محتوى الدورة للإدارة والمدرّب لا للطالب', () => {
    const allowed = getAllowedRolesForPath('/dashboard/courses/12/content')
    expect(allowed).toEqual(expect.arrayContaining(['instructor', 'admin', 'programs_manager']))
    expect(allowed).not.toContain('student')
    expect(getAllowedRolesForPath('/dashboard/courses/12/content/lessons/3')).not.toContain('student')
  })

  it('مسارات التعلّم الأخرى للطالب', () => {
    expect(getAllowedRolesForPath('/dashboard/courses/12/modules')).toEqual(['student'])
    expect(getAllowedRolesForPath('/dashboard/lessons/5')).toEqual(['student'])
    expect(getAllowedRolesForPath('/dashboard/quizzes/5')).toEqual(['student'])
    expect(getAllowedRolesForPath('/dashboard/certificates/7')).toEqual(['student'])
    expect(getAllowedRolesForPath('/dashboard/learning')).toEqual(['student'])
  })

  it('قائمة الدورات المختصرة إدارية وليست مسار تعلّم للطالب', () => {
    expect(getAllowedRolesForPath('/dashboard/courses')).toEqual(['admin', 'super_admin'])
    expect(canAccessDashboardPath('student', '/dashboard/courses')).toBe(false)
    expect(canAccessDashboardPath('student', '/dashboard/courses/12')).toBe(true)
  })

  it('مركز الموارد / مكتبة الدورات — أدوار الموظفين الداخليين فقط', () => {
    const allowed = getAllowedRolesForPath('/dashboard/resources/courses')
    expect(allowed).toEqual(expect.arrayContaining([
      'super_admin',
      'tech_admin',
      'executive_admin',
      'admin',
      'programs_manager',
      'instructor',
      'marketing_manager',
      'support_agent',
      'hr_manager',
      'quality_manager',
      'finance_manager',
      'operations_manager',
      'partnerships_manager',
      'community_manager',
      'volunteer',
    ]))
    expect(allowed).not.toContain('student')
    expect(allowed).not.toContain('partner')
    expect(canAccessDashboardPath('programs_manager', '/dashboard/resources/courses')).toBe(true)
    expect(canAccessDashboardPath('student', '/dashboard/resources/courses')).toBe(false)
    expect(canAccessDashboardPath(null, '/dashboard/resources/courses')).toBe(false)
  })

  it('الاختصارات الإدارية الواسعة تُطابق بالمسار التام فقط', () => {
    expect(getAllowedRolesForPath('/dashboard/users')).toEqual(['admin', 'super_admin'])
    expect(getAllowedRolesForPath('/dashboard/reports')).toEqual(['admin', 'super_admin'])
    // لا توجد مسارات فرعية معرّفة تحت هذه الاختصارات، لذلك لا تُمنح لأي دور
    expect(getAllowedRolesForPath('/dashboard/users/5')).toEqual([])
  })

  it('يعيد قائمة فارغة لمسار لوحة غير معروف', () => {
    expect(getAllowedRolesForPath('/dashboard/unknown-space')).toEqual([])
  })
})

describe('canAccessDashboardPath — حدود البادئات', () => {
  it('لا يطابق البادئة إلا عند حدّ مسار حقيقي', () => {
    expect(canAccessDashboardPath('student', '/dashboard/studentship')).toBe(false)
    expect(canAccessDashboardPath('admin', '/dashboard/admin-tools')).toBe(false)
    expect(canAccessDashboardPath('admin', '/dashboard/admin/anything')).toBe(true)
  })

  it('يمنح tech_admin وصولاً كاملاً داخل اللوحة مثل super_admin', () => {
    expect(canAccessDashboardPath('tech_admin', '/dashboard/student')).toBe(true)
    expect(canAccessDashboardPath('tech_admin', '/dashboard/finance/reports')).toBe(true)
    expect(canAccessDashboardPath('tech_admin', '/dashboard')).toBe(true)
  })

  it('لا يمنح مسارٌ يشبه اسم اللوحة أي تجاوز حتى لصاحب أعلى صلاحية', () => {
    expect(canAccessDashboardPath('super_admin', '/dashboard-old')).toBe(false)
    expect(canAccessDashboardPath('admin', '/dashboard-old')).toBe(false)
  })

  it('المسارات العامة خارج اللوحة تتطلب تسجيل الدخول فقط', () => {
    expect(canAccessDashboardPath('student', '/about')).toBe(true)
    expect(canAccessDashboardPath('partner', '/documents/9')).toBe(true)
    expect(canAccessDashboardPath(null, '/about')).toBe(false)
  })

  it('أي دور غير معروف يُعامل كمستخدم مسجّل فقط', () => {
    expect(canAccessDashboardPath('ghost', '/dashboard/profile')).toBe(true)
    expect(canAccessDashboardPath('ghost', '/dashboard/admin')).toBe(false)
  })

  it('يقبل الأدوار بأي حالة أحرف أو مرادف', () => {
    expect(canAccessDashboardPath('SUPER_ADMIN', '/dashboard/admin')).toBe(true)
    expect(canAccessDashboardPath('Finance', '/dashboard/finance/reports')).toBe(true)
  })

  it('يسمح لأي دور بالطلبات المالية للأقسام (يفرضها الخادم)', () => {
    expect(canAccessDashboardPath('student', '/dashboard/department/financial-requests')).toBe(true)
    expect(canAccessDashboardPath('student', '/dashboard/department')).toBe(false)
  })

  it('يرفض المسار المشترك عندما لا يوجد دور', () => {
    expect(canAccessDashboardPath(undefined, '/dashboard/profile')).toBe(false)
    expect(canAccessDashboardPath('', '/dashboard/notifications')).toBe(false)
  })
})

describe('getPostLoginRedirect — الحالات الحديّة', () => {
  it('يتجاهل المسار المفضّل الفارغ أو المكوّن من فراغات', () => {
    expect(getPostLoginRedirect('instructor', '   ')).toBe('/dashboard/instructor')
    expect(getPostLoginRedirect('instructor', '')).toBe('/dashboard/instructor')
    expect(getPostLoginRedirect('instructor', undefined)).toBe('/dashboard/instructor')
  })

  it('يقصّ الفراغات المحيطة بالمسار المفضّل قبل استخدامه', () => {
    expect(getPostLoginRedirect('student', '  /dashboard/student/sessions  ')).toBe(
      '/dashboard/student/sessions',
    )
  })

  it('يحلّ الدور من الحمولات غير النصية بأمان', () => {
    expect(getPostLoginRedirect({ role: 'finance' }, null)).toBe('/dashboard/finance')
    expect(getPostLoginRedirect({ role: null }, null)).toBe('/dashboard/profile')
    expect(getPostLoginRedirect({ name: 'بلا دور' }, null)).toBe('/dashboard/profile')
    expect(getPostLoginRedirect(null, null)).toBe('/dashboard/profile')
    expect(getPostLoginRedirect(42, null)).toBe('/dashboard/profile')
  })

  it('يحترم المسار المفضّل لصاحب الصلاحية الأعلى', () => {
    expect(getPostLoginRedirect({ role: 'super_admin' }, '/dashboard/finance/reports')).toBe(
      '/dashboard/finance/reports',
    )
  })

  it('يعيد المستخدم بلا دور إلى صفحة الحساب حتى لو طلب مساحة إدارية', () => {
    expect(getPostLoginRedirect(null, '/dashboard/admin')).toBe('/dashboard/profile')
  })
})
