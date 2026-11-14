import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { Activity, BarChart3, Megaphone, Users, type LucideIcon } from 'lucide-react'

/**
 * مركز المستخدمين — سجل التبويبات.
 *
 * إضافة تبويب جديد (مثل «جودة الحسابات» مستقبلًا) = إضافة سطر واحد هنا: لا تعديل في الصفحة ولا في شريط التبويبات.
 * الصفحة نفسها تبقى على الرابط الأصلي `/dashboard/super-admin/crud/users`، والتبويب يُحمَل من `?tab=`.
 */

export type UsersHubTabId = 'users' | 'analytics' | 'activity' | 'acquisition'

export interface UsersHubTabDef {
  id: UsersHubTabId
  labelAr: string
  /** سطر يشرح التبويب (يُستخدم في لوحة التبويبات التي لم تُنفَّذ بعد وفي وصف الوصول). */
  descriptionAr: string
  Icon: LucideIcon
  /**
   * مفتاح الصلاحية الذي يفرضه الـ Backend على واجهات هذا التبويب.
   * الواجهة تُخفي التبويب لمن لا يملكه، لكن الحماية الفعلية في الخادم.
   * غيابه = التبويب متاح لكل من يصل إلى الصفحة.
   */
  requiredPermission?: string
  /** يبقى مركّبًا (مخفيًا) بعد أول زيارة فتبقى حالته، بدل إعادة بنائه عند كل تبديل. */
  keepMounted: boolean
  /** المكوّن. `null` للتبويب الافتراضي الذي تُركّبه الصفحة نفسها (جدول المستخدمين). */
  component: LazyExoticComponent<ComponentType> | null
}

export const hubTabDomId = (id: UsersHubTabId) => `users-hub-tab-${id}`
export const hubPanelDomId = (id: UsersHubTabId) => `users-hub-panel-${id}`

export const DEFAULT_USERS_HUB_TAB: UsersHubTabId = 'users'

export const USERS_HUB_PERMISSIONS = {
  analytics: 'users.analytics.view',
  activity: 'users.activity.view',
  acquisition: 'users.acquisition.view',
} as const

export const USERS_HUB_TABS: readonly UsersHubTabDef[] = [
  {
    id: 'users',
    labelAr: 'المستخدمون',
    descriptionAr: 'الجدول والبحث والفلاتر وإدارة الحسابات.',
    Icon: Users,
    keepMounted: true,
    component: null,
  },
  {
    id: 'analytics',
    labelAr: 'التحليلات',
    descriptionAr: 'إحصائيات الحسابات ونمو المستخدمين.',
    Icon: BarChart3,
    requiredPermission: USERS_HUB_PERMISSIONS.analytics,
    keepMounted: false,
    component: lazy(() => import('./tabs/AnalyticsTab')),
  },
  {
    id: 'activity',
    labelAr: 'النشاط',
    descriptionAr: 'تسجيلات الدخول والعودة إلى المنصة.',
    Icon: Activity,
    requiredPermission: USERS_HUB_PERMISSIONS.activity,
    keepMounted: false,
    component: lazy(() => import('./tabs/ActivityTab')),
  },
  {
    id: 'acquisition',
    labelAr: 'الاستقطاب',
    descriptionAr: 'مصادر وصول الأعضاء والحملات.',
    Icon: Megaphone,
    requiredPermission: USERS_HUB_PERMISSIONS.acquisition,
    keepMounted: false,
    component: lazy(() => import('./tabs/AcquisitionTab')),
  },
]

/** نفس قاعدة الـ Backend: super_admin و tech_admin يتجاوزان فحص الصلاحيات. */
const ROOT_ROLES = new Set(['super_admin', 'tech_admin'])

export interface HubViewer {
  role?: string | null
  permissions?: readonly string[] | null
}

export function canSeeHubTab(tab: UsersHubTabDef, viewer: HubViewer): boolean {
  if (!tab.requiredPermission) return true
  if (viewer.role && ROOT_ROLES.has(viewer.role)) return true
  return Boolean(viewer.permissions?.includes(tab.requiredPermission))
}

export function visibleHubTabs(tabs: readonly UsersHubTabDef[], viewer: HubViewer): UsersHubTabDef[] {
  return tabs.filter((t) => canSeeHubTab(t, viewer))
}

/**
 * قيمة `?tab=` → تبويب مسموح. أي قيمة مجهولة أو غير مصرَّح بها تعود للتبويب الافتراضي
 * (بلا أي طلب بيانات للتبويب المرفوض؛ الخادم يرفض بـ 403 في كل الأحوال).
 */
export function resolveHubTab(
  raw: string | null,
  tabs: readonly UsersHubTabDef[],
  viewer: HubViewer,
): UsersHubTabId {
  const found = tabs.find((t) => t.id === raw)
  return found && canSeeHubTab(found, viewer) ? found.id : DEFAULT_USERS_HUB_TAB
}
