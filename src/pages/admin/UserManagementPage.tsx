import { useEffect, useState, useCallback } from 'react'
import {
  Users, Search, UserPlus, Pencil, Trash2,
  X, Check, AlertCircle, Eye, EyeOff
} from 'lucide-react'
import { DashboardPageShell, EmcButton, Eyebrow, Surface } from '@/components/ui'
import { DataTable, type DataTableColumn } from '@/components/dashboard'
import {
  fetchManagedUsers,
  fetchManagedDepartments,
  fetchAssignablePermissions,
  createManagedUser,
  updateManagedUser,
  deleteManagedUser,
  type ManagedUser,
  type DepartmentOption,
} from '@/api/userManagementApi'

const PERM_GROUP_LABELS: Record<string, string> = {
  users: 'المستخدمين',
  education: 'التعليم والبرامج',
  lms: 'نظام التعلم',
  finance: 'المالية',
  certificates: 'الشهادات',
  operations: 'العمليات',
  hr: 'الموارد البشرية',
  partnerships: 'الشراكات',
  marketing: 'التسويق',
  quality: 'الجودة',
  support: 'الدعم',
  reports: 'التقارير',
  knowledge: 'قاعدة المعرفة',
  ai: 'الذكاء الاصطناعي',
  system: 'النظام',
}

const PERM_LABELS: Record<string, string> = {
  view_users: 'عرض المستخدمين',
  create_users: 'إنشاء مستخدمين',
  update_users: 'تعديل مستخدمين',
  delete_users: 'حذف مستخدمين',
  manage_roles: 'إدارة الصلاحيات',
  view_programs: 'عرض البرامج',
  manage_programs: 'إدارة البرامج',
  view_courses: 'عرض الدورات',
  manage_courses: 'إدارة الدورات',
  view_workshops: 'عرض الورش',
  manage_workshops: 'إدارة الورش',
  view_tracks: 'عرض المسارات',
  manage_tracks: 'إدارة المسارات',
  view_registrations: 'عرض التسجيلات',
  manage_registrations: 'إدارة التسجيلات',
  view_sessions: 'عرض الجلسات',
  manage_sessions: 'إدارة الجلسات',
  view_attendance: 'عرض الحضور',
  manage_attendance: 'إدارة الحضور',
  view_assignments: 'عرض الواجبات',
  manage_assignments: 'إدارة الواجبات',
  review_submissions: 'مراجعة التسليمات',
  view_materials: 'عرض المواد',
  manage_materials: 'إدارة المواد',
  view_payments: 'عرض المدفوعات',
  manage_payments: 'إدارة المدفوعات',
  view_revenue: 'عرض الإيرادات',
  manage_coupons: 'إدارة الكوبونات',
  manage_scholarships: 'إدارة المنح',
  view_financial_reports: 'عرض التقارير المالية',
  view_certificates: 'عرض الشهادات',
  manage_certificates: 'إدارة الشهادات',
  issue_certificates: 'إصدار شهادات',
  revoke_certificates: 'سحب شهادات',
  view_departments: 'عرض الأقسام',
  manage_departments: 'إدارة الأقسام',
  view_tasks: 'عرض المهام',
  manage_tasks: 'إدارة المهام',
  view_meetings: 'عرض الاجتماعات',
  manage_meetings: 'إدارة الاجتماعات',
  view_forms: 'عرض النماذج',
  manage_forms: 'إدارة النماذج',
  view_volunteers: 'عرض المتطوعين',
  manage_volunteers: 'إدارة المتطوعين',
  view_team: 'عرض الفريق',
  manage_team: 'إدارة الفريق',
  view_partners: 'عرض الشركاء',
  manage_partners: 'إدارة الشركاء',
  view_partner_reports: 'عرض تقارير الشركاء',
  view_marketing: 'عرض التسويق',
  manage_marketing: 'إدارة التسويق',
  view_quality: 'عرض الجودة',
  manage_quality: 'إدارة الجودة',
  approve_quality_reviews: 'اعتماد مراجعات الجودة',
  view_support_tickets: 'عرض تذاكر الدعم',
  manage_support_tickets: 'إدارة تذاكر الدعم',
  view_kpi: 'عرض مؤشرات الأداء',
  view_reports: 'عرض التقارير',
  generate_reports: 'توليد التقارير',
  export_reports: 'تصدير التقارير',
  view_knowledge: 'عرض قاعدة المعرفة',
  manage_knowledge: 'إدارة قاعدة المعرفة',
  use_ai_assistant: 'استخدام المساعد الذكي',
  manage_ai_prompts: 'إدارة أوامر الذكاء الاصطناعي',
  view_ai_usage: 'عرض استخدام الذكاء الاصطناعي',
  view_audit_logs: 'عرض سجل التدقيق',
  manage_settings: 'إدارة الإعدادات',
  manage_integrations: 'إدارة التكاملات',
  manage_webhooks: 'إدارة Webhooks',
  manage_api_tokens: 'إدارة رموز API',
}

