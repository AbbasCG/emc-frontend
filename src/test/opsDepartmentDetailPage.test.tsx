import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import OpsDepartmentDetailPage from '@/pages/operations/admin/OpsDepartmentDetailPage'
import type { DepartmentOverview } from '@/api/departmentOverviewApi'

const mockFetchOverview = vi.fn()

vi.mock('@/api/departmentOverviewApi', () => ({
  fetchDepartmentOverview: (...a: unknown[]) => mockFetchOverview(...a),
}))

vi.mock('@/api/vmsApi', () => ({
  updateVmsDepartment: vi.fn(),
  deleteVmsDepartment: vi.fn(),
}))

vi.mock('@/lib/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), message: vi.fn() },
  errorToast: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Admin', role: 'admin' }, isAuthenticated: true, isLoading: false }),
}))

function fullOverview(overrides: Partial<DepartmentOverview> = {}): DepartmentOverview {
  return {
    department: {
      id: 8, name: 'Technology', name_ar: 'التقنية', name_en: 'Technology & Technical Support', slug: 'tech',
      description: null, description_ar: 'قسم التقنية والدعم الفني', status: 'active', is_active: true,
      icon: 'code', color: '#2691C2', sort_order: 0, parent_id: null,
      leader: { id: 5, name: 'أحمد المدير', email: 'manager@example.com', role: 'department_manager' },
      created_at: '2026-01-01T00:00:00Z',
    },
    kpis: {
      total_members: 12, active_members: 10, approved_volunteers: 4, pending_applications: 2,
      programs_linked: 3, courses_linked: 3, open_tasks: 5, overdue_tasks: 1, leadership_count: 2,
      new_members_this_month: 2, activity_rate: 83, last_join_date: '2026-08-01', completed_tasks_this_month: 4,
    },
    leadership: {
      manager: { id: 5, name: 'أحمد المدير', email: 'manager@example.com', role: 'department_manager', phone: '0501234567' },
      section_leads: [],
    },
    members: [
      { id: 1, user_id: 1, name: 'محمد سالم', position: 'مطور', email: 'm@example.com', image: null, is_active: true, is_leader: false, is_executive: false, joined_at: '2026-01-01' },
    ],
    approved_volunteers: [
      { id: 1, full_name: 'سارة أحمد', job_title: 'مصممة', join_date: '2026-02-01', weekly_hours: 5, availability: 'مساءً', status: 'approved', approved_at: '2026-02-05' },
    ],
    volunteer_applications: {
      stats: { total: 3, submitted: 2, under_review: 0, approved: 1, rejected: 0 },
      recent: [{ id: 10, full_name: 'خالد عمر', email: 'k@example.com', job_title: 'مطور', submitted_at: '2026-08-01', status: 'submitted' }],
    },
    courses: [
      { id: 1, title: 'دورة React', type: 'paid', status: 'published', instructor: 'م. علي', students_count: 20, start_date: '2026-09-01', end_date: '2026-10-01' },
    ],
    tasks: [
      { id: 1, title: 'مراجعة الميزانية', assignee: 'أحمد المدير', priority: 'high', status: 'in_progress', due_date: '2026-08-10', is_overdue: false },
    ],
    recent_activity: [
      { id: 1, action: 'CREATE', entity_type: 'TeamProfile', entity_name: 'محمد سالم', description: 'تمت إضافة عضو جديد', user_name: 'Admin', created_at: '2026-08-01T10:00:00Z' },
    ],
    completeness: { percentage: 80, missing: ['لا توجد برامج أو دورات مرتبطة'] },
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/admin/departments/8']}>
      <Routes>
        <Route path="/dashboard/admin/departments/:id" element={<OpsDepartmentDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('OpsDepartmentDetailPage — pixel redesign', () => {
  beforeEach(() => {
    mockFetchOverview.mockReset()
  })

  it('renders breadcrumb and hero identity', async () => {
    mockFetchOverview.mockResolvedValue(fullOverview())
    renderPage()

    await waitFor(() => expect(screen.getAllByText('التقنية')[0]).toBeInTheDocument())
    expect(screen.getByText('الإدارات')).toBeInTheDocument()
    expect(screen.getByText('تفاصيل القسم')).toBeInTheDocument()
    expect(screen.getAllByText('Technology & Technical Support').length).toBeGreaterThan(0)
    expect(screen.getByText('#8')).toBeInTheDocument()
  })

  it('renders six KPI cards with real backend values', async () => {
    mockFetchOverview.mockResolvedValue(fullOverview())
    renderPage()

    await waitFor(() => expect(screen.getAllByText('إجمالي الأعضاء').length).toBeGreaterThan(0))
    expect(screen.getAllByText('القادة').length).toBeGreaterThan(0)
    expect(screen.getAllByText('الفرق').length).toBeGreaterThan(0)
    expect(screen.getByText('برامج ودورات')).toBeInTheDocument()
    expect(screen.getByText('طلبات التطوع')).toBeInTheDocument()
    expect(screen.getByText('بانتظار الانتظار')).toBeInTheDocument()
    expect(screen.getAllByText('12').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
  })

  it('renders department info, quick stats, and admin info cards', async () => {
    mockFetchOverview.mockResolvedValue(fullOverview())
    renderPage()

    await waitFor(() => expect(screen.getByText('معلومات القسم')).toBeInTheDocument())
    expect(screen.getByText('إحصائيات سريعة')).toBeInTheDocument()
    expect(screen.getByText('معلومات القسم الإدارية')).toBeInTheDocument()
    expect(screen.getByText('قسم التقنية والدعم الفني')).toBeInTheDocument()
  })

  it('renders the leadership section with manager details', async () => {
    mockFetchOverview.mockResolvedValue(fullOverview())
    renderPage()

    await waitFor(() => expect(screen.getAllByText('أحمد المدير')[0]).toBeInTheDocument())
    expect(screen.getByText('قائد القسم')).toBeInTheDocument()
    expect(screen.getAllByText('manager@example.com').length).toBeGreaterThan(0)
  })

  it('renders a "no manager" empty state when leadership.manager is null', async () => {
    mockFetchOverview.mockResolvedValue(fullOverview({ leadership: { manager: null, section_leads: [] } }))
    renderPage()

    await waitFor(() => expect(screen.getByText('لا يوجد مدير معين بعد')).toBeInTheDocument())
    expect(screen.getByText('تعيين مدير')).toBeInTheDocument()
  })

  it('renders linked team with member avatars and view-all link', async () => {
    mockFetchOverview.mockResolvedValue(fullOverview())
    renderPage()

    await waitFor(() => expect(screen.getByText('الفريق المرتبط')).toBeInTheDocument())
    expect(screen.getByText(/عضو نشط/)).toBeInTheDocument()
    const links = screen.getAllByText('عرض جميع الأعضاء')
    expect(links[0].closest('a')).toHaveAttribute('href', '/dashboard/members?department_id=8')
  })

  it('renders bottom activity cards and last-update bar', async () => {
    mockFetchOverview.mockResolvedValue(fullOverview())
    renderPage()

    await waitFor(() => expect(screen.getByText('طلبات التطوع المرتبطة')).toBeInTheDocument())
    expect(screen.getByText('البرامج والدورات المرتبطة')).toBeInTheDocument()
    expect(screen.getByText('المهام المفتوحة')).toBeInTheDocument()
    expect(screen.getByText('حضور قيد الانتظار')).toBeInTheDocument()
    expect(screen.getAllByText('آخر تحديث').length).toBeGreaterThan(0)
    expect(screen.getByText('تم التحديث بواسطة')).toBeInTheDocument()
    expect(screen.getByText('ملاحظات التحديث')).toBeInTheDocument()
  })

  it('renders footer management actions for privileged roles', async () => {
    mockFetchOverview.mockResolvedValue(fullOverview())
    renderPage()

    await waitFor(() => expect(screen.getByText('تعديل معلومات القسم')).toBeInTheDocument())
    expect(screen.getByText('إرسال رسالة')).toBeInTheDocument()
    expect(screen.getByText('إلغاء تفعيل')).toBeInTheDocument()
    expect(screen.getByText('حذف القسم')).toBeInTheDocument()
  })

  it('info rows use controlled columns without justify-between', async () => {
    mockFetchOverview.mockResolvedValue(fullOverview())
    renderPage()

    await waitFor(() => expect(screen.getByText('معلومات القسم')).toBeInTheDocument())
    const rows = document.querySelectorAll('.detail-row')
    expect(rows.length).toBeGreaterThan(5)
    rows.forEach((row) => {
      expect(row.className).not.toMatch(/justify-between/)
    })
  })

  it('shows empty team state without blank cards', async () => {
    mockFetchOverview.mockResolvedValue(fullOverview({
      members: [],
      volunteer_applications: { stats: { total: 0, submitted: 0, under_review: 0, approved: 0, rejected: 0 }, recent: [] },
      courses: [],
      tasks: [],
      recent_activity: [],
      kpis: {
        total_members: 0, active_members: 0, approved_volunteers: 0, pending_applications: 0,
        programs_linked: 0, courses_linked: 0, open_tasks: 0, overdue_tasks: 0, leadership_count: 0,
        new_members_this_month: 0, activity_rate: 0, last_join_date: null, completed_tasks_this_month: 0,
      },
    }))
    renderPage()

    await waitFor(() => expect(screen.getByText('لا يوجد أعضاء مرتبطون بهذا القسم')).toBeInTheDocument())
    expect(screen.getAllByText('لا توجد طلبات').length).toBeGreaterThan(0)
  })

  it('shows a retry action on load error', async () => {
    mockFetchOverview.mockRejectedValue(new Error('network'))
    renderPage()

    await waitFor(() => expect(screen.getByText('إعادة المحاولة')).toBeInTheDocument())
  })

  it('preserves department_id on volunteer and members links', async () => {
    mockFetchOverview.mockResolvedValue(fullOverview())
    renderPage()

    await waitFor(() => expect(screen.getByText('عرض الأعضاء')).toBeInTheDocument())
    expect(screen.getByText('عرض الأعضاء').closest('a')).toHaveAttribute('href', '/dashboard/members?department_id=8')
    expect(screen.getAllByText('عرض جميع الطلبات')[0].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/hr/volunteers?department_id=8',
    )
  })
})
