/** Super Admin CRUD slugs — scaffolding until REST endpoints are wired. */
export type SuperAdminCrudSlug =
  | 'users'
  | 'roles'
  | 'departments'
  | 'team'
  | 'students'
  | 'instructors'
  | 'programs'
  | 'tracks'
  | 'workshops'
  | 'registrations'
  | 'partners'

export type SuperCrudMeta = {
  slug: SuperAdminCrudSlug
  titleAr: string
  subtitleAr?: string
}

export const SUPER_ADMIN_CRUD: Record<SuperAdminCrudSlug, SuperCrudMeta> = {
  users: {
    slug: 'users',
    titleAr: 'المستخدمون',
    subtitleAr: 'إنشاء الحسابات، إعادة التعيين، وربط الأدوار',
  },
  roles: {
    slug: 'roles',
    titleAr: 'الأدوار والصلاحيات',
    subtitleAr: 'تعريف الأدوار وربطها بالمسارات والواجهات',
  },
  departments: {
    slug: 'departments',
    titleAr: 'الإدارات',
    subtitleAr: 'هيكل الإدارات الأكاديمية والتشغيلية',
  },
  team: {
    slug: 'team',
    titleAr: 'الفريق',
    subtitleAr: 'أعضاء الفريق والملفات التنظيمية',
  },
  students: {
    slug: 'students',
    titleAr: 'الطلاب',
    subtitleAr: 'سجلات التعلّم والاتصال الإداري',
  },
  instructors: {
    slug: 'instructors',
    titleAr: 'المدربون',
    subtitleAr: 'صفوف المدربين والربط بالجلسات',
  },
  programs: {
    slug: 'programs',
    titleAr: 'البرامج',
    subtitleAr: 'هيكلة البرامج والمسارات المعتمدة',
  },
  tracks: {
    slug: 'tracks',
    titleAr: 'المسارات',
    subtitleAr: 'مسارات EMC والتصنيف الأكاديمي',
  },
  workshops: {
    slug: 'workshops',
    titleAr: 'الورش',
    subtitleAr: 'ورش العمل وجداول الإصدار القصيرة',
  },
  registrations: {
    slug: 'registrations',
    titleAr: 'التسجيلات',
    subtitleAr: 'حجوزات الدورات وإدارة الدفع المرتبط',
  },
  partners: {
    slug: 'partners',
    titleAr: 'الشراكات',
    subtitleAr: 'جهات الشراكة وجداول الانخراط التشغيلي',
  },
}

export function parseCrudSlug(raw: string | undefined): SuperAdminCrudSlug | null {
  if (!raw) return null
  const k = raw.trim().toLowerCase().replace(/\s+/g, '_')
  return k in SUPER_ADMIN_CRUD ? (k as SuperAdminCrudSlug) : null
}

export const SUPER_ADMIN_CRUD_COUNT = Object.keys(SUPER_ADMIN_CRUD).length