const roleLabel = (role: string) => {
  const map: Record<string, string> = {
    super_admin: 'مشرف عام',
    admin: 'مدير',
    executive_admin: 'مدير تنفيذي',
    department_manager: 'مدير قسم',
    section_lead: 'رئيس قسم',
    finance_manager: 'مدير مالي',
    marketing_manager: 'مدير تسويق',
    quality_manager: 'مدير جودة',
    hr_manager: 'مدير موارد بشرية',
    support_agent: 'وكيل دعم',
    instructor: 'مدرب',
    teacher: 'مدرب',
    student: 'طالب',
    volunteer: 'متطوع',
    partner: 'شريك',
  }
  if (role.startsWith('user_')) return 'مخصصة'
  return map[role] ?? role
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [availablePerms, setAvailablePerms] = useState<Record<string, string[]>>({})
  const [, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'department_manager',
    department_id: '', permissions: [] as string[],
  })
  const [showPassword, setShowPassword] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetchManagedUsers({ q: search || undefined, department_id: deptFilter ? Number(deptFilter) : undefined }),
      fetchManagedDepartments(),
      fetchAssignablePermissions(),
    ]).then(([usersRes, depts, perms]) => {
      setUsers(usersRes.users)
      setMeta(usersRes.meta)
      setDepartments(depts)
      setAvailablePerms(perms)
    }).finally(() => setLoading(false))
  }, [search, deptFilter])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role: 'department_manager', department_id: '', permissions: [] })
    setEditId(null)
    setShowForm(false)
    setError('')
  }

  const togglePerm = (perm: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }))
  }

  const toggleGroup = (perms: string[]) => {
    const allSelected = perms.every((p) => form.permissions.includes(p))
    setForm((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !perms.includes(p))
        : [...new Set([...prev.permissions, ...perms])],
    }))
  }

  const handleSubmit = async () => {
    setError('')
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        department_id: form.department_id ? Number(form.department_id) : null,
        permissions: form.permissions.length > 0 ? form.permissions : undefined,
      }
      if (editId) {
        const updated = await updateManagedUser(editId, payload)
        setUsers((prev) => prev.map((u) => (u.id === editId ? updated : u)))
      } else {
        const created = await createManagedUser(payload)
        setUsers((prev) => [created, ...prev])
      }
      resetForm()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'فشل العملية')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (u: ManagedUser) => {
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role.startsWith('user_') ? 'department_manager' : u.role,
      department_id: String(u.department_id ?? ''),
      permissions: u.permissions,
    })
    setEditId(u.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteManagedUser(id)
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'فشل الحذف')
    }
  }

  const columns: DataTableColumn<ManagedUser>[] = [
    { key: 'name', header: 'الاسم', render: (r) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-customBlue/10 flex items-center justify-center shrink-0">
          <Users size={13} className="text-customBlue" />
        </div>
        <div>
          <span className="font-bold text-deepBlue">{r.name}</span>
          <span className="block text-[10px] text-slate-400">{r.email}</span>
        </div>
      </div>
    )},
    { key: 'role', header: 'الدور', render: (r) => (
      <span className="text-xs font-bold text-slate-600">{roleLabel(r.role)}</span>
    )},
    { key: 'department', header: 'القسم', render: (r) => r.department?.name ?? '—' },
    { key: 'creator', header: 'المنشئ', render: (r) => r.creator?.name ?? '—' },
    { key: 'subordinates_count', header: 'المرؤوسين', width: '80px' },
    {
      key: 'actions', header: '', width: '80px',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => handleEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-customBlue transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  const permGroupEntries = Object.entries(availablePerms)

  return (
    <DashboardPageShell
      title="إدارة المستخدمين"
      eyebrow={<Eyebrow tone="accent">ADMIN · USER MANAGEMENT</Eyebrow>}
      description="إنشاء وتعديل المستخدمين مع صلاحيات مخصصة حسب التسلسل الهرمي."
      actions={
        <EmcButton variant="primary" size="sm" onClick={() => { resetForm(); setShowForm(true) }} leadingIcon={<UserPlus size={15} />}>
          مستخدم جديد
        </EmcButton>
      }
    >
      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-slate-200 pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20 w-56"
            placeholder="بحث بالاسم أو البريد..."
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20"
        >
          <option value="">جميع الأقسام</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name_ar ?? d.name}</option>
          ))}
        </select>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-12 overflow-y-auto" onClick={() => !saving && resetForm()}>
          <Surface
            variant="default"
            padding="lg"
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-deepBlue">{editId ? 'تعديل مستخدم' : 'مستخدم جديد'}</h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 mb-4 text-sm font-bold text-red-700">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">الاسم</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">البريد الإلكتروني</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">كلمة المرور</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20 pl-9" dir="ltr" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">الدور</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20">
                  <option value="department_manager">مدير قسم</option>
                  <option value="section_lead">رئيس قسم</option>
                  <option value="finance_manager">مدير مالي</option>
                  <option value="marketing_manager">مدير تسويق</option>
                  <option value="quality_manager">مدير جودة</option>
                  <option value="hr_manager">مدير موارد بشرية</option>
                  <option value="support_agent">وكيل دعم</option>
                  <option value="executive_admin">مدير تنفيذي</option>
                  <option value="admin">مدير</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">القسم</label>
                <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-customBlue/20">
                  <option value="">بدون قسم</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name_ar ?? d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Permissions */}
            {permGroupEntries.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-black text-deepBlue mb-3">الصلاحيات</h4>
                <p className="text-[11px] text-slate-400 mb-3">يمكنك فقط إعطاء صلاحيات تمتلكها أنت.</p>
                <div className="space-y-3">
                  {permGroupEntries.map(([group, perms]) => (
                    <div key={group} className="rounded-xl border border-slate-100 p-3">
                      <button
                        type="button"
                        onClick={() => toggleGroup(perms)}
                        className="flex items-center gap-2 text-xs font-bold text-deepBlue mb-2 hover:text-customBlue transition-colors"
                      >
                        <Check size={12} className={perms.every((p) => form.permissions.includes(p)) ? 'text-emerald-500' : 'text-slate-300'} />
                        {PERM_GROUP_LABELS[group] ?? group}
                      </button>
                      <div className="flex flex-wrap gap-2 mr-4">
                        {perms.map((perm) => (
                          <button
                            key={perm}
                            type="button"
                            onClick={() => togglePerm(perm)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                              form.permissions.includes(perm)
                                ? 'bg-customBlue/10 text-customBlue ring-1 ring-customBlue/20'
                                : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:ring-customBlue/30'
                            }`}
                          >
                            {form.permissions.includes(perm) ? <Check size={10} /> : null}
                            {PERM_LABELS[perm] ?? perm}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              <EmcButton variant="primary" size="sm" onClick={handleSubmit} disabled={saving || !form.name || !form.email || (!editId && !form.password)}>
                {saving ? 'جاري الحفظ...' : editId ? 'تحديث' : 'إنشاء'}
              </EmcButton>
              <EmcButton variant="secondary" size="sm" onClick={resetForm}>إلغاء</EmcButton>
            </div>
          </Surface>
        </div>
      )}

      {/* Users table */}
      <Surface variant="default" elevation={3} padding="none" className="overflow-hidden">
        {users.length > 0 ? (
          <DataTable<ManagedUser> columns={columns} data={users} keyExtractor={(r) => r.id} emptyMessage="لا يوجد مستخدمون" />
        ) : !loading ? (
          <div className="px-6 py-12 text-center">
            <Users size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-black text-slate-500">لا يوجد مستخدمون</p>
            <p className="mt-2 text-xs text-slate-400">أنشئ مستخدم جديد بالزر أعلاه.</p>
          </div>
        ) : null}
      </Surface>
    </DashboardPageShell>
  )
}
