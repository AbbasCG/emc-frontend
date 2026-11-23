import { getSidebarByRole } from '@/layouts/dashboardSidebar'

/** Every role the app knows (the /my route list of dashboardAccess plus the other staff roles). */
const CANDIDATES = [
  'admin', 'super_admin', 'tech_admin', 'executive_admin', 'hr_manager', 'operations_manager', 'community_manager', 'volunteer',
  'department_member', 'department_manager', 'programs_manager', 'instructor', 'finance_manager', 'marketing_manager', 'quality_manager',
  'support_agent', 'partnerships_manager', 'ai_manager', 'strategy_planning_manager', 'digital_ambassadors_manager', 'advisors_manager',
]

/** The roles whose sidebar lists BOTH «إدارة المهام» and «مهامي ومسؤولياتي» (computed from the real config, not hard-coded). */
export const TASK_ROLES_WITH_BOTH_ENTRIES: string[] = CANDIDATES.filter((role) => {
  const hrefs = new Set(getSidebarByRole(role).flatMap((g) => g.items.map((i) => i.href)))

  return hrefs.has('/dashboard/admin/tasks') && hrefs.has('/dashboard/admin/tasks/my')
})
